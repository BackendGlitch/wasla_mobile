export const authColors = {
  bg: '#0E0D0C',
  bgSoft: '#18130F',
  card: 'rgba(24, 18, 14, 0.88)',
  cardStrong: 'rgba(33, 24, 17, 0.94)',
  border: 'rgba(214, 141, 81, 0.22)',
  borderStrong: 'rgba(233, 171, 110, 0.38)',
  textPrimary: '#F2E3CB',
  textSecondary: '#D1B896',
  textMuted: '#A58D70',
  accent: '#D36B2B',
  accentSoft: 'rgba(211, 107, 43, 0.22)',
  accentBlue: '#89AFA0',
  accentViolet: '#A08468',
  warning: '#DFA05D',
  error: '#CD6B4D',
  success: '#9EBB78',
} as const;

export const authGradients = {
  teal: {
    start: '#0E0D0C',
    mid: '#2A1B12',
    end: '#0E0D0C',
    glowA: 'rgba(211, 107, 43, 0.34)',
    glowB: 'rgba(158, 187, 120, 0.24)',
  },
  violet: {
    start: '#0E0D0C',
    mid: '#2D1F15',
    end: '#0E0D0C',
    glowA: 'rgba(222, 129, 74, 0.3)',
    glowB: 'rgba(160, 132, 104, 0.25)',
  },
  amber: {
    start: '#0E0D0C',
    mid: '#312116',
    end: '#0E0D0C',
    glowA: 'rgba(225, 146, 78, 0.32)',
    glowB: 'rgba(158, 187, 120, 0.22)',
  },
} as const;

export type AuthGradient = keyof typeof authGradients;
