import { type FC, useState, useEffect, useMemo } from "react";
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
  ThumbsUp,
} from "lucide-react";
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
  onPlayTrack?: (track: Track, trackList?: Track[]) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onPlayPlaylist?: (playlist: Playlist) => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onNavigateAlbum?: (albumId: string, albumTitle?: string, artistName?: string, thumbnail?: string) => void;
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
    if (currentSrc.includes("/maxresdefault.jpg")) {
      setCurrentSrc(currentSrc.replace("/maxresdefault.jpg", "/hqdefault.jpg"));
      return;
    }
    if (!hasTriedRaw && src && currentSrc !== src) {
      setHasTriedRaw(true);
      setCurrentSrc(src);
      return;
    }
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

// --- DATA FROM USER SCREENSHOTS (YOUTUBE MUSIC EXACT REPRODUCTION) ---

// Image 1: Sizin için önerilen albümler
const RECOMMENDED_ALBUMS = [
  {
    id: "Jj1sa0jay4c",
    albumId: "MPREb_dreamisdestiny",
    title: "Dream is Destiny",
    artist: "No Clear Mind",
    type: "Albüm",
    thumbnail: "https://i.ytimg.com/vi/Jj1sa0jay4c/hqdefault.jpg",
  },
  {
    id: "vNVyqttAnmA",
    albumId: "MPREb_les",
    title: "Les",
    artist: "Fironn",
    type: "EP",
    thumbnail: "https://i.ytimg.com/vi/vNVyqttAnmA/hqdefault.jpg",
  },
  {
    id: "unypqeWmyNI",
    albumId: "MPREb_graduation",
    title: "Graduation",
    artist: "Kanye West",
    type: "Albüm",
    isExplicit: true,
    thumbnail: "https://i.ytimg.com/vi/unypqeWmyNI/hqdefault.jpg",
  },
  {
    id: "G4aZlo4mVTM",
    albumId: "MPREb_mets",
    title: "Mets",
    artist: "No Clear Mind",
    type: "Albüm",
    thumbnail: "https://i.ytimg.com/vi/G4aZlo4mVTM/hqdefault.jpg",
  },
  {
    id: "5K0V7sPWdVw",
    albumId: "MPREb_rebel",
    title: "Rebel",
    artist: "EsDeeKid",
    type: "Albüm",
    isExplicit: true,
    thumbnail: "https://i.ytimg.com/vi/5K0V7sPWdVw/hqdefault.jpg",
  },
  {
    id: "SwvzXM-EVrQ",
    albumId: "MPREb_gkmc",
    title: "good kid, m.A.A.d. city",
    artist: "Kendrick Lamar",
    type: "Albüm",
    isExplicit: true,
    thumbnail: "https://i.ytimg.com/vi/SwvzXM-EVrQ/hqdefault.jpg",
  },
];

// Image 2: Unutulan favoriler (Landscape Video Cards)
const FORGOTTEN_FAVORITES: Track[] = [
  {
    id: "ZC8z5HYtF1k",
    title: "highest in the room 「travis scott」 | edit audio",
    artist: "All of my Edit Audios",
    album: "Oynatıldı",
    thumbnail: "https://i.ytimg.com/vi/ZC8z5HYtF1k/hqdefault.jpg",
    duration: "2:56",
  },
  {
    id: "WY0bw-__HL8",
    title: "travis scott & kendrick lamar ~ goosebumps / slowed + reverb /",
    artist: "rum world",
    album: "33 Mn görüntüleme",
    thumbnail: "https://i.ytimg.com/vi/WY0bw-__HL8/hqdefault.jpg",
    duration: "4:32",
  },
  {
    id: "_v98All94pc",
    title: "Sertab Erener & İzmir Big Band - Olsun",
    artist: "Sertab Erener",
    album: "33 Mn görüntüleme",
    thumbnail: "https://i.ytimg.com/vi/_v98All94pc/hqdefault.jpg",
    duration: "4:48",
  },
  {
    id: "qisoHWRZg0E",
    title: "BodyPartz (Slowed)",
    artist: "Luci4",
    album: "Şarkı",
    is_explicit: true,
    thumbnail: "https://i.ytimg.com/vi/qisoHWRZg0E/hqdefault.jpg",
    duration: "2:14",
  },
];

// Image 3: Yeni keşifler ve eski favoriler (Curated Mixes)
const CURATED_MIXES = [
  {
    id: "liked-mix",
    title: "Beğendiğim müzikler",
    subtitle: "Otomatik oynatma listesi",
    type: "liked",
    gradient: "from-[#ec4899] via-[#8b5cf6] to-[#6366f1]",
  },
  {
    id: "discovery-mix",
    title: "Karışık Keşif Listeniz",
    subtitle: "James Blake, Dead By Sunrise, Sakiler, Ozan Çolakoğlu",
    thumbnail: "https://i.ytimg.com/vi/1kUAAsqAz30/hqdefault.jpg",
    type: "mix",
  },
  {
    id: "repeat-mix",
    title: "Tekrar Mix'i",
    subtitle: "Radiohead, Eminem, Fironn, Talking Heads",
    thumbnail: "https://i.ytimg.com/vi/Xp5AT4V5WIc/hqdefault.jpg",
    type: "mix",
  },
  {
    id: "archive-mix",
    title: "Arşivden Şarkılar",
    subtitle: "MGMT, Tame Impala, glwzbll, K.Flay",
    thumbnail: "https://i.ytimg.com/vi/5K0V7sPWdVw/hqdefault.jpg",
    type: "mix",
  },
];

// Image 4: Sizin için seçilen trend şarkılar (4-row compact horizontal columns)
const TRENDING_PICKS: Track[] = [
  {
    id: "hl5t3TyP8aY",
    title: "03' Bonnie & Clyde (Radio Edit) (feat. Beyoncé...)",
    artist: "JAY-Z",
    album: "4,6 Mn kez dinlendi • 03' Bonnie & Clyde",
    thumbnail: "https://i.ytimg.com/vi/hl5t3TyP8aY/hqdefault.jpg",
    duration: "3:25",
  },
  {
    id: "TOlOpSkyHa0",
    title: "beni öldüren atışlar değil o bakışlardı",
    artist: "deth, rash ve yasins",
    album: "20 B kez dinlendi • beni öldüren atışlar de...",
    thumbnail: "https://i.ytimg.com/vi/TOlOpSkyHa0/hqdefault.jpg",
    duration: "2:40",
  },
  {
    id: "MBi8C6dJm6E",
    title: "The Forgiveness Chant",
    artist: "4LFA",
    album: "25 B kez dinlendi • DIWAN",
    thumbnail: "https://i.ytimg.com/vi/MBi8C6dJm6E/hqdefault.jpg",
    duration: "3:10",
  },
  {
    id: "t4t4iJVvAHo",
    title: "Kal Be Gönlüm",
    artist: "Serdar Ortaç",
    album: "489 B kez dinlendi • Kal Be Gönlüm",
    thumbnail: "https://i.ytimg.com/vi/t4t4iJVvAHo/hqdefault.jpg",
    duration: "4:02",
  },
  {
    id: "gET0VfwA-Jw",
    title: "François Besse",
    artist: "Lacrim",
    album: "151 B kez dinlendi • De ma fenêtre",
    is_explicit: true,
    thumbnail: "https://i.ytimg.com/vi/gET0VfwA-Jw/hqdefault.jpg",
    duration: "3:15",
  },
  {
    id: "F5Q8lWLaumo",
    title: "Akila",
    artist: "Motive",
    album: "1,6 Mn kez dinlendi • Akila",
    thumbnail: "https://i.ytimg.com/vi/F5Q8lWLaumo/hqdefault.jpg",
    duration: "2:50",
  },
  {
    id: "YS6HQ8IqWfk",
    title: "Romenzo Criminale",
    artist: "Lacrim",
    album: "106 B kez dinlendi • De ma fenêtre",
    is_explicit: true,
    thumbnail: "https://i.ytimg.com/vi/YS6HQ8IqWfk/hqdefault.jpg",
    duration: "3:30",
  },
  {
    id: "DPEodkHzH-s",
    title: "Housewife",
    artist: "Tate McRae",
    album: "10 Mn kez dinlendi • Housewife",
    thumbnail: "https://i.ytimg.com/vi/DPEodkHzH-s/hqdefault.jpg",
    duration: "2:45",
  },
  {
    id: "LfEK1pDDJew",
    title: "Dayanamıyorum",
    artist: "Kerim Araz ve Sevgim Yılmaz",
    album: "2 Mn kez dinlendi • Dayanamıyorum",
    thumbnail: "https://i.ytimg.com/vi/LfEK1pDDJew/hqdefault.jpg",
    duration: "3:18",
  },
  {
    id: "9KVsSUFW5Bk",
    title: "MADARA (feat. Neil Kaplan ve Hideyoshi)",
    artist: "EZ MIL ve Eminem",
    album: "4,2 Mn kez dinlendi • MADARA",
    is_explicit: true,
    thumbnail: "https://i.ytimg.com/vi/9KVsSUFW5Bk/hqdefault.jpg",
    duration: "3:40",
  },
  {
    id: "0Wc2J3Y9s8w",
    title: "الغرام المستحيل",
    artist: "Sari Alsalibe",
    album: "1 Mn kez dinlendi • الغرام المستحيل",
    thumbnail: "https://i.ytimg.com/vi/0Wc2J3Y9s8w/hqdefault.jpg",
    duration: "4:10",
  },
  {
    id: "bU_kF9_H7g4",
    title: "لو تعرف",
    artist: "Ramy Sabry",
    album: "214 B kez dinlendi • حفلة المسرح الروماني 2026",
    thumbnail: "https://i.ytimg.com/vi/bU_kF9_H7g4/hqdefault.jpg",
    duration: "3:55",
  },
];

// Image 5: Günlük keşif
const DAILY_DISCOVER: Track[] = [
  {
    id: "U85bOgG7DWM",
    title: "Ring Ring Ring",
    artist: "Tyler, The Creator",
    album: "26 Mn kez dinlendi",
    is_explicit: true,
    thumbnail: "https://i.ytimg.com/vi/U85bOgG7DWM/hqdefault.jpg",
    duration: "3:52",
  },
  {
    id: "1kUAAsqAz30",
    title: "Without You",
    artist: "Strawberry Guy",
    album: "18 Mn kez dinlendi",
    thumbnail: "https://i.ytimg.com/vi/1kUAAsqAz30/hqdefault.jpg",
    duration: "3:17",
  },
  {
    id: "mogx5OcUcR4",
    title: "Söyle Sunam",
    artist: "Nurettin Rençber",
    album: "63 Mn kez dinlendi",
    thumbnail: "https://i.ytimg.com/vi/mogx5OcUcR4/hqdefault.jpg",
    duration: "4:28",
  },
  {
    id: "H5NA_UTSYeE",
    title: "25",
    artist: "Ati242",
    album: "168 Mn kez dinlendi",
    thumbnail: "https://i.ytimg.com/vi/H5NA_UTSYeE/hqdefault.jpg",
    duration: "2:44",
  },
  {
    id: "dSEE_LAMilE",
    title: "Uslandım",
    artist: "No.1",
    album: "900 B kez dinlendi",
    thumbnail: "https://i.ytimg.com/vi/dSEE_LAMilE/hqdefault.jpg",
    duration: "3:05",
  },
  {
    id: "Xp5AT4V5WIc",
    title: "Bu Defa",
    artist: "Sakin",
    album: "501 B kez dinlendi",
    thumbnail: "https://i.ytimg.com/vi/Xp5AT4V5WIc/hqdefault.jpg",
    duration: "4:01",
  },
];

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
  onNavigateAlbum,
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

  // Strictly 6 tracks for top section
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

  // Smooth shelf scrolling helper for < and > arrow controls
  const scrollShelf = (id: string, dir: -1 | 1) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollBy({ left: dir * 420, behavior: "smooth" });
    }
  };

  return (
    <div
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-6 md:px-8 pt-16 pb-28 space-y-10 relative z-10 bg-transparent ${
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

        {/* SECTION: Son dinledikleriniz */}
        <h2
          className={`text-xl md:text-2xl font-bold tracking-tight mb-4 ${
            isLight ? "text-neutral-900" : "text-white"
          }`}
        >
          {language === "tr" ? "Son dinledikleriniz" : "Recently played"}
        </h2>

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

      {/* 2. SECTION: Kitaplığınızdan (From your library) */}
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

      {/* 3. SECTION (Image 1): Sizin için önerilen albümler */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className={`text-xl md:text-2xl font-bold tracking-tight ${
              isLight ? "text-neutral-900" : "text-white"
            }`}
          >
            {language === "tr" ? "Sizin için önerilen albümler" : "Recommended albums for you"}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollShelf("shelf-rec-albums", -1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollShelf("shelf-rec-albums", 1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          id="shelf-rec-albums"
          className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-2 px-2 scroll-smooth"
        >
          {RECOMMENDED_ALBUMS.map((alb) => (
            <div
              key={`alb-${alb.id}`}
              onClick={() => {
                if (onNavigateAlbum) {
                  onNavigateAlbum(alb.albumId || alb.id, alb.title, alb.artist, alb.thumbnail);
                } else {
                  onPlayTrack({
                    id: alb.id,
                    title: alb.title,
                    artist: alb.artist,
                    album: alb.title,
                    thumbnail: alb.thumbnail,
                  });
                }
              }}
              className={`w-40 md:w-48 shrink-0 group flex flex-col p-2.5 rounded-xl transition-colors duration-200 cursor-pointer relative select-none ${
                isLight ? "hover:bg-neutral-100/90" : "hover:bg-white/[0.07]"
              }`}
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-2.5">
                <TrackCover
                  src={alb.thumbnail}
                  alt={alb.title}
                  className="group-hover:scale-105 transition-transform duration-300"
                  iconSize="md"
                />

                <div className="absolute right-2 bottom-2 transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack({
                        id: alb.id,
                        title: alb.title,
                        artist: alb.artist,
                        album: alb.title,
                        thumbnail: alb.thumbnail,
                      });
                    }}
                    className="w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    data-tooltip="Oynat"
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
                  title={alb.title}
                >
                  {alb.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {alb.isExplicit && (
                    <span
                      title="Explicit"
                      className="w-3.5 h-3.5 rounded-[3px] bg-neutral-400 text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                    >
                      E
                    </span>
                  )}
                  <p
                    className={`text-xs truncate ${
                      isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {alb.type} • {alb.artist}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECTION (Image 2): Unutulan favoriler (Landscape 16:9 Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className={`text-xl md:text-2xl font-bold tracking-tight ${
              isLight ? "text-neutral-900" : "text-white"
            }`}
          >
            {language === "tr" ? "Unutulan favoriler" : "Forgotten favorites"}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollShelf("shelf-forgotten-favs", -1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollShelf("shelf-forgotten-favs", 1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          id="shelf-forgotten-favs"
          className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-2 px-2 scroll-smooth"
        >
          {FORGOTTEN_FAVORITES.map((t) => {
            const isActive = activeTrack?.id === t.id;
            const isThisPlaying = isActive && isPlaying;

            return (
              <div
                key={`forgotten-${t.id}`}
                onClick={() => onPlayTrack(t, FORGOTTEN_FAVORITES)}
                className={`w-64 md:w-72 shrink-0 group flex flex-col p-2.5 rounded-xl transition-colors duration-200 cursor-pointer relative select-none ${
                  isLight ? "hover:bg-neutral-100/90" : "hover:bg-white/[0.07]"
                }`}
              >
                {/* 16:9 Landscape Video Aspect */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-2.5">
                  <TrackCover
                    src={t.thumbnail}
                    alt={t.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                    iconSize="md"
                  />

                  {/* Centered Video Play Button on Hover */}
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
                        onPlayTrack(t, FORGOTTEN_FAVORITES);
                      }}
                      className="pointer-events-auto w-11 h-11 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-2xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
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

                <div className="min-w-0">
                  <h4
                    className={`font-semibold text-sm line-clamp-1 ${
                      isActive
                        ? "text-[#ff0000]"
                        : isLight
                        ? "text-neutral-900"
                        : "text-white"
                    }`}
                    title={t.title}
                  >
                    {t.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {t.is_explicit && (
                      <span
                        title="Explicit"
                        className="w-3.5 h-3.5 rounded-[3px] bg-neutral-400 text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                      >
                        E
                      </span>
                    )}
                    <p
                      className={`text-xs truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                      title={`${t.artist} • ${t.album}`}
                    >
                      {t.artist} • {t.album}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. SECTION (Image 3): Yeni keşifler ve eski favoriler */}
      <section className="space-y-4">
        <h2
          className={`text-xl md:text-2xl font-bold tracking-tight ${
            isLight ? "text-neutral-900" : "text-white"
          }`}
        >
          {language === "tr" ? "Yeni keşifler ve eski favoriler" : "New discoveries and old favorites"}
        </h2>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-2 px-2 scroll-smooth">
          {CURATED_MIXES.map((mix) => (
            <div
              key={`mix-${mix.id}`}
              onClick={() => {
                if (mix.type === "liked") {
                  const likedPl = playlists.find((p) => p.id === "LM" || p.id === "liked");
                  if (likedPl) onSelectPlaylist?.(likedPl);
                } else if (mix.thumbnail) {
                  onPlayTrack({
                    id: mix.id,
                    title: mix.title,
                    artist: mix.subtitle,
                    album: "YouTube Music Mix",
                    thumbnail: mix.thumbnail,
                  });
                }
              }}
              className={`w-44 md:w-52 shrink-0 group flex flex-col p-2.5 rounded-xl transition-colors duration-200 cursor-pointer relative select-none ${
                isLight ? "hover:bg-neutral-100/90" : "hover:bg-white/[0.07]"
              }`}
            >
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-2.5">
                {mix.type === "liked" ? (
                  <div className={`w-full h-full bg-gradient-to-br ${mix.gradient} flex items-center justify-center`}>
                    <ThumbsUp className="w-12 h-12 text-white fill-white" />
                  </div>
                ) : (
                  <TrackCover
                    src={mix.thumbnail}
                    alt={mix.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                    iconSize="lg"
                  />
                )}

                <div className="absolute right-2.5 bottom-2.5 transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mix.type === "liked") {
                        const likedPl = playlists.find((p) => p.id === "LM" || p.id === "liked");
                        if (likedPl) onPlayPlaylist?.(likedPl);
                      } else if (mix.thumbnail) {
                        onPlayTrack({
                          id: mix.id,
                          title: mix.title,
                          artist: mix.subtitle,
                          album: "Mix",
                          thumbnail: mix.thumbnail,
                        });
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    data-tooltip="Oynat"
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </button>
                </div>
              </div>

              <div className="min-w-0">
                <h4
                  className={`font-semibold text-sm truncate ${
                    isLight ? "text-neutral-900" : "text-white"
                  }`}
                  title={mix.title}
                >
                  {mix.title}
                </h4>
                <p
                  className={`text-xs mt-0.5 line-clamp-2 ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                  }`}
                  title={mix.subtitle}
                >
                  {mix.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. SECTION (Image 4): Sizin için seçilen trend şarkılar (4-Row Compact Columns) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className={`text-xl md:text-2xl font-bold tracking-tight ${
              isLight ? "text-neutral-900" : "text-white"
            }`}
          >
            {language === "tr" ? "Sizin için seçilen trend şarkılar" : "Trending songs picked for you"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlayTrack(TRENDING_PICKS[0], TRENDING_PICKS)}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isLight
                  ? "border-neutral-300 hover:bg-neutral-100 text-neutral-800"
                  : "border-neutral-700 hover:bg-neutral-800 text-white"
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{language === "tr" ? "Tümünü oynat" : "Play all"}</span>
            </button>
            <button
              onClick={() => scrollShelf("shelf-trending-grid", -1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollShelf("shelf-trending-grid", 1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-Row Horizontal Column Flow */}
        <div
          id="shelf-trending-grid"
          className="grid grid-rows-4 grid-flow-col auto-cols-[290px] sm:auto-cols-[330px] md:auto-cols-[370px] gap-x-4 gap-y-2 overflow-x-auto no-scrollbar scroll-smooth pb-2 -mx-2 px-2"
        >
          {TRENDING_PICKS.map((track) => {
            const isActive = activeTrack?.id === track.id;
            const isThisPlaying = isActive && isPlaying;

            return (
              <div
                key={`trending-${track.id}`}
                onClick={() => onPlayTrack(track, TRENDING_PICKS)}
                onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                className={`group flex items-center gap-3 p-1.5 rounded-xl transition-colors cursor-pointer select-none ${
                  isLight
                    ? isActive
                      ? "bg-neutral-200/80"
                      : "hover:bg-neutral-100"
                    : isActive
                    ? "bg-white/[0.12]"
                    : "hover:bg-white/[0.06]"
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-neutral-200 dark:bg-neutral-800 shadow-xs">
                  <TrackCover
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    iconSize="sm"
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                      isThisPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-white text-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    className={`text-sm font-semibold truncate ${
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
                      className={`text-xs truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                      title={`${track.artist} • ${track.album}`}
                    >
                      {track.artist} • {track.album}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. SECTION (Image 5): Günlük keşif */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className={`text-xl md:text-2xl font-bold tracking-tight ${
              isLight ? "text-neutral-900" : "text-white"
            }`}
          >
            {language === "tr" ? "Günlük keşif" : "Daily discover"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlayTrack(DAILY_DISCOVER[0], DAILY_DISCOVER)}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isLight
                  ? "border-neutral-300 hover:bg-neutral-100 text-neutral-800"
                  : "border-neutral-700 hover:bg-neutral-800 text-white"
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{language === "tr" ? "Tümünü oynat" : "Play all"}</span>
            </button>
            <button
              onClick={() => scrollShelf("shelf-daily-discover", -1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollShelf("shelf-daily-discover", 1)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-200 text-neutral-700" : "hover:bg-white/10 text-white"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          id="shelf-daily-discover"
          className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-2 px-2 scroll-smooth"
        >
          {DAILY_DISCOVER.map((track) => {
            const isActive = activeTrack?.id === track.id;
            const isThisPlaying = isActive && isPlaying;

            return (
              <div
                key={`daily-${track.id}`}
                onClick={() => onPlayTrack(track, DAILY_DISCOVER)}
                onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                className={`w-36 md:w-44 shrink-0 group flex flex-col p-2.5 rounded-xl transition-colors duration-200 cursor-pointer relative select-none ${
                  isLight ? "hover:bg-neutral-100/90" : "hover:bg-white/[0.07]"
                }`}
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-2.5">
                  <TrackCover
                    src={track.thumbnail}
                    alt={track.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                    iconSize="md"
                  />

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
                        onPlayTrack(track, DAILY_DISCOVER);
                      }}
                      className="pointer-events-auto w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      data-tooltip={isThisPlaying ? "Duraklat" : "Oynat"}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="min-w-0">
                  <h4
                    className={`font-semibold text-sm truncate ${
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
                      className={`text-xs truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                      title={`${track.artist} • ${track.album}`}
                    >
                      {track.artist} • {track.album}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
