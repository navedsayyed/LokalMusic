import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image } from 'react-native';

import { BottomTabs } from './BottomTabs';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

export type DrawerParamList = {
  Tabs: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerHeader = () => {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const palette = colors[colorScheme];

  return (
    <View style={[styles.header, { backgroundColor: palette.background }]}>
      <Image
        source={require('../../assets/images/icon.png')}
        style={styles.avatar}
        resizeMode="cover"
      />
      <View>
        <Text style={[styles.name, { color: palette.text }]}>Lokal User</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Premium Listener</Text>
      </View>
    </View>
  );
};

export const DrawerNavigator = () => {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const palette = colors[colorScheme];

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: palette.primary,
        drawerInactiveTintColor: palette.textSecondary,
        drawerStyle: {
          backgroundColor: palette.background,
        },
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
          <DrawerHeader />
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
      )}>
      <Drawer.Screen name="Tabs" component={BottomTabs} options={{ title: 'Home' }} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
});

