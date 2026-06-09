const ANDROID_EMULATOR_HOST = '10.0.2.2';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);
const CENTRAL_SERVER_URL_ENV = 'EXPO_PUBLIC_CENTRAL_SERVER_URL';
const HARDCODED_URL = 'https://api.backendglitch.com';

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname);
}

export type CentralServerUrlResolution = {
  url: string | null;
  error: string | null;
  raw: string | null;
};

type ParseResult = { url: URL | null; error: string | null };

function parseHttpUrl(value: string): ParseResult {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      url: null,
      error: `Invalid ${CENTRAL_SERVER_URL_ENV}. Expected an absolute http(s) URL (example: https://api.example.com).`,
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      url: null,
      error: `Invalid ${CENTRAL_SERVER_URL_ENV}. Only http:// and https:// URLs are supported.`,
    };
  }

  return { url, error: null };
}

export type ResolveCentralServerUrlOptions = {
  raw: string | null;
  platformOS: 'android' | 'ios' | 'web' | 'windows' | 'macos' | 'native' | string;
  isDev: boolean;
};

function applyDevOnlyEmulatorRewrites(
  url: URL,
  platformOS: ResolveCentralServerUrlOptions['platformOS'],
  isDev: boolean,
): URL {
  const next = new URL(url.toString());

  // Keep endpoint resolution deterministic:
  // - Never infer or replace a non-loopback hostname.
  // - Only rewrite for the emulator/simulator loopback edge cases, and only in dev.
  if (!isDev) return next;

  if (platformOS === 'android' && isLoopbackHost(next.hostname)) {
    next.hostname = ANDROID_EMULATOR_HOST;
  }

  if (platformOS === 'ios' && next.hostname === ANDROID_EMULATOR_HOST) {
    next.hostname = 'localhost';
  }

  return next;
}

export function resolveCentralServerUrlCore(
  options: ResolveCentralServerUrlOptions,
): CentralServerUrlResolution {
  const raw = options.raw?.trim() || null;
  // Fall back to hardcoded production URL if env var is not set
  const effective = raw || HARDCODED_URL;
  const cleaned = stripTrailingSlashes(effective);
  const parsed = parseHttpUrl(cleaned);
  if (!parsed.url) {
    return {
      url: null,
      raw,
      error: parsed.error,
    };
  }

  const rewritten = applyDevOnlyEmulatorRewrites(
    parsed.url,
    options.platformOS,
    options.isDev,
  );
  return {
    url: stripTrailingSlashes(rewritten.toString()),
    raw: raw || HARDCODED_URL,
    error: null,
  };
}

