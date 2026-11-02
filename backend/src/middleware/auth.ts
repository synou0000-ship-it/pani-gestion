import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { errorResponse } from '../utils/response';

export interface AuthPayload {
  id: number;
  email: string;
  roleId: number;
  roleNom: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token manquant ou invalide', data: null });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET ?? 'fallback_secret';
    const decoded = jwt.verify(token, secret) as AuthPayload;

    // Verify user still exists and is active
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!utilisateur || !utilisateur.actif) {
      res.status(401).json({ success: false, message: 'Utilisateur inactif ou introuvable', data: null });
      return;
    }

    req.user = {
      id: utilisateur.id,
      email: utilisateur.email,
      roleId: utilisateur.roleId,
      roleNom: utilisateur.role.nom,
    };

    next();
  } catch (err) {
    errorResponse(res, 'Token invalide ou expiré', 401);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Non authentifié', data: null });
      return;
    }
    if (!roles.includes(req.user.roleNom)) {
      res.status(403).json({ success: false, message: 'Accès refusé : rôle insuffisant', data: null });
      return;
    }
    next();
  };
}
