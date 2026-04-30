# Release checklist

## Env / config validation

- `EXPO_PUBLIC_CENTRAL_SERVER_URL` is set to an absolute `http(s)` URL.
  - Android emulator + dev: `http://localhost:PORT` should resolve to `http://10.0.2.2:PORT`.
  - iOS simulator + dev: `http://10.0.2.2:PORT` should resolve back to `http://localhost:PORT`.
- If using Sentry, `EXPO_PUBLIC_SENTRY_DSN` is set (see `docs/observability.md`).
- iOS + HTTP dev servers: confirm ATS config matches your needs (`app.json` `ios.infoPlist.NSAppTransportSecurity`).

## Smoke tests

- Unit tests (server URL resolution):
  - `node node_modules/typescript/bin/tsc -p tsconfig.unit.json`
  - `node --test test/*.test.cjs`
- E2E (Maestro): login → stations → booking:
  - Set env vars `WASLA_TEST_EMAIL` and `WASLA_TEST_PASSWORD` for a test account.
  - Run `maestro test .maestro/smoke_login_booking.yaml`

## Pre-build checks

- Verify the app can load stations and routes from the configured backend.
- Verify realtime indicator shows `Live` when the socket is connected and `Disconnected` when offline.
- Verify forced logout works (token expiry / `401`).

