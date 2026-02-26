import { useCallback } from 'react';
import { usePlayerStore } from '@/store/player.store';
import { Song } from '@/types/music.types';
import { loadAndPlayCurrent } from '@/services/player/audio.service';

export const usePlayer = () => {
  const state = usePlayerStore();

  const playFromSearch = useCallback(
    async (songs: Song[], index: number) => {
      state.setQueueAndPlay(songs, index);
      await loadAndPlayCurrent();
    },
    [state],
  );

  return {
    ...state,
    playFromSearch,
  };
};


