import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    __waslaRetryCount?: number;
    __waslaMaxRetries?: number;
    __waslaRetryAfterRefresh?: boolean;
  }
}
