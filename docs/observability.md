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

Optional: send events during local development testing:

```env
EXPO_PUBLIC_SENTRY_DEV="true"
```

## What gets reported

- Breadcrumbs for central API base URL resolution (`resolveCentralServerUrl()`).
- Breadcrumbs (not captured errors) on API `401` — see [`src/lib/api.ts`](../src/lib/api.ts).

## Releases + source maps

On init we set **`release`** to `{expo.slug}@{expo.version}` (e.g. `wasla_mobile@1.0.0`) and **`dist`** from Expo `nativeBuildVersion` or platform build fields when available (`src/lib/observability.ts`).

For actionable stack traces on native builds:

- Configure your EAS/Sentry workflow to upload source maps per build (follow [Expo Sentry docs](https://docs.expo.dev/guides/using-sentry/)).

## `beforeSend` noise filters

Dropped events:

- Axios `401` responses and `ERR_CANCELED`
- Exceptions whose messages look like benign session/abort flows (`Session expired.`, `Request aborted`)
