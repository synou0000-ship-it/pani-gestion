import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';

function getDateRange(periode: string): { debut: Date; fin: Date } {
  const now = new Date();
  let debut: Date;
  let fin: Date = new Date(now);
  fin.setHours(23, 59, 59, 999);

  switch (periode) {
    case 'semaine': {
      debut = new Date(now);
      debut.setDate(now.getDate() - now.getDay());
      debut.setHours(0, 0, 0, 0);
      break;
    }
    case 'mois': {
      debut = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case 'annee': {
      debut = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    }
    default: {
      // jour
      debut = new Date(now);
      debut.setHours(0, 0, 0, 0);
      break;
    }
  }

  return { debut, fin };
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const periode = (req.query.periode as string) || 'jour';
    const { debut, fin } = getDateRange(periode);

    // Ventes de la période
    const ventesAgg = await prisma.vente.aggregate({
      where: {
        statut: 'validee',
        dateVente: { gte: debut, lte: fin },
      },
      _sum: { montantTotal: true, montantPaye: true },
      _count: { id: true },
    });

    // Encaissements de la période
    const encaissementsAgg = await prisma.paiementClient.aggregate({
      where: { datePaiement: { gte: debut, lte: fin } },
      _sum: { montant: true },
    });

    // Dépenses de la période
    const depensesAgg = await prisma.depense.aggregate({
      where: { dateDepense: { gte: debut, lte: fin } },
      _sum: { montant: true },
      _count: { id: true },
    });

    // Stock actuel par produit (dernier mouvement de chaque produit)
    const stockActuel = await prisma.$queryRaw<Array<{ produitId: number; nom: string; stockApres: number }>>`
      SELECT ms."produitId", p.nom, ms."stockApres"
      FROM "MouvementStock" ms
      INNER JOIN "Produit" p ON p.id = ms."produitId"
      WHERE ms.id IN (
        SELECT MAX(id) FROM "MouvementStock" GROUP BY "produitId"
      )
      AND p.actif = true
    `;

    // Dettes clients (total resteAPayer sur ventes validées)
    const dettesClientsAgg = await prisma.vente.aggregate({
      where: { statut: 'validee', resteAPayer: { gt: 0 } },
      _sum: { resteAPayer: true },
      _count: { id: true },
    });

    // Dettes fournisseurs (total resteAPayer sur achats)
    const dettesFournisseursAgg = await prisma.achat.aggregate({
      where: { resteAPayer: { gt: 0 } },
      _sum: { resteAPayer: true },
      _count: { id: true },
    });

    // Caisse ouverte
    const caisseOuverte = await prisma.caisse.findFirst({
      where: { statut: 'ouverte' },
      include: {
        utilisateur: { select: { nom: true, prenom: true } },
      },
    });

    // Achats de la période (coût)
    const achatsAgg = await prisma.achat.aggregate({
      where: {
        statut: { not: 'annule' },
        dateAchat: { gte: debut, lte: fin },
      },
      _sum: { montantTotal: true },
    });

    // Bénéfice estimé = ventes encaissées - coût achats - dépenses
    const ventesEncaissees = Number(ventesAgg._sum.montantPaye ?? 0);
    const coutAchats = Number(achatsAgg._sum.montantTotal ?? 0);
    const totalDepenses = Number(depensesAgg._sum.montant ?? 0);
    const beneficeEstime = ventesEncaissees - coutAchats - totalDepenses;

    // Inventaires avec écarts
    const inventairesEcartsAgg = await prisma.inventaireDetail.aggregate({
      where: { ecart: { not: 0 } },
      _sum: { ecart: true },
      _count: { id: true },
    });

    // Ventes par statut de la période
    const ventesParStatut = await prisma.vente.groupBy({
      by: ['statut'],
      where: { dateVente: { gte: debut, lte: fin } },
      _count: { id: true },
      _sum: { montantTotal: true },
    });

    // Top produits vendus
    const topProduits = await prisma.venteDetail.groupBy({
      by: ['produitId'],
      where: {
        vente: { statut: 'validee', dateVente: { gte: debut, lte: fin } },
      },
      _sum: { quantite: true, montant: true },
      orderBy: { _sum: { montant: 'desc' } },
      take: 5,
    });

    const topProduitsAvecNoms = await Promise.all(
      topProduits.map(async (tp) => {
        const produit = await prisma.produit.findUnique({
          where: { id: tp.produitId },
          select: { nom: true },
        });
        return {
          produitId: tp.produitId,
          nom: produit?.nom ?? 'Inconnu',
          quantite: Number(tp._sum.quantite ?? 0),
          montant: Number(tp._sum.montant ?? 0),
        };
      })
    );

    successResponse(res, {
      periode,
      dateDebut: debut,
      dateFin: fin,
      ventes: {
        total: Number(ventesAgg._sum.montantTotal ?? 0),
        montantPaye: Number(ventesAgg._sum.montantPaye ?? 0),
        count: ventesAgg._count.id,
        parStatut: ventesParStatut,
      },
      encaissements: {
        total: Number(encaissementsAgg._sum.montant ?? 0),
      },
      depenses: {
        total: Number(depensesAgg._sum.montant ?? 0),
        count: depensesAgg._count.id,
      },
      achats: {
        total: Number(achatsAgg._sum.montantTotal ?? 0),
      },
      dettesClients: {
        total: Number(dettesClientsAgg._sum.resteAPayer ?? 0),
        count: dettesClientsAgg._count.id,
      },
      dettesFournisseurs: {
        total: Number(dettesFournisseursAgg._sum.resteAPayer ?? 0),
        count: dettesFournisseursAgg._count.id,
      },
      caisse: caisseOuverte
        ? {
            id: caisseOuverte.id,
            reference: caisseOuverte.reference,
            soldeInitial: Number(caisseOuverte.soldeInitial),
            soldeTheorique: Number(caisseOuverte.soldeTheorique),
            ouvertPar: `${caisseOuverte.utilisateur.prenom} ${caisseOuverte.utilisateur.nom}`,
            dateOuverture: caisseOuverte.dateOuverture,
          }
        : null,
      stock: stockActuel.map((s) => ({
        produitId: s.produitId,
        nom: s.nom,
        stockActuel: Number(s.stockApres),
      })),
      ecartStock: {
        totalEcart: Number(inventairesEcartsAgg._sum.ecart ?? 0),
        count: inventairesEcartsAgg._count.id,
      },
      beneficeEstime,
      topProduits: topProduitsAvecNoms,
    });
  } catch (err) {
    console.error('[Dashboard] Error:', err);
    errorResponse(res, 'Erreur lors du chargement du dashboard', 500);
  }
}
