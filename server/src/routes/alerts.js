import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getHighRiskAlerts, acknowledgeAlert, sendSmsAlert, getSmsLog } from '../controllers/alertController.js';

const router = Router();

// GET /api/v1/alerts/high-risk?region_id=&min_band=high&status=pending&page=1&limit=20
router.get('/high-risk', authenticate, requireRole('officer'), getHighRiskAlerts);

// GET /api/v1/alerts/sms-log?status=&farmer_id=&page=&limit=
// View SMS delivery history for all farmers.
router.get('/sms-log', authenticate, requireRole('officer'), getSmsLog);

// PATCH /api/v1/alerts/:alert_id/acknowledge
router.patch('/:alert_id/acknowledge', authenticate, requireRole('officer'), acknowledgeAlert);

// POST /api/v1/alerts/send-sms  { farmer_id, message? }
// Manually send an SMS to a farmer using their stored phone number.
router.post('/send-sms', authenticate, requireRole('officer'), sendSmsAlert);

export default router;
