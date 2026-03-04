import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import tamaguiConfig from '../tamagui.config';
import { useAuthStore } from '../src/store';

// Keep splash visible while we check auth
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { token, hasOnboarded, isLoading, setToken, setHasOnboarded, setLoading, setUser } =
    useAuthStore();
  const [appReady, setAppReady] = useState(false);

  // ── Bootstrap: check stored token + onboarding flag ──
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const onboarded = await SecureStore.getItemAsync('has_onboarded');

        if (storedToken) {
          setToken(storedToken);
          setUser({
            id: 'usr_001',
            name: 'Ahmed Ben Ali',
            phone: '+216 XX XXX XXX',
            email: 'ahmed@wasla.tn',
          });
        }
        if (onboarded === 'true') {
          setHasOnboarded(true);
        }
      } catch {
        // SecureStore may fail on web; ignore
      } finally {
        setLoading(false);
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  // ── Route guard: redirect based on auth state ──
  useEffect(() => {
    if (isLoading || !appReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!hasOnboarded) {
      // Not onboarded → send to welcome
      if (!inOnboarding) {
        router.replace('/(onboarding)');
      }
    } else if (!token) {
      // No token → auth
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else {
      // Authenticated → app
      if (!inAppGroup) {
        router.replace('/(app)');
      }
    }
  }, [token, hasOnboarded, isLoading, appReady, segments]);

  if (!appReady) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <StatusBar style="dark" />
      <Slot />
    </TamaguiProvider>
  );
}
