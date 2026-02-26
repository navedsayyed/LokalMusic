import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

type Playlist = {
  id: string;
  name: string;
  songCount: number;
  image?: string;
};

const MOCK_PLAYLISTS: Playlist[] = [
  { id: '1', name: 'Favorites', songCount: 24, image: 'https://c.saavncdn.com/584/Jab-Harry-Met-Sejal-Hindi-2017-20170803161007-500x500.jpg' },
  { id: '2', name: 'Chill Vibes', songCount: 18, image: 'https://c.saavncdn.com/430/Aashiqui-2-Hindi-2013-500x500.jpg' },
  { id: '3', name: 'Workout Hits', songCount: 32, image: 'https://c.saavncdn.com/161/Save-Your-Tears-English-2020-20201017050136-500x500.jpg' },
  { id: '4', name: 'Late Night', songCount: 15, image: 'https://c.saavncdn.com/830/Without-You-English-2021-20210618141520-500x500.jpg' },
];

export const PlaylistScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const [activeTab, setActiveTab] = useState<'Favorites' | 'Playlists'>('Playlists');

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: palette.text }]}>{activeTab}</Text>
      <TouchableOpacity style={[styles.createBtn, { backgroundColor: palette.primary }]}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createBtnText}>New Playlist</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {renderHeader()}
        <FlatList
          data={MOCK_PLAYLISTS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={56} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No playlists yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.playlistRow} activeOpacity={0.7}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.playlistThumb} />
              ) : (
                <View style={[styles.playlistThumb, styles.thumbPlaceholder, { backgroundColor: palette.backgroundSecondary }]}>
                  <Ionicons name="musical-notes" size={24} color={palette.textSecondary} />
                </View>
              )}
              <View style={styles.playlistInfo}>
                <Text style={[styles.playlistName, { color: palette.text }]}>{item.name}</Text>
                <Text style={[styles.playlistCount, { color: palette.textSecondary }]}>
                  {item.songCount} songs
                </Text>
              </View>
              <TouchableOpacity style={styles.playlistPlayBtn}>
                <Ionicons name="play-circle" size={36} color={palette.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  playlistThumb: { width: 60, height: 60, borderRadius: 12 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  playlistInfo: { flex: 1 },
  playlistName: { fontSize: 16, fontWeight: '600' },
  playlistCount: { fontSize: 13, marginTop: 3 },
  playlistPlayBtn: {},
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
