import { Router } from 'express';
import {
  getAchats,
  getAchatById,
  createAchat,
  receptionnerAchat,
} from '../controllers/achatsController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getAchats);
router.post('/', requireRole('Administrateur', 'Gestionnaire', 'Comptable'), createAchat);
router.get('/:id', getAchatById);
router.put('/:id/receptionner', requireRole('Administrateur', 'Gestionnaire'), receptionnerAchat);

export default router;

