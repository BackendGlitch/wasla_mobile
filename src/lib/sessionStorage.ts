import * as SecureStore from 'expo-secure-store';
import type { User } from '../store/authStore';

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
export const AUTH_USER_KEY = 'auth_user';

export async function readStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function persistStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function deleteStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function readStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_REFRESH_TOKEN_KEY);
}

export async function persistStoredRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, token);
}

export async function deleteStoredRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    // Key may already be absent
  }
}

export async function readStoredUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.phone !== 'string' ||
      typeof parsed.email !== 'string'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export async function persistStoredUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_KEY),
  ]);
}
