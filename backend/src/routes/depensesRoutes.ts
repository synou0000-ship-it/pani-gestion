import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  getDepenses,
  getDepenseById,
  createDepense,
  updateDepense,
  deleteDepense,
  addJustificatif,
} from '../controllers/depensesController';
import { verifyToken, requireRole } from '../middleware/auth';

const isVercel = Boolean(process.env.VERCEL);
const uploadDir = process.env.UPLOAD_DIR || (isVercel ? path.join(os.tmpdir(), 'pani-uploads') : path.join(process.cwd(), 'uploads'));
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('[Depenses] Dossier upload non créé (lecture seule) :', err);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `justificatif-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

const router = Router();

router.use(verifyToken);
router.get('/', getDepenses);
router.post('/', requireRole('Administrateur', 'Comptable', 'Gestionnaire', 'Caissier'), upload.array('justificatifs', 5), createDepense);
router.get('/:id', getDepenseById);
router.put('/:id', requireRole('Administrateur', 'Comptable', 'Gestionnaire'), updateDepense);
router.delete('/:id', requireRole('Administrateur', 'Comptable', 'Gestionnaire'), deleteDepense);
router.post('/:id/justificatif', upload.single('justificatif'), addJustificatif);

export default router;
