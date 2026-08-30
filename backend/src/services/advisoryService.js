import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const ADVISORY_URL = process.env.ADVISORY_ENGINE_URL || 'http://advisory-engine:8001';

/**
 * Stub advisory response matching architecture.md §4.2 shape.
 * Used when the Advisory Engine FastAPI service is unavailable (not yet built by HC).
 */
function stubAdvisoryResponse(payload) {
  const { crop, lang } = payload;
  const cropName = crop?.crop_name || 'your crop';
  const isHindi = lang === 'hi';

  const advisory_text = isHindi
    ? `गुरुवार को अपेक्षित बारिश के कारण ${cropName} की सिंचाई 2 दिन के लिए टालें। मिट्टी की नमी पर्याप्त है। बारिश के बाद यूरिया 50 किग्रा/एकड़ डालें। पत्ती के धब्बों के लिए मैनकोज़ेब 2.5 ग्राम/लीटर का छिड़काव करें।`
    : `Delay irrigation for ${cropName} by 2 days due to expected rainfall on Thursday. Soil moisture is currently adequate. After rain, apply urea at 50 kg/acre. Spray Mancozeb 2.5g/litre to prevent leaf spot. Monitor for waterlogging.`;

  return {
    advisory_id: uuidv4(),
    advisory_text,
    language: lang || 'en',
    audio_url: '',
    generated_at: new Date().toISOString(),
    sources: ['weather_data', 'growth_stage'],
    model_version: 'stub-0.0.0',
  };
}

/**
 * Calls the Advisory Engine FastAPI microservice.
 * POST /internal/advisory/generate
 *
 * Falls back to a static stub response if the service is unreachable.
 * When HC ships the advisory-engine, this fallback can be removed.
 *
 * @param {{ farmer: object, crop: object, weather: object[], market: object[], lang: string }} payload
 * @returns {Promise<{ advisory_id: string, advisory_text: string, language: string, audio_url: string, generated_at: string, sources: string[] }>}
 */
export async function callAdvisoryEngine(payload) {
  try {
    const { data } = await axios.post(`${ADVISORY_URL}/internal/advisory/generate`, payload, {
      timeout: 10000,
    });
    return data;
  } catch (err) {
    console.warn(`[MOCK] advisory-engine unavailable (${err.message}), using stub response`);
    return stubAdvisoryResponse(payload);
  }
}
