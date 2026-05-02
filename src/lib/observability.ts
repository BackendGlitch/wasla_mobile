import { isAxiosError } from 'axios';
import Constants from 'expo-constants';

type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

type Breadcrumb = {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
  level?: BreadcrumbLevel;
  timestamp?: number;
};

type User = { id?: string; email?: string; username?: string } | null;

type SentryLike = {
  init?: (options: Record<string, unknown>) => void;
  Native?: {
    addBreadcrumb?: (breadcrumb: Breadcrumb) => void;
    captureException?: (error: unknown, hint?: unknown) => void;
    setUser?: (user: User) => void;
    setTag?: (key: string, value: string) => void;
  };
};

let sentry: SentryLike | null | false = null;
let hasInitAttempted = false;

function loadSentry(): SentryLike | null {
  if (sentry === false) return null;
  if (sentry) return sentry;

  try {
    // Optional dependency: only enabled when installed + DSN is set.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sentry = require('sentry-expo') as SentryLike;
    return sentry;
  } catch {
    sentry = false;
    return null;
  }
}

function buildReleaseAndDist(): { release?: string; dist?: string } {
  const slug = Constants.expoConfig?.slug ?? 'wasla_mobile';
  const version = Constants.expoConfig?.version ?? 'unknown';
  const nb = Constants.nativeBuildVersion;
  const dist =
    nb ??
    Constants.expoConfig?.ios?.buildNumber ??
    (Constants.expoConfig?.android?.versionCode !== undefined
      ? String(Constants.expoConfig.android.versionCode)
      : undefined) ??
    (__DEV__ ? 'dev' : '1');

  return {
    release: `${slug}@${version}`,
    dist: String(dist),
  };
}

function shouldDropEvent(original: unknown): boolean {
  if (isAxiosError(original)) {
    const status = original.response?.status;
    if (status === 401) return true;
    if (original.code === 'ERR_CANCELED') return true;
  }

  if (original instanceof Error) {
    const m = original.message;
    if (m.includes('Session expired.') || m.includes('Request aborted')) return true;
  }

  return false;
}

export function initObservability(): void {
  if (hasInitAttempted) return;
  hasInitAttempted = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  const sdk = loadSentry();
  if (!sdk?.init) return;

  const versionTag = Constants.expoConfig?.version ?? 'unknown';
  const { release, dist } = buildReleaseAndDist();

  sdk.init({
    dsn,
    enableInExpoDevelopment: process.env.EXPO_PUBLIC_SENTRY_DEV === 'true',
    debug: __DEV__,
    release,
    dist,
    beforeSend(event: unknown, hint: { originalException?: unknown }) {
      const ex = hint?.originalException;
      if (ex !== undefined && shouldDropEvent(ex)) return null;
      return event;
    },
  });

  sdk.Native?.setTag?.('app_version', versionTag);
}

export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  const sdk = loadSentry();
  sdk?.Native?.addBreadcrumb?.(breadcrumb);
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const sdk = loadSentry();
  if (!sdk?.Native?.captureException) return;

  sdk.Native.captureException(error, context ? { extra: context } : undefined);
}

export function setUser(user: User): void {
  const sdk = loadSentry();
  sdk?.Native?.setUser?.(user);
}

export function setTag(key: string, value: string): void {
  const sdk = loadSentry();
  sdk?.Native?.setTag?.(key, value);
}

let lastCentralBaseUrl: string | null = null;
let lastCentralBaseUrlError: string | null = null;

export function breadcrumbCentralBaseUrlResolution(input: {
  url: string | null;
  raw: string | null;
  error: string | null;
}): void {
  if (input.url) {
    if (input.url !== lastCentralBaseUrl) {
      lastCentralBaseUrl = input.url;
      lastCentralBaseUrlError = null;
      addBreadcrumb({
        category: 'config',
        level: 'info',
        message: 'Central API base URL resolved',
        data: { url: input.url, raw: input.raw },
      });
    }
    return;
  }

  if (input.error && input.error !== lastCentralBaseUrlError) {
    lastCentralBaseUrlError = input.error;
    addBreadcrumb({
      category: 'config',
      level: 'error',
      message: 'Central API base URL resolution failed',
      data: { error: input.error, raw: input.raw },
    });
  }
}

export function breadcrumbAuthFailure(input: {
  status: number;
  method?: string;
  url?: string;
  baseURL?: string;
}): void {
  addBreadcrumb({
    category: 'auth',
    level: 'warning',
    message: 'Auth failure',
    data: {
      status: input.status,
      method: input.method,
      url: input.url,
      baseURL: input.baseURL,
    },
  });
}
