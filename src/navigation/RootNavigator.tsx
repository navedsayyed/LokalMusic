import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";

import { MiniPlayer } from "@/components/music/MiniPlayer";
import { AlbumScreen } from "@/screens/Album/AlbumScreen";
import { ArtistScreen } from "@/screens/Artist/ArtistScreen";
import { PlayerScreen } from "@/screens/Player/PlayerScreen";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { useUIStore } from "@/store/ui.store";
import { BottomTabs } from "./BottomTabs";

export type RootStackParamList = {
  MainTabs: undefined;
  Search: undefined;
  Player: undefined;
  Album: { albumId?: string; albumName?: string } | undefined;
  Artist: { artistId?: string; artistName: string } | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Hides when the full player is open OR when the keyboard is showing
const ConditionalMiniPlayer = () => {
  const isPlayerOpen = useUIStore((s) => s.isPlayerOpen);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (isPlayerOpen || keyboardVisible) return null;
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
        <Stack.Screen name="Album" component={AlbumScreen} />
        <Stack.Screen name="Artist" component={ArtistScreen} />
      </Stack.Navigator>
      <ConditionalMiniPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
