import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

import { SafeAreaWrapper } from './SafeAreaWrapper';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

type Props = ViewProps & {
  children: React.ReactNode;
};

export const ScreenContainer: React.FC<Props> = ({ children, style, ...rest }) => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];

  return (
    <SafeAreaWrapper>
      <View
        style={[styles.container, { backgroundColor: palette.background }, style]}
        {...rest}>
        {children}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

