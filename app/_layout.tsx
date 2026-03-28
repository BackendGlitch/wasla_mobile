import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import tamaguiConfig from '../tamagui.config';
import { useAuthStore } from '../src/store';
import { disconnectCentralRealtime, initCentralRealtime } from '../src/lib/realtime';

// Keep splash visible while we check auth
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { token, hasOnboarded, isLoading, setToken, setHasOnboarded, setLoading, setUser } =
    useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

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
      }
    })();
  }, []);

  useEffect(() => {
    if (appReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [appReady, fontsLoaded]);

  // ── Route guard: redirect based on auth state ──
  useEffect(() => {
    if (isLoading || !appReady || !fontsLoaded) return;

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
      // Authenticated → app, but allow OTP / email verification while token is already issued
      const finishingVerification =
        segments.includes('otp') || segments.includes('verify-email');
      if (!inAppGroup && !finishingVerification) {
        router.replace('/(app)');
      }
    }
  }, [token, hasOnboarded, isLoading, appReady, segments, fontsLoaded]);

  useEffect(() => {
    if (!appReady || !fontsLoaded) return;

    initCentralRealtime();
    return () => {
      disconnectCentralRealtime();
    };
  }, [appReady, fontsLoaded]);

  if (!appReady || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
        <StatusBar style="light" />
        <Slot />
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
