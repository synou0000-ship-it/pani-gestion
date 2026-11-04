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

export async function getInventaires(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventaireWhereInput = {};
    if (req.query.statut) where.statut = req.query.statut as string;
    if (req.query.search) {
      const q = String(req.query.search).trim();
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [inventaires, total] = await Promise.all([
      prisma.inventaire.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateInventaire: 'desc' },
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true } },
          details: {
            include: {
              produit: { select: { id: true, nom: true, unite: true } },
            },
          },
        },
      }),
      prisma.inventaire.count({ where }),
    ]);

    paginatedResponse(res, inventaires, total, page, limit);
  } catch (err) {
    console.error('[Inventaires] getInventaires error:', err);
    errorResponse(res, 'Erreur lors de la récupération des inventaires');
  }
}

export async function getInventaireById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const inventaire = await prisma.inventaire.findUnique({
      where: { id },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        details: {
          include: {
            produit: true,
          },
        },
        mouvementsStock: true,
      },
    });

    if (!inventaire) {
      errorResponse(res, 'Inventaire introuvable', 404);
      return;
    }

    successResponse(res, inventaire);
  } catch (err) {
    console.error('[Inventaires] getInventaireById error:', err);
    errorResponse(res, 'Erreur lors de la récupération de l\'inventaire');
  }
}

export async function createInventaire(req: Request, res: Response): Promise<void> {
  try {
    const { details, notes } = req.body;
    const utilisateurId = req.user!.id;

    if (!details || !Array.isArray(details) || details.length === 0) {
      errorResponse(res, 'Les détails du comptage d\'inventaire sont obligatoires', 400);
      return;
    }

    const reference = generateReference('INV');

    const inventaire = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventaire.create({
        data: {
          reference,
          utilisateurId,
          statut: 'en_cours',
          notes: notes || null,
        },
      });

      for (const item of details) {
        const produitId = parseInt(item.produitId);
        const stockPhysique = Number(item.stockPhysique);

        // Obtenir le stock théorique actuel
        const dernierMouvement = await tx.mouvementStock.findFirst({
          where: { produitId },
          orderBy: { id: 'desc' },
        });

        const stockTheorique = dernierMouvement ? Number(dernierMouvement.stockApres) : 0;
        const ecart = stockPhysique - stockTheorique;

        await tx.inventaireDetail.create({
          data: {
            inventaireId: inv.id,
            produitId,
            stockTheorique: new Prisma.Decimal(stockTheorique),
            stockPhysique: new Prisma.Decimal(stockPhysique),
            ecart: new Prisma.Decimal(ecart),
            motifEcart: item.motifEcart || (ecart !== 0 ? 'autre' : null),
          },
        });
      }

      return inv;
    });

    await logAudit({
      utilisateurId,
      action: 'CREATE_INVENTAIRE',
      table: 'Inventaire',
      enregistrementId: inventaire.id,
      nouvellesValeurs: { reference },
      adresseIp: req.ip,
    });

    const fullInv = await prisma.inventaire.findUnique({
      where: { id: inventaire.id },
      include: {
        details: { include: { produit: true } },
      },
    });

    successResponse(res, fullInv, 'Session d\'inventaire enregistrée', 201);
  } catch (err) {
    console.error('[Inventaires] createInventaire error:', err);
    errorResponse(res, 'Erreur lors de la création de l\'inventaire');
  }
}

export async function validerInventaire(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const utilisateurId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const inventaire = await tx.inventaire.findUnique({
        where: { id },
        include: { details: true },
      });

      if (!inventaire) throw new Error('Inventaire introuvable');
      if (inventaire.statut === 'valide') throw new Error('Cet inventaire est déjà validé');

      // Pour chaque ligne avec un écart non nul, créer un mouvement de correction de stock
      for (const d of inventaire.details) {
        const ecart = Number(d.ecart);
        const stockPhysique = Number(d.stockPhysique);

        if (ecart !== 0) {
          const dernierMouvement = await tx.mouvementStock.findFirst({
            where: { produitId: d.produitId },
            orderBy: { id: 'desc' },
          });

          const stockAvant = dernierMouvement ? Number(dernierMouvement.stockApres) : 0;

          await tx.mouvementStock.create({
            data: {
              produitId: d.produitId,
              typeOperation: 'correction_inventaire',
              quantite: new Prisma.Decimal(Math.abs(ecart)),
              stockAvant: new Prisma.Decimal(stockAvant),
              stockApres: new Prisma.Decimal(stockPhysique),
              motif: `Ajustement inventaire ${inventaire.reference} - Motif: ${d.motifEcart || 'Non précisé'}`,
              inventaireId: inventaire.id,
            },
          });
        }
      }

      const updated = await tx.inventaire.update({
        where: { id },
        data: { statut: 'valide' },
        include: { details: { include: { produit: true } } },
      });

      return updated;
    });

    await logAudit({
      utilisateurId,
      action: 'VALIDER_INVENTAIRE',
      table: 'Inventaire',
      enregistrementId: id,
      adresseIp: req.ip,
    });

    successResponse(res, result, 'Inventaire validé et stock ajusté avec succès');
  } catch (err: unknown) {
    console.error('[Inventaires] validerInventaire error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors de la validation';
    errorResponse(res, message, 400);
  }
}

/**
 * Supprimer un inventaire (non validé)
 */
export async function deleteInventaire(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const exist = await prisma.inventaire.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Inventaire introuvable', 404);
      return;
    }
    if (exist.statut === 'valide') {
      errorResponse(res, 'Impossible de supprimer un inventaire déjà validé', 400);
      return;
    }

    await prisma.inventaireDetail.deleteMany({ where: { inventaireId: id } });
    await prisma.inventaire.delete({ where: { id } });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'DELETE_INVENTAIRE',
      table: 'Inventaire',
      enregistrementId: id,
      anciennesValeurs: { reference: exist.reference },
      adresseIp: req.ip,
    });

    successResponse(res, { id }, 'Inventaire supprimé avec succès');
  } catch (err) {
    console.error('[Inventaires] deleteInventaire error:', err);
    errorResponse(res, 'Erreur lors de la suppression de l\'inventaire');
  }
}
