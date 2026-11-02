import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

// --- PRODUITS ---

export async function getProduits(req: Request, res: Response): Promise<void> {
  try {
    const actifOnly = req.query.actif !== 'false';
    const where: Prisma.ProduitWhereInput = actifOnly ? { actif: true } : {};

    const produits = await prisma.produit.findMany({
      where,
      include: {
        tarifs: {
          where: { actif: true },
          orderBy: { prix: 'asc' },
        },
      },
      orderBy: { nom: 'asc' },
    });

    successResponse(res, produits);
  } catch (err) {
    console.error('[Produits] getProduits error:', err);
    errorResponse(res, 'Erreur lors de la récupération des produits');
  }
}

export async function getProduitById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const produit = await prisma.produit.findUnique({
      where: { id },
      include: {
        tarifs: true,
      },
    });

    if (!produit) {
      errorResponse(res, 'Produit introuvable', 404);
      return;
    }

    successResponse(res, produit);
  } catch (err) {
    console.error('[Produits] getProduitById error:', err);
    errorResponse(res, 'Erreur lors de la récupération du produit');
  }
}

export async function createProduit(req: Request, res: Response): Promise<void> {
  try {
    const { nom, description, unite, tarifs } = req.body;

    if (!nom) {
      errorResponse(res, 'Le nom du produit est obligatoire', 400);
      return;
    }

    const produit = await prisma.produit.create({
      data: {
        nom,
        description,
        unite: unite || 'unité',
        tarifs: tarifs && Array.isArray(tarifs)
          ? {
              create: tarifs.map((t: { designation: string; prix: number }) => ({
                designation: t.designation,
                prix: new Prisma.Decimal(t.prix),
              })),
            }
          : undefined,
      },
      include: { tarifs: true },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'CREATE_PRODUIT',
      table: 'Produit',
      enregistrementId: produit.id,
      nouvellesValeurs: { nom, description },
      adresseIp: req.ip,
    });

    successResponse(res, produit, 'Produit créé avec succès', 201);
  } catch (err) {
    console.error('[Produits] createProduit error:', err);
    errorResponse(res, 'Erreur lors de la création du produit');
  }
}

export async function updateProduit(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const { nom, description, unite, actif } = req.body;

    const exist = await prisma.produit.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Produit introuvable', 404);
      return;
    }

    const produit = await prisma.produit.update({
      where: { id },
      data: {
        nom: nom ?? exist.nom,
        description: description !== undefined ? description : exist.description,
        unite: unite ?? exist.unite,
        actif: actif !== undefined ? actif : exist.actif,
      },
      include: { tarifs: true },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'UPDATE_PRODUIT',
      table: 'Produit',
      enregistrementId: produit.id,
      anciennesValeurs: { nom: exist.nom, actif: exist.actif },
      nouvellesValeurs: { nom: produit.nom, actif: produit.actif },
      adresseIp: req.ip,
    });

    successResponse(res, produit, 'Produit mis à jour avec succès');
  } catch (err) {
    console.error('[Produits] updateProduit error:', err);
    errorResponse(res, 'Erreur lors de la mise à jour du produit');
  }
}

// --- TARIFS ---

export async function getTarifs(req: Request, res: Response): Promise<void> {
  try {
    const produitId = req.query.produitId ? parseInt(req.query.produitId as string) : undefined;
    const tarifs = await prisma.tarif.findMany({
      where: {
        ...(produitId ? { produitId } : {}),
        actif: true,
      },
      orderBy: { prix: 'asc' },
      include: { produit: true },
    });

    successResponse(res, tarifs);
  } catch (err) {
    console.error('[Tarifs] getTarifs error:', err);
    errorResponse(res, 'Erreur lors de la récupération des tarifs');
  }
}

export async function createTarif(req: Request, res: Response): Promise<void> {
  try {
    const { produitId, designation, prix } = req.body;

    if (!produitId || !designation || prix === undefined) {
      errorResponse(res, 'produitId, designation et prix sont obligatoires', 400);
      return;
    }

    const tarif = await prisma.tarif.create({
      data: {
        produitId: parseInt(produitId),
        designation,
        prix: new Prisma.Decimal(prix),
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'CREATE_TARIF',
      table: 'Tarif',
      enregistrementId: tarif.id,
      nouvellesValeurs: { produitId, designation, prix },
      adresseIp: req.ip,
    });

    successResponse(res, tarif, 'Tarif créé avec succès', 201);
  } catch (err) {
    console.error('[Tarifs] createTarif error:', err);
    errorResponse(res, 'Erreur lors de la création du tarif');
  }
}

export async function updateTarif(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const { designation, prix, actif } = req.body;

    const exist = await prisma.tarif.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Tarif introuvable', 404);
      return;
    }

    const tarif = await prisma.tarif.update({
      where: { id },
      data: {
        designation: designation ?? exist.designation,
        prix: prix !== undefined ? new Prisma.Decimal(prix) : exist.prix,
        actif: actif !== undefined ? actif : exist.actif,
      },
    });

    successResponse(res, tarif, 'Tarif mis à jour avec succès');
  } catch (err) {
    console.error('[Tarifs] updateTarif error:', err);
    errorResponse(res, 'Erreur lors de la mise à jour du tarif');
  }
}
