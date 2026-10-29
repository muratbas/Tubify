import { type FC, useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  Music2,
  Heart,
  Library,
  Compass,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { getHomeFeed } from "../services/api";
import type { Track, Playlist, HomeSection, HomeItem } from "../types/music";

interface HomeViewProps {
  recentlyPlayed: Track[];
  recommendations?: Track[];
  playlists?: Playlist[];
  activeTrack?: Track | null;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track, trackList?: Track[]) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onPlayPlaylist?: (playlist: Playlist) => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onNavigateAlbum?: (albumId: string, albumTitle?: string, artistName?: string, thumbnail?: string) => void;
  onPlayAlbum?: (albumId: string, albumTitle?: string, artistName?: string, thumbnail?: string) => void;
  onNavigateDownloads?: () => void;
  onNavigateBrowse?: () => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

/**
 * Optimizes track thumbnail URLs to fetch highest resolution available.
 */
export function getOptimizedThumbnail(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  if (trimmed.includes("googleusercontent.com") || trimmed.includes("ggpht.com")) {
    return trimmed
      .replace(/=w\d+-h\d+[^?#]*/, "=w544-h544-l90-rj")
      .replace(/=s\d+[^?#]*/, "=s544");
  }

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
 * Image component with multi-level fallback
 */
const TrackCover: FC<{
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md" | "lg";
  isPlaylist?: boolean;
}> = ({ src, alt, className = "", iconSize = "md", isPlaylist = false }) => {
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
    if (!hasTriedRaw && src && src !== currentSrc) {
      setHasTriedRaw(true);
      setCurrentSrc(src);
      return;
    }
    if (currentSrc.includes("maxresdefault.jpg")) {
      setCurrentSrc(currentSrc.replace("maxresdefault.jpg", "hqdefault.jpg"));
      return;
    }
    setHasError(true);
  };

  if (!currentSrc || hasError) {
    const iconDim =
      iconSize === "sm" ? "w-4 h-4" : iconSize === "lg" ? "w-8 h-8" : "w-6 h-6";
    return (
      <div className={`w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center ${className}`}>
        <Music2 className={`${iconDim} text-neutral-400 dark:text-neutral-500`} />
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

// Initial fallback tracks if recentlyPlayed is empty
const INITIAL_FALLBACK_TRACKS: Track[] = [
  {
    id: "gQlMMD8auMs",
    title: "Starboy",
    artist: "The Weeknd, Daft Punk",
    thumbnail: "https://i.ytimg.com/vi/gQlMMD8auMs/hqdefault.jpg",
  },
  {
    id: "kJQP7kiw5Fk",
    title: "Despacito",
    artist: "Luis Fonsi, Daddy Yankee",
    thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
  },
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
  },
  {
    id: "3JZ_D3ELwOQ",
    title: "Radioactive",
    artist: "Imagine Dragons",
    thumbnail: "https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg",
  },
  {
    id: "hT_nvWreIhg",
    title: "Counting Stars",
    artist: "OneRepublic",
    thumbnail: "https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg",
  },
];

/**
 * Dynamic Horizontal Carousel Shelf Component
 */
const DynamicShelf: FC<{
  section: HomeSection;
  isLight: boolean;
  activeTrackId?: string;
  isPlaying?: boolean;
  onPlayItem: (item: HomeItem, shelf: HomeSection) => void;
  onClickItem: (item: HomeItem, shelf: HomeSection) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
}> = ({
  section,
  isLight,
  activeTrackId,
  isPlaying,
  onPlayItem,
  onClickItem,
  onContextMenuTrack,
}) => {
  const { language, t } = useLanguage();
  const shelfSlug = useMemo(
    () => `shelf-${section.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
    [section.title]
  );

  const scroll = (dir: -1 | 1) => {
    const el = document.getElementById(shelfSlug);
    if (el) {
      el.scrollBy({ left: dir * 460, behavior: "smooth" });
    }
  };

  const isListenAgain = useMemo(() => {
    const t = section.title.toLowerCase();
    return t.includes("yeniden dinle") || t.includes("listen again");
  }, [section.title]);

  const displayItems = useMemo(() => {
    if (!isListenAgain) return section.items;
    return section.items.filter((item) => {
      const isLikedId =
        item.id === "VLLM" ||
        item.id === "LM" ||
        item.id === "liked" ||
        item.browse_id === "VLLM" ||
        item.browse_id === "LM" ||
        item.browse_id === "FEmusic_liked";
      const t = item.title.toLowerCase();
      const isLikedTitle =
        t.includes("beğendiğim müzik") ||
        t.includes("liked songs") ||
        t.includes("beğenilenler");
      return !isLikedId && !isLikedTitle;
    });
  }, [section.items, isListenAgain]);

  return (
    <section className="space-y-3">
      {/* Shelf Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className={`text-xl font-bold tracking-tight mb-3 mt-8 ${
              isLight ? "text-neutral-900" : "text-neutral-100"
            }`}
          >
            {section.title}
          </h2>
          {section.strapline && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2 mb-3 font-medium">
              {section.strapline}
            </p>
          )}
        </div>

        {/* Scroll Controls (< >) */}
        <div className="flex items-center gap-1.5 pb-3">
          <button
            onClick={() => scroll(-1)}
            aria-label="Önceki"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                : "bg-white/10 hover:bg-white/20 text-neutral-300"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Sonraki"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                : "bg-white/10 hover:bg-white/20 text-neutral-300"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Scroller */}
      <div
        id={shelfSlug}
        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth -mx-2 px-2"
      >
        {displayItems.map((item, idx) => {
          const isVideo = item.aspect_ratio === "16:9";
          const isArtist = item.item_type === "artist" || item.browse_id?.startsWith("UC");
          const isItemActive = activeTrackId === (item.video_id || item.id);
          const isItemPlaying = isItemActive && isPlaying;
          const isLikedSongs =
            item.id === "VLLM" ||
            item.id === "LM" ||
            item.id === "femusic_liked" ||
            item.title.toLowerCase().includes("beğendiğim") ||
            item.title.toLowerCase().includes("beğenilenler") ||
            item.title.toLowerCase().includes("liked");

          return (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => onClickItem(item, section)}
              onContextMenu={(e) => {
                if (onContextMenuTrack && (item.video_id || item.item_type === "track")) {
                  onContextMenuTrack(
                    {
                      id: item.video_id || item.id,
                      title: item.title,
                      artist: item.subtitle || t.artist,
                      thumbnail: item.thumbnail,
                      is_explicit: item.explicit,
                    },
                    e
                  );
                }
              }}
              className={`group cursor-pointer flex flex-col p-2.5 rounded-2xl transition-all duration-200 select-none shrink-0 ${
                isVideo ? "w-[240px] md:w-[260px]" : "w-[170px] min-w-[170px]"
              } ${isLight ? "hover:bg-neutral-100/90" : "hover:bg-white/[0.07]"}`}
            >
              {/* Cover Image Container */}
              <div
                className={`relative w-full rounded-2xl overflow-hidden shadow-sm bg-neutral-100 dark:bg-neutral-800 ${
                  isVideo ? "aspect-video" : "aspect-square"
                }`}
              >
                {isLikedSongs && (!item.thumbnail || item.thumbnail.includes("pbg/liked-songs")) ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#ff0033] via-[#cc0029] to-[#700010] flex items-center justify-center">
                    <Heart className="w-11 h-11 text-white fill-white drop-shadow-md" />
                  </div>
                ) : (
                  <TrackCover
                    src={item.thumbnail}
                    alt={item.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                    iconSize="md"
                    isPlaylist={item.item_type === "playlist"}
                  />
                )}

                {/* Hover Play Button (Right Bottom Corner) - Hidden for artists */}
                {!isArtist && (
                  <div className="absolute right-2.5 bottom-2.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayItem(item, section);
                      }}
                      className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-xl shadow-black/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      data-tooltip={isItemPlaying ? "Duraklat" : "Oynat"}
                    >
                      {isItemPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="min-w-0 mt-2.5">
                <h3
                  className={`font-semibold text-sm truncate ${
                    isItemActive
                      ? "text-[#ff0000]"
                      : isLight
                      ? "text-neutral-900"
                      : "text-neutral-100"
                  }`}
                  title={isLikedSongs ? t.likedSongs : item.title}
                >
                  {isLikedSongs ? t.likedSongs : item.title}
                </h3>

                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {item.explicit && (
                    <span
                      title="Explicit"
                      className="w-3.5 h-3.5 rounded-[3px] bg-neutral-400 text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                    >
                      E
                    </span>
                  )}
                  <p
                    className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5 leading-snug"
                    title={item.subtitle || ""}
                  >
                    {item.subtitle || (item.item_type === "album" ? (language === "tr" ? "Albüm" : "Album") : (language === "tr" ? "Çalma Listesi" : "Playlist"))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Universal language-agnostic filter for unwanted shelves:
// 1. "Birlikte dinleyin" / "Listen together" / Stations
// 2. "Sizin için önerilen müzik videoları" / "Recommended music videos"
// 3. "Yeni keşifler ve eski favoriler" / "Mixed for you"
function shouldHideShelf(title: string, items?: HomeItem[]): boolean {
  const t = (title || "").toLowerCase();

  // 1. Listen together / Stations
  if (
    t.includes("birlikte dinle") ||
    t.includes("listen together") ||
    t.includes("istasyon") ||
    t.includes("station")
  ) {
    return true;
  }

  // 2. Music videos
  if (
    t.includes("müzik video") ||
    t.includes("music video") ||
    (t.includes("video") && t.includes("öner")) ||
    (t.includes("video") && t.includes("recommend"))
  ) {
    return true;
  }

  // 3. Mixed for you / Discover & favorites
  if (
    t.includes("yeni keşifler") ||
    t.includes("mixed for you") ||
    (t.includes("keşif") && t.includes("favori")) ||
    (t.includes("discover") && t.includes("favorite"))
  ) {
    return true;
  }

  // Structural checks:
  if (items && items.length > 0) {
    // Personalized mix playlists (VLRDTMAK5uy_)
    if (items.some((it) => it.browse_id?.startsWith("VLRDTMAK5uy_"))) {
      return true;
    }
    // All items are 16:9 video cards in a video shelf
    if (items.every((it) => it.aspect_ratio === "16:9") && (t.includes("video") || t.includes("klip"))) {
      return true;
    }
    // Radio station items
    if (items.some((it) => it.title.toLowerCase().includes("station") || it.title.toLowerCase().includes("istasyon"))) {
      return true;
    }
  }

  return false;
}

export const HomeView: FC<HomeViewProps> = ({
  recentlyPlayed,
  playlists,
  activeTrack,
  isPlaying = false,
  onPlayTrack = () => {},
  onSelectPlaylist,
  onPlayPlaylist,
  onNavigateArtist,
  onNavigateAlbum,
  onPlayAlbum,
  onNavigateDownloads,
  onNavigateBrowse,
  onContextMenuTrack,
  onScroll,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isLight = theme === "light";

  // Dynamic Home Feed State (shelves from InnerTube FEmusic_home)
  const [sections, setSections] = useState<HomeSection[]>(() => {
    try {
      const cached = localStorage.getItem("tubify_home_feed_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s: HomeSection) => !shouldHideShelf(s.title, s.items));
        }
      }
    } catch {}
    return [];
  });
  const [continuation, setContinuation] = useState<string | null>(null);
  const [isLoadingHome, setIsLoadingHome] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial home feed on mount
  useEffect(() => {
    let isMounted = true;
    const fetchFeed = async () => {
      try {
        setIsLoadingHome(true);
        const res = await getHomeFeed();
        if (isMounted && res && Array.isArray(res.sections) && res.sections.length > 0) {
          const filtered = res.sections.filter((s) => !shouldHideShelf(s.title, s.items));
          setSections(filtered);
          setContinuation(res.continuation || null);
          try {
            localStorage.setItem("tubify_home_feed_cache", JSON.stringify(filtered));
          } catch {}
        }
      } catch (err) {
        console.error("Home feed fetch error:", err);
      } finally {
        if (isMounted) setIsLoadingHome(false);
      }
    };
    fetchFeed();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch next continuation batch
  const handleLoadMore = useCallback(async () => {
    if (!continuation || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const res = await getHomeFeed(continuation);
      if (res && Array.isArray(res.sections) && res.sections.length > 0) {
        setSections((prev) => {
          // Avoid duplicate section titles & filter unwanted shelves
          const existingTitles = new Set(prev.map((s) => s.title));
          const newOnes = res.sections.filter(
            (s) => !existingTitles.has(s.title) && !shouldHideShelf(s.title, s.items)
          );
          const updated = [...prev, ...newOnes];
          try {
            localStorage.setItem("tubify_home_feed_cache", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      setContinuation(res.continuation || null);
    } catch (err) {
      console.error("Continuation fetch error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [continuation, isLoadingMore]);

  // Infinite scroll observer at bottom of page
  useEffect(() => {
    if (!continuation || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "400px" }
    );

    const target = sentinelRef.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [continuation, isLoadingMore, handleLoadMore]);

  // Time-of-day greeting (Günaydın / Tünaydın / İyi akşamlar)
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

  // Top 6 tracks for Recently Played section
  const displayTracks = useMemo(() => {
    const pool =
      recentlyPlayed && recentlyPlayed.length > 0
        ? recentlyPlayed
        : INITIAL_FALLBACK_TRACKS;
    return pool.slice(0, 6);
  }, [recentlyPlayed]);

  // Quick Access Hub Navigation Items (Kitaplık, Göz At, İndirilenler)
  const quickAccessItems = useMemo(
    () => [
      {
        id: "library",
        title: language === "tr" ? "Kitaplık" : "Library",
        subtitle:
          language === "tr"
            ? "Koleksiyonun & listelerin"
            : "Your collection & lists",
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

  // Random / shuffled playlists from user's library for "Kitaplığınızdan" fallback
  const libraryPlaylists = useMemo(() => {
    if (!playlists || playlists.length === 0) return [];
    const filtered = playlists.filter((p) => p.id !== "LM" && p.id !== "VLLM");
    return [...filtered].sort(() => 0.5 - Math.random());
  }, [playlists]);

  // Item Click Handler (Album, Playlist, Artist, or Track)
  const handleItemClick = (item: HomeItem, shelf: HomeSection) => {
    if (
      item.item_type === "album" ||
      item.browse_id?.startsWith("MPREb_") ||
      item.browse_id?.startsWith("OLAK5uy_")
    ) {
      if (onNavigateAlbum) {
        onNavigateAlbum(
          item.browse_id || item.id,
          item.title,
          item.subtitle || undefined,
          item.thumbnail || undefined
        );
        return;
      }
    }

    if (
      item.item_type === "playlist" ||
      item.browse_id?.startsWith("VL") ||
      item.browse_id?.startsWith("PL")
    ) {
      if (onSelectPlaylist) {
        onSelectPlaylist({
          id: item.browse_id || item.id,
          title: item.title,
          description: item.subtitle || undefined,
          thumbnail: item.thumbnail || null,
        });
        return;
      }
    }

    if (item.item_type === "artist" || item.browse_id?.startsWith("UC")) {
      if (onNavigateArtist) {
        onNavigateArtist(item.browse_id || item.id, item.title);
        return;
      }
    }

    // Default: play track / video / radio
    handlePlayItem(item, shelf);
  };

  // Item Play Handler
  const handlePlayItem = (item: HomeItem, shelf: HomeSection) => {
    if (
      item.item_type === "album" ||
      item.browse_id?.startsWith("MPREb_") ||
      item.browse_id?.startsWith("OLAK5uy_")
    ) {
      if (onPlayAlbum) {
        onPlayAlbum(
          item.browse_id || item.id,
          item.title,
          item.subtitle || undefined,
          item.thumbnail || undefined
        );
        return;
      }
      if (onNavigateAlbum) {
        onNavigateAlbum(
          item.browse_id || item.id,
          item.title,
          item.subtitle || undefined,
          item.thumbnail || undefined
        );
        return;
      }
    }

    if (
      (item.item_type === "playlist" || item.browse_id?.startsWith("VL")) &&
      onPlayPlaylist
    ) {
      onPlayPlaylist({
        id: item.browse_id || item.id,
        title: item.title,
        description: item.subtitle || undefined,
        thumbnail: item.thumbnail || null,
      });
      return;
    }

    // Collect all playable tracks in this shelf for an immersive playback queue
    const playableShelfTracks: Track[] = shelf.items
      .filter((it) => it.video_id || it.item_type === "track" || it.item_type === "radio")
      .map((it) => ({
        id: it.video_id || it.id,
        title: it.title,
        artist: it.subtitle || t.artist,
        thumbnail: it.thumbnail,
        is_explicit: it.explicit,
      }));

    const currentTrack: Track = {
      id: item.video_id || item.id,
      title: item.title,
      artist: item.subtitle || t.artist,
      thumbnail: item.thumbnail,
      is_explicit: item.explicit,
    };

    onPlayTrack(
      currentTrack,
      playableShelfTracks.length > 0 ? playableShelfTracks : undefined
    );
  };

  return (
    <div
      id="main-scroll-container"
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-6 md:px-8 pt-4 pb-28 space-y-10 relative z-10 bg-transparent ${
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
                onClick={() => {
                  if (item.id === "downloads") {
                    onNavigateDownloads?.();
                  } else if (item.id === "browse") {
                    onNavigateBrowse?.();
                  }
                }}
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

        {/* SECTION: Son dinledikleriniz (6 Compact Cards) */}
        <h2
          className={`text-xl md:text-2xl font-bold tracking-tight mb-4 ${
            isLight ? "text-neutral-900" : "text-white"
          }`}
        >
          {language === "tr" ? "Son dinledikleriniz" : "Recently played"}
        </h2>

        {/* 6-column responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 md:gap-4">
          {displayTracks.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            const isThisPlaying = isActive && isPlaying;

            return (
              <div
                key={`home-top-${track.id}-${i}`}
                onClick={() => onPlayTrack(track, displayTracks)}
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
                        onPlayTrack(track, displayTracks);
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

                {/* Track Info */}
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

      {/* 2. DYNAMIC INNER-TUBE CAROUSEL SHELVES ("Yeni keşifler...", "Sizin için önerilen albümler", "Unutulan favoriler", vb.) */}
      {sections.map((section) => (
        <DynamicShelf
          key={section.title}
          section={section}
          isLight={isLight}
          activeTrackId={activeTrack?.id}
          isPlaying={isPlaying}
          onPlayItem={handlePlayItem}
          onClickItem={handleItemClick}
          onContextMenuTrack={onContextMenuTrack}
        />
      ))}

      {/* Fallback "Kitaplığınızdan" if no sections are available yet */}
      {sections.length === 0 && libraryPlaylists.length > 0 && (
        <section className="space-y-4">
          <h2
            className={`text-xl md:text-2xl font-bold tracking-tight ${
              isLight ? "text-neutral-900" : "text-white"
            }`}
          >
            {language === "tr" ? "Kitaplığınızdan" : "From your library"}
          </h2>

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
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-2.5">
                    {pl.id === "liked" || pl.id === "LM" ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#ff0033] via-[#cc0029] to-[#700010] flex items-center justify-center">
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

                    <div className="absolute right-2 bottom-2 transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPlaylist?.(pl);
                        }}
                        className="w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        data-tooltip={language === "tr" ? "Oynat" : "Play"}
                      >
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4
                      className={`font-semibold text-sm truncate ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}
                      title={pl.id === "liked" || pl.id === "LM" ? t.likedSongs : pl.title}
                    >
                      {pl.id === "liked" || pl.id === "LM" ? t.likedSongs : pl.title}
                    </h4>
                    <p
                      className={`text-xs mt-0.5 truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {pl.track_count || (language === "tr" ? "Çalma listesi" : "Playlist")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Initial loading state indicator (if cache is empty) */}
      {isLoadingHome && sections.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#ff0000]" />
          <span className="text-sm font-medium">{t.homeFeedLoading}</span>
        </div>
      )}

      {/* Continuation Scroll Sentinel & Loader */}
      {continuation && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin text-[#ff0000]" />
              <span>{t.homeFeedLoadingMore}</span>
            </div>
          ) : (
            <button
              onClick={handleLoadMore}
              className={`text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer ${
                isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  : "bg-white/10 hover:bg-white/20 text-neutral-200"
              }`}
            >
              {language === "tr" ? "Daha fazla göster" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
