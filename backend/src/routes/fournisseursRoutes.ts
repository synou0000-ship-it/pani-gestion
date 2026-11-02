import { Router } from 'express';
import {
  getFournisseurs,
  getFournisseurById,
  createFournisseur,
  updateFournisseur,
  enregistrerPaiementFournisseur,
  getReleveFournisseur,
} from '../controllers/fournisseursController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getFournisseurs);
router.post('/', requireRole('Administrateur', 'Gestionnaire', 'Comptable'), createFournisseur);
router.get('/:id', getFournisseurById);
router.put('/:id', requireRole('Administrateur', 'Gestionnaire', 'Comptable'), updateFournisseur);
router.post('/:id/paiements', requireRole('Administrateur', 'Comptable', 'Caissier'), enregistrerPaiementFournisseur);
router.get('/:id/releve', getReleveFournisseur);

export default router;

