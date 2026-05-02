import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { authApi } from './authApi';
import { addBreadcrumb, setUser as setObservabilityUser } from './observability';
import {
  clearStoredSession,
  deleteStoredRefreshToken,
  persistStoredRefreshToken,
  persistStoredToken,
  readStoredRefreshToken,
  readStoredToken,
} from './sessionStorage';
import { isTokenExpired } from './tokenExpiry';

let logoutInFlight: Promise<void> | null = null;

/** Serialized refresh attempts so concurrent 401s / expiry checks share one rotation. */
let rotationRefreshPromise: Promise<boolean> | null = null;

export { isTokenExpired } from './tokenExpiry';

/**
 * Calls `POST /auth/refresh`, persists rotated tokens on success.
 * Safe to invoke from multiple callers in parallel (single-flight).
 */
export async function tryRotationRefresh(): Promise<boolean> {
  if (rotationRefreshPromise) return rotationRefreshPromise;

  rotationRefreshPromise = (async () => {
    const rt = await readStoredRefreshToken();
    const trimmed = rt?.trim();
    if (!trimmed) return false;
    try {
      const data = await authApi.exchangeRefreshToken(trimmed);
      await persistStoredToken(data.access_token);
      const nextRt = data.refresh_token?.trim();
      if (nextRt) await persistStoredRefreshToken(nextRt);
      else await deleteStoredRefreshToken();
      useAuthStore.getState().setToken(data.access_token);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    rotationRefreshPromise = null;
  });

  return rotationRefreshPromise;
}

export async function getValidStoredToken(): Promise<string | null> {
  const token = await readStoredToken();
  if (!token) return null;
  if (!isTokenExpired(token)) return token;

  const rotated = await tryRotationRefresh();
  if (rotated) {
    const next = await readStoredToken();
    return next ?? null;
  }

  await forceLogout('token_expired');
  return null;
}

export async function forceLogout(reason: string): Promise<void> {
  if (logoutInFlight) return logoutInFlight;

  logoutInFlight = (async () => {
    addBreadcrumb({
      category: 'auth',
      level: 'warning',
      message: 'Forced logout',
      data: { reason },
    });

    try {
      await clearStoredSession();
    } finally {
      useAuthStore.setState({ token: null, user: null });
      setObservabilityUser(null);
      router.replace('/(auth)');
    }
  })().finally(() => {
    logoutInFlight = null;
  });

  return logoutInFlight;
}
