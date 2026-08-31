import pool from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { response } from '../utils/response.js';
import { sendSMS } from '../services/smsService.js';
import { callAdvisoryEngine } from '../services/advisoryService.js';

/**
 * GET /api/v1/alerts/high-risk
 * Officer dashboard — paginated list of farmers with high/critical distress scores.
 * Returns real registered farmers with their latest distress score.
 * If no distress score exists yet, they show with NULL score.
 */
export async function getHighRiskAlerts(req, res, next) {
  try {
    const { region_id, min_band = 'high', status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bands =
      min_band === 'critical' ? ['critical'] :
      min_band === 'high'     ? ['high', 'critical'] :
                                ['medium', 'high', 'critical'];

    // Farmer-centric query: get all farmers with latest distress score.
    // LEFT JOIN alerts to get latest alert status (may be NULL if no alert sent yet).
    let queryText = `
      SELECT
        COALESCE(a.alert_id::text, 'no-alert-' || f.farmer_id::text) AS alert_id,
        f.farmer_id,
        COALESCE(a.alert_type, 'distress') AS alert_type,
        COALESCE(a.status, 'pending') AS status,
        COALESCE(a.created_at, f.created_at) AS created_at,
        f.full_name AS farmer_name,
        f.phone_number,
        r.village_name,
        COALESCE(ds.risk_score, 0) AS risk_score,
        COALESCE(ds.risk_band, 'low') AS risk_band
      FROM farmers f
      JOIN regions r ON f.region_id = r.region_id
      LEFT JOIN LATERAL (
        SELECT score_id, risk_score, risk_band
        FROM distress_scores
        WHERE farmer_id = f.farmer_id
        ORDER BY computed_at DESC
        LIMIT 1
      ) ds ON TRUE
      LEFT JOIN LATERAL (
        SELECT alert_id, alert_type, status, created_at
        FROM alerts
        WHERE farmer_id = f.farmer_id
        ORDER BY created_at DESC
        LIMIT 1
      ) a ON TRUE
      WHERE ds.risk_band = ANY($1)
    `;
    const params = [bands];

    if (status) {
      params.push(status);
      queryText += ` AND COALESCE(a.status, 'pending') = $${params.length}`;
    }

    if (region_id) {
      params.push(region_id);
      queryText += ` AND (r.region_id::text = $${params.length} OR r.village_name ILIKE $${params.length})`;
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${queryText}) AS sub`, params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Paginated results
    params.push(limit, offset);
    queryText += ` ORDER BY ds.risk_score DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const alertsResult = await pool.query(queryText, params);

    res.json(response(true, {
      total,
      page: Number(page),
      limit: Number(limit),
      alerts: alertsResult.rows,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/alerts/:alert_id/acknowledge
 */
export async function acknowledgeAlert(req, res, next) {
  try {
    const { alert_id } = req.params;
    const result = await pool.query(
      `UPDATE alerts SET status = 'acknowledged' WHERE alert_id = $1 RETURNING *`,
      [alert_id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Alert not found');
    res.json(response(true, result.rows[0]));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/alerts/sms-log
 * Returns all SMS-channel alerts (distress + manual) with delivery status.
 * Query params: page, limit, status, farmer_id
 */
export async function getSmsLog(req, res, next) {
  try {
    const { page = 1, limit = 50, status, farmer_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const params = [];
    let where = `WHERE a.channel = 'sms'`;

    if (status) {
      params.push(status);
      where += ` AND a.status = $${params.length}`;
    }
    if (farmer_id) {
      params.push(farmer_id);
      where += ` AND a.farmer_id = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alerts a ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(Number(limit), offset);
    const queryText = `
      SELECT
        a.alert_id,
        a.farmer_id,
        a.alert_type,
        a.channel,
        a.status,
        a.created_at,
        f.full_name AS farmer_name,
        f.phone_number,
        r.village_name,
        ds.risk_score,
        ds.risk_band
      FROM alerts a
      JOIN farmers f ON a.farmer_id = f.farmer_id
      JOIN regions r ON f.region_id = r.region_id
      LEFT JOIN distress_scores ds ON a.score_id = ds.score_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(queryText, params);

    res.json(response(true, {
      total,
      page: Number(page),
      limit: Number(limit),
      logs: result.rows,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/alerts/send-sms
 * Body: { farmer_id, message? }
 * Manually send an SMS to a farmer. The phone number is always read from
 * the database — callers only supply a farmer_id (and an optional custom message).
 * When no message is provided, the advisory engine generates one from the
 * farmer's crop, weather, and market context.
 */
export async function sendSmsAlert(req, res, next) {
  try {
    const { farmer_id, message } = req.body;
    if (!farmer_id) throw new ApiError(400, 'farmer_id is required');

    // Fetch full farmer profile (with region) so advisory engine has all context
    const farmerResult = await pool.query(
      `SELECT f.*, r.village_name, r.district, r.state, r.region_id
       FROM farmers f JOIN regions r ON f.region_id = r.region_id
       WHERE f.farmer_id = $1`,
      [farmer_id]
    );
    if (!farmerResult.rows.length) throw new ApiError(404, 'Farmer not found');
    const farmer = farmerResult.rows[0];
    if (!farmer.phone_number) throw new ApiError(422, 'Farmer has no phone number on record');

    let smsBody = message; // Use caller-supplied message if provided

    if (!smsBody) {
      // Generate message from ML advisory engine using farmer's real context
      try {
        const [cropResult, weatherResult, marketResult] = await Promise.all([
          pool.query(
            `SELECT * FROM crops WHERE farmer_id = $1 ORDER BY sowing_date DESC LIMIT 1`,
            [farmer_id]
          ),
          pool.query(
            `SELECT wd.* FROM weather_data wd
             JOIN regions r ON wd.region_id = r.region_id
             WHERE r.region_id = $1 AND wd.record_date > NOW() - INTERVAL '14 days'
             ORDER BY wd.record_date DESC`,
            [farmer.region_id]
          ),
          pool.query(
            `SELECT mp.* FROM market_prices mp
             JOIN crops c ON mp.crop_id = c.crop_id
             WHERE c.farmer_id = $1 AND mp.price_date > NOW() - INTERVAL '14 days'
             ORDER BY mp.price_date DESC`,
            [farmer_id]
          ),
        ]);

        const crop = cropResult.rows[0] || null;
        if (crop) {
          const advisory = await callAdvisoryEngine({
            farmer,
            crop,
            weather: weatherResult.rows,
            market: marketResult.rows,
            lang: farmer.preferred_language || 'en',
          });
          smsBody = `CropX: ${advisory.advisory_text}`;
          // Trim to 3 SMS segments max (~459 chars)
          if (smsBody.length > 459) smsBody = smsBody.slice(0, 456) + '...';
        }
      } catch (err) {
        console.warn('[AlertController] Advisory engine unavailable, using fallback message:', err.message);
      }
    }

    // Final fallback if advisory engine failed or no crops on record
    if (!smsBody) {
      smsBody = `CropX: Hello ${farmer.full_name}, you have an important update from your agricultural officer. Please contact us at your earliest convenience.`;
    }

    const result = await sendSMS(farmer.phone_number, smsBody);

    // Ensure the message was actually accepted by TextBee before logging it
    if (!result || !result.success) {
      throw new ApiError(500, 'Failed to send SMS via TextBee provider');
    }

    // Log the manual alert
    await pool.query(
      `INSERT INTO alerts (farmer_id, alert_type, channel, status)
       VALUES ($1, 'manual', 'sms', 'sent')`,
      [farmer_id]
    );

    res.json(response(true, {
      sent_to: farmer.phone_number,
      farmer_name: farmer.full_name,
      message: smsBody,
      textbee_result: result,
    }));
  } catch (err) {
    next(err);
  }
}
