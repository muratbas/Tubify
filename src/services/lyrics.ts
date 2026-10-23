import type { Track, LyricLine, LyricsData } from "../types/music";

const LRCLIB_BASE_URL = "https://lrclib.net/api";
const LRCLIB_HEADERS: Record<string, string> = {
  "User-Agent": "Tubify/0.1.0 (https://github.com/muratbas/Tubify)",
  "Lrclib-Client": "Tubify (https://github.com/muratbas/Tubify)",
};

// In-memory cache for fetched lyrics by cache key
const lyricsCache = new Map<string, LyricsData>();

/**
 * Cleans YouTube clutter from track title (e.g. "(Official Video)", "[Remix]", "(feat. XYZ)").
 * Also strips prepended artist name if present ("Artist - Title").
 */
export function cleanTrackTitle(title: string, artist?: string): string {
  let cleaned = (title || "").trim();

  // Strip artist if title starts with "Artist - "
  if (artist) {
    const artistLower = artist.trim().toLowerCase();
    if (cleaned.toLowerCase().startsWith(artistLower + " - ")) {
      cleaned = cleaned.slice(artist.length + 3);
    } else if (cleaned.toLowerCase().startsWith(artistLower + " – ")) {
      cleaned = cleaned.slice(artist.length + 3);
    } else if (cleaned.includes(" - ")) {
      const parts = cleaned.split(" - ");
      if (parts.length === 2 && parts[0].trim().toLowerCase() === artistLower) {
        cleaned = parts[1];
      }
    }
  }

  // Remove common YouTube tags in parentheses or brackets
  cleaned = cleaned.replace(
    /[\(\[](?:official\s*(?:music\s*|lyric\s*)?video|official\s*audio|official|lyrics?|lyric\s*video|video|audio|visualizer|clip\s*officiel|4k(?:.*?)|hd|hq|slowed(?:.*?))[\)\]]/gi,
    ""
  );

  // Remove Remix tags if in parentheses/brackets e.g. [Remix] or (Remix)
  cleaned = cleaned.replace(/[\(\[]\s*remix\s*[\)\]]/gi, "");

  // Remove featuring / ft artists in parentheses or brackets
  cleaned = cleaned.replace(/[\(\[](?:feat\.|ft\.)\s+[^\)\]]+[\)\]]/gi, "");

  // Remove surrounding quotes, dashes, or spaces
  cleaned = cleaned.replace(/^[\"\'\s\-\–]+|[\"\'\s\-\–]+$/g, "").replace(/\s{2,}/g, " ").trim();

  return cleaned || title;
}

/**
 * Converts duration string (e.g. "3:48" or "1:02:15") or numeric seconds to number of seconds.
 */
export function parseDurationToSeconds(duration?: string | number | null): number | undefined {
  if (typeof duration === "number" && !isNaN(duration) && duration > 0) {
    return Math.round(duration);
  }
  if (typeof duration === "string") {
    const parts = duration.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return undefined;
}

/**
 * Parses LRC formatted text ([mm:ss.xx] Lyrics line) into an array of LyricLine objects.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Collect all timestamps that might exist in this line
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    // The text after stripping all timestamp tags
    const text = trimmed.replace(timeRegex, "").trim();

    for (const match of matches) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const frac = match[3] || "0";

      // Normalize fraction into milliseconds:
      // 1 digit "1" -> 100ms
      // 2 digits "15" -> 150ms
      // 3 digits "150" -> 150ms
      let ms = 0;
      if (frac.length === 1) ms = parseInt(frac, 10) * 100;
      else if (frac.length === 2) ms = parseInt(frac, 10) * 10;
      else ms = parseInt(frac.slice(0, 3), 10);

      const time = min * 60 + sec + ms / 1000;

      result.push({
        time,
        text: text || "♪",
      });
    }
  }

  // Sort strictly by timestamp
  result.sort((a, b) => a.time - b.time);
  return result;
}

interface LrclibResponse {
  id: number;
  name?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

/**
 * Fetches lyrics from LRCLIB API with smart fallback chain and in-memory caching.
 */
export async function fetchLyrics(track: Track, currentDuration?: number): Promise<LyricsData | null> {
  if (!track || !track.title) return null;

  const cacheKey = `${track.id}_${track.title}_${track.artist}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!;
  }

  const cleanTrack = cleanTrackTitle(track.title, track.artist);
  const cleanArtist = (track.artist || "").trim();
  const cleanAlbum = (track.album || "").trim();
  const durationSec = currentDuration && currentDuration > 0
    ? Math.round(currentDuration)
    : parseDurationToSeconds(track.duration);

  let rawData: LrclibResponse | null = null;

  // Step 1: Try /api/get with all parameters if available
  try {
    const params = new URLSearchParams({
      track_name: cleanTrack,
      artist_name: cleanArtist,
    });
    if (cleanAlbum) params.append("album_name", cleanAlbum);
    if (durationSec) params.append("duration", durationSec.toString());

    const res = await fetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`, {
      headers: LRCLIB_HEADERS,
    });
    if (res.ok) {
      const data: LrclibResponse = await res.json();
      if (data.syncedLyrics || data.plainLyrics || data.instrumental) {
        rawData = data;
      }
    }
  } catch (err) {
    console.warn("LRCLIB /api/get full request failed:", err);
  }

  // Step 2: Try /api/get without duration/album constraints (in case YouTube duration differs)
  if (!rawData) {
    try {
      const params = new URLSearchParams({
        track_name: cleanTrack,
        artist_name: cleanArtist,
      });
      const res = await fetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`, {
        headers: LRCLIB_HEADERS,
      });
      if (res.ok) {
        const data: LrclibResponse = await res.json();
        if (data.syncedLyrics || data.plainLyrics || data.instrumental) {
          rawData = data;
        }
      }
    } catch (err) {
      console.warn("LRCLIB /api/get relaxed request failed:", err);
    }
  }

  // Step 3: Fallback to /api/search to find the most relevant result with lyrics
  if (!rawData) {
    try {
      const searchParams = new URLSearchParams({
        track_name: cleanTrack,
        artist_name: cleanArtist,
      });
      const res = await fetch(`${LRCLIB_BASE_URL}/search?${searchParams.toString()}`, {
        headers: LRCLIB_HEADERS,
      });
      if (res.ok) {
        const list: LrclibResponse[] = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Prefer items that have syncedLyrics
          const withSynced = list.find((item) => item.syncedLyrics);
          if (withSynced) {
            rawData = withSynced;
          } else {
            const withPlain = list.find((item) => item.plainLyrics);
            if (withPlain) rawData = withPlain;
          }
        }
      }
    } catch (err) {
      console.warn("LRCLIB /api/search request failed:", err);
    }
  }

  // If still not found, try generic q search
  if (!rawData && cleanTrack) {
    try {
      const q = `${cleanArtist} ${cleanTrack}`.trim();
      const res = await fetch(`${LRCLIB_BASE_URL}/search?q=${encodeURIComponent(q)}`, {
        headers: LRCLIB_HEADERS,
      });
      if (res.ok) {
        const list: LrclibResponse[] = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const withSynced = list.find((item) => item.syncedLyrics);
          if (withSynced) {
            rawData = withSynced;
          } else {
            const withPlain = list.find((item) => item.plainLyrics);
            if (withPlain) rawData = withPlain;
          }
        }
      }
    } catch (err) {
      console.warn("LRCLIB /api/search?q fallback failed:", err);
    }
  }

  if (!rawData) {
    return null;
  }

  const parsedSynced = rawData.syncedLyrics ? parseLrc(rawData.syncedLyrics) : null;
  const isSynced = Boolean(parsedSynced && parsedSynced.length > 0);

  const result: LyricsData = {
    syncedLyrics: isSynced ? parsedSynced : null,
    plainLyrics: rawData.plainLyrics || null,
    instrumental: Boolean(rawData.instrumental),
    isSynced,
    source: "lrclib",
  };

  lyricsCache.set(cacheKey, result);
  return result;
}
