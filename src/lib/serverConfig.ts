export function getCentralServerUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_CENTRAL_SERVER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}
