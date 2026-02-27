import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLibraryStore } from '@/store/library.store';
import { EQPreset, useSettingsStore } from '@/store/settings.store';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { DownloadQuality } from '@/types/music.types';

// ── Option sheet ─────────────────────────────────────────────────────────────
type OptionItem = { label: string; value: string; sub?: string };

type OptionSheetProps = {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

const SHEET_MAX = 360;

const OptionSheet: React.FC<OptionSheetProps> = ({
  visible, title, options, selected, onSelect, onClose,
}) => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: SHEET_MAX, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[gStyles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[
        gStyles.sheet,
        { backgroundColor: palette.card, transform: [{ translateY: slideAnim }] },
      ]}>
        <View style={gStyles.handleWrap}>
          <View style={[gStyles.handle, { backgroundColor: palette.border }]} />
        </View>
        <Text style={[gStyles.sheetTitle, { color: palette.text }]}>{title}</Text>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              gStyles.optionRow,
              i < options.length - 1 && { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
            activeOpacity={0.7}
            onPress={() => { onSelect(opt.value); onClose(); }}
          >
            <View style={gStyles.optionInfo}>
              <Text style={[gStyles.optionLabel, { color: palette.text }]}>{opt.label}</Text>
              {opt.sub ? <Text style={[gStyles.optionSub, { color: palette.textSecondary }]}>{opt.sub}</Text> : null}
            </View>
            {selected === opt.value && (
              <Ionicons name="checkmark-circle" size={22} color={palette.primary} />
            )}
          </TouchableOpacity>
        ))}
        <View style={{ paddingBottom: 32 }} />
      </Animated.View>
    </Modal>
  );
};

// ── Quality & EQ options ─────────────────────────────────────────────────────
const QUALITY_OPTIONS: OptionItem[] = [
  { label: '96 kbps', value: '96kbps', sub: 'Low — saves data' },
  { label: '160 kbps', value: '160kbps', sub: 'Medium — balanced' },
  { label: '320 kbps', value: '320kbps', sub: 'High — best quality' },
];

const EQ_OPTIONS: OptionItem[] = [
  { label: 'Normal', value: 'normal', sub: 'Flat response' },
  { label: 'Bass Boost', value: 'bassBoost', sub: 'Enhanced low frequencies' },
  { label: 'Pop', value: 'pop', sub: 'Bright mids & highs' },
  { label: 'Rock', value: 'rock', sub: 'Strong mids & punch' },
  { label: 'Classical', value: 'classical', sub: 'Wide dynamic range' },
];

const EQ_LABELS: Record<EQPreset, string> = {
  normal: 'Normal',
  bassBoost: 'Bass Boost',
  pop: 'Pop',
  rock: 'Rock',
  classical: 'Classical',
};

// ── ProfileScreen ─────────────────────────────────────────────────────────────
export const ProfileScreen = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const palette = colors[colorScheme];
  const { toggleTheme } = useThemeStore();
  const { userName, streamQuality, eqPreset, setUserName, setStreamQuality, setEQPreset } =
    useSettingsStore();

  const likedCount = useLibraryStore((s) => s.likedSongs.length);
  const playlistCount = useLibraryStore((s) => s.playlists.length);
  const downloadCount = useLibraryStore((s) => s.downloads.length);

  // Name edit
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [draftName, setDraftName] = useState(userName);

  // Option sheets
  const [qualitySheetOpen, setQualitySheetOpen] = useState(false);
  const [eqSheetOpen, setEqSheetOpen] = useState(false);

  const iconBg = colorScheme === 'dark' ? '#1F2937' : '#F3F4F6';

  const handleNotificationSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
          { key: 'android.provider.extra.APP_PACKAGE', value: 'com.navedsayyed.lokalmusic' },
        ]);
      } else {
        await Linking.openSettings();
      }
    } catch {
      try { await Linking.openSettings(); } catch {
        Alert.alert('Error', 'Could not open notification settings.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
        </View>

        {/* ── User Card ── */}
        <View style={[styles.userCard, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Text style={styles.avatarInitial}>{(userName[0] ?? 'L').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: palette.text }]} numberOfLines={1}>{userName}</Text>
            <Text style={[styles.userSub, { color: palette.textSecondary }]}>Music Listener</Text>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: palette.primary + '22', borderColor: palette.primary + '44' }]}
            onPress={() => { setDraftName(userName); setNameModalVisible(true); }}
          >
            <Ionicons name="pencil-outline" size={16} color={palette.primary} />
            <Text style={[styles.editBtnText, { color: palette.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        {/* <View style={[styles.statsRow]}>
          {[
            { icon: 'heart', label: 'Liked', value: likedCount, color: '#EF4444' },
            { icon: 'list', label: 'Playlists', value: playlistCount, color: palette.primary },
            { icon: 'download', label: 'Downloads', value: downloadCount, color: '#10B981' },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              <Text style={[styles.statValue, { color: palette.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View> */}

        {/* ── Appearance ── */}
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={colorScheme === 'dark' ? 'moon' : 'sunny'} size={18} color={palette.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: palette.text, flex: 1 }]}>Dark Mode</Text>
            <Switch
              value={colorScheme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ true: palette.primary, false: palette.border }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Playback ── */}
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>PLAYBACK</Text>
        <View style={[styles.card, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          {/* Stream Quality */}
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => setQualitySheetOpen(true)}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name="wifi-outline" size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: palette.text }]}>Stream Quality</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>
                {QUALITY_OPTIONS.find(q => q.value === streamQuality)?.label ?? streamQuality}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* EQ Preset */}
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => setEqSheetOpen(true)}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name="musical-note-outline" size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: palette.text }]}>EQ Preset</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>{EQ_LABELS[eqPreset]}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Account & Info ── */}
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>ACCOUNT & INFO</Text>
        <View style={[styles.card, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
          {/* Notifications */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={handleNotificationSettings}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name="notifications-outline" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: palette.text, flex: 1 }]}>Notifications</Text>
            <Ionicons name="open-outline" size={16} color={palette.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* About */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'About LokalMusic',
                'Version 1.0.0\n\nFree, open-source music player powered by the JioSaavn API.\n\n• All playback streams from JioSaavn CDN\n• We do not collect personal data\n• Preferences stored locally via AsyncStorage\n\nBuilt with React Native + Expo ❤️',
              )
            }
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: palette.text, flex: 1 }]}>About LokalMusic</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Rate the app */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Rate us ⭐', 'Thank you for using LokalMusic!')}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name="star-outline" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: palette.text, flex: 1 }]}>Rate the App</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: palette.textSecondary }]}>LokalMusic v1.0.0</Text>
      </ScrollView>

      {/* ── Name Edit Modal ── */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={gStyles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.card }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Edit Name</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor={palette.textSecondary}
              autoFocus
              style={[styles.modalInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.backgroundSecondary }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNameModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: palette.textSecondary, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { const t = draftName.trim(); if (t) setUserName(t); setNameModalVisible(false); }}
                style={[styles.modalSaveBtn, { backgroundColor: palette.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Stream Quality Sheet ── */}
      <OptionSheet
        visible={qualitySheetOpen}
        title="Stream Quality"
        options={QUALITY_OPTIONS}
        selected={streamQuality}
        onSelect={(v) => setStreamQuality(v as DownloadQuality)}
        onClose={() => setQualitySheetOpen(false)}
      />

      {/* ── EQ Preset Sheet ── */}
      <OptionSheet
        visible={eqSheetOpen}
        title="EQ Preset"
        options={EQ_OPTIONS}
        selected={eqPreset}
        onSelect={(v) => setEQPreset(v as EQPreset)}
        onClose={() => setEqSheetOpen(false)}
      />
    </SafeAreaView>
  );
};

// ── Shared styles (used by OptionSheet + ProfileScreen) ──────────────────────
const gStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: {
    fontSize: 17, fontWeight: '700',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '500' },
  optionSub: { fontSize: 12, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 140 },
  header: { paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '700' },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 14,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 17, fontWeight: '700' },
  userSub: { fontSize: 13, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11 },

  // Section label
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },

  // Card
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 18, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconCircle: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Name modal
  modalCard: { width: '85%', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  modalSaveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
});
