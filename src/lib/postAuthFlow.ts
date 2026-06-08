import type { Router } from 'expo-router';
import { authApi, type AuthTokenResponse } from './authApi';
import {
  deleteStoredRefreshToken,
  persistStoredRefreshToken,
  persistStoredToken,
  persistStoredUser,
} from './sessionStorage';
import type { User } from '../store/authStore';
import { addBreadcrumb, setUser as setObservabilityUser } from './observability';

export function encodeAuthRouteParam(value: string): string {
  return encodeURIComponent(value.trim());
}

export function singleRouteParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'string' ? v : v[0];
}

export function decodeAuthRouteParam(raw: string | undefined): string {
  if (raw == null || raw === '') return '';
  const s = String(raw);
  try { return decodeURIComponent(s); } catch { return s; }
}

function isVerified(v: boolean | undefined | null): boolean {
  return v === true;
}

export async function finishAuthAndNavigate(
  result: AuthTokenResponse,
  router: Router,
  setToken: (t: string | null) => void,
  setUser: (u: User | null) => void,
): Promise<void> {
  await persistStoredToken(result.access_token);
  const rt = result.refresh_token?.trim();
  if (rt) await persistStoredRefreshToken(rt);
  else await deleteStoredRefreshToken();
  setToken(result.access_token);

  const u = result.user;
  const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  const email = (u.email?.trim() || '').trim();
  const phone = (u.phone?.trim() || '').trim();

  const storeUser: User = {
    id: u.id,
    name: fullName || (email ? email.split('@')[0] : phone || 'User'),
    phone,
    email,
  };

  await persistStoredUser(storeUser);
  setUser(storeUser);
  setObservabilityUser({ id: storeUser.id, email: storeUser.email, username: storeUser.name });
  addBreadcrumb({ category: 'auth', level: 'info', message: 'Signed in', data: { userId: storeUser.id } });

  // Route to email verification if not yet verified
  if (email && !isVerified(u.emailVerified)) {
    try {
      await authApi.requestOtp({ email });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: encodeAuthRouteParam(email), skipInitialOtp: '1' },
      });
    } catch {
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: encodeAuthRouteParam(email) },
      });
    }
    return;
  }

  router.replace('/(app)');
}
