import axios from 'axios';

const ADVISORY_URL = process.env.ADVISORY_ENGINE_URL || 'http://advisory-engine:8001';

/**
 * Calls the Advisory Engine FastAPI microservice.
 * POST /internal/advisory/generate
 *
 * @param {{ farmer: object, crop: object, weather: object[], market: object[], lang: string }} payload
 * @returns {Promise<{ advisory_id: string, advisory_text: string, language: string, audio_url: string, generated_at: string }>}
 */
export async function callAdvisoryEngine(payload) {
  const { data } = await axios.post(`${ADVISORY_URL}/internal/advisory/generate`, payload, {
    timeout: 10000,
  });
  return data;
}
