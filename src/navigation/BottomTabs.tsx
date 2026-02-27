import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { ArtistScreen } from "@/screens/Artist/ArtistScreen";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { PlaylistScreen } from "@/screens/Playlist/PlaylistScreen";
import { ProfileScreen } from "@/screens/Profile/ProfileScreen";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { useThemeStore } from "@/store/theme.store";
import { colors } from "@/theme/colors";

export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Playlists: undefined;
  Settings: undefined;
  Artist:
    | { artistId?: string; artistName: string; artistImageUrl?: string }
    | undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

type TabIcon = {
  name: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TAB_CONFIG: Record<string, TabIcon> = {
  Home: { name: "home-outline", activeIcon: "home", label: "Home" },
  Search: { name: "search-outline", activeIcon: "search", label: "Search" },
  Playlists: {
    name: "musical-notes-outline",
    activeIcon: "musical-notes",
    label: "Playlists",
  },
  Settings: {
    name: "settings-outline",
    activeIcon: "settings",
    label: "Settings",
  },
  // Hide Artist tab from tab bar, but allow navigation
  Artist: { name: "person-outline", activeIcon: "person", label: "Artist" },
};

export const BottomTabs = () => {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const palette = colors[colorScheme];
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarHideOnKeyboard: true,
      })}
      tabBar={({ state, descriptors, navigation }) => (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            alignItems: "center",
            backgroundColor: palette.background,
            borderTopColor: palette.border,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          }}
        >
          {state.routes.map((route, idx) => {
            if (route.name === "Artist") return null;
            const { options } = descriptors[route.key];
            const isFocused = state.index === idx;
            const cfg = TAB_CONFIG[route.name];
            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 0,
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFocused ? cfg.activeIcon : cfg.name}
                  size={22}
                  color={isFocused ? palette.primary : palette.tabInactive}
                />
                <Text
                  style={{
                    color: isFocused ? palette.primary : palette.tabInactive,
                    fontSize: 10,
                    fontWeight: "500",
                    marginTop: 2,
                  }}
                >
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Playlists" component={PlaylistScreen} />
      <Tab.Screen name="Settings" component={ProfileScreen} />
      <Tab.Screen
        name="Artist"
        component={ArtistScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
};
