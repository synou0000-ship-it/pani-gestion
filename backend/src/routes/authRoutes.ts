import { Router } from 'express';
import { login, me, changePassword } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/me', verifyToken, me);
router.put('/change-password', verifyToken, changePassword);

export default router;

