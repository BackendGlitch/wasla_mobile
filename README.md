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
