import { Router } from 'express';
import {
  getInventaires,
  getInventaireById,
  createInventaire,
  validerInventaire,
  deleteInventaire,
} from '../controllers/inventairesController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getInventaires);
router.post('/', requireRole('Administrateur', 'Gestionnaire'), createInventaire);
router.get('/:id', getInventaireById);
router.put('/:id/valider', requireRole('Administrateur', 'Gestionnaire'), validerInventaire);
router.delete('/:id', requireRole('Administrateur', 'Gestionnaire'), deleteInventaire);

export default router;

