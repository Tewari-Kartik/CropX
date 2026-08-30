import { Router } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { response } from '../utils/response.js';

const router = Router();

/**
 * POST /api/v1/auth/login
 *
 * Hackathon MVP login — accepts a phone number, looks up the farmer,
 * returns a signed JWT. No OTP/password verification yet.
 *
 * Supports an optional `role` param to allow officer login for the
 * OfficerDashboard. When role=officer, phone_number lookup is skipped
 * and a generic officer token is issued.
 *
 * Request:
 *   { "phone_number": "+919876543210", "role": "farmer" | "officer" }
 *
 * Response 200:
 *   { "success": true, "data": { "token": "...", "farmer_id": "...", "role": "farmer" }, "error": null }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { phone_number, role = 'farmer' } = req.body;

    // Officer shortcut — no DB lookup needed for hackathon demo
    if (role === 'officer') {
      const token = jwt.sign(
        { farmer_id: null, role: 'officer' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      return res.json(response(true, { token, farmer_id: null, role: 'officer' }));
    }

    // Farmer login — require phone_number
    if (!phone_number) {
      throw new ApiError(400, 'phone_number is required');
    }

    const result = await pool.query(
      `SELECT farmer_id, full_name FROM farmers WHERE phone_number = $1`,
      [phone_number]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'No farmer found with this phone number. Please register first.');
    }

    const farmer = result.rows[0];

    const token = jwt.sign(
      { farmer_id: farmer.farmer_id, role: 'farmer' },
      process.env.JWT_SECRET,
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
