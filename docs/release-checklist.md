# Release checklist

## Env / config validation

- `EXPO_PUBLIC_CENTRAL_SERVER_URL` is set to an absolute `http(s)` URL.
  - Android emulator + dev: `http://localhost:PORT` should resolve to `http://10.0.2.2:PORT`.
  - iOS simulator + dev: `http://10.0.2.2:PORT` should resolve back to `http://localhost:PORT`.
- If using Sentry, `EXPO_PUBLIC_SENTRY_DSN` is set (see `docs/observability.md`). Optional dev uploads: `EXPO_PUBLIC_SENTRY_DEV=true`.
- iOS + **HTTP dev** servers: set `EXPO_PUBLIC_ALLOW_INSECURE_HTTP=true` so `app.config.js` merges `NSAllowsArbitraryLoads`. Production builds should use HTTPS and leave this unset.
- Auth/session model is documented in `docs/auth-sessions.md` (no refresh API yet).

## Smoke tests

- Unit tests + Maestro-ID drift check:
  - `pnpm run test:unit`
  - `pnpm run verify:maestro-ids`
- E2E (Maestro): login → stations → booking:
  - Set env vars `WASLA_TEST_EMAIL` and `WASLA_TEST_PASSWORD` for a test account.
  - Run `maestro test .maestro/smoke_login_booking.yaml`

## Pre-build checks

- Verify the app can load stations and routes from the configured backend.
- Verify realtime indicator shows `Live` when the socket is connected and `Disconnected` when offline.
- Verify forced logout works (token expiry / `401`).

