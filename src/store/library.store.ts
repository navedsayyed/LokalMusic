/**
 * library.store.ts
 *
 * Persisted Zustand store for:
 *  - User-created playlists
 *  - Liked songs
 *  - Downloaded songs (metadata only; actual files managed by download.service)
 */

import { Song } from '@/types/music.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Playlist = {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
};

export type DownloadedSong = Song & {
    localUri: string;  // file:// path on device
    downloadedAt: number;
};

type LibraryState = {
    playlists: Playlist[];
    likedSongs: Song[];
    downloads: DownloadedSong[];

    // Playlist actions
    createPlaylist: (name: string) => Playlist;
    deletePlaylist: (id: string) => void;
    renamePlaylist: (id: string, name: string) => void;
    addSongToPlaylist: (playlistId: string, song: Song) => void;
    removeSongFromPlaylist: (playlistId: string, songId: string) => void;

    // Liked songs
    toggleLike: (song: Song) => void;
    isLiked: (songId: string) => boolean;

    // Downloads
    addDownload: (song: DownloadedSong) => void;
    removeDownload: (songId: string) => void;
    isDownloaded: (songId: string) => boolean;
    getDownloadedSong: (songId: string) => DownloadedSong | undefined;
};

export const useLibraryStore = create<LibraryState>()(
    persist(
        (set, get) => ({
            playlists: [],
            likedSongs: [],
            downloads: [],

            // ── Playlists ──────────────────────────────────────────
            createPlaylist: (name) => {
                const playlist: Playlist = {
                    id: Date.now().toString(),
                    name: name.trim(),
                    songs: [],
                    createdAt: Date.now(),
                };
                set((s) => ({ playlists: [...s.playlists, playlist] }));
                return playlist;
            },

            deletePlaylist: (id) =>
                set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

            renamePlaylist: (id, name) =>
                set((s) => ({
                    playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
                })),

            addSongToPlaylist: (playlistId, song) =>
                set((s) => ({
                    playlists: s.playlists.map((p) =>
                        p.id === playlistId && !p.songs.find((x) => x.id === song.id)
                            ? { ...p, songs: [...p.songs, song] }
                            : p
                    ),
                })),

            removeSongFromPlaylist: (playlistId, songId) =>
                set((s) => ({
                    playlists: s.playlists.map((p) =>
                        p.id === playlistId
                            ? { ...p, songs: p.songs.filter((x) => x.id !== songId) }
                            : p
                    ),
                })),

            // ── Liked songs ────────────────────────────────────────
            toggleLike: (song) =>
                set((s) => {
                    const exists = s.likedSongs.find((x) => x.id === song.id);
                    return {
                        likedSongs: exists
                            ? s.likedSongs.filter((x) => x.id !== song.id)
                            : [song, ...s.likedSongs],
                    };
                }),

            isLiked: (songId) => get().likedSongs.some((x) => x.id === songId),

            // ── Downloads ──────────────────────────────────────────
            addDownload: (song) =>
                set((s) => ({
                    downloads: s.downloads.find((x) => x.id === song.id)
                        ? s.downloads
                        : [song, ...s.downloads],
                })),

            removeDownload: (songId) =>
                set((s) => ({ downloads: s.downloads.filter((x) => x.id !== songId) })),

            isDownloaded: (songId) => get().downloads.some((x) => x.id === songId),

            getDownloadedSong: (songId) => get().downloads.find((x) => x.id === songId),
        }),
        {
            name: 'lokal-library',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
