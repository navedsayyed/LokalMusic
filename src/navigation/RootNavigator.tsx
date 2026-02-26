import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { StyleSheet, View } from "react-native";

import { MiniPlayer } from "@/components/music/MiniPlayer";
import { PlayerScreen } from "@/screens/Player/PlayerScreen";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { DrawerNavigator } from "./DrawerNavigator";

export type RootStackParamList = {
  MainDrawer: undefined;
  Search: undefined;
  Player: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
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
