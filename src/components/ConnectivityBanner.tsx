import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack } from 'tamagui';
import { useConnectivityStore } from '../store/connectivityStore';
import { appColors } from '../theme/appTheme';

type ConnectivityBannerProps = {
  /** Refetch TanStack queries + bump station-load epoch elsewhere. */
  onRetry: () => void;
};

export function ConnectivityBanner({ onRetry }: ConnectivityBannerProps) {
  const insets = useSafeAreaInsets();
  const isOffline = useConnectivityStore((s) => s.isOffline);

  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  if (!isOffline) return null;

  const topPad = Math.max(insets.top, 8);

  return (
    <XStack
      style={[styles.banner, { paddingTop: topPad }]}
      items="center"
      justify="space-between"
      gap="$3"
    >
      <Text flex={1} color={appColors.textPrimary} fontSize="$3">
        You're offline — actions will resume when connectivity returns.
      </Text>
      <Pressable onPress={handleRetry} accessibilityRole="button" accessibilityLabel="Retry network">
        <Text color={appColors.accent} fontWeight="800">
          Retry
        </Text>
      </Pressable>
    </XStack>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: 'rgba(140, 40, 40, 0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    zIndex: 50,
  },
});
