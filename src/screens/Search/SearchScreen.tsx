import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QueueSheet } from '@/components/music/QueueSheet';
import { SongOptionsSheet } from '@/components/music/SongOptionsSheet';
import { useDebounce } from '@/hooks/useDebounce';
import { usePlayer } from '@/hooks/usePlayer';
import { AlbumItem, ArtistItem, searchAlbums, searchArtists, searchPlaylists, searchSongs } from '@/services/api/music.api';
import { usePlayerStore } from '@/store/player.store';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { PlaylistItem, Song } from '@/types/music.types';

type SearchFilter = 'Songs' | 'Playlists' | 'Albums' | 'Artists';
const SEARCH_FILTERS: SearchFilter[] = ['Songs', 'Playlists', 'Albums', 'Artists'];

type SortOption = 'Ascending' | 'Descending' | 'Artist' | 'Album' | 'Year' | 'Duration';
const SORT_OPTIONS: SortOption[] = ['Ascending', 'Descending', 'Artist', 'Album', 'Year', 'Duration'];

const formatSeconds = (secs: number) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// History entry: either a text query or a tapped song
type HistoryEntry =
  | { type: 'query'; text: string }
  | { type: 'song'; id: string; name: string; artist: string; imageUrl?: string };

const entryKey = (e: HistoryEntry) => (e.type === 'query' ? e.text : e.id);

export const SearchScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('Songs');

  const [songResults, setSongResults] = useState<Song[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistItem[]>([]);
  const [albumResults, setAlbumResults] = useState<AlbumItem[]>([]);
  const [playlistResults, setPlaylistResults] = useState<PlaylistItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('Ascending');
  const { playFromSearch } = usePlayer();

  // ─── Search history ──────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('search_history_v2').then((v) => {
      if (v) setHistory(JSON.parse(v));
    });
  }, []);

  const pushHistory = (entry: HistoryEntry) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => entryKey(e) !== entryKey(entry));
      const updated = [entry, ...filtered].slice(0, 12);
      AsyncStorage.setItem('search_history_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const removeHistory = (key: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => entryKey(e) !== key);
      AsyncStorage.setItem('search_history_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    AsyncStorage.removeItem('search_history_v2');
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

  // ─── Search based on active filter ─────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!debouncedQuery.trim()) {
        setSongResults([]);
        setArtistResults([]);
        setAlbumResults([]);
        setPlaylistResults([]);
        return;
      }
      try {
        setLoading(true);
        const q = debouncedQuery.trim();
        if (activeFilter === 'Songs') {
          const songs = await searchSongs(q);
          setSongResults(songs);
        } else if (activeFilter === 'Artists') {
          const artists = await searchArtists(q, 20);
          setArtistResults(artists);
        } else if (activeFilter === 'Albums') {
          const albums = await searchAlbums(q, 20);
          setAlbumResults(albums);
        } else if (activeFilter === 'Playlists') {
          const playlists = await searchPlaylists(q, 20);
          setPlaylistResults(playlists);
        }
      } catch (e) {
        console.warn('Search error', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debouncedQuery, activeFilter]);

  const sortedSongs = useMemo(() => {
    const data = [...songResults];
    switch (sortBy) {
      case 'Artist': return data.sort((a, b) => (a.primaryArtists || '').localeCompare(b.primaryArtists || ''));
      case 'Album': return data.sort((a, b) => (a.album?.name || '').localeCompare(b.album?.name || ''));
      case 'Year': return data.sort((a, b) => (b.year || '0').localeCompare(a.year || '0'));
      case 'Duration': return data.sort((a, b) => a.duration - b.duration);
      case 'Descending': return data.reverse();
      case 'Ascending':
      default: return data;
    }
  }, [songResults, sortBy]);

  const hasResults = sortedSongs.length > 0 || artistResults.length > 0 || albumResults.length > 0 || playlistResults.length > 0;

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
              onSubmitEditing={() => {
                const t = query.trim();
                if (t) pushHistory({ type: 'query', text: t });
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Filters / Chips */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {SEARCH_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === filter ? palette.primary : palette.backgroundSecondary,
                      borderColor: activeFilter === filter ? palette.primary : palette.border,
                    },
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[styles.filterChipText, { color: activeFilter === filter ? '#fff' : palette.text }]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Search History (shown when query is empty) ── */}
          {query.length === 0 && history.length > 0 && (
            <View style={[styles.historyCard, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: palette.text }]}>Recent</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={[styles.historyClear, { color: palette.primary }]}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {history.map((entry) => (
                <TouchableOpacity
                  key={entryKey(entry)}
                  style={[styles.historyRow, { borderBottomColor: palette.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (entry.type === 'query') {
                      setQuery(entry.text);
                    } else {
                      // Re-play the song
                      const fakeSong: Song = {
                        id: entry.id,
                        name: entry.name,
                        primaryArtists: entry.artist,
                        imageUrl: entry.imageUrl,
                        duration: 0,
                        year: '',
                        album: { id: '', name: '' },
                      };
                      playFromSearch([fakeSong], 0);
                    }
                  }}
                >
                  {/* Left icon: album art for songs, clock for queries */}
                  {entry.type === 'song' && entry.imageUrl ? (
                    <Image
                      source={{ uri: entry.imageUrl }}
                      style={styles.historyThumb}
                    />
                  ) : entry.type === 'song' ? (
                    <View style={[styles.historyThumb, { backgroundColor: palette.border, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="musical-notes" size={14} color={palette.textSecondary} />
                    </View>
                  ) : (
                    <Ionicons name="time-outline" size={16} color={palette.textSecondary} style={{ marginRight: 10 }} />
                  )}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.historyItem, { color: palette.text }]} numberOfLines={1}>
                      {entry.type === 'query' ? entry.text : entry.name}
                    </Text>
                    {entry.type === 'song' && (
                      <Text style={[{ fontSize: 11, marginTop: 1 }, { color: palette.textSecondary }]} numberOfLines={1}>
                        {entry.artist}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => { e.stopPropagation(); removeHistory(entryKey(entry)); }}
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
              {/* ── Artists List ── */}
              {activeFilter === 'Artists' && artistResults.length > 0 && (
                <View style={[styles.section, { paddingTop: 8 }]}>
                  {artistResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.verticalRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('Artist', {
                          artistId: item.id,
                          artistName: item.name,
                        })
                      }
                    >
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={[styles.verticalThumb, styles.roundThumb]} />
                      ) : (
                        <View style={[styles.verticalThumb, styles.roundThumb, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="person" size={24} color={palette.textSecondary} />
                        </View>
                      )}
                      <View style={styles.verticalInfo}>
                        <Text style={[styles.verticalName, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.verticalSub, { color: palette.textSecondary }]}>Artist</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Albums List ── */}
              {activeFilter === 'Albums' && albumResults.length > 0 && (
                <View style={[styles.section, { paddingTop: 8 }]}>
                  {albumResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.verticalRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('Album', {
                          albumId: item.id,
                          albumName: item.name,
                          albumImageUrl: item.imageUrl,
                        })
                      }
                    >
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.verticalThumb} />
                      ) : (
                        <View style={[styles.verticalThumb, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="albums" size={24} color={palette.textSecondary} />
                        </View>
                      )}
                      <View style={styles.verticalInfo}>
                        <Text style={[styles.verticalName, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.verticalSub, { color: palette.textSecondary }]}>
                          Album{item.artist ? ` • ${item.artist}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Playlists List ── */}
              {activeFilter === 'Playlists' && playlistResults.length > 0 && (
                <View style={[styles.section, { paddingTop: 8 }]}>
                  {playlistResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.verticalRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('OnlinePlaylist', {
                          playlistId: item.id,
                          playlistTitle: item.title,
                          playlistImageUrl: item.imageUrl,
                        })
                      }
                    >
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.verticalThumb} />
                      ) : (
                        <View style={[styles.verticalThumb, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="musical-notes" size={24} color={palette.textSecondary} />
                        </View>
                      )}
                      <View style={styles.verticalInfo}>
                        <Text style={[styles.verticalName, { color: palette.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.verticalSub, { color: palette.textSecondary }]} numberOfLines={1}>
                          {'Playlist'}{item.songCount ? ` • ${item.songCount} songs` : (item.subtitle ? ` • ${item.subtitle}` : '')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Songs List ── */}
              {activeFilter === 'Songs' && sortedSongs.length > 0 && (
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
                        // Save song to history
                        pushHistory({
                          type: 'song',
                          id: item.id,
                          name: item.name,
                          artist: item.primaryArtists || '',
                          imageUrl: item.imageUrl,
                        });
                        playFromSearch(sortedSongs, index);
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
        style={[styles.toast, { opacity: toastOpacity }]}
        pointerEvents="box-none"
      >
        <Ionicons name="checkmark-circle" size={18} color="#1DB954" />
        <Text style={styles.toastText} numberOfLines={1}>
          {toastMsg}
        </Text>
        <TouchableOpacity onPress={() => setQueueVisible(true)} style={styles.toastBtn}>
          <Text style={styles.toastBtnText}>View Queue</Text>
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

  // Filter Chips
  filterContainer: {
    paddingVertical: 6,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Section
  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },

  // Vertical Rows (Artists, Albums, Playlists)
  verticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  verticalThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  roundThumb: {
    borderRadius: 32,
  },
  verticalInfo: {
    flex: 1,
  },
  verticalName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  verticalSub: {
    fontSize: 13,
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

  // Toast – matches SongOptionsSheet dark pill
  toast: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14,
    elevation: 12, shadowColor: '#000',
    shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  toastText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff' },
  toastBtn: { paddingHorizontal: 4 },
  toastBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6B35' },

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
  historyThumb: { width: 38, height: 38, borderRadius: 6, marginRight: 10 },
});
