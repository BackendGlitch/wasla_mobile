/**
 * Web-native session storage using localStorage.
 *
 * Note: For production, httpOnly cookies would be more secure against XSS.
 * localStorage is used here for simplicity during the mobile-to-web port.
 */
import type { User } from '../store/authStore';

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
export const AUTH_USER_KEY = 'auth_user';
export const HAS_ONBOARDED_KEY = 'has_onboarded';

export function readStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function persistStoredToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Storage full or unavailable
  }
}

export function deleteStoredToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function persistStoredRefreshToken(token: string): void {
  try {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, token);
  } catch {
    // Storage full or unavailable
  }
}

export function deleteStoredRefreshToken(): void {
  try {
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    // Key may already be absent
  }
}

export function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.phone !== 'string' ||
      typeof parsed.email !== 'string'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function persistStoredUser(user: User): void {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // Storage full or unavailable
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore
  }
}
