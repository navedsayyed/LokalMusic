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
    store.next();
    setTimeout(() => { loadAndPlayCurrent(); }, 300);
  }
};

export const loadAndPlayCurrent = async () => {
  const store = usePlayerStore.getState();

  // ── Use new dual-queue getCurrentSong helper ──────────────────────────────
  let song = store.getCurrentSong();
  if (!song) return;

  try {
    // Fetch stream URL if missing
    if (!song.streamUrl) {
      const detailed = await getSongById(song.id);
      if (!detailed?.streamUrl) {
        console.warn('No stream URL for', song.id);
        store.setPlaying(false);
        return;
      }
      song = {
        ...detailed,
        primaryArtists: detailed.primaryArtists || song.primaryArtists,
        name: detailed.name || song.name,
        imageUrl: detailed.imageUrl || song.imageUrl,
      };

      // Patch stream URL into the correct queue slot
      const s = usePlayerStore.getState();
      if (s.isPlayingFromUser && s.userQueue.length > 0) {
        // Patch userQueue[0]
        const uq = [...s.userQueue];
        uq[0] = song;
        store.setPosition(0, song.duration ? song.duration * 1000 : 0);
      } else {
        // Patch contextQueue at contextIndex
        const cq = [...s.contextQueue];
        cq[s.contextIndex] = song;
        // Re-set with patched queue (keep index, wipe userQueue to avoid recursion)
        usePlayerStore.setState({ contextQueue: cq });
      }
    }

    await configureAudio();

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
    console.error('Audio load error', e);
    store.setPlaying(false);
  }
};

export const togglePlayPause = async () => {
  if (!sound) { await loadAndPlayCurrent(); return; }
  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) { await loadAndPlayCurrent(); return; }
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
  try { await sound.setPositionAsync(Math.max(0, positionMillis)); }
  catch (e) { console.error('seekTo error', e); }
};

export const getCurrentSound = () => sound;
