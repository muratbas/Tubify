import { ArtistLinks } from "./ArtistLinks";
import { type FC, useState, useMemo, useEffect } from "react";
import {
  Play,
  Pause,
  Music2,
  Heart,
  MoreHorizontal,
  Loader2,
  X,
  Search,
  CheckCircle2,
  ArrowDownToLine,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useDownload } from "../context/DownloadContext";
import { MicroVisualizer } from "./MicroVisualizer";
import { getOptimizedThumbnail } from "./HomeView";
import type { Track, Playlist, RecentSearchItem } from "../types/music";
export type { RecentSearchItem };

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
  onPlayAlbum?: (albumId: string, albumTitle?: string, artistName?: string, thumbnail?: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onSelectQuery: (newQuery: string) => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

const CATEGORY_IDS: SearchCategory[] = [
  "all",
  "songs",
  "artists",
  "albums",
  "playlists",
  "podcasts",
];

export function isMediaTypeIndicator(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.trim().toLowerCase();
  return [
    "song", "songs", "şarkı", "şarkılar",
    "video", "videos", "videolar",
    "artist", "artists", "sanatçı", "sanatçılar",
    "album", "albums", "albüm", "albümler",
    "single", "singles", "tekli", "tekliler",
    "ep", "podcast", "podcasts"
  ].includes(lower);
}

export function isPlayCountMetric(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.trim().toLowerCase();
  return (
    lower.includes("dinlenme") ||
    lower.includes("plays") ||
    lower.includes("play") ||
    lower.includes("görüntüleme") ||
    lower.includes("views") ||
    lower.includes("view") ||
    lower.includes("wiedergaben") ||
    lower.includes("écoutes") ||
    lower.includes("vues") ||
    lower.includes("reproducciones") ||
    lower.includes("visualizzazioni") ||
    /^\d+([.,]\d+)?\s*(k|m|b|mn|mr|bin|milyon|milyar)?(\s*(plays?|views?|dinlenme|görüntüleme))?$/i.test(lower)
  );
}

export function cleanTrackArtist(artist?: string | null): string {
  if (!artist) return "Unknown Artist";
  let cleaned = artist.trim();
  // Strip leading media indicator (e.g. "Şarkı, ", "Video, ", "Song • ")
  cleaned = cleaned.replace(/^(şarkı|video|song|single|tekli|ep|albüm|album)\s*[,•·-]\s*/i, "").trim();
  return cleaned || artist;
}

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
  onPlayAlbum,
  onSelectPlaylist,
  onSelectQuery: _onSelectQuery,
  onScroll,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isLight = theme === "light";
  const { isDownloaded, isDownloading, startTrackDownload, deleteTrackDownload } = useDownload();

  const getCategoryLabel = (id: SearchCategory): string => {
    switch (id) {
      case "all":
        return t.searchCategoryAll;
      case "songs":
        return t.searchCategorySongs;
      case "artists":
        return t.searchCategoryArtists;
      case "albums":
        return t.searchCategoryAlbums;
      case "playlists":
        return t.searchCategoryPlaylists;
      case "podcasts":
        return t.searchCategoryPodcasts;
    }
  };

  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    try {
      const saved = localStorage.getItem("tubify_recent_searches");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (x): x is RecentSearchItem =>
            typeof x === "object" && x !== null && "id" in x && "type" in x && "title" in x
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  // Keep recent searches updated from localStorage
  const refreshRecentSearches = () => {
    try {
      const saved = localStorage.getItem("tubify_recent_searches");
      if (!saved) {
        setRecentSearches([]);
        return;
      }
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setRecentSearches(
          parsed.filter(
            (x): x is RecentSearchItem =>
              typeof x === "object" && x !== null && "id" in x && "type" in x && "title" in x
          )
        );
      } else {
        setRecentSearches([]);
      }
    } catch {
      setRecentSearches([]);
    }
  };

  useEffect(() => {
    refreshRecentSearches();
  }, [query]);

  const recordRecentItem = (item: Omit<RecentSearchItem, "timestamp">) => {
    try {
      const saved = localStorage.getItem("tubify_recent_searches");
      let list: RecentSearchItem[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          list = parsed.filter(
            (x): x is RecentSearchItem =>
              typeof x === "object" && x !== null && "id" in x && "type" in x && "title" in x
          );
        }
      }
      const newItem: RecentSearchItem = {
        ...item,
        timestamp: Date.now(),
      };
      // Eğer aynı öğe (id) listede zaten varsa, önceki kopyası silinip en başa taşınsın (tekrar eden öğe olmasın).
      // Liste en fazla 10-12 öğe ile sınırlandırılsın (slice(0, 12)).
      const updated = [newItem, ...list.filter((x) => x.id !== item.id)].slice(0, 12);
      localStorage.setItem("tubify_recent_searches", JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (err) {
      console.error("Failed to update recent searches:", err);
    }
  };

  const handleClearRecentSearches = () => {
    try {
      localStorage.removeItem("tubify_recent_searches");
      setRecentSearches([]);
    } catch {}
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s.id !== id);
      localStorage.setItem("tubify_recent_searches", JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  };

  const handleTrackClick = (track: Track, queue?: Track[]) => {
    recordRecentItem({
      id: track.id,
      type: "song",
      title: track.title,
      subtitle: track.artist,
      thumbnailUrl: track.thumbnail || "",
    });
    onPlayTrack(track, queue);
  };

  const handleArtistClick = (artistId: string, artistName: string, thumbnail?: string) => {
    recordRecentItem({
      id: artistId,
      type: "artist",
      title: artistName,
      subtitle: t.artist,
      thumbnailUrl: thumbnail || "",
    });
    onNavigateArtist(artistId, artistName, thumbnail);
  };

  const handleAlbumClick = (albumId: string, albumTitle?: string, artistName?: string, thumbnail?: string) => {
    recordRecentItem({
      id: albumId,
      type: "album",
      title: albumTitle || (language === "tr" ? "Albüm" : "Album"),
      subtitle: artistName || (language === "tr" ? "Albüm" : "Album"),
      thumbnailUrl: thumbnail || "",
    });
    onNavigateAlbum(albumId, albumTitle, artistName, thumbnail);
  };

  const handlePlaylistClick = (playlist: Playlist) => {
    recordRecentItem({
      id: playlist.id,
      type: "playlist",
      title: playlist.title,
      subtitle: playlist.track_count || t.playlistLabel,
      thumbnailUrl: playlist.thumbnail || "",
    });
    onSelectPlaylist(playlist);
  };

  const handleRecentItemClick = (item: RecentSearchItem) => {
    recordRecentItem({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      thumbnailUrl: item.thumbnailUrl,
    });

    switch (item.type) {
      case "song": {
        const track: Track = {
          id: item.id,
          title: item.title,
          artist: item.subtitle || "",
          thumbnail: item.thumbnailUrl || null,
        };
        onPlayTrack(track);
        break;
      }
      case "artist": {
        onNavigateArtist(item.id, item.title, item.thumbnailUrl);
        break;
      }
      case "album": {
        onNavigateAlbum(item.id, item.title, item.subtitle, item.thumbnailUrl);
        break;
      }
      case "playlist": {
        onSelectPlaylist({
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnailUrl,
          description: item.subtitle,
        });
        break;
      }
    }
  };

  // Derive unique artists from search results
  const artists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; thumbnail?: string }>();
    for (const track of searchResults) {
      if (track.artist) {
        const cleanName = cleanTrackArtist(track.artist);
        if (isMediaTypeIndicator(cleanName)) continue;
        const key = cleanName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: track.artist_id || cleanName,
            name: cleanName,
            thumbnail: track.thumbnail || undefined,
          });
        }
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
      if (track.album) {
        const trimmedAlbum = track.album.trim();
        if (isPlayCountMetric(trimmedAlbum) || isMediaTypeIndicator(trimmedAlbum)) {
          continue;
        }
        if (!map.has(trimmedAlbum.toLowerCase())) {
          map.set(trimmedAlbum.toLowerCase(), {
            id: track.album_id || `album-${trimmedAlbum}`,
            title: trimmedAlbum,
            artist: cleanTrackArtist(track.artist),
            thumbnail: track.thumbnail || undefined,
          });
        }
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
        title: `${query} ${t.searchMix}`,
        description: `${searchResults[0]?.artist || query} ${t.searchMixDesc}`,
        thumbnail: searchResults[0]?.thumbnail || null,
        track_count: `${searchResults.length} ${t.songCountMultiple}`,
      });

      if (searchResults[0]?.artist && searchResults[0].artist.toLowerCase() !== qLower) {
        contextualMixes.push({
          id: `radio-${searchResults[0].artist}`,
          title: `${searchResults[0].artist} ${language === "tr" ? "Radyosu" : "Radio"}`,
          description:
            language === "tr"
              ? `${searchResults[0].artist} ile kesintisiz müzik akışı`
              : `Non-stop music stream with ${searchResults[0].artist}`,
          thumbnail: searchResults[1]?.thumbnail || searchResults[0]?.thumbnail || null,
          track_count: `50+ ${t.songCountMultiple}`,
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
      id="main-scroll-container"
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pt-4 px-6 md:px-8 pb-32 relative z-10 bg-transparent ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* 2. Arama Kategori Filtreleri (Pill Filter Bar) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none shrink-0 sticky top-0 z-20 pt-2 -mt-2">
        {CATEGORY_IDS.map((catId) => {
          const isSelected = activeCategory === catId;
          return (
            <button
              key={catId}
              onClick={() => setActiveCategory(catId)}
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
              {getCategoryLabel(catId)}
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
          {/* Son Aramalar (Recent Searches - Entity Cards) */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {t.recentSearches}
                </h3>
                <button
                  onClick={handleClearRecentSearches}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {t.clearAll}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentSearches.map((item) => {
                  const isArtist = item.type === "artist";
                  const isSong = item.type === "song";
                  const isActive = isSong && activeTrack?.id === item.id;
                  const isCurrentPlaying = isActive && isPlaying;

                  return (
                    <div
                      key={`recent-card-${item.id}`}
                      onClick={() => handleRecentItemClick(item)}
                      className="group relative p-3.5 rounded-2xl bg-neutral-100/70 hover:bg-neutral-200/60 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm select-none"
                    >
                      {/* Silme (X) Butonu: Sağ üst köşede, hover:opacity-100 */}
                      <button
                        onClick={(e) => handleRemoveRecentSearch(e, item.id)}
                        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                        title={t.removeRecentSearch}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Görsel Alanı */}
                      <div className="relative mb-3">
                        <div
                          className={`w-full aspect-square overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-sm ${
                            isArtist ? "rounded-full mx-auto" : "rounded-xl"
                          }`}
                        >
                          <SearchImage
                            src={item.thumbnailUrl}
                            alt={item.title}
                            iconSize="md"
                            isPlaylist={item.type === "playlist"}
                          />
                        </div>

                        {/* Hover Oynat Butonu - Sanatçılarda gösterilmez, albümlerde albümü çalar */}
                        {!isArtist && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.type === "album" && onPlayAlbum) {
                                onPlayAlbum(item.id, item.title, item.subtitle, item.thumbnailUrl);
                              } else {
                                handleRecentItemClick(item);
                              }
                            }}
                            className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg shadow-red-600/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10"
                            title={isCurrentPlaying ? t.pause : t.play}
                          >
                            {isCurrentPlaying ? (
                              <Pause className="w-4 h-4 fill-white text-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Başlık ve Alt Başlık */}
                      <div className={isArtist ? "text-center" : "text-left"}>
                        <p
                          className={`font-semibold text-sm truncate ${
                            isActive
                              ? "text-[#ff0000]"
                              : "text-neutral-900 dark:text-white"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {isArtist
                            ? t.artist
                            : item.subtitle ||
                              (item.type === "album"
                                ? (language === "tr" ? "Albüm" : "Album")
                                : item.type === "playlist"
                                ? t.playlistLabel
                                : t.song)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentSearches.length === 0 && (
            <div className="py-24 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                {language === "tr" ? "Şarkı, sanatçı veya çalma listesi arayın" : "Search for songs, artists, or playlists"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                {language === "tr"
                  ? "Dinlemek istediğiniz müziği bulmak için yukarıdaki arama çubuğunu kullanın."
                  : "Use the search bar above to find the music you want to listen to."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* NO RESULTS FOR QUERY STATE */}
      {!isSearching && hasQuery && searchResults.length === 0 && !searchError && (
        <div className="py-24 text-center space-y-3">
          <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            {language === "tr" ? `"${query}" için sonuç bulunamadı` : `No results found for "${query}"`}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            {t.searchNoResultsHelp}
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
                      {t.topResult}
                    </h3>
                    <div
                      onClick={() => {
                        if (topResult.type === "artist") {
                          handleArtistClick(topResult.id, topResult.name, topResult.thumbnail || undefined);
                        } else {
                          handleTrackClick(topResult.track, searchResults);
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
                          {topResult.type === "artist" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full">
                              {t.artist}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate">
                              {`${t.song} • ${cleanTrackArtist(topResult.artistName)}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hover Play Button - Sanatçı en iyi sonuçlarında gizlenir */}
                      {topResult.type !== "artist" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackClick(topResult.track, searchResults);
                          }}
                          className="w-12 h-12 rounded-full bg-[#ff0000] text-white shadow-xl shadow-red-500/30 flex items-center justify-center absolute bottom-5 right-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                          title={t.play}
                        >
                          {activeTrack?.id === topResult.track.id && isPlaying ? (
                            <Pause className="w-5 h-5 fill-white text-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3B. Sağ Sütun: "Şarkılar" (Top Songs - col-span-7) */}
                <div className="lg:col-span-7 flex flex-col">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    {t.searchCategorySongs}
                  </h3>
                  <div className="space-y-1">
                    {topSongs.map((track) => {
                      const isActive = activeTrack?.id === track.id;
                      const isLiked = likedTrackIds.has(track.id);

                      return (
                        <div
                          key={`top-song-${track.id}`}
                          onClick={() => handleTrackClick(track, searchResults)}
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
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                <ArtistLinks
                                  artist={cleanTrackArtist(track.artist)}
                                  artistId={track.artist_id}
                                  artists={track.artists}
                                  onNavigateArtist={(id, name) => handleArtistClick(id, name, track.thumbnail || undefined)}
                                  linkClassName="hover:underline cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                                  separatorClassName="text-neutral-400 dark:text-neutral-500"
                                />
                              </div>
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
                                    title={downloaded ? t.downloadedClickToDelete : t.downloading}
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
                                  title={isLiked ? t.unlike : t.like}
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
                                    title={t.download}
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
                                  title={t.moreOptions}
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
                    {t.searchCategoryArtists}
                  </h3>
                  <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                    {artists.map((artist) => (
                      <div
                        key={`shelf-artist-${artist.id}`}
                        onClick={() =>
                          handleArtistClick(artist.id, artist.name, artist.thumbnail)
                        }
                        className="w-36 shrink-0 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all"
                      >
                        <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-3 mx-auto">
                          <SearchImage
                            src={artist.thumbnail}
                            alt={artist.name}
                            iconSize="lg"
                          />
                        </div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-white text-center truncate">
                          {artist.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-0.5">
                          {t.artist}
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
                    {t.searchCategoryAlbums}
                  </h3>
                  <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                    {albums.map((album) => (
                      <div
                        key={`shelf-album-${album.id}`}
                        onClick={() =>
                          handleAlbumClick(album.id, album.title, album.artist, album.thumbnail)
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onPlayAlbum) {
                                  onPlayAlbum(album.id, album.title, album.artist, album.thumbnail);
                                } else {
                                  handleAlbumClick(album.id, album.title, album.artist, album.thumbnail);
                                }
                              }}
                              className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                              title={t.play}
                            >
                              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                            </button>
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
                    {t.searchCategoryPlaylists}
                  </h3>
                  <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                    {matchingPlaylists.map((playlist) => (
                      <div
                        key={`shelf-playlist-${playlist.id}`}
                        onClick={() => handlePlaylistClick(playlist)}
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
                          {playlist.track_count || t.playlistLabel}
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
                {t.allSongs} ({searchResults.length})
              </h3>
              {searchResults.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`song-full-${track.id}-${idx}`}
                    onClick={() => handleTrackClick(track, searchResults)}
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
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          <ArtistLinks
                            artist={cleanTrackArtist(track.artist)}
                            artistId={track.artist_id}
                            artists={track.artists}
                            onNavigateArtist={(id, name) => handleArtistClick(id, name, track.thumbnail || undefined)}
                            linkClassName="hover:underline cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                            separatorClassName="text-neutral-400 dark:text-neutral-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {track.album && !isPlayCountMetric(track.album) && !isMediaTypeIndicator(track.album) && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlbumClick(
                              track.album_id || `album-${track.album}`,
                              track.album || undefined,
                              cleanTrackArtist(track.artist),
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
                              title={downloaded ? t.downloadedClickToDelete : t.downloading}
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
                            title={isLiked ? t.unlike : t.like}
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
                              title={t.download}
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
                            title={t.moreOptions}
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
                {t.searchCategoryArtists} ({artists.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {artists.map((artist) => (
                  <div
                    key={`artist-grid-${artist.id}`}
                    onClick={() =>
                      handleArtistClick(artist.id, artist.name, artist.thumbnail)
                    }
                    className="p-4 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all flex flex-col items-center"
                  >
                    <div className="relative w-36 h-36 rounded-full overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 mb-3">
                      <SearchImage
                        src={artist.thumbnail}
                        alt={artist.name}
                        iconSize="lg"
                      />
                    </div>
                    <p className="font-semibold text-sm text-neutral-900 dark:text-white text-center truncate w-full">
                      {artist.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-1">
                      {t.artist}
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
                {t.searchCategoryAlbums} ({albums.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {albums.map((album) => (
                  <div
                    key={`album-grid-${album.id}`}
                    onClick={() =>
                      handleAlbumClick(album.id, album.title, album.artist, album.thumbnail)
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onPlayAlbum) {
                              onPlayAlbum(album.id, album.title, album.artist, album.thumbnail);
                            } else {
                              handleAlbumClick(album.id, album.title, album.artist, album.thumbnail);
                            }
                          }}
                          className="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                          title={t.play}
                        >
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </button>
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
                {t.searchCategoryPlaylists} ({matchingPlaylists.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {matchingPlaylists.map((playlist) => (
                  <div
                    key={`playlist-grid-${playlist.id}`}
                    onClick={() => handlePlaylistClick(playlist)}
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
                      {playlist.track_count || t.playlistLabel}
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
                {t.searchCategoryPodcasts} ({podcastResults.length})
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
                          {t.podcastEpisode}
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
