import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';

export async function getRapportJournalier(req: Request, res: Response): Promise<void> {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const dateDebut = new Date(dateStr);
    dateDebut.setHours(0, 0, 0, 0);

    const dateFin = new Date(dateStr);
    dateFin.setHours(23, 59, 59, 999);

    const [
      ventesAgg,
      venteDetails,
      encaissementsAgg,
      depensesAgg,
      paiementsDettesClient,
      caisseJour,
      produits,
    ] = await Promise.all([
      // Ventes validées du jour
      prisma.vente.aggregate({
        where: {
          statut: 'validee',
          dateVente: { gte: dateDebut, lte: dateFin },
        },
        _count: { id: true },
        _sum: { montantTotal: true, montantPaye: true, resteAPayer: true },
      }),
      // Détails des ventes pour connaître la quantité totale de Pani vendue
      prisma.venteDetail.aggregate({
        where: {
          vente: {
            statut: 'validee',
            dateVente: { gte: dateDebut, lte: dateFin },
          },
        },
        _sum: { quantite: true },
      }),
      // Total encaissements reçus le jour (ventes au comptant)
      prisma.mouvementCaisse.aggregate({
        where: {
          typeOperation: 'encaissement_vente',
          dateMouvement: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montant: true },
      }),
      // Total dépenses du jour
      prisma.depense.aggregate({
        where: {
          dateDepense: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montant: true },
        _count: { id: true },
      }),
      // Règlements de dettes clients reçus le jour
      prisma.mouvementCaisse.aggregate({
        where: {
          typeOperation: 'paiement_client_dette',
          dateMouvement: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montant: true },
      }),
      // Session caisse du jour
      prisma.caisse.findFirst({
        where: {
          dateOuverture: { gte: dateDebut, lte: dateFin },
        },
        orderBy: { id: 'desc' },
      }),
      // Stock restant actuel
      prisma.produit.findMany({
        where: { actif: true },
        include: {
          mouvementsStock: {
            orderBy: { id: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const stockRestant = produits.map((p) => ({
      nom: p.nom,
      stock: p.mouvementsStock[0] ? Number(p.mouvementsStock[0].stockApres) : 0,
      unite: p.unite,
    }));

    const rapport = {
      date: dateStr,
      nombreVentes: ventesAgg._count.id || 0,
      chiffreAffaires: Number(ventesAgg._sum.montantTotal || 0),
      quantiteVendue: Number(venteDetails._sum.quantite || 0),
      encaissementsVentes: Number(encaissementsAgg._sum.montant || 0),
      paiementsDettesClients: Number(paiementsDettesClient._sum.montant || 0),
      totalEncaissements: Number(encaissementsAgg._sum.montant || 0) + Number(paiementsDettesClient._sum.montant || 0),
      totalDepenses: Number(depensesAgg._sum.montant || 0),
      nombreDepenses: depensesAgg._count.id || 0,
      caisse: caisseJour
        ? {
            reference: caisseJour.reference,
            statut: caisseJour.statut,
            soldeInitial: Number(caisseJour.soldeInitial),
            soldeTheorique: Number(caisseJour.soldeTheorique),
            soldeReel: caisseJour.soldeReel ? Number(caisseJour.soldeReel) : null,
            ecart: caisseJour.ecart ? Number(caisseJour.ecart) : null,
          }
        : null,
      stockRestant,
    };

    successResponse(res, rapport);
  } catch (err) {
    console.error('[Rapports] getRapportJournalier error:', err);
    errorResponse(res, 'Erreur lors de la génération du rapport journalier');
  }
}

export async function getRapportMensuel(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const annee = parseInt(req.query.annee as string) || now.getFullYear();
    const mois = parseInt(req.query.mois as string) || now.getMonth() + 1; // 1 à 12

    const dateDebut = new Date(annee, mois - 1, 1, 0, 0, 0, 0);
    const dateFin = new Date(annee, mois, 0, 23, 59, 59, 999);

    const [
      ventesAgg,
      achatsAgg,
      depensesAgg,
      encaissementsAgg,
      dettesClientsAgg,
      dettesFournisseursAgg,
      pertesStockAgg,
    ] = await Promise.all([
      // Ventes
      prisma.vente.aggregate({
        where: {
          statut: 'validee',
          dateVente: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montantTotal: true, montantPaye: true, resteAPayer: true },
        _count: { id: true },
      }),
      // Achats
      prisma.achat.aggregate({
        where: {
          statut: { in: ['receptionne', 'paye'] },
          dateAchat: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montantTotal: true, montantPaye: true },
        _count: { id: true },
      }),
      // Dépenses
      prisma.depense.aggregate({
        where: {
          dateDepense: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montant: true },
        _count: { id: true },
      }),
      // Encaissements réels
      prisma.mouvementCaisse.aggregate({
        where: {
          typeOperation: { in: ['encaissement_vente', 'paiement_client_dette'] },
          dateMouvement: { gte: dateDebut, lte: dateFin },
        },
        _sum: { montant: true },
      }),
      // Dettes clients totales en cours
      prisma.vente.aggregate({
        where: {
          statut: 'validee',
          resteAPayer: { gt: 0 },
        },
        _sum: { resteAPayer: true },
      }),
      // Dettes fournisseurs totales en cours
      prisma.achat.aggregate({
        where: {
          resteAPayer: { gt: 0 },
        },
        _sum: { resteAPayer: true },
      }),
      // Pertes et casses déclarées ce mois
      prisma.mouvementStock.aggregate({
        where: {
          typeOperation: { in: ['sortie_perte', 'sortie_casse'] },
          dateMouvement: { gte: dateDebut, lte: dateFin },
        },
        _sum: { quantite: true },
      }),
    ]);

    const chiffreAffaires = Number(ventesAgg._sum.montantTotal || 0);
    const totalAchats = Number(achatsAgg._sum.montantTotal || 0);
    const totalDepenses = Number(depensesAgg._sum.montant || 0);
    const encaissements = Number(encaissementsAgg._sum.montant || 0);

    // Marge brute = Chiffre d'affaires - Coût d'achat des marchandises
    const margeBrute = chiffreAffaires - totalAchats;
    // Résultat estimé = Marge brute - Dépenses d'exploitation
    const resultatEstime = margeBrute - totalDepenses;

    const rapport = {
      annee,
      mois,
      periode: `${mois.toString().padStart(2, '0')}/${annee}`,
      chiffreAffaires,
      nombreVentes: ventesAgg._count.id || 0,
      totalEncaissements: encaissements,
      totalAchats,
      nombreAchats: achatsAgg._count.id || 0,
      totalDepenses,
      nombreDepenses: depensesAgg._count.id || 0,
      dettesClients: Number(dettesClientsAgg._sum.resteAPayer || 0),
      dettesFournisseurs: Number(dettesFournisseursAgg._sum.resteAPayer || 0),
      pertesDeclarees: Number(pertesStockAgg._sum.quantite || 0),
      margeBrute,
      resultatEstime,
    };

    successResponse(res, rapport);
  } catch (err) {
    console.error('[Rapports] getRapportMensuel error:', err);
    errorResponse(res, 'Erreur lors de la génération du rapport mensuel');
  }
}

export async function getRapportManques(req: Request, res: Response): Promise<void> {
  try {
    const [
      ecartsCaisse,
      ecartsStock,
      ventesAnnulees,
      depensesSansJustificatif,
      sortiesPertes,
      activiteUtilisateurs,
    ] = await Promise.all([
      // 1. Écarts de caisse (où écart != 0)
      prisma.caisse.findMany({
        where: {
          statut: 'cloturee',
          ecart: { not: 0 },
        },
        orderBy: { dateCloture: 'desc' },
        take: 30,
        include: { utilisateur: { select: { nom: true, prenom: true } } },
      }),
      // 2. Écarts d'inventaire
      prisma.inventaireDetail.findMany({
        where: {
          ecart: { not: 0 },
        },
        orderBy: { id: 'desc' },
        take: 30,
        include: {
          produit: { select: { nom: true } },
          inventaire: { select: { reference: true, dateInventaire: true } },
        },
      }),
      // 3. Ventes annulées
      prisma.vente.findMany({
        where: { statut: 'annulee' },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: {
          utilisateur: { select: { nom: true, prenom: true } },
          client: { select: { nom: true, prenom: true } },
        },
      }),
      // 4. Dépenses sans justificatif
      prisma.depense.findMany({
        where: { hasJustificatif: false },
        orderBy: { dateDepense: 'desc' },
        take: 50,
        include: { utilisateur: { select: { nom: true, prenom: true } } },
      }),
      // 5. Sorties de stock déclarées comme perte ou casse
      prisma.mouvementStock.findMany({
        where: { typeOperation: { in: ['sortie_perte', 'sortie_casse'] } },
        orderBy: { dateMouvement: 'desc' },
        take: 30,
        include: { produit: { select: { nom: true } } },
      }),
      // 6. Opérations sensibles par utilisateur (audit log récent)
      prisma.journalAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { utilisateur: { select: { nom: true, prenom: true } } },
      }),
    ]);

    const totalManqueCaisse = ecartsCaisse
      .filter((c) => Number(c.ecart) < 0)
      .reduce((acc, c) => acc + Math.abs(Number(c.ecart)), 0);

    const totalEcartsStock = ecartsStock.reduce((acc, e) => acc + Math.abs(Number(e.ecart)), 0);

    const totalDepensesSansJustificatif = depensesSansJustificatif.reduce(
      (acc, d) => acc + Number(d.montant),
      0
    );

    successResponse(res, {
      synthese: {
        totalManqueCaisse,
        totalEcartsStock,
        nombreVentesAnnulees: ventesAnnulees.length,
        nombreDepensesSansJustificatif: depensesSansJustificatif.length,
        totalDepensesSansJustificatif,
      },
      ecartsCaisse,
      ecartsStock,
      ventesAnnulees,
      depensesSansJustificatif,
      sortiesPertes,
      activiteUtilisateurs,
    });
  } catch (err) {
    console.error('[Rapports] getRapportManques error:', err);
    errorResponse(res, 'Erreur lors de la génération du rapport des manques');
  }
}

export async function exportExcel(req: Request, res: Response): Promise<void> {
  try {
    const type = req.query.type as string; // 'ventes', 'stock', 'depenses', 'dettes'

    const wb = XLSX.utils.book_new();

    if (type === 'ventes' || !type) {
      const ventes = await prisma.vente.findMany({
        include: { client: true, utilisateur: true },
        orderBy: { dateVente: 'desc' },
      });
      const dataVentes = ventes.map((v) => ({
        Référence: v.reference,
        Date: v.dateVente.toISOString().split('T')[0],
        Client: v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Vente Comptant',
        'Montant Total (F)': Number(v.montantTotal),
        'Montant Payé (F)': Number(v.montantPaye),
        'Reste à Payer (F)': Number(v.resteAPayer),
        Statut: v.statut,
        Vendeur: `${v.utilisateur.nom} ${v.utilisateur.prenom}`,
      }));
      const wsVentes = XLSX.utils.json_to_sheet(dataVentes);
      XLSX.utils.book_append_sheet(wb, wsVentes, 'Ventes');
    }

    if (type === 'depenses' || !type) {
      const depenses = await prisma.depense.findMany({
        include: { utilisateur: true },
        orderBy: { dateDepense: 'desc' },
      });
      const dataDepenses = depenses.map((d) => ({
        Numéro: d.numero,
        Date: d.dateDepense.toISOString().split('T')[0],
        Catégorie: d.categorie,
        Description: d.description,
        'Montant (F)': Number(d.montant),
        'Mode Paiement': d.modePaiement,
        Bénéficiaire: d.beneficiaire || '',
        'Avec Justificatif': d.hasJustificatif ? 'Oui' : 'Non',
        Utilisateur: `${d.utilisateur.nom} ${d.utilisateur.prenom}`,
      }));
      const wsDepenses = XLSX.utils.json_to_sheet(dataDepenses);
      XLSX.utils.book_append_sheet(wb, wsDepenses, 'Dépenses');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="PANI_GESTION_EXPORT_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Rapports] exportExcel error:', err);
    errorResponse(res, 'Erreur lors de l\'export Excel');
  }
}

