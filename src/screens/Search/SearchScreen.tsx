import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { searchSongs } from '@/services/api/music.api';
import { Song } from '@/types/music.types';
import { usePlayer } from '@/hooks/usePlayer';
import { useDebounce } from '@/hooks/useDebounce';

export const SearchScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const { playFromSearch } = usePlayer();

  useEffect(() => {
    const run = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        const songs = await searchSongs(debouncedQuery.trim());
        setResults(songs);
      } catch (e) {
        // basic fallback – in real app log error
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debouncedQuery]);

  return (
    <ScreenContainer>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: palette.backgroundSecondary,
            borderColor: palette.border,
          },
        ]}>
        <TextInput
          placeholder="Search songs, artists..."
          placeholderTextColor={palette.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={[styles.input, { color: palette.text }]}
        />
      </View>
      {loading && (
        <ActivityIndicator
          style={{ marginTop: 12 }}
          color={palette.primary}
        />
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => playFromSearch(results, index)}>
            <View style={styles.rowText}>
              <Text
                style={[styles.title, { color: palette.text }]}
                numberOfLines={1}>
                {item.name}
              </Text>
              <Text
                style={[styles.subtitle, { color: palette.textSecondary }]}
                numberOfLines={1}>
                {item.primaryArtists}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingTop: 16 }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  input: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});

