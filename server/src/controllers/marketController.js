import pool from '../db/pool.js';
import { fetchMandiPrices } from '../services/externalApiService.js';
import { response } from '../utils/response.js';

/**
 * GET /api/v1/market/:crop_id
 */
export async function getMarketPricesByCrop(req, res, next) {
  try {
    const { crop_id } = req.params;
    let result = await pool.query(
      `SELECT * FROM market_prices WHERE crop_id = $1 ORDER BY price_date DESC LIMIT 10`,
      [crop_id]
    );

    if (result.rows.length === 0) {
      const cropQuery = await pool.query(`SELECT * FROM crops WHERE crop_id = $1`, [crop_id]);
      if (cropQuery.rows.length > 0) {
        const pData = await fetchMandiPrices(cropQuery.rows[0]);
        if (pData) {
          await pool.query(
            `INSERT INTO market_prices (crop_id, mandi_name, price_date, price_per_quintal, trend)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [crop_id, pData.mandi_name, pData.price_date, pData.price_per_quintal, pData.trend]
          );
          result = await pool.query(
            `SELECT * FROM market_prices WHERE crop_id = $1 ORDER BY price_date DESC LIMIT 10`,
            [crop_id]
          );
        }
      }
    }

    res.json(response(true, result.rows));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/market/ingest — triggered by cron or manually
 */
export async function ingestMarketPrices(req, res, next) {
  try {
    const crops = await pool.query(`SELECT crop_id, crop_name FROM crops`);
    let ingested = 0;

    for (const crop of crops.rows) {
      const prices = await fetchMandiPrices(crop);
      if (!prices) continue;

      await pool.query(
        `INSERT INTO market_prices (crop_id, mandi_name, price_date, price_per_quintal, trend)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [crop.crop_id, prices.mandi_name, prices.price_date, prices.price_per_quintal, prices.trend]
      );
      ingested++;
    }

    res.json(response(true, { ingested }));
  } catch (err) {
    next(err);
  }
}
