/**
 * Wasla Brand Color Tokens
 * Primary: Teal/Cyan — modern transport feel
 * Secondary: Deep indigo for contrast
 * Accent: Warm amber for CTAs
 */

export const waslaColors = {
  // Primary — Teal
  primary50: '#E0F7F6',
  primary100: '#B3ECE8',
  primary200: '#80E0D9',
  primary300: '#4DD4CA',
  primary400: '#26CABE',
  primary500: '#00C1B3', // ← main brand color
  primary600: '#00B0A3',
  primary700: '#009B8F',
  primary800: '#00877C',
  primary900: '#00655D',

  // Secondary — Indigo
  secondary50: '#E8EAF6',
  secondary100: '#C5CAE9',
  secondary200: '#9FA8DA',
  secondary300: '#7986CB',
  secondary400: '#5C6BC0',
  secondary500: '#3F51B5',
  secondary600: '#3949AB',
  secondary700: '#303F9F',
  secondary800: '#283593',
  secondary900: '#1A237E',

  // Accent — Amber
  accent50: '#FFF8E1',
  accent100: '#FFECB3',
  accent200: '#FFE082',
  accent300: '#FFD54F',
  accent400: '#FFCA28',
  accent500: '#FFC107',
  accent600: '#FFB300',
  accent700: '#FFA000',
  accent800: '#FF8F00',
  accent900: '#FF6F00',

  // Neutrals
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Semantic
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8FFFE',
  surface: '#FFFFFF',
  textPrimary: '#1B1B1F',
  textSecondary: '#5F5F67',
  textMuted: '#9E9E9E',
  border: '#E0E0E0',
} as const;

export type WaslaColor = keyof typeof waslaColors;
