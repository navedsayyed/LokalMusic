import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDebounce } from '@/hooks/useDebounce';
import { usePlayer } from '@/hooks/usePlayer';
import { searchSongs } from '@/services/api/music.api';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { Song } from '@/types/music.types';

type SortOption = 'Ascending' | 'Descending' | 'Artist' | 'Album' | 'Year' | 'Duration';
const SORT_OPTIONS: SortOption[] = ['Ascending', 'Descending', 'Artist', 'Album', 'Year', 'Duration'];

const formatSeconds = (secs: number) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SearchScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const navigation = useNavigation();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
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
        console.warn('Search error', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debouncedQuery]);

  const sortedSongs = useMemo(() => {
    const data = [...results];
    switch (sortBy) {
      case 'Artist': return data.sort((a, b) => (a.primaryArtists || '').localeCompare(b.primaryArtists || ''));
      case 'Album': return data.sort((a, b) => (a.album?.name || '').localeCompare(b.album?.name || ''));
      case 'Year': return data.sort((a, b) => (b.year || '0').localeCompare(a.year || '0'));
      case 'Duration': return data.sort((a, b) => a.duration - b.duration);
      case 'Descending': return data.reverse();
      case 'Ascending':
      default: return data;
    }
  }, [results, sortBy]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setSortOpen(false); }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </TouchableOpacity>
            <View style={[styles.searchBar, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
              <Ionicons name="search" size={18} color={palette.textSecondary} />
              <TextInput
                placeholder="Search songs, artists..."
                placeholderTextColor={palette.textSecondary}
                value={query}
                onChangeText={setQuery}
                style={[styles.input, { color: palette.text }]}
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results count + sort */}
          {results.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultCount, { color: palette.textSecondary }]}>
                {sortedSongs.length} songs
              </Text>
              <View>
                <TouchableOpacity
                  style={[styles.sortBtn, { borderColor: palette.border }]}
                  onPress={() => setSortOpen((v) => !v)}
                >
                  <Text style={[styles.sortBtnText, { color: palette.primary }]}>{sortBy}</Text>
                  <Ionicons name="swap-vertical" size={14} color={palette.primary} />
                </TouchableOpacity>

                {sortOpen && (
                  <View style={[styles.sortMenu, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    {SORT_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.sortItem}
                        onPress={() => { setSortBy(opt); setSortOpen(false); }}
                      >
                        <Text style={{ color: sortBy === opt ? palette.primary : palette.text, fontSize: 14 }}>{opt}</Text>
                        <View style={[styles.radioOuter, { borderColor: sortBy === opt ? palette.primary : palette.border }]}>
                          {sortBy === opt && <View style={[styles.radioInner, { backgroundColor: palette.primary }]} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {loading && <ActivityIndicator style={{ marginTop: 32 }} color={palette.primary} />}

          {/* Empty state */}
          {!loading && results.length === 0 && query.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={56} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Search for songs, artists...</Text>
            </View>
          )}

          {!loading && results.length === 0 && query.length > 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={56} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No results for "{query}"</Text>
            </View>
          )}

          {/* Song list */}
          <FlatList
            data={sortedSongs}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.songRow}
                activeOpacity={0.7}
                onPress={() => {
                  playFromSearch(sortedSongs, index);
                  navigation.navigate('Player' as never);
                }}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="musical-notes" size={20} color={palette.textSecondary} />
                  </View>
                )}
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.songMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                    {item.primaryArtists}
                    {item.duration ? `  |  ${formatSeconds(item.duration)} mins` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    playFromSearch(sortedSongs, index);
                    navigation.navigate('Player' as never);
                  }}
                  style={[styles.playCircle, { backgroundColor: palette.primary }]}
                >
                  <Ionicons name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, margin: 0, padding: 0 },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 20,
  },
  resultCount: { fontSize: 13 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortBtnText: { fontSize: 13, fontWeight: '500' },
  sortMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 180,
    paddingVertical: 6,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 80 },
  emptyText: { fontSize: 14 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  songMeta: { fontSize: 12 },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
