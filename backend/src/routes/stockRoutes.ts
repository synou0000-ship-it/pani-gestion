import { Router } from 'express';
import { getStock, getMouvementsStock, ajusterStock } from '../controllers/stockController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getStock);
router.get('/mouvements', getMouvementsStock);
router.post('/ajustement', requireRole('Administrateur', 'Gestionnaire'), ajusterStock);

export default router;

