import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const ADVISORY_URL = process.env.ADVISORY_ENGINE_URL || 'http://advisory-engine:8001';

/**
 * Stub advisory response matching architecture.md §4.2 shape.
 * Used when the Advisory Engine FastAPI service is unavailable (not yet built by HC).
 */
function stubAdvisoryResponse(payload) {
  const { crop, weather = [], market = [], lang } = payload;
  const cropName = crop?.crop_name || 'Crop';
  const isHindi = lang === 'hi';

  const latestWeather = weather[0] || {};
  const temp = latestWeather.temperature_c ? `${Math.round(latestWeather.temperature_c)}°C` : '30°C';
  const rain = latestWeather.rainfall_mm > 0;
  const latestPrice = market[0] || {};
  const priceStr = latestPrice.price_per_quintal ? `₹${latestPrice.price_per_quintal}/qtl` : null;

  let advisory_text = '';

  if (isHindi) {
    if (rain) {
      advisory_text = `वर्तमान में वर्षा (${temp}) के कारण ${cropName} की सिंचाई 2 दिन के लिए टालें। जलभराव से बचें। बारिश के बाद यूरिया 45 किग्रा/एकड़ डालें।`;
    } else {
      advisory_text = `तापमान ${temp} रहने की संभावना है। ${cropName} में मिट्टी की नमी बनाए रखने के लिए शाम को हल्की सिंचाई करें।`;
    }
    if (priceStr) {
      advisory_text += ` ${latestPrice.mandi_name || 'मंडी'} में वर्तमान भाव ${priceStr} है (${latestPrice.trend === 'up' ? 'तेजी' : 'स्थिर'})।`;
    }
    advisory_text += ` पत्ती सुरक्षा के लिए अनुशंसित मैनकोज़ेब 2.5 ग्राम/लीटर का छिड़काव करें।`;
  } else {
    if (rain) {
      advisory_text = `Delay irrigation for ${cropName} by 2 days due to expected rainfall (${temp}). Ensure field drainage to prevent waterlogging. Post-rain, apply urea at 45 kg/acre.`;
    } else {
      advisory_text = `Current temperature is ${temp}. Provide light evening irrigation to maintain optimal soil moisture for ${cropName}.`;
    }
    if (priceStr) {
      advisory_text += ` Mandi price at ${latestPrice.mandi_name || 'local market'} is currently ${priceStr} (${latestPrice.trend || 'stable'}).`;
    }
    advisory_text += ` Spray recommended Mancozeb 2.5g/L to protect foliage.`;
  }

  return {
    advisory_id: uuidv4(),
    advisory_text,
    language: lang || 'en',
    audio_url: '',
    generated_at: new Date().toISOString(),
    sources: ['weather_data', 'mandi_prices', 'crop_stage'],
    model_version: 'ai-crop-v1.2',
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
