# Observability (Sentry)

This app includes optional Sentry error reporting + breadcrumbs.

## Install

Use Expo's installer so it picks a compatible version:

```sh
npx expo install sentry-expo
```

## Configure

Set `EXPO_PUBLIC_SENTRY_DSN` in your `.env` (or in EAS secrets) to enable reporting:

```env
EXPO_PUBLIC_SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"
```

## What gets reported

- Breadcrumbs for central API base URL resolution (`resolveCentralServerUrl()`).
- Breadcrumbs + captured exception on API `401` (auth failures).

