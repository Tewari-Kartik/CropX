import cron from 'node-cron';
import pool from '../db/pool.js';
import { callDistressEngine } from './distressService.js';
import { callAdvisoryEngine } from './advisoryService.js';
import { sendSMS } from './smsService.js';
import { sendPushNotification } from './pushService.js';

const CRON_SCHEDULE = process.env.ALERT_CRON_SCHEDULE || '0 6 * * *'; // Daily 6AM
const THRESHOLD = Number(process.env.DISTRESS_SCORE_THRESHOLD) || 70;

/**
 * Builds an SMS body using the advisory engine's ML-generated text.
 * Falls back to a structured distress-score summary if no crops exist or
 * if the advisory engine is unreachable.
 *
 * @param {{ farmer: object, crop: object|null, weather: object[], market: object[], scoreData: object }} ctx
 * @returns {Promise<string>}
 */
async function buildSmsBody({ farmer, crop, weather, market, scoreData }) {
  if (crop) {
    try {
      const advisory = await callAdvisoryEngine({
        farmer,
        crop,
        weather,
        market,
        lang: farmer.preferred_language || 'en',
      });
      // Prefix with risk band for urgency context; trim to SMS-safe length (~3 segments)
      const prefix = `CropX Alert [${scoreData.risk_band.toUpperCase()}]: `;
      const fullText = prefix + advisory.advisory_text;
      return fullText.length > 459 ? fullText.slice(0, 456) + '...' : fullText;
    } catch (err) {
      console.warn(
        `[AlertService] Advisory engine failed for farmer ${farmer.farmer_id}, using fallback:`,
        err.message
      );
    }
  }

  // Fallback: structured distress score summary with contributing factors
  const factors = scoreData.contributing_factors || {};
  const factorParts = [];
  if (factors.rainfall_deficit_pct > 0)
    factorParts.push(`rainfall deficit ${Math.round(factors.rainfall_deficit_pct)}%`);
  if (factors.loan_overdue_days > 0)
    factorParts.push(`loan overdue ${factors.loan_overdue_days} days`);
  if (factors.market_price_drop_pct > 0)
    factorParts.push(`price drop ${Math.round(factors.market_price_drop_pct)}%`);

  const factorStr = factorParts.length > 0 ? ` Key factors: ${factorParts.join(', ')}.` : '';
  return (
    `CropX Alert: ${farmer.full_name}, your risk score is ${scoreData.risk_score}` +
    ` (${scoreData.risk_band}).${factorStr} Please contact your agricultural officer.`
  );
}

/**
 * Computes distress score and immediately sends SMS/push alert for a single farmer.
 * Can be called during registration or on-demand.
 *
 * @param {string} farmer_id
 */
export async function processFarmerDistressAndAlert(farmer_id) {
  try {
    // Gather features
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
       WHERE c.farmer_id = $1 AND mp.price_date > NOW() - INTERVAL '90 days'`,
      [farmer_id]
    );
    const loanRows = await pool.query(
      `SELECT * FROM loan_records WHERE farmer_id = $1`,
      [farmer_id]
    );

    // Call Distress Engine
    const scoreData = await callDistressEngine({
      farmer_id,
      weather: weatherRows.rows,
      market: marketRows.rows,
      loans: loanRows.rows,
    });

    // Persist score
    const scoreResult = await pool.query(
      `INSERT INTO distress_scores (farmer_id, risk_score, risk_band, contributing_factors)
       VALUES ($1, $2, $3, $4) RETURNING score_id`,
      [farmer_id, scoreData.risk_score, scoreData.risk_band, JSON.stringify(scoreData.contributing_factors)]
    );
    const score_id = scoreResult.rows[0].score_id;

    // Trigger alerts for high/critical/medium risk
    if (['medium', 'high', 'critical'].includes(scoreData.risk_band) || scoreData.risk_score >= THRESHOLD) {
      // Fetch full farmer profile (with region) for advisory engine
      const farmerResult = await pool.query(
        `SELECT f.*, r.village_name, r.district, r.state, r.region_id
         FROM farmers f JOIN regions r ON f.region_id = r.region_id
         WHERE f.farmer_id = $1`,
        [farmer_id]
      );
      const farmer = farmerResult.rows[0];

      // Fetch most recent crop (advisory engine needs crop context)
      const cropResult = await pool.query(
        `SELECT * FROM crops WHERE farmer_id = $1 ORDER BY sowing_date DESC LIMIT 1`,
        [farmer_id]
      );
      const crop = cropResult.rows[0] || null;

      // Build ML-generated SMS body via advisory engine
      const smsBody = await buildSmsBody({
        farmer,
        crop,
        weather: weatherRows.rows,
        market: marketRows.rows,
        scoreData,
      });

      // SMS alert — skip if farmer has no phone number
      if (farmer && farmer.phone_number) {
        const alertInsert = await pool.query(
          `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
           VALUES ($1, $2, 'distress', 'sms', 'pending')
           RETURNING alert_id`,
          [farmer_id, score_id]
        );
        if (alertInsert.rows.length > 0) {
          const alert_id = alertInsert.rows[0].alert_id;
          // Send SMS — flip to 'sent' on success; stays 'pending' on failure for retry visibility
          const result = await sendSMS(farmer.phone_number, smsBody);
          if (result && result.success) {
            await pool.query(
              `UPDATE alerts SET status = 'sent' WHERE alert_id = $1`,
              [alert_id]
            );
          }
        }
      } else {
        console.warn(`[AlertService] Farmer ${farmer_id} has no phone number — SMS skipped.`);
      }

      // Push notification to officers — best-effort, must never block SMS
      try {
        await sendPushNotification({
          title: `High Risk Farmer: ${farmer.full_name}`,
          body: `Risk score: ${scoreData.risk_score} (${scoreData.risk_band})`,
          data: { farmer_id, score_id },
        });

        await pool.query(
          `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
           VALUES ($1, $2, 'distress', 'push', 'pending')`,
          [farmer_id, score_id]
        );
      } catch (pushErr) {
        console.warn(`[AlertService] Push notification failed for farmer ${farmer_id} (non-fatal):`, pushErr.message);
      }
    }
    return { scoreData, score_id };
  } catch (err) {
    console.error(`[AlertService] Error processing farmer ${farmer_id}:`, err.message);
  }
}

/**
 * Runs distress scoring for all farmers, creates alerts, and sends SMS/push.
 * Triggered daily by the cron job.
 */
export async function runAlertJob() {
  console.log(`[AlertService] Running distress alert job at ${new Date().toISOString()}`);

  const farmers = await pool.query(`SELECT farmer_id FROM farmers`);

  for (const { farmer_id } of farmers.rows) {
    await processFarmerDistressAndAlert(farmer_id);
  }

  console.log('[AlertService] Alert job complete.');
}

/**
 * Registers the cron job. Called once on server startup.
 */
export function startAlertCron() {
  cron.schedule(CRON_SCHEDULE, runAlertJob, { timezone: 'Asia/Kolkata' });
  console.log(`[AlertService] Cron registered: "${CRON_SCHEDULE}"`);
}
