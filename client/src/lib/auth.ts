/**
 * Auth helpers — manages JWT token and session data in localStorage.
 * Hackathon MVP: no refresh tokens, no expiry checks.
 */

const TOKEN_KEY = "cropx-token";
const FARMER_ID_KEY = "cropx-farmer-id";
const ROLE_KEY = "cropx-role";
const NAME_KEY = "cropx-farmer-name";
const CROP_ID_KEY = "cropx-crop-id";
const CROP_NAME_KEY = "cropx-crop-name";
const CROPS_KEY = "cropx-crops";

export interface CropSessionItem {
  crop_id?: string;
  crop_name: string;
  sowing_date?: string;
  irrigation_type?: string;
}

export interface AuthSession {
  token: string;
  farmer_id: string | null;
  role: "farmer" | "officer";
  full_name?: string;
}

/** Save session after successful login */
export function saveSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(ROLE_KEY, session.role);
  if (session.farmer_id) {
    localStorage.setItem(FARMER_ID_KEY, session.farmer_id);
  }
  if (session.full_name) {
    localStorage.setItem(NAME_KEY, session.full_name);
  }
}

/** Get the stored JWT (or null) */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Get the stored farmer_id (or null) */
export function getFarmerId(): string | null {
  return localStorage.getItem(FARMER_ID_KEY);
}

/** Get the stored role */
export function getRole(): "farmer" | "officer" | null {
  return localStorage.getItem(ROLE_KEY) as "farmer" | "officer" | null;
}

/** Get the stored farmer name */
export function getFarmerName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

/** Save the primary crop id (used by advisory page) */
export function saveCropId(cropId: string): void {
  localStorage.setItem(CROP_ID_KEY, cropId);
}

/** Get the stored primary crop id */
export function getCropId(): string | null {
  return localStorage.getItem(CROP_ID_KEY);
}

/** Save the primary crop name */
export function saveCropName(cropName: string): void {
  localStorage.setItem(CROP_NAME_KEY, cropName);
}

/** Get the stored primary crop name */
export function getCropName(): string | null {
  return localStorage.getItem(CROP_NAME_KEY);
}

/** Save full crops array */
export function saveCrops(crops: CropSessionItem[]): void {
  localStorage.setItem(CROPS_KEY, JSON.stringify(crops));
}

/** Get full crops array */
export function getCrops(): CropSessionItem[] {
  try {
    const raw = localStorage.getItem(CROPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Check if user is logged in */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/** Clear session (logout) */
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FARMER_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(CROP_ID_KEY);
  localStorage.removeItem(CROP_NAME_KEY);
  localStorage.removeItem(CROPS_KEY);
}
