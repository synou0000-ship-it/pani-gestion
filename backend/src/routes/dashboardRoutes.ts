import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/', getDashboard);

export default router;
