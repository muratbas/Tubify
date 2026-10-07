export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
  is_explicit?: boolean | null;
}

export interface StreamInfo {
  url: string;
  format?: string;
  bitrate?: number | null;
  duration?: number | null;
  title?: string | null;
  headers?: Record<string, string>;
}

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface UserProfile {
  is_authenticated: boolean;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  track_count?: string | null;
}
