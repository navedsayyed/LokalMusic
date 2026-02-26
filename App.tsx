import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/theme.store';
import { darkTheme, lightTheme } from './src/theme';

export default function App() {
  const colorScheme = useThemeStore((state) => state.colorScheme);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={colorScheme === 'dark' ? darkTheme : lightTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
