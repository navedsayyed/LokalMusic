import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DownloadQuality } from '@/types/music.types';

export type EQPreset = 'normal' | 'bassBoost' | 'pop' | 'rock' | 'classical';

type SettingsState = {
  userName: string;
  streamQuality: DownloadQuality;
  eqPreset: EQPreset;
  language: 'en';
};

type SettingsActions = {
  setUserName: (name: string) => void;
  setStreamQuality: (q: DownloadQuality) => void;
  setEQPreset: (preset: EQPreset) => void;
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      userName: 'Lokal User',
      streamQuality: '320kbps',
      eqPreset: 'normal',
      language: 'en',
      setUserName: (userName) => set({ userName }),
      setStreamQuality: (streamQuality) => set({ streamQuality }),
      setEQPreset: (eqPreset) => set({ eqPreset }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

