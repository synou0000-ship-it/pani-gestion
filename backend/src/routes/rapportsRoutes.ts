import { Router } from 'express';
import {
  getRapportJournalier,
  getRapportMensuel,
  getRapportManques,
  exportExcel,
} from '../controllers/rapportsController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.get('/journalier', getRapportJournalier);
router.get('/mensuel', getRapportMensuel);
router.get('/manques', getRapportManques);
router.get('/export/excel', exportExcel);

export default router;

