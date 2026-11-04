import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

export async function getFournisseurs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FournisseurWhereInput = { actif: true };

    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    const [fournisseurs, total] = await Promise.all([
      prisma.fournisseur.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nom: 'asc' },
        include: {
          achats: {
            select: {
              montantTotal: true,
              montantPaye: true,
              resteAPayer: true,
            },
          },
        },
      }),
      prisma.fournisseur.count({ where }),
    ]);

    const fournisseursWithDette = fournisseurs.map((f) => {
      const totalAchats = f.achats.reduce((acc, a) => acc + Number(a.montantTotal), 0);
      const totalPaye = f.achats.reduce((acc, a) => acc + Number(a.montantPaye), 0);
      const totalDette = f.achats.reduce((acc, a) => acc + Number(a.resteAPayer), 0);

      return {
        id: f.id,
        nom: f.nom,
        contact: f.contact,
        telephone: f.telephone,
        adresse: f.adresse,
        email: f.email,
        actif: f.actif,
        createdAt: f.createdAt,
        totalAchats,
        totalPaye,
        totalDette,
        aDette: totalDette > 0,
      };
    });

    let finalFournisseurs = fournisseursWithDette;
    if (req.query.avecDette === 'true') {
      finalFournisseurs = fournisseursWithDette.filter((f) => f.aDette);
    } else if (req.query.avecDette === 'false') {
      finalFournisseurs = fournisseursWithDette.filter((f) => !f.aDette);
    }

    paginatedResponse(res, finalFournisseurs, total, page, limit);
  } catch (err) {
    console.error('[Fournisseurs] getFournisseurs error:', err);
    errorResponse(res, 'Erreur lors de la récupération des fournisseurs');
  }
}

export async function getFournisseurById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        achats: {
          orderBy: { dateAchat: 'desc' },
          include: {
            details: {
              include: {
                produit: { select: { nom: true } },
              },
            },
          },
        },
        paiements: {
          orderBy: { datePaiement: 'desc' },
        },
      },
    });

    if (!fournisseur) {
      errorResponse(res, 'Fournisseur introuvable', 404);
      return;
    }

    const totalAchats = fournisseur.achats.reduce((acc, a) => acc + Number(a.montantTotal), 0);
    const totalPaye = fournisseur.achats.reduce((acc, a) => acc + Number(a.montantPaye), 0);
    const totalDette = fournisseur.achats.reduce((acc, a) => acc + Number(a.resteAPayer), 0);

    successResponse(res, {
      ...fournisseur,
      totalAchats,
      totalPaye,
      totalDette,
    });
  } catch (err) {
    console.error('[Fournisseurs] getFournisseurById error:', err);
    errorResponse(res, 'Erreur lors de la récupération du fournisseur');
  }
}

export async function createFournisseur(req: Request, res: Response): Promise<void> {
  try {
    const { nom, contact, telephone, adresse, email } = req.body;

    if (!nom) {
      errorResponse(res, 'Le nom du fournisseur est obligatoire', 400);
      return;
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom: nom.trim(),
        contact: contact ? contact.trim() : null,
        telephone: telephone ? telephone.trim() : null,
        adresse: adresse ? adresse.trim() : null,
        email: email ? email.trim() : null,
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'CREATE_FOURNISSEUR',
      table: 'Fournisseur',
      enregistrementId: fournisseur.id,
      nouvellesValeurs: { nom, telephone, contact },
      adresseIp: req.ip,
    });

    successResponse(res, fournisseur, 'Fournisseur créé avec succès', 201);
  } catch (err) {
    console.error('[Fournisseurs] createFournisseur error:', err);
    errorResponse(res, 'Erreur lors de la création du fournisseur');
  }
}

export async function updateFournisseur(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const { nom, contact, telephone, adresse, email, actif } = req.body;

    const exist = await prisma.fournisseur.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Fournisseur introuvable', 404);
      return;
    }

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom: nom !== undefined ? nom.trim() : exist.nom,
        contact: contact !== undefined ? (contact ? contact.trim() : null) : exist.contact,
        telephone: telephone !== undefined ? telephone : exist.telephone,
        adresse: adresse !== undefined ? adresse : exist.adresse,
        email: email !== undefined ? email : exist.email,
        actif: actif !== undefined ? actif : exist.actif,
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'UPDATE_FOURNISSEUR',
      table: 'Fournisseur',
      enregistrementId: fournisseur.id,
      anciennesValeurs: { nom: exist.nom, actif: exist.actif },
      nouvellesValeurs: { nom: fournisseur.nom, actif: fournisseur.actif },
      adresseIp: req.ip,
    });

    successResponse(res, fournisseur, 'Fournisseur mis à jour avec succès');
  } catch (err) {
    console.error('[Fournisseurs] updateFournisseur error:', err);
    errorResponse(res, 'Erreur lors de la mise à jour du fournisseur');
  }
}

export async function enregistrerPaiementFournisseur(req: Request, res: Response): Promise<void> {
  try {
    const fournisseurId = parseInt(req.params.id as any);
    const { montant, modePaiement, notes, achatId } = req.body;

    if (!montant || Number(montant) <= 0) {
      errorResponse(res, 'Montant de paiement invalide', 400);
      return;
    }

    const montantNum = Number(montant);
    const mode = modePaiement || 'especes';

    const result = await prisma.$transaction(async (tx) => {
      const fournisseur = await tx.fournisseur.findUnique({
        where: { id: fournisseurId },
        include: {
          achats: {
            where: { resteAPayer: { gt: 0 } },
            orderBy: { dateAchat: 'asc' },
          },
        },
      });

      if (!fournisseur) throw new Error('Fournisseur introuvable');

      const totalDette = fournisseur.achats.reduce((acc, a) => acc + Number(a.resteAPayer), 0);
      if (totalDette === 0) {
        throw new Error('Aucune dette en cours auprès de ce fournisseur');
      }

      // Décaissement de caisse si paiement en espèces
      let caisseMouvementId: number | null = null;
      if (mode === 'especes') {
        const caisseOuverte = await tx.caisse.findFirst({
          where: { statut: 'ouverte' },
          orderBy: { id: 'desc' },
        });

        if (caisseOuverte) {
          const soldeAvant = Number(caisseOuverte.soldeTheorique);
          if (soldeAvant < montantNum) {
            throw new Error(`Solde de caisse insuffisant (${soldeAvant} F disponibles)`);
          }

          const soldeApres = soldeAvant - montantNum;

          const mvt = await tx.mouvementCaisse.create({
            data: {
              caisseId: caisseOuverte.id,
              utilisateurId: req.user!.id,
              typeOperation: 'paiement_fournisseur',
              montant: new Prisma.Decimal(montantNum),
              soldeAvant: new Prisma.Decimal(soldeAvant),
              soldeApres: new Prisma.Decimal(soldeApres),
              description: `Paiement dette fournisseur: ${fournisseur.nom}`,
            },
          });

          await tx.caisse.update({
            where: { id: caisseOuverte.id },
            data: { soldeTheorique: new Prisma.Decimal(soldeApres) },
          });

          caisseMouvementId = mvt.id;
        }
      }

      // Imputer le paiement sur les achats à crédit
      let resteADistribuer = montantNum;

      if (achatId) {
        const achatCible = fournisseur.achats.find((a) => a.id === parseInt(achatId));
        if (achatCible) {
          const detteAchat = Number(achatCible.resteAPayer);
          const payeAchat = Math.min(resteADistribuer, detteAchat);
          const nouveauPaye = Number(achatCible.montantPaye) + payeAchat;
          const nouveauReste = detteAchat - payeAchat;

          await tx.achat.update({
            where: { id: achatCible.id },
            data: {
              montantPaye: new Prisma.Decimal(nouveauPaye),
              resteAPayer: new Prisma.Decimal(nouveauReste),
              statut: nouveauReste === 0 ? 'paye' : achatCible.statut,
            },
          });

          resteADistribuer -= payeAchat;
        }
      }

      for (const a of fournisseur.achats) {
        if (resteADistribuer <= 0) break;
        if (achatId && a.id === parseInt(achatId)) continue;

        const detteAchat = Number(a.resteAPayer);
        const payeAchat = Math.min(resteADistribuer, detteAchat);
        const nouveauPaye = Number(a.montantPaye) + payeAchat;
        const nouveauReste = detteAchat - payeAchat;

        await tx.achat.update({
          where: { id: a.id },
          data: {
            montantPaye: new Prisma.Decimal(nouveauPaye),
            resteAPayer: new Prisma.Decimal(nouveauReste),
            statut: nouveauReste === 0 ? 'paye' : a.statut,
          },
        });

        resteADistribuer -= payeAchat;
      }

      const paiement = await tx.paiementFournisseur.create({
        data: {
          fournisseurId: fournisseur.id,
          achatId: achatId ? parseInt(achatId) : null,
          montant: new Prisma.Decimal(montantNum),
          modePaiement: mode,
          notes: notes || null,
          mouvementCaisseId: caisseMouvementId,
        },
      });

      return paiement;
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'PAIEMENT_DETTE_FOURNISSEUR',
      table: 'PaiementFournisseur',
      enregistrementId: result.id,
      nouvellesValeurs: { fournisseurId, montant: montantNum, modePaiement: mode },
      adresseIp: req.ip,
    });

    successResponse(res, result, 'Paiement fournisseur enregistré', 201);
  } catch (err: unknown) {
    console.error('[Fournisseurs] enregistrerPaiementFournisseur error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors du paiement fournisseur';
    errorResponse(res, message, 400);
  }
}

export async function getReleveFournisseur(req: Request, res: Response): Promise<void> {
  try {
    const fournisseurId = parseInt(req.params.id as any);
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: fournisseurId },
      include: {
        achats: {
          orderBy: { dateAchat: 'desc' },
          include: {
            details: {
              include: {
                produit: { select: { nom: true } },
              },
            },
          },
        },
        paiements: {
          orderBy: { datePaiement: 'desc' },
        },
      },
    });

    if (!fournisseur) {
      errorResponse(res, 'Fournisseur introuvable', 404);
      return;
    }

    const totalAchats = fournisseur.achats.reduce((acc, a) => acc + Number(a.montantTotal), 0);
    const totalPaye = fournisseur.achats.reduce((acc, a) => acc + Number(a.montantPaye), 0);
    const resteAPayer = fournisseur.achats.reduce((acc, a) => acc + Number(a.resteAPayer), 0);

    successResponse(res, {
      fournisseur: {
        id: fournisseur.id,
        nom: fournisseur.nom,
        contact: fournisseur.contact,
        telephone: fournisseur.telephone,
        adresse: fournisseur.adresse,
      },
      recapitulatif: {
        totalAchats,
        totalPaye,
        resteAPayer,
      },
      achats: fournisseur.achats,
      paiements: fournisseur.paiements,
    });
  } catch (err) {
    console.error('[Fournisseurs] getReleveFournisseur error:', err);
    errorResponse(res, 'Erreur lors de la génération du relevé');
  }
}

/**
 * Supprimer un fournisseur (soft delete)
 */
export async function deleteFournisseur(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const exist = await prisma.fournisseur.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Fournisseur introuvable', 404);
      return;
    }

    await prisma.fournisseur.update({
      where: { id },
      data: { actif: false },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'DELETE_FOURNISSEUR',
      table: 'Fournisseur',
      enregistrementId: id,
      anciennesValeurs: { nom: exist.nom, telephone: exist.telephone },
      nouvellesValeurs: { actif: false },
      adresseIp: req.ip,
    });

    successResponse(res, { id }, 'Fournisseur supprimé avec succès');
  } catch (err) {
    console.error('[Fournisseurs] deleteFournisseur error:', err);
    errorResponse(res, 'Erreur lors de la suppression du fournisseur');
  }
}
