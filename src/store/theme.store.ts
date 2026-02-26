import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ColorScheme } from '@/theme';

type ThemeState = {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setTheme: (scheme: ColorScheme) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorScheme: 'light',
      toggleTheme: () =>
        set((state) => ({
          colorScheme: state.colorScheme === 'light' ? 'dark' : 'light',
        })),
      setTheme: (scheme) => set({ colorScheme: scheme }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ colorScheme: state.colorScheme }),
    },
  ),
);


