/**
 * API client layer matching architecture.md §4.
 * All responses follow the envelope: { success: boolean, data: T, error: string | null }
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

// ===== Response Types =====

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

// §4.1 Create Farmer
export interface CreateFarmerPayload {
  full_name: string;
  phone_number: string;
  preferred_language: string;
  region: {
    village_name: string;
    district: string;
    state: string;
  };
  land_size_acres: number;
  crops: Array<{
    crop_name: string;
    sowing_date: string;
    irrigation_type: string;
  }>;
}

export interface CreateFarmerData {
  already_registered: boolean;
  farmer: {
    farmer_id: string;
    full_name: string;
    region_id: string;
    created_at: string;
    [key: string]: unknown;
  };
  crops: Array<{
    crop_id: string;
    crop_name: string;
    sowing_date: string;
    irrigation_type: string;
  }>;
}

// §4.2 Get Advisory
export interface AdvisoryData {
  advisory_id: string;
  crop_name: string;
  advisory_text: string;
  language: string;
  audio_url: string;
  generated_at: string;
  sources: string[];
}

// §4.3 Distress Score
export interface DistressScoreData {
  score_id: string;
  farmer_id: string;
  risk_score: number;
  risk_band: "low" | "medium" | "high" | "critical";
  contributing_factors: {
    rainfall_deficit_pct: number;
    market_price_drop_pct: number;
    loan_overdue_days: number;
  };
  computed_at: string;
}

// §4.4 High-Risk Alerts
export interface AlertItem {
  alert_id: string;
  farmer_id: string;
  farmer_name: string;
  phone_number: string;
  village_name: string;
  risk_score: number;
  risk_band: "low" | "medium" | "high" | "critical";
  alert_type: string;
  status: "pending" | "sent" | "acknowledged";
  created_at: string;
}

export interface HighRiskAlertsData {
  total: number;
  page: number;
  limit: number;
  alerts: AlertItem[];
}

// Auth login types
export interface LoginPayload {
  phone_number?: string;
  role?: "farmer" | "officer";
}

export interface LoginData {
  token: string;
  farmer_id: string | null;
  full_name?: string;
  role: "farmer" | "officer";
}

// ===== API Functions =====

async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    // Attach stored JWT to every request
    const token = localStorage.getItem("cropx-token");
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
    });

    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (err) {
    return {
      success: false,
      data: null as unknown as T,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/** Auth — login with phone number or officer role */
export function login(payload: LoginPayload) {
  return apiFetch<LoginData>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface WeatherItem {
  weather_id: string;
  region_id: string;
  record_date: string;
  rainfall_mm: number;
  temperature_c: number;
  humidity_pct: number;
  source: string;
}

export interface MarketPriceItem {
  price_id: string;
  crop_id: string;
  mandi_name: string;
  price_date: string;
  price_per_quintal: number;
  trend: "up" | "down" | "stable";
}

export interface FarmerProfileData {
  farmer_id: string;
  full_name: string;
  phone_number: string;
  preferred_language: string;
  region_id: string;
  village_name: string;
  district: string;
  state: string;
  land_size_acres: number;
  created_at: string;
  crops?: Array<{
    crop_id: string;
    crop_name: string;
    sowing_date: string;
    irrigation_type: string;
  }>;
}

/** Get farmer profile by ID (including registered crops) */
export function getFarmerById(farmerId: string) {
  return apiFetch<FarmerProfileData>(`/farmers/${farmerId}`);
}

/** Get latest weather by region ID */
export function getWeatherByRegion(regionId: string) {
  return apiFetch<WeatherItem[]>(`/weather/${regionId}`);
}

/** Get latest market prices by crop ID */
export function getMarketPricesByCrop(cropId: string) {
  return apiFetch<MarketPriceItem[]>(`/market/${cropId}`);
}

/** §4.1 Register a new farmer */
export function createFarmer(payload: CreateFarmerPayload) {
  return apiFetch<CreateFarmerData>("/farmers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** §4.2 Fetch personalized advisory */
export function getAdvisory(farmerId: string, cropId?: string, lang?: string) {
  const params = new URLSearchParams();
  if (cropId) params.set("crop_id", cropId);
  if (lang) params.set("lang", lang);
  const qs = params.toString();
  return apiFetch<AdvisoryData>(`/farmers/${farmerId}/advisory${qs ? `?${qs}` : ""}`);
}

/** §4.3 Get latest cached distress score */
export function getDistressScore(farmerId: string) {
  return apiFetch<DistressScoreData>(`/farmers/${farmerId}/distress-score`);
}

/** §4.3 Trigger distress score recomputation */
export function postDistressScore(farmerId: string, forceRecompute = false) {
  return apiFetch<DistressScoreData>(`/farmers/${farmerId}/distress-score`, {
    method: "POST",
    body: JSON.stringify({ force_recompute: forceRecompute }),
  });
}

/** §4.4 Get high-risk alerts (officer dashboard) */
export function getHighRiskAlerts(params: {
  region_id?: string;
  min_band?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.region_id) qs.set("region_id", params.region_id);
  if (params.min_band) qs.set("min_band", params.min_band);
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<HighRiskAlertsData>(`/alerts/high-risk${query ? `?${query}` : ""}`);
}

// SMS Log types
export interface SmsLogItem {
  alert_id: string;
  farmer_id: string;
  farmer_name: string;
  phone_number: string;
  village_name: string;
  alert_type: "distress" | "manual" | string;
  status: "pending" | "sent" | "acknowledged" | string;
  created_at: string;
  risk_score: number | null;
  risk_band: "low" | "medium" | "high" | "critical" | null;
}

export interface SmsLogData {
  total: number;
  page: number;
  limit: number;
  logs: SmsLogItem[];
}

export interface SendSmsResult {
  sent_to: string;
  farmer_name: string;
  message: string;
  textbee_result: unknown;
}

/** POST /api/v1/alerts/send-sms — manually trigger an ML-generated SMS */
export function sendSmsAlert(farmerId: string, message?: string) {
  return apiFetch<SendSmsResult>("/alerts/send-sms", {
    method: "POST",
    body: JSON.stringify({ farmer_id: farmerId, message }),
  });
}

/** GET /api/v1/alerts/sms-log — full SMS delivery history */
export function getSmsLog(params?: {
  status?: string;
  farmer_id?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.farmer_id) qs.set("farmer_id", params.farmer_id);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<SmsLogData>(`/alerts/sms-log${query ? `?${query}` : ""}`);
}

