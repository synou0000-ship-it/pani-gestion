import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

function generateNumeroDepense(): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DEP-${datePart}-${rand}`;
}

export async function getDepenses(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DepenseWhereInput = {};

    if (req.query.categorie) where.categorie = req.query.categorie as string;
    if (req.query.sansJustificatif === 'true') where.hasJustificatif = false;
    if (req.query.modePaiement) where.modePaiement = req.query.modePaiement as string;

    if (req.query.dateDebut || req.query.dateFin) {
      where.dateDepense = {};
      if (req.query.dateDebut) where.dateDepense.gte = new Date(req.query.dateDebut as string);
      if (req.query.dateFin) {
        const fin = new Date(req.query.dateFin as string);
        fin.setHours(23, 59, 59, 999);
        where.dateDepense.lte = fin;
      }
    }

    const [depenses, total] = await Promise.all([
      prisma.depense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateDepense: 'desc' },
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true } },
          justificatifs: true,
        },
      }),
      prisma.depense.count({ where }),
    ]);

    paginatedResponse(res, depenses, total, page, limit);
  } catch (err) {
    console.error('[Depenses] getDepenses error:', err);
    errorResponse(res, 'Erreur lors de la récupération des dépenses');
  }
}

export async function getDepenseById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const depense = await prisma.depense.findUnique({
      where: { id },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        justificatifs: true,
        mouvementCaisse: true,
      },
    });

    if (!depense) {
      errorResponse(res, 'Dépense introuvable', 404);
      return;
    }

    successResponse(res, depense);
  } catch (err) {
    console.error('[Depenses] getDepenseById error:', err);
    errorResponse(res, 'Erreur lors de la récupération de la dépense');
  }
}

export async function createDepense(req: Request, res: Response): Promise<void> {
  try {
    const { categorie, description, montant, modePaiement = 'especes', beneficiaire, notes } = req.body;

    if (!categorie || !description || !montant || Number(montant) <= 0) {
      errorResponse(res, 'Catégorie, description et montant > 0 obligatoires', 400);
      return;
    }

    const numero = generateNumeroDepense();
    const montantNum = Number(montant);
    const utilisateurId = req.user!.id;
    const files = req.files as Express.Multer.File[] | undefined;
    const hasFiles = Boolean(files && files.length > 0);

    const depense = await prisma.$transaction(async (tx) => {
      let mouvementCaisseId: number | null = null;

      // Décaissement automatique si paiement en espèces
      if (modePaiement === 'especes') {
        const caisseOuverte = await tx.caisse.findFirst({
          where: { statut: 'ouverte' },
          orderBy: { id: 'desc' },
        });

        if (caisseOuverte) {
          const soldeAvant = Number(caisseOuverte.soldeTheorique);
          if (soldeAvant < montantNum) {
            throw new Error(`Solde de caisse insuffisant (${soldeAvant} F disponibles) pour cette dépense de ${montantNum} F`);
          }

          const soldeApres = soldeAvant - montantNum;

          const mvt = await tx.mouvementCaisse.create({
            data: {
              caisseId: caisseOuverte.id,
              utilisateurId,
              typeOperation: 'decaissement_depense',
              montant: new Prisma.Decimal(montantNum),
              soldeAvant: new Prisma.Decimal(soldeAvant),
              soldeApres: new Prisma.Decimal(soldeApres),
              description: `Dépense [${categorie}]: ${description}`,
            },
          });

          await tx.caisse.update({
            where: { id: caisseOuverte.id },
            data: { soldeTheorique: new Prisma.Decimal(soldeApres) },
          });

          mouvementCaisseId = mvt.id;
        }
      }

      const nouvelleDepense = await tx.depense.create({
        data: {
          numero,
          utilisateurId,
          categorie,
          description,
          montant: new Prisma.Decimal(montantNum),
          modePaiement,
          beneficiaire: beneficiaire ? beneficiaire.trim() : null,
          notes: notes || null,
          hasJustificatif: hasFiles,
          mouvementCaisseId,
        },
      });

      // Justificatifs joints
      if (files && files.length > 0) {
        for (const file of files) {
          await tx.justificatif.create({
            data: {
              depenseId: nouvelleDepense.id,
              nomFichier: file.originalname,
              cheminFichier: file.path,
              typeFichier: file.mimetype,
              tailleFichier: file.size,
            },
          });
        }
      }

      return nouvelleDepense;
    });

    await logAudit({
      utilisateurId,
      action: 'CREATE_DEPENSE',
      table: 'Depense',
      enregistrementId: depense.id,
      nouvellesValeurs: { numero, categorie, montant: montantNum, hasJustificatif: hasFiles },
      adresseIp: req.ip,
    });

    const fullDepense = await prisma.depense.findUnique({
      where: { id: depense.id },
      include: { justificatifs: true, utilisateur: { select: { nom: true, prenom: true } } },
    });

    successResponse(res, fullDepense, 'Dépense enregistrée avec succès', 201);
  } catch (err: unknown) {
    console.error('[Depenses] createDepense error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors de la création de la dépense';
    errorResponse(res, message, 400);
  }
}

export async function addJustificatif(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const file = req.file;

    if (!file) {
      errorResponse(res, 'Fichier manquant', 400);
      return;
    }

    const depense = await prisma.depense.findUnique({ where: { id } });
    if (!depense) {
      errorResponse(res, 'Dépense introuvable', 404);
      return;
    }

    const justificatif = await prisma.justificatif.create({
      data: {
        depenseId: id,
        nomFichier: file.originalname,
        cheminFichier: file.path,
        typeFichier: file.mimetype,
        tailleFichier: file.size,
      },
    });

    await prisma.depense.update({
      where: { id },
      data: { hasJustificatif: true },
    });

    successResponse(res, justificatif, 'Justificatif ajouté avec succès', 201);
  } catch (err) {
    console.error('[Depenses] addJustificatif error:', err);
    errorResponse(res, 'Erreur lors de l\'ajout du justificatif');
  }
}
