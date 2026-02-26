import { getSongById } from '@/services/api/music.api';
import { usePlayerStore } from '@/store/player.store';
import * as ExpoAV from 'expo-av';
import { Audio, AVPlaybackStatus } from 'expo-av';

let sound: ExpoAV.Audio.Sound | null = null;
let isAudioConfigured = false;

const configureAudio = async () => {
  if (isAudioConfigured) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  isAudioConfigured = true;
};

const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  if (!status.isLoaded) return;
  const store = usePlayerStore.getState();
  store.setPosition(
    status.positionMillis,
    status.durationMillis ?? store.durationMillis,
  );
  if (status.didJustFinish && !status.isLooping) {
    // Auto-advance to next song
    store.next();
    // Small delay to let state settle
    setTimeout(() => {
      loadAndPlayCurrent();
    }, 300);
  }
};

export const loadAndPlayCurrent = async () => {
  const store = usePlayerStore.getState();
  let song = store.queue[store.currentIndex];

  if (!song) return;

  try {
    // Fetch detailed song info if no stream URL
    if (!song?.streamUrl) {
      const detailed = await getSongById(song.id);
      if (!detailed?.streamUrl) {
        console.warn('No stream URL available for song', song?.id);
        store.setPlaying(false);
        return;
      }
      const newQueue = [...store.queue];
      newQueue[store.currentIndex] = detailed;
      store.setQueueAndPlay(newQueue, store.currentIndex);
      song = detailed;
    }

    await configureAudio();

    // Unload previous sound
    if (sound) {
      sound.setOnPlaybackStatusUpdate(null);
      await sound.unloadAsync();
      sound = null;
    }

    store.setPlaying(false);

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: song.streamUrl! },
      { shouldPlay: true },
      onPlaybackStatusUpdate,
    );
    sound = newSound;
    store.setPlaying(true);
  } catch (e) {
    console.error('Error loading/playing audio', e);
    store.setPlaying(false);
  }
};

export const togglePlayPause = async () => {
  if (!sound) {
    await loadAndPlayCurrent();
    return;
  }
  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      await loadAndPlayCurrent();
      return;
    }
    if (status.isPlaying) {
      await sound.pauseAsync();
      usePlayerStore.getState().setPlaying(false);
    } else {
      await sound.playAsync();
      usePlayerStore.getState().setPlaying(true);
    }
  } catch (e) {
    console.error('togglePlayPause error', e);
  }
};

export const seekTo = async (positionMillis: number) => {
  if (!sound) return;
  try {
    await sound.setPositionAsync(Math.max(0, positionMillis));
  } catch (e) {
    console.error('seekTo error', e);
  }
};

export const getCurrentSound = () => sound;
