import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { colors, ColorScheme } from './colors';

export const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.light.primary,
    background: colors.light.background,
    card: colors.light.card,
    text: colors.light.text,
    border: colors.light.border,
    notification: colors.light.primary,
  },
};

export const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.dark.primary,
    background: colors.dark.background,
    card: colors.dark.card,
    text: colors.dark.text,
    border: colors.dark.border,
    notification: colors.dark.primary,
  },
};

export type { ColorScheme };
export { colors };

