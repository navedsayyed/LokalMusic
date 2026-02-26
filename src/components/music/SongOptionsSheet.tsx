import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { Song } from '@/types/music.types';
import { usePlayerStore } from '@/store/player.store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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
};

const formatSeconds = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SongOptionsSheet: React.FC<Props> = ({
  visible,
  song,
  onClose,
  onAddToQueue,
  onPlayNext,
}) => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();
  const enqueueNext = usePlayerStore((s) => s.enqueueNext);
  const enqueueToEnd = usePlayerStore((s) => s.enqueueToEnd);

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

  if (!song) return null;

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

  const handlePlayNext = () => {
    if (onPlayNext) onPlayNext();
    else enqueueNext(song);
    onClose();
  };

  const handleAddToQueue = () => {
    if (onAddToQueue) onAddToQueue();
    else enqueueToEnd(song);
    onClose();
  };

  const handleAddToPlaylist = () => {
    Alert.alert('Added to playlist', `"${song.name}" added to Favorites playlist.`);
    onClose();
  };

  const handleGoToAlbum = () => {
    if (song.album?.id) {
      navigation.navigate('Album', {
        albumId: song.album.id,
        albumName: song.album.name,
      });
    }
    onClose();
  };

  const handleGoToArtist = () => {
    const artistName = song.primaryArtists || 'Unknown Artist';
    navigation.navigate('Artist', { artistName });
    onClose();
  };

  const handleDetails = () => {
    Alert.alert(
      song.name,
      `Artist: ${song.primaryArtists || 'Unknown'}\nAlbum: ${
        song.album?.name || 'Unknown'
      }\nDuration: ${song.duration ? formatSeconds(song.duration) + ' mins' : 'Unknown'}`,
    );
    onClose();
  };

  const handleSetAsRingtone = () => {
    Alert.alert(
      'Set as ringtone',
      'On a real device build this would open the system ringtone picker.',
    );
    onClose();
  };

  const handleBlacklist = () => {
    Alert.alert(
      'Added to blacklist',
      `We will skip "${song.name}" in future playback (demo behaviour).`,
    );
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Streaming track',
      'This is a streaming track and not stored locally, so it cannot be deleted.',
    );
    onClose();
  };

  const OPTIONS: SongOption[] = [
    {
      icon: 'play-skip-forward-outline',
      label: 'Play Next',
      onPress: handlePlayNext,
    },
    {
      icon: 'list-outline',
      label: 'Add to Playing Queue',
      onPress: handleAddToQueue,
    },
    {
      icon: 'add-circle-outline',
      label: 'Add to Playlist',
      onPress: handleAddToPlaylist,
    },
    {
      icon: 'albums-outline',
      label: 'Go to Album',
      onPress: handleGoToAlbum,
    },
    {
      icon: 'person-outline',
      label: 'Go to Artist',
      onPress: handleGoToArtist,
    },
    {
      icon: 'information-circle-outline',
      label: 'Details',
      onPress: handleDetails,
    },
    {
      icon: 'call-outline',
      label: 'Set as Ringtone',
      onPress: handleSetAsRingtone,
    },
    {
      icon: 'close-circle-outline',
      label: 'Add to Blacklist',
      color: '#EF4444',
      onPress: handleBlacklist,
    },
    {
      icon: 'share-social-outline',
      label: 'Share',
      onPress: handleShare,
    },
    {
      icon: 'trash-outline',
      label: 'Delete from Device',
      color: '#EF4444',
      onPress: handleDelete,
    },
  ];

  return (
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
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
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
        <View style={[styles.songPreview, { borderBottomColor: palette.border }]}>
          {song.imageUrl ? (
            <Image source={{ uri: song.imageUrl }} style={styles.previewThumb} />
          ) : (
            <View
              style={[
                styles.previewThumb,
                { backgroundColor: palette.backgroundSecondary },
              ]}
            >
              <Ionicons name="musical-notes" size={22} color={palette.textSecondary} />
            </View>
          )}
          <View style={styles.previewInfo}>
            <Text style={[styles.previewTitle, { color: palette.text }]} numberOfLines={1}>
              {song.name}
            </Text>
            <Text
              style={[styles.previewMeta, { color: palette.textSecondary }]}
              numberOfLines={1}
            >
              {song.primaryArtists}
              {song.duration ? `  |  ${formatSeconds(song.duration)} mins` : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.heartBtn}>
            <Ionicons name="heart-outline" size={22} color={palette.primary} />
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
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    songPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    previewThumb: {
        width: 52,
        height: 52,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewInfo: { flex: 1, minWidth: 0 },
    previewTitle: { fontSize: 15, fontWeight: '600' },
    previewMeta: { fontSize: 12, marginTop: 3 },
    heartBtn: { padding: 4 },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 16,
    },
    optionIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabel: { fontSize: 15, fontWeight: '400' },
});
