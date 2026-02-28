import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SongOptionsSheet } from "@/components/music/SongOptionsSheet";
import { AlbumDetail, getAlbumById } from "@/services/api/music.api";
import { loadAndPlayCurrent } from "@/services/player/audio.service";
import { usePlayerStore } from "@/store/player.store";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";
import { Song } from "@/types/music.types";

type AlbumRouteParams = {
  albumId?: string;
  albumName?: string;
  albumImageUrl?: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

const formatSeconds = (secs: number) => {
  if (!secs) return "0:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/* ─── Song row ──────────────────────────────────────────────────── */
const SongRow = React.memo(
  ({
    item,
    index,
    isActive,
    palette,
    onPlay,
    onOptions,
  }: {
    item: Song;
    index: number;
    isActive: boolean;
    palette: (typeof colors)[keyof typeof colors];
    onPlay: () => void;
    onOptions: () => void;
  }) => {
    const scale = useRef(new Animated.Value(1)).current;
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPressIn={() =>
            Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()
          }
          onPressOut={() =>
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()
          }
          onPress={onPlay}
          style={[
            styles.songRow,
            { backgroundColor: isActive ? palette.primary + "18" : "transparent" },
          ]}
        >
          {/* index */}
          <View style={styles.indexWrap}>
            {isActive ? (
              <Ionicons name="musical-notes" size={16} color={palette.primary} />
            ) : (
              <Text style={[styles.songIndex, { color: palette.textSecondary }]}>
                {index + 1}
              </Text>
            )}
          </View>

          {/* art */}
          <Image
            source={{ uri: item.imageUrl || undefined }}
            style={styles.songImage}
          />

          {/* info */}
          <View style={styles.songInfo}>
            <Text
              style={[styles.songName, { color: isActive ? palette.primary : palette.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.songArtist, { color: palette.textSecondary }]} numberOfLines={1}>
              {item.primaryArtists}
              {item.duration ? `  ·  ${formatSeconds(item.duration)}` : ""}
            </Text>
          </View>

          {/* 3-dot */}
          <TouchableOpacity
            onPress={onOptions}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.optionsBtn}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
        </Pressable>
      </Animated.View>
    );
  },
);

/* ─── Main Screen ─────────────────────────────────────────────── */
export const AlbumScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as AlbumRouteParams;

  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const isDark = colorScheme === "dark";

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsSong, setOptionsSong] = useState<Song | null>(null);

  const setContextAndPlay = usePlayerStore((s) => s.setContextAndPlay);
  const getCurrentSong = usePlayerStore((s) => s.getCurrentSong);
  const currentSongId = getCurrentSong()?.id;

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!params?.albumId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getAlbumById(params.albumId).then((data) => {
      setAlbum(data);
      setLoading(false);
    });
  }, [params?.albumId]);

  const songs = album?.songs ?? [];

  const handlePlay = useCallback(
    (index: number) => {
      if (songs.length === 0) return;
      setContextAndPlay(songs, index);
      setTimeout(() => loadAndPlayCurrent(), 80);
      navigation.navigate("Player");
    },
    [songs, setContextAndPlay, navigation],
  );

  const handleShufflePlay = useCallback(() => {
    if (songs.length === 0) return;
    const idx = Math.floor(Math.random() * songs.length);
    setContextAndPlay(songs, idx);
    setTimeout(() => loadAndPlayCurrent(), 80);
    navigation.navigate("Player");
  }, [songs, setContextAndPlay, navigation]);

  /* ── Animated values ── */
  const backBtnBg = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.6],
    outputRange: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.55)"],
    extrapolate: "clamp",
  });

  const headerNameOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 80, HERO_HEIGHT - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4],
    extrapolate: "clamp",
  });

  const coverUrl = album?.imageUrl ?? (params?.albumImageUrl as string | undefined);
  const albumName = album?.name ?? params?.albumName ?? "Album";

  const renderHeader = () => (
    <>
      {/* ── Hero ── */}
      <View style={styles.heroContainer}>
        <Animated.View
          style={[styles.heroImageWrap, { transform: [{ translateY: heroTranslateY }] }]}
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: "#1a2340", alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="albums" size={80} color="#ffffff22" />
            </View>
          )}
        </Animated.View>

        {/* gradient */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)", isDark ? "#050816" : "#ffffff"]}
          locations={[0.3, 0.7, 1]}
          style={styles.heroGradient}
        />

        {/* title overlay */}
        <View style={styles.heroContent}>
          <Text style={styles.albumTitle} numberOfLines={2}>
            {albumName}
          </Text>
          {(album?.artist || album?.year) && (
            <Text style={styles.albumMeta}>
              {[album.artist, album.year].filter(Boolean).join("  ·  ")}
            </Text>
          )}
        </View>
      </View>

      {/* ── Action bar ── */}
      <View style={[styles.actionBar, { backgroundColor: palette.background }]}>
        {coverUrl && (
          <Image source={{ uri: coverUrl }} style={styles.actionThumb} />
        )}

        <View style={{ flex: 1 }} />

        {/* Shuffle */}
        <TouchableOpacity onPress={handleShufflePlay} style={styles.iconBtn}>
          <Ionicons name="shuffle" size={24} color={palette.primary} />
        </TouchableOpacity>

        {/* Play */}
        <TouchableOpacity
          onPress={() => handlePlay(0)}
          style={[styles.playFabBtn, { backgroundColor: palette.primary }]}
        >
          <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {/* ── Tracks heading ── */}
      <View style={[styles.tracksHeader, { backgroundColor: palette.background }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Tracks</Text>
        <Text style={[styles.sectionSub, { color: palette.textSecondary }]}>
          {songs.length} song{songs.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading && (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} />
      )}

      {!loading && songs.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 40, gap: 10 }}>
          <Ionicons name="albums-outline" size={52} color={palette.border} />
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>No tracks found</Text>
        </View>
      )}
    </>
  );

  const renderSong = useCallback(
    ({ item, index }: { item: Song; index: number }) => (
      <SongRow
        item={item}
        index={index}
        isActive={item.id === currentSongId}
        palette={palette}
        onPlay={() => handlePlay(index)}
        onOptions={() => setOptionsSong(item)}
      />
    ),
    [currentSongId, palette, handlePlay],
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {/* ── Floating back button ── */}
      <Animated.View
        style={[styles.backBtn, { top: STATUS_BAR_HEIGHT + 8, backgroundColor: backBtnBg }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnInner}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Sticky header ── */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            paddingTop: STATUS_BAR_HEIGHT,
            backgroundColor: palette.background,
            opacity: headerNameOpacity,
            borderBottomColor: palette.border,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.stickyTitle, { color: palette.text }]} numberOfLines={1}>
          {albumName}
        </Text>
      </Animated.View>

      <Animated.FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderSong}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={renderHeader}
      />

      {/* ── Song options sheet ── */}
      <SongOptionsSheet
        visible={optionsSong !== null}
        song={optionsSong}
        onClose={() => setOptionsSong(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* sticky / back */
  stickyHeader: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  stickyTitle: { fontSize: 16, fontWeight: "700" },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  backBtnInner: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  /* hero */
  heroContainer: { width: SCREEN_WIDTH, height: HERO_HEIGHT, overflow: "hidden" },
  heroImageWrap: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: HERO_HEIGHT + 80,
  },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: HERO_HEIGHT * 0.65,
  },
  heroContent: {
    position: "absolute",
    bottom: 20, left: 16, right: 16,
  },
  albumTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  albumMeta: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.80)",
  },

  /* action bar */
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  actionThumb: { width: 44, height: 44, borderRadius: 6 },
  iconBtn: { padding: 4 },
  playFabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  /* tracks header */
  tracksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  sectionSub: { fontSize: 13 },

  /* song row */
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    gap: 12,
  },
  indexWrap: { width: 22, alignItems: "center" },
  songIndex: { fontSize: 15, fontWeight: "600" },
  songImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#1a2340" },
  songInfo: { flex: 1, minWidth: 0 },
  songName: { fontSize: 15, fontWeight: "600" },
  songArtist: { fontSize: 12, marginTop: 2 },
  optionsBtn: { padding: 6 },
});
