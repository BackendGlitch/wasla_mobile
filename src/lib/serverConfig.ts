import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname);
}

function inferDevMachineHost(): string | null {
  const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (scriptUrl) {
    try {
      const url = new URL(scriptUrl);
      if (url.hostname && !isLoopbackHost(url.hostname)) return url.hostname;
    } catch {
      // ignore
    }
  }

  const candidates: unknown[] = [
    (Constants as any)?.expoConfig?.hostUri,
    (Constants as any)?.expoGoConfig?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.trim() === '') continue;
    const maybeHostPort = candidate.replace(/^https?:\/\//, '').split('/')[0] ?? '';
    const host = maybeHostPort.split(':')[0] ?? '';
    if (host && !isLoopbackHost(host)) return host;
  }

  return null;
}

export function getCentralServerUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_CENTRAL_SERVER_URL?.trim();
  if (!raw) return null;

  const cleaned = stripTrailingSlashes(raw);
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return cleaned;
  }

  if (isLoopbackHost(url.hostname) || url.hostname === ANDROID_EMULATOR_HOST) {
    const host = inferDevMachineHost();
    if (host) url.hostname = host;
  }

  if (Platform.OS === 'android' && isLoopbackHost(url.hostname)) {
    url.hostname = ANDROID_EMULATOR_HOST;
  }

  if (Platform.OS === 'ios' && url.hostname === ANDROID_EMULATOR_HOST) {
    url.hostname = 'localhost';
  }

  return stripTrailingSlashes(url.toString());
}
