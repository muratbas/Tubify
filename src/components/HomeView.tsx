import { type FC, useState, useEffect, useMemo } from "react";
import { Play, Pause, Music2, Heart, Library, Compass, ArrowDownToLine } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { usePlayer } from "../context/PlayerContext";
import type { Track, Playlist } from "../types/music";

interface HomeViewProps {
  recentlyPlayed: Track[];
  recommendations?: Track[];
  playlists?: Playlist[];
  activeTrack?: Track | null;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onPlayPlaylist?: (playlist: Playlist) => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

/**
 * Optimizes track thumbnail URLs to fetch highest resolution available.
 * Prioritizes YouTube Music's w544-h544 or YouTube maxresdefault.
 */
export function getOptimizedThumbnail(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  // 1. YouTube Music / Google CDN images (track covers)
  if (trimmed.includes("googleusercontent.com") || trimmed.includes("ggpht.com")) {
    return trimmed
      .replace(/=w\d+-h\d+[^?#]*/, "=w544-h544-l90-rj")
      .replace(/=s\d+[^?#]*/, "=s544");
  }

  // 2. YouTube Video Thumbnails (i.ytimg.com / img.youtube.com)
  if (trimmed.includes("ytimg.com/vi/") || trimmed.includes("youtube.com/vi/")) {
    if (
      trimmed.endsWith("/default.jpg") ||
      trimmed.endsWith("/mqdefault.jpg") ||
      trimmed.endsWith("/sddefault.jpg")
    ) {
      return trimmed.replace(/\/(default|mqdefault|sddefault)\.jpg$/, "/maxresdefault.jpg");
    }
  }

  return trimmed;
}

/**
 * Resolves playlist cover with fallback to cached first track thumbnail if playlist thumbnail is missing.
 */
function getPlaylistCover(pl: Playlist): string | null {
  if (pl.thumbnail && pl.thumbnail.trim()) {
    return pl.thumbnail;
  }
  try {
    const raw =
      localStorage.getItem(`tubify_playlist_tracks_${pl.id}`) ||
      (pl.id.startsWith("VL")
        ? localStorage.getItem(`tubify_playlist_tracks_${pl.id.slice(2)}`)
        : localStorage.getItem(`tubify_playlist_tracks_VL${pl.id}`));
    if (raw) {
      const tracks = JSON.parse(raw);
      if (Array.isArray(tracks) && tracks.length > 0 && tracks[0].thumbnail) {
        return tracks[0].thumbnail;
      }
    }
  } catch {}
  return null;
}

/**
 * Robust image cover component with multi-level fallback:
 * 1. Tries optimized URL (for tracks) or raw URL (for playlists).
 * 2. If optimized URL fails, automatically retries the raw original URL.
 * 3. If maxresdefault fails, automatically retries hqdefault.
 * 4. Shows clean neutral placeholder only if all attempts fail.
 */
const TrackCover: FC<{
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md" | "lg";
  isPlaylist?: boolean;
}> = ({ src, alt, className = "", iconSize = "md", isPlaylist = false }) => {
  // Playlist covers (especially user collage thumbnails) should not be forced to =w544-h544
  const primarySrc = isPlaylist ? src || "" : getOptimizedThumbnail(src);
  const [currentSrc, setCurrentSrc] = useState<string>(() => primarySrc);
  const [hasTriedRaw, setHasTriedRaw] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(isPlaylist ? src || "" : getOptimizedThumbnail(src));
    setHasTriedRaw(false);
    setHasError(false);
  }, [src, isPlaylist]);

  const handleError = () => {
    // If maxresdefault failed, try hqdefault
    if (currentSrc.includes("/maxresdefault.jpg")) {
      setCurrentSrc(currentSrc.replace("/maxresdefault.jpg", "/hqdefault.jpg"));
      return;
    }
    // If an optimized/altered URL failed, fallback to the original raw URL
    if (!hasTriedRaw && src && currentSrc !== src) {
      setHasTriedRaw(true);
      setCurrentSrc(src);
      return;
    }
    // All image sources failed, show placeholder
    setHasError(true);
  };

  if (!currentSrc || hasError) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 ${className}`}
      >
        <Music2
          className={`text-neutral-400 dark:text-neutral-500 ${
            iconSize === "sm" ? "w-5 h-5" : iconSize === "lg" ? "w-8 h-8" : "w-6 h-6"
          }`}
        />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      className={`w-full h-full object-cover ${className}`}
    />
  );
};

export const HomeView: FC<HomeViewProps> = ({
  recentlyPlayed,
  recommendations = [],
  playlists = [],
  activeTrack: propActiveTrack,
  isPlaying: propIsPlaying,
  onPlayTrack: propOnPlayTrack,
  onSelectPlaylist,
  onPlayPlaylist,
  onNavigateArtist,
  onContextMenuTrack,
  onScroll,
}) => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const player = usePlayer();
  const isLight = theme === "light";

  const activeTrack = propActiveTrack !== undefined ? propActiveTrack : player.activeTrack;
  const isPlaying =
    propIsPlaying !== undefined ? propIsPlaying : player.playbackStatus === "playing";
  const onPlayTrack = propOnPlayTrack || player.playTrack;

  // Dynamic greeting based on current local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === "tr") {
      if (hour >= 5 && hour < 12) return "Günaydın";
      if (hour >= 12 && hour < 18) return "Tünaydın";
      return "İyi akşamlar";
    }
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Strictly 6 tracks for top section, sized cleanly in responsive row
  const displayTracks = (recentlyPlayed && recentlyPlayed.length > 0
    ? recentlyPlayed
    : recommendations
  ).slice(0, 6);

  // Quick Access Hub items
  const quickAccessItems = useMemo(
    () => [
      {
        id: "library",
        title: language === "tr" ? "Kitaplık" : "Library",
        subtitle:
          language === "tr"
            ? "Koleksiyonun & listelerin"
            : "Your collection & playlists",
        icon: Library,
      },
      {
        id: "browse",
        title: language === "tr" ? "Göz At" : "Browse",
        subtitle:
          language === "tr"
            ? "Türler, ruh halleri & listeler"
            : "Genres, moods & playlists",
        icon: Compass,
      },
      {
        id: "downloads",
        title: language === "tr" ? "İndirilenler" : "Downloads",
        subtitle:
          language === "tr" ? "Çevrimdışı müzikler" : "Offline music",
        icon: ArrowDownToLine,
      },
    ],
    [language]
  );

  // Random / shuffled playlists from user's library for "Kitaplığınızdan"
  const libraryPlaylists = useMemo(() => {
    if (!playlists || playlists.length === 0) return [];
    const filtered = playlists.filter((p) => p.id !== "LM" && p.id !== "VLLM");
    return [...filtered].sort(() => 0.5 - Math.random());
  }, [playlists]);

  return (
    <div
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-6 md:px-8 pt-16 pb-28 space-y-9 relative z-10 bg-transparent ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* 1. Dynamic Greeting & Quick Access Hub */}
      <section>
        <h1
          className={`text-2xl md:text-3xl font-bold tracking-tight mb-5 mt-2 ${
            isLight ? "text-neutral-900" : "text-white"
          }`}
        >
          {getGreeting()}
        </h1>

        {/* Quick Access Hub (3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-8 mt-2">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`transition-all duration-200 ease-out cursor-pointer group rounded-2xl p-4 flex items-center gap-3.5 hover:-translate-y-0.5 hover:shadow-sm ${
                  isLight
                    ? "bg-neutral-100/70 hover:bg-neutral-200/60"
                    : "bg-neutral-800/50 hover:bg-neutral-800/80"
                }`}
              >
                {/* Icon Container (Left) */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200 ${
                    isLight ? "bg-white" : "bg-neutral-700/60"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isLight ? "text-neutral-700" : "text-neutral-200"
                    }`}
                  />
                </div>

                {/* Text Content (Right) */}
                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-semibold text-sm transition-colors truncate ${
                      isLight
                        ? "text-neutral-900 group-hover:text-black"
                        : "text-neutral-100 group-hover:text-white"
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6-column responsive grid: compact and balanced */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 md:gap-4">
          {displayTracks.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            const isThisPlaying = isActive && isPlaying;

            return (
              <div
                key={`home-top-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                onContextMenu={(e) => {
                  if (onContextMenuTrack) {
                    onContextMenuTrack(track, e);
                  }
                }}
                className={`group flex flex-col p-2.5 rounded-xl transition-colors duration-200 cursor-pointer relative select-none ${
                  isLight
                    ? isActive
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-100/80"
                    : isActive
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.06]"
                }`}
              >
                {/* Square Image with Center Play Button on Hover */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800">
                  <TrackCover
                    src={track.thumbnail}
                    alt={track.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                    iconSize="md"
                  />

                  {/* Centered Red Circle Play Button on Hover */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-200 pointer-events-none ${
                      isThisPlaying
                        ? "opacity-100 scale-100 bg-black/25"
                        : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-hover:bg-black/25"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className="pointer-events-auto w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      data-tooltip={isThisPlaying ? "Duraklat" : "Oynat"}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Track Info (Title & Artist) below the cover */}
                <div className="min-w-0">
                  <h4
                    className={`font-semibold text-sm leading-snug mt-2.5 truncate ${
                      isActive
                        ? "text-[#ff0000]"
                        : isLight
                        ? "text-neutral-900"
                        : "text-white"
                    }`}
                    title={track.title}
                  >
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {track.is_explicit && (
                      <span
                        title="Explicit"
                        className="w-3.5 h-3.5 rounded-[3px] bg-neutral-400 text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                      >
                        E
                      </span>
                    )}
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateArtist) {
                          onNavigateArtist(track.artist_id || track.artist, track.artist);
                        }
                      }}
                      className={`text-xs truncate hover:underline cursor-pointer ${
                        isLight
                          ? "text-neutral-500 hover:text-neutral-900"
                          : "text-neutral-400 hover:text-white"
                      }`}
                      title={track.artist}
                    >
                      {track.artist}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. "Kitaplığınızdan" (From your library) Horizontal Shelf */}
      <section className="space-y-4">
        <h2
          className={`text-xl md:text-2xl font-bold tracking-tight ${
            isLight ? "text-neutral-900" : "text-white"
          }`}
        >
          {language === "tr" ? "Kitaplığınızdan" : "From your library"}
        </h2>

        {libraryPlaylists.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-2 px-2 scroll-smooth">
            {libraryPlaylists.map((pl, idx) => {
              const coverUrl = getPlaylistCover(pl);

              return (
                <div
                  key={`lib-pl-${pl.id}-${idx}`}
                  onClick={() => onSelectPlaylist?.(pl)}
                  className={`w-36 md:w-44 shrink-0 group flex flex-col p-2.5 rounded-xl transition-colors duration-200 cursor-pointer relative select-none ${
                    isLight ? "hover:bg-neutral-100/90" : "hover:bg-white/[0.07]"
                  }`}
                >
                  {/* Aspect ratio playlist cover */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-2.5">
                    {pl.id === "liked" || pl.id === "LM" ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center">
                        <Heart className="w-9 h-9 text-white fill-white" />
                      </div>
                    ) : (
                      <TrackCover
                        src={coverUrl}
                        alt={pl.title}
                        className="group-hover:scale-105 transition-transform duration-300"
                        iconSize="md"
                        isPlaylist={true}
                      />
                    )}

                    {/* Float Play Button sliding up on hover */}
                    <div className="absolute right-2 bottom-2 transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPlaylist?.(pl);
                        }}
                        className="w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        data-tooltip="Oynat"
                      >
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Playlist Info */}
                  <div className="min-w-0">
                    <h4
                      className={`font-semibold text-sm truncate ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}
                      title={pl.title}
                    >
                      {pl.title}
                    </h4>
                    <p
                      className={`text-xs mt-0.5 truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {pl.track_count
                        ? pl.track_count
                        : pl.description
                        ? pl.description
                        : language === "tr"
                        ? "Çalma listesi"
                        : "Playlist"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`p-6 rounded-2xl text-sm ${
              isLight ? "bg-neutral-100/70 text-neutral-500" : "bg-white/[0.04] text-neutral-400"
            }`}
          >
            {language === "tr"
              ? "Kitaplığınızda henüz çalma listesi bulunmuyor."
              : "No playlists found in your library."}
          </div>
        )}
      </section>
    </div>
  );
};
