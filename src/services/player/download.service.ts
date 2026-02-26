/**
 * download.service.ts
 *
 * Handles downloading songs to local device storage using expo-file-system.
 * Downloaded audio files are stored at:
 *   <DocumentDirectory>/downloads/<songId>.mp4
 */

import { DownloadedSong, useLibraryStore } from '@/store/library.store';
import { Song } from '@/types/music.types';
import * as FileSystem from 'expo-file-system';

// documentDirectory exists at runtime; cast to bypass outdated .d.ts
const FS = FileSystem as any;
const DOWNLOADS_DIR = `${FS.documentDirectory ?? ''}downloads/`;

/** Ensure the downloads directory exists */
const ensureDir = async () => {
    const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
};

export type DownloadProgress = {
    songId: string;
    progress: number; // 0–1
    done: boolean;
    error?: string;
};

type ProgressCallback = (p: DownloadProgress) => void;

/** Download a song and register it in the library store */
export const downloadSong = async (
    song: Song,
    onProgress?: ProgressCallback
): Promise<string | null> => {
    if (!song.streamUrl) {
        onProgress?.({ songId: song.id, progress: 0, done: true, error: 'No stream URL' });
        return null;
    }

    // Already downloaded?
    const { isDownloaded, addDownload } = useLibraryStore.getState();
    if (isDownloaded(song.id)) {
        const local = `${DOWNLOADS_DIR}${song.id}.mp4`;
        onProgress?.({ songId: song.id, progress: 1, done: true });
        return local;
    }

    try {
        await ensureDir();
        const localUri = `${DOWNLOADS_DIR}${song.id}.mp4`;

        const downloadResumable = FileSystem.createDownloadResumable(
            song.streamUrl,
            localUri,
            {},
            ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
                const progress =
                    totalBytesExpectedToWrite > 0
                        ? totalBytesWritten / totalBytesExpectedToWrite
                        : 0;
                onProgress?.({ songId: song.id, progress, done: false });
            }
        );

        const result = await downloadResumable.downloadAsync();
        if (!result?.uri) throw new Error('Download failed');

        const downloaded: DownloadedSong = {
            ...song,
            localUri: result.uri,
            downloadedAt: Date.now(),
            // Override streamUrl so the player uses the local file
            streamUrl: result.uri,
        };

        addDownload(downloaded);
        onProgress?.({ songId: song.id, progress: 1, done: true });
        return result.uri;
    } catch (err: any) {
        onProgress?.({
            songId: song.id,
            progress: 0,
            done: true,
            error: err?.message ?? 'Unknown error',
        });
        return null;
    }
};

/** Delete a downloaded song file from disk and remove from store */
export const deleteSongDownload = async (songId: string): Promise<void> => {
    const { removeDownload, getDownloadedSong } = useLibraryStore.getState();
    const song = getDownloadedSong(songId);
    if (song) {
        try {
            await FileSystem.deleteAsync(song.localUri, { idempotent: true });
        } catch { }
    }
    removeDownload(songId);
};

/** Get the local URI for a downloaded song (undefined if not downloaded) */
export const getLocalUri = (songId: string): string | undefined => {
    return useLibraryStore.getState().getDownloadedSong(songId)?.localUri;
};
