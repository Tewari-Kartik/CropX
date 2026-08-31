import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ingestWeather, getWeatherByRegion } from '../controllers/weatherController.js';

const router = Router();

// GET /api/v1/weather/:region_id — latest weather for a region
router.get('/:region_id', authenticate, getWeatherByRegion);

// POST /api/v1/weather/ingest — internal ingestion from external weather API (cron-triggered)
router.post('/ingest', ingestWeather);

export default router;
