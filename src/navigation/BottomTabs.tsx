import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '@/screens/Home/HomeScreen';
import { SearchScreen } from '@/screens/Search/SearchScreen';
import { PlaylistScreen } from '@/screens/Playlist/PlaylistScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Playlists: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

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
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') iconName = 'home';
          if (route.name === 'Search') iconName = 'search';
          if (route.name === 'Playlists') iconName = 'musical-notes';
          if (route.name === 'Profile') iconName = 'person';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Playlists" component={PlaylistScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

