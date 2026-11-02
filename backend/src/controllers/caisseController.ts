import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

function generateReference(prefix: string): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${datePart}-${rand}`;
}

export async function getCaisseActuelle(req: Request, res: Response): Promise<void> {
  try {
    const caisse = await prisma.caisse.findFirst({
      where: { statut: 'ouverte' },
      orderBy: { id: 'desc' },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        mouvements: {
          orderBy: { dateMouvement: 'desc' },
          take: 20,
          include: {
            utilisateur: { select: { id: true, nom: true, prenom: true } },
          },
        },
      },
    });

    if (!caisse) {
      successResponse(res, null, 'Aucune caisse ouverte');
      return;
    }

    // Calculer les totaux de la session en cours
    const [encaissements, decaissements] = await Promise.all([
      prisma.mouvementCaisse.aggregate({
        where: {
          caisseId: caisse.id,
          typeOperation: { in: ['encaissement_vente', 'paiement_client_dette', 'autre_entree'] },
        },
        _sum: { montant: true },
      }),
      prisma.mouvementCaisse.aggregate({
        where: {
          caisseId: caisse.id,
          typeOperation: { in: ['decaissement_depense', 'paiement_fournisseur', 'autre_sortie'] },
        },
        _sum: { montant: true },
      }),
    ]);

    const totalEncaissements = Number(encaissements._sum.montant || 0);
    const totalDecaissements = Number(decaissements._sum.montant || 0);

    successResponse(res, {
      ...caisse,
      totalEncaissements,
      totalDecaissements,
    });
  } catch (err) {
    console.error('[Caisse] getCaisseActuelle error:', err);
    errorResponse(res, 'Erreur lors de la récupération de la caisse');
  }
}

export async function ouvrirCaisse(req: Request, res: Response): Promise<void> {
  try {
    const { soldeInitial = 0, notes } = req.body;
    const utilisateurId = req.user!.id;

    // Vérifier si une caisse est déjà ouverte
    const caisseExistante = await prisma.caisse.findFirst({
      where: { statut: 'ouverte' },
    });

    if (caisseExistante) {
      errorResponse(res, 'Une caisse est déjà ouverte. Veuillez la clôturer avant d\'en ouvrir une nouvelle.', 400);
      return;
    }

    const reference = generateReference('CS');
    const initialNum = Number(soldeInitial) || 0;

    const caisse = await prisma.$transaction(async (tx) => {
      const nouvelleCaisse = await tx.caisse.create({
        data: {
          reference,
          utilisateurId,
          soldeInitial: new Prisma.Decimal(initialNum),
          soldeTheorique: new Prisma.Decimal(initialNum),
          statut: 'ouverte',
          notes: notes || null,
        },
      });

      // Mouvement initial
      if (initialNum > 0) {
        await tx.mouvementCaisse.create({
          data: {
            caisseId: nouvelleCaisse.id,
            utilisateurId,
            typeOperation: 'autre_entree',
            montant: new Prisma.Decimal(initialNum),
            soldeAvant: new Prisma.Decimal(0),
            soldeApres: new Prisma.Decimal(initialNum),
            description: 'Solde initial à l\'ouverture',
          },
        });
      }

      return nouvelleCaisse;
    });

    await logAudit({
      utilisateurId,
      action: 'OUVERTURE_CAISSE',
      table: 'Caisse',
      enregistrementId: caisse.id,
      nouvellesValeurs: { reference, soldeInitial: initialNum },
      adresseIp: req.ip,
    });

    successResponse(res, caisse, 'Caisse ouverte avec succès', 201);
  } catch (err) {
    console.error('[Caisse] ouvrirCaisse error:', err);
    errorResponse(res, 'Erreur lors de l\'ouverture de la caisse');
  }
}

export async function cloturerCaisse(req: Request, res: Response): Promise<void> {
  try {
    const { soldeReel, notes } = req.body;

    if (soldeReel === undefined || isNaN(Number(soldeReel))) {
      errorResponse(res, 'Le montant réel compté est obligatoire', 400);
      return;
    }

    const soldeReelNum = Number(soldeReel);

    const caisse = await prisma.caisse.findFirst({
      where: { statut: 'ouverte' },
      orderBy: { id: 'desc' },
    });

    if (!caisse) {
      errorResponse(res, 'Aucune caisse ouverte à clôturer', 400);
      return;
    }

    const soldeTheoriqueNum = Number(caisse.soldeTheorique);
    const ecart = soldeReelNum - soldeTheoriqueNum; // négatif = manque de caisse, positif = surplus

    const caisseCloturee = await prisma.caisse.update({
      where: { id: caisse.id },
      data: {
        dateCloture: new Date(),
        soldeReel: new Prisma.Decimal(soldeReelNum),
        ecart: new Prisma.Decimal(ecart),
        statut: 'cloturee',
        notes: notes ? `${caisse.notes ? caisse.notes + ' | ' : ''}Clôture: ${notes}` : caisse.notes,
      },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true } },
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'CLOTURE_CAISSE',
      table: 'Caisse',
      enregistrementId: caisse.id,
      nouvellesValeurs: {
        soldeTheorique: soldeTheoriqueNum,
        soldeReel: soldeReelNum,
        ecart,
      },
      adresseIp: req.ip,
    });

    successResponse(res, caisseCloturee, 'Caisse clôturée avec succès');
  } catch (err) {
    console.error('[Caisse] cloturerCaisse error:', err);
    errorResponse(res, 'Erreur lors de la clôture de la caisse');
  }
}

export async function getMouvementsCaisse(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MouvementCaisseWhereInput = {};

    if (req.query.caisseId) where.caisseId = parseInt(req.query.caisseId as string);
    if (req.query.typeOperation) where.typeOperation = req.query.typeOperation as string;
    if (req.query.dateDebut || req.query.dateFin) {
      where.dateMouvement = {};
      if (req.query.dateDebut) where.dateMouvement.gte = new Date(req.query.dateDebut as string);
      if (req.query.dateFin) {
        const fin = new Date(req.query.dateFin as string);
        fin.setHours(23, 59, 59, 999);
        where.dateMouvement.lte = fin;
      }
    }

    const [mouvements, total] = await Promise.all([
      prisma.mouvementCaisse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateMouvement: 'desc' },
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true } },
          caisse: { select: { id: true, reference: true } },
        },
      }),
      prisma.mouvementCaisse.count({ where }),
    ]);

    paginatedResponse(res, mouvements, total, page, limit);
  } catch (err) {
    console.error('[Caisse] getMouvementsCaisse error:', err);
    errorResponse(res, 'Erreur lors de la récupération des mouvements');
  }
}

export async function getHistoriqueCaisses(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [caisses, total] = await Promise.all([
      prisma.caisse.findMany({
        skip,
        take: limit,
        orderBy: { dateOuverture: 'desc' },
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true } },
          _count: { select: { mouvements: true } },
        },
      }),
      prisma.caisse.count(),
    ]);

    paginatedResponse(res, caisses, total, page, limit);
  } catch (err) {
    console.error('[Caisse] getHistoriqueCaisses error:', err);
    errorResponse(res, 'Erreur lors de la récupération de l\'historique des caisses');
  }
}

