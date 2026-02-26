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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── lyrics fetchers ──────────────────────────────────────────────────────────

/** 1. lrclib.net — broad multilingual catalog, good for Bollywood */
async function fetchFromLrcLib(artist: string, title: string): Promise<string[]> {
    try {
        const cleanArtist = artist.split(',')[0].trim();
        const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/&quot;/g, '"').trim();
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) return [];
        const json = await res.json();
        // prefer synced lyrics (lrc format), fall back to plain text
        const raw: string = json.syncedLyrics ?? json.plainLyrics ?? '';
        if (!raw) return [];
        return raw
            .split('\n')
            .map((l: string) => l.replace(/^\[.*?\]\s?/, '').trim()) // strip timestamps
            .filter((l: string, i: number, arr: string[]) => {
                if (!l) return i > 0 && arr[i - 1] !== '';
                return true;
            });
    } catch {
        return [];
    }
}

/** 2. lyrics.ovh — English / Western fallback */
async function fetchFromLyricsOvh(artist: string, title: string): Promise<string[]> {
    try {
        const cleanArtist = artist.split(',')[0].trim();
        const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return [];
        const json = await res.json();
        if (!json.lyrics) return [];
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

async function fetchLyrics(artist: string, title: string): Promise<string[]> {
    // Try lrclib first (better for Bollywood/Hindi)
    const lines = await fetchFromLrcLib(artist, title);
    if (lines.length > 0) return lines;
    // Fall back to lyrics.ovh
    return fetchFromLyricsOvh(artist, title);
}

// ─────────────────────────────────────────────────────────────────────────────

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
    const isDark = colorScheme === 'dark';

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

    // Theme-aware gradient colors
    const gradColors: [string, string, string] = isDark
        ? ['#0D0D0D', '#181818', '#0D0D0D']
        : ['#F0F0F5', '#FAFAFA', '#F0F0F5'];

    const textMain = isDark ? '#FFFFFF' : '#111111';
    const textDim = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)';
    const textPast = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
    const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const handleColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)';

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
                {/* Theme-aware gradient background */}
                <LinearGradient
                    colors={gradColors}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.handle, { backgroundColor: handleColor }]} />
                    <Text style={[styles.headerTitle, { color: textMain }]}>Lyrics</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="chevron-down" size={24} color={textMain} />
                    </TouchableOpacity>
                </View>

                {/* Song info */}
                <View style={[styles.songInfo, { borderBottomColor: borderColor }]}>
                    <Text style={[styles.songName, { color: textMain }]} numberOfLines={1}>{songName}</Text>
                    <Text style={[styles.artistName, { color: textMuted }]} numberOfLines={1}>{artistName}</Text>
                </View>

                {/* Lyrics list */}
                {loading && (
                    <View style={styles.center}>
                        <ActivityIndicator color={palette.primary} size="large" />
                        <Text style={[styles.loadingText, { color: textMuted }]}>Loading lyrics…</Text>
                    </View>
                )}

                {!loading && error && (
                    <View style={styles.center}>
                        <Ionicons name="musical-notes-outline" size={48} color={textDim} />
                        <Text style={[styles.errorText, { color: textMuted }]}>
                            Lyrics not available for this song.
                        </Text>
                        <Text style={[styles.errorSub, { color: textPast }]}>
                            Try searching on Google for "{songName.split('(')[0].trim()} lyrics"
                        </Text>
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
                                        { color: textDim },
                                        isActive && [styles.lyricLineActive, { color: textMain }],
                                        isPast && { color: textPast },
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
        marginBottom: 14,
    },
    headerTitle: {
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
        marginBottom: 6,
    },
    songName: {
        fontSize: 14,
        fontWeight: '600',
    },
    artistName: {
        fontSize: 12,
        marginTop: 2,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingBottom: 60,
        paddingHorizontal: 32,
    },
    loadingText: { fontSize: 14, marginTop: 8 },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    errorSub: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    lyricsContent: {
        paddingHorizontal: 28,
        paddingTop: 10,
        paddingBottom: 120,
    },
    lyricLine: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 38,
        marginVertical: 2,
    },
    lyricLineActive: {
        fontSize: 26,
        lineHeight: 44,
    },
    lyricBlank: {
        lineHeight: 20,
        marginVertical: 0,
    },
});
