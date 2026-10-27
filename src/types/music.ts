export interface Track {
  id: string;
  title: string;
  artist: string;
  artist_id?: string | null;
  album?: string | null;
  album_id?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
  is_explicit?: boolean | null;
  added_at?: string | null;
  set_video_id?: string | null;
  plays?: string | null;
}

export interface PlaylistTracksResult {
  tracks: Track[];
  suggestions?: Track[];
  continuation?: string | null;
  track_count?: string | null;
}

export interface ArtistItem {
  id: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  item_type: "album" | "single" | string;
}

export interface ArtistDetails {
  id: string;
  name: string;
  description?: string | null;
  subscribers?: string | null;
  thumbnail?: string | null;
  top_tracks: Track[];
  albums: ArtistItem[];
  singles: ArtistItem[];
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string;
  artist_id?: string | null;
  year?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  track_count?: string | null;
  tracks: Track[];
}

export interface StreamInfo {
  url: string;
  format?: string;
  bitrate?: number | null;
  duration?: number | null;
  title?: string | null;
  headers?: Record<string, string>;
}

export type AudioQualityPreference = "high" | "normal" | "low" | "auto";

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
  privacy_status?: "PUBLIC" | "UNLISTED" | "PRIVATE" | string | null;
}

export type RightDrawerTab = "nowPlaying" | "queue" | "lyrics";
export type QueueViewMode = "closed" | "mini" | "expanded";

export type MoodCategory = "all" | "relax" | "energize" | "focus" | "workout" | "commute";

export type RepeatMode = "off" | "all" | "one";

export interface HomeItem {
  id: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  item_type: "album" | "playlist" | "track" | "radio" | string;
  aspect_ratio?: "1:1" | "16:9" | string | null;
  explicit: boolean;
  video_id?: string | null;
  playlist_id?: string | null;
  browse_id?: string | null;
}

export interface HomeSection {
  title: string;
  strapline?: string | null;
  items: HomeItem[];
}

export interface HomeFeedResult {
  sections: HomeSection[];
  continuation?: string | null;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsData {
  syncedLyrics: LyricLine[] | null;
  plainLyrics: string | null;
  instrumental: boolean;
  isSynced: boolean;
  source: "lrclib";
}

export interface CachedTrack {
  track_id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: string | null;
  file_path: string;
  cover_path?: string | null;
  mime_type?: string;
  file_size: number;
  cached_at?: number;
  downloaded_at?: number;
}

export type DownloadedTrack = CachedTrack;

export interface DownloadProgressPayload {
  track_id: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
}

export interface ActiveDownload {
  track_id: string;
  title: string;
  artist: string;
  thumbnail?: string | null;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  status: "downloading" | "cancelling" | "completed" | "error";
}

export interface RecentSearchItem {
  id: string; // videoId, browseId, playlistId vb.
  type: "song" | "artist" | "album" | "playlist";
  title: string;
  subtitle?: string; // Sanatçı adı veya "Sanatçı", "Albüm" etiketi
  thumbnailUrl: string;
  timestamp: number;
}

export type SettingsTab = "account" | "appearance" | "playback" | "library" | "about";


