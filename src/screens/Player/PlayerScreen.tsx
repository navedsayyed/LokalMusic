import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { usePlayerStore } from '@/store/player.store';
import { togglePlayPause, seekTo, loadAndPlayCurrent } from '@/services/player/audio.service';

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const PlayerScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const {
    queue,
    currentIndex,
    isPlaying,
    positionMillis,
    durationMillis,
    next,
    previous,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = usePlayerStore();

  const current = queue[currentIndex];

  if (!current) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: palette.textSecondary }}>No song selected</Text>
        </View>
      </ScreenContainer>
    );
  }

  const progress =
    durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;

  return (
    <ScreenContainer>
      {current.imageUrl ? (
        <Image
          source={{ uri: current.imageUrl }}
          style={styles.albumArt}
        />
      ) : (
        <View style={styles.albumArtPlaceholder} />
      )}
      <View style={{ marginTop: 24 }}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {current.name}
        </Text>
        <Text
          style={[styles.subtitle, { color: palette.textSecondary }]}
          numberOfLines={1}>
          {current.primaryArtists}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress * 100}%`, backgroundColor: palette.primary },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            {formatTime(positionMillis)}
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            {formatTime(durationMillis || current.duration * 1000)}
          </Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={toggleShuffle}>
          <Ionicons
            name="shuffle"
            size={22}
            color={shuffle ? palette.primary : palette.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            previous();
            loadAndPlayCurrent();
          }}>
          <Ionicons
            name="play-skip-back"
            size={28}
            color={palette.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: palette.primary }]}
          onPress={() => togglePlayPause()}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={30}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            next();
            loadAndPlayCurrent();
          }}>
          <Ionicons
            name="play-skip-forward"
            size={28}
            color={palette.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={cycleRepeat}>
          <Ionicons
            name={
              repeatMode === 'one'
                ? 'repeat-once'
                : 'repeat'
            }
            size={22}
            color={
              repeatMode === 'off' ? palette.textSecondary : palette.primary
            }
          />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="list" size={20} color={palette.text} />
          <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>
            Add to queue
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="albums" size={20} color={palette.text} />
          <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>
            Add to playlist
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="document-text" size={20} color={palette.text} />
          <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>
            Lyrics
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArt: {
    marginTop: 24,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 24,
  },
  albumArtPlaceholder: {
    marginTop: 24,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 24,
    backgroundColor: '#1F2933',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 32,
  },
  progressBarBackground: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 999,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  controlsRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
  },
});

