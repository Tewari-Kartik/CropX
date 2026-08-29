import axios from 'axios';

const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const MANDI_API_URL = process.env.MANDI_API_URL || 'https://api.data.gov.in/resource';
const MANDI_API_KEY = process.env.MANDI_API_KEY;

/**
 * Fetches current weather for a region from OpenWeatherMap.
 * @param {{ village_name: string, district: string, state: string }} region
 */
export async function fetchWeatherData(region) {
  try {
    const query = `${region.village_name},${region.state},IN`;
    const { data } = await axios.get(`${WEATHER_API_URL}/weather`, {
      params: { q: query, appid: WEATHER_API_KEY, units: 'metric' },
      timeout: 8000,
    });

    return {
      record_date: new Date().toISOString().split('T')[0],
      rainfall_mm: data.rain?.['1h'] ?? 0,
      temperature_c: data.main.temp,
      humidity_pct: data.main.humidity,
      source: 'openweathermap',
    };
  } catch (err) {
    console.error(`[WeatherAPI] Failed for region ${region.village_name}:`, err.message);
    return null;
  }
}

/**
 * Fetches latest Mandi prices for a crop from data.gov.in.
 * @param {{ crop_name: string }} crop
 */
export async function fetchMandiPrices(crop) {
  try {
    const { data } = await axios.get(`${MANDI_API_URL}/9ef84268-d588-465a-a308-a864a43d0070`, {
      params: {
        'api-key': MANDI_API_KEY,
        format: 'json',
        filters: `[commodity=${crop.crop_name}]`,
        limit: 1,
      },
      timeout: 8000,
    });

    const record = data?.records?.[0];
    if (!record) return null;

    return {
      mandi_name: record.market,
      price_date: record.arrival_date,
      price_per_quintal: parseFloat(record.modal_price),
      trend: 'stable', // Trend calculated separately with historical comparison
    };
  } catch (err) {
    console.error(`[MandiAPI] Failed for crop ${crop.crop_name}:`, err.message);
    return null;
  }
}
