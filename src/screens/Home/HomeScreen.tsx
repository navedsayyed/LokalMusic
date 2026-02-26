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
import { getTrendingSongs } from "@/services/api/music.api";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";
import { Song } from "@/types/music.types";

// ─── Mock data for Suggested tab ───────────────────────────────────────────

const RECENTLY_PLAYED: { id: string; title: string; artist: string; image: string }[] = [
  {
    id: "r1",
    title: "Shades of Love",
    artist: "Ania Szarm...",
    image: "https://c.saavncdn.com/584/Jab-Harry-Met-Sejal-Hindi-2017-20170803161007-500x500.jpg",
  },
  {
    id: "r2",
    title: "Without You",
    artist: "The Kid LAROI",
    image: "https://c.saavncdn.com/830/Without-You-English-2021-20210618141520-500x500.jpg",
  },
  {
    id: "r3",
    title: "Save Your Tears",
    artist: "The Weeknd",
    image: "https://c.saavncdn.com/161/Save-Your-Tears-English-2020-20201017050136-500x500.jpg",
  },
];

const ARTISTS: { id: string; name: string; image: string }[] = [
  {
    id: "459320",
    name: "Ariana Grande",
    image: "https://c.saavncdn.com/artists/Ariana_Grande_20230516082612_500x500.jpg",
  },
  {
    id: "weeknd",
    name: "The Weeknd",
    image: "https://c.saavncdn.com/artists/The_Weeknd_500x500.jpg",
  },
  {
    id: "acidrap",
    name: "Acidrap",
    image: "https://c.saavncdn.com/artists/Arijit_Singh_005_20241021173209_500x500.jpg",
  },
];

const MOST_PLAYED: { id: string; title: string; artist: string; image: string }[] = [
  {
    id: "m1",
    title: "Starboy",
    artist: "The Weeknd",
    image: "https://c.saavncdn.com/161/Save-Your-Tears-English-2020-20201017050136-500x500.jpg",
  },
  {
    id: "m2",
    title: "Disaster",
    artist: "Conan Gray",
    image: "https://c.saavncdn.com/430/Aashiqui-2-Hindi-2013-500x500.jpg",
  },
  {
    id: "m3",
    title: "HANDSOME",
    artist: "Warren Hue",
    image: "https://c.saavncdn.com/584/Jab-Harry-Met-Sejal-Hindi-2017-20170803161007-500x500.jpg",
  },
];

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

  // Songs tab state
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("Ascending");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  // Options sheet state (lifted here so it's outside FlatList)
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { playFromSearch } = usePlayer();

  // Fetch songs when Songs tab is first opened
  useEffect(() => {
    if (activeTab === "Songs" && songs.length === 0) {
      setLoading(true);
      getTrendingSongs("top hindi songs 2024", 30)
        .then(setSongs)
        .catch(() => { })
        .finally(() => setLoading(false));
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
      {/* Recently Played */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recently Played</Text>
        <TouchableOpacity><Text style={[styles.seeAll, { color: palette.primary }]}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        data={RECENTLY_PLAYED}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10, paddingRight: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.albumCard}>
            <Image source={{ uri: item.image }} style={styles.albumImage} />
            <Text style={[styles.albumTitle, { color: palette.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.albumArtist, { color: palette.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Artists */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Artists</Text>
        <TouchableOpacity><Text style={[styles.seeAll, { color: palette.primary }]}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        data={ARTISTS}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10, paddingRight: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.artistCard}>
            <Image source={{ uri: item.image }} style={styles.artistImage} />
            <Text style={[styles.artistName, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Most Played */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Most Played</Text>
        <TouchableOpacity><Text style={[styles.seeAll, { color: palette.primary }]}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        data={MOST_PLAYED}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10, paddingRight: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.albumCard}>
            <Image source={{ uri: item.image }} style={styles.albumImage} />
            <Text style={[styles.albumTitle, { color: palette.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.albumArtist, { color: palette.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
          </TouchableOpacity>
        )}
      />
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
    <View style={styles.comingSoon}>
      <Ionicons name="people-outline" size={48} color={palette.textSecondary} />
      <Text style={[styles.comingSoonText, { color: palette.textSecondary }]}>Artists coming soon</Text>
    </View>
  );

  const renderAlbumsTab = () => (
    <View style={styles.comingSoon}>
      <Ionicons name="albums-outline" size={48} color={palette.textSecondary} />
      <Text style={[styles.comingSoonText, { color: palette.textSecondary }]}>Albums coming soon</Text>
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
              <Text style={[styles.logo, { color: palette.text }]}>Mume</Text>
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
});
