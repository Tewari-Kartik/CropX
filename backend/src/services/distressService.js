import axios from 'axios';

const DISTRESS_URL = process.env.DISTRESS_ENGINE_URL || 'http://distress-engine:8002';

/**
 * Calls the Distress Engine FastAPI microservice.
 * POST /internal/distress/score
 *
 * @param {{ farmer_id: string, weather: object[], market: object[], loans: object[] }} payload
 * @returns {Promise<{ risk_score: number, risk_band: string, contributing_factors: object, model_version: string }>}
 */
export async function callDistressEngine(payload) {
  const { data } = await axios.post(`${DISTRESS_URL}/internal/distress/score`, payload, {
    timeout: 15000,
  });
  return data;
}
