import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ingestMarketPrices, getMarketPricesByCrop } from '../controllers/marketController.js';

const router = Router();

// GET /api/v1/market/:crop_id — latest mandi prices for a crop
router.get('/:crop_id', authenticate, getMarketPricesByCrop);

// POST /api/v1/market/ingest — internal ingestion from Mandi API (cron-triggered)
router.post('/ingest', ingestMarketPrices);

export default router;
