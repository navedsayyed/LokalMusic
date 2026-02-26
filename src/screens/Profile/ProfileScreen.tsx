import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeStore } from '@/store/theme.store';
import { useSettingsStore } from '@/store/settings.store';
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
  { icon: 'wifi-outline', label: 'Stream Quality', type: 'value' },
  { icon: 'musical-note-outline', label: 'Equalizer', type: 'arrow' },
  { icon: 'globe-outline', label: 'Language', type: 'value' },
  { icon: 'information-circle-outline', label: 'About', type: 'arrow' },
];

export const ProfileScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const { toggleTheme } = useThemeStore();
  const { userName, streamQuality, eqPreset, setUserName, setStreamQuality, setEQPreset } =
    useSettingsStore();
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [draftName, setDraftName] = useState(userName);

  const handleRowPress = (label: string) => {
    switch (label) {
      case 'Account':
        Alert.alert('Account', 'Account screen is intentionally left blank for now.');
        break;
      case 'Notifications':
        Linking.openSettings().catch(() => {
          Alert.alert('Error', 'Unable to open system settings for this app.');
        });
        break;
      case 'Downloads':
        Alert.alert(
          'Downloads',
          'Downloaded songs will appear here once you save tracks for offline listening.',
        );
        break;
      case 'Stream Quality':
        Alert.alert(
          'Stream Quality',
          'Long-press options in a future version.\nFor now, quality is controlled by the setting below.',
        );
        break;
      case 'Equalizer':
        Alert.alert(
          'Equalizer',
          `Current preset: ${eqPreset}\nVisual-only EQ; audio processing is not changed in this demo.`,
        );
        break;
      case 'About':
        Alert.alert(
          'About & Privacy Policy',
          'Lokal Music is a demo music player.\n\nPrivacy Policy:\n- We do not collect personal data.\n- All playback streams directly from the Saavn API.\n- Any preferences are stored only on your device using AsyncStorage.',
        );
        break;
      default:
        break;
    }
  };

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
            <Text style={[styles.userName, { color: palette.text }]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[styles.userSub, { color: palette.textSecondary }]}>Premium Listener</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setDraftName(userName);
              setNameModalVisible(true);
            }}
          >
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
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => handleRowPress(row.label)}
              >
                <View style={[styles.iconCircle, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
                  <Ionicons name={row.icon} size={18} color={palette.primary} />
                </View>
                <Text style={[styles.rowLabel, { color: palette.text, flex: 1 }]}>{row.label}</Text>
                {row.type === 'value' && (
                  <Text style={[styles.rowValue, { color: palette.textSecondary }]}>
                    {row.label === 'Stream Quality' && `${streamQuality}`}
                    {row.label === 'Language' && 'English'}
                  </Text>
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

        {/* Name edit modal */}
        <Modal
          visible={nameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNameModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: palette.card }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Edit name</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.modalInput,
                  { borderColor: palette.border, color: palette.text },
                ]}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setNameModalVisible(false)}
                  style={styles.modalButton}
                >
                  <Text style={{ color: palette.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const trimmed = draftName.trim();
                    if (trimmed.length > 0) setUserName(trimmed);
                    setNameModalVisible(false);
                  }}
                  style={styles.modalButton}
                >
                  <Text style={{ color: palette.primary, fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 16,
  },
  modalButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
