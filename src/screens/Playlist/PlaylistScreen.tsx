/**
 * PlaylistScreen — "Your Library" (Spotify-style)
 *
 * Tabs: Playlists | Downloads
 *
 * Features:
 *  - Create / rename / delete playlists
 *  - View and play downloaded (offline) songs
 *  - Liked Songs auto-playlist
 *  - Tap playlist → opens detail view with all songs
 */

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SongOptionsSheet } from "@/components/music/SongOptionsSheet";
import { usePlayer } from "@/hooks/usePlayer";
import { deleteSongDownload } from "@/services/player/download.service";
import { Playlist, useLibraryStore } from "@/store/library.store";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";
import { Song } from "@/types/music.types";

type LibTab = "Playlists" | "Downloads";

// ── Playlist detail modal ─────────────────────────────────────────────────────
type DetailProps = {
  visible: boolean;
  name: string;
  songs: Song[];
  isLiked?: boolean;
  playlistId?: string;
  onClose: () => void;
  onPlay: (index: number) => void;
  onShuffle: () => void;
  onRename?: () => void; // undefined = hide ⋯ button (Liked Songs)
  onDelete?: () => void;
};

const MENU_HEIGHT = 200;

const PlaylistDetail = ({
  visible, name, songs, isLiked, playlistId, onClose, onPlay, onShuffle, onRename, onDelete,
}: DetailProps) => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const cover = songs.find((s) => s.imageUrl)?.imageUrl;
  const [optionsSong, setOptionsSong] = useState<Song | null>(null);

  // ── Playlist menu sheet ───────────────────────────────────────────
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(MENU_HEIGHT)).current;
  const menuBackdrop = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(menuAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(menuBackdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = (cb?: () => void) => {
    Animated.parallel([
      Animated.spring(menuAnim, { toValue: MENU_HEIGHT, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(menuBackdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => { setMenuVisible(false); cb?.(); });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.detailSafe, { backgroundColor: palette.background }]}
        edges={["top"]}
      >
        {/* Header — back ← left, ⋯ right */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {onRename && (
            <TouchableOpacity onPress={openMenu} style={styles.backBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color={palette.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Cover + title */}
        <View style={styles.detailHero}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.detailCover} />
          ) : (
            <View
              style={[
                styles.detailCover,
                styles.detailCoverPlaceholder,
                {
                  backgroundColor: isLiked
                    ? "#4B2DB5"
                    : palette.backgroundSecondary,
                },
              ]}
            >
              <Ionicons
                name={isLiked ? "heart" : "musical-notes"}
                size={52}
                color="#fff"
              />
            </View>
          )}
          <Text style={[styles.detailTitle, { color: palette.text }]}>
            {name}
          </Text>
          <Text style={[styles.detailSub, { color: palette.textSecondary }]}>
            {songs.length} song{songs.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Action row */}
        <View style={styles.detailActions}>
          <TouchableOpacity
            onPress={onShuffle}
            style={[styles.shuffleBtn, { borderColor: palette.border }]}
          >
            <Ionicons name="shuffle" size={20} color={palette.primary} />
            <Text style={[styles.shuffleBtnText, { color: palette.primary }]}>
              Shuffle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => songs.length > 0 && onPlay(0)}
            style={[styles.playAllBtn, { backgroundColor: palette.primary }]}
          >
            <Ionicons
              name="play"
              size={20}
              color="#fff"
              style={{ marginLeft: 3 }}
            />
            <Text style={styles.playAllBtnText}>Play All</Text>
          </TouchableOpacity>
        </View>

        {/* Song list */}
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 48, gap: 12 }}>
              <Ionicons
                name="musical-notes-outline"
                size={52}
                color={palette.border}
              />
              <Text style={{ color: palette.textSecondary, fontSize: 14 }}>
                No songs yet
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.songRow}
              activeOpacity={0.7}
              onPress={() => onPlay(index)}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.songThumb}
                />
              ) : (
                <View
                  style={[
                    styles.songThumb,
                    {
                      backgroundColor: palette.backgroundSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons
                    name="musical-notes"
                    size={20}
                    color={palette.textSecondary}
                  />
                </View>
              )}
              <View style={styles.songInfo}>
                <Text
                  style={[styles.songName, { color: palette.text }]}
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
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setOptionsSong(item)}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      {/* ── Playlist options bottom sheet ── */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => closeMenu()}>
        <TouchableWithoutFeedback onPress={() => closeMenu()}>
          <Animated.View style={[styles.menuBackdrop, { opacity: menuBackdrop }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[
          styles.menuSheet,
          { backgroundColor: palette.card, transform: [{ translateY: menuAnim }] },
        ]}>
          {/* Handle */}
          <View style={styles.menuHandle}>
            <View style={[styles.handleBar, { backgroundColor: palette.border }]} />
          </View>
          {/* Title */}
          <Text style={[styles.menuTitle, { color: palette.text }]} numberOfLines={1}>{name}</Text>
          {/* Rename */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: palette.border }]}
            activeOpacity={0.7}
            onPress={() => closeMenu(onRename)}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: palette.primary + '22' }]}>
              <Ionicons name="create" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.menuRowText, { color: palette.text }]}>Rename Playlist</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.textSecondary} />
          </TouchableOpacity>
          {/* Delete */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => closeMenu(onDelete)}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.menuRowText, { color: '#EF4444' }]}>Delete Playlist</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Song options sheet */}
      <SongOptionsSheet
        visible={!!optionsSong}
        song={optionsSong}
        onClose={() => setOptionsSong(null)}
        playlistId={playlistId}
      />
    </Modal>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export const PlaylistScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const navigation = useNavigation<any>();
  const { playFromSearch } = usePlayer();

  const [activeTab, setActiveTab] = useState<LibTab>("Playlists");
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [renameTarget, setRenameTarget] = useState<Playlist | null>(null);
  const [renameText, setRenameText] = useState("");

  const playlists = useLibraryStore((s) => s.playlists);
  const likedSongs = useLibraryStore((s) => s.likedSongs);
  const downloads = useLibraryStore((s) => s.downloads);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);

  // ── Detail view state ──────────────────────────────────────────────────────
  const [detailPlaylist, setDetailPlaylist] = useState<Playlist | null>(null);
  const [detailIsLiked, setDetailIsLiked] = useState(false);
  const [detailName, setDetailName] = useState("");

  // Compute songs LIVE from store so unliking/playlist edits update immediately
  const detailSongs = useMemo(() => {
    if (detailIsLiked) return likedSongs;
    if (detailPlaylist) {
      const live = playlists.find((p) => p.id === detailPlaylist.id);
      return live?.songs ?? [];
    }
    return [];
  }, [detailIsLiked, detailPlaylist, likedSongs, playlists]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const openLikedSongs = () => {
    setDetailName("Liked Songs");
    setDetailIsLiked(true);
    setDetailPlaylist(null);
  };

  const openPlaylist = (pl: Playlist) => {
    setDetailName(pl.name);
    setDetailIsLiked(false);
    setDetailPlaylist(pl);
  };

  const closeDetail = () => {
    setDetailPlaylist(null);
    setDetailIsLiked(false);
    setDetailName("");
  };

  const handleDetailPlay = (index: number) => {
    if (detailSongs.length === 0) return;
    playFromSearch(detailSongs, index);
    navigation.navigate("Player");
  };

  const handleDetailShuffle = () => {
    if (detailSongs.length === 0) return;
    const idx = Math.floor(Math.random() * detailSongs.length);
    playFromSearch(detailSongs, idx);
    navigation.navigate("Player");
  };

  const handleCreate = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    createPlaylist(name);
    setNewPlaylistName("");
    setCreateModalVisible(false);
  };

  const handleRename = () => {
    if (!renameTarget || !renameText.trim()) return;
    renamePlaylist(renameTarget.id, renameText.trim());
    setRenameTarget(null);
    setRenameText("");
  };

  const handleDeletePlaylist = (pl: Playlist) => {
    Alert.alert("Delete Playlist", `Delete "${pl.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePlaylist(pl.id),
      },
    ]);
  };

  const handleDeleteDownload = (songId: string, name: string) => {
    Alert.alert("Remove Download", `Remove "${name}" from downloads?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteSongDownload(songId),
      },
    ]);
  };

  // ── Row components ───────────────────────────────────────────────────────────

  const LikedSongsRow = () => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={openLikedSongs}
    >
      <View style={[styles.thumb, styles.likedThumb]}>
        <Ionicons name="heart" size={28} color="#fff" />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: palette.text }]}>Liked Songs</Text>
        <Text style={[styles.sub, { color: palette.textSecondary }]}>
          Playlist · {likedSongs.length} song
          {likedSongs.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={palette.textSecondary}
      />
    </TouchableOpacity>
  );

  const PlaylistRow = ({ item }: { item: Playlist }) => {
    const cover = item.songs.find((s) => s.imageUrl)?.imageUrl;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => openPlaylist(item)}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.thumb} />
        ) : (
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: palette.backgroundSecondary,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons
              name="musical-notes"
              size={24}
              color={palette.textSecondary}
            />
          </View>
        )}
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: palette.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={[styles.sub, { color: palette.textSecondary }]}>
            Playlist · {item.songs.length} song
            {item.songs.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>
          Your Library
        </Text>
        <TouchableOpacity
          style={[
            styles.headerBtn,
            { backgroundColor: palette.backgroundSecondary },
          ]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={25} color={palette.text} />
        </TouchableOpacity>
      </View>

      {/* Tab chips */}
      <View style={styles.chips}>
        {(["Playlists", "Downloads"] as LibTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.chip,
              {
                backgroundColor:
                  activeTab === tab
                    ? palette.primary
                    : palette.backgroundSecondary,
                borderColor:
                  activeTab === tab ? palette.primary : palette.border,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.chipText,
                { color: activeTab === tab ? "#fff" : palette.textSecondary },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── PLAYLISTS TAB ── */}
      {activeTab === "Playlists" && (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<LikedSongsRow />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="library-outline"
                size={52}
                color={palette.border}
              />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                Create your first playlist
              </Text>
              <Text style={[styles.emptySub, { color: palette.textSecondary }]}>
                Tap + to start building your library
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: palette.primary }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Text style={styles.emptyBtnText}>Create playlist</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => <PlaylistRow item={item} />}
        />
      )}

      {/* ── DOWNLOADS TAB ── */}
      {activeTab === "Downloads" && (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="download-outline"
                size={52}
                color={palette.border}
              />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                No downloads yet
              </Text>
              <Text style={[styles.emptySub, { color: palette.textSecondary }]}>
                Download songs to listen offline — tap ⋯ on any song
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                playFromSearch(downloads, index);
                navigation.navigate("Player");
              }}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View
                  style={[
                    styles.thumb,
                    {
                      backgroundColor: palette.backgroundSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons
                    name="musical-notes"
                    size={22}
                    color={palette.textSecondary}
                  />
                </View>
              )}
              <View style={styles.info}>
                <Text
                  style={[styles.name, { color: palette.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="checkmark-circle" size={12} color="#1DB954" />
                  <Text
                    style={[styles.sub, { color: palette.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.primaryArtists}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => handleDeleteDownload(item.id, item.name)}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── PLAYLIST DETAIL MODAL ── */}
      <PlaylistDetail
        visible={detailIsLiked || detailPlaylist !== null}
        name={detailName}
        songs={detailSongs}
        isLiked={detailIsLiked}
        playlistId={detailPlaylist?.id}
        onClose={closeDetail}
        onPlay={handleDetailPlay}
        onShuffle={handleDetailShuffle}
        onRename={detailPlaylist ? () => { setRenameTarget(detailPlaylist); setRenameText(detailPlaylist.name); } : undefined}
        onDelete={detailPlaylist ? () => { handleDeletePlaylist(detailPlaylist); closeDetail(); } : undefined}
      />

      {/* ── CREATE PLAYLIST MODAL ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setCreateModalVisible(false)}
        />
        <View style={[styles.sheet, { backgroundColor: palette.card }]}>
          <Text style={[styles.sheetTitle, { color: palette.text }]}>
            New Playlist
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.backgroundSecondary,
              },
            ]}
            placeholder="Playlist name"
            placeholderTextColor={palette.textSecondary}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetBtn, { borderColor: palette.border }]}
              onPress={() => setCreateModalVisible(false)}
            >
              <Text style={[styles.sheetBtnText, { color: palette.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sheetBtn,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              onPress={handleCreate}
            >
              <Text style={[styles.sheetBtnText, { color: "#fff" }]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── RENAME MODAL ── */}
      <Modal
        visible={!!renameTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setRenameTarget(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setRenameTarget(null)}
        />
        <View style={[styles.sheet, { backgroundColor: palette.card }]}>
          <Text style={[styles.sheetTitle, { color: palette.text }]}>
            Rename Playlist
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.backgroundSecondary,
              },
            ]}
            placeholder="Playlist name"
            placeholderTextColor={palette.textSecondary}
            value={renameText}
            onChangeText={setRenameText}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleRename}
          />
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetBtn, { borderColor: palette.border }]}
              onPress={() => setRenameTarget(null)}
            >
              <Text style={[styles.sheetBtnText, { color: palette.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sheetBtn,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              onPress={handleRename}
            >
              <Text style={[styles.sheetBtnText, { color: "#fff" }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  title: { flex: 1, fontSize: 24, fontWeight: "700" },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  chips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 14,
  },
  thumb: { width: 60, height: 60, borderRadius: 8 },
  likedThumb: {
    backgroundColor: "#4B2DB5",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 13, marginTop: 3 },

  empty: {
    alignItems: "center",
    marginTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sheetActions: { flexDirection: "row", gap: 12 },
  sheetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  sheetBtnText: { fontWeight: "600", fontSize: 14 },

  // ── Detail view ──────────────────────────────────────────────────────────────
  detailSafe: { flex: 1 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  detailHero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  detailCover: {
    width: 160,
    height: 160,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  detailCoverPlaceholder: { alignItems: "center", justifyContent: "center" },
  detailTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  detailSub: { fontSize: 14, textAlign: "center" },
  detailActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  shuffleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  shuffleBtnText: { fontSize: 14, fontWeight: "700" },
  playAllBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
  },
  playAllBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  songThumb: { width: 52, height: 52, borderRadius: 8 },
  songInfo: { flex: 1, minWidth: 0 },
  songName: { fontSize: 14, fontWeight: "600" },
  songArtist: { fontSize: 12, marginTop: 2 },

  // ── Playlist options menu ─────────────────────────────────────────────────────
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  menuSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  menuHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 14,
    letterSpacing: 0.2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconWrap: {
    width: 38, height: 38,
    borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  menuRowText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
