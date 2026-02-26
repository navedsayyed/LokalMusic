export type DownloadQuality = '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps';

export type Song = {
  id: string;
  name: string;
  duration: number;
  language?: string;
  album?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  primaryArtists: string;
  imageUrl?: string;
  streamUrl?: string;
};

