# wasla_mobile

Mobile app starter for Wasla, built with Expo + React Native.

This setup is intentionally minimal in app code, but opinionated in tooling so interns can focus on product features.

## Preferred stack and why

- `tamagui` + `@tamagui/config` + `@tamagui/lucide-icons`
  Why: modern look, strong theming/tokens, reusable UI primitives, better visual ceiling than basic default UI.
- `@tanstack/react-query` + `axios`
  Why: reliable async state, caching, retries, and predictable API layer.
- `zustand`
  Why: lightweight global state without boilerplate.
- `react-hook-form` + `zod` + `@hookform/resolvers`
  Why: fast forms with strict validation and clear type safety.
- `react-native-reanimated` + `moti` + `@gorhom/bottom-sheet`
  Why: smooth, premium interactions for mobile UX patterns.
- `socket.io-client`
  Why: real-time booking updates from backend sockets.
- `expo-camera` + `react-native-qrcode-svg`
  Why: QR scanning and ticket QR rendering.
- `expo-web-browser` + `react-native-webview`
  Why: payment redirect/checkout flows.
- `expo-secure-store`
  Why: secure token/session storage on device.
- `expo-notifications`
  Why: booking/ticket push notifications.
- `dayjs`
  Why: simple date/time handling for ETD and schedule logic.


## Run

```bash
pnpm run start
pnpm run android
pnpm run ios
pnpm run web
```

If Metro cache causes stale warnings:

```bash
pnpm run start -- --clear
```

## Central Server Realtime (Socket.IO)

The app initializes a persistent Socket.IO connection to the central backend once the app bootstraps.

Environment:
- `EXPO_PUBLIC_CENTRAL_SERVER_URL` (default: `http://10.0.2.2:4000` for Android emulator)

Connection details:
- Socket.IO namespace: `/realtime`
- Events in: `ping`
- Events out: `ready`, `pong`

To verify locally:
1. Start the backend: `pnpm -C central-server start:dev`
2. Start the app: `pnpm -C wasla_mobile start`
3. Confirm the app connects and receives `ready`, then `pong` (the app sends `ping` automatically after `ready`).

Note for interns:
- Android emulator: use `http://10.0.2.2:4000` (or override `EXPO_PUBLIC_CENTRAL_SERVER_URL`).
- Physical device: replace with the dev machine LAN IP (or use an Expo tunnel), because `localhost` points to the phone itself.

Connection state is available via `useRealtimeStore` (`status`, `lastReadyAt`, `lastPongAt`, `lastPong`, `lastError`).
