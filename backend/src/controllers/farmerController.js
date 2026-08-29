import pool from '../db/pool.js';
import { callAdvisoryEngine } from '../services/advisoryService.js';
import { callDistressEngine } from '../services/distressService.js';
import { ApiError } from '../utils/ApiError.js';
import { response } from '../utils/response.js';

/**
 * POST /api/v1/farmers
 * Register a new farmer with profile, region, and crop info.
 */
export async function createFarmer(req, res, next) {
  const { full_name, phone_number, preferred_language, region, land_size_acres, crops } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert region
    const regionResult = await client.query(
      `INSERT INTO regions (village_name, district, state)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING region_id`,
      [region.village_name, region.district, region.state]
    );
    const regionId = regionResult.rows[0]?.region_id;

    // Insert farmer
    const farmerResult = await client.query(
      `INSERT INTO farmers (full_name, phone_number, preferred_language, region_id, land_size_acres)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING farmer_id, full_name, region_id, created_at`,
      [full_name, phone_number, preferred_language || 'en', regionId, land_size_acres]
    );
    const farmer = farmerResult.rows[0];

    // Insert crops
    if (crops && crops.length > 0) {
      for (const crop of crops) {
        await client.query(
          `INSERT INTO crops (farmer_id, crop_name, sowing_date, irrigation_type)
           VALUES ($1, $2, $3, $4)`,
          [farmer.farmer_id, crop.crop_name, crop.sowing_date, crop.irrigation_type]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(response(true, farmer));
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new ApiError(409, 'Phone number already registered');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/v1/farmers/:farmer_id
 */
export async function getFarmerById(req, res, next) {
  try {
    const { farmer_id } = req.params;
    const result = await pool.query(
      `SELECT f.*, r.village_name, r.district, r.state
       FROM farmers f
       JOIN regions r ON f.region_id = r.region_id
       WHERE f.farmer_id = $1`,
      [farmer_id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Farmer not found');
    res.json(response(true, result.rows[0]));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/farmers/:farmer_id/advisory?crop_id=&lang=
 */
export async function getAdvisory(req, res, next) {
  try {
    const { farmer_id } = req.params;
    const { crop_id, lang } = req.query;

    // Gather context from DB
    const farmerResult = await pool.query(
      `SELECT f.*, r.village_name, r.district, r.state, r.region_id
       FROM farmers f JOIN regions r ON f.region_id = r.region_id
       WHERE f.farmer_id = $1`,
      [farmer_id]
    );
    if (!farmerResult.rows.length) throw new ApiError(404, 'Farmer not found');
    const farmer = farmerResult.rows[0];

    const cropResult = await pool.query(
      `SELECT * FROM crops WHERE crop_id = $1 AND farmer_id = $2`,
      [crop_id, farmer_id]
    );
    if (!cropResult.rows.length) throw new ApiError(404, 'Crop not found');
    const crop = cropResult.rows[0];

    const weatherResult = await pool.query(
      `SELECT * FROM weather_data WHERE region_id = $1 ORDER BY record_date DESC LIMIT 7`,
      [farmer.region_id]
    );

    const marketResult = await pool.query(
      `SELECT * FROM market_prices WHERE crop_id = $1 ORDER BY price_date DESC LIMIT 5`,
      [crop_id]
    );

    // Call Advisory Engine (FastAPI microservice)
    const advisory = await callAdvisoryEngine({
      farmer,
      crop,
      weather: weatherResult.rows,
      market: marketResult.rows,
      lang: lang || farmer.preferred_language,
    });

    // Persist advisory
    await pool.query(
      `INSERT INTO advisories (crop_id, advisory_text, language, audio_url)
       VALUES ($1, $2, $3, $4)`,
      [crop_id, advisory.advisory_text, advisory.language, advisory.audio_url]
    );

    res.json(response(true, { crop_name: crop.crop_name, ...advisory }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/farmers/:farmer_id/distress-score — latest cached
 */
export async function getDistressScore(req, res, next) {
  try {
    const { farmer_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM distress_scores WHERE farmer_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [farmer_id]
    );
    if (!result.rows.length) throw new ApiError(404, 'No distress score found. Trigger one first.');
    res.json(response(true, result.rows[0]));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/farmers/:farmer_id/distress-score — trigger/refresh
 */
export async function triggerDistressScore(req, res, next) {
  try {
    const { farmer_id } = req.params;
    const { force_recompute = false } = req.body;

    // If not forced, return cached score if fresh (< 24h)
    if (!force_recompute) {
      const cached = await pool.query(
        `SELECT * FROM distress_scores
         WHERE farmer_id = $1 AND computed_at > NOW() - INTERVAL '24 hours'
         ORDER BY computed_at DESC LIMIT 1`,
        [farmer_id]
      );
      if (cached.rows.length) return res.json(response(true, cached.rows[0]));
    }

    // Gather features from DB
    const weatherRows = await pool.query(
      `SELECT wd.* FROM weather_data wd
       JOIN regions r ON wd.region_id = r.region_id
       JOIN farmers f ON f.region_id = r.region_id
       WHERE f.farmer_id = $1 AND wd.record_date > NOW() - INTERVAL '90 days'
       ORDER BY wd.record_date DESC`,
      [farmer_id]
    );
    const marketRows = await pool.query(
      `SELECT mp.* FROM market_prices mp
       JOIN crops c ON mp.crop_id = c.crop_id
       WHERE c.farmer_id = $1 AND mp.price_date > NOW() - INTERVAL '90 days'
       ORDER BY mp.price_date DESC`,
      [farmer_id]
    );
    const loanRows = await pool.query(
      `SELECT * FROM loan_records WHERE farmer_id = $1`,
      [farmer_id]
    );

    // Call Distress Engine (FastAPI microservice)
    const scoreData = await callDistressEngine({
      farmer_id,
      weather: weatherRows.rows,
      market: marketRows.rows,
      loans: loanRows.rows,
    });

    // Persist score
    const scoreResult = await pool.query(
      `INSERT INTO distress_scores (farmer_id, risk_score, risk_band, contributing_factors)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [farmer_id, scoreData.risk_score, scoreData.risk_band, JSON.stringify(scoreData.contributing_factors)]
    );
    const score = scoreResult.rows[0];

    // Create alert if high/critical
    if (['high', 'critical'].includes(score.risk_band)) {
      await pool.query(
        `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
         VALUES ($1, $2, 'distress', 'sms', 'pending')`,
        [farmer_id, score.score_id]
      );
    }

    res.json(response(true, score));
  } catch (err) {
    next(err);
  }
}
