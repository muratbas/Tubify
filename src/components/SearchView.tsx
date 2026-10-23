import { type FC, useState, useMemo, useEffect } from "react";
import {
  Play,
  Pause,
  Music2,
  Heart,
  MoreHorizontal,
  Loader2,
  Search,
  X,
  Disc,
  Mic2,
  Flame,
  Sparkles,
  CheckCircle2,
  ArrowDownToLine,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useDownload } from "../context/DownloadContext";
import { MicroVisualizer } from "./MicroVisualizer";
import { getOptimizedThumbnail } from "./HomeView";
import type { Track, Playlist } from "../types/music";

export type SearchCategory = "all" | "songs" | "artists" | "albums" | "playlists" | "podcasts";

interface SearchViewProps {
  query: string;
  searchResults: Track[];
  isSearching: boolean;
  searchError: string | null;
  userPlaylists: Playlist[];
  activeTrack?: Track | null;
  isPlaying?: boolean;
  likedTrackIds: Set<string>;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
  onNavigateArtist: (artistId: string, artistName: string, thumbnail?: string) => void;
  onNavigateAlbum: (albumId: string, albumTitle?: string, artistName?: string, thumbnail?: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onSelectQuery: (newQuery: string) => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "songs", label: "Şarkılar" },
  { id: "artists", label: "Sanatçılar" },
  { id: "albums", label: "Albümler" },
  { id: "playlists", label: "Çalma Listeleri" },
  { id: "podcasts", label: "Podcast'ler" },
];

// Rich Discover Categories for Empty Search State
const DISCOVER_GENRES = [
  { title: "Pop", color: "from-pink-500 to-rose-600", query: "Pop" },
  { title: "Rock", color: "from-red-600 to-orange-700", query: "Rock" },
  { title: "Hip-Hop", color: "from-orange-500 to-amber-600", query: "Hip Hop" },
  { title: "Dans ve Elektronik", color: "from-teal-500 to-emerald-600", query: "Elektronik Dans" },
  { title: "Türkçe Pop", color: "from-purple-600 to-indigo-700", query: "Türkçe Pop" },
  { title: "Chill & Rahatlama", color: "from-blue-500 to-cyan-600", query: "Chill Relax" },
  { title: "Odaklanma", color: "from-emerald-600 to-teal-700", query: "Focus Study" },
  { title: "Antrenman", color: "from-rose-600 to-red-700", query: "Workout Gym" },
  { title: "Caz & Akustik", color: "from-amber-600 to-yellow-700", query: "Jazz Acoustic" },
  { title: "R&B & Soul", color: "from-violet-600 to-purple-800", query: "RnB Soul" },
  { title: "Uyku", color: "from-indigo-800 to-slate-900", query: "Sleep Ambient" },
  { title: "Parti", color: "from-fuchsia-600 to-pink-600", query: "Party Hits" },
];

// Sample podcast episodes for Podcast category
const SAMPLE_PODCASTS: Track[] = [
  {
    id: "pod-1",
    title: "Müziğin Evrimi ve Ses Mühendisliği",
    artist: "Tubify Sound Lab",
    album: "Podcast • 45 dk",
    thumbnail: "https://i.ytimg.com/vi/bU_kF9_H7g4/mqdefault.jpg",
    duration: "45:10",
  },
  {
    id: "pod-2",
    title: "Analog Dönemden Dijitale: Kayıt Teknolojileri",
    artist: "Akustik Sohbetler",
    album: "Podcast • 38 dk",
    thumbnail: "https://i.ytimg.com/vi/0Wc2J3Y9s8w/mqdefault.jpg",
    duration: "38:22",
  },
  {
    id: "pod-3",
    title: "Hit Şarkıların Perde Arkası",
    artist: "Müzik Günlüğü",
    album: "Podcast • 52 dk",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    duration: "52:40",
  },
];

/**
 * Image component with multi-level fallback
 */
const SearchImage: FC<{
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md" | "lg";
  isPlaylist?: boolean;
}> = ({ src, alt, className = "", iconSize = "md", isPlaylist = false }) => {
  const primarySrc = isPlaylist ? src || "" : getOptimizedThumbnail(src);
  const [currentSrc, setCurrentSrc] = useState<string>(() => primarySrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(isPlaylist ? src || "" : getOptimizedThumbnail(src));
    setHasError(false);
  }, [src, isPlaylist]);

  const handleError = () => {
    if (src && currentSrc !== src) {
      setCurrentSrc(src);
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
      onError={handleError}
      className={`w-full h-full object-cover ${className}`}
    />
  );
};

export const SearchView: FC<SearchViewProps> = ({
  query,
  searchResults,
  isSearching,
  searchError,
  userPlaylists,
  activeTrack,
  isPlaying = false,
  likedTrackIds,
  onPlayTrack,
  onToggleLike,
  onContextMenuTrack,
  onNavigateArtist,
  onNavigateAlbum,
  onSelectPlaylist,
  onSelectQuery,
  onScroll,
}) => {
  const { theme } = useTheme();
  const { t: _t } = useLanguage();
  const isLight = theme === "light";
  const { isDownloaded, isDownloading, startTrackDownload, deleteTrackDownload } = useDownload();

  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tubify_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep recent searches updated from localStorage
  const refreshRecentSearches = () => {
    try {
      const saved = localStorage.getItem("tubify_recent_searches");
      setRecentSearches(saved ? JSON.parse(saved) : []);
    } catch {
      setRecentSearches([]);
    }
  };

  useEffect(() => {
    refreshRecentSearches();
  }, [query]);

  const handleClearRecentSearches = () => {
    try {
      localStorage.removeItem("tubify_recent_searches");
      setRecentSearches([]);
    } catch {}
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== item);
      localStorage.setItem("tubify_recent_searches", JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  };

  // Derive unique artists from search results
  const artists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; thumbnail?: string }>();
    for (const track of searchResults) {
      if (track.artist && !map.has(track.artist.toLowerCase())) {
        map.set(track.artist.toLowerCase(), {
          id: track.artist_id || track.artist,
          name: track.artist,
          thumbnail: track.thumbnail || undefined,
        });
      }
    }
    return Array.from(map.values());
  }, [searchResults]);

  // Derive unique albums from search results
  const albums = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; artist: string; thumbnail?: string }
    >();
    for (const track of searchResults) {
      if (track.album && !map.has(track.album.toLowerCase())) {
        map.set(track.album.toLowerCase(), {
          id: track.album_id || `album-${track.album}`,
          title: track.album,
          artist: track.artist,
          thumbnail: track.thumbnail || undefined,
        });
      }
    }
    return Array.from(map.values());
  }, [searchResults]);

  // Derive matching playlists
  const matchingPlaylists = useMemo(() => {
    const qLower = query.toLowerCase().trim();
    const userMatches = userPlaylists.filter((p) =>
      p.title.toLowerCase().includes(qLower)
    );

    // If query is present and searchResults exist, generate contextual mix cards
    const contextualMixes: Playlist[] = [];
    if (searchResults.length > 0 && qLower) {
      contextualMixes.push({
        id: `mix-${query}`,
        title: `${query} Karışımı`,
        description: `${searchResults[0]?.artist || query} ve benzeri sanatçılardan oluşan Tubify özel karışımı`,
        thumbnail: searchResults[0]?.thumbnail || null,
        track_count: `${searchResults.length} şarkı`,
      });

      if (searchResults[0]?.artist && searchResults[0].artist.toLowerCase() !== qLower) {
        contextualMixes.push({
          id: `radio-${searchResults[0].artist}`,
          title: `${searchResults[0].artist} Radyosu`,
          description: `${searchResults[0].artist} ile kesintisiz müzik akışı`,
          thumbnail: searchResults[1]?.thumbnail || searchResults[0]?.thumbnail || null,
          track_count: "50+ şarkı",
        });
      }
    }

    return [...userMatches, ...contextualMixes];
  }, [query, userPlaylists, searchResults]);

  // Top Result determination
  const topResult = useMemo(() => {
    if (searchResults.length === 0) return null;
    const first = searchResults[0];
    const qLower = query.toLowerCase().trim();

    // Check if query is an artist name
    const isArtistMatch = first.artist.toLowerCase().trim() === qLower;
    if (isArtistMatch) {
      return {
        type: "artist" as const,
        id: first.artist_id || first.artist,
        name: first.artist,
        artistName: first.artist,
        thumbnail: first.thumbnail,
        track: first,
      };
    }

    return {
      type: "track" as const,
      id: first.id,
      name: first.title,
      artistName: first.artist,
      thumbnail: first.thumbnail,
      track: first,
    };
  }, [searchResults, query]);

  // Top 4 Songs for the dual-grid
  const topSongs = useMemo(() => {
    return searchResults.slice(0, 4);
  }, [searchResults]);

  // Filtered Podcasts
  const podcastResults = useMemo(() => {
    const qLower = query.toLowerCase().trim();
    if (!qLower) return SAMPLE_PODCASTS;
    return SAMPLE_PODCASTS.filter(
      (p) =>
        p.title.toLowerCase().includes(qLower) ||
        p.artist.toLowerCase().includes(qLower)
    );
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pt-4 px-6 md:px-8 pb-32 relative z-10 bg-transparent ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* 2. Arama Kategori Filtreleri (Pill Filter Bar) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none shrink-0 sticky top-0 z-20 pt-2 -mt-2">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer select-none ${
                isSelected
                  ? isLight
                    ? "bg-neutral-900 text-white shadow-sm font-semibold"
                    : "bg-white text-neutral-900 shadow-sm font-semibold"
                  : isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="py-28 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff0000]" />
        </div>
      )}

      {/* Error State */}
      {!isSearching && searchError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs mb-6">
          {searchError}
        </div>
      )}

      {/* EMPTY SEARCH STATE (User hasn't searched yet or query is empty) */}
      {!isSearching && !hasQuery && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Son Aramalar (Recent Searches) */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Son aramalar
                </h3>
                <button
                  onClick={handleClearRecentSearches}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Tümünü temizle
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item, idx) => (
                  <div
                    key={`recent-${idx}`}
                    onClick={() => onSelectQuery(item)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium cursor-pointer group transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200" />
                    <span>{item}</span>
                    <button
                      onClick={(e) => handleRemoveRecentSearch(e, item)}
                      className="p-0.5 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors ml-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                      title="Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hepsine Göz At (Browse All / Keşfet) */}
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              Hepsine göz at
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {DISCOVER_GENRES.map((genre, idx) => (
                <div
                  key={`genre-${idx}`}
                  onClick={() => onSelectQuery(genre.query)}
                  className={`relative aspect-[16/10] rounded-2xl p-4 overflow-hidden bg-gradient-to-br ${genre.color} text-white cursor-pointer shadow-md group hover:scale-[1.02] active:scale-[0.98] transition-all`}
                >
                  <span className="font-bold text-base md:text-lg block tracking-tight leading-tight">
                    {genre.title}
                  </span>
                  <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform">
                    {idx % 4 === 0 ? (
                      <Flame className="w-7 h-7 text-white/80" />
                    ) : idx % 4 === 1 ? (
                      <Disc className="w-7 h-7 text-white/80" />
                    ) : idx % 4 === 2 ? (
                      <Mic2 className="w-7 h-7 text-white/80" />
                    ) : (
                      <Sparkles className="w-7 h-7 text-white/80" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NO RESULTS FOR QUERY STATE */}
      {!isSearching && hasQuery && searchResults.length === 0 && !searchError && (
        <div className="py-24 text-center space-y-3">
          <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            "{query}" için sonuç bulunamadı
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Lütfen kelimeleri doğru yazdığından emin ol veya farklı anahtar kelimelerle tekrar dene.
          </p>
        </div>
      )}

      {/* POPULATED SEARCH RESULTS */}
      {!isSearching && hasQuery && searchResults.length > 0 && (
        <>
          {/* CATEGORY: TÜMÜ (HYBRID LAYOUT) */}
          {activeCategory === "all" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* 3. "En İyi Sonuç" ve "Şarkılar" İkili Izgarası */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 3A. Sol Sütun: "En İyi Sonuç" (Top Result - col-span-5) */}
                {topResult && (
                  <div className="lg:col-span-5 flex flex-col">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                      En iyi sonuç
                    </h3>
                    <div
                      onClick={() => {
                        if (topResult.type === "artist") {
                          onNavigateArtist(topResult.id, topResult.name, topResult.thumbnail || undefined);
                        } else {
                          onPlayTrack(topResult.track, searchResults);
                        }
                      }}
                      className="flex-1 bg-neutral-100/70 hover:bg-neutral-200/60 dark:bg-neutral-800/50 p-5 rounded-2xl cursor-pointer group relative transition-all duration-200 flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <div
                          className={`w-24 h-24 rounded-xl overflow-hidden shadow-md mb-4 bg-neutral-200 dark:bg-neutral-800 ${
                            topResult.type === "artist" ? "rounded-full" : ""
                          }`}
                        >
                          <SearchImage
                            src={topResult.thumbnail}
                            alt={topResult.name}
                            iconSize="lg"
                          />
                        </div>

                        <h4 className="text-2xl font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                          {topResult.name}
                        </h4>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate">
                            {topResult.type === "artist"
                              ? "Sanatçı"
                              : `Şarkı • ${topResult.artistName}`}
                          </span>
                          {topResult.type === "artist" && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full">
                              Sanatçı
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hover Play Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (topResult.type === "artist") {
                            onNavigateArtist(topResult.id, topResult.name, topResult.thumbnail || undefined);
                          } else {
                            onPlayTrack(topResult.track, searchResults);
                          }
                        }}
                        className="w-12 h-12 rounded-full bg-[#ff0000] text-white shadow-xl shadow-red-500/30 flex items-center justify-center absolute bottom-5 right-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                        title="Oynat"
                      >
                        {activeTrack?.id === topResult.track.id && isPlaying ? (
                          <Pause className="w-5 h-5 fill-white text-white" />
                        ) : (
                          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3B. Sağ Sütun: "Şarkılar" (Top Songs - col-span-7) */}
                <div className="lg:col-span-7 flex flex-col">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    Şarkılar
                  </h3>
                  <div className="space-y-1">
                    {topSongs.map((track) => {
                      const isActive = activeTrack?.id === track.id;
                      const isLiked = likedTrackIds.has(track.id);

                      return (
                        <div
                          key={`top-song-${track.id}`}
                          onClick={() => onPlayTrack(track, searchResults)}
                          onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                          className={`flex items-center justify-between p-2 rounded-xl group cursor-pointer transition-colors ${
                            isActive
                              ? isLight
                                ? "bg-neutral-200/70 text-black"
                                : "bg-white/10 text-white"
                              : isLight
                              ? "hover:bg-neutral-100 text-neutral-900"
                              : "hover:bg-neutral-800/60 text-white"
                          }`}
                        >
                          {/* Sol Taraf: Kapak + Şarkı adı + Sanatçı */}
                          <div className="flex items-center min-w-0 mr-3">
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 mr-3 shadow-sm bg-neutral-200 dark:bg-neutral-800">
                              <SearchImage
                                src={track.thumbnail}
                                alt={track.title}
                                iconSize="sm"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {isActive && isPlaying ? (
                                  <Pause className="w-4 h-4 fill-white text-white" />
                                ) : (
                                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                )}
                              </div>
                              {isActive && isPlaying && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <MicroVisualizer isPlaying={true} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p
                                  className={`font-medium text-sm truncate ${
                                    isActive ? "text-[#ff0000]" : ""
                                  }`}
                                >
                                  {track.title}
                                </p>
                                {track.is_explicit && (
                                  <span className="px-1 py-0.5 text-[9px] font-bold bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded leading-none shrink-0">
                                    E
                                  </span>
                                )}
                              </div>
                              <p
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateArtist(
                                    track.artist_id || track.artist,
                                    track.artist,
                                    track.thumbnail || undefined
                                  );
                                }}
                                className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 hover:underline cursor-pointer"
                              >
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          {/* Sağ Taraf: Süre & Hover Heart + MoreHorizontal */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              {/* If downloaded or downloading, show status indicator */}
                              {(() => {
                                const downloaded = isDownloaded(track.id);
                                const downloading = isDownloading(track.id);
                                if (!downloaded && !downloading) return null;
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (downloaded) deleteTrackDownload(track.id);
                                    }}
                                    className="p-1.5 rounded-full cursor-pointer transition-transform active:scale-110"
                                    title={downloaded ? "İndirildi (Silmek için tıkla)" : "İndiriliyor..."}
                                  >
                                    {downloading ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-[#ff0000]" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4 text-[#ff0000]" />
                                    )}
                                  </button>
                                );
                              })()}

                              <div className="hidden group-hover:flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLike(track);
                                  }}
                                  className="p-1.5 rounded-full text-neutral-400 hover:text-[#ff0000] transition-colors cursor-pointer"
                                  title={isLiked ? "Beğenilenlerden kaldır" : "Beğen"}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      isLiked ? "fill-[#ff0000] text-[#ff0000]" : ""
                                    }`}
                                  />
                                </button>

                                {!isDownloaded(track.id) && !isDownloading(track.id) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startTrackDownload(track);
                                    }}
                                    className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                                    title="İndir"
                                  >
                                    <ArrowDownToLine className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onContextMenuTrack?.(track, e);
                                  }}
                                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                                  title="Diğer seçenekler"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <span className="text-xs text-neutral-400 group-hover:hidden min-w-[36px] text-right font-mono">
                              {track.duration || "3:30"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. "Sanatçılar" Rafı (Dairesel Avatarlar) */}
              {artists.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    Sanatçılar
                  </h3>
                  <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                    {artists.map((artist) => (
                      <div
                        key={`shelf-artist-${artist.id}`}
                        onClick={() =>
                          onNavigateArtist(artist.id, artist.name, artist.thumbnail)
                        }
                        className="w-36 shrink-0 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                      >
                        <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-3 mx-auto">
                          <SearchImage
                            src={artist.thumbnail}
                            alt={artist.name}
                            iconSize="lg"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-white text-center truncate">
                          {artist.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-0.5">
                          Sanatçı
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5A. "Albümler" Rafı */}
              {albums.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    Albümler
                  </h3>
                  <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                    {albums.map((album) => (
                      <div
                        key={`shelf-album-${album.id}`}
                        onClick={() =>
                          onNavigateAlbum(album.id, album.title, album.artist, album.thumbnail)
                        }
                        className="w-40 shrink-0 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                      >
                        <div className="relative aspect-square w-36 rounded-xl overflow-hidden shadow-md bg-neutral-200 dark:bg-neutral-800 mb-3">
                          <SearchImage
                            src={album.thumbnail}
                            alt={album.title}
                            iconSize="md"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2.5">
                            <div className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                          {album.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {album.artist}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5B. "Çalma Listeleri" Rafı */}
              {matchingPlaylists.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    Çalma Listeleri
                  </h3>
                  <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                    {matchingPlaylists.map((playlist) => (
                      <div
                        key={`shelf-playlist-${playlist.id}`}
                        onClick={() => onSelectPlaylist(playlist)}
                        className="w-40 shrink-0 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                      >
                        <div className="relative aspect-square w-36 rounded-xl overflow-hidden shadow-md bg-neutral-200 dark:bg-neutral-800 mb-3">
                          <SearchImage
                            src={playlist.thumbnail}
                            alt={playlist.title}
                            iconSize="md"
                            isPlaylist={true}
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2.5">
                            <div className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                          {playlist.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {playlist.track_count || "Çalma listesi"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY: ŞARKILAR (FULL LIST) */}
          {activeCategory === "songs" && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
                Tüm Şarkılar ({searchResults.length})
              </h3>
              {searchResults.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`song-full-${track.id}-${idx}`}
                    onClick={() => onPlayTrack(track, searchResults)}
                    onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                    className={`flex items-center justify-between p-2.5 rounded-xl group cursor-pointer transition-colors ${
                      isActive
                        ? isLight
                          ? "bg-neutral-200/70 text-black"
                          : "bg-white/10 text-white"
                        : isLight
                        ? "hover:bg-neutral-100 text-neutral-900"
                        : "hover:bg-neutral-800/60 text-white"
                    }`}
                  >
                    <div className="flex items-center min-w-0 mr-4">
                      <span className="w-7 text-xs text-neutral-400 font-mono text-center shrink-0 mr-2 group-hover:hidden">
                        {idx + 1}
                      </span>
                      <div className="w-7 hidden group-hover:flex items-center justify-center shrink-0 mr-2">
                        {isActive && isPlaying ? (
                          <Pause className="w-4 h-4 fill-current text-[#ff0000]" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5 text-[#ff0000]" />
                        )}
                      </div>

                      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 mr-3 shadow-sm bg-neutral-200 dark:bg-neutral-800">
                        <SearchImage
                          src={track.thumbnail}
                          alt={track.title}
                          iconSize="sm"
                        />
                        {isActive && isPlaying && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <MicroVisualizer isPlaying={true} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`font-semibold text-sm truncate ${
                              isActive ? "text-[#ff0000]" : ""
                            }`}
                          >
                            {track.title}
                          </p>
                          {track.is_explicit && (
                            <span className="px-1 py-0.5 text-[9px] font-bold bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded leading-none shrink-0">
                              E
                            </span>
                          )}
                        </div>
                        <p
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateArtist(
                              track.artist_id || track.artist,
                              track.artist,
                              track.thumbnail || undefined
                            );
                          }}
                          className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 hover:underline cursor-pointer"
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {track.album && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateAlbum(
                              track.album_id || `album-${track.album}`,
                              track.album || undefined,
                              track.artist,
                              track.thumbnail || undefined
                            );
                          }}
                          className="hidden md:block text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 truncate max-w-[180px] hover:underline"
                        >
                          {track.album}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {/* If downloaded or downloading, show status indicator */}
                        {(() => {
                          const downloaded = isDownloaded(track.id);
                          const downloading = isDownloading(track.id);
                          if (!downloaded && !downloading) return null;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (downloaded) deleteTrackDownload(track.id);
                              }}
                              className="p-1.5 rounded-full cursor-pointer transition-transform active:scale-110"
                              title={downloaded ? "İndirildi (Silmek için tıkla)" : "İndiriliyor..."}
                            >
                              {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#ff0000]" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-[#ff0000]" />
                              )}
                            </button>
                          );
                        })()}

                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleLike(track);
                            }}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-[#ff0000] transition-colors cursor-pointer"
                            title={isLiked ? "Beğenilenlerden kaldır" : "Beğen"}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isLiked ? "fill-[#ff0000] text-[#ff0000]" : ""
                              }`}
                            />
                          </button>

                          {!isDownloaded(track.id) && !isDownloading(track.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startTrackDownload(track);
                              }}
                              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="İndir"
                            >
                              <ArrowDownToLine className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onContextMenuTrack?.(track, e);
                            }}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Diğer seçenekler"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <span className="text-xs text-neutral-400 group-hover:hidden min-w-[36px] text-right font-mono">
                        {track.duration || "3:30"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CATEGORY: SANATÇILAR (FULL GRID) */}
          {activeCategory === "artists" && (
            <div className="animate-in fade-in duration-200">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                Sanatçılar ({artists.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {artists.map((artist) => (
                  <div
                    key={`artist-grid-${artist.id}`}
                    onClick={() =>
                      onNavigateArtist(artist.id, artist.name, artist.thumbnail)
                    }
                    className="p-4 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all flex flex-col items-center"
                  >
                    <div className="relative w-36 h-36 rounded-full overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-3">
                      <SearchImage
                        src={artist.thumbnail}
                        alt={artist.name}
                        iconSize="lg"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-neutral-900 dark:text-white text-center truncate w-full">
                      {artist.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-1">
                      Sanatçı
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: ALBÜMLER (FULL GRID) */}
          {activeCategory === "albums" && (
            <div className="animate-in fade-in duration-200">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                Albümler ({albums.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {albums.map((album) => (
                  <div
                    key={`album-grid-${album.id}`}
                    onClick={() =>
                      onNavigateAlbum(album.id, album.title, album.artist, album.thumbnail)
                    }
                    className="p-3.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-md bg-neutral-200 dark:bg-neutral-800 mb-3">
                      <SearchImage
                        src={album.thumbnail}
                        alt={album.title}
                        iconSize="md"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                      {album.title}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {album.artist}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: ÇALMA LİSTELERİ (FULL GRID) */}
          {activeCategory === "playlists" && (
            <div className="animate-in fade-in duration-200">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                Çalma Listeleri ({matchingPlaylists.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {matchingPlaylists.map((playlist) => (
                  <div
                    key={`playlist-grid-${playlist.id}`}
                    onClick={() => onSelectPlaylist(playlist)}
                    className="p-3.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-md bg-neutral-200 dark:bg-neutral-800 mb-3">
                      <SearchImage
                        src={playlist.thumbnail}
                        alt={playlist.title}
                        iconSize="md"
                        isPlaylist={true}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                      {playlist.title}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {playlist.track_count || "Çalma listesi"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: PODCAST'LER (FULL LIST) */}
          {activeCategory === "podcasts" && (
            <div className="animate-in fade-in duration-200">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                Podcast'ler & Bölümler ({podcastResults.length})
              </h3>
              <div className="space-y-2">
                {podcastResults.map((pod) => (
                  <div
                    key={`pod-${pod.id}`}
                    onClick={() => onPlayTrack(pod, podcastResults)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center min-w-0 mr-4">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md bg-neutral-200 dark:bg-neutral-800 shrink-0 mr-4">
                        <SearchImage src={pod.thumbnail} alt={pod.title} />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-[#ff0000] uppercase tracking-wider block mb-0.5">
                          Podcast Bölümü
                        </span>
                        <p className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                          {pod.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {pod.artist} • {pod.album}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-neutral-400 font-mono">
                        {pod.duration}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(pod, podcastResults);
                        }}
                        className="w-9 h-9 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shadow group-hover:scale-105 active:scale-95 transition-all"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
