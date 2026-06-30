import axios, { isAxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { getCentralServerUrl } from './serverConfig';
import { attachAxiosRetry } from './httpRetry';
import { forceLogout, getValidStoredToken, tryRotationRefresh } from './authLifecycle';
import { readStoredToken } from './sessionStorage';

type AuthorizedRequestConfig = InternalAxiosRequestConfig & {
  __waslaRetryAfterRefresh?: boolean;
};

// ─── Axios Instance ────────────────────────────
const api = axios.create({
  baseURL: getCentralServerUrl() ?? undefined,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Retry idempotent reads (GET default). Mutations pass `__waslaMaxRetries: 0` on the config.
attachAxiosRetry(api, { maxRetries: 2 });

// Request interceptor — inject Bearer token
api.interceptors.request.use(async (config) => {
  const url = getCentralServerUrl();
  if (!url) {
    console.warn('Central server URL is not configured.');
    return Promise.reject(new Error('Central server URL is not configured.'));
  }

  config.baseURL = url.replace(/\/+$/, '') + '/api/v1';

  const token = await getValidStoredToken();
  if (!token) {
    return config;
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const cfg = error.config as AuthorizedRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && cfg && !cfg.__waslaRetryAfterRefresh) {
      const rotated = await tryRotationRefresh();
      if (rotated) {
        const token = readStoredToken();
        if (token) {
          cfg.__waslaRetryAfterRefresh = true;
          cfg.headers = cfg.headers ?? {};
          cfg.headers.Authorization = `Bearer ${token}`;
          return api.request(cfg);
        }
      }
    }

    if (status === 401) {
      console.warn('[api] Auth failure', {
        status: 401,
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      await forceLogout('unauthorized');
    }

    if (typeof status === 'number' && status >= 500) {
      console.error('[api] Server error', {
        status,
        url: String(error.config?.url ?? ''),
        method: String(error.config?.method ?? ''),
      });
    }

    return Promise.reject(error);
  },
);

export default api;
