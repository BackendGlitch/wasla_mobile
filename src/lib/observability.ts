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

export function initObservability(): void {
  if (hasInitAttempted) return;
  hasInitAttempted = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  const sdk = loadSentry();
  if (!sdk?.init) return;

  sdk.init({
    dsn,
    enableInExpoDevelopment: true,
    debug: __DEV__,
  });
}

export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  const sdk = loadSentry();
  sdk?.Native?.addBreadcrumb?.(breadcrumb);
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const sdk = loadSentry();
  if (!sdk?.Native?.captureException) return;

  // Sentry SDKs accept arbitrary hints; keep it lightweight and structured.
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

