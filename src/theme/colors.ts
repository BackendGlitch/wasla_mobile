// Wasla Brand Palette — "Refined Transit"
// Deep navy base with Mediterranean gold accents.
// Professional, high-contrast, accessible.

export const waslaColors = {
  // Primary — refined gold
  primary: '#D4A853',
  primaryLight: '#E8C97A',
  primaryDark: '#8B6914',

  // Backgrounds
  background: '#060B14',
  surface: '#0B1424',
  surfaceElevated: '#111D32',

  // Text
  textPrimary: '#F0F4FF',
  textSecondary: '#8899B4',
  textMuted: '#556580',

  // Borders
  border: 'rgba(212, 168, 83, 0.10)',
  borderStrong: 'rgba(212, 168, 83, 0.20)',

  // Accent
  accent: '#D4A853',
  accentSoft: 'rgba(212, 168, 83, 0.14)',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Base
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type WaslaColor = keyof typeof waslaColors;
