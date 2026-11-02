import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

export async function getClients(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = { actif: true };

    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    if (req.query.typeClient) {
      where.typeClient = req.query.typeClient as string;
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nom: 'asc' },
        include: {
          ventes: {
            where: { statut: 'validee' },
            select: {
              montantTotal: true,
              montantPaye: true,
              resteAPayer: true,
            },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    // Calculer la dette totale de chaque client
    const clientsWithDette = clients.map((c) => {
      const totalVentes = c.ventes.reduce((acc, v) => acc + Number(v.montantTotal), 0);
      const totalPaye = c.ventes.reduce((acc, v) => acc + Number(v.montantPaye), 0);
      const totalDette = c.ventes.reduce((acc, v) => acc + Number(v.resteAPayer), 0);

      return {
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        telephone: c.telephone,
        adresse: c.adresse,
        email: c.email,
        typeClient: c.typeClient,
        actif: c.actif,
        createdAt: c.createdAt,
        totalVentes,
        totalPaye,
        totalDette,
        aDette: totalDette > 0,
      };
    });

    paginatedResponse(res, clientsWithDette, total, page, limit);
  } catch (err) {
    console.error('[Clients] getClients error:', err);
    errorResponse(res, 'Erreur lors de la récupération des clients');
  }
}

export async function getClientById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        ventes: {
          orderBy: { dateVente: 'desc' },
          include: {
            details: {
              include: {
                produit: { select: { nom: true } },
                tarif: { select: { designation: true } },
              },
            },
          },
        },
        paiements: {
          orderBy: { datePaiement: 'desc' },
        },
      },
    });

    if (!client) {
      errorResponse(res, 'Client introuvable', 404);
      return;
    }

    const totalVentes = client.ventes
      .filter((v) => v.statut === 'validee')
      .reduce((acc, v) => acc + Number(v.montantTotal), 0);
    const totalPaye = client.ventes
      .filter((v) => v.statut === 'validee')
      .reduce((acc, v) => acc + Number(v.montantPaye), 0);
    const totalDette = client.ventes
      .filter((v) => v.statut === 'validee')
      .reduce((acc, v) => acc + Number(v.resteAPayer), 0);

    successResponse(res, {
      ...client,
      totalVentes,
      totalPaye,
      totalDette,
    });
  } catch (err) {
    console.error('[Clients] getClientById error:', err);
    errorResponse(res, 'Erreur lors de la récupération du client');
  }
}

export async function createClient(req: Request, res: Response): Promise<void> {
  try {
    const { nom, prenom, telephone, adresse, email, typeClient } = req.body;

    if (!nom) {
      errorResponse(res, 'Le nom est obligatoire', 400);
      return;
    }

    const client = await prisma.client.create({
      data: {
        nom: nom.trim(),
        prenom: prenom ? prenom.trim() : null,
        telephone: telephone ? telephone.trim() : null,
        adresse: adresse ? adresse.trim() : null,
        email: email ? email.trim() : null,
        typeClient: typeClient || 'particulier',
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'CREATE_CLIENT',
      table: 'Client',
      enregistrementId: client.id,
      nouvellesValeurs: { nom, telephone, typeClient },
      adresseIp: req.ip,
    });

    successResponse(res, client, 'Client créé avec succès', 201);
  } catch (err) {
    console.error('[Clients] createClient error:', err);
    errorResponse(res, 'Erreur lors de la création du client');
  }
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const { nom, prenom, telephone, adresse, email, typeClient, actif } = req.body;

    const exist = await prisma.client.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Client introuvable', 404);
      return;
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        nom: nom !== undefined ? nom.trim() : exist.nom,
        prenom: prenom !== undefined ? (prenom ? prenom.trim() : null) : exist.prenom,
        telephone: telephone !== undefined ? telephone : exist.telephone,
        adresse: adresse !== undefined ? adresse : exist.adresse,
        email: email !== undefined ? email : exist.email,
        typeClient: typeClient !== undefined ? typeClient : exist.typeClient,
        actif: actif !== undefined ? actif : exist.actif,
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'UPDATE_CLIENT',
      table: 'Client',
      enregistrementId: client.id,
      anciennesValeurs: { nom: exist.nom, actif: exist.actif },
      nouvellesValeurs: { nom: client.nom, actif: client.actif },
      adresseIp: req.ip,
    });

    successResponse(res, client, 'Client mis à jour avec succès');
  } catch (err) {
    console.error('[Clients] updateClient error:', err);
    errorResponse(res, 'Erreur lors de la mise à jour du client');
  }
}

export async function enregistrerPaiementDette(req: Request, res: Response): Promise<void> {
  try {
    const clientId = parseInt(req.params.id as any);
    const { montant, modePaiement, notes, venteId } = req.body;

    if (!montant || Number(montant) <= 0) {
      errorResponse(res, 'Montant de paiement invalide', 400);
      return;
    }

    const montantNum = Number(montant);
    const mode = modePaiement || 'especes';

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        include: {
          ventes: {
            where: { statut: 'validee', resteAPayer: { gt: 0 } },
            orderBy: { dateVente: 'asc' }, // Payer en priorité les dettes les plus anciennes
          },
        },
      });

      if (!client) throw new Error('Client introuvable');

      const totalDette = client.ventes.reduce((acc, v) => acc + Number(v.resteAPayer), 0);
      if (totalDette === 0) {
        throw new Error('Ce client n\'a aucune dette en cours');
      }

      // Si paiement en espèces, vérifier s'il y a une caisse ouverte pour enregistrer le mouvement
      let caisseMouvementId: number | null = null;
      if (mode === 'especes') {
        const caisseOuverte = await tx.caisse.findFirst({
          where: { statut: 'ouverte' },
          orderBy: { id: 'desc' },
        });

        if (caisseOuverte) {
          const soldeAvant = Number(caisseOuverte.soldeTheorique);
          const soldeApres = soldeAvant + montantNum;

          const mvt = await tx.mouvementCaisse.create({
            data: {
              caisseId: caisseOuverte.id,
              utilisateurId: req.user!.id,
              typeOperation: 'paiement_client_dette',
              montant: new Prisma.Decimal(montantNum),
              soldeAvant: new Prisma.Decimal(soldeAvant),
              soldeApres: new Prisma.Decimal(soldeApres),
              description: `Règlement dette client: ${client.nom} ${client.prenom || ''}`,
            },
          });

          await tx.caisse.update({
            where: { id: caisseOuverte.id },
            data: { soldeTheorique: new Prisma.Decimal(soldeApres) },
          });

          caisseMouvementId = mvt.id;
        }
      }

      // Répartir le paiement sur les ventes à crédit
      let resteADistribuer = montantNum;

      if (venteId) {
        // Cibler une vente spécifique
        const venteCible = client.ventes.find((v) => v.id === parseInt(venteId));
        if (venteCible) {
          const detteVente = Number(venteCible.resteAPayer);
          const payeVente = Math.min(resteADistribuer, detteVente);
          const nouveauPaye = Number(venteCible.montantPaye) + payeVente;
          const nouveauReste = detteVente - payeVente;

          await tx.vente.update({
            where: { id: venteCible.id },
            data: {
              montantPaye: new Prisma.Decimal(nouveauPaye),
              resteAPayer: new Prisma.Decimal(nouveauReste),
            },
          });

          resteADistribuer -= payeVente;
        }
      }

      // Distribuer le reste sur les autres ventes
      for (const v of client.ventes) {
        if (resteADistribuer <= 0) break;
        if (venteId && v.id === parseInt(venteId)) continue;

        const detteVente = Number(v.resteAPayer);
        const payeVente = Math.min(resteADistribuer, detteVente);
        const nouveauPaye = Number(v.montantPaye) + payeVente;
        const nouveauReste = detteVente - payeVente;

        await tx.vente.update({
          where: { id: v.id },
          data: {
            montantPaye: new Prisma.Decimal(nouveauPaye),
            resteAPayer: new Prisma.Decimal(nouveauReste),
          },
        });

        resteADistribuer -= payeVente;
      }

      // Enregistrer le paiement client
      const paiement = await tx.paiementClient.create({
        data: {
          clientId: client.id,
          venteId: venteId ? parseInt(venteId) : null,
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
      action: 'PAIEMENT_DETTE_CLIENT',
      table: 'PaiementClient',
      enregistrementId: result.id,
      nouvellesValeurs: { clientId, montant: montantNum, modePaiement: mode },
      adresseIp: req.ip,
    });

    successResponse(res, result, 'Paiement enregistré avec succès', 201);
  } catch (err: unknown) {
    console.error('[Clients] enregistrerPaiementDette error:', err);
    const message = err instanceof Error ? err.message : 'Erreur lors du paiement';
    errorResponse(res, message, 400);
  }
}

export async function getReleveClient(req: Request, res: Response): Promise<void> {
  try {
    const clientId = parseInt(req.params.id as any);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        ventes: {
          where: { statut: 'validee' },
          orderBy: { dateVente: 'desc' },
          include: {
            details: {
              include: {
                produit: { select: { nom: true } },
                tarif: { select: { designation: true } },
              },
            },
          },
        },
        paiements: {
          orderBy: { datePaiement: 'desc' },
        },
      },
    });

    if (!client) {
      errorResponse(res, 'Client introuvable', 404);
      return;
    }

    const totalVentes = client.ventes.reduce((acc, v) => acc + Number(v.montantTotal), 0);
    const totalPaye = client.ventes.reduce((acc, v) => acc + Number(v.montantPaye), 0);
    const resteAPayer = client.ventes.reduce((acc, v) => acc + Number(v.resteAPayer), 0);

    successResponse(res, {
      client: {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom,
        telephone: client.telephone,
        adresse: client.adresse,
        typeClient: client.typeClient,
      },
      recapitulatif: {
        totalVentes,
        totalPaye,
        resteAPayer,
      },
      ventes: client.ventes,
      paiements: client.paiements,
    });
  } catch (err) {
    console.error('[Clients] getReleveClient error:', err);
    errorResponse(res, 'Erreur lors de la génération du relevé');
  }
}
