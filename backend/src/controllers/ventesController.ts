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

export async function getVentes(req: Request, res: Response): Promise<void> {

  try {

    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const skip = (page - 1) * limit;

    const where: Prisma.VenteWhereInput = {};

    if (req.query.statut) where.statut = req.query.statut as string;

    if (req.query.clientId) where.clientId = parseInt(req.query.clientId as string);

    if (req.query.dateDebut || req.query.dateFin) {

      where.dateVente = {};

      if (req.query.dateDebut) where.dateVente.gte = new Date(req.query.dateDebut as string);

      if (req.query.dateFin) {

        const fin = new Date(req.query.dateFin as string);

        fin.setHours(23, 59, 59, 999);

        where.dateVente.lte = fin;

      }

    }

    if (req.query.reference) {

      where.reference = { contains: req.query.reference as string, mode: 'insensitive' };

    }

    const [ventes, total] = await Promise.all([

      prisma.vente.findMany({

        where,

        skip,

        take: limit,

        orderBy: { dateVente: 'desc' },

        include: {

          client: { select: { id: true, nom: true, prenom: true, telephone: true } },

          utilisateur: { select: { id: true, nom: true, prenom: true } },

          details: {

            include: {

              produit: { select: { id: true, nom: true } },

              tarif: { select: { id: true, designation: true } },

            },

          },

          _count: { select: { paiements: true } },

        },

      }),

      prisma.vente.count({ where }),

    ]);

    paginatedResponse(res, ventes, total, page, limit);

  } catch (err) {

    console.error('[Ventes] getVentes error:', err);

    errorResponse(res, 'Erreur lors de la récupération des ventes', 500);

  }

}

export async function getVente(req: Request, res: Response): Promise<void> {

  try {

    const id = parseInt(req.params.id as any);

    const vente = await prisma.vente.findUnique({

      where: { id },

      include: {

        client: true,

        utilisateur: { select: { id: true, nom: true, prenom: true } },

        details: {

          include: {

            produit: true,

            tarif: true,

          },

        },

        paiements: {

          include: { client: { select: { nom: true, prenom: true } } },

        },

        mouvementsStock: {

          include: { produit: { select: { nom: true } } },

        },

      },

    });

    if (!vente) {

      errorResponse(res, 'Vente introuvable', 404);

      return;

    }

    successResponse(res, vente);

  } catch (err) {

    console.error('[Ventes] getVente error:', err);

    errorResponse(res, 'Erreur lors de la récupération de la vente', 500);

  }

}

export async function createVente(req: Request, res: Response): Promise<void> {

  try {

    const {

      clientId,

      details,

      montantPaye = 0,

      modePaiement = 'especes',

      notes,

    } = req.body;

    if (!details || !Array.isArray(details) || details.length === 0) {

      errorResponse(res, 'Les détails de la vente sont requis', 400);

      return;

    }

    // Validate all details have required fields

    for (const d of details) {

      if (!d.produitId || !d.quantite || d.quantite <= 0) {
        errorResponse(res, 'Chaque detail doit avoir produitId et quantite > 0', 400);
        return;
      }

    }

    // Get caisse ouverte

    const caisseOuverte = await prisma.caisse.findFirst({

      where: { statut: 'ouverte' },

    });

    const reference = generateReference('VNT');

    const utilisateurId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {

      // Calculate totals and build detail data

      let montantTotal = new Prisma.Decimal(0);

      const detailsData: Array<{

        produitId: number;

        tarifId: number;

        quantite: Prisma.Decimal;

        prixUnitaire: Prisma.Decimal;

        montant: Prisma.Decimal;

      }> = [];

      for (const d of details) {
        let tarif = d.tarifId ? await tx.tarif.findUnique({ where: { id: d.tarifId } }) : null;
        if (!tarif) {
          tarif = await tx.tarif.findFirst({ where: { produitId: d.produitId, actif: true } });
        }
        if (!tarif) {
          throw new Error('Aucun tarif actif trouve pour le produit ID ' + d.produitId);
        }
        const quantite = new Prisma.Decimal(d.quantite);
        const prixUnitaire = (d.prixUnitaire !== undefined && Number(d.prixUnitaire) > 0)
          ? new Prisma.Decimal(d.prixUnitaire)
          : tarif.prix;
        const montant = quantite.mul(prixUnitaire);
        montantTotal = montantTotal.add(montant);
        detailsData.push({ produitId: d.produitId, tarifId: tarif.id, quantite, prixUnitaire, montant });
      }

      const montantPayeDecimal = new Prisma.Decimal(montantPaye);

      const resteAPayer = montantTotal.sub(montantPayeDecimal);

      // Create vente

      const vente = await tx.vente.create({

        data: {

          reference,

          clientId: clientId ?? null,

          utilisateurId,

          montantTotal,

          montantPaye: montantPayeDecimal,

          resteAPayer,

          statut: 'validee',

          notes: notes ?? null,

          details: {

            create: detailsData,

          },

        },

        include: {

          details: { include: { produit: true, tarif: true } },

          client: true,

        },

      });

      // Create stock movements for each detail

      for (const d of detailsData) {

        const lastMouvement = await tx.mouvementStock.findFirst({

          where: { produitId: d.produitId },

          orderBy: { id: 'desc' },

        });

        const stockAvant = lastMouvement ? lastMouvement.stockApres : new Prisma.Decimal(0);

        const stockApres = stockAvant.sub(d.quantite);

        await tx.mouvementStock.create({

          data: {

            produitId: d.produitId,

            typeOperation: 'sortie_vente',

            quantite: d.quantite,

            stockAvant,

            stockApres,

            motif: `Vente ${reference}`,

            venteId: vente.id,

          },

        });

      }

      // If payment made and caisse open, create mouvement caisse + paiement

      if (montantPayeDecimal.gt(0)) {

        if (caisseOuverte) {

          const soldeAvant = caisseOuverte.soldeTheorique;

          const soldeApres = soldeAvant.add(montantPayeDecimal);

          const mouvCaisse = await tx.mouvementCaisse.create({

            data: {

              caisseId: caisseOuverte.id,

              utilisateurId,

              typeOperation: 'encaissement_vente',

              montant: montantPayeDecimal,

              soldeAvant,

              soldeApres,

              description: `Encaissement vente ${reference}`,

            },

          });

          await tx.caisse.update({

            where: { id: caisseOuverte.id },

            data: { soldeTheorique: soldeApres },

          });

          // Create paiement client

          if (clientId) {

            await tx.paiementClient.create({

              data: {

                venteId: vente.id,

                clientId,

                montant: montantPayeDecimal,

                modePaiement,

                mouvementCaisseId: mouvCaisse.id,

              },

            });

          }

        } else if (clientId) {

          // No caisse open but still record the payment

          await tx.paiementClient.create({

            data: {

              venteId: vente.id,

              clientId,

              montant: montantPayeDecimal,

              modePaiement,

            },

          });

        }

      }

      return vente;

    });

    await logAudit({

      utilisateurId,

      action: 'CREATE',

      table: 'Vente',

      enregistrementId: result.id,

      nouvellesValeurs: { reference: result.reference, montantTotal: result.montantTotal.toString() },

      adresseIp: req.ip,

    });

    successResponse(res, result, 'Vente créée avec succès', 201);

  } catch (err: unknown) {

    console.error('[Ventes] createVente error:', err);

    const message = err instanceof Error ? err.message : 'Erreur lors de la création de la vente';

    errorResponse(res, message, 500);

  }

}

export async function annulerVente(req: Request, res: Response): Promise<void> {

  try {

    const id = parseInt(req.params.id as any);

    const { motif } = req.body;

    const vente = await prisma.vente.findUnique({

      where: { id },

      include: { details: true },

    });

    if (!vente) {

      errorResponse(res, 'Vente introuvable', 404);

      return;

    }

    if (vente.statut === 'annulee') {

      errorResponse(res, 'Cette vente est déjà annulée', 400);

      return;

    }

    const utilisateurId = req.user!.id;

    await prisma.$transaction(async (tx) => {

      // Restore stock for each detail

      for (const d of vente.details) {

        const lastMouvement = await tx.mouvementStock.findFirst({

          where: { produitId: d.produitId },

          orderBy: { id: 'desc' },

        });

        const stockAvant = lastMouvement ? lastMouvement.stockApres : new Prisma.Decimal(0);

        const stockApres = stockAvant.add(d.quantite);

        await tx.mouvementStock.create({

          data: {

            produitId: d.produitId,

            typeOperation: 'retour_client',

            quantite: d.quantite,

            stockAvant,

            stockApres,

            motif: `Annulation vente ${vente.reference}${motif ? ` - ${motif}` : ''}`,

            venteId: vente.id,

          },

        });

      }

      // Reverse caisse if payment was made

      if (vente.montantPaye.gt(0)) {

        const caisseOuverte = await tx.caisse.findFirst({ where: { statut: 'ouverte' } });

        if (caisseOuverte) {

          const soldeAvant = caisseOuverte.soldeTheorique;

          const soldeApres = soldeAvant.sub(vente.montantPaye);

          await tx.mouvementCaisse.create({

            data: {

              caisseId: caisseOuverte.id,

              utilisateurId,

              typeOperation: 'autre_sortie',

              montant: vente.montantPaye,

              soldeAvant,

              soldeApres,

              description: `Annulation vente ${vente.reference}`,

            },

          });

          await tx.caisse.update({

            where: { id: caisseOuverte.id },

            data: { soldeTheorique: soldeApres },

          });

        }

      }

      await tx.vente.update({

        where: { id },

        data: { statut: 'annulee', notes: vente.notes ? `${vente.notes} | Annulation: ${motif}` : `Annulation: ${motif}` },

      });

    });

    await logAudit({

      utilisateurId,

      action: 'ANNULER',

      table: 'Vente',

      enregistrementId: id,

      anciennesValeurs: { statut: 'validee' },

      nouvellesValeurs: { statut: 'annulee', motif },

      adresseIp: req.ip,

    });

    successResponse(res, null, 'Vente annulée avec succès');

  } catch (err) {

    console.error('[Ventes] annulerVente error:', err);

    errorResponse(res, 'Erreur lors de l\'annulation de la vente', 500);

  }

}

export async function getTicket(req: Request, res: Response): Promise<void> {

  try {

    const id = parseInt(req.params.id as any);

    const vente = await prisma.vente.findUnique({

      where: { id },

      include: {

        client: { select: { nom: true, prenom: true, telephone: true } },

        utilisateur: { select: { nom: true, prenom: true } },

        details: {

          include: {

            produit: { select: { nom: true, unite: true } },

            tarif: { select: { designation: true } },

          },

        },

        paiements: true,

      },

    });

    if (!vente) {

      errorResponse(res, 'Vente introuvable', 404);

      return;

    }

    successResponse(res, {

      ...vente,

      entreprise: {

        nom: 'PANI GESTION',

        devise: 'FCFA',

      },

    });

  } catch (err) {

    console.error('[Ventes] getTicket error:', err);

    errorResponse(res, 'Erreur lors de la récupération du ticket', 500);

  }

}

