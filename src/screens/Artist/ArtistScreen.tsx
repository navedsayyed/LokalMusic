import { Ionicons } from "@expo/vector-icons";
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
import { searchArtists, searchSongs } from "@/services/api/music.api";
import { loadAndPlayCurrent } from "@/services/player/audio.service";
import { usePlayerStore } from "@/store/player.store";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";
import { Song } from "@/types/music.types";
import { useNavigation, useRoute } from "@react-navigation/native";

type ArtistRouteParams = {
  artistId?: string;
  artistName: string;
  artistImageUrl?: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.46;
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

/* ─── Animated song row ─────────────────────────────────────────── */
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

    const handlePressIn = () =>
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 40,
      }).start();

    const handlePressOut = () =>
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
      }).start();

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPlay}
          style={[
            styles.songRow,
            {
              backgroundColor: isActive
                ? palette.primary + "18"
                : "transparent",
            },
          ]}
        >
          {/* Index / equalizer icon */}
          <View style={styles.indexWrap}>
            {isActive ? (
              <Ionicons
                name="musical-notes"
                size={16}
                color={palette.primary}
              />
            ) : (
              <Text
                style={[styles.songIndex, { color: palette.textSecondary }]}
              >
                {index + 1}
              </Text>
            )}
          </View>

          {/* Album art */}
          <Image
            source={{ uri: item.imageUrl || undefined }}
            style={styles.songImage}
          />

          {/* Text info */}
          <View style={styles.songInfo}>
            <Text
              style={[
                styles.songName,
                { color: isActive ? palette.primary : palette.text },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[styles.songArtist, { color: palette.textSecondary }]}
              numberOfLines={1}
            >
              {item.primaryArtists}
            </Text>
          </View>

          {/* 3-dot options button */}
          <TouchableOpacity
            onPress={onOptions}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.optionsBtn}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={palette.textSecondary}
            />
          </TouchableOpacity>
        </Pressable>
      </Animated.View>
    );
  },
);

/* ─── Main Screen ────────────────────────────────────────────────── */
export const ArtistScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as ArtistRouteParams;
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const isDark = colorScheme === "dark";

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [optionsSong, setOptionsSong] = useState<Song | null>(null);
  const [fetchedArtistImageUrl, setFetchedArtistImageUrl] = useState<string | undefined>(undefined);

  const setContextAndPlay = usePlayerStore((s) => s.setContextAndPlay);
  const getCurrentSong = usePlayerStore((s) => s.getCurrentSong);
  const currentSongId = getCurrentSong()?.id;

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!params?.artistName) return;
    setLoading(true);
    setSongs([]);
    searchSongs(params.artistName, 1, 20).then((result) => {
      setSongs(result);
      setLoading(false);
    });
  }, [params?.artistName]);

  // Always reset + re-fetch real artist photo whenever the artist changes
  useEffect(() => {
    if (!params?.artistName) return;
    // If the caller already supplied a photo URL, use it immediately
    if (typeof params.artistImageUrl === "string" && params.artistImageUrl) {
      setFetchedArtistImageUrl(params.artistImageUrl);
      return;
    }
    // Otherwise fetch from the artists search API
    setFetchedArtistImageUrl(undefined);
    searchArtists(params.artistName, 1).then((results) => {
      if (results[0]?.imageUrl) {
        setFetchedArtistImageUrl(results[0].imageUrl);
      }
    });
  }, [params?.artistName, params?.artistImageUrl]);

  const handlePlay = useCallback(
    (index: number) => {
      setContextAndPlay(songs, index);
      setTimeout(() => loadAndPlayCurrent(), 80);
    },
    [songs, setContextAndPlay],
  );

  const handleShufflePlay = useCallback(() => {
    if (songs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * songs.length);
    setContextAndPlay(songs, randomIndex);
    setTimeout(() => loadAndPlayCurrent(), 80);
  }, [songs, setContextAndPlay]);

  /* ── Animated scroll values ── */
  // Back button fades in as hero scrolls away
  const backBtnBg = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.6],
    outputRange: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.55)"],
    extrapolate: "clamp",
  });

  // Sticky header name fades in
  const headerNameOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 80, HERO_HEIGHT - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Hero parallax — image scrolls slower than content
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4],
    extrapolate: "clamp",
  });

  const artistImageUrl = fetchedArtistImageUrl;

  const renderHeader = () => (
    <>
      {/* ── Full-width Hero Image ── */}
      <View style={styles.heroContainer}>
        <Animated.View
          style={[
            styles.heroImageWrap,
            { transform: [{ translateY: heroTranslateY }] },
          ]}
        >
          {artistImageUrl ? (
            <Image
              source={{ uri: artistImageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: "#1a2340" }]}>
              <Ionicons name="person" size={80} color="#ffffff22" />
            </View>
          )}
        </Animated.View>

        {/* Dark gradient overlay — fades bottom of image into background */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.4)",
            isDark ? "#050816" : "#ffffff",
          ]}
          locations={[0.3, 0.7, 1]}
          style={styles.heroGradient}
        />

        {/* Artist name + stats — overlaid at bottom of hero */}
        <View style={styles.heroContent}>
          <Text style={styles.artistName}>
            {params?.artistName ?? "Artist"}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="checkmark-circle" size={14} color="#1DB954" />
            <Text style={styles.metaText}> Verified Artist</Text>
          </View>
        </View>
      </View>

      {/* ── Action Row (Follow, More, Shuffle, Play) ── */}
      <View style={[styles.actionBar, { backgroundColor: palette.background }]}>
        {/* Small artist thumbnail */}
        {artistImageUrl && (
          <Image source={{ uri: artistImageUrl }} style={styles.actionThumb} />
        )}

        {/* Follow button */}
        <TouchableOpacity
          onPress={() => setFollowing((f) => !f)}
          style={[
            styles.followBtn,
            {
              borderColor: following ? palette.primary : palette.textSecondary,
              backgroundColor: following ? palette.primary : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: following ? "#fff" : palette.text },
            ]}
          >
            {following ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>

        {/* More options */}
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={palette.textSecondary}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Shuffle */}
        <TouchableOpacity onPress={handleShufflePlay} style={styles.iconBtn}>
          <Ionicons name="shuffle" size={24} color={palette.primary} />
        </TouchableOpacity>

        {/* Play */}
        <TouchableOpacity
          onPress={() => songs.length > 0 && handlePlay(0)}
          style={[styles.playFabBtn, { backgroundColor: palette.primary }]}
        >
          <Ionicons
            name="play"
            size={22}
            color="#fff"
            style={{ marginLeft: 3 }}
          />
        </TouchableOpacity>
      </View>

      {/* ── Popular heading ── */}
      <View
        style={[styles.popularHeader, { backgroundColor: palette.background }]}
      >
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Popular
        </Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: palette.textSecondary }]}>
            See all
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} />
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
        style={[
          styles.backBtn,
          { top: STATUS_BAR_HEIGHT + 8, backgroundColor: backBtnBg },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtnInner}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Sticky header (artist name only, fades in on scroll) ── */}
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
        <Text
          style={[styles.stickyTitle, { color: palette.text }]}
          numberOfLines={1}
        >
          {params?.artistName ?? "Artist"}
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
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={renderHeader}
      />

      {/* ── 3-dot song options sheet ── */}
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

  /* ── Sticky / back overlay ── */
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
  backBtnInner: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Hero ── */
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImageWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT + 80,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.7,
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  artistName: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  metaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },

  /* ── Action bar (below hero) ── */
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  actionThumb: {
    width: 44,
    height: 44,
    borderRadius: 4,
  },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  followBtnText: { fontSize: 13, fontWeight: "600" },
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

  /* ── Popular header ── */
  popularHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  seeAll: { fontSize: 13 },

  /* ── Song row ── */
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
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#1a2340",
  },
  songInfo: { flex: 1, minWidth: 0 },
  songName: { fontSize: 15, fontWeight: "600" },
  songArtist: { fontSize: 12, marginTop: 2 },
  optionsBtn: { padding: 6 },
});
