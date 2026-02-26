import { Audio, AVPlaybackStatus } from 'expo-av';
import * as ExpoAV from 'expo-av';
import { usePlayerStore } from '@/store/player.store';
import { getSongById } from '@/services/api/music.api';

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
  store.setPosition(status.positionMillis, status.durationMillis ?? store.durationMillis);
  if (status.didJustFinish && !status.isLooping) {
    store.next();
  }
};

export const loadAndPlayCurrent = async () => {
  const store = usePlayerStore.getState();
  let song = store.queue[store.currentIndex];

  try {
    if (!song?.streamUrl) {
      const detailed = await getSongById(song.id);
      if (!detailed?.streamUrl) {
        console.warn('No stream URL available for song', song?.id);
        return;
      }
      // update queue with enriched song
      const newQueue = [...store.queue];
      newQueue[store.currentIndex] = detailed;
      store.setQueueAndPlay(newQueue, store.currentIndex);
      song = detailed;
    }

    await configureAudio();

    if (sound) {
      await sound.unloadAsync();
      sound.setOnPlaybackStatusUpdate(null);
      sound = null;
    }

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
  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return;
  if (status.isPlaying) {
    await sound.pauseAsync();
    usePlayerStore.getState().setPlaying(false);
  } else {
    await sound.playAsync();
    usePlayerStore.getState().setPlaying(true);
  }
};

export const seekTo = async (positionMillis: number) => {
  if (!sound) return;
  await sound.setPositionAsync(positionMillis);
};

