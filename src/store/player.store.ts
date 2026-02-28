import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Song } from '@/types/music.types';

export type RepeatMode = 'off' | 'one' | 'all';

// ── Fisher-Yates shuffle helper ──────────────────────────────────────────────
const shuffleArray = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// contextQueue : songs from the current "context" (search results, playlist…)
// userQueue    : songs manually added via "Add to Queue" / "Play Next"
//                → played before contextQueue songs (high priority)
// contextIndex : which song in contextQueue is current (ignored when userQueue active)
// ─────────────────────────────────────────────────────────────────────────────
type PlayerState = {
  contextQueue: Song[];
  userQueue: Song[];
  contextIndex: number;      // index into contextQueue (current or last played from context)
  isPlayingFromUser: boolean; // true while userQueue is the source
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  shuffle: boolean;
  shuffledContext: Song[];   // shuffled copy of contextQueue (used when shuffle=true)
  shuffledIndex: number;
  repeatMode: RepeatMode;
};

type PlayerActions = {
  // ── Playback setup ──────────────────────────────────────────────────────────
  setContextAndPlay: (songs: Song[], index: number) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (position: number, duration: number) => void;

  // ── Navigation ──────────────────────────────────────────────────────────────
  next: () => void;
  previous: () => void;

  // ── Queue management ────────────────────────────────────────────────────────
  enqueueNext: (song: Song) => void;    // plays immediately after current
  enqueueToEnd: (song: Song) => void;   // appends at end of userQueue
  removeFromUserQueue: (index: number) => void;
  reorderUserQueue: (from: number, to: number) => void;
  removeFromContext: (index: number) => void;
  reorderContext: (from: number, to: number) => void;
  clearUserQueue: () => void;

  // ── Shuffle / Repeat ────────────────────────────────────────────────────────
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  // ── Legacy compat ───────────────────────────────────────────────────────────
  // (audio.service.ts uses these)
  getCurrentSong: () => Song | null;
};

// ─────────────────────────────────────────────────────────────────────────────
const initialState: PlayerState = {
  contextQueue: [],
  userQueue: [],
  contextIndex: 0,
  isPlayingFromUser: false,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  shuffle: false,
  shuffledContext: [],
  shuffledIndex: 0,
  repeatMode: 'off',
};

// ─────────────────────────────────────────────────────────────────────────────
export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Helper ──────────────────────────────────────────────────────────────
      getCurrentSong: (): Song | null => {
        const { userQueue, isPlayingFromUser, contextQueue, contextIndex,
          shuffle, shuffledContext, shuffledIndex } = get();
        if (isPlayingFromUser && userQueue.length > 0) return userQueue[0];
        if (shuffle) return shuffledContext[shuffledIndex] ?? null;
        return contextQueue[contextIndex] ?? null;
      },

      // ────────────────────────────────────────────────────────────────────────
      // setContextAndPlay – called when user taps a song from Search / Playlist
      // Clears userQueue, sets context, resets shuffle order if needed
      // ────────────────────────────────────────────────────────────────────────
      setContextAndPlay: (songs, index) => {
        const { shuffle } = get();
        let shuffledContext: Song[] = [];
        let shuffledIndex = 0;
        if (shuffle) {
          // Put clicked song first, then shuffle the rest
          const rest = shuffleArray(songs.filter((_, i) => i !== index));
          shuffledContext = [songs[index], ...rest];
          shuffledIndex = 0;
        }
        set({
          contextQueue: songs,
          contextIndex: index,
          userQueue: [],
          isPlayingFromUser: false,
          isPlaying: false,
          positionMillis: 0,
          durationMillis: songs[index]?.duration ? songs[index].duration * 1000 : 0,
          shuffledContext,
          shuffledIndex,
        });
      },

      setPlaying: (playing) => set({ isPlaying: playing }),

      setPosition: (position, duration) =>
        set({ positionMillis: position, durationMillis: duration }),

      // ────────────────────────────────────────────────────────────────────────
      // next – Spotify logic:
      //   ① If already playing from userQueue → pop the finished song,
      //      then either play next userQueue song or fall back to context.
      //   ② If playing from context but userQueue has songs → switch to
      //      userQueue WITHOUT popping (getCurrentSong returns userQueue[0]).
      //   ③ Otherwise advance context normally.
      // ────────────────────────────────────────────────────────────────────────
      next: () => {
        const { userQueue, isPlayingFromUser, contextQueue, contextIndex, repeatMode,
          shuffle, shuffledContext, shuffledIndex } = get();

        if (repeatMode === 'one') {
          set({ positionMillis: 0 });
          return;
        }

        // Case ①: already playing from userQueue → finished song = userQueue[0], pop it
        if (isPlayingFromUser) {
          const remaining = userQueue.slice(1);
          if (remaining.length > 0) {
            // More user songs left
            set({ userQueue: remaining, isPlayingFromUser: true, positionMillis: 0, durationMillis: 0 });
          } else {
            // User queue exhausted → fall back to context
            set({ userQueue: [], isPlayingFromUser: false, positionMillis: 0 });
            // Advance context one step
            if (shuffle && shuffledContext.length > 0) {
              const nextIdx = shuffledIndex + 1;
              if (nextIdx >= shuffledContext.length) {
                if (repeatMode === 'all') {
                  const newShuffled = shuffleArray(contextQueue);
                  set({ shuffledContext: newShuffled, shuffledIndex: 0, positionMillis: 0 });
                } else { set({ isPlaying: false }); }
              } else {
                set({ shuffledIndex: nextIdx, positionMillis: 0 });
              }
            } else {
              const lastIndex = contextQueue.length - 1;
              if (contextIndex >= lastIndex) {
                if (repeatMode === 'all') { set({ contextIndex: 0, positionMillis: 0 }); }
                else { set({ isPlaying: false }); }
              } else {
                set({ contextIndex: contextIndex + 1, positionMillis: 0 });
              }
            }
          }
          return;
        }

        // Case ②: playing from context, but userQueue has songs → switch to userQueue
        // Do NOT pop – getCurrentSong() will return userQueue[0] as-is
        if (userQueue.length > 0) {
          set({ isPlayingFromUser: true, positionMillis: 0, durationMillis: 0 });
          return;
        }

        // Case ③: no userQueue, advance context normally
        set({ isPlayingFromUser: false });
        if (shuffle && shuffledContext.length > 0) {
          const nextIdx = shuffledIndex + 1;
          if (nextIdx >= shuffledContext.length) {
            if (repeatMode === 'all') {
              const newShuffled = shuffleArray(contextQueue);
              set({ shuffledContext: newShuffled, shuffledIndex: 0, positionMillis: 0 });
            } else { set({ isPlaying: false }); }
          } else {
            set({ shuffledIndex: nextIdx, positionMillis: 0 });
          }
          return;
        }
        const lastIndex = contextQueue.length - 1;
        if (contextIndex >= lastIndex) {
          if (repeatMode === 'all') { set({ contextIndex: 0, positionMillis: 0 }); }
          else { set({ isPlaying: false }); }
        } else {
          set({ contextIndex: contextIndex + 1, positionMillis: 0 });
        }
      },

      // ────────────────────────────────────────────────────────────────────────
      // previous – go back; if in shuffle walk back through shuffled order
      // ────────────────────────────────────────────────────────────────────────
      previous: () => {
        const { positionMillis, contextIndex, shuffle, shuffledIndex } = get();

        // Restart current if >3s in
        if (positionMillis > 3000) {
          set({ positionMillis: 0 });
          return;
        }

        set({ isPlayingFromUser: false });

        if (shuffle) {
          const prev = Math.max(0, shuffledIndex - 1);
          set({ shuffledIndex: prev, positionMillis: 0 });
          return;
        }

        set({ contextIndex: Math.max(0, contextIndex - 1), positionMillis: 0 });
      },

      // ────────────────────────────────────────────────────────────────────────
      // Enqueue operations
      // ────────────────────────────────────────────────────────────────────────
      enqueueNext: (song) =>
        set((state) => ({
          userQueue: [song, ...state.userQueue],
        })),

      enqueueToEnd: (song) =>
        set((state) => ({
          userQueue: [...state.userQueue, song],
        })),

      removeFromUserQueue: (index) =>
        set((state) => {
          const q = [...state.userQueue];
          q.splice(index, 1);
          return { userQueue: q };
        }),

      reorderUserQueue: (from, to) =>
        set((state) => {
          if (from === to) return state;
          const q = [...state.userQueue];
          const [item] = q.splice(from, 1);
          q.splice(to, 0, item);
          return { userQueue: q };
        }),

      removeFromContext: (index) =>
        set((state) => {
          if (index === state.contextIndex) return state; // can't remove now-playing
          const q = [...state.contextQueue];
          q.splice(index, 1);
          const idx = index < state.contextIndex ? state.contextIndex - 1 : state.contextIndex;
          return { contextQueue: q, contextIndex: idx };
        }),

      reorderContext: (from, to) =>
        set((state) => {
          if (from === to) return state;
          const q = [...state.contextQueue];
          const [item] = q.splice(from, 1);
          q.splice(to, 0, item);
          let idx = state.contextIndex;
          if (from === idx) idx = to;
          else if (from < idx && to >= idx) idx--;
          else if (from > idx && to <= idx) idx++;
          return { contextQueue: q, contextIndex: idx };
        }),

      clearUserQueue: () => set({ userQueue: [] }),

      // ────────────────────────────────────────────────────────────────────────
      // Shuffle
      // ────────────────────────────────────────────────────────────────────────
      toggleShuffle: () => {
        const { shuffle, contextQueue, contextIndex } = get();
        if (!shuffle) {
          const rest = shuffleArray(contextQueue.filter((_, i) => i !== contextIndex));
          const shuffledContext = [contextQueue[contextIndex], ...rest];
          set({ shuffle: true, shuffledContext, shuffledIndex: 0 });
        } else {
          set({ shuffle: false, shuffledContext: [], shuffledIndex: 0 });
        }
      },

      cycleRepeat: () =>
        set((state) => {
          const next: RepeatMode =
            state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off';
          return { repeatMode: next };
        }),
    }),
    {
      name: 'player-store-v3',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        contextQueue: state.contextQueue,
        userQueue: state.userQueue,
        contextIndex: state.contextIndex,
        shuffle: state.shuffle,
        repeatMode: state.repeatMode,
      }),
    },
  ),
);
