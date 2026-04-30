import { Platform } from 'react-native';
import type { CentralServerUrlResolution } from './serverConfigCore';
import { resolveCentralServerUrlCore } from './serverConfigCore';

export function resolveCentralServerUrl(): CentralServerUrlResolution {
  return resolveCentralServerUrlCore({
    raw: process.env.EXPO_PUBLIC_CENTRAL_SERVER_URL ?? null,
    platformOS: Platform.OS,
    isDev: __DEV__,
  });
}

export function getCentralServerUrl(): string | null {
  return resolveCentralServerUrl().url;
}
