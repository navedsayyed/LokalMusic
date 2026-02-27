import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QueueSheet } from '@/components/music/QueueSheet';
import { SongOptionsSheet } from '@/components/music/SongOptionsSheet';
import { useDebounce } from '@/hooks/useDebounce';
import { usePlayer } from '@/hooks/usePlayer';
import { ArtistItem, searchArtists, searchSongs } from '@/services/api/music.api';
import { usePlayerStore } from '@/store/player.store';
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
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<Song[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('Ascending');
  const { playFromSearch } = usePlayer();

  // ─── Search history ──────────────────────────────────────────────────────
  const [history, setHistory] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('search_history').then((v) => {
      if (v) setHistory(JSON.parse(v));
    });
  }, []);

  const pushHistory = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setHistory((prev) => {
      const updated = [t, ...prev.filter((x) => x !== t)].slice(0, 10);
      AsyncStorage.setItem('search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeHistory = (term: string) => {
    setHistory((prev) => {
      const updated = prev.filter((x) => x !== term);
      AsyncStorage.setItem('search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    AsyncStorage.removeItem('search_history');
  };

  // ─── Sheet / Queue state ────────────────────────────────────────────────────
  const [optionsSong, setOptionsSong] = useState<Song | null>(null);
  const [queueVisible, setQueueVisible] = useState(false);

  // ─── Toast state ────────────────────────────────────────────────────────────
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 3500);
  };

  // ─── Add-to-queue callbacks for SongOptionsSheet ───────────────────────────
  const handleAddToQueue = () => {
    if (!optionsSong) return;
    usePlayerStore.getState().enqueueToEnd(optionsSong);
    setOptionsSong(null);
    showToast(`"${optionsSong.name}" added to queue`);
  };

  const handlePlayNext = () => {
    if (!optionsSong) return;
    usePlayerStore.getState().enqueueNext(optionsSong);
    setOptionsSong(null);
    showToast(`"${optionsSong.name}" plays next`);
  };

  // ─── Search both songs & artists in parallel ─────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setArtistResults([]);
        return;
      }
      try {
        setLoading(true);
        const [songs, artists] = await Promise.all([
          searchSongs(debouncedQuery.trim()),
          searchArtists(debouncedQuery.trim(), 8),
        ]);
        setResults(songs);
        setArtistResults(artists);
        pushHistory(debouncedQuery.trim()); // ← save to history on each result
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

  const hasResults = sortedSongs.length > 0 || artistResults.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setSortOpen(false); }}>
        <View style={{ flex: 1 }}>
          {/* Page title */}
          <View style={styles.titleRow}>
            <Text style={[styles.pageTitle, { color: palette.text }]}>Search</Text>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
            <Ionicons name="search" size={18} color={palette.textSecondary} />
            <TextInput
              placeholder="Songs, artists, albums..."
              placeholderTextColor={palette.textSecondary}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { color: palette.text }]}
              returnKeyType="search"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Search History (shown when input is focused + empty) ── */}
          {inputFocused && query.length === 0 && history.length > 0 && (
            <View style={[styles.historyCard, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: palette.text }]}>Recent Searches</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={[styles.historyClear, { color: palette.primary }]}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {history.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.historyRow, { borderBottomColor: palette.border }]}
                  activeOpacity={0.7}
                  onPress={() => setQuery(item)}
                >
                  <Ionicons name="time-outline" size={16} color={palette.textSecondary} style={{ marginRight: 10 }} />
                  <Text style={[styles.historyItem, { color: palette.text }]} numberOfLines={1}>{item}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => removeHistory(item)}
                  >
                    <Ionicons name="close" size={16} color={palette.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loading && <ActivityIndicator style={{ marginTop: 32 }} color={palette.primary} />}



          {/* Empty state */}
          {!loading && !hasResults && query.length > 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={56} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No results for "{query}"</Text>
            </View>
          )}

          {/* ── Results list (artists + songs) ─────────────── */}
          {!loading && hasResults && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}
            >
              {/* ── Artists section ── */}
              {artistResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Artists</Text>
                  <FlatList
                    data={artistResults}
                    keyExtractor={(i) => i.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 8, paddingRight: 16, paddingLeft: 16 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.artistCard}
                        activeOpacity={0.75}
                        onPress={() =>
                          navigation.navigate('Artist', {
                            artistId: item.id,
                            artistName: item.name,
                          })
                        }
                      >
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} style={styles.artistAvatar} />
                        ) : (
                          <View style={[styles.artistAvatar, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="person" size={30} color={palette.textSecondary} />
                          </View>
                        )}
                        <Text style={[styles.artistName, { color: palette.text }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={[styles.artistLabel, { color: palette.textSecondary }]}>Artist</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* ── Songs section header + sort ── */}
              {sortedSongs.length > 0 && (
                <>
                  <View style={styles.songsHeader}>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>
                      Songs
                      <Text style={[styles.songCount, { color: palette.textSecondary }]}> · {sortedSongs.length}</Text>
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

                  {/* Song rows */}
                  {sortedSongs.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.songRow, { paddingHorizontal: 16 }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        playFromSearch(sortedSongs, index);
                        navigation.navigate('Player' as never);
                      }}
                    >
                      {/* Album art */}
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="musical-notes" size={20} color={palette.textSecondary} />
                        </View>
                      )}

                      {/* Song info */}
                      <View style={styles.songInfo}>
                        <Text style={[styles.songTitle, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.songMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                          {item.primaryArtists}
                          {item.duration ? `  |  ${formatSeconds(item.duration)} mins` : ''}
                        </Text>
                      </View>

                      {/* ⋮ three-dot button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSortOpen(false);
                          setOptionsSong(item);
                        }}
                        style={styles.dotBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={palette.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* ── Toast notification ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: palette.card, borderColor: palette.border, opacity: toastOpacity },
        ]}
        pointerEvents="box-none"
      >
        <Ionicons name="checkmark-circle" size={18} color={palette.primary} />
        <Text style={[styles.toastText, { color: palette.text }]} numberOfLines={1}>
          {toastMsg}
        </Text>
        <TouchableOpacity onPress={() => setQueueVisible(true)} style={styles.toastBtn}>
          <Text style={[styles.toastBtnText, { color: palette.primary }]}>View Queue</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── SongOptionsSheet ─────────────────────────────────────────────────── */}
      <SongOptionsSheet
        visible={!!optionsSong}
        song={optionsSong}
        onClose={() => setOptionsSong(null)}
        onAddToQueue={handleAddToQueue}
        onPlayNext={handlePlayNext}
      />

      {/* ── QueueSheet ───────────────────────────────────────────────────────── */}
      <QueueSheet visible={queueVisible} onClose={() => setQueueVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  titleRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 25, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15, margin: 0, padding: 0 },

  // Section
  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },

  // Artist cards
  artistCard: {
    width: 88,
    alignItems: 'center',
    marginRight: 12,
  },
  artistAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1a2340',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  artistLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },

  // Songs header
  songsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 20,
  },
  songCount: { fontSize: 16, fontWeight: '400' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  sortBtnText: { fontSize: 13, fontWeight: '500' },
  sortMenu: {
    position: 'absolute', top: 36, right: 0,
    borderRadius: 14, borderWidth: 1, minWidth: 180,
    paddingVertical: 6, zIndex: 999, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 9, height: 9, borderRadius: 5 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 80, paddingTop: 60 },
  emptyText: { fontSize: 14 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  songMeta: { fontSize: 12 },
  dotBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Toast
  toast: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
    elevation: 12, shadowColor: '#000',
    shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  toastText: { flex: 1, fontSize: 13, fontWeight: '500' },
  toastBtn: { paddingHorizontal: 4 },
  toastBtnText: { fontSize: 13, fontWeight: '700' },

  // Search history
  historyCard: {
    marginHorizontal: 16, marginTop: 6,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  historyTitle: { fontSize: 14, fontWeight: '700' },
  historyClear: { fontSize: 13, fontWeight: '500' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItem: { flex: 1, fontSize: 14 },
});
