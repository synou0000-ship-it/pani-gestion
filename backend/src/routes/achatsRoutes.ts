import { Router } from 'express';
import {
  getAchats,
  getAchatById,
  createAchat,
  receptionnerAchat,
  annulerAchat,
  deleteAchat,
} from '../controllers/achatsController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getAchats);
router.post('/', requireRole('Administrateur', 'Gestionnaire', 'Comptable'), createAchat);
router.get('/:id', getAchatById);
router.put('/:id/receptionner', requireRole('Administrateur', 'Gestionnaire'), receptionnerAchat);
router.put('/:id/annuler', requireRole('Administrateur', 'Gestionnaire'), annulerAchat);
router.delete('/:id', requireRole('Administrateur', 'Gestionnaire'), deleteAchat);

export default router;

