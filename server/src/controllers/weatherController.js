import pool from '../db/pool.js';
import { fetchWeatherData } from '../services/externalApiService.js';
import { response } from '../utils/response.js';

/**
 * GET /api/v1/weather/:region_id
 */
export async function getWeatherByRegion(req, res, next) {
  try {
    const { region_id } = req.params;
    let result = await pool.query(
      `SELECT * FROM weather_data WHERE region_id = $1 ORDER BY record_date DESC LIMIT 7`,
      [region_id]
    );

    if (result.rows.length === 0) {
      const regQuery = await pool.query(`SELECT * FROM regions WHERE region_id = $1`, [region_id]);
      if (regQuery.rows.length > 0) {
        const wData = await fetchWeatherData(regQuery.rows[0]);
        if (wData) {
          await pool.query(
            `INSERT INTO weather_data (region_id, record_date, rainfall_mm, temperature_c, humidity_pct, source)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [region_id, wData.record_date, wData.rainfall_mm, wData.temperature_c, wData.humidity_pct, wData.source]
          );
          result = await pool.query(
            `SELECT * FROM weather_data WHERE region_id = $1 ORDER BY record_date DESC LIMIT 7`,
            [region_id]
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
 * POST /api/v1/weather/ingest — triggered by cron or manually
 */
export async function ingestWeather(req, res, next) {
  try {
    const regions = await pool.query(`SELECT region_id, village_name, district, state FROM regions`);
    let ingested = 0;

    for (const region of regions.rows) {
      const weatherData = await fetchWeatherData(region);
      if (!weatherData) continue;

      await pool.query(
        `INSERT INTO weather_data (region_id, record_date, rainfall_mm, temperature_c, humidity_pct, source)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [region.region_id, weatherData.record_date, weatherData.rainfall_mm,
         weatherData.temperature_c, weatherData.humidity_pct, weatherData.source]
      );
      ingested++;
    }

    res.json(response(true, { ingested }));
  } catch (err) {
    next(err);
  }
}
