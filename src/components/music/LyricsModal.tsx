import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { useThemeStore } from '@/store/theme.store';
import { colors } from '@/theme/colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

async function fetchLyrics(artist: string, title: string): Promise<string[]> {
    try {
        // Clean up artist/title for the API
        const cleanArtist = artist.split(',')[0].trim();
        const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) return [];
        const json = await res.json();
        if (!json.lyrics) return [];
        // Split into lines, remove blank duplicates
        return json.lyrics
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string, i: number, arr: string[]) => {
                if (!l) return i > 0 && arr[i - 1] !== '';
                return true;
            });
    } catch {
        return [];
    }
}

type Props = {
    visible: boolean;
    onClose: () => void;
    songName: string;
    artistName: string;
    /** 0–1 progress through the song */
    progress: number;
};

export const LyricsModal: React.FC<Props> = ({
    visible,
    onClose,
    songName,
    artistName,
    progress,
}) => {
    const colorScheme = useThemeStore((s) => s.colorScheme);
    const palette = colors[colorScheme];

    const [lyrics, setLyrics] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const activeIndex = Math.min(
        lyrics.length - 1,
        Math.floor(progress * lyrics.length)
    );

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const listRef = useRef<FlatList>(null);

    // Slide in/out
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : SCREEN_HEIGHT,
            useNativeDriver: true,
            tension: 70,
            friction: 12,
        }).start();
    }, [visible]);

    // Fetch lyrics when modal opens
    useEffect(() => {
        if (!visible || !songName) return;
        setLyrics([]);
        setError(false);
        setLoading(true);
        fetchLyrics(artistName, songName)
            .then((lines) => {
                if (lines.length === 0) setError(true);
                else setLyrics(lines);
            })
            .finally(() => setLoading(false));
    }, [visible, songName, artistName]);

    // Auto-scroll active line to center
    useEffect(() => {
        if (lyrics.length > 0 && activeIndex >= 0) {
            listRef.current?.scrollToIndex({
                index: activeIndex,
                animated: true,
                viewPosition: 0.4,
            });
        }
    }, [activeIndex, lyrics.length]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
                {/* Dark gradient background like Spotify */}
                <LinearGradient
                    colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.handle} />
                    <Text style={styles.headerTitle}>Lyrics</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="chevron-down" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Song info */}
                <View style={styles.songInfo}>
                    <Text style={styles.songName} numberOfLines={1}>{songName}</Text>
                    <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
                </View>

                {/* Lyrics list */}
                {loading && (
                    <View style={styles.center}>
                        <ActivityIndicator color="#FF8A00" size="large" />
                        <Text style={styles.loadingText}>Loading lyrics…</Text>
                    </View>
                )}

                {!loading && error && (
                    <View style={styles.center}>
                        <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.errorText}>Lyrics not available for this song.</Text>
                    </View>
                )}

                {!loading && !error && lyrics.length > 0 && (
                    <FlatList
                        ref={listRef}
                        data={lyrics}
                        keyExtractor={(_, i) => String(i)}
                        contentContainerStyle={styles.lyricsContent}
                        showsVerticalScrollIndicator={false}
                        onScrollToIndexFailed={() => { }}
                        renderItem={({ item, index }) => {
                            const isActive = index === activeIndex;
                            const isPast = index < activeIndex;
                            return (
                                <Text
                                    style={[
                                        styles.lyricLine,
                                        isActive && styles.lyricLineActive,
                                        isPast && styles.lyricLinePast,
                                        !item && styles.lyricBlank,
                                    ]}
                                >
                                    {item || ' '}
                                </Text>
                            );
                        }}
                    />
                )}
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.82,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        paddingTop: 14,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginBottom: 14,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
        top: 10,
        padding: 4,
    },
    songInfo: {
        paddingHorizontal: 28,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        marginBottom: 6,
    },
    songName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    artistName: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingBottom: 60,
    },
    loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
    errorText: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 22,
    },
    lyricsContent: {
        paddingHorizontal: 28,
        paddingTop: 10,
        paddingBottom: 120,
    },
    lyricLine: {
        fontSize: 22,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.25)',
        lineHeight: 38,
        marginVertical: 2,
    },
    lyricLineActive: {
        color: '#FFFFFF',
        fontSize: 26,
        lineHeight: 44,
    },
    lyricLinePast: {
        color: 'rgba(255,255,255,0.18)',
    },
    lyricBlank: {
        lineHeight: 20,
        marginVertical: 0,
    },
});
