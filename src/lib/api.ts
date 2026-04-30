import axios from 'axios';
import { AUTH_TOKEN_KEY } from './sessionStorage';
import * as SecureStore from 'expo-secure-store';
import { resolveCentralServerUrl } from './serverConfig';
import { attachAxiosRetry } from './httpRetry';
import { breadcrumbAuthFailure, breadcrumbCentralBaseUrlResolution, captureException } from './observability';
import { forceLogout, isTokenExpired } from './authLifecycle';

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: resolveCentralServerUrl().url ?? undefined,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

attachAxiosRetry(api, { maxRetries: 2 });

// Request interceptor — inject Bearer token
api.interceptors.request.use(async (config) => {
  const resolved = resolveCentralServerUrl();
  if (!resolved.url) {
    breadcrumbCentralBaseUrlResolution(resolved);
    return Promise.reject(new Error(resolved.error ?? 'Central server URL is not configured.'));
  }

  config.baseURL = resolved.url;
  breadcrumbCentralBaseUrlResolution(resolved);

  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    await forceLogout('token_expired');
    return Promise.reject(new Error('Session expired.'));
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — on 401 clear token & redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      breadcrumbAuthFailure({
        status: 401,
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      captureException(error, {
        kind: 'auth_failure',
        status: 401,
        url: String(error.config?.url ?? ''),
      });
      await forceLogout('unauthorized');
    }
    return Promise.reject(error);
  },
);

export default api;
