import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { YStack } from 'tamagui';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Pattern,
  Rect,
  Stop,
  Circle as SvgCircle,
} from 'react-native-svg';
import { authColors, authGradients, type AuthGradient } from '../../theme/authTheme';

type AuthBackdropProps = {
  children: ReactNode;
  variant?: AuthGradient;
};

export default function AuthBackdrop({ children, variant = 'teal' }: AuthBackdropProps) {
  const palette = authGradients[variant];
  const drift = useRef(new Animated.Value(0)).current;
  const driftAlt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const driftAltLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAlt, {
          toValue: 1,
          duration: 22000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(driftAlt, {
          toValue: 0,
          duration: 22000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    driftLoop.start();
    driftAltLoop.start();

    return () => {
      driftLoop.stop();
      driftAltLoop.stop();
    };
  }, [drift, driftAlt]);

  const driftStyle = {
    opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.55] }),
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
    ],
  } as const;

  const driftAltStyle = {
    opacity: driftAlt.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.5] }),
    transform: [
      { translateX: driftAlt.interpolate({ inputRange: [0, 1], outputRange: [16, -16] }) },
      { translateY: driftAlt.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }) },
    ],
  } as const;

  return (
    <YStack flex={1} bg={authColors.bg} position="relative" overflow="hidden">
      <Svg
        height="100%"
        width="100%"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="auth-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.start} />
            <Stop offset="0.5" stopColor={palette.mid} />
            <Stop offset="1" stopColor={palette.end} />
          </LinearGradient>
          <RadialGradient id="auth-glow-a" cx="85%" cy="15%" r="60%">
            <Stop offset="0" stopColor={palette.glowA} stopOpacity="0.8" />
            <Stop offset="0.35" stopColor={palette.glowA} stopOpacity="0.35" />
            <Stop offset="1" stopColor={palette.start} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="auth-glow-b" cx="10%" cy="85%" r="65%">
            <Stop offset="0" stopColor={palette.glowB} stopOpacity="0.7" />
            <Stop offset="0.4" stopColor={palette.glowB} stopOpacity="0.25" />
            <Stop offset="1" stopColor={palette.end} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="auth-sheen" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.08" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.04" />
          </LinearGradient>
          <LinearGradient id="auth-band" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.45" stopColor={palette.glowA} stopOpacity="0.14" />
            <Stop offset="0.55" stopColor={palette.glowB} stopOpacity="0.1" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
          <Pattern id="auth-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <Rect x="0" y="0" width="26" height="26" fill="rgba(0,0,0,0)" />
            <Rect x="0" y="0" width="26" height="1" fill="rgba(222, 150, 95, 0.16)" />
            <Rect x="0" y="0" width="1" height="26" fill="rgba(222, 150, 95, 0.16)" />
            <SvgCircle cx="3" cy="3" r="0.9" fill="rgba(241, 206, 171, 0.22)" />
          </Pattern>
          <RadialGradient id="auth-vignette" cx="50%" cy="45%" r="75%">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.6" stopColor="#000000" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.65" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auth-bg)" />
        <Rect width="100%" height="100%" fill="url(#auth-glow-a)" />
        <Rect width="100%" height="100%" fill="url(#auth-glow-b)" />
        <Rect y="25%" width="100%" height="50%" fill="url(#auth-band)" />
        <Rect width="100%" height="100%" fill="url(#auth-sheen)" />
        <Rect width="100%" height="100%" fill="url(#auth-grid)" opacity={0.5} />
        <Rect width="100%" height="100%" fill="url(#auth-vignette)" />
      </Svg>

      <Animated.View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: palette.glowA,
            top: -140,
            right: -120,
          },
          driftStyle,
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: palette.glowB,
            bottom: -150,
            left: -140,
          },
          driftAltStyle,
        ]}
        pointerEvents="none"
      />

      {children}
    </YStack>
  );
}

const styles = StyleSheet.create({
  ambientGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
  },
});
