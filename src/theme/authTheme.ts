// Auth theme — login, register, onboarding screens
// Refined dark backdrop with subtle gold warmth.

export const authColors = {
  bg: '#060B14',
  bgSoft: '#0A1225',

  card: 'rgba(17, 29, 50, 0.88)',
  cardStrong: 'rgba(22, 38, 64, 0.94)',

  border: 'rgba(212, 168, 83, 0.10)',
  borderStrong: 'rgba(212, 168, 83, 0.20)',

  textPrimary: '#F0F4FF',
  textSecondary: '#8899B4',
  textMuted: '#556580',

  accent: '#D4A853',
  accentSoft: 'rgba(212, 168, 83, 0.14)',

  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
} as const;

// Single refined backdrop — no more variant switching
export const authGradients = {
  default: {
    bg: '#060B14',
    mid: '#0D1A2D',
    glow: 'rgba(212, 168, 83, 0.06)',
  },
} as const;

export type AuthGradient = keyof typeof authGradients;
