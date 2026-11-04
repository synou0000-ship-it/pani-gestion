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

export async function getAchats(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AchatWhereInput = {};

    if (req.query.fournisseurId) where.fournisseurId = parseInt(req.query.fournisseurId as string);
    if (req.query.statut) where.statut = req.query.statut as string;
    if (req.query.search) {
      const q = String(req.query.search).trim();
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { fournisseur: { nom: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (req.query.dateDebut || req.query.dateFin) {
      where.dateAchat = {};
      if (req.query.dateDebut) where.dateAchat.gte = new Date(req.query.dateDebut as string);
      if (req.query.dateFin) {
        const fin = new Date(req.query.dateFin as string);
        fin.setHours(23, 59, 59, 999);
        where.dateAchat.lte = fin;
      }
    }

    const [achats, total] = await Promise.all([
      prisma.achat.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateAchat: 'desc' },
        include: {
          fournisseur: { select: { id: true, nom: true, telephone: true } },
          utilisateur: { select: { id: true, nom: true, prenom: true } },
          details: {
            include: {
              produit: { select: { id: true, nom: true, unite: true } },
            },
          },
          _count: { select: { paiements: true } },
        },
      }),
      prisma.achat.count({ where }),
    ]);

    paginatedResponse(res, achats, total, page, limit);
  } catch (err) {
    console.error('[Achats] getAchats error:', err);
    errorResponse(res, 'Erreur lors de la récupération des achats');
  }
}

export async function getAchatById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const achat = await prisma.achat.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        details: {
          include: {
            produit: true,
          },
        },
        paiements: true,
        mouvementsStock: true,
      },
    });

    if (!achat) {
      errorResponse(res, 'Achat introuvable', 404);
      return;
    }

    successResponse(res, achat);
  } catch (err) {
    console.error('[Achats] getAchatById error:', err);
    errorResponse(res, 'Erreur lors de la récupération de l\'achat');
  }
}

export async function createAchat(req: Request, res: Response): Promise<void> {
  try {
    const {
      fournisseurId,
      statut = 'receptionne', // 'commande' ou 'receptionne'
      details,
      montantPaye = 0,
      modePaiement = 'especes',
      notes,
    } = req.body;

    if (!fournisseurId || !details || !Array.isArray(details) || details.length === 0) {
      errorResponse(res, 'Fournisseur et détails de l\'achat sont obligatoires', 400);
      return;
    }

    const reference = generateReference('ACH');
    const utilisateurId = req.user!.id;

    // Calcul du montant total
    let totalAchat = 0;
    for (const d of details) {
      const qte = Number(d.quantite);
      const prix = Number(d.prixUnitaire);
      if (qte <= 0 || prix < 0) {
        errorResponse(res, 'Quantité ou prix unitaire invalide dans les détails', 400);
        return;
      }
      totalAchat += qte * prix;
    }

    const montantPayeNum = Math.min(Number(montantPaye) || 0, totalAchat);
    const resteAPayer = totalAchat - montantPayeNum;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer l'achat
      const achat = await tx.achat.create({
        data: {
          reference,
          fournisseurId: parseInt(fournisseurId),
          utilisateurId,
          montantTotal: new Prisma.Decimal(totalAchat),
          montantPaye: new Prisma.Decimal(montantPayeNum),
          resteAPayer: new Prisma.Decimal(resteAPayer),
          statut: resteAPayer === 0 && statut === 'receptionne' ? 'paye' : statut,
          notes: notes || null,
        },
      });

      // 2. Créer les lignes de détails
      for (const d of details) {
        const qte = Number(d.quantite);
        const prix = Number(d.prixUnitaire);
        const montantLigne = qte * prix;

        await tx.achatDetail.create({
          data: {
            achatId: achat.id,
            produitId: parseInt(d.produitId),
            quantite: new Prisma.Decimal(qte),
            prixUnitaire: new Prisma.Decimal(prix),
            montant: new Prisma.Decimal(montantLigne),
          },
        });

        // Si la marchandise est réceptionnée, incrémenter le stock
        if (statut === 'receptionne') {
          const dernierMouvement = await tx.mouvementStock.findFirst({
            where: { produitId: parseInt(d.produitId) },
            orderBy: { id: 'desc' },
          });

          const stockAvant = dernierMouvement ? Number(dernierMouvement.stockApres) : 0;
          const stockApres = stockAvant + qte;

          await tx.mouvementStock.create({
            data: {
              produitId: parseInt(d.produitId),
              typeOperation: 'entree',
              quantite: new Prisma.Decimal(qte),
              stockAvant: new Prisma.Decimal(stockAvant),
              stockApres: new Prisma.Decimal(stockApres),
              motif: `Réception achat ref ${reference}`,
              achatId: achat.id,
            },
          });
        }
      }

      // 3. Paiement éventuel
      if (montantPayeNum > 0) {
        let caisseMouvementId: number | null = null;

        if (modePaiement === 'especes') {
          const caisseOuverte = await tx.caisse.findFirst({
            where: { statut: 'ouverte' },
            orderBy: { id: 'desc' },
          });

          if (caisseOuverte) {
            const soldeAvant = Number(caisseOuverte.soldeTheorique);
            const soldeApres = soldeAvant - montantPayeNum;

            const mvt = await tx.mouvementCaisse.create({
              data: {
                caisseId: caisseOuverte.id,
                utilisateurId,
                typeOperation: 'paiement_fournisseur',
                montant: new Prisma.Decimal(montantPayeNum),
                soldeAvant: new Prisma.Decimal(soldeAvant),
                soldeApres: new Prisma.Decimal(soldeApres),
                description: `Paiement achat ${reference}`,
              },
            });

            await tx.caisse.update({
              where: { id: caisseOuverte.id },
              data: { soldeTheorique: new Prisma.Decimal(soldeApres) },
            });

            caisseMouvementId = mvt.id;
          }
        }

        await tx.paiementFournisseur.create({
          data: {
            achatId: achat.id,
            fournisseurId: parseInt(fournisseurId),
            montant: new Prisma.Decimal(montantPayeNum),
            modePaiement,
            mouvementCaisseId: caisseMouvementId,
          },
        });
      }

      return achat;
    });

    await logAudit({
      utilisateurId,
      action: 'CREATE_ACHAT',
      table: 'Achat',
      enregistrementId: result.id,
      nouvellesValeurs: { reference, totalAchat, montantPayeNum, statut },
      adresseIp: req.ip,
    });

    successResponse(res, result, 'Achat enregistré avec succès', 201);
  } catch (err: unknown) {
    console.error('[Achats] createAchat error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement de l\'achat';
    errorResponse(res, message, 400);
  }
}

export async function receptionnerAchat(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);

    const result = await prisma.$transaction(async (tx) => {
      const achat = await tx.achat.findUnique({
        where: { id },
        include: { details: true },
      });

      if (!achat) throw new Error('Achat introuvable');
      if (achat.statut === 'receptionne' || achat.statut === 'paye') {
        throw new Error('Cet achat a déjà été réceptionné');
      }

      // Mettre à jour le stock pour chaque produit
      for (const d of achat.details) {
        const qte = Number(d.quantite);

        const dernierMouvement = await tx.mouvementStock.findFirst({
          where: { produitId: d.produitId },
          orderBy: { id: 'desc' },
        });

        const stockAvant = dernierMouvement ? Number(dernierMouvement.stockApres) : 0;
        const stockApres = stockAvant + qte;

        await tx.mouvementStock.create({
          data: {
            produitId: d.produitId,
            typeOperation: 'entree',
            quantite: new Prisma.Decimal(qte),
            stockAvant: new Prisma.Decimal(stockAvant),
            stockApres: new Prisma.Decimal(stockApres),
            motif: `Réception marchandise commande ${achat.reference}`,
            achatId: achat.id,
          },
        });
      }

      const statut = Number(achat.resteAPayer) === 0 ? 'paye' : 'receptionne';
      const updated = await tx.achat.update({
        where: { id },
        data: { statut },
      });

      return updated;
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'RECEPTION_ACHAT',
      table: 'Achat',
      enregistrementId: id,
      adresseIp: req.ip,
    });

    successResponse(res, result, 'Marchandise réceptionnée et stock mis à jour');
  } catch (err: unknown) {
    console.error('[Achats] receptionnerAchat error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors de la réception';
    errorResponse(res, message, 400);
  }
}

/**
 * Annuler un achat non réceptionné
 */
export async function annulerAchat(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const exist = await prisma.achat.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Achat introuvable', 404);
      return;
    }
    if (exist.statut === 'receptionne') {
      errorResponse(res, 'Impossible d\'annuler un achat déjà réceptionné', 400);
      return;
    }

    const updated = await prisma.achat.update({
      where: { id },
      data: { statut: 'annule' },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'ANNULER_ACHAT',
      table: 'Achat',
      enregistrementId: id,
      anciennesValeurs: { statut: exist.statut },
      nouvellesValeurs: { statut: 'annule' },
      adresseIp: req.ip,
    });

    successResponse(res, updated, 'Achat annulé avec succès');
  } catch (err) {
    console.error('[Achats] annulerAchat error:', err);
    errorResponse(res, 'Erreur lors de l\'annulation de l\'achat');
  }
}

/**
 * Supprimer un achat
 */
export async function deleteAchat(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const exist = await prisma.achat.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Achat introuvable', 404);
      return;
    }
    if (exist.statut === 'receptionne') {
      errorResponse(res, 'Impossible de supprimer un achat réceptionné avec impact de stock', 400);
      return;
    }

    await prisma.achatDetail.deleteMany({ where: { achatId: id } });
    await prisma.achat.delete({ where: { id } });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'DELETE_ACHAT',
      table: 'Achat',
      enregistrementId: id,
      anciennesValeurs: { reference: exist.reference, montantTotal: exist.montantTotal },
      adresseIp: req.ip,
    });

    successResponse(res, { id }, 'Achat supprimé avec succès');
  } catch (err) {
    console.error('[Achats] deleteAchat error:', err);
    errorResponse(res, 'Erreur lors de la suppression de l\'achat');
  }
}
