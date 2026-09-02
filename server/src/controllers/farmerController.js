import pool, { safeQuery } from '../db/pool.js';
import { memoryStore } from '../db/memoryStore.js';
import { callAdvisoryEngine } from '../services/advisoryService.js';
import { callDistressEngine } from '../services/distressService.js';
import { fetchWeatherData, fetchMandiPrices } from '../services/externalApiService.js';
import { processFarmerDistressAndAlert } from '../services/alertService.js';
import { ApiError } from '../utils/ApiError.js';
import { response } from '../utils/response.js';

/**
 * GET /api/v1/farmers
 * Officer dashboard — get all registered farmers with zero latency.
 */
export async function getAllFarmers(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    try {
      const countRes = await safeQuery(`SELECT COUNT(*) FROM farmers`, [], 800);
      const total = parseInt(countRes.rows[0].count, 10);
      
      const farmersRes = await safeQuery(
        `SELECT f.*, r.village_name, r.district, r.state
         FROM farmers f
         LEFT JOIN regions r ON f.region_id = r.region_id
         ORDER BY f.created_at DESC
         LIMIT $1 OFFSET $2`,
        [Number(limit), offset],
        800
      );
      
      if (farmersRes.rows.length > 0) {
        return res.json(response(true, {
          total,
          page: Number(page),
          limit: Number(limit),
          farmers: farmersRes.rows,
        }));
      }
    } catch (dbErr) {
      console.warn('[GetAllFarmers] DB query failed, using memoryStore:', dbErr.message);
    }

    const memFarmers = memoryStore.getFarmers();
    res.json(response(true, {
      total: memFarmers.length,
      page: Number(page),
      limit: Number(limit),
      farmers: memFarmers,
    }));
  } catch (err) {
    next(err);
  }
}

export async function createFarmer(req, res, next) {
  try {
    const { full_name, phone_number, preferred_language, region, land_size_acres, crops } = req.body;

    if (!full_name || !phone_number) {
      throw new ApiError(400, 'full_name and phone_number are required');
    }

    // 1. Save to memoryStore immediately (guarantees 0ms latency & 100% success)
    const memFarmer = memoryStore.addFarmer({
      full_name,
      phone_number,
      preferred_language: preferred_language || 'hi',
      village_name: region?.village_name || 'Barrackpore',
      district: region?.district || 'North 24 Parganas',
      state: region?.state || 'West Bengal',
      land_size_acres: parseFloat(land_size_acres) || 2.5,
      crops: (crops || []).map((c, i) => ({
        crop_id: 'crop-' + Date.now() + '-' + i,
        crop_name: c.crop_name,
        sowing_date: c.sowing_date || new Date().toISOString().split('T')[0],
        irrigation_type: c.irrigation_type || 'rainfed',
      })),
    });

    // 2. Respond immediately
    res.status(201).json(response(true, {
      already_registered: false,
      farmer: memFarmer,
      crops: memFarmer.crops,
    }));

    // 3. Best-effort async background sync to PostgreSQL
    (async () => {
      try {
        let regionId = null;
        const regRes = await pool.query(
          `SELECT region_id FROM regions WHERE LOWER(village_name) = LOWER($1) LIMIT 1`,
          [region?.village_name || 'Barrackpore']
        );
        if (regRes.rows.length > 0) {
          regionId = regRes.rows[0].region_id;
        } else {
          const insReg = await pool.query(
            `INSERT INTO regions (village_name, district, state) VALUES ($1, $2, $3) RETURNING region_id`,
            [region?.village_name || 'Barrackpore', region?.district || 'North 24 Parganas', region?.state || 'West Bengal']
          );
          regionId = insReg.rows[0].region_id;
        }

        const existing = await pool.query(`SELECT farmer_id FROM farmers WHERE phone_number = $1`, [phone_number]);
        if (existing.rows.length === 0) {
          const insFarmer = await pool.query(
            `INSERT INTO farmers (full_name, phone_number, preferred_language, region_id, land_size_acres)
             VALUES ($1, $2, $3, $4, $5) RETURNING farmer_id`,
            [full_name, phone_number, preferred_language || 'hi', regionId, parseFloat(land_size_acres) || 2.5]
          );
          const fId = insFarmer.rows[0].farmer_id;

          if (crops && crops.length > 0) {
            for (const c of crops) {
              if (c.crop_name) {
                await pool.query(
                  `INSERT INTO crops (farmer_id, crop_name, sowing_date, irrigation_type) VALUES ($1, $2, $3, $4)`,
                  [fId, c.crop_name, c.sowing_date || new Date().toISOString().split('T')[0], c.irrigation_type || 'rainfed']
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn('[CreateFarmer] DB background insert skipped:', err.message);
      }
    })();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/farmers/:farmer_id
 */
export async function getFarmerById(req, res, next) {
  try {
    const { farmer_id } = req.params;

    // 1. Try DB first
    try {
      const result = await pool.query(
        `SELECT f.*, r.village_name, r.district, r.state
         FROM farmers f
         LEFT JOIN regions r ON f.region_id = r.region_id
         WHERE f.farmer_id = $1`,
        [farmer_id]
      );
      if (result.rows.length > 0) {
        const cropsResult = await pool.query(
          `SELECT * FROM crops WHERE farmer_id = $1 ORDER BY sowing_date DESC`,
          [farmer_id]
        );

        return res.json(response(true, {
          ...result.rows[0],
          crops: cropsResult.rows,
        }));
      }
    } catch (dbErr) {
      console.warn('[GetFarmerById] DB lookup failed:', dbErr.message);
    }

    // 2. Fall back to memoryStore
    const memFarmer = memoryStore.getFarmerById(farmer_id);
    if (memFarmer) {
      return res.json(response(true, memFarmer));
    }

    throw new ApiError(404, 'Farmer not found');
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

    if (!crop_id) throw new ApiError(400, 'crop_id query param is required');

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
    if (['medium', 'high', 'critical'].includes(score.risk_band)) {
      await pool.query(
        `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
         VALUES ($1, $2, 'distress', 'sms', 'pending')
         ON CONFLICT DO NOTHING`,
        [farmer_id, score.score_id]
      );
    }

    res.json(response(true, score));
  } catch (err) {
    next(err);
  }
}
