import axios from 'axios';
import { Platform } from 'react-native';

type CentralUser = {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};

export type AuthTokenResponse = {
  access_token: string;
  user: CentralUser;
};

const getCentralBaseUrl = () => {
  const fallback =
    Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
  return (process.env.EXPO_PUBLIC_CENTRAL_SERVER_URL || fallback).replace(/\/+$/, '');
};

export const toE164TNPhone = (input: string) => {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw.replace(/\s+/g, '');
  const digits = raw.replace(/[^\d]/g, '');
  return `+216${digits}`;
};

const centralApi = axios.create({
  baseURL: getCentralBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

  requestOtp: async (body: { phone?: string; email?: string }) => {
    const res = await centralApi.post('/auth/request-otp', body);
    return res.data as { message: string };
  },

  verifyOtp: async (body: { phone?: string; email?: string; otp: string }) => {
    const res = await centralApi.post('/auth/verify-otp', body);
    return res.data as AuthTokenResponse;
  },
};

