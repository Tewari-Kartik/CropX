import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createFarmer,
  getFarmerById,
  getAdvisory,
  getDistressScore,
  triggerDistressScore,
} from '../controllers/farmerController.js';
import { validate } from '../middleware/validate.js';
import { createFarmerSchema, distressScoreSchema } from '../validators/farmerValidator.js';

const router = Router();

// POST /api/v1/farmers — Register new farmer
router.post('/', validate(createFarmerSchema), createFarmer);

// GET /api/v1/farmers/:farmer_id
router.get('/:farmer_id', authenticate, getFarmerById);

// GET /api/v1/farmers/:farmer_id/advisory?crop_id=&lang=
router.get('/:farmer_id/advisory', authenticate, getAdvisory);

// GET /api/v1/farmers/:farmer_id/distress-score — latest cached score
router.get('/:farmer_id/distress-score', authenticate, getDistressScore);

// POST /api/v1/farmers/:farmer_id/distress-score — trigger/refresh score
router.post('/:farmer_id/distress-score', authenticate, validate(distressScoreSchema), triggerDistressScore);

export default router;
