import { Router } from 'express';
import {
  getUtilisateurs,
  getRoles,
  getUtilisateurById,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
} from '../controllers/utilisateursController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/roles', getRoles);
router.get('/', requireRole('Administrateur'), getUtilisateurs);
router.post('/', requireRole('Administrateur'), createUtilisateur);
router.get('/:id', requireRole('Administrateur'), getUtilisateurById);
router.put('/:id', requireRole('Administrateur'), updateUtilisateur);
router.delete('/:id', requireRole('Administrateur'), deleteUtilisateur);

export default router;

