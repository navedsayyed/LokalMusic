import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { usePlayerStore } from '@/store/player.store';
import { colors } from '@/theme/colors';
import { useThemeStore } from '@/store/theme.store';
import { togglePlayPause } from '@/services/player/audio.service';

export const MiniPlayer = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const { queue, currentIndex, isPlaying } = usePlayerStore();
  const navigation = useNavigation();

  const current = queue[currentIndex];
  if (!current) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('Player' as never)}
      style={[
        styles.container,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {current.name}
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]} numberOfLines={1}>
          {current.primaryArtists}
        </Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          togglePlayPause();
        }}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={palette.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

