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

    if (req.query.search) {
      const q = String(req.query.search).trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { beneficiaire: { contains: q, mode: 'insensitive' } },
        { numero: { contains: q, mode: 'insensitive' } },
      ];
    }

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

/**
 * Crée une dépense. Accepte:
 *   - JSON pur avec `justificatif: { dataUrl, nomFichier, typeFichier, tailleFichier }` (mobile + web)
 *   - multipart/form-data avec fichier binaire via multer (upload classique)
 *   - `hasJustificatif: true` si le frontend signale un justificatif déjà traité
 */
export async function createDepense(req: Request, res: Response): Promise<void> {
  try {
    const {
      categorie,
      description,
      montant,
      modePaiement = 'especes',
      beneficiaire,
      notes,
    } = req.body;

    if (!categorie || !description || !montant || Number(montant) <= 0) {
      errorResponse(res, 'Catégorie, description et montant > 0 obligatoires', 400);
      return;
    }

    const numero = generateNumeroDepense();
    const montantNum = Number(montant);
    const utilisateurId = req.user!.id;

    // --- Détection du justificatif ---
    // 1. Via multer (multipart file upload classique)
    const multerFiles = (req.files as Express.Multer.File[]) || [];
    const hasMulterFiles = multerFiles.length > 0;

    // 2. Via JSON payload (Base64 DataURL — mobile et PC)
    const jsonJustif = req.body.justificatif
      ? (typeof req.body.justificatif === 'string' ? JSON.parse(req.body.justificatif) : req.body.justificatif)
      : null;
    const jsonJustifs: any[] = req.body.justificatifs
      ? (typeof req.body.justificatifs === 'string' ? JSON.parse(req.body.justificatifs) : req.body.justificatifs)
      : [];
    const hasJsonJustif = Boolean(
      (jsonJustif && (jsonJustif.dataUrl || jsonJustif.cheminFichier)) ||
      (Array.isArray(jsonJustifs) && jsonJustifs.some((j: any) => j && (j.dataUrl || j.cheminFichier)))
    );

    // 3. Flag explicite (hasJustificatif=true envoyé par le client)
    const clientFlag = req.body.hasJustificatif === true || req.body.hasJustificatif === 'true';

    const hasFiles = hasMulterFiles || hasJsonJustif || clientFlag;

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
          beneficiaire: beneficiaire ? String(beneficiaire).trim() : null,
          notes: notes || null,
          hasJustificatif: hasFiles,
          mouvementCaisseId,
        },
      });

      // --- Enregistrement des justificatifs JSON Base64 ---
      if (jsonJustif && (jsonJustif.dataUrl || jsonJustif.cheminFichier)) {
        await tx.justificatif.create({
          data: {
            depenseId: nouvelleDepense.id,
            nomFichier: jsonJustif.nomFichier || 'reçu-justificatif.jpg',
            cheminFichier: jsonJustif.dataUrl || jsonJustif.cheminFichier,
            typeFichier: jsonJustif.typeFichier || 'image/jpeg',
            tailleFichier: Number(jsonJustif.tailleFichier) || String(jsonJustif.dataUrl || '').length,
          },
        });
      }

      for (const j of jsonJustifs) {
        if (j && (j.dataUrl || j.cheminFichier)) {
          await tx.justificatif.create({
            data: {
              depenseId: nouvelleDepense.id,
              nomFichier: j.nomFichier || 'reçu-justificatif.jpg',
              cheminFichier: j.dataUrl || j.cheminFichier,
              typeFichier: j.typeFichier || 'image/jpeg',
              tailleFichier: Number(j.tailleFichier) || String(j.dataUrl || '').length,
            },
          });
        }
      }

      // --- Enregistrement des fichiers Multer (multipart) ---
      for (const file of multerFiles) {
        // Convertir en Base64 pour persistance (fichiers Vercel tmpdir éphémères)
        let chemin = file.path;
        try {
          if (fs.existsSync(file.path)) {
            const buffer = fs.readFileSync(file.path);
            chemin = `data:${file.mimetype};base64,${buffer.toString('base64')}`;
          }
        } catch (_) {}

        await tx.justificatif.create({
          data: {
            depenseId: nouvelleDepense.id,
            nomFichier: file.originalname,
            cheminFichier: chemin,
            typeFichier: file.mimetype,
            tailleFichier: file.size,
          },
        });
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

/**
 * Ajoute un justificatif à une dépense existante.
 * Accepte: fichier binaire Multer OU payload JSON {dataUrl, nomFichier, ...}
 */
export async function addJustificatif(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);

    const depense = await prisma.depense.findUnique({ where: { id } });
    if (!depense) {
      errorResponse(res, 'Dépense introuvable', 404);
      return;
    }

    const file = req.file;
    const { nomFichier, dataUrl, typeFichier, tailleFichier } = req.body;

    let finalNom = nomFichier || 'reçu-justificatif.jpg';
    let finalChemin = dataUrl || '';
    let finalType = typeFichier || 'image/jpeg';
    let finalTaille = Number(tailleFichier) || 0;

    if (file) {
      finalNom = file.originalname;
      finalType = file.mimetype;
      finalTaille = file.size;
      try {
        if (fs.existsSync(file.path)) {
          const buffer = fs.readFileSync(file.path);
          finalChemin = `data:${file.mimetype};base64,${buffer.toString('base64')}`;
        } else {
          finalChemin = file.path;
        }
      } catch (_) {
        finalChemin = file.path;
      }
    }

    if (!finalChemin) {
      errorResponse(res, 'Fichier ou données du justificatif manquants', 400);
      return;
    }

    const justificatif = await prisma.justificatif.create({
      data: {
        depenseId: id,
        nomFichier: finalNom,
        cheminFichier: finalChemin,
        typeFichier: finalType,
        tailleFichier: finalTaille || finalChemin.length,
      },
    });

    // Marquer la dépense comme justifiée
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

/**
 * Modifier une dépense existante
 */
export async function updateDepense(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const { categorie, description, montant, beneficiaire, modePaiement, hasJustificatif, justificatif } = req.body;

    const exist = await prisma.depense.findUnique({ where: { id }, include: { justificatifs: true } });
    if (!exist) {
      errorResponse(res, 'Dépense introuvable', 404);
      return;
    }

    const data: Prisma.DepenseUpdateInput = {};
    if (categorie !== undefined) data.categorie = categorie;
    if (description !== undefined) data.description = description;
    if (montant !== undefined) data.montant = new Prisma.Decimal(montant);
    if (beneficiaire !== undefined) data.beneficiaire = beneficiaire;
    if (modePaiement !== undefined) data.modePaiement = modePaiement;
    if (hasJustificatif !== undefined) data.hasJustificatif = Boolean(hasJustificatif);

    const updated = await prisma.depense.update({
      where: { id },
      data,
      include: { justificatifs: true, utilisateur: { select: { nom: true, prenom: true } } },
    });

    if (justificatif && (justificatif.dataUrl || justificatif.cheminFichier)) {
      await prisma.justificatif.create({
        data: {
          depenseId: id,
          nomFichier: justificatif.nomFichier || 'recu-justificatif.jpg',
          cheminFichier: justificatif.dataUrl || justificatif.cheminFichier,
          typeFichier: justificatif.typeFichier || 'image/jpeg',
          tailleFichier: Number(justificatif.tailleFichier) || 1024,
        },
      });
      await prisma.depense.update({ where: { id }, data: { hasJustificatif: true } });
    }

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'UPDATE_DEPENSE',
      table: 'Depense',
      enregistrementId: id,
      anciennesValeurs: { categorie: exist.categorie, montant: exist.montant, description: exist.description },
      nouvellesValeurs: { categorie: updated.categorie, montant: updated.montant, description: updated.description },
      adresseIp: req.ip,
    });

    const full = await prisma.depense.findUnique({
      where: { id },
      include: { justificatifs: true, utilisateur: { select: { nom: true, prenom: true } } },
    });

    successResponse(res, full, 'Dépense mise à jour avec succès');
  } catch (err) {
    console.error('[Depenses] updateDepense error:', err);
    errorResponse(res, 'Erreur lors de la mise à jour de la dépense');
  }
}

/**
 * Supprimer une dépense
 */
export async function deleteDepense(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const exist = await prisma.depense.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Dépense introuvable', 404);
      return;
    }

    await prisma.justificatif.deleteMany({ where: { depenseId: id } });
    await prisma.depense.delete({ where: { id } });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'DELETE_DEPENSE',
      table: 'Depense',
      enregistrementId: id,
      anciennesValeurs: { numero: exist.numero, montant: exist.montant, categorie: exist.categorie },
      adresseIp: req.ip,
    });

    successResponse(res, { id }, 'Dépense supprimée avec succès');
  } catch (err) {
    console.error('[Depenses] deleteDepense error:', err);
    errorResponse(res, 'Erreur lors de la suppression de la dépense');
  }
}
