export const authColors = {
  bg: '#0B0F16',
  bgSoft: '#101725',
  card: 'rgba(13, 18, 28, 0.78)',
  cardStrong: 'rgba(14, 20, 34, 0.9)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  textPrimary: '#F5F7FF',
  textSecondary: '#B9C2D3',
  textMuted: '#7E889B',
  accent: '#38F6B1',
  accentSoft: 'rgba(56, 246, 177, 0.16)',
  accentBlue: '#4CC9FF',
  accentViolet: '#8B6DFF',
  warning: '#FFB347',
  error: '#FF5C7A',
  success: '#2EF2B5',
} as const;

export const authGradients = {
  teal: {
    start: '#0B0F16',
    mid: '#0D1524',
    end: '#0B0F16',
    glowA: 'rgba(56, 246, 177, 0.32)',
    glowB: 'rgba(76, 201, 255, 0.25)',
  },
  violet: {
    start: '#0B0F16',
    mid: '#14122B',
    end: '#0B0F16',
    glowA: 'rgba(139, 109, 255, 0.3)',
    glowB: 'rgba(76, 201, 255, 0.2)',
  },
  amber: {
    start: '#0B0F16',
    mid: '#1C1410',
    end: '#0B0F16',
    glowA: 'rgba(255, 179, 71, 0.26)',
    glowB: 'rgba(56, 246, 177, 0.18)',
  },
} as const;

export type AuthGradient = keyof typeof authGradients;
