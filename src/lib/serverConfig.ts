import { Platform } from 'react-native';

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);
const CENTRAL_SERVER_URL_ENV = 'EXPO_PUBLIC_CENTRAL_SERVER_URL';

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

function parseHttpUrl(value: string): { url: URL | null; error: string | null } {
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

function applyDevOnlyEmulatorRewrites(url: URL): URL {
  const next = new URL(url.toString());

  // Keep endpoint resolution deterministic:
  // - Never infer or replace a non-loopback hostname.
  // - Only rewrite for the emulator/simulator loopback edge cases, and only in dev.
  if (!__DEV__) return next;

  if (Platform.OS === 'android' && isLoopbackHost(next.hostname)) {
    next.hostname = ANDROID_EMULATOR_HOST;
  }

  if (Platform.OS === 'ios' && next.hostname === ANDROID_EMULATOR_HOST) {
    next.hostname = 'localhost';
  }

  return next;
}

export function resolveCentralServerUrl(): CentralServerUrlResolution {
  const raw = process.env.EXPO_PUBLIC_CENTRAL_SERVER_URL?.trim() ?? null;
  if (!raw) {
    return {
      url: null,
      raw: null,
      error: `Central server URL is missing. Set ${CENTRAL_SERVER_URL_ENV} to an absolute http(s) URL.`,
    };
  }

  const cleaned = stripTrailingSlashes(raw);
  const parsed = parseHttpUrl(cleaned);
  if (!parsed.url) {
    return {
      url: null,
      raw,
      error: parsed.error,
    };
  }

  const rewritten = applyDevOnlyEmulatorRewrites(parsed.url);
  return {
    url: stripTrailingSlashes(rewritten.toString()),
    raw,
    error: null,
  };
}

export function getCentralServerUrl(): string | null {
  return resolveCentralServerUrl().url;
}
