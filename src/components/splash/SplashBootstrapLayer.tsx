import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../BrandLogo';
import { appColors } from '../../theme/appTheme';

export const SPLASH_BACKGROUND = appColors.bg;

const { width: WINDOW_WIDTH } = Dimensions.get('window');

function logoSizeForSplash() {
  return Math.min(160, Math.round(WINDOW_WIDTH * 0.40));
}

export function SplashBootstrapContent() {
  const size = logoSizeForSplash();
  return (
    <View style={styles.content}>
      <BrandLogo size={size} />
      <Text style={styles.wordmark}>WASLA</Text>
      <Text style={styles.tagline}>Shared rides · Tunisia</Text>
      <View style={styles.rule} />
    </View>
  );
}

type SplashBootstrapLayerProps = {
  animatedOpacity: Animated.Value;
  pointerEvents: 'auto' | 'none';
};

export function SplashBootstrapLayer({ animatedOpacity, pointerEvents }: SplashBootstrapLayerProps) {
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[styles.layer, { opacity: animatedOpacity }]}
    >
      <SplashBootstrapContent />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100_000,
    backgroundColor: SPLASH_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    marginTop: 24,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 6,
    color: appColors.textPrimary,
  },
  tagline: {
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 0.5,
    color: appColors.textMuted,
  },
  rule: {
    marginTop: 24,
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: appColors.accent,
  },
});
