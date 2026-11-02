import { Router } from 'express';
import { pullSyncData, pushSyncData, getSyncBootstrap, pushSyncOfflineData } from '../controllers/syncController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

// Endpoints complets de synchronisation bidirectionnelle
router.get('/pull', pullSyncData);
router.post('/push', pushSyncData);

// Endpoints pour rétrocompatibilité
router.get('/bootstrap', getSyncBootstrap);
router.post('/push-offline', pushSyncOfflineData);

export default router;
