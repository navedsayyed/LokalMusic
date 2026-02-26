import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SongOptionsSheet } from "@/components/music/SongOptionsSheet";
import { usePlayer } from "@/hooks/usePlayer";
import { AlbumItem, ArtistItem, getTrendingSongs, searchAlbums, searchArtists } from "@/services/api/music.api";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";
import { Song } from "@/types/music.types";

// ─── Greeting ───────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ─── Sort helpers ───────────────────────────────────────────────────────────

type SortOption = "Ascending" | "Descending" | "Artist" | "Album" | "Year" | "Date Added" | "Date Modified" | "Composer";

const SORT_OPTIONS: SortOption[] = [
  "Ascending",
  "Descending",
  "Artist",
  "Album",
  "Year",
  "Date Added",
  "Date Modified",
  "Composer",
];

const formatSeconds = (secs: number) => {
  if (!secs) return "0:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// ─── Tabs ───────────────────────────────────────────────────────────────────

type HomeTab = "Suggested" | "Songs" | "Artists" | "Albums";
const TABS: HomeTab[] = ["Suggested", "Songs", "Artists", "Albums"];

// ─── Song row ────────────────────────────────────────────────────────────────

type Palette = typeof colors[keyof typeof colors];

const SongRow = React.memo(
  ({
    item,
    index,
    onPlay,
    onMore,
    palette,
  }: {
    item: Song;
    index: number;
    onPlay: () => void;
    onMore: () => void;
    palette: Palette;
  }) => (
    <TouchableOpacity style={styles.songRow} activeOpacity={0.7} onPress={onPlay}>
      {/* Album art */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.songThumb} />
      ) : (
        <View style={[styles.songThumb, { backgroundColor: palette.backgroundSecondary }]}>
          <Ionicons name="musical-notes" size={20} color={palette.textSecondary} />
        </View>
      )}

      {/* Text */}
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, { color: palette.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.songMeta, { color: palette.textSecondary }]} numberOfLines={1}>
          {item.primaryArtists}
          {item.duration ? `  |  ${formatSeconds(item.duration)} mins` : ""}
        </Text>
      </View>

      {/* Play button */}
      <TouchableOpacity
        onPress={onPlay}
        style={[styles.playCircle, { backgroundColor: palette.primary }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      {/* 3-dot menu */}
      <TouchableOpacity
        onPress={onMore}
        style={styles.moreBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={palette.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
);

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export const HomeScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const [activeTab, setActiveTab] = useState<HomeTab>("Suggested");
  const navigation = useNavigation<any>();

  // Songs/Artists/Albums tab state
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("Ascending");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { playFromSearch } = usePlayer();

  // Suggested tab state
  const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);
  const [suggestedArtists, setSuggestedArtists] = useState<ArtistItem[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  // Fetch Suggested tab data on mount
  useEffect(() => {
    setSuggestedLoading(true);
    Promise.all([
      getTrendingSongs("top hits 2024", 12),
      searchArtists("top global artists popular", 10),
    ]).then(([s, a]) => {
      setSuggestedSongs(s);
      setSuggestedArtists(a);
    }).catch(() => { }).finally(() => setSuggestedLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "Songs" && songs.length === 0) {
      setLoading(true);
      getTrendingSongs("top songs 2024", 30)
        .then(setSongs).catch(() => { }).finally(() => setLoading(false));
    }
    if (activeTab === "Artists" && artists.length === 0) {
      setLoading(true);
      searchArtists("top global artists popular", 15)
        .then(setArtists).catch(() => { }).finally(() => setLoading(false));
    }
    if (activeTab === "Albums" && albums.length === 0) {
      setLoading(true);
      searchAlbums("best albums 2024", 15)
        .then(setAlbums).catch(() => { }).finally(() => setLoading(false));
    }
  }, [activeTab]);

  const sortedSongs = useMemo(() => {
    const d = [...songs];
    switch (sortBy) {
      case "Artist": return d.sort((a, b) => (a.primaryArtists || "").localeCompare(b.primaryArtists || ""));
      case "Album": return d.sort((a, b) => (a.album?.name || "").localeCompare(b.album?.name || ""));
      case "Year": return d.sort((a, b) => (b.year || "0").localeCompare(a.year || "0"));
      case "Descending": return d.reverse();
      case "Ascending":
      default: return d;
    }
  }, [songs, sortBy]);

  const handlePlay = useCallback(
    (index: number) => {
      playFromSearch(sortedSongs, index);
      navigation.navigate("Player");
    },
    [sortedSongs, playFromSearch, navigation]
  );

  const handleMore = useCallback((song: Song) => {
    setSelectedSong(song);
    setOptionsVisible(true);
  }, []);

  // ── Render ──

  const renderSuggestedTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
      {suggestedLoading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
      ) : (
        <>
          {/* Quick-play 2-column grid (top 6 songs — like Spotify home) */}
          <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 12, marginBottom: 8 }]}>
            {getGreeting()} 👋
          </Text>
          <View style={styles.quickGrid}>
            {suggestedSongs.slice(0, 6).map((song, index) => (
              <TouchableOpacity
                key={song.id}
                style={[styles.quickCard, { backgroundColor: palette.backgroundSecondary }]}
                activeOpacity={0.75}
                onPress={() => { playFromSearch(suggestedSongs, index); navigation.navigate("Player"); }}
              >
                {song.imageUrl ? (
                  <Image source={{ uri: song.imageUrl }} style={styles.quickImg} />
                ) : (
                  <View style={[styles.quickImg, { backgroundColor: palette.border, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="musical-notes" size={18} color={palette.textSecondary} />
                  </View>
                )}
                <Text style={[styles.quickLabel, { color: palette.text }]} numberOfLines={2}>
                  {song.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Popular Artists */}
          {suggestedArtists.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Popular Artists</Text>
                <TouchableOpacity><Text style={[styles.seeAll, { color: palette.primary }]}>See All</Text></TouchableOpacity>
              </View>
              <FlatList
                data={suggestedArtists}
                keyExtractor={(i) => i.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.artistCard}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.artistImage} />
                    ) : (
                      <View style={[styles.artistImage, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={28} color={palette.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.artistName, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {/* Trending Now (remaining songs as horizontal cards) */}
          {suggestedSongs.length > 6 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Trending Now</Text>
                <TouchableOpacity><Text style={[styles.seeAll, { color: palette.primary }]}>See All</Text></TouchableOpacity>
              </View>
              <FlatList
                data={suggestedSongs.slice(6)}
                keyExtractor={(i) => i.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.albumCard}
                    onPress={() => { playFromSearch(suggestedSongs, index + 6); navigation.navigate("Player"); }}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.albumImage} />
                    ) : (
                      <View style={[styles.albumImage, { backgroundColor: palette.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="musical-notes" size={24} color={palette.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.albumTitle, { color: palette.text }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.albumArtist, { color: palette.textSecondary }]} numberOfLines={1}>{item.primaryArtists}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderSongsTab = () => (
    <View style={{ flex: 1 }}>
      {/* Songs header */}
      <View style={styles.songsHeader}>
        <Text style={[styles.songCount, { color: palette.textSecondary }]}>
          {loading ? "Loading..." : `${sortedSongs.length} songs`}
        </Text>
        {/* Sort button */}
        <View>
          <TouchableOpacity
            style={[styles.sortBtn, { borderColor: palette.border }]}
            onPress={() => setSortMenuVisible((v) => !v)}
          >
            <Text style={[styles.sortBtnText, { color: palette.primary }]}>{sortBy}</Text>
            <Ionicons name="swap-vertical" size={14} color={palette.primary} />
          </TouchableOpacity>

          {/* Sort Dropdown */}
          {sortMenuVisible && (
            <View style={[styles.sortMenu, { backgroundColor: palette.card, borderColor: palette.border }]}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.sortMenuItem}
                  onPress={() => { setSortBy(opt); setSortMenuVisible(false); }}
                >
                  <Text style={[styles.sortMenuText, { color: sortBy === opt ? palette.primary : palette.text }]}>
                    {opt}
                  </Text>
                  <View style={[styles.radioOuter, { borderColor: sortBy === opt ? palette.primary : palette.border }]}>
                    {sortBy === opt && <View style={[styles.radioInner, { backgroundColor: palette.primary }]} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={sortedSongs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SongRow
              item={item}
              index={index}
              onPlay={() => handlePlay(index)}
              onMore={() => handleMore(item)}
              palette={palette}
            />
          )}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderArtistsTab = () => (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: palette.backgroundSecondary }]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.gridCircle} />
              ) : (
                <View style={[styles.gridCircle, { backgroundColor: palette.border, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={36} color={palette.textSecondary} />
                </View>
              )}
              <Text style={[styles.gridLabel, { color: palette.text }]} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderAlbumsTab = () => (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: palette.backgroundSecondary }]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.gridSquare} />
              ) : (
                <View style={[styles.gridSquare, { backgroundColor: palette.border, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="albums" size={36} color={palette.textSecondary} />
                </View>
              )}
              <Text style={[styles.gridLabel, { color: palette.text }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.gridSub, { color: palette.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const tabContent = {
    Suggested: renderSuggestedTab,
    Songs: renderSongsTab,
    Artists: renderArtistsTab,
    Albums: renderAlbumsTab,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={["top"]}>
      <TouchableWithoutFeedback onPress={() => setSortMenuVisible(false)}>
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          {/* Song options bottom sheet – rendered at screen level so it's above FlatList */}
          <SongOptionsSheet
            visible={optionsVisible}
            song={selectedSong}
            onClose={() => setOptionsVisible(false)}
          />
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Ionicons name="musical-notes" size={22} color={palette.primary} />
              <Text style={[styles.logo, { color: palette.text }]}>Lokal</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Search")}
              style={[styles.iconBtn, { backgroundColor: palette.backgroundSecondary }]}
              accessibilityLabel="Open search"
            >
              <Ionicons name="search" size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <View style={[styles.tabsRow, { borderBottomColor: palette.border }]}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity key={tab} style={styles.tabBtn} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabLabel, { color: active ? palette.primary : palette.textSecondary }]}>
                    {tab}
                  </Text>
                  {active && <View style={[styles.tabIndicator, { backgroundColor: palette.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>{tabContent[activeTab]()}</View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 12,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { fontSize: 24, fontWeight: "700" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabLabel: { fontSize: 13, fontWeight: "500" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "60%",
    borderRadius: 999,
  },
  // Suggested
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: "600" },
  seeAll: { fontSize: 13, fontWeight: "500" },
  albumCard: { marginRight: 16, width: 120 },
  albumImage: { width: 120, height: 120, borderRadius: 14, marginBottom: 6 },
  albumTitle: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  albumArtist: { fontSize: 12, marginTop: 1 },
  artistCard: { alignItems: "center", marginRight: 20 },
  artistImage: { width: 72, height: 72, borderRadius: 36, marginBottom: 6 },
  artistName: { fontSize: 12, fontWeight: "500", textAlign: "center", maxWidth: 72 },
  // Songs tab
  songsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    zIndex: 20,
  },
  songCount: { fontSize: 13 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortBtnText: { fontSize: 13, fontWeight: "500" },
  sortMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 180,
    paddingVertical: 6,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortMenuText: { fontSize: 14 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  // Song row
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  songThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  songMeta: { fontSize: 12 },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtn: { paddingLeft: 4 },
  // Context menu
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuCard: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: { paddingHorizontal: 20, paddingVertical: 14 },
  menuItemText: { fontSize: 15 },
  // Coming soon
  comingSoon: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  comingSoonText: { fontSize: 14 },
  // Grid (Artists / Albums)
  gridCard: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
  },
  gridCircle: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 999,
    marginBottom: 8,
  },
  gridSquare: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    marginBottom: 8,
  },
  gridLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  gridSub: { fontSize: 11, textAlign: "center", marginTop: 2 },
  // Spotify-style quick-play grid
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    overflow: "hidden",
    width: "48%",
    height: 56,
  },
  quickImg: {
    width: 56,
    height: 56,
    borderRadius: 0,
  },
  quickLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    lineHeight: 17,
  },
});
