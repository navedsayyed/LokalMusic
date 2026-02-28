import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import {
  deleteSongDownload,
  downloadSong,
} from "@/services/player/download.service";
import { Playlist, useLibraryStore } from "@/store/library.store";
import { usePlayerStore } from "@/store/player.store";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";
import { Song } from "@/types/music.types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

type SongOption = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  song: Song | null;
  onClose: () => void;
  onAddToQueue?: () => void;
  onPlayNext?: () => void;
  playlistId?: string; // when set, shows "Remove from this Playlist"
};

const formatSeconds = (secs: number) => {
  if (!secs) return "0:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const SongOptionsSheet: React.FC<Props> = ({
  visible,
  song,
  onClose,
  onAddToQueue,
  onPlayNext,
  playlistId,
}) => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();
  const enqueueNext = usePlayerStore((s) => s.enqueueNext);
  const enqueueToEnd = usePlayerStore((s) => s.enqueueToEnd);
  const {
    toggleLike,
    isLiked,
    isDownloaded,
    playlists,
    addSongToPlaylist,
    removeSongFromPlaylist,
  } = useLibraryStore();
  const liked = song ? isLiked(song.id) : false;
  const downloaded = song ? isDownloaded(song.id) : false;
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);

  // ── Queue toast ────────────────────────────────────────────────────────────
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Download-complete top banner
  const [dlToastVisible, setDlToastVisible] = useState(false);
  const [dlToastMsg, setDlToastMsg] = useState("");
  const [dlToastIsError, setDlToastIsError] = useState(false);
  const dlToastY = useRef(new Animated.Value(-100)).current;
  const dlToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDownloadToast = (msg: string, isError = false) => {
    setDlToastMsg(msg);
    setDlToastIsError(isError);
    setDlToastVisible(true);
    if (dlToastTimer.current) clearTimeout(dlToastTimer.current);
    Animated.spring(dlToastY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    dlToastTimer.current = setTimeout(() => {
      Animated.timing(dlToastY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDlToastVisible(false));
    }, 3500);
  };

  const showQueueToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastVisible(false));
    }, 3500);
  };

  // ── Playlist picker sheet ─────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerAnim = useRef(new Animated.Value(300)).current;
  const pickerBackdrop = useRef(new Animated.Value(0)).current;

  const openPicker = () => {
    setPickerVisible(true);
    Animated.parallel([
      Animated.spring(pickerAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(pickerBackdrop, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePicker = (cb?: () => void) => {
    Animated.parallel([
      Animated.spring(pickerAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(pickerBackdrop, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPickerVisible(false);
      cb?.();
    });
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SHEET_HEIGHT,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  // Keep rendering toasts even after song becomes null (sheet closed)
  if (!song) {
    const anyToast = toastVisible || dlToastVisible;
    if (!anyToast) return null;
    return (
      <>
        {/* Queue toast */}
        {toastVisible && (
          <Modal
            visible={toastVisible}
            transparent
            animationType="none"
            statusBarTranslucent
          >
            <View style={styles.toastWrapper} pointerEvents="box-none">
              <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
                <Ionicons name="checkmark-circle" size={18} color="#1DB954" />
                <Text style={styles.toastText} numberOfLines={1}>
                  {toastMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setToastVisible(false);
                    navigation.navigate("Player" as never);
                  }}
                >
                  <Text style={styles.toastAction}>View Queue</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}
        {/* Download top banner */}
        {dlToastVisible && (
          <Modal
            visible={dlToastVisible}
            transparent
            animationType="none"
            statusBarTranslucent
          >
            <View style={styles.dlBannerWrapper} pointerEvents="box-none">
              <Animated.View
                style={[
                  styles.dlBanner,
                  { transform: [{ translateY: dlToastY }] },
                ]}
              >
                <Ionicons
                  name={dlToastIsError ? "alert-circle" : "download"}
                  size={18}
                  color={dlToastIsError ? "#DC2626" : "#16A34A"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dlBannerTitle}>
                    {dlToastIsError ? "Download Failed" : "Downloaded!"}
                  </Text>
                  <Text style={styles.dlBannerMsg} numberOfLines={1}>
                    {dlToastMsg}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (dlToastTimer.current)
                      clearTimeout(dlToastTimer.current);
                    Animated.timing(dlToastY, {
                      toValue: -100,
                      duration: 250,
                      useNativeDriver: true,
                    }).start(() => setDlToastVisible(false));
                  }}
                >
                  <Ionicons name="close" size={16} color="#999" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}
      </>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎵 Listen to "${song.name}" by ${song.primaryArtists} on Lokal!`,
        title: song.name,
      });
    } catch {
      // ignore
    }
    onClose();
  };

  const handleAddToQueue = () => {
    if (onAddToQueue) {
      onAddToQueue();
    } else {
      enqueueToEnd(song);
      onClose();
      showQueueToast(`"${song.name}" added to queue`);
      return;
    }
    onClose();
  };

  const handlePlayNext = () => {
    if (onPlayNext) {
      onPlayNext();
    } else {
      enqueueNext(song);
      onClose();
      showQueueToast(`"${song.name}" plays next`);
      return;
    }
    onClose();
  };

  const handleAddToPlaylist = () => {
    if (!song) return;
    onClose(); // close main sheet first, then open picker after tiny delay
    setTimeout(openPicker, 280);
  };

  const handleDownload = async () => {
    if (!song) return;
    if (downloaded) {
      Alert.alert("Remove Download", `Remove "${song.name}" from downloads?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deleteSongDownload(song.id);
            onClose();
          },
        },
      ]);
      return;
    }
    setDownloading(true);
    setDlProgress(0);
    await downloadSong(song, ({ progress, done, error }) => {
      setDlProgress(progress);
      if (done) {
        setDownloading(false);
        if (error) {
          showDownloadToast(`Download failed: ${error}`, true);
        } else {
          showDownloadToast(`"${song.name}" saved for offline listening`);
        }
        onClose();
      }
    });
  };

  const handleGoToAlbum = () => {
    if (song.album?.id) {
      navigation.navigate("Album", {
        albumId: song.album.id,
        albumName: song.album.name,
        albumImageUrl: song.album.imageUrl ?? song.imageUrl,
      });
    }
    onClose();
  };

  const handleGoToArtist = () => {
    const artistName = song.primaryArtists || "Unknown Artist";
    navigation.navigate("Artist", { artistName });
    onClose();
  };

  const handleDetails = () => {
    Alert.alert(
      song.name,
      `Artist: ${song.primaryArtists || "Unknown"}\nAlbum: ${song.album?.name || "Unknown"
      }\nDuration: ${song.duration ? formatSeconds(song.duration) + " mins" : "Unknown"}`,
    );
    onClose();
  };

  const handleSetAsRingtone = () => {
    Alert.alert(
      "Set as ringtone",
      "On a real device build this would open the system ringtone picker.",
    );
    onClose();
  };

  const handleBlacklist = () => {
    Alert.alert(
      "Added to blacklist",
      `We will skip "${song.name}" in future playback (demo behaviour).`,
    );
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      "Streaming track",
      "This is a streaming track and not stored locally, so it cannot be deleted.",
    );
    onClose();
  };

  const OPTIONS: SongOption[] = [
    // "Remove from this Playlist" — only when opened from inside a specific playlist
    ...(playlistId
      ? [
        {
          icon: "remove-circle-outline" as const,
          label: "Remove from this Playlist",
          color: "#EF4444",
          onPress: () => {
            removeSongFromPlaylist(playlistId, song.id);
            onClose();
          },
        },
      ]
      : []),
    {
      icon: liked ? "heart-dislike-outline" : "heart-outline",
      label: liked ? "Remove from Liked Songs" : "Save to Liked Songs",
      color: liked ? "#EF4444" : "#1DB954",
      onPress: () => {
        toggleLike(song);
        onClose();
      },
    },
    {
      icon: downloaded ? "checkmark-circle-outline" : "download-outline",
      label: downloaded
        ? "Downloaded ✓"
        : downloading
          ? `Downloading ${Math.round(dlProgress * 100)}%`
          : "Download",
      color: downloaded ? "#1DB954" : undefined,
      onPress: handleDownload,
    },
    {
      icon: "list-outline",
      label: "Add to Playing Queue",
      onPress: handleAddToQueue,
    },
    {
      icon: "add-circle-outline",
      label: "Add to Playlist",
      onPress: handleAddToPlaylist,
    },
    {
      icon: "albums-outline",
      label: "Go to Album",
      onPress: handleGoToAlbum,
    },
    {
      icon: "person-outline",
      label: "Go to Artist",
      onPress: handleGoToArtist,
    },
    {
      icon: "information-circle-outline",
      label: "Details",
      onPress: handleDetails,
    },
    {
      icon: "call-outline",
      label: "Set as Ringtone",
      onPress: handleSetAsRingtone,
    },
    {
      icon: "close-circle-outline",
      label: "Add to Blacklist",
      color: "#EF4444",
      onPress: handleBlacklist,
    },
  ];

  const mainSheet = (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.card,
            height: SHEET_HEIGHT,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
        </View>

        {/* Song preview */}
        <View
          style={[styles.songPreview, { borderBottomColor: palette.border }]}
        >
          {song.imageUrl ? (
            <Image
              source={{ uri: song.imageUrl }}
              style={styles.previewThumb}
            />
          ) : (
            <View
              style={[
                styles.previewThumb,
                { backgroundColor: palette.backgroundSecondary },
              ]}
            >
              <Ionicons
                name="musical-notes"
                size={22}
                color={palette.textSecondary}
              />
            </View>
          )}
          <View style={styles.previewInfo}>
            <Text
              style={[styles.previewTitle, { color: palette.text }]}
              numberOfLines={1}
            >
              {song.name}
            </Text>
            <Text
              style={[styles.previewMeta, { color: palette.textSecondary }]}
              numberOfLines={1}
            >
              {song.primaryArtists}
              {song.duration ? `  |  ${formatSeconds(song.duration)} mins` : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => song && toggleLike(song)}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#EF4444" : palette.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Options list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.optionRow}
              onPress={opt.onPress}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.optionIconWrap,
                  { backgroundColor: palette.backgroundSecondary },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={opt.color ?? palette.text}
                />
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  { color: opt.color ?? palette.text },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );

  const playlistPickerSheet = (
    <Modal
      visible={pickerVisible}
      transparent
      animationType="none"
      onRequestClose={() => closePicker()}
    >
      <TouchableWithoutFeedback onPress={() => closePicker()}>
        <Animated.View style={[styles.backdrop, { opacity: pickerBackdrop }]} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.pickerSheet,
          {
            backgroundColor: palette.card,
            transform: [{ translateY: pickerAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
        </View>
        {/* Header */}
        <View
          style={[styles.pickerHeader, { borderBottomColor: palette.border }]}
        >
          <Text style={[styles.pickerTitle, { color: palette.text }]}>
            Add to Playlist
          </Text>
          <Text
            style={[styles.pickerSub, { color: palette.textSecondary }]}
            numberOfLines={1}
          >
            "{song.name}"
          </Text>
        </View>
        {/* List */}
        {playlists.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Ionicons
              name="musical-notes-outline"
              size={44}
              color={palette.border}
            />
            <Text
              style={[styles.pickerEmptyText, { color: palette.textSecondary }]}
            >
              No playlists yet.{"\n"}Create one in Your Library.
            </Text>
          </View>
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(p: Playlist) => p.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }: { item: Playlist }) => {
              const cover = item.songs.find((s: Song) => s.imageUrl)?.imageUrl;
              return (
                <TouchableOpacity
                  style={[
                    styles.pickerRow,
                    { borderBottomColor: palette.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    closePicker(() => addSongToPlaylist(item.id, song))
                  }
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.pickerThumb} />
                  ) : (
                    <View
                      style={[
                        styles.pickerThumb,
                        styles.pickerThumbPlaceholder,
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
                  <View style={styles.pickerInfo}>
                    <Text
                      style={[styles.pickerItemName, { color: palette.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.pickerItemSub,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {item.songs.length} song
                      {item.songs.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={palette.primary}
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </Modal>
  );

  return (
    <>
      {mainSheet}
      {playlistPickerSheet}

      {/* ── Queue toast (global, shown after sheet closes) ─────────────── */}

      <Modal
        visible={toastVisible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.toastWrapper} pointerEvents="box-none">
          <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
            <Ionicons name="checkmark-circle" size={18} color="#1DB954" />
            <Text style={styles.toastText} numberOfLines={1}>
              {toastMsg}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setToastVisible(false);
                navigation.navigate("Player" as never);
              }}
            >
              <Text style={styles.toastAction}>View Queue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  songPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  previewThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewInfo: { flex: 1, minWidth: 0 },
  previewTitle: { fontSize: 15, fontWeight: "600" },
  previewMeta: { fontSize: 12, marginTop: 3 },
  heartBtn: { padding: 4 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { fontSize: 15, fontWeight: "400" },

  // ── Playlist picker ─────────────────────────────────────────────────────
  pickerSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  pickerHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  pickerSub: { fontSize: 13, fontStyle: "italic" },
  pickerEmpty: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  pickerEmptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerThumb: { width: 48, height: 48, borderRadius: 10 },
  pickerThumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  pickerInfo: { flex: 1, minWidth: 0 },
  pickerItemName: { fontSize: 15, fontWeight: "600" },
  pickerItemSub: { fontSize: 12, marginTop: 2 },

  // ── Queue toast ─────────────────────────────────────────────────────────
  toastWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  toastText: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "500" },
  toastAction: { color: "#FF6B35", fontSize: 13, fontWeight: "700" },

  // ── Download top pill ────────────────────────────────────────────────────
  dlBannerWrapper: {
    position: "absolute",
    top: 50, // below status bar, not inside it
    left: 16,
    right: 16,
    alignItems: "center",
  },
  dlBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  dlBannerTitle: { color: "#111", fontSize: 13, fontWeight: "600" },
  dlBannerMsg: { color: "#555", fontSize: 11, marginTop: 1 },
});
