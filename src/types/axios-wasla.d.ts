import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Per-request cap for transport-level retries (POST/PUT should use `0`). */
    __waslaMaxRetries?: number;
    __waslaRetryCount?: number;
  }
}
