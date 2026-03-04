import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';
import { waslaColors } from './src/theme/colors';

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...defaultConfig.tokens.color,
      // Wasla brand tokens available as $primary, $secondary, etc.
      primary: waslaColors.primary500,
      primaryLight: waslaColors.primary100,
      primaryDark: waslaColors.primary800,
      secondary: waslaColors.secondary500,
      secondaryLight: waslaColors.secondary100,
      secondaryDark: waslaColors.secondary800,
      accent: waslaColors.accent500,
      accentLight: waslaColors.accent200,
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
    light: {
      ...defaultConfig.themes.light,
      background: waslaColors.background,
      color: waslaColors.textPrimary,
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: '#0F1B1A',
      color: '#E0F7F6',
    },
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
