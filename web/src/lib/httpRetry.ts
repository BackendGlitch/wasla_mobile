import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

type RetryableMethod = 'get' | 'head' | 'options';

type RetryConfig = AxiosRequestConfig & {
  __waslaRetryCount?: number;
  __waslaMaxRetries?: number;
};

type AbortSignalLike = {
  aborted: boolean;
  addEventListener?: (
    type: 'abort',
    listener: () => void,
    options?: { once?: boolean },
  ) => void;
};

export type AxiosRetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number; // 0..1
};

const DEFAULT_RETRY_OPTIONS: AxiosRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 400,
  maxDelayMs: 5_000,
  jitterRatio: 0.25,
};

function isRetryableMethod(method: string | undefined): method is RetryableMethod {
  const normalized = (method ?? 'get').toLowerCase();
  return normalized === 'get' || normalized === 'head' || normalized === 'options';
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function shouldRetry(error: AxiosError, config: RetryConfig): boolean {
  if (config.signal?.aborted) return false;
  if (!isRetryableMethod(config.method)) return false;

  const status = error.response?.status;
  if (typeof status === 'number') return isTransientStatus(status);

  // Network errors (no response) or timeouts are retryable for idempotent requests.
  if (error.code === 'ECONNABORTED') return true;
  if (!error.response) return true;
  return false;
}

function computeDelayMs(attempt: number, options: AxiosRetryOptions): number {
  const exponential = Math.min(
    options.maxDelayMs,
    options.baseDelayMs * 2 ** Math.max(0, attempt - 1),
  );
  const jitter = exponential * options.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

function sleep(ms: number, signal?: AbortSignalLike): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => resolve(), ms);
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(timeoutId);
      reject(new Error('Request aborted'));
      return;
    }
    signal.addEventListener?.(
      'abort',
      () => {
        clearTimeout(timeoutId);
        reject(new Error('Request aborted'));
      },
      { once: true },
    );
  });
}

export function attachAxiosRetry(
  instance: AxiosInstance,
  options: Partial<AxiosRetryOptions> = {},
): void {
  const resolvedOptions: AxiosRetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const axiosError = error as AxiosError;
      const config = axiosError.config as RetryConfig | undefined;
      if (!config) return Promise.reject(error);

      const retryCount = config.__waslaRetryCount ?? 0;
      const maxForRequest =
        typeof config.__waslaMaxRetries === 'number'
          ? config.__waslaMaxRetries
          : resolvedOptions.maxRetries;
      if (retryCount >= maxForRequest) return Promise.reject(error);

      if (!shouldRetry(axiosError, config)) return Promise.reject(error);

      config.__waslaRetryCount = retryCount + 1;
      const delayMs = computeDelayMs(config.__waslaRetryCount, resolvedOptions);
      await sleep(delayMs, config.signal);
      return instance(config);
    },
  );
}
