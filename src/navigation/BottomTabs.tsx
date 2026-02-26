import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '@/screens/Home/HomeScreen';
import { PlaylistScreen } from '@/screens/Playlist/PlaylistScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

export type BottomTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Playlists: undefined;
  Settings: undefined;
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
          if (route.name === 'Favorites') iconName = 'heart';
          if (route.name === 'Playlists') iconName = 'musical-notes';
          if (route.name === 'Settings') iconName = 'settings';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Favorites"
        component={PlaylistScreen}
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen
        name="Playlists"
        component={PlaylistScreen}
        options={{ title: 'Playlists' }}
      />
      <Tab.Screen
        name="Settings"
        component={ProfileScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

