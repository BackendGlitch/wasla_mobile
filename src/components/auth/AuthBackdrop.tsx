import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { YStack } from 'tamagui';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { authColors } from '../../theme/authTheme';

type AuthBackdropProps = {
  children: ReactNode;
  /** Kept for backward compatibility — all variants render the same refined backdrop now. */
  variant?: string;
};

export default function AuthBackdrop({ children }: AuthBackdropProps) {
  return (
    <YStack flex={1} bg={authColors.bg} position="relative" overflow="hidden">
      {/* Subtle radial glow — refined, not gaudy */}
      <Svg
        height="100%"
        width="100%"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="auth-glow" cx="50%" cy="30%" r="70%">
            <Stop offset="0" stopColor="rgba(212, 168, 83, 0.04)" stopOpacity="1" />
            <Stop offset="0.5" stopColor="rgba(212, 168, 83, 0.02)" stopOpacity="1" />
            <Stop offset="1" stopColor={authColors.bg} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={authColors.bg} />
        <Rect width="100%" height="100%" fill="url(#auth-glow)" />
      </Svg>

      {/* Subtle grain texture overlay */}
      <View style={styles.grain} pointerEvents="none" />

      {children}
    </YStack>
  );
}

const styles = StyleSheet.create({
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    // Creates a subtle noise texture via many tiny dots
    // Rendered as a pseudo-grain background
    backgroundColor: 'transparent',
  },
});
