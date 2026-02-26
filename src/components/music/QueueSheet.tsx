import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadAndPlayCurrent } from '@/services/player/audio.service';
import { usePlayerStore } from '@/store/player.store';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { Song } from '@/types/music.types';

const ITEM_HEIGHT = 68;

type Props = {
    visible: boolean;
    onClose: () => void;
};

type DragState = {
    active: boolean;
    fromIndex: number; // index within upNext array
    currentY: number;
    startY: number;
    toIndex: number;
};

export const QueueSheet = ({ visible, onClose }: Props) => {
    const colorScheme = useThemeStore((s) => s.colorScheme);
    const palette = colors[colorScheme];
    const insets = useSafeAreaInsets();

    const { queue, currentIndex, shuffle, toggleShuffle, repeatMode, cycleRepeat, reorderQueue, removeFromQueue } =
        usePlayerStore();

    // "Up Next" = everything after current index
    const upNext = queue.slice(currentIndex + 1);
    const nowPlaying = queue[currentIndex];

    // ─── Drag state ────────────────────────────────────────────────────────────
    const [drag, setDrag] = useState<DragState>({
        active: false,
        fromIndex: -1,
        currentY: 0,
        startY: 0,
        toIndex: -1,
    });
    const dragAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);

    const calcToIndex = (fromIndex: number, dy: number): number => {
        const raw = fromIndex + Math.round(dy / ITEM_HEIGHT);
        return Math.max(0, Math.min(upNext.length - 1, raw));
    };

    const createDragResponder = useCallback(
        (itemIndex: number) =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                    setDrag({ active: true, fromIndex: itemIndex, currentY: 0, startY: 0, toIndex: itemIndex });
                    dragAnim.setValue(0);
                    // Disable scroll while dragging
                    scrollRef.current?.setNativeProps({ scrollEnabled: false });
                },
                onPanResponderMove: (_, gs) => {
                    dragAnim.setValue(gs.dy);
                    setDrag((prev) => ({
                        ...prev,
                        currentY: gs.dy,
                        toIndex: calcToIndex(itemIndex, gs.dy),
                    }));
                },
                onPanResponderRelease: (_, gs) => {
                    const to = calcToIndex(itemIndex, gs.dy);
                    scrollRef.current?.setNativeProps({ scrollEnabled: true });
                    if (to !== itemIndex) {
                        // Absolute indices in the full queue
                        reorderQueue(currentIndex + 1 + itemIndex, currentIndex + 1 + to);
                    }
                    dragAnim.setValue(0);
                    setDrag({ active: false, fromIndex: -1, currentY: 0, startY: 0, toIndex: -1 });
                },
                onPanResponderTerminate: () => {
                    scrollRef.current?.setNativeProps({ scrollEnabled: true });
                    dragAnim.setValue(0);
                    setDrag({ active: false, fromIndex: -1, currentY: 0, startY: 0, toIndex: -1 });
                },
            }),
        [currentIndex, upNext.length, reorderQueue, dragAnim],
    );

    const handleJumpTo = async (absoluteIndex: number) => {
        usePlayerStore.getState().setQueueAndPlay(queue, absoluteIndex);
        await loadAndPlayCurrent();
    };

    const handleRemove = (absoluteIndex: number) => {
        Alert.alert('Remove from Queue', 'Remove this song from the queue?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeFromQueue(absoluteIndex) },
        ]);
    };

    // ─── Render helpers ────────────────────────────────────────────────────────
    const renderUpNextItem = (item: Song, index: number) => {
        const absoluteIndex = currentIndex + 1 + index;
        const isDragging = drag.active && drag.fromIndex === index;
        const responder = createDragResponder(index);

        // Visual slot displacement: items between fromIndex and toIndex shift
        let translateY = 0;
        if (drag.active && drag.fromIndex !== -1 && !isDragging) {
            const { fromIndex, toIndex } = drag;
            if (fromIndex < toIndex) {
                if (index > fromIndex && index <= toIndex) translateY = -ITEM_HEIGHT;
            } else if (fromIndex > toIndex) {
                if (index >= toIndex && index < fromIndex) translateY = ITEM_HEIGHT;
            }
        }

        return (
            <View key={`${item.id}_${index}`} style={{ height: ITEM_HEIGHT }}>
                {/* Placeholder behind dragging item */}
                {isDragging && (
                    <View style={[styles.dragPlaceholder, { borderColor: palette.primary + '44' }]} />
                )}
                <Animated.View
                    style={[
                        styles.row,
                        {
                            transform: [
                                { translateY: isDragging ? dragAnim : translateY },
                            ],
                            zIndex: isDragging ? 100 : 1,
                            opacity: isDragging ? 0.95 : 1,
                            backgroundColor: isDragging ? palette.backgroundSecondary : 'transparent',
                            borderRadius: isDragging ? 12 : 0,
                            elevation: isDragging ? 8 : 0,
                            shadowColor: isDragging ? '#000' : 'transparent',
                            shadowOpacity: isDragging ? 0.25 : 0,
                            shadowRadius: isDragging ? 8 : 0,
                        },
                    ]}
                >
                    {/* Album art */}
                    <TouchableOpacity onPress={() => handleJumpTo(absoluteIndex)} activeOpacity={0.7}>
                        {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                        ) : (
                            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: palette.backgroundSecondary }]}>
                                <Ionicons name="musical-note" size={16} color={palette.textSecondary} />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Song info */}
                    <TouchableOpacity style={styles.rowText} onPress={() => handleJumpTo(absoluteIndex)} activeOpacity={0.7}>
                        <Text style={[styles.songName, { color: palette.text }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.artistName, { color: palette.textSecondary }]} numberOfLines={1}>
                            {item.primaryArtists}
                        </Text>
                    </TouchableOpacity>

                    {/* Remove button */}
                    <TouchableOpacity
                        onPress={() => handleRemove(absoluteIndex)}
                        style={styles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle-outline" size={18} color={palette.textSecondary} />
                    </TouchableOpacity>

                    {/* Drag handle */}
                    <View
                        {...responder.panHandlers}
                        style={styles.dragHandle}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="reorder-three-outline" size={22} color={palette.textSecondary} />
                    </View>
                </Animated.View>
            </View>
        );
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <View
                style={[
                    styles.sheet,
                    { backgroundColor: palette.background, paddingBottom: insets.bottom + 16 },
                ]}
            >
                {/* Handle bar */}
                <View style={[styles.handle, { backgroundColor: palette.border }]} />

                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: palette.text }]}>Queue</Text>
                    <View style={styles.headerRight}>
                        {/* Shuffle toggle */}
                        <TouchableOpacity onPress={toggleShuffle} style={styles.headerBtn}>
                            <Ionicons
                                name="shuffle"
                                size={22}
                                color={shuffle ? palette.primary : palette.textSecondary}
                            />
                            {shuffle && <View style={[styles.activeDot, { backgroundColor: palette.primary }]} />}
                        </TouchableOpacity>
                        {/* Repeat cycle */}
                        <TouchableOpacity onPress={cycleRepeat} style={styles.headerBtn}>
                            <Ionicons
                                name="repeat"
                                size={22}
                                color={repeatMode !== 'off' ? palette.primary : palette.textSecondary}
                            />
                            {repeatMode === 'one' && (
                                <Text style={[styles.repeatBadge, { color: palette.primary }]}>1</Text>
                            )}
                            {repeatMode !== 'off' && (
                                <View style={[styles.activeDot, { backgroundColor: palette.primary }]} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!drag.active}
                    style={{ maxHeight: 480 }}
                    contentContainerStyle={{ paddingBottom: 8 }}
                >
                    {/* Now Playing */}
                    {nowPlaying && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                                NOW PLAYING
                            </Text>
                            <View style={[styles.nowPlayingRow, { backgroundColor: palette.backgroundSecondary }]}>
                                {nowPlaying.imageUrl ? (
                                    <Image source={{ uri: nowPlaying.imageUrl }} style={[styles.thumb, { borderRadius: 8 }]} />
                                ) : (
                                    <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: palette.background, borderRadius: 8 }]}>
                                        <Ionicons name="musical-note" size={16} color={palette.primary} />
                                    </View>
                                )}
                                <View style={styles.rowText}>
                                    <Text style={[styles.songName, { color: palette.primary }]} numberOfLines={1}>
                                        {nowPlaying.name}
                                    </Text>
                                    <Text style={[styles.artistName, { color: palette.textSecondary }]} numberOfLines={1}>
                                        {nowPlaying.primaryArtists}
                                    </Text>
                                </View>
                                <Ionicons name="musical-notes" size={18} color={palette.primary} />
                            </View>
                        </View>
                    )}

                    {/* Up Next */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                            NEXT IN QUEUE  ({upNext.length})
                        </Text>

                        {upNext.length === 0 ? (
                            <View style={styles.empty}>
                                <Ionicons name="musical-notes-outline" size={36} color={palette.textSecondary} />
                                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                                    No more songs in queue
                                </Text>
                                <Text style={[styles.emptyHint, { color: palette.textSecondary }]}>
                                    Long-press any song → "Add to Queue"
                                </Text>
                            </View>
                        ) : (
                            <View>
                                {upNext.map((item, index) => renderUpNextItem(item, index))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -4 },
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerRight: { flexDirection: 'row', gap: 4 },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    activeDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
    repeatBadge: { position: 'absolute', top: 5, right: 5, fontSize: 9, fontWeight: '800' },
    section: { marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
    nowPlayingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        height: ITEM_HEIGHT,
        gap: 10,
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    dragPlaceholder: {
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT - 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    thumb: { width: 48, height: 48, borderRadius: 8 },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1 },
    songName: { fontSize: 14, fontWeight: '600' },
    artistName: { fontSize: 12, marginTop: 2 },
    removeBtn: { padding: 4 },
    dragHandle: {
        padding: 4,
        marginLeft: 2,
    },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 6 },
    emptyText: { fontSize: 14, fontWeight: '600' },
    emptyHint: { fontSize: 12 },
});
