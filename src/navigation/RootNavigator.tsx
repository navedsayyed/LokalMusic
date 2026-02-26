import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';

import { DrawerNavigator } from './DrawerNavigator';
import { PlayerScreen } from '@/screens/Player/PlayerScreen';
import { MiniPlayer } from '@/components/music/MiniPlayer';

export type RootStackParamList = {
  MainDrawer: undefined;
  Player: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
        <Stack.Screen name="Player" component={PlayerScreen} />
      </Stack.Navigator>
      <MiniPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});


