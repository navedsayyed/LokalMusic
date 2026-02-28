import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  loadAndPlayCurrent,
  togglePlayPause,
} from "@/services/player/audio.service";
import { usePlayerStore } from "@/store/player.store";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";

export const MiniPlayer = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  // Subscribing to the current song accurately so it updates instantly
  const current = usePlayerStore((s) => {
    if (s.isPlayingFromUser && s.userQueue.length > 0) return s.userQueue[0];
    if (s.shuffle) return s.shuffledContext[s.shuffledIndex] ?? null;
    return s.contextQueue[s.contextIndex] ?? null;
  });

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMillis = usePlayerStore((s) => s.positionMillis);
  const durationMillis = usePlayerStore((s) => s.durationMillis);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const navigation = useNavigation();
  if (!current) return null;

  const progress =
    durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;

  const handleNext = (e: any) => {
    e.stopPropagation();
    next();
    // load the new current (after state update) in next tick
    setTimeout(() => loadAndPlayCurrent(), 100);
  };

  const handlePrevious = (e: any) => {
    e.stopPropagation();
    previous();
    setTimeout(() => loadAndPlayCurrent(), 100);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => navigation.navigate("Player" as never)}
      style={[
        styles.container,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      {/* Progress bar at very bottom */}
      <View
        style={[
          styles.progressTrack,
          styles.progressBarBottom,
          { backgroundColor: palette.border },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: palette.primary },
          ]}
        />
      </View>

      <View style={styles.row}>
        {/* Album art */}
        {current.imageUrl ? (
          <Image source={{ uri: current.imageUrl }} style={styles.thumb} />
        ) : (
          <View
            style={[
              styles.thumb,
              styles.thumbPlaceholder,
              { backgroundColor: palette.backgroundSecondary },
            ]}
          >
            <Ionicons
              name="musical-notes"
              size={18}
              color={palette.textSecondary}
            />
          </View>
        )}

        {/* Song info */}
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: palette.text }]}
            numberOfLines={1}
          >
            {current.name}
          </Text>
          <Text
            style={[styles.artist, { color: palette.textSecondary }]}
            numberOfLines={1}
          >
            {current.primaryArtists}
          </Text>
        </View>

        {/* Controls – prev, play/pause, next */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrevious} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-back" size={20} color={palette.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            style={[styles.playBtn, { backgroundColor: palette.primary }]}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#fff"
              style={isPlaying ? undefined : { marginLeft: 2 }}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-forward" size={20} color={palette.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 66,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
  },
  progressTrack: { height: 2, width: "100%" },
  progressFill: { height: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  thumb: { width: 46, height: 46, borderRadius: 10 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600" },
  artist: { fontSize: 12, marginTop: 2 },
  controls: { flexDirection: "row", alignItems: "center", gap: 6 },
  ctrlBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
});
