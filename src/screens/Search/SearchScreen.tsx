import React, { useEffect, useMemo, useState } from 'react';
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

type SearchTab = 'Suggested' | 'Songs' | 'Artists' | 'Albums';

type SortOption =
  | 'Ascending'
  | 'Descending'
  | 'Title'
  | 'Artist'
  | 'Duration';

const sortOptions: SortOption[] = [
  'Ascending',
  'Descending',
  'Title',
  'Artist',
  'Duration',
];

export const SearchScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('Suggested');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('Ascending');
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

  const sortedSongs = useMemo(() => {
    const data = [...results];
    switch (sortBy) {
      case 'Title':
        return data.sort((a, b) => a.name.localeCompare(b.name));
      case 'Artist':
        return data.sort((a, b) =>
          (a.primaryArtists || '').localeCompare(b.primaryArtists || ''),
        );
      case 'Duration':
        return data.sort((a, b) => a.duration - b.duration);
      case 'Descending':
        return data.reverse();
      case 'Ascending':
      default:
        return data;
    }
  }, [results, sortBy]);

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

      <View style={styles.tabsRow}>
        {(['Suggested', 'Songs', 'Artists', 'Albums'] as SearchTab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? palette.primary : palette.textSecondary },
                ]}>
                {tab}
              </Text>
              {active && (
                <View
                  style={[styles.tabIndicator, { backgroundColor: palette.primary }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <ActivityIndicator
          style={{ marginTop: 12 }}
          color={palette.primary}
        />
      )}

      {activeTab === 'Songs' && (
        <View style={styles.songsHeader}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
            {sortedSongs.length} songs
          </Text>
          <View>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortOpen((v) => !v)}>
              <Text
                style={{ color: palette.textSecondary, fontSize: 13 }}>
                {sortBy}
              </Text>
            </TouchableOpacity>
            {sortOpen && (
              <View
                style={[
                  styles.sortMenu,
                  { backgroundColor: palette.card, borderColor: palette.border },
                ]}>
                {sortOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.sortItem}
                    onPress={() => {
                      setSortBy(opt);
                      setSortOpen(false);
                    }}>
                    <Text
                      style={{
                        color:
                          sortBy === opt ? palette.primary : palette.textSecondary,
                        fontSize: 13,
                      }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {activeTab === 'Songs' && (
        <FlatList
          data={sortedSongs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => playFromSearch(sortedSongs, index)}>
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
      )}

      {activeTab !== 'Songs' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
            {activeTab} view coming soon
          </Text>
        </View>
      )}
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
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabIndicator: {
    marginTop: 4,
    height: 3,
    borderRadius: 999,
    width: '60%',
  },
  songsHeader: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 140,
  },
  sortItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

