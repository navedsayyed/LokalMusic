import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";

const mockRecentlyPlayed = [
  {
    id: "1",
    title: "Hawayein",
    artist: "Arijit Singh",
    image:
      "https://c.saavncdn.com/584/Jab-Harry-Met-Sejal-Hindi-2017-20170803161007-150x150.jpg",
  },
  {
    id: "2",
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    image: "https://c.saavncdn.com/430/Aashiqui-2-Hindi-2013-150x150.jpg",
  },
];

const mockArtists = [
  {
    id: "459320",
    name: "Arijit Singh",
    image:
      "https://c.saavncdn.com/artists/Arijit_Singh_005_20241021173209_150x150.jpg",
  },
];

type HomeTab = "Suggested" | "Songs" | "Artists" | "Albums";

export const HomeScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const [activeTab, setActiveTab] = useState<HomeTab>("Suggested");
  const router = useRouter();
  const navigation = useNavigation();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="musical-notes" size={22} color={palette.primary} />
          <Text style={[styles.logo, { color: palette.text }]}>Mume</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              // Prefer expo-router when available (app routes). If not available
              // (this screen is rendered by React Navigation), fall back to
              // React Navigation's `navigate`.
              try {
                if (router && typeof router.push === "function") {
                  router.push("/search");
                  return;
                }
              } catch (e) {
                // ignore and try navigation
              }

              // React Navigation fallback
              try {
                // @ts-ignore
                if (
                  navigation &&
                  typeof (navigation as any).navigate === "function"
                ) {
                  // attempt to navigate to a 'Search' route if registered
                  // otherwise this will be a no-op and surface a warning
                  // in the native navigation stack.
                  // @ts-ignore
                  (navigation as any).navigate("Search");
                  return;
                }
              } catch (e) {
                // ignore
              }

              console.warn("No router or navigation available to open Search");
            }}
            style={[
              styles.iconCircle,
              { backgroundColor: palette.backgroundSecondary },
            ]}
            accessibilityLabel="Open search"
          >
            <Ionicons name="search" size={20} color={palette.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {(["Suggested", "Songs", "Artists", "Albums"] as HomeTab[]).map(
          (tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? palette.primary : palette.textSecondary },
                  ]}
                >
                  {tab}
                </Text>
                {active && (
                  <View
                    style={[
                      styles.tabIndicator,
                      { backgroundColor: palette.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          },
        )}
      </View>

      {activeTab === "Suggested" ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Recently Played
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: palette.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={mockRecentlyPlayed}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.albumCard}>
                <Image source={{ uri: item.image }} style={styles.albumImage} />
                <Text
                  style={[styles.albumTitle, { color: palette.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.albumSubtitle,
                    { color: palette.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.artist}
                </Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Artists
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: palette.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={mockArtists}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.artistCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.artistImage}
                />
                <Text
                  style={[styles.artistName, { color: palette.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Most Played
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: palette.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={mockRecentlyPlayed}
            keyExtractor={(item) => `most-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.albumCard}>
                <Image source={{ uri: item.image }} style={styles.albumImage} />
                <Text
                  style={[styles.albumTitle, { color: palette.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.albumSubtitle,
                    { color: palette.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.artist}
                </Text>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
            {activeTab} view coming soon
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAll: {
    fontSize: 12,
    fontWeight: "500",
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
    fontWeight: "600",
  },
  albumSubtitle: {
    fontSize: 12,
  },
  artistCard: {
    alignItems: "center",
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
    fontWeight: "500",
  },
  tabsRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 4,
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabIndicator: {
    marginTop: 4,
    height: 3,
    borderRadius: 999,
    width: "60%",
  },
});
