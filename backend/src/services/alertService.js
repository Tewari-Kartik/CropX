import cron from 'node-cron';
import pool from '../db/pool.js';
import { callDistressEngine } from './distressService.js';
import { sendSMS } from './smsService.js';
import { sendPushNotification } from './pushService.js';

const CRON_SCHEDULE = process.env.ALERT_CRON_SCHEDULE || '0 6 * * *'; // Daily 6AM
const THRESHOLD = Number(process.env.DISTRESS_SCORE_THRESHOLD) || 70;

/**
 * Runs distress scoring for all farmers, creates alerts, and sends SMS/push.
 * Triggered daily by the cron job.
 */
export async function runAlertJob() {
  console.log(`[AlertService] Running distress alert job at ${new Date().toISOString()}`);

  const farmers = await pool.query(`SELECT farmer_id FROM farmers`);

  for (const { farmer_id } of farmers.rows) {
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

      // Trigger alerts for high/critical risk
      if (['high', 'critical'].includes(scoreData.risk_band) || scoreData.risk_score >= THRESHOLD) {
        const farmer = await pool.query(
          `SELECT full_name, phone_number FROM farmers WHERE farmer_id = $1`,
          [farmer_id]
        );
        const { full_name, phone_number } = farmer.rows[0];

        // SMS alert
        await pool.query(
          `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
           VALUES ($1, $2, 'distress', 'sms', 'pending')`,
          [farmer_id, score_id]
        );
        await sendSMS(phone_number, `CropX Alert: ${full_name}, your distress score is ${scoreData.risk_score} (${scoreData.risk_band}). Please contact your agricultural officer.`);

        // Push notification to officers
        await sendPushNotification({
          title: `High Risk Farmer: ${full_name}`,
          body: `Risk score: ${scoreData.risk_score} (${scoreData.risk_band})`,
          data: { farmer_id, score_id },
        });

        await pool.query(
          `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
           VALUES ($1, $2, 'distress', 'push', 'pending')`,
          [farmer_id, score_id]
        );
      }
    } catch (err) {
      console.error(`[AlertService] Error processing farmer ${farmer_id}:`, err.message);
    }
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
