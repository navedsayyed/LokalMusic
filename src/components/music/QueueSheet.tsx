import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadAndPlayCurrent } from '@/services/player/audio.service';
import { usePlayerStore } from '@/store/player.store';
import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';
import { Song } from '@/types/music.types';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export const QueueSheet = ({ visible, onClose }: Props) => {
    const colorScheme = useThemeStore((s) => s.colorScheme);
    const palette = colors[colorScheme];
    const insets = useSafeAreaInsets();

    const { queue, currentIndex, shuffle, toggleShuffle, repeatMode, cycleRepeat, reorderQueue, removeFromQueue } =
        usePlayerStore();

    const nowPlaying = queue[currentIndex];
    // upNext = everything after current
    const upNext: Song[] = queue.slice(currentIndex + 1);

    const handleJumpTo = async (absoluteIndex: number) => {
        usePlayerStore.getState().setQueueAndPlay(queue, absoluteIndex);
        await loadAndPlayCurrent();
    };

    const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Song>) => {
        const index = getIndex() ?? 0;
        const absoluteIndex = currentIndex + 1 + index;

        return (
            <ScaleDecorator>
                <View
                    style={[
                        styles.row,
                        isActive && {
                            backgroundColor: palette.backgroundSecondary,
                            borderRadius: 12,
                            elevation: 8,
                            shadowColor: '#000',
                            shadowOpacity: 0.25,
                            shadowRadius: 8,
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
                        onPress={() => removeFromQueue(absoluteIndex)}
                        style={styles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle-outline" size={18} color={palette.textSecondary} />
                    </TouchableOpacity>

                    {/* Drag handle — long press activates drag */}
                    <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={100}
                        style={styles.dragHandle}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name="reorder-three-outline"
                            size={22}
                            color={isActive ? palette.primary : palette.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </ScaleDecorator>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <GestureHandlerRootView
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
                        <TouchableOpacity onPress={toggleShuffle} style={styles.headerBtn}>
                            <Ionicons
                                name="shuffle"
                                size={22}
                                color={shuffle ? palette.primary : palette.textSecondary}
                            />
                            {shuffle && <View style={[styles.activeDot, { backgroundColor: palette.primary }]} />}
                        </TouchableOpacity>
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

                {/* Now Playing */}
                {nowPlaying && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>NOW PLAYING</Text>
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
                <Text style={[styles.sectionLabel, { color: palette.textSecondary, paddingHorizontal: 0, marginBottom: 8 }]}>
                    NEXT IN QUEUE  ({upNext.length})
                </Text>

                {upNext.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="musical-notes-outline" size={36} color={palette.textSecondary} />
                        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No more songs in queue</Text>
                        <Text style={[styles.emptyHint, { color: palette.textSecondary }]}>
                            Long-press any song → "Add to Queue"
                        </Text>
                    </View>
                ) : (
                    <DraggableFlatList
                        data={upNext}
                        keyExtractor={(item, i) => `${item.id}_${i}`}
                        renderItem={renderItem}
                        onDragEnd={({ from, to }) => {
                            if (from !== to) {
                                reorderQueue(currentIndex + 1 + from, currentIndex + 1 + to);
                            }
                        }}
                        style={{ maxHeight: 380 }}
                        contentContainerStyle={{ paddingBottom: 8 }}
                        showsVerticalScrollIndicator={false}
                        activationDistance={5}
                    />
                )}
            </GestureHandlerRootView>
        </Modal>
    );
};

const ITEM_HEIGHT = 68;

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
    thumb: { width: 48, height: 48, borderRadius: 8 },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1 },
    songName: { fontSize: 14, fontWeight: '600' },
    artistName: { fontSize: 12, marginTop: 2 },
    removeBtn: { padding: 4 },
    dragHandle: { padding: 4, marginLeft: 2 },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 6 },
    emptyText: { fontSize: 14, fontWeight: '600' },
    emptyHint: { fontSize: 12 },
});
