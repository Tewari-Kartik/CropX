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

/** Get farmer profile by ID */
export function getFarmerById(farmerId: string) {
  return apiFetch<{
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
  }>(`/farmers/${farmerId}`);
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
