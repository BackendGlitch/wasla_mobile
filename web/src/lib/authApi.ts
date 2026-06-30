import axios, { isAxiosError } from 'axios';
import { getCentralServerUrl } from './serverConfig';
import { attachAxiosRetry } from './httpRetry';

type CentralUser = {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
};

export type AuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: CentralUser;
};

const centralApi = axios.create({
  baseURL: getCentralServerUrl() ?? undefined,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

attachAxiosRetry(centralApi, { maxRetries: 1 });

centralApi.interceptors.request.use((config) => {
  const url = getCentralServerUrl();
  if (!url) {
    console.warn('Central server URL is not configured.');
    return Promise.reject(new Error('Central server URL is not configured.'));
  }

  config.baseURL = url.replace(/\/+$/, '') + '/api/v1';
  return config;
});

/** NestJS often returns `{ message: string | string[] }` on 400. */
export function getCentralApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const msg = data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.filter(Boolean).join('. ');
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export const authApi = {
  register: async (body: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const res = await centralApi.post('/auth/register', body);
    return res.data as { message: string; user: CentralUser };
  },

  loginWithEmail: async (body: { email: string; password: string }) => {
    const res = await centralApi.post('/auth/login', body);
    return res.data as AuthTokenResponse;
  },

  loginWithPhone: async (body: { phone: string; password: string }) => {
    const res = await centralApi.post('/auth/login', body);
    return res.data as AuthTokenResponse;
  },

  requestOtp: async (body: { email: string }) => {
    const res = await centralApi.post('/auth/request-otp', body);
    return res.data as { message: string };
  },

  verifyOtp: async (body: { email: string; otp: string }) => {
    const res = await centralApi.post('/auth/verify-otp', body);
    return res.data as AuthTokenResponse;
  },

  exchangeRefreshToken: async (refresh_token: string) => {
    const res = await centralApi.post('/auth/refresh', { refresh_token });
    return res.data as AuthTokenResponse;
  },

  checkAvailability: async (body: { email?: string; phone?: string }) => {
    const res = await centralApi.post('/auth/check-availability', body);
    return res.data as { emailAvailable?: boolean; phoneAvailable?: boolean };
  },
};
