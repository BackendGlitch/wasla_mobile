import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack } from 'tamagui';
import { useConnectivityStore } from '../store/connectivityStore';
import { appColors } from '../theme/appTheme';

type ConnectivityBannerProps = {
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
      <Text flex={1} color={appColors.textPrimary} fontSize="$3" fontWeight="500">
        You're offline — actions will resume when connectivity returns.
      </Text>
      <Pressable onPress={handleRetry} accessibilityRole="button" accessibilityLabel="Retry network">
        <Text color={appColors.accent} fontWeight="700" fontSize="$3">
          Retry
        </Text>
      </Pressable>
    </XStack>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(239, 68, 68, 0.12)',
    zIndex: 50,
  },
});
