import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ConnectivityBanner } from '../src/components/ConnectivityBanner';
import { useConnectivityStore } from '../src/store/connectivityStore';

/**
 * Wrapped by `QueryClientProvider` so hooks like `useQueryClient` work.
 */
export function AppChrome() {
  const queryClient = useQueryClient();
  const bumpReconnectEpoch = useConnectivityStore((s) => s.bumpReconnectEpoch);

  const handleConnectivityRetry = useCallback(() => {
    bumpReconnectEpoch();
    void queryClient.invalidateQueries();
  }, [bumpReconnectEpoch, queryClient]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ConnectivityBanner onRetry={handleConnectivityRetry} />
      <Slot />
    </View>
  );
}
