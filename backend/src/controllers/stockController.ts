import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

export async function getStock(req: Request, res: Response): Promise<void> {
  try {
    const produits = await prisma.produit.findMany({
      where: { actif: true },
      include: {
        tarifs: { where: { actif: true } },
      },
    });

    const stockData = await Promise.all(
      produits.map(async (prod) => {
        // Obtenir le dernier mouvement pour connaître le stock actuel
        const dernierMouvement = await prisma.mouvementStock.findFirst({
          where: { produitId: prod.id },
          orderBy: { id: 'desc' },
        });

        const stockActuel = dernierMouvement ? Number(dernierMouvement.stockApres) : 0;

        // Seuil d'alerte stock faible par défaut (ex: 50 unités)
        const seuilAlerte = 50;
        const estFaible = stockActuel <= seuilAlerte;

        return {
          produitId: prod.id,
          nom: prod.nom,
          description: prod.description,
          unite: prod.unite,
          stockActuel,
          seuilAlerte,
          estFaible,
          tarifs: prod.tarifs,
        };
      })
    );

    successResponse(res, stockData);
  } catch (err) {
    console.error('[Stock] getStock error:', err);
    errorResponse(res, 'Erreur lors de la récupération du stock');
  }
}

export async function getMouvementsStock(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MouvementStockWhereInput = {};

    if (req.query.produitId) where.produitId = parseInt(req.query.produitId as string);
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
      prisma.mouvementStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          produit: { select: { id: true, nom: true, unite: true } },
          vente: { select: { id: true, reference: true } },
          achat: { select: { id: true, reference: true } },
          inventaire: { select: { id: true, reference: true } },
        },
      }),
      prisma.mouvementStock.count({ where }),
    ]);

    paginatedResponse(res, mouvements, total, page, limit);
  } catch (err) {
    console.error('[Stock] getMouvementsStock error:', err);
    errorResponse(res, 'Erreur lors de la récupération des mouvements de stock');
  }
}

export async function ajusterStock(req: Request, res: Response): Promise<void> {
  try {
    const { produitId, typeOperation, quantite, motif } = req.body;

    if (!produitId || !typeOperation || quantite === undefined || quantite <= 0) {
      errorResponse(res, 'Paramètres invalides (produitId, typeOperation, quantite > 0 requis)', 400);
      return;
    }

    const validOperations = [
      'entree',
      'sortie_perte',
      'sortie_casse',
      'retour_client',
      'retour_fournisseur',
      'correction_inventaire',
    ];

    if (!validOperations.includes(typeOperation)) {
      errorResponse(res, `Type d'opération invalide. Types autorisés: ${validOperations.join(', ')}`, 400);
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const produit = await tx.produit.findUnique({ where: { id: parseInt(produitId) } });
      if (!produit) throw new Error('Produit introuvable');

      const dernierMouvement = await tx.mouvementStock.findFirst({
        where: { produitId: produit.id },
        orderBy: { id: 'desc' },
      });

      const stockAvant = dernierMouvement ? Number(dernierMouvement.stockApres) : 0;
      let stockApres = stockAvant;

      const qte = Number(quantite);
      if (['entree', 'retour_client'].includes(typeOperation)) {
        stockApres = stockAvant + qte;
      } else {
        // Sorties
        if (stockAvant < qte && typeOperation !== 'correction_inventaire') {
          throw new Error(`Stock insuffisant (${stockAvant} disponibles)`);
        }
        stockApres = stockAvant - qte;
      }

      const mouvement = await tx.mouvementStock.create({
        data: {
          produitId: produit.id,
          typeOperation,
          quantite: new Prisma.Decimal(qte),
          stockAvant: new Prisma.Decimal(stockAvant),
          stockApres: new Prisma.Decimal(stockApres),
          motif: motif || null,
        },
      });

      return { mouvement, stockActuel: stockApres };
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'AJUSTEMENT_STOCK',
      table: 'MouvementStock',
      enregistrementId: result.mouvement.id,
      nouvellesValeurs: { produitId, typeOperation, quantite, motif },
      adresseIp: req.ip,
    });

    successResponse(res, result, 'Stock ajusté avec succès', 201);
  } catch (err: unknown) {
    console.error('[Stock] ajusterStock error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'ajustement du stock';
    errorResponse(res, message, 400);
  }
}

