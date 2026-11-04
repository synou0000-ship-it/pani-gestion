import { Router } from 'express';
import {
  getVentes,
  getVente,
  createVente,
  annulerVente,
  deleteVente,
  getTicket,
} from '../controllers/ventesController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getVentes);
router.post('/', createVente);
router.get('/:id', getVente);
router.put('/:id/annuler', requireRole('Administrateur', 'Gestionnaire'), annulerVente);
router.delete('/:id', requireRole('Administrateur'), deleteVente);
router.get('/:id/ticket', getTicket);

export default router;

