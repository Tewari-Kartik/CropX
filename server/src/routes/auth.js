import { Router } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { memoryStore } from '../db/memoryStore.js';
import { ApiError } from '../utils/ApiError.js';
import { response } from '../utils/response.js';

const router = Router();

/**
 * POST /api/v1/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { phone_number, role = 'farmer' } = req.body;

    // 1. Officer login shortcut
    if (role === 'officer') {
      const token = jwt.sign(
        { farmer_id: null, role: 'officer' },
        process.env.JWT_SECRET || 'cropx_dev_secret_key_2026',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      return res.json(response(true, { token, farmer_id: null, role: 'officer' }));
    }

    // 2. Farmer login
    if (!phone_number) {
      throw new ApiError(400, 'phone_number is required');
    }

    let farmer = null;

    // Try DB lookup
    try {
      const result = await pool.query(
        `SELECT farmer_id, full_name FROM farmers WHERE phone_number = $1`,
        [phone_number]
      );
      if (result.rows.length > 0) {
        farmer = result.rows[0];
      }
    } catch (dbErr) {
      console.warn('[AuthLogin] DB query failed:', dbErr.message);
    }

    // Try memoryStore lookup
    if (!farmer) {
      farmer = memoryStore.getFarmerByPhone(phone_number);
    }

    // Auto-create in memoryStore if new
    if (!farmer) {
      farmer = memoryStore.addFarmer({
        full_name: 'Farmer ' + phone_number.slice(-4),
        phone_number,
        preferred_language: 'hi',
        village_name: 'Barrackpore',
        district: 'North 24 Parganas',
        state: 'West Bengal',
        land_size_acres: 2.5,
      });
    }

    const token = jwt.sign(
      { farmer_id: farmer.farmer_id, role: 'farmer' },
      process.env.JWT_SECRET || 'cropx_dev_secret_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json(response(true, {
      token,
      farmer_id: farmer.farmer_id,
      full_name: farmer.full_name,
      role: 'farmer',
    }));
  } catch (err) {
    next(err);
  }
});

export default router;
