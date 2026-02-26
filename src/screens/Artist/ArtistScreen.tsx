import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';

import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

type ArtistRouteParams = {
  artistId?: string;
  artistName: string;
};

export const ArtistScreen = () => {
  const { params } = useRoute<RouteProp<Record<string, ArtistRouteParams>, string>>();
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>
        {params?.artistName ?? 'Artist'}
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        ID: {params?.artistId ?? 'unknown'}
      </Text>
      <Text style={[styles.helper, { color: palette.textSecondary }]}>
        Artist detail screen stub. Here you could fetch top tracks and albums for this artist.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  helper: {
    marginTop: 16,
    fontSize: 13,
  },
});

