import { defaultConfig } from '@tamagui/config/v5';
import { createFont, createTamagui } from 'tamagui';
import { waslaColors } from './src/theme/colors';

const soraFace = {
  400: { normal: 'Sora_400Regular' },
  500: { normal: 'Sora_500Medium' },
  600: { normal: 'Sora_600SemiBold' },
  700: { normal: 'Sora_700Bold' },
};

const soraBody = createFont({
  family: 'Sora_400Regular',
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  weight: { 1: '400', 4: '500', 6: '600', 7: '700' },
  face: soraFace,
});

const soraHeading = createFont({
  family: 'Sora_400Regular',
  size: defaultConfig.fonts.heading.size,
  lineHeight: defaultConfig.fonts.heading.lineHeight,
  letterSpacing: defaultConfig.fonts.heading.letterSpacing,
  weight: { 6: '600', 7: '700', 8: '700', 9: '700' },
  face: soraFace,
});

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  fonts: { ...defaultConfig.fonts, body: soraBody, heading: soraHeading },
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...(defaultConfig.tokens as any).color,
      primary: waslaColors.primary,
      primaryLight: waslaColors.primaryLight,
      primaryDark: waslaColors.primaryDark,
      accent: waslaColors.accent,
      success: waslaColors.success,
      warning: waslaColors.warning,
      error: waslaColors.error,
      info: waslaColors.info,
      background: waslaColors.background,
      surface: waslaColors.surface,
      textPrimary: waslaColors.textPrimary,
      textSecondary: waslaColors.textSecondary,
      textMuted: waslaColors.textMuted,
      border: waslaColors.border,
    },
  },
  themes: {
    ...defaultConfig.themes,
    dark: {
      ...defaultConfig.themes.dark,
      background: waslaColors.background,
      color: waslaColors.textPrimary,
    },
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
