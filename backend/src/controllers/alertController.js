import pool from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { response } from '../utils/response.js';

/**
 * GET /api/v1/alerts/high-risk
 * Officer dashboard — paginated list of high/critical risk farmers.
 */
export async function getHighRiskAlerts(req, res, next) {
  try {
    const { region_id, min_band = 'high', status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bands = min_band === 'critical' ? ['critical'] : ['high', 'critical'];

    let queryText = `
      SELECT
        a.alert_id, a.farmer_id, a.alert_type, a.status, a.created_at,
        f.full_name AS farmer_name, f.phone_number,
        r.village_name,
        ds.risk_score, ds.risk_band
      FROM alerts a
      JOIN farmers f ON a.farmer_id = f.farmer_id
      JOIN regions r ON f.region_id = r.region_id
      JOIN distress_scores ds ON a.score_id = ds.score_id
      WHERE a.status = $1 AND ds.risk_band = ANY($2)
    `;
    const params = [status, bands];

    if (region_id) {
      params.push(region_id);
      // Accept either a UUID region_id or a village name string
      queryText += ` AND (r.region_id::text = $${params.length} OR r.village_name ILIKE $${params.length})`;
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${queryText}) AS sub`, params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Paginated results
    params.push(limit, offset);
    queryText += ` ORDER BY ds.risk_score DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
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
