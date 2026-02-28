export type DownloadQuality = '96kbps' | '160kbps' | '320kbps';

export type Song = {
  id: string;
  name: string;
  duration: number;
  language?: string;
  year?: string;
  album?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  primaryArtists: string;
  imageUrl?: string;
  streamUrl?: string;
};

export type Artist = {
  id: string;
  name: string;
  imageUrl?: string;
};

export type PlaylistItem = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  songCount?: number;
};
