import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getDepenses,
  getDepenseById,
  createDepense,
  addJustificatif,
} from '../controllers/depensesController';
import { verifyToken, requireRole } from '../middleware/auth';

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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
router.post('/:id/justificatif', upload.single('justificatif'), addJustificatif);

export default router;

