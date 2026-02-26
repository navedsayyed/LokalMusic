import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

export const PlaylistScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={[styles.text, { color: palette.textSecondary }]}>
          Playlists UI will show your saved and queued playlists.
        </Text>
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
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});

