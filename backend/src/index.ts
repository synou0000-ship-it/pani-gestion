import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Secrets par défaut sécurisés
process.env.JWT_SECRET = process.env.JWT_SECRET || 'pani_secret_key_change_in_production_2024';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Imports des routes
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import ventesRoutes from './routes/ventesRoutes';
import stockRoutes from './routes/stockRoutes';
import produitsRoutes from './routes/produitsRoutes';
import clientsRoutes from './routes/clientsRoutes';
import fournisseursRoutes from './routes/fournisseursRoutes';
import achatsRoutes from './routes/achatsRoutes';
import caisseRoutes from './routes/caisseRoutes';
import depensesRoutes from './routes/depensesRoutes';
import inventairesRoutes from './routes/inventairesRoutes';
import rapportsRoutes from './routes/rapportsRoutes';
import utilisateursRoutes from './routes/utilisateursRoutes';
import syncRoutes from './routes/syncRoutes';
import prisma from './utils/prisma';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// Dossier pour les uploads (utiliser os.tmpdir() sur Vercel serverless pour éviter EROFS)
const isVercel = Boolean(process.env.VERCEL);
const uploadDir = process.env.UPLOAD_DIR || (isVercel ? path.join(os.tmpdir(), 'pani-uploads') : path.join(process.cwd(), 'uploads'));
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('[Storage] Dossier uploads non créé (environnement lecture seule) :', err);
  }
}

// Normaliser req.url pour Vercel Serverless
app.use((req, _res, next) => {
  const matched = (req.headers['x-matched-path'] as string) || (req.headers['x-vercel-matched-path'] as string);
  if (matched && matched.startsWith('/api')) {
    req.url = matched;
  }
  next();
});

// Middlewares globaux
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: '*', // Permet l'accès depuis Electron, Android (Capacitor) et Web
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Fichiers statiques (justificatifs)
app.use('/uploads', express.static(uploadDir));

// Route santé (accessible avec ou sans préfixe /api)
const healthHandler = async (_req: Request, res: Response) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (dbErr: any) {
    dbStatus = `warning: ${dbErr?.message || dbErr}`;
  }

  res.status(200).json({
    status: 'ok',
    app: 'PANI GESTION API',
    version: '1.0.0',
    mode: process.env.NODE_ENV || 'production',
    database: dbStatus,
    time: new Date().toISOString(),
  });
};

app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/api', healthHandler);
app.get('/api/health', healthHandler);

// Enregistrement des routes API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ventes', ventesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/fournisseurs', fournisseursRoutes);
app.use('/api/achats', achatsRoutes);
app.use('/api/caisse', caisseRoutes);
app.use('/api/depenses', depensesRoutes);
app.use('/api/inventaires', inventairesRoutes);
app.use('/api/rapports', rapportsRoutes);
app.use('/api/utilisateurs', utilisateursRoutes);
app.use('/api/sync', syncRoutes);

// Middleware de gestion globale des erreurs
app.use(errorHandler);

// Démarrer le serveur uniquement en local (pas sur Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`  PANI GESTION API démarrée sur le port ${PORT}`);
    console.log(`  URL: http://0.0.0.0:${PORT}`);
    console.log(`  Santé: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

export default app;
