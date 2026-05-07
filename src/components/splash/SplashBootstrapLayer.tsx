import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../BrandLogo';

/** Must match `expo.splash.backgroundColor` in app.json */
export const SPLASH_BACKGROUND = '#141210';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

function logoSizeForSplash() {
  return Math.min(176, Math.round(WINDOW_WIDTH * 0.46));
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
    marginTop: 22,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 5,
    color: '#C4A882',
  },
  tagline: {
    marginTop: 10,
    fontSize: 12,
    letterSpacing: 0.4,
    color: '#7A6854',
  },
  rule: {
    marginTop: 28,
    width: 56,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(214, 140, 72, 0.45)',
  },
});
