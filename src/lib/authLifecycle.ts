import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { addBreadcrumb, setUser as setObservabilityUser } from './observability';
import { clearStoredSession, readStoredToken } from './sessionStorage';

let logoutInFlight: Promise<void> | null = null;

function decodeBase64Url(input: string): string | null {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const base64 = normalized + padding;
  try {
    return globalThis.atob ? globalThis.atob(base64) : null;
  } catch {
    return null;
  }
}

function getJwtExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payloadJson = decodeBase64Url(parts[1]);
  if (!payloadJson) return null;
  try {
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    const exp = payload.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const expiryMs = getJwtExpiryMs(token);
  if (!expiryMs) return false;
  return Date.now() >= expiryMs - skewSeconds * 1000;
}

export async function getValidStoredToken(): Promise<string | null> {
  const token = await readStoredToken();
  if (!token) return null;
  if (!isTokenExpired(token)) return token;
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

