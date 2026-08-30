/**
 * Auth helpers — manages JWT token and session data in localStorage.
 * Hackathon MVP: no refresh tokens, no expiry checks.
 */

const TOKEN_KEY = "cropx-token";
const FARMER_ID_KEY = "cropx-farmer-id";
const ROLE_KEY = "cropx-role";
const NAME_KEY = "cropx-farmer-name";

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
}
