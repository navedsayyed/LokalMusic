export const colors = {
  light: {
    primary: '#FF8A00',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F7',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    tabInactive: '#9CA3AF',
  },
  dark: {
    primary: '#FF8A00',
    background: '#050816',
    backgroundSecondary: '#0B1220',
    card: '#111827',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#1F2937',
    tabInactive: '#6B7280',
  },
} as const;

export type ColorScheme = keyof typeof colors;

