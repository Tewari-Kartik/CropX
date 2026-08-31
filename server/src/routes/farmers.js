import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createFarmer,
  getAllFarmers,
  getFarmerById,
  getAdvisory,
  getDistressScore,
  triggerDistressScore,
} from '../controllers/farmerController.js';
import { validate } from '../middleware/validate.js';
import { createFarmerSchema, distressScoreSchema } from '../validators/farmerValidator.js';

const router = Router();

// GET /api/v1/farmers — Get all registered farmers
router.get('/', authenticate, getAllFarmers);

// POST /api/v1/farmers — Register new farmer
// NOTE: This route is intentionally public (no authenticate middleware).
// Farmers self-register before they have a session token. After successful
// registration, the client immediately calls POST /api/v1/auth/login to
// get a token for all subsequent authenticated requests.
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
