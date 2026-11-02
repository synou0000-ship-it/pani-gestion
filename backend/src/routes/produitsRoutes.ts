import { Router } from 'express';
import {
  getProduits,
  getProduitById,
  createProduit,
  updateProduit,
  getTarifs,
  createTarif,
  updateTarif,
} from '../controllers/produitsController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
// Produits
router.get('/', getProduits);
router.get('/tarifs', getTarifs);
router.get('/:id', getProduitById);
router.post('/', requireRole('Administrateur', 'Gestionnaire'), createProduit);
router.put('/:id', requireRole('Administrateur', 'Gestionnaire'), updateProduit);

// Tarifs
router.post('/tarifs', requireRole('Administrateur', 'Gestionnaire'), createTarif);
router.put('/tarifs/:id', requireRole('Administrateur', 'Gestionnaire'), updateTarif);

export default router;

