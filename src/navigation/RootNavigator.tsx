import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { StyleSheet, View } from "react-native";

import { MiniPlayer } from "@/components/music/MiniPlayer";
import { PlayerScreen } from "@/screens/Player/PlayerScreen";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { useUIStore } from "@/store/ui.store";
import { BottomTabs } from "./BottomTabs";

export type RootStackParamList = {
  MainTabs: undefined;
  Search: undefined;
  Player: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Only show MiniPlayer when the full player is NOT open
const ConditionalMiniPlayer = () => {
  const isPlayerOpen = useUIStore((s) => s.isPlayerOpen);
  if (isPlayerOpen) return null;
  return <MiniPlayer />;
};

export const RootNavigator = () => {
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ presentation: "modal" }}
        />
      </Stack.Navigator>
      <ConditionalMiniPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
