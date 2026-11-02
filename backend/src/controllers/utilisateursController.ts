import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { logAudit } from '../utils/auditLog';

export async function getUtilisateurs(req: Request, res: Response): Promise<void> {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        actif: true,
        roleId: true,
        role: { select: { id: true, nom: true, description: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { nom: 'asc' },
    });

    successResponse(res, utilisateurs);
  } catch (err) {
    console.error('[Utilisateurs] getUtilisateurs error:', err);
    errorResponse(res, 'Erreur lors de la récupération des utilisateurs');
  }
}

export async function getRoles(req: Request, res: Response): Promise<void> {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
    successResponse(res, roles);
  } catch (err) {
    console.error('[Utilisateurs] getRoles error:', err);
    errorResponse(res, 'Erreur lors de la récupération des rôles');
  }
}

export async function getUtilisateurById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        actif: true,
        roleId: true,
        role: true,
        createdAt: true,
      },
    });

    if (!utilisateur) {
      errorResponse(res, 'Utilisateur introuvable', 404);
      return;
    }

    successResponse(res, utilisateur);
  } catch (err) {
    console.error('[Utilisateurs] getUtilisateurById error:', err);
    errorResponse(res, 'Erreur lors de la récupération de l\'utilisateur');
  }
}

export async function createUtilisateur(req: Request, res: Response): Promise<void> {
  try {
    const { nom, prenom, email, telephone, motDePasse, roleId } = req.body;

    if (!nom || !prenom || !email || !motDePasse || !roleId) {
      errorResponse(res, 'Nom, prénom, email, mot de passe et rôle obligatoires', 400);
      return;
    }

    const exist = await prisma.utilisateur.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (exist) {
      errorResponse(res, 'Un utilisateur avec cette adresse email existe déjà', 400);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(motDePasse, salt);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.toLowerCase().trim(),
        telephone: telephone ? telephone.trim() : null,
        motDePasse: hashedPassword,
        roleId: parseInt(roleId),
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        actif: true,
        role: true,
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'CREATE_UTILISATEUR',
      table: 'Utilisateur',
      enregistrementId: utilisateur.id,
      nouvellesValeurs: { nom, prenom, email, roleId },
      adresseIp: req.ip,
    });

    successResponse(res, utilisateur, 'Utilisateur créé avec succès', 201);
  } catch (err) {
    console.error('[Utilisateurs] createUtilisateur error:', err);
    errorResponse(res, 'Erreur lors de la création de l\'utilisateur');
  }
}

export async function updateUtilisateur(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as any);
    const { nom, prenom, telephone, roleId, actif, motDePasse } = req.body;

    const exist = await prisma.utilisateur.findUnique({ where: { id } });
    if (!exist) {
      errorResponse(res, 'Utilisateur introuvable', 404);
      return;
    }

    let hashedPassword = undefined;
    if (motDePasse) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(motDePasse, salt);
    }

    const updated = await prisma.utilisateur.update({
      where: { id },
      data: {
        nom: nom !== undefined ? nom.trim() : exist.nom,
        prenom: prenom !== undefined ? prenom.trim() : exist.prenom,
        telephone: telephone !== undefined ? telephone : exist.telephone,
        roleId: roleId !== undefined ? parseInt(roleId) : exist.roleId,
        actif: actif !== undefined ? actif : exist.actif,
        motDePasse: hashedPassword,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        actif: true,
        role: true,
      },
    });

    await logAudit({
      utilisateurId: req.user?.id,
      action: 'UPDATE_UTILISATEUR',
      table: 'Utilisateur',
      enregistrementId: id,
      anciennesValeurs: { actif: exist.actif, roleId: exist.roleId },
      nouvellesValeurs: { actif: updated.actif, roleId: updated.role.id },
      adresseIp: req.ip,
    });

    successResponse(res, updated, 'Utilisateur mis à jour avec succès');
  } catch (err) {
    console.error('[Utilisateurs] updateUtilisateur error:', err);
    errorResponse(res, 'Erreur lors de la mise à jour de l\'utilisateur');
  }
}
