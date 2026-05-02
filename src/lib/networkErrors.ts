import { isAxiosError } from 'axios';

export type NetworkErrorKind =
  | 'offline'
  | 'timeout'
  | 'server'
  | 'unauthorized'
  | 'cancelled'
  | 'unknown';

export type NetworkErrorInfo = {
  kind: NetworkErrorKind;
  status: number | null;
  message: string;
};

export function toNetworkErrorInfo(error: unknown): NetworkErrorInfo {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return { kind: 'cancelled', status: null, message: 'Request cancelled.' };
    }

    if (error.code === 'ECONNABORTED') {
      return { kind: 'timeout', status: null, message: 'Request timed out.' };
    }

    const status = error.response?.status ?? null;
    if (status === 401) {
      return { kind: 'unauthorized', status, message: 'Your session has expired.' };
    }

    if (typeof status === 'number') {
      return { kind: 'server', status, message: `Server returned HTTP ${status}.` };
    }

    // No response -> likely offline / DNS / blocked.
    if (!error.response) {
      const msg = String(error.message ?? '').toLowerCase();
      const looksOffline =
        error.code === 'ERR_NETWORK' ||
        msg.includes('network error') ||
        msg.includes('internet') ||
        msg.includes('offline');
      return {
        kind: looksOffline ? 'offline' : 'unknown',
        status: null,
        message: looksOffline ? 'You appear to be offline.' : (error.message || 'Network error.'),
      };
    }

    return { kind: 'unknown', status: null, message: error.message || 'Request failed.' };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('aborted') || msg.includes('cancel')) {
      return { kind: 'cancelled', status: null, message: 'Request cancelled.' };
    }
    return { kind: 'unknown', status: null, message: error.message };
  }

  return { kind: 'unknown', status: null, message: 'Something went wrong.' };
}

export function toUserFacingErrorCopy(
  error: unknown,
  fallback: string,
): { title: string; detail: string | null } {
  const info = toNetworkErrorInfo(error);
  if (info.kind === 'cancelled') return { title: fallback, detail: null };

  if (info.kind === 'offline') {
    return {
      title: 'You’re offline',
      detail: 'Check your connection and try again.',
    };
  }

  if (info.kind === 'timeout') {
    return {
      title: 'Request timed out',
      detail: 'Please try again in a moment.',
    };
  }

  if (info.kind === 'unauthorized') {
    return {
      title: 'Session expired',
      detail: 'Please sign in again.',
    };
  }

  if (info.kind === 'server') {
    return {
      title: fallback,
      detail: info.status ? `HTTP ${info.status}.` : null,
    };
  }

  return { title: fallback, detail: info.message || null };
}

