import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Song } from '@/types/music.types';

export type RepeatMode = 'off' | 'one' | 'all';

type PlayerState = {
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
};

type PlayerActions = {
  setQueueAndPlay: (songs: Song[], index: number) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (position: number, duration: number) => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const initialState: PlayerState = {
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  shuffle: false,
  repeatMode: 'off',
};

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setQueueAndPlay: (songs, index) =>
        set({
          queue: songs,
          currentIndex: index,
          isPlaying: false,
          positionMillis: 0,
          durationMillis: songs[index]?.duration ? songs[index].duration * 1000 : 0,
        }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setPosition: (position, duration) =>
        set({
          positionMillis: position,
          durationMillis: duration,
        }),
      next: () => {
        const { queue, currentIndex, repeatMode } = get();
        if (queue.length === 0) return;
        if (repeatMode === 'one') {
          set({ positionMillis: 0 });
          return;
        }
        const lastIndex = queue.length - 1;
        if (currentIndex === lastIndex) {
          if (repeatMode === 'all') {
            set({ currentIndex: 0, positionMillis: 0 });
          } else {
            set({ isPlaying: false });
          }
        } else {
          set({ currentIndex: currentIndex + 1, positionMillis: 0 });
        }
      },
      previous: () => {
        const { currentIndex } = get();
        if (currentIndex === 0) {
          set({ positionMillis: 0 });
        } else {
          set({ currentIndex: currentIndex - 1, positionMillis: 0 });
        }
      },
      toggleShuffle: () =>
        set((state) => ({
          shuffle: !state.shuffle,
        })),
      cycleRepeat: () =>
        set((state) => {
          const next: RepeatMode =
            state.repeatMode === 'off'
              ? 'all'
              : state.repeatMode === 'all'
              ? 'one'
              : 'off';
          return { repeatMode: next };
        }),
    }),
    {
      name: 'player-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        shuffle: state.shuffle,
        repeatMode: state.repeatMode,
      }),
    },
  ),
);


