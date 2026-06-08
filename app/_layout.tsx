import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider } from 'tamagui';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useFonts, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import tamaguiConfig from '../tamagui.config';
import { useAuthStore } from '../src/store';
import { disconnectCentralRealtime, initCentralRealtime } from '../src/lib/realtime';
import { readStoredToken, readStoredUser } from '../src/lib/sessionStorage';
import { initObservability, setUser as setObservabilityUser } from '../src/lib/observability';
import { useConnectivityStore } from '../src/store/connectivityStore';
import { SplashBootstrapLayer } from '../src/components/splash/SplashBootstrapLayer';
import { AppChrome } from './AppChrome';

// Keep splash visible while we check auth
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(8_000, 500 * 2 ** attemptIndex),
      staleTime: 5_000,
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

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

  const bootstrapDone = appReady && fontsLoaded;
  const splashFade = useRef(new Animated.Value(1)).current;
  const [splashLayerMounted, setSplashLayerMounted] = useState(true);

  useEffect(() => {
    initObservability();
  }, []);

  useEffect(() => {
    const apply = (state: NetInfoState) => {
      useConnectivityStore.getState().applyNetInfo(state);
    };
    const unsub = NetInfo.addEventListener(apply);
    void NetInfo.fetch().then(apply);
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storedToken, storedUser, onboarded] = await Promise.all([
          readStoredToken(),
          readStoredUser(),
          SecureStore.getItemAsync('has_onboarded'),
        ]);

        if (storedToken) {
          setToken(storedToken);
          setUser(storedUser);
          if (storedUser) {
            setObservabilityUser({
              id: storedUser.id,
              email: storedUser.email,
              username: storedUser.name,
            });
          }
        }
        if (onboarded === 'true') {
          setHasOnboarded(true);
        }
      } catch {
        // SecureStore may fail on web; ignore
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAppReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLoading, setToken, setUser, setHasOnboarded]);

  useEffect(() => {
    if (!bootstrapDone) return;
    let cancelled = false;
    void SplashScreen.hideAsync().then(() => {
      if (cancelled) return;
      Animated.timing(splashFade, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) setSplashLayerMounted(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrapDone, splashFade]);

  useEffect(() => {
    if (isLoading || !appReady || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!hasOnboarded) {
      if (!inOnboarding) {
        router.replace('/(onboarding)');
      }
    } else if (!token) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else {
      const finishingVerification = segments.includes('verify-email');
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
          {bootstrapDone ? <AppChrome /> : null}
          {splashLayerMounted ? (
            <SplashBootstrapLayer
              animatedOpacity={splashFade}
              pointerEvents={bootstrapDone ? 'none' : 'auto'}
            />
          ) : null}
        </TamaguiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
