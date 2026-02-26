import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

const mockRecentlyPlayed = [
  {
    id: '1',
    title: 'Hawayein',
    artist: 'Arijit Singh',
    image:
      'https://c.saavncdn.com/584/Jab-Harry-Met-Sejal-Hindi-2017-20170803161007-150x150.jpg',
  },
  {
    id: '2',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    image: 'https://c.saavncdn.com/430/Aashiqui-2-Hindi-2013-150x150.jpg',
  },
];

const mockArtists = [
  {
    id: '459320',
    name: 'Arijit Singh',
    image:
      'https://c.saavncdn.com/artists/Arijit_Singh_005_20241021173209_150x150.jpg',
  },
];

export const HomeScreen = () => {
  const navigation = useNavigation();
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: palette.text }]}>Lokal</Text>
        <View style={styles.headerRight}>
          <View style={[styles.iconCircle, { backgroundColor: palette.backgroundSecondary }]}>
            <Text style={{ color: palette.text }}>🔔</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: palette.backgroundSecondary }]} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>Recently Played</Text>
      <FlatList
        data={mockRecentlyPlayed}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.albumCard}>
            <Image source={{ uri: item.image }} style={styles.albumImage} />
            <Text style={[styles.albumTitle, { color: palette.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              style={[styles.albumSubtitle, { color: palette.textSecondary }]}
              numberOfLines={1}>
              {item.artist}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={[styles.sectionTitle, { color: palette.text }]}>Popular Artists</Text>
      <FlatList
        data={mockArtists}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.artistCard}>
            <Image source={{ uri: item.image }} style={styles.artistImage} />
            <Text style={[styles.artistName, { color: palette.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  albumCard: {
    marginRight: 16,
    width: 140,
  },
  albumImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 8,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  albumSubtitle: {
    fontSize: 12,
  },
  artistCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  artistImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 6,
  },
  artistName: {
    fontSize: 13,
    fontWeight: '500',
  },
});

