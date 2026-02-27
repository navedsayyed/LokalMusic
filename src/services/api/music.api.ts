import { useSettingsStore } from '@/store/settings.store';
import { DownloadQuality, Song } from '@/types/music.types';
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
  // API returns { quality, url } — NOT { quality, link }
  image?: { url: string; quality: string }[];
  downloadUrl?: { url: string; quality: string }[];
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

const pickAudioByQuality = <
  T extends { quality: string; link?: string; url?: string }
>(
  urls?: T[],
) => {
  if (!urls || urls.length === 0) return undefined;
  const preferred: DownloadQuality =
    useSettingsStore.getState().streamQuality ?? '320kbps';

  const order: DownloadQuality[] =
    preferred === '320kbps'
      ? ['320kbps', '160kbps', '96kbps']
      : preferred === '160kbps'
        ? ['160kbps', '96kbps', '320kbps']
        : ['96kbps', '160kbps', '320kbps'];

  for (const q of order) {
    const match = urls.find((u) => u.quality === q);
    if (match) return (match as any).url ?? (match as any).link;
  }

  const first = urls[0] as any;
  return first.url ?? first.link;
};

const mapSaavnSearchSong = (raw: any): Song => {
  // JioSaavn API returns artist info under different keys – try them all
  const primaryArtists: string =
    (typeof raw.primaryArtists === 'string' && raw.primaryArtists) ||
    (typeof raw.primary_artists === 'string' && raw.primary_artists) ||
    (Array.isArray(raw.artists?.primary)
      ? raw.artists.primary.map((a: any) => a.name).join(', ')
      : '') ||
    (Array.isArray(raw.artists?.all)
      ? raw.artists.all.map((a: any) => a.name).join(', ')
      : '') ||
    '';

  return {
    id: raw.id,
    name: raw.name,
    duration: Number(raw.duration) || 0,
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
    streamUrl: pickAudioByQuality(raw.downloadUrl),
  };
};

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

export const getTrendingSongs = async (query = 'top hits trending 2024', limit = 30): Promise<Song[]> => {
  return searchSongs(query, 1, limit);
};

export const getSongById = async (id: string): Promise<Song | null> => {
  const { data } = await apiClient.get<SongsResponse>(`/api/songs/${id}`);
  const raw = data?.data?.[0];
  if (!raw) return null;

  const artists = (raw as any).artists;
  const primaryArtists: string =
    (Array.isArray(artists?.primary) && artists.primary.length > 0
      ? artists.primary.map((a: any) => a.name).join(', ')
      : '') ||
    (Array.isArray(artists?.all) && artists.all.length > 0
      ? artists.all.map((a: any) => a.name).join(', ')
      : '') ||
    (typeof (raw as any).primaryArtists === 'string' ? (raw as any).primaryArtists : '') ||
    '';

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
    streamUrl: pickAudioByQuality(raw.downloadUrl),
  };
};

// ─── Artist search ────────────────────────────────────────────────────────────

export type ArtistItem = { id: string; name: string; imageUrl?: string };

export const searchArtists = async (query: string, limit = 10): Promise<ArtistItem[]> => {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: { results: { id: string; name: string; image?: { url: string; quality: string }[] }[] };
    }>('/api/search/artists', { params: { query, limit } });
    return (data?.data?.results ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      imageUrl: pickBestImageFromUrls(a.image),
    }));
  } catch {
    return [];
  }
};

/**
 * Fetch a curated list of popular artists by querying their exact names in parallel.
 * Much more reliable than a generic "top artists" query which returns label accounts.
 */
export const getPopularArtists = async (): Promise<ArtistItem[]> => {
  const POPULAR_ARTISTS = [
    'Arijit Singh', 'Shreya Ghoshal', 'A.R. Rahman',
    'Neha Kakkar', 'Badshah', 'Sonu Nigam',
    'Diljit Dosanjh', 'Jubin Nautiyal', 'Atif Aslam', 'Armaan Malik',
  ];
  const results = await Promise.all(
    POPULAR_ARTISTS.map((name) => searchArtists(name, 1))
  );
  // Take first result from each, deduplicate by id
  const seen = new Set<string>();
  return results
    .flatMap((r) => r.slice(0, 1))
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
};

// ─── Album search ─────────────────────────────────────────────────────────────

export type AlbumItem = { id: string; name: string; artist: string; imageUrl?: string; year?: string };

export const searchAlbums = async (query: string, limit = 10): Promise<AlbumItem[]> => {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: {
        results: {
          id: string;
          name: string;
          image?: { url: string; quality: string }[];
          artists?: { primary?: { name: string }[] };
          year?: string;
        }[];
      };
    }>('/api/search/albums', { params: { query, limit } });
    return (data?.data?.results ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      artist: a.artists?.primary?.map((p) => p.name).join(', ') ?? '',
      imageUrl: pickBestImageFromUrls(a.image),
      year: a.year,
    }));
  } catch {
    return [];
  }
};

