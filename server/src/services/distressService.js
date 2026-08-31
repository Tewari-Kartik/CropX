import axios from 'axios';

const DISTRESS_URL = process.env.DISTRESS_ENGINE_URL || 'http://distress-engine:8002';

/**
 * Stub distress score response matching architecture.md §4.3 shape.
 * Used when the Distress Engine FastAPI service is unavailable (not yet built by KT).
 */
function stubDistressResponse(payload) {
  const { loans = [], weather = [], market = [] } = payload;

  // Simple heuristic: more overdue loans → higher risk score
  const overdueLoanDays = loans
    .filter((l) => l.repayment_status === 'overdue')
    .reduce((acc, l) => {
      const days = l.due_date
        ? Math.max(0, Math.floor((Date.now() - new Date(l.due_date)) / 86400000))
        : 30;
      return acc + days;
    }, 0);

  const hasRecentRainfall = weather.length > 0;
  const hasMarketData = market.length > 0;

  // Deterministic risk score based on available data
  let riskScore = 45; // Baseline moderate
  if (overdueLoanDays > 60) riskScore += 30;
  else if (overdueLoanDays > 30) riskScore += 15;
  if (!hasRecentRainfall) riskScore += 10;
  if (!hasMarketData) riskScore += 5;

  riskScore = Math.min(100, riskScore);

  const riskBand =
    riskScore >= 80 ? 'critical' :
    riskScore >= 60 ? 'high' :
    riskScore >= 40 ? 'medium' : 'low';

  return {
    risk_score: Math.round(riskScore * 10) / 10,
    risk_band: riskBand,
    contributing_factors: {
      rainfall_deficit_pct: hasRecentRainfall ? 12 : 42,
      market_price_drop_pct: hasMarketData ? 8 : 18,
      loan_overdue_days: overdueLoanDays,
    },
    model_version: 'stub-0.0.0',
  };
}

/**
 * Calls the Distress Engine FastAPI microservice.
 * POST /internal/distress/score
 *
 * Falls back to a heuristic stub response if the service is unreachable.
 * When KT ships the distress-engine, this fallback can be removed.
 *
 * @param {{ farmer_id: string, weather: object[], market: object[], loans: object[] }} payload
 * @returns {Promise<{ risk_score: number, risk_band: string, contributing_factors: object, model_version: string }>}
 */
export async function callDistressEngine(payload) {
  try {
    const { data } = await axios.post(`${DISTRESS_URL}/internal/distress/score`, payload, {
      timeout: 15000,
    });
    return data;
  } catch (err) {
    console.warn(`[MOCK] distress-engine unavailable (${err.message}), using stub response`);
    return stubDistressResponse(payload);
  }
}
