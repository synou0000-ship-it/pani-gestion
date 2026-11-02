import { Router } from 'express';
import {
  getCaisseActuelle,
  ouvrirCaisse,
  cloturerCaisse,
  getMouvementsCaisse,
  getHistoriqueCaisses,
} from '../controllers/caisseController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/actuelle', getCaisseActuelle);
router.post('/ouvrir', requireRole('Administrateur', 'Caissier', 'Gestionnaire'), ouvrirCaisse);
router.post('/cloturer', requireRole('Administrateur', 'Caissier', 'Gestionnaire'), cloturerCaisse);
router.get('/mouvements', getMouvementsCaisse);
router.get('/historique', getHistoriqueCaisses);

export default router;

