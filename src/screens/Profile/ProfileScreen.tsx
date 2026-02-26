import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

type SettingRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type?: 'arrow' | 'toggle' | 'value';
  value?: string;
};

const SETTINGS_ROWS: SettingRow[] = [
  { icon: 'person-circle-outline', label: 'Account', type: 'arrow' },
  { icon: 'notifications-outline', label: 'Notifications', type: 'arrow' },
  { icon: 'cloud-download-outline', label: 'Downloads', type: 'arrow' },
  { icon: 'wifi-outline', label: 'Stream Quality', type: 'value', value: '320 kbps' },
  { icon: 'musical-note-outline', label: 'Equalizer', type: 'arrow' },
  { icon: 'globe-outline', label: 'Language', type: 'value', value: 'English' },
  { icon: 'information-circle-outline', label: 'About', type: 'arrow' },
];

export const ProfileScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const { toggleTheme } = useThemeStore();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
        </View>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: palette.text }]}>Lokal User</Text>
            <Text style={[styles.userSub, { color: palette.textSecondary }]}>Premium Listener</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="pencil-outline" size={20} color={palette.primary} />
          </TouchableOpacity>
        </View>

        {/* Dark mode toggle */}
        <View style={[styles.card, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconCircle, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
              <Ionicons
                name={colorScheme === 'dark' ? 'moon' : 'sunny'}
                size={18}
                color={palette.primary}
              />
            </View>
            <Text style={[styles.rowLabel, { color: palette.text }]}>Dark Mode</Text>
            <Switch
              value={colorScheme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ true: palette.primary, false: palette.border }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Settings rows */}
        <View style={[styles.card, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          {SETTINGS_ROWS.map((row, idx) => (
            <React.Fragment key={row.label}>
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
                <View style={[styles.iconCircle, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
                  <Ionicons name={row.icon} size={18} color={palette.primary} />
                </View>
                <Text style={[styles.rowLabel, { color: palette.text, flex: 1 }]}>{row.label}</Text>
                {row.type === 'value' && (
                  <Text style={[styles.rowValue, { color: palette.textSecondary }]}>{row.value}</Text>
                )}
                {(row.type === 'arrow' || row.type === 'value') && (
                  <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
                )}
              </TouchableOpacity>
              {idx < SETTINGS_ROWS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: palette.textSecondary }]}>Mume v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 140 },
  header: { paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 17, fontWeight: '700' },
  userSub: { fontSize: 13, marginTop: 3 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 14 },
  divider: { height: 1, marginLeft: 62 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
