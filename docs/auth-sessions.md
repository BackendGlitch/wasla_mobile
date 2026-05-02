# Auth sessions (mobile + central-server)

The central-server issues **short-lived JWT access tokens** (`JWT_ACCESS_EXPIRES_IN`, e.g. `1h`) plus **opaque refresh tokens** stored as SHA-256 hashes (`refresh_tokens` table, TTL **`JWT_REFRESH_EXPIRES_DAYS`**, default 30).

## Backend contract

### `POST /auth/verify-otp`

Body: `{ email?, phone?, otp }`.

Response JSON includes:

- `access_token`
- **`refresh_token`** (opaque string — store securely)
- **`expires_in`** (access TTL in seconds)
- **`user`** (public fields)

### `POST /auth/refresh`

Body: `{ refresh_token }` (required).

Successful response matches the verify shape (new access token + **new refresh token**). The submitted refresh token is **consumed** (rotation); callers must persist the newly issued `refresh_token` for the next rotation.

Unauthorized (e.g. unknown or reused refresh token) → **401**.

## Mobile behaviour

1. **Storage:** access (`AUTH_TOKEN_KEY`) and refresh (`AUTH_REFRESH_TOKEN_KEY`) in Expo Secure Store — see [`sessionStorage.ts`](../src/lib/sessionStorage.ts). Refresh is replaced after each successful rotation; session clear removes both (`clearStoredSession`).
2. **After login / OTP:** [`finishAuthAndNavigate()`](../src/lib/postAuthFlow.ts) persists `refresh_token` from the auth response when present.
3. **Proactive rotation:** [`getValidStoredToken()`](../src/lib/authLifecycle.ts) (Bearer injection on [`api`](../src/lib/api.ts)) detects JWT expiry (`exp`, ~30s skew in [`tokenExpiry.ts`](../src/lib/tokenExpiry.ts)) and runs [`tryRotationRefresh()`](../src/lib/authLifecycle.ts) (`authApi.exchangeRefreshToken`) before logging out as `token_expired`.
4. **Reactive 401:** [`api`](../src/lib/api.ts) response interceptor retries once after a successful rotation; otherwise `forceLogout('unauthorized')` (breadcrumb behaviour in [`observability.md`](observability.md)).

## Operators

Apply DB migrations after pulling backend changes (`pnpm run db:migrate`) so **`refresh_tokens`** exists.
