import { Router } from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  enregistrerPaiementDette,
  getReleveClient,
} from '../controllers/clientsController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClientById);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.post('/:id/paiements', enregistrerPaiementDette);
router.get('/:id/releve', getReleveClient);

export default router;

