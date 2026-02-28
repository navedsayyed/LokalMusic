import { loadAndPlayCurrent } from '@/services/player/audio.service';
import { usePlayerStore } from '@/store/player.store';
import { Song } from '@/types/music.types';
import { useCallback } from 'react';

export const usePlayer = () => {
  const state = usePlayerStore();

  /**
   * Play a song from a context list (search results, playlist, etc.)
   * Clears the user queue and sets the entire list as context.
   */
  const playFromSearch = useCallback(
    async (songs: Song[], index: number) => {
      state.setContextAndPlay(songs, index);
      await loadAndPlayCurrent();
    },
    [state],
  );

  return {
    ...state,
    playFromSearch,
  };
};
