export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
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
