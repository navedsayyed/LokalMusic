import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/theme.store';
import { lightTheme, darkTheme } from './src/theme';

export default function App() {
  const colorScheme = useThemeStore((state) => state.colorScheme);

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? darkTheme : lightTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

