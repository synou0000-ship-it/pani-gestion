import { Router } from 'express';
import {
  getProduits,
  getProduitById,
  createProduit,
  updateProduit,
  deleteProduit,
  getTarifs,
  createTarif,
  updateTarif,
  deleteTarif,
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
router.delete('/:id', requireRole('Administrateur', 'Gestionnaire'), deleteProduit);

// Tarifs
router.post('/tarifs', requireRole('Administrateur', 'Gestionnaire'), createTarif);
router.put('/tarifs/:id', requireRole('Administrateur', 'Gestionnaire'), updateTarif);
router.delete('/tarifs/:id', requireRole('Administrateur', 'Gestionnaire'), deleteTarif);

export default router;

