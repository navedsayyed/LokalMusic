import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Image,
    PanResponder,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LyricsModal } from "@/components/music/LyricsModal";
import { QueueSheet } from "@/components/music/QueueSheet";
import { SongOptionsSheet } from "@/components/music/SongOptionsSheet";
import {
    loadAndPlayCurrent,
    seekTo,
    togglePlayPause,
} from "@/services/player/audio.service";
import { useLibraryStore } from "@/store/library.store";
import { usePlayerStore } from "@/store/player.store";
import { useThemeStore } from "@/store/theme.store";
import { useUIStore } from "@/store/ui.store";
import { colors } from "@/theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const PlayerScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const navigation = useNavigation();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const setPlayerOpen = useUIStore((s) => s.setPlayerOpen);

  // Tell MiniPlayer to hide itself while full player is visible
  useEffect(() => {
    setPlayerOpen(true);
    return () => setPlayerOpen(false);
  }, [setPlayerOpen]);

  const {
    queue,
    currentIndex,
    isPlaying,
    positionMillis,
    durationMillis,
    next,
    previous,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = usePlayerStore();

  const current = queue[currentIndex];
  const liked = current ? isLiked(current.id) : false;
  const seekBarWidth = useRef(SCREEN_WIDTH - 64);

  const progress =
    durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const dur = usePlayerStore.getState().durationMillis;
        const ratio = Math.min(
          1,
          Math.max(0, e.nativeEvent.locationX / seekBarWidth.current),
        );
        seekTo(ratio * dur);
      },
      onPanResponderMove: (e) => {
        const dur = usePlayerStore.getState().durationMillis;
        const ratio = Math.min(
          1,
          Math.max(0, e.nativeEvent.locationX / seekBarWidth.current),
        );
        seekTo(ratio * dur);
      },
    }),
  ).current;

  if (!current) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: palette.background }]}
      >
        <View style={styles.center}>
          <Ionicons
            name="musical-notes-outline"
            size={64}
            color={palette.textSecondary}
          />
          <Text
            style={{
              color: palette.textSecondary,
              marginTop: 12,
              fontSize: 16,
            }}
          >
            No song selected
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleNext = async () => {
    next();
    await loadAndPlayCurrent();
  };

  const handlePrevious = async () => {
    previous();
    await loadAndPlayCurrent();
  };

  const handleShare = async () => {
    if (!current) return;
    try {
      await Share.share({
        message: `🎵 Listening to "${current.name}" by ${current.primaryArtists} on LokalMusic`,
        title: current.name,
      });
    } catch {
      // user cancelled share
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={["top"]}
    >
      <View style={styles.main}>
        {/* Top + middle content */}
        <View style={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-down" size={28} color={palette.text} />
            </TouchableOpacity>
            <Text
              style={[styles.nowPlayingLabel, { color: palette.textSecondary }]}
            >
              NOW PLAYING
            </Text>
            <TouchableOpacity
              onPress={() => setOptionsVisible(true)}
              style={styles.iconBtn}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={palette.text}
              />
            </TouchableOpacity>
          </View>

          {/* Album art */}
          <View style={styles.artContainer}>
            {current.imageUrl ? (
              <Image
                source={{ uri: current.imageUrl }}
                style={styles.albumArt}
              />
            ) : (
              <View
                style={[
                  styles.albumArt,
                  styles.artPlaceholder,
                  { backgroundColor: palette.backgroundSecondary },
                ]}
              >
                <Ionicons
                  name="musical-notes"
                  size={80}
                  color={palette.textSecondary}
                />
              </View>
            )}
          </View>

          {/* Song info + like */}
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.songTitle, { color: palette.text }]}
                numberOfLines={1}
              >
                {current.name}
              </Text>
              <Text
                style={[styles.artistName, { color: palette.textSecondary }]}
                numberOfLines={2}
              >
                {current.primaryArtists}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => current && toggleLike(current)}
              style={styles.likeBtn}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={26}
                color={liked ? palette.primary : palette.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View
              style={styles.progressBarHit}
              {...panResponder.panHandlers}
              onLayout={(e) => {
                seekBarWidth.current = e.nativeEvent.layout.width;
              }}
            >
              <View
                style={[
                  styles.progressBg,
                  { backgroundColor: palette.backgroundSecondary },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: palette.primary,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.thumb,
                    {
                      left: `${progress * 100}%`,
                      backgroundColor: palette.primary,
                      transform: [{ translateX: -7 }],
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: palette.textSecondary }]}>
                {formatTime(positionMillis)}
              </Text>
              <Text style={[styles.timeText, { color: palette.textSecondary }]}>
                {formatTime(durationMillis || current.duration * 1000)}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Shuffle */}
            <TouchableOpacity onPress={toggleShuffle} style={styles.controlBtn}>
              <Ionicons
                name="shuffle"
                size={24}
                color={shuffle ? palette.primary : palette.textSecondary}
              />
              {shuffle && (
                <View
                  style={[styles.dot, { backgroundColor: palette.primary }]}
                />
              )}
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handlePrevious}
            >
              <Ionicons name="play-skip-back" size={32} color={palette.text} />
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: palette.primary }]}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="#fff"
                style={isPlaying ? undefined : { marginLeft: 3 }}
              />
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity style={styles.controlBtn} onPress={handleNext}>
              <Ionicons
                name="play-skip-forward"
                size={32}
                color={palette.text}
              />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity onPress={cycleRepeat} style={styles.controlBtn}>
              <Ionicons
                name="repeat"
                size={24}
                color={
                  repeatMode === "off" ? palette.textSecondary : palette.primary
                }
              />
              {repeatMode === "one" && (
                <Text style={[styles.repeatBadge, { color: palette.primary }]}>
                  1
                </Text>
              )}
              {repeatMode !== "off" && (
                <View
                  style={[styles.dot, { backgroundColor: palette.primary }]}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Spotify-style bottom bar, pinned to bottom ── */}
        <View style={[styles.bottomBar, { borderTopColor: palette.border }]}>
          {/* Cast / device */}
          <TouchableOpacity style={styles.bottomBarBtn}>
            <Ionicons
              name="phone-portrait-outline"
              size={21}
              color={palette.textSecondary}
            />
          </TouchableOpacity>

          {/* Lyrics tap target – centre */}
          <TouchableOpacity
            style={styles.lyricsCenter}
            onPress={() => setLyricsVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-up"
              size={13}
              color={palette.textSecondary}
            />
            <Text style={[styles.lyricsCenterText, { color: palette.text }]}>
              Lyrics
            </Text>
          </TouchableOpacity>

          {/* Share + Queue */}
          <View style={styles.bottomBarRight}>
            <TouchableOpacity style={styles.bottomBarBtn} onPress={handleShare}>
              <Ionicons
                name="share-social-outline"
                size={21}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomBarBtn}
              onPress={() => setQueueVisible(true)}
            >
              <Ionicons
                name="menu-outline"
                size={23}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Song options bottom sheet */}
      <SongOptionsSheet
        visible={optionsVisible}
        song={current}
        onClose={() => setOptionsVisible(false)}
      />

      {/* Queue bottom sheet */}
      <QueueSheet
        visible={queueVisible}
        onClose={() => setQueueVisible(false)}
      />

      {/* Lyrics sheet */}
      <LyricsModal
        visible={lyricsVisible}
        onClose={() => setLyricsVisible(false)}
        songName={current.name}
        artistName={current.primaryArtists}
        progress={progress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  main: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-evenly",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlayingLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  artContainer: { alignItems: "center" },
  albumArt: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    maxWidth: 320,
    maxHeight: 320,
    alignSelf: "center",
  },
  artPlaceholder: { alignItems: "center", justifyContent: "center" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  songTitle: { fontSize: 22, fontWeight: "700" },
  artistName: { fontSize: 16, marginTop: 4, fontWeight: "500" },
  likeBtn: { padding: 4 },
  progressSection: {},
  progressBarHit: { paddingVertical: 10 },
  progressBg: { height: 4, borderRadius: 999, overflow: "visible" },
  progressFill: {
    height: 4,
    borderRadius: 999,
    position: "absolute",
    top: 0,
    left: 0,
  },
  thumb: {
    position: "absolute",
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: { fontSize: 12 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
  },
  playBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#FF8A00",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  dot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  repeatBadge: {
    position: "absolute",
    top: 1,
    right: 2,
    fontSize: 9,
    fontWeight: "800",
  },
  extras: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginTop: 28,
    paddingBottom: 16,
  },
  extraBtn: { alignItems: "center", gap: 6 },
  extraLabel: { fontSize: 11 },

  // Spotify-style bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomBarBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  lyricsCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  lyricsCenterText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  bottomBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
