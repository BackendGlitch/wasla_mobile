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

/** Expo Router can mishandle `@` in path/query params — encode when passing, decode when reading. */
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
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function isVerified(v: boolean | undefined | null): boolean {
  return v === true;
}

function buildStoreUser(
  result: AuthTokenResponse,
  fallbackEmail: string,
  fallbackPhone: string,
): User {
  const u = result.user;
  const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  const email = (u.email?.trim() || fallbackEmail).trim();
  const phone = (u.phone?.trim() || fallbackPhone).trim();
  return {
    id: u.id,
    name: fullName || (email ? email.split('@')[0] : phone || 'User'),
    phone,
    email,
  };
}

/**
 * Persists token, updates the auth store, then routes to email OTP, phone OTP, or the app
 * so both contact methods are verified before home.
 */
export async function finishAuthAndNavigate(
  result: AuthTokenResponse,
  router: Router,
  setToken: (t: string | null) => void,
  setUser: (u: User | null) => void,
  options: {
    /** Sign-up OTP screen passes encoded email; also used if API omits email. */
    signupEmailDecoded?: string;
    /** E.164 from the SMS screen (sign-in may not pass email in the URL). */
    flowPhone?: string;
  } = {},
): Promise<void> {
  await persistStoredToken(result.access_token);
  const rt = result.refresh_token?.trim();
  if (rt) await persistStoredRefreshToken(rt);
  else await deleteStoredRefreshToken();
  setToken(result.access_token);

  const u = result.user;
  const emailNorm =
    u.email?.trim().toLowerCase() ||
    options.signupEmailDecoded?.trim().toLowerCase() ||
    '';
  const phoneE164 = (
    u.phone?.trim() ||
    options.flowPhone?.trim() ||
    ''
  ).replace(/\s+/g, '');

  const storeUser = buildStoreUser(result, emailNorm || u.email || '', phoneE164 || u.phone || '');
  await persistStoredUser(storeUser);
  setUser(storeUser);
  setObservabilityUser({ id: storeUser.id, email: storeUser.email, username: storeUser.name });
  addBreadcrumb({
    category: 'auth',
    level: 'info',
    message: 'Signed in',
    data: { userId: storeUser.id },
  });

  if (emailNorm && !isVerified(u.emailVerified)) {
    try {
      await authApi.requestOtp({ email: emailNorm });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: {
          email: encodeAuthRouteParam(emailNorm),
          skipInitialOtp: '1',
        },
      });
    } catch {
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: encodeAuthRouteParam(emailNorm) },
      });
    }
    return;
  }

  if (phoneE164 && !isVerified(u.phoneVerified)) {
    await authApi.requestOtp({ phone: phoneE164 });
    router.replace({
      pathname: '/(auth)/otp',
      params: {
        phone: phoneE164,
        ...(emailNorm ? { email: encodeAuthRouteParam(emailNorm) } : {}),
      },
    });
    return;
  }

  router.replace('/(app)');
}
