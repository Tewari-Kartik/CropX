import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getHighRiskAlerts, acknowledgeAlert } from '../controllers/alertController.js';

const router = Router();

// GET /api/v1/alerts/high-risk?region_id=&min_band=high&status=pending&page=1&limit=20
router.get('/high-risk', authenticate, requireRole('officer'), getHighRiskAlerts);

// PATCH /api/v1/alerts/:alert_id/acknowledge
router.patch('/:alert_id/acknowledge', authenticate, requireRole('officer'), acknowledgeAlert);

export default router;
