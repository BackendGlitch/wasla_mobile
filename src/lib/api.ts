import axios from 'axios';
import { router } from 'expo-router';
import { AUTH_TOKEN_KEY, clearStoredSession } from './sessionStorage';
import * as SecureStore from 'expo-secure-store';
import { getCentralServerUrl } from './serverConfig';

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: getCentralServerUrl() ?? undefined,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject Bearer token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
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
      await clearStoredSession();
      router.replace('/(auth)');
    }
    return Promise.reject(error);
  },
);

export default api;
