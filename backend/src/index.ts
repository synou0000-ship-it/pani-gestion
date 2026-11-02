import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

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

import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// Dossier pour les uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
const healthHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'PANI GESTION API',
    version: '1.0.0',
    mode: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);
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

// Démarrer le serveur sur toutes les interfaces IPv4 (0.0.0.0) pour l'accès mobile/Wi-Fi
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  PANI GESTION API démarrée sur le port ${PORT}`);
  console.log(`  URL: http://0.0.0.0:${PORT}`);
  console.log(`  Santé: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

export default app;
