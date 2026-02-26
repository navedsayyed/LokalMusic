import { Song } from '@/types/music.types';
import { apiClient } from './axiosConfig';

type SaavnSearchSong = {
  id: string;
  name: string;
  duration: string;
  year?: string;
  album?: {
    id: string;
    name: string;
    url?: string;
  };
  primaryArtists: string;
  image?: { link: string; quality: string }[];
  downloadUrl?: { link: string; quality: string }[];
};

type SearchSongsResponse = {
  status: string;
  data: {
    results: SaavnSearchSong[];
    total?: number;
  };
};

type SaavnSongDetail = {
  id: string;
  name: string;
  duration: number;
  language: string;
  year?: string;
  album?: {
    id: string;
    name: string;
  };
  artists?: {
    primary?: { id: string; name: string }[];
  };
  image?: { url: string; quality: string }[];
  downloadUrl?: { url: string; quality: string }[];
};

type SongsResponse = {
  success: boolean;
  data: SaavnSongDetail[];
};

const pickBestImageFromLinks = (images?: { link: string; quality: string }[]) => {
  if (!images || images.length === 0) return undefined;
  const preferred = images.find((i) => i.quality === '500x500')
    ?? images.find((i) => i.quality === '150x150')
    ?? images[0];
  return preferred.link;
};

const pickBestImageFromUrls = (images?: { url: string; quality: string }[]) => {
  if (!images || images.length === 0) return undefined;
  const preferred = images.find((i) => i.quality === '500x500')
    ?? images.find((i) => i.quality === '150x150')
    ?? images[0];
  return preferred.url;
};

const pickBestAudioFromLinks = (urls?: { link: string; quality: string }[]) => {
  if (!urls || urls.length === 0) return undefined;
  const preferred =
    urls.find((u) => u.quality === '320kbps') ??
    urls.find((u) => u.quality === '160kbps') ??
    urls[0];
  return preferred.link;
};

const pickBestAudioFromUrls = (urls?: { url: string; quality: string }[]) => {
  if (!urls || urls.length === 0) return undefined;
  const preferred =
    urls.find((u) => u.quality === '320kbps') ??
    urls.find((u) => u.quality === '160kbps') ??
    urls[0];
  return preferred.url;
};

const mapSaavnSearchSong = (song: SaavnSearchSong): Song => ({
  id: song.id,
  name: song.name,
  duration: Number(song.duration) || 0,
  year: song.year,
  album: song.album
    ? {
      id: song.album.id,
      name: song.album.name,
      imageUrl: pickBestImageFromLinks(song.image),
    }
    : undefined,
  primaryArtists: song.primaryArtists,
  imageUrl: pickBestImageFromLinks(song.image),
  streamUrl: pickBestAudioFromLinks(song.downloadUrl),
});

export const searchSongs = async (
  query: string,
  page = 1,
  limit = 20,
): Promise<Song[]> => {
  const { data } = await apiClient.get<SearchSongsResponse>('/api/search/songs', {
    params: { query, page, limit },
  });
  if (!data?.data?.results) return [];
  return data.data.results.map(mapSaavnSearchSong);
};

export const getTrendingSongs = async (query = 'top hindi hits 2024', limit = 30): Promise<Song[]> => {
  return searchSongs(query, 1, limit);
};

export const getSongById = async (id: string): Promise<Song | null> => {
  const { data } = await apiClient.get<SongsResponse>(`/api/songs/${id}`);
  const raw = data?.data?.[0];
  if (!raw) return null;

  const primaryArtists =
    raw.artists?.primary?.map((a) => a.name).join(', ') ?? '';

  return {
    id: raw.id,
    name: raw.name,
    duration: raw.duration ?? 0,
    year: raw.year,
    album: raw.album
      ? {
        id: raw.album.id,
        name: raw.album.name,
        imageUrl: pickBestImageFromUrls(raw.image),
      }
      : undefined,
    primaryArtists,
    imageUrl: pickBestImageFromUrls(raw.image),
    streamUrl: pickBestAudioFromUrls(raw.downloadUrl),
  };
};
