import { useState, useRef, useEffect, type FC } from "react";
import {
  Play,
  Pause,
  Shuffle,
  MoreHorizontal,
  Heart,
  Clock3,
  Music2,
  Search,
  Plus,
  RotateCw,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { usePlayer } from "../context/PlayerContext";
import type { Track, Playlist } from "../types/music";

interface PlaylistViewProps {
  playlist: Playlist | { id: string; title: string; description?: string; thumbnail?: string | null; track_count?: string | null };
  tracks: Track[];
  suggestions?: Track[];
  likedSongsTotalCount?: string | null;
  userProfileName?: string | null;
  activeTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onPlaySuggestion?: (track: Track) => void;
  onPlayAll: () => void;
  onToggleShuffle?: () => void;
  isShuffle?: boolean;
  onToggleLike: (track: Track) => void;
  likedTrackIds: Set<string>;
  isLoadingTracks: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onNavigateAlbum?: (
    albumId: string,
    albumTitle?: string,
    artistName?: string,
    thumbnail?: string
  ) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
  onBackToHome?: () => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  onAddSuggestion?: (track: Track) => Promise<void> | void;
  onRefreshSuggestions?: () => void;
  isRefreshingSuggestions?: boolean;
  onOpenEditModal?: (playlist: Playlist) => void;
  onDeletePlaylist?: (playlistId: string) => void;
}

export const PlaylistView: FC<PlaylistViewProps> = ({
  playlist,
  tracks,
  suggestions = [],
  likedSongsTotalCount,
  userProfileName,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onPlaySuggestion,
  onPlayAll,
  onToggleShuffle,
  isShuffle = false,
  onToggleLike,
  likedTrackIds,
  isLoadingTracks,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onNavigateArtist,
  onNavigateAlbum,
  onContextMenuTrack,
  onScroll,
  onAddSuggestion,
  onRefreshSuggestions,
  isRefreshingSuggestions = false,
  onOpenEditModal,
  onDeletePlaylist,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { queueViewMode, showToast } = usePlayer();
  const isLight = theme === "light";

  const [filterQuery, setFilterQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [imageError, setImageError] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const isLikedPlaylist = playlist.id === "liked" || playlist.id === "LM";
  const isEditable = !isLikedPlaylist && playlist.id !== "episodes" && !!onOpenEditModal;

  const playlistThumbnail = "thumbnail" in playlist ? playlist.thumbnail : null;
  const displayCover = !imageError ? (playlistThumbnail || tracks[0]?.thumbnail) : null;

  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    setImageError(false);
  }, [playlist.id, playlistThumbnail]);

  useEffect(() => {
    setVisibleCount(50);
  }, [playlist.id, filterQuery]);

  const displayTracks = tracks.filter((t) => {
    if (!filterQuery) return true;
    return (
      t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (t.album && t.album.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  });

  const renderedTracks = displayTracks.slice(0, visibleCount);

  const isQueueExpanded = queueViewMode === "expanded";
  const gridTemplate = isQueueExpanded
    ? "grid-cols-[40px_minmax(200px,1fr)_70px_50px] xl:grid-cols-[40px_minmax(200px,1fr)_140px_70px_50px]"
    : "grid-cols-[40px_minmax(200px,1.5fr)_minmax(120px,1fr)_70px_50px]";
  const suggestionGridTemplate = isQueueExpanded
    ? "grid-cols-[minmax(200px,1fr)_70px_48px] xl:grid-cols-[minmax(200px,1fr)_140px_70px_48px]"
    : "grid-cols-[minmax(200px,1.5fr)_minmax(120px,1fr)_70px_48px]";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (visibleCount < displayTracks.length) {
            setVisibleCount((prev) => Math.min(prev + 50, displayTracks.length));
          } else if (onLoadMore && hasMore && !isLoadingMore) {
            onLoadMore();
          }
        }
      },
      { rootMargin: "250px" }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [visibleCount, displayTracks.length, onLoadMore, hasMore, isLoadingMore]);

  return (
    <div
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pt-14 pb-28 transition-colors bg-transparent relative z-10 ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* Top Hero Banner - Transparent to let the fixed ambient background shine through */}
      <div className="relative px-8 pb-6 pt-6 flex flex-col gap-6 bg-transparent">
        <div className="flex items-end gap-6 pt-2">
          {/* Cover Art: 192x192px (w-48 h-48) with soft shadow */}
          <div
            className={`shrink-0 shadow-xl rounded-md overflow-hidden w-48 h-48 relative ${
              isEditable ? "group/cover cursor-pointer" : ""
            }`}
            onClick={() => {
              if (isEditable && onOpenEditModal) {
                onOpenEditModal(playlist as Playlist);
              }
            }}
          >
            {isLikedPlaylist ? (
              <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#8e2de2] to-[#c471ed] flex items-center justify-center">
                <svg
                  className="w-20 h-20 text-white fill-white drop-shadow-md"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            ) : displayCover ? (
              <img
                src={displayCover}
                alt={playlist.title}
                className="w-full h-full object-cover bg-neutral-200"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center ${
                  isLight ? "bg-neutral-200" : "bg-[#282828]"
                }`}
              >
                <Music2 className="w-16 h-16 text-neutral-400" />
              </div>
            )}

            {/* In-page edit hover overlay */}
            {isEditable && (
              <div
                className="absolute inset-0 bg-black/55 opacity-0 group-hover/cover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white z-10"
                title="Bilgileri düzenle"
              >
                <Pencil className="w-7 h-7 drop-shadow-md" />
                <span className="text-xs font-bold tracking-tight drop-shadow-md">
                  Bilgileri düzenle
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1.5 min-w-0 pb-1">
            <span
              className={`text-xs font-bold tracking-wider uppercase ${
                isLight ? "text-neutral-600" : "text-white/80"
              }`}
            >
              Çalma Listesi
            </span>
            <div
              className={`flex items-center gap-3 ${
                isEditable ? "cursor-pointer group/title" : ""
              }`}
              onClick={() => {
                if (isEditable && onOpenEditModal) {
                  onOpenEditModal(playlist as Playlist);
                }
              }}
              title={isEditable ? "Bilgileri düzenlemek için tıkla" : undefined}
            >
              <h1
                className={`text-6xl font-extrabold tracking-tight leading-snug pb-2 pt-1 transition-colors ${
                  isLight ? "text-neutral-900" : "text-white"
                } ${isEditable ? "group-hover/title:text-[#ff0000]" : ""}`}
              >
                {isLikedPlaylist ? "Beğenilenler" : playlist.title}
              </h1>
              {isEditable && (
                <button
                  type="button"
                  className="opacity-0 group-hover/title:opacity-100 transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-[#ff0000] cursor-pointer"
                  title="Bilgileri düzenle"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              )}
            </div>

            {playlist.description && (
              <p
                className={`text-sm max-w-2xl line-clamp-2 transition-colors ${
                  isLight ? "text-neutral-600" : "text-neutral-300"
                } ${isEditable ? "cursor-pointer hover:text-neutral-900 dark:hover:text-white" : ""}`}
                onClick={() => {
                  if (isEditable && onOpenEditModal) {
                    onOpenEditModal(playlist as Playlist);
                  }
                }}
              >
                {playlist.description}
              </p>
            )}

            <p
              className={`text-sm mt-1 flex items-center gap-1.5 ${
                isLight ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              <span className={`font-semibold ${isLight ? "text-neutral-800" : "text-white"}`}>
                {userProfileName && !userProfileName.toLowerCase().includes("google")
                  ? userProfileName
                  : "murat"}
              </span>
              <span>•</span>
              <span>
                {isLikedPlaylist
                  ? likedSongsTotalCount
                    ? likedSongsTotalCount.toLowerCase().includes("şarkı")
                      ? likedSongsTotalCount
                      : `${likedSongsTotalCount} şarkı`
                    : `${tracks.length.toLocaleString()} şarkı`
                  : "track_count" in playlist && playlist.track_count && playlist.track_count.trim()
                  ? playlist.track_count.toLowerCase().includes("şarkı")
                    ? playlist.track_count
                    : `${playlist.track_count} şarkı`
                  : `${tracks.length.toLocaleString()} şarkı`}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-6 pt-4">
          {/* Big YouTube Red Circular Play Button (w-14 h-14) */}
          <button
            onClick={onPlayAll}
            disabled={tracks.length === 0}
            className="w-14 h-14 rounded-full bg-[#ff0000] hover:bg-[#cc0000] active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="Oynat"
          >
            {isPlaying && activeTrack && tracks.some((t) => t.id === activeTrack.id) ? (
              <Pause className="w-6 h-6 fill-white stroke-white" />
            ) : (
              <Play className="w-6 h-6 fill-white stroke-white ml-1" />
            )}
          </button>

          {/* Shuffle Button */}
          <button
            onClick={onToggleShuffle}
            className={`transition-colors cursor-pointer p-2 ${
              isShuffle
                ? "text-[#ff0000]"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Karışık Çal"
          >
            <Shuffle className="w-6 h-6" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`transition-colors cursor-pointer p-2 rounded-full ${
                isMoreMenuOpen
                  ? isLight
                    ? "bg-neutral-200 text-neutral-900"
                    : "bg-white/20 text-white"
                  : isLight
                  ? "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title="Daha fazla seçenek"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>

            {isMoreMenuOpen && (
              <div
                className={`absolute left-0 top-full mt-2 w-52 rounded-xl py-1.5 shadow-2xl border z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isLight
                    ? "bg-white border-neutral-200 text-neutral-800 shadow-neutral-400/20"
                    : "bg-[#282828] border-white/10 text-neutral-200 shadow-black/80"
                }`}
              >
                {isEditable && (
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (onOpenEditModal) onOpenEditModal(playlist as Playlist);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Pencil className="w-4 h-4 text-neutral-400" />
                    <span>Bilgileri düzenle</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    const cleanId = (playlist.id || "").replace(/^VL/, "");
                    const url = `https://music.youtube.com/playlist?list=${cleanId}`;
                    navigator.clipboard.writeText(url).then(() => {
                      showToast("Bağlantı panoya kopyalandı");
                    }).catch(() => {
                      showToast("Bağlantı kopyalanamadı");
                    });
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Copy className="w-4 h-4 text-neutral-400" />
                  <span>Bağlantıyı kopyala</span>
                </button>

                {isEditable && onDeletePlaylist && (
                  <>
                    <div className="h-px bg-neutral-200 dark:bg-white/10 my-1" />
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onDeletePlaylist(playlist.id);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Kitaplığından sil</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Filter Search Input (🔍 Filtrele) */}
          <div className="ml-auto relative">
            <Search
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? "text-neutral-500" : "text-neutral-400"
              }`}
            />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrele"
              className={`h-8 pl-9 pr-4 rounded-full text-sm font-medium outline-none w-44 transition-colors ${
                isLight
                  ? "bg-neutral-100/80 hover:bg-neutral-200/80 focus:bg-white focus:ring-1 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-500"
                  : "bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-neutral-400"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tracklist Table */}
      <div className="px-8 pb-16">
        {isLoadingTracks ? (
          <div
            className={`py-20 flex flex-col items-center justify-center gap-3 ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            <div className="w-8 h-8 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayTracks.length === 0 ? (
          <div
            className={`py-20 text-center space-y-2 ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            <p className="text-sm font-semibold">{t.noResultsFound}</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header: # ▲, BAŞLIK, ALBÜM, EKLENME TARİHİ, 🕒 */}
            {/* Table Header */}
            <div
              className={`grid ${gridTemplate} gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b ${
                isLight
                  ? "text-neutral-700 border-black/10"
                  : "text-neutral-300 border-white/10"
              }`}
            >
              <span className="flex items-center">
                <span>#</span>
                <span className="text-[#ff0000] text-[9px] ml-1">▲</span>
              </span>
              <span className="min-w-[200px]">BAŞLIK</span>
              <span className={isQueueExpanded ? "hidden xl:block truncate" : "truncate"}>ALBÜM</span>
              <span className="text-center"></span>
              <span className="text-right flex items-center justify-end">
                <Clock3 className="w-4 h-4" />
              </span>
            </div>

            {/* Table Rows with Spotifast Hover Interaction */}
            <div className="pt-2 space-y-0.5">
              {renderedTracks.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onDoubleClick={() => onPlayTrack(track)}
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        onContextMenuTrack(track, e);
                      }
                    }}
                    className={`grid ${gridTemplate} gap-4 items-center px-4 py-2 rounded-lg transition-all group cursor-pointer ${
                      isActive
                        ? isLight
                          ? "bg-black/[0.07] text-neutral-950 font-medium"
                          : "bg-white/[0.12] text-white font-medium"
                        : isLight
                        ? "hover:bg-black/[0.05] text-neutral-700"
                        : "hover:bg-white/[0.08] text-neutral-300"
                    }`}
                  >
                    {/* # Index or Animated 3 Dots */}
                    <div className="text-sm font-medium flex items-center">
                      <span className={`group-hover:hidden ${isActive ? "text-[#ff0000] font-bold" : ""}`}>
                        {isActive && isPlaying ? (
                          <span className="flex items-center gap-1 h-3.5 px-0.5" title="Oynatılıyor">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-tubify-dot-1" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-tubify-dot-2" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-tubify-dot-3" />
                          </span>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(track);
                        }}
                        className={`hidden group-hover:flex w-6 h-6 items-center justify-center hover:scale-110 transition-transform cursor-pointer ${
                          isLight ? "text-black" : "text-white"
                        }`}
                        title="Oynat"
                      >
                        {isActive && isPlaying ? (
                          <Pause className="w-4 h-4 fill-current stroke-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current stroke-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* BAŞLIK: Artwork + Title + Explicit + Artist */}
                    <div className="flex items-center gap-3.5 min-w-[200px] overflow-hidden">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover shrink-0 bg-neutral-200"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                            isLight ? "bg-neutral-200" : "bg-[#282828]"
                          }`}
                        >
                          <Music2 className="w-4 h-4 text-[#ff0000]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                            isActive
                              ? "text-[#ff0000]"
                              : isLight
                              ? "text-neutral-900"
                              : "text-white"
                          }`}
                        >
                          {track.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {track.is_explicit && (
                            <span
                              title="Explicit"
                              className="w-3.5 h-3.5 rounded-[2px] bg-neutral-500 text-white text-[9px] font-black shrink-0 inline-flex items-center justify-center leading-none"
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
                            className={`text-xs truncate leading-normal py-0.5 hover:underline cursor-pointer ${
                              isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
                            }`}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ALBÜM */}
                    {(() => {
                      const isSingle = !track.album || track.album.toLowerCase() === "single";
                      return (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSingle && track.album_id && onNavigateAlbum) {
                              onNavigateAlbum(
                                track.album_id,
                                track.album || undefined,
                                track.artist,
                                track.thumbnail || undefined
                              );
                            }
                          }}
                          className={`text-xs truncate ${
                            isQueueExpanded ? "hidden xl:block w-[140px]" : "w-full"
                          } ${
                            !isSingle && track.album_id ? "hover:underline cursor-pointer" : ""
                          } ${
                            isLight ? "text-neutral-600 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          {!isSingle ? track.album : ""}
                        </div>
                      );
                    })()}

                    {/* LIKE BUTTON + MORE OPTIONS on Hover */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        className="p-1 transition-transform active:scale-125 cursor-pointer"
                        title={isLiked ? "Beğenilenler'den kaldır" : "Beğen"}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked
                              ? "text-[#ff0000] fill-[#ff0000]"
                              : isLight
                              ? "text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-[#ff0000]"
                              : "text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white"
                          }`}
                        />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onContextMenuTrack) {
                            onContextMenuTrack(track, e);
                          }
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-900 transition-opacity cursor-pointer"
                        title="Diğer seçenekler"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DURATION */}
                    <div
                      className={`text-xs text-right font-mono ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {track.duration || "3:30"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center pt-2">
              {isLoadingMore && (
                <div className="flex items-center justify-center py-2">
                  <div className="w-5 h-5 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestions Section */}
        {!isLoadingTracks && suggestions && suggestions.length > 0 && (
          <div className="mt-10 mb-8 border-t border-black/10 dark:border-white/10 pt-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2
                  className={`text-xl font-bold tracking-tight ${
                    isLight ? "text-neutral-900" : "text-white"
                  }`}
                >
                  Öneriler
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  Bu çalma listesindeki parçalara göre
                </p>
              </div>
              {onRefreshSuggestions && (
                <button
                  onClick={onRefreshSuggestions}
                  disabled={isRefreshingSuggestions}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isLight
                      ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 active:scale-95"
                      : "bg-white/10 hover:bg-white/15 text-neutral-200 active:scale-95"
                  }`}
                  title="Önerileri Yenile"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${
                      isRefreshingSuggestions ? "animate-spin text-[#ff0000]" : ""
                    }`}
                  />
                  <span>Yenile</span>
                </button>
              )}
            </div>

            {/* Suggestions Rows */}
            <div className="space-y-0.5">
              {suggestions.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isSingle = !track.album || track.album.toLowerCase() === "single";

                return (
                  <div
                    key={`suggestion-${track.id}-${idx}`}
                    onDoubleClick={() =>
                      onPlaySuggestion ? onPlaySuggestion(track) : onPlayTrack(track)
                    }
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        onContextMenuTrack(track, e);
                      }
                    }}
                    className={`grid ${suggestionGridTemplate} gap-4 items-center px-4 py-2 rounded-lg transition-all group cursor-pointer ${
                      isActive
                        ? isLight
                          ? "bg-black/[0.07] text-neutral-950 font-medium"
                          : "bg-white/[0.12] text-white font-medium"
                        : isLight
                        ? "hover:bg-black/[0.05] text-neutral-700"
                        : "hover:bg-white/[0.08] text-neutral-300"
                    }`}
                  >
                    {/* Artwork + Title + Artist */}
                    <div className="flex items-center gap-3.5 min-w-[200px] overflow-hidden">
                      <div className="relative w-10 h-10 shrink-0 group/cover rounded overflow-hidden">
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover bg-neutral-200"
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-neutral-200" : "bg-[#282828]"
                            }`}
                          >
                            <Music2 className="w-4 h-4 text-[#ff0000]" />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onPlaySuggestion) {
                              onPlaySuggestion(track);
                            } else {
                              onPlayTrack(track);
                            }
                          }}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                          title="Oynat"
                        >
                          {isActive && isPlaying ? (
                            <Pause className="w-4 h-4 fill-white stroke-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white stroke-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                            isActive
                              ? "text-[#ff0000]"
                              : isLight
                              ? "text-neutral-900"
                              : "text-white"
                          }`}
                        >
                          {track.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {track.is_explicit && (
                            <span
                              title="Explicit"
                              className="w-3.5 h-3.5 rounded-[2px] bg-neutral-500 text-white text-[9px] font-black shrink-0 inline-flex items-center justify-center leading-none"
                            >
                              E
                            </span>
                          )}
                          <p
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateArtist) {
                                onNavigateArtist(
                                  track.artist_id || track.artist,
                                  track.artist
                                );
                              }
                            }}
                            className={`text-xs truncate leading-normal py-0.5 hover:underline cursor-pointer ${
                              isLight
                                ? "text-neutral-500 hover:text-neutral-900"
                                : "text-neutral-400 hover:text-white"
                            }`}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ALBÜM */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSingle && track.album_id && onNavigateAlbum) {
                          onNavigateAlbum(
                            track.album_id,
                            track.album || undefined,
                            track.artist,
                            track.thumbnail || undefined
                          );
                        }
                      }}
                      className={`text-xs truncate ${
                        isQueueExpanded ? "hidden xl:block w-[140px]" : "w-full"
                      } ${
                        !isSingle && track.album_id
                          ? "hover:underline cursor-pointer"
                          : ""
                      } ${
                        isLight
                          ? "text-neutral-600 hover:text-neutral-900"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {!isSingle ? track.album : ""}
                    </div>

                    {/* DURATION */}
                    <div
                      className={`text-xs text-right font-mono ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {track.duration || "3:30"}
                    </div>

                    {/* LISTEYE EKLE (+) BUTTON */}
                    <div className="flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddSuggestion) {
                            onAddSuggestion(track);
                          }
                        }}
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                          isLight
                            ? "bg-neutral-100 hover:bg-[#ff0000] text-neutral-600 hover:text-white shadow-sm"
                            : "bg-white/10 hover:bg-[#ff0000] text-neutral-300 hover:text-white shadow-sm"
                        }`}
                        title="Listeye Ekle"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PlaylistView;
