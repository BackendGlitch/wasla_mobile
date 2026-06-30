const HARDCODED_URL = 'https://backend.wasla.fun';

export function getCentralServerUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CENTRAL_SERVER_URL?.trim() || HARDCODED_URL;
  return raw.replace(/\/+$/, '');
}
