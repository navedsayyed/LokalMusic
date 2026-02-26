import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  enqueueNext: (song: Song) => void;
  enqueueToEnd: (song: Song) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  removeFromQueue: (index: number) => void;
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
        const { queue, currentIndex, repeatMode, shuffle } = get();
        if (queue.length === 0) return;
        if (repeatMode === 'one') {
          set({ positionMillis: 0 });
          return;
        }
        if (shuffle && queue.length > 1) {
          // Pick a random index different from current
          let rand = Math.floor(Math.random() * queue.length);
          if (rand === currentIndex) rand = (rand + 1) % queue.length;
          set({ currentIndex: rand, positionMillis: 0 });
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
      enqueueNext: (song: Song) =>
        set((state) => {
          if (!song) return state;
          const newQueue = [...state.queue];
          const insertIndex = Math.min(state.currentIndex + 1, newQueue.length);
          newQueue.splice(insertIndex, 0, song);
          return { queue: newQueue };
        }),
      enqueueToEnd: (song: Song) =>
        set((state) => {
          if (!song) return state;
          return { queue: [...state.queue, song] };
        }),
      reorderQueue: (fromIndex: number, toIndex: number) =>
        set((state) => {
          if (fromIndex === toIndex) return state;
          const queue = [...state.queue];
          const [removed] = queue.splice(fromIndex, 1);
          queue.splice(toIndex, 0, removed);
          // Adjust currentIndex if the current song moved or items around it moved
          let idx = state.currentIndex;
          if (fromIndex === idx) {
            idx = toIndex;
          } else if (fromIndex < idx && toIndex >= idx) {
            idx--;
          } else if (fromIndex > idx && toIndex <= idx) {
            idx++;
          }
          return { queue, currentIndex: idx };
        }),
      removeFromQueue: (index: number) =>
        set((state) => {
          if (index === state.currentIndex) return state; // can't remove now-playing
          const queue = [...state.queue];
          queue.splice(index, 1);
          const idx = index < state.currentIndex ? state.currentIndex - 1 : state.currentIndex;
          return { queue, currentIndex: idx };
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


