import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';

import { HomeScreen } from '@/screens/Home/HomeScreen';
import { PlaylistScreen } from '@/screens/Playlist/PlaylistScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';
import { SearchScreen } from '@/screens/Search/SearchScreen';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Playlists: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

type TabIcon = {
  name: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TAB_CONFIG: Record<string, TabIcon> = {
  Home: { name: 'home-outline', activeIcon: 'home', label: 'Home' },
  Search: { name: 'search-outline', activeIcon: 'search', label: 'Search' },
  Playlists: { name: 'musical-notes-outline', activeIcon: 'musical-notes', label: 'Playlists' },
  Settings: { name: 'settings-outline', activeIcon: 'settings', label: 'Settings' },
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
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 10, fontWeight: '500' }}>
            {TAB_CONFIG[route.name]?.label ?? route.name}
          </Text>
        ),
        tabBarIcon: ({ color, focused }) => {
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;
          return (
            <Ionicons
              name={focused ? cfg.activeIcon : cfg.name}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Playlists" component={PlaylistScreen} options={{ title: 'Playlists' }} />
      <Tab.Screen name="Settings" component={ProfileScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};
