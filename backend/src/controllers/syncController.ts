import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

/**
 * PULL : Télécharge toutes les données modifiées depuis la date 'since'
 * Si 'since' n'est pas fourni, renvoie l'intégralité de la base PostgreSQL
 */
export async function pullSyncData(req: Request, res: Response): Promise<void> {
  try {
    const sinceParam = req.query.since as string | undefined;
    const sinceDate = sinceParam ? new Date(sinceParam) : undefined;
    const isIncremental = sinceDate && !isNaN(sinceDate.getTime());

    const dateFilter = isIncremental ? { gte: sinceDate } : undefined;

    // Récupération en parallèle de toutes les entités
    const [
      roles,
      utilisateurs,
      produits,
      tarifs,
      clients,
      fournisseurs,
      caisses,
      ventes,
      depenses,
      achats,
      mouvementsStock,
      mouvementsCaisse,
      inventaires
    ] = await Promise.all([
      prisma.role.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
      }),
      prisma.utilisateur.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          actif: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.produit.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
        include: {
          tarifs: { where: { actif: true } },
          mouvementsStock: { orderBy: { id: 'desc' }, take: 1 },
        },
      }),
      prisma.tarif.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
      }),
      prisma.client.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
      }),
      prisma.fournisseur.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
      }),
      prisma.caisse.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
      }),
      prisma.vente.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
        include: {
          details: true,
          paiements: true,
          client: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: { id: 'desc' },
        take: isIncremental ? undefined : 200,
      }),
      prisma.depense.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
        orderBy: { id: 'desc' },
        take: isIncremental ? undefined : 100,
      }),
      prisma.achat.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
        include: { details: true },
        orderBy: { id: 'desc' },
        take: isIncremental ? undefined : 100,
      }),
      prisma.mouvementStock.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        orderBy: { id: 'desc' },
        take: isIncremental ? undefined : 200,
      }),
      prisma.mouvementCaisse.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        orderBy: { id: 'desc' },
        take: isIncremental ? undefined : 200,
      }),
      prisma.inventaire.findMany({
        where: dateFilter ? { updatedAt: dateFilter } : {},
        include: { details: true },
        orderBy: { id: 'desc' },
        take: isIncremental ? undefined : 50,
      }),
    ]);

    // Calculer le stock actuel pour chaque produit
    const produitsAvecStock = produits.map((p) => ({
      id: p.id,
      nom: p.nom,
      description: p.description,
      unite: p.unite,
      actif: p.actif,
      stockActuel: p.mouvementsStock[0] ? Number(p.mouvementsStock[0].stockApres) : 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tarifs: p.tarifs,
    }));

    successResponse(res, {
      serverTime: new Date().toISOString(),
      isIncremental: !!isIncremental,
      roles,
      utilisateurs,
      produits: produitsAvecStock,
      tarifs,
      clients,
      fournisseurs,
      caisses,
      ventes,
      depenses,
      achats,
      mouvementsStock,
      mouvementsCaisse,
      inventaires,
    });
  } catch (err) {
    console.error('[Sync] pullSyncData error:', err);
    errorResponse(res, 'Erreur lors de la récupération des données de synchronisation');
  }
}

/**
 * PUSH : Reçoit les données saisies hors-ligne ou sur mobile (SQLite)
 * et les insère dans PostgreSQL avec gestion d'idempotence et mapping des IDs.
 */
export async function pushSyncData(req: Request, res: Response): Promise<void> {
  try {
    const { clients, ventes, depenses, paiements, achats } = req.body;
    const utilisateurId = req.user?.id || 1;

    const mappings = {
      clients: [] as { localId: number; serverId: number }[],
      ventes: [] as { localId: number; serverId: number; reference: string }[],
      depenses: [] as { localId: number; serverId: number; numero: string }[],
      achats: [] as { localId: number; serverId: number; reference: string }[],
      paiements: [] as { localId: number; serverId: number }[],
      errors: [] as { entity: string; localId: number; message: string }[],
    };

    // 1. Synchronisation des Clients locaux
    if (clients && Array.isArray(clients) && clients.length > 0) {
      for (const client of clients) {
        try {
          // Vérifier si le client existe déjà (par nom et téléphone)
          let existing = null;
          if (client.telephone) {
            existing = await prisma.client.findFirst({
              where: { telephone: client.telephone, nom: client.nom },
            });
          }
          if (!existing) {
            existing = await prisma.client.create({
              data: {
                nom: client.nom,
                prenom: client.prenom || null,
                telephone: client.telephone || null,
                adresse: client.adresse || null,
                email: client.email || null,
                typeClient: client.typeClient || 'particulier',
                actif: client.actif !== false,
              },
            });
          }
          mappings.clients.push({ localId: client.id || client.localId, serverId: existing.id });
        } catch (e: any) {
          mappings.errors.push({ entity: 'client', localId: client.id, message: e.message });
        }
      }
    }

    // 2. Synchronisation des Ventes locales
    if (ventes && Array.isArray(ventes) && ventes.length > 0) {
      for (const vData of ventes) {
        try {
          const resVente = await prisma.$transaction(async (tx) => {
            // Résolution de la référence unique
            const reference = vData.reference || `VTE-SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Idempotence : vérifier si cette vente existe déjà
            const exist = await tx.vente.findUnique({ where: { reference } });
            if (exist) return exist;

            // Résoudre clientId si nécessaire
            let finalClientId = vData.clientId ? parseInt(vData.clientId) : null;
            if (vData.localClientId) {
              const mapped = mappings.clients.find((c) => c.localId === vData.localClientId);
              if (mapped) finalClientId = mapped.serverId;
            }

            const total = Number(vData.montantTotal);
            const paye = Number(vData.montantPaye) || 0;
            const reste = total - paye;

            // Créer la vente
            const createdVente = await tx.vente.create({
              data: {
                reference,
                clientId: finalClientId,
                utilisateurId: vData.utilisateurId || utilisateurId,
                dateVente: new Date(vData.dateVente || Date.now()),
                montantTotal: new Prisma.Decimal(total),
                montantPaye: new Prisma.Decimal(paye),
                resteAPayer: new Prisma.Decimal(reste),
                statut: vData.statut || 'validee',
                notes: vData.notes ? `${vData.notes} [SYNCHRO]` : '[SYNCHRO]',
              },
            });

            // Détails de la vente et déstockage
            if (vData.details && Array.isArray(vData.details)) {
              for (const d of vData.details) {
                const produitId = parseInt(d.produitId);
                let tarifId = d.tarifId ? parseInt(d.tarifId) : 0;
                const qte = Number(d.quantite);
                const prix = Number(d.prixUnitaire);

                // Si tarifId est 0 ou non trouvé, trouver le premier tarif actif du produit
                if (!tarifId || tarifId === 0) {
                  const premierTarif = await tx.tarif.findFirst({
                    where: { produitId, actif: true },
                  });
                  if (premierTarif) {
                    tarifId = premierTarif.id;
                  }
                }

                if (tarifId > 0) {
                  await tx.venteDetail.create({
                    data: {
                      venteId: createdVente.id,
                      produitId,
                      tarifId,
                      quantite: new Prisma.Decimal(qte),
                      prixUnitaire: new Prisma.Decimal(prix),
                      montant: new Prisma.Decimal(qte * prix),
                    },
                  });
                }

                // Déstockage
                const dernierMvt = await tx.mouvementStock.findFirst({
                  where: { produitId },
                  orderBy: { id: 'desc' },
                });
                const stockAvant = dernierMvt ? Number(dernierMvt.stockApres) : 0;
                const stockApres = stockAvant - qte;

                await tx.mouvementStock.create({
                  data: {
                    produitId,
                    typeOperation: 'sortie_vente',
                    quantite: new Prisma.Decimal(qte),
                    stockAvant: new Prisma.Decimal(stockAvant),
                    stockApres: new Prisma.Decimal(stockApres),
                    motif: `Vente ${createdVente.reference} (Synchro)`,
                    venteId: createdVente.id,
                  },
                });
              }
            }

            // Enregistrer le paiement initial s'il y a un acompte
            if (paye > 0) {
              const caisseOuverte = await tx.caisse.findFirst({
                where: { statut: 'ouverte' },
                orderBy: { id: 'desc' },
              });

              let mvtCaisseId: number | null = null;
              if (caisseOuverte) {
                const soldeAvant = Number(caisseOuverte.soldeTheorique);
                const soldeApres = soldeAvant + paye;

                const mvt = await tx.mouvementCaisse.create({
                  data: {
                    caisseId: caisseOuverte.id,
                    utilisateurId: vData.utilisateurId || utilisateurId,
                    typeOperation: 'entree_vente',
                    montant: new Prisma.Decimal(paye),
                    soldeAvant: new Prisma.Decimal(soldeAvant),
                    soldeApres: new Prisma.Decimal(soldeApres),
                    description: `Paiement Vente ${createdVente.reference} (Synchro)`,
                  },
                });
                mvtCaisseId = mvt.id;

                await tx.caisse.update({
                  where: { id: caisseOuverte.id },
                  data: { soldeTheorique: new Prisma.Decimal(soldeApres) },
                });
              }

              if (finalClientId) {
                await tx.paiementClient.create({
                  data: {
                    venteId: createdVente.id,
                    clientId: finalClientId,
                    montant: new Prisma.Decimal(paye),
                    modePaiement: vData.modePaiement || 'especes',
                    notes: `Paiement comptant synchro vente ${createdVente.reference}`,
                    mouvementCaisseId: mvtCaisseId,
                  },
                });
              }
            }

            return createdVente;
          });

          mappings.ventes.push({
            localId: vData.id || vData.localId,
            serverId: resVente.id,
            reference: resVente.reference,
          });
        } catch (e: any) {
          mappings.errors.push({ entity: 'vente', localId: vData.id, message: e.message });
        }
      }
    }

    // 3. Synchronisation des Dépenses locales
    if (depenses && Array.isArray(depenses) && depenses.length > 0) {
      for (const dData of depenses) {
        try {
          const numero = dData.numero || `DEP-SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const exist = await prisma.depense.findUnique({ where: { numero } });
          if (exist) {
            mappings.depenses.push({ localId: dData.id || dData.localId, serverId: exist.id, numero: exist.numero });
            continue;
          }

          const montant = Number(dData.montant);
          const caisseOuverte = await prisma.caisse.findFirst({
            where: { statut: 'ouverte' },
            orderBy: { id: 'desc' },
          });

          let mvtCaisseId: number | null = null;
          if (caisseOuverte) {
            const soldeAvant = Number(caisseOuverte.soldeTheorique);
            const soldeApres = soldeAvant - montant;

            const mvt = await prisma.mouvementCaisse.create({
              data: {
                caisseId: caisseOuverte.id,
                utilisateurId: dData.utilisateurId || utilisateurId,
                typeOperation: 'sortie_depense',
                montant: new Prisma.Decimal(montant),
                soldeAvant: new Prisma.Decimal(soldeAvant),
                soldeApres: new Prisma.Decimal(soldeApres),
                description: `Dépense ${numero}: ${dData.description || dData.categorie}`,
              },
            });
            mvtCaisseId = mvt.id;

            await prisma.caisse.update({
              where: { id: caisseOuverte.id },
              data: { soldeTheorique: new Prisma.Decimal(soldeApres) },
            });
          }

          const createdDep = await prisma.depense.create({
            data: {
              numero,
              utilisateurId: dData.utilisateurId || utilisateurId,
              categorie: dData.categorie || 'Autre',
              description: dData.description || 'Dépense synchro',
              montant: new Prisma.Decimal(montant),
              modePaiement: dData.modePaiement || 'especes',
              beneficiaire: dData.beneficiaire || null,
              dateDepense: new Date(dData.dateDepense || Date.now()),
              notes: dData.notes ? `${dData.notes} [SYNCHRO]` : '[SYNCHRO]',
              mouvementCaisseId: mvtCaisseId,
            },
          });

          mappings.depenses.push({
            localId: dData.id || dData.localId,
            serverId: createdDep.id,
            numero: createdDep.numero,
          });
        } catch (e: any) {
          mappings.errors.push({ entity: 'depense', localId: dData.id, message: e.message });
        }
      }
    }

    // 4. Synchronisation des Achats locaux
    if (achats && Array.isArray(achats) && achats.length > 0) {
      for (const aData of achats) {
        try {
          const reference = aData.reference || `ACH-SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const exist = await prisma.achat.findUnique({ where: { reference } });
          if (exist) {
            mappings.achats.push({ localId: aData.id || aData.localId, serverId: exist.id, reference: exist.reference });
            continue;
          }

          const total = Number(aData.montantTotal);
          const paye = Number(aData.montantPaye) || 0;
          const reste = total - paye;

          const createdAchat = await prisma.$transaction(async (tx) => {
            const ach = await tx.achat.create({
              data: {
                reference,
                fournisseurId: parseInt(aData.fournisseurId),
                utilisateurId: aData.utilisateurId || utilisateurId,
                dateAchat: new Date(aData.dateAchat || Date.now()),
                montantTotal: new Prisma.Decimal(total),
                montantPaye: new Prisma.Decimal(paye),
                resteAPayer: new Prisma.Decimal(reste),
                statut: aData.statut || 'receptionne',
                notes: aData.notes ? `${aData.notes} [SYNCHRO]` : '[SYNCHRO]',
              },
            });

            if (aData.details && Array.isArray(aData.details)) {
              for (const d of aData.details) {
                const produitId = parseInt(d.produitId);
                const qte = Number(d.quantite);
                const prix = Number(d.prixUnitaire);

                await tx.achatDetail.create({
                  data: {
                    achatId: ach.id,
                    produitId,
                    quantite: new Prisma.Decimal(qte),
                    prixUnitaire: new Prisma.Decimal(prix),
                    montant: new Prisma.Decimal(qte * prix),
                  },
                });

                if (aData.statut === 'receptionne') {
                  const dernierMvt = await tx.mouvementStock.findFirst({
                    where: { produitId },
                    orderBy: { id: 'desc' },
                  });
                  const stockAvant = dernierMvt ? Number(dernierMvt.stockApres) : 0;
                  const stockApres = stockAvant + qte;

                  await tx.mouvementStock.create({
                    data: {
                      produitId,
                      typeOperation: 'entree_achat',
                      quantite: new Prisma.Decimal(qte),
                      stockAvant: new Prisma.Decimal(stockAvant),
                      stockApres: new Prisma.Decimal(stockApres),
                      motif: `Achat ${ach.reference} (Synchro)`,
                      achatId: ach.id,
                    },
                  });
                }
              }
            }

            return ach;
          });

          mappings.achats.push({
            localId: aData.id || aData.localId,
            serverId: createdAchat.id,
            reference: createdAchat.reference,
          });
        } catch (e: any) {
          mappings.errors.push({ entity: 'achat', localId: aData.id, message: e.message });
        }
      }
    }

    await logAudit({
      utilisateurId,
      action: 'SYNC_BIDIRECTIONAL_PUSH',
      table: 'Sync',
      nouvellesValeurs: {
        clientsSynced: mappings.clients.length,
        ventesSynced: mappings.ventes.length,
        depensesSynced: mappings.depenses.length,
        achatsSynced: mappings.achats.length,
        errorsCount: mappings.errors.length,
      },
      adresseIp: req.ip,
    });

    successResponse(res, {
      mappings,
      serverTime: new Date().toISOString(),
    }, 'Synchronisation push terminée avec succès');
  } catch (err) {
    console.error('[Sync] pushSyncData error:', err);
    errorResponse(res, 'Erreur lors du traitement de la synchronisation push');
  }
}

// Rétrocompatibilité avec les anciens appels
export const getSyncBootstrap = pullSyncData;
export const pushSyncOfflineData = pushSyncData;
