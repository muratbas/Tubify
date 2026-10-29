import { useState, useRef, useEffect, useMemo, type FC } from "react";
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
  Upload,
  CheckCircle2,
  ArrowDownToLine,
  Loader2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { usePlayer } from "../context/PlayerContext";
import { useDownload } from "../context/DownloadContext";
import type { Track, Playlist } from "../types/music";
import { resizeImageFile } from "./EditPlaylistModal";

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
  onEditCover?: (playlistId: string, customThumbnail: string) => Promise<void> | void;
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
  onEditCover,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { queueViewMode, showToast } = usePlayer();
  const {
    isDownloaded,
    isDownloading,
    downloadPlaylistTracks,
    startTrackDownload,
    deleteTrackDownload,
  } = useDownload();
  const isLight = theme === "light";

  const isAnyPlaylistTrackDownloading = tracks.some((trk) => isDownloading(trk.id));
  const areAllTracksDownloaded = tracks.length > 0 && tracks.every((trk) => isDownloaded(trk.id));

  const [filterQuery, setFilterQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [imageError, setImageError] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCoverDraggingOver, setIsCoverDraggingOver] = useState(false);
  const dragEnterCounterRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const isLikedPlaylist = playlist.id === "liked" || playlist.id === "LM";
  const isEditable = !isLikedPlaylist && playlist.id !== "episodes" && !!onOpenEditModal;

  const playlistThumbnail = "thumbnail" in playlist ? playlist.thumbnail : null;
  const displayCover = !imageError ? (playlistThumbnail || tracks[0]?.thumbnail) : null;

  const handleCoverDragEnter = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounterRef.current += 1;
    setIsCoverDraggingOver(true);
  };

  const handleCoverDragOver = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleCoverDragLeave = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounterRef.current = Math.max(0, dragEnterCounterRef.current - 1);
    if (dragEnterCounterRef.current === 0) {
      setIsCoverDraggingOver(false);
    }
  };

  const handleCoverDrop = async (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounterRef.current = 0;
    setIsCoverDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WebP)");
        return;
      }
      try {
        const resized = await resizeImageFile(file, 500, 0.85);
        if (onEditCover) {
          await onEditCover(playlist.id, resized);
        }
      } catch (err) {
        console.error("Kapak resmi işlenirken hata oluştu:", err);
        showToast("Kapak resmi işlenirken bir sorun oluştu");
      }
      return;
    }

    const droppedUrl =
      e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (
      droppedUrl &&
      (droppedUrl.startsWith("http://") ||
        droppedUrl.startsWith("https://") ||
        droppedUrl.startsWith("data:image/"))
    ) {
      if (onEditCover) {
        await onEditCover(playlist.id, droppedUrl);
      }
    }
  };

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

  // Total playlist duration calculation
  const totalDurationSeconds = useMemo(() => {
    return tracks.reduce((sum, track) => {
      if (!track.duration) return sum;
      const parts = track.duration.trim().split(":").map((p) => parseInt(p, 10));
      if (parts.some((p) => isNaN(p))) return sum;
      if (parts.length === 3) return sum + parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return sum + parts[0] * 60 + parts[1];
      if (parts.length === 1) return sum + parts[0];
      return sum;
    }, 0);
  }, [tracks]);

  const formattedTotalDuration = useMemo(() => {
    if (totalDurationSeconds <= 0) return null;
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0
        ? `${hours} ${t.durationHour} ${minutes} ${t.durationMinute}`
        : `${hours} ${t.durationHour}`;
    }
    return `${Math.max(1, minutes)} ${t.durationMinute}`;
  }, [totalDurationSeconds, t]);

  // Clean track count string ensuring "parça" is never concatenated with "şarkı"
  const trackCountText = useMemo(() => {
    const raw = isLikedPlaylist
      ? likedSongsTotalCount
      : "track_count" in playlist && playlist.track_count
      ? playlist.track_count
      : null;

    if (!raw) {
      return `${tracks.length.toLocaleString()} ${
        tracks.length === 1 ? t.songCountSingle : t.songCountMultiple
      }`;
    }
    const cleaned = raw
      .replace(/parça(lar)?/gi, "")
      .replace(/şarkı(lar)?/gi, "")
      .replace(/videos?/gi, "")
      .replace(/tracks?/gi, "")
      .replace(/songs?/gi, "")
      .trim();
    return cleaned
      ? `${cleaned} ${cleaned === "1" ? t.songCountSingle : t.songCountMultiple}`
      : `${tracks.length.toLocaleString()} ${
          tracks.length === 1 ? t.songCountSingle : t.songCountMultiple
        }`;
  }, [isLikedPlaylist, likedSongsTotalCount, playlist, tracks.length, t]);

  const isQueueExpanded = queueViewMode === "expanded";
  const gridTemplate = isQueueExpanded
    ? "grid-cols-[40px_minmax(200px,1fr)_84px_50px] xl:grid-cols-[40px_minmax(200px,1fr)_140px_84px_50px]"
    : "grid-cols-[40px_minmax(200px,1.5fr)_minmax(120px,1fr)_84px_50px]";
  const suggestionGridTemplate = isQueueExpanded
    ? "grid-cols-[minmax(200px,1fr)_84px_48px] xl:grid-cols-[minmax(200px,1fr)_140px_84px_48px]"
    : "grid-cols-[minmax(200px,1.5fr)_minmax(120px,1fr)_84px_48px]";

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
      id="main-scroll-container"
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pt-0 pb-28 transition-colors bg-transparent relative z-10 ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* Top Hero Banner - Transparent to let the fixed ambient background shine through */}
      <div className="relative px-8 pb-6 pt-6 flex flex-col gap-6 bg-transparent">
        <div className="flex items-end gap-6 pt-2">
          {/* Cover Art: 192x192px (w-48 h-48) with soft shadow */}
          <div
            onDragEnter={handleCoverDragEnter}
            onDragOver={handleCoverDragOver}
            onDragLeave={handleCoverDragLeave}
            onDrop={handleCoverDrop}
            className={`shrink-0 shadow-xl rounded-md overflow-hidden w-48 h-48 relative transition-all ${
              isCoverDraggingOver ? "ring-4 ring-[#ff0000] scale-[1.02]" : ""
            }`}
          >
            {isLikedPlaylist ? (
              <div className="w-full h-full bg-gradient-to-br from-[#ff0033] via-[#cc0029] to-[#700010] flex items-center justify-center">
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

            {/* Drag and Drop Over Overlay */}
            {isEditable && isCoverDraggingOver && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-20 p-3 text-center pointer-events-none animate-in fade-in duration-150">
                <Upload className="w-8 h-8 text-[#ff0000] animate-bounce" />
                <span className="text-xs font-bold leading-tight drop-shadow">
                  {language === "tr" ? "Fotoğrafı buraya bırakın" : "Drop artwork here"}
                </span>
                <span className="text-[10px] text-white/70">
                  {language === "tr" ? "Kapak hemen güncellenir" : "Cover will be updated"}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1.5 min-w-0 pb-1">
            <h1
              className={`text-6xl font-extrabold tracking-tight leading-snug pb-2 pt-1 transition-colors ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
            >
              {isLikedPlaylist ? t.likedSongs : playlist.title}
            </h1>

            {playlist.description && (
              <p
                className={`text-sm max-w-2xl line-clamp-2 transition-colors ${
                  isLight ? "text-neutral-600" : "text-neutral-300"
                }`}
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
              <span>{trackCountText}</span>
              {formattedTotalDuration && (
                <>
                  <span>•</span>
                  <span>{formattedTotalDuration}</span>
                </>
              )}
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
            title={t.play}
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
            title={t.shufflePlay}
          >
            <Shuffle className="w-6 h-6" />
          </button>

          {/* Download Playlist Button */}
          <button
            onClick={() => downloadPlaylistTracks(tracks)}
            disabled={tracks.length === 0 || isAnyPlaylistTrackDownloading || areAllTracksDownloaded}
            className={`transition-colors cursor-pointer p-2 rounded-full ${
              areAllTracksDownloaded
                ? "text-[#ff0000]"
                : isAnyPlaylistTrackDownloading
                ? "text-[#ff0000] cursor-wait"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            } disabled:opacity-50`}
            title={
              areAllTracksDownloaded
                ? t.downloadedAll
                : isAnyPlaylistTrackDownloading
                ? t.downloadingList
                : t.downloadAll
            }
          >
            {isAnyPlaylistTrackDownloading ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#ff0000]" />
            ) : areAllTracksDownloaded ? (
              <CheckCircle2 className="w-6 h-6 text-[#ff0000]" />
            ) : (
              <ArrowDownToLine className="w-6 h-6" />
            )}
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
              title={t.moreOptions}
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
                    <span>{t.editPlaylist}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    const cleanId = (playlist.id || "").replace(/^VL/, "");
                    const url = `https://music.youtube.com/playlist?list=${cleanId}`;
                    navigator.clipboard.writeText(url).then(() => {
                      showToast(t.toastLinkCopied);
                    }).catch(() => {
                      showToast(language === "tr" ? "Bağlantı kopyalanamadı" : "Failed to copy link");
                    });
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Copy className="w-4 h-4 text-neutral-400" />
                  <span>{t.copyLink}</span>
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
                      <span>{t.deleteFromLibrary}</span>
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
              placeholder={t.filter}
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
              </span>
              <span className="min-w-[200px]">{t.tableHeaderTitle}</span>
              <span className={isQueueExpanded ? "hidden xl:block truncate" : "truncate"}>{t.tableHeaderAlbum}</span>
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

                    {/* ACTIONS: LIKE + DOWNLOAD + MORE */}
                    <div className="flex items-center justify-center gap-1">
                      {/* Like Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        className="p-1 transition-transform active:scale-125 cursor-pointer"
                        title={isLiked ? t.unlike : t.like}
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

                      {/* Download / Cached Track Button */}
                      {(() => {
                        const downloaded = isDownloaded(track.id);
                        const downloading = isDownloading(track.id);

                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (downloaded) {
                                deleteTrackDownload(track.id);
                              } else if (!downloading) {
                                startTrackDownload(track);
                              }
                            }}
                            className={`p-1 transition-transform active:scale-110 cursor-pointer ${
                              downloaded || downloading
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                            title={
                              downloaded
                                ? language === "tr"
                                  ? "İndirildi (Silmek için tıkla)"
                                  : "Downloaded (Click to remove)"
                                : downloading
                                ? language === "tr"
                                  ? "İndiriliyor..."
                                  : "Downloading..."
                                : language === "tr"
                                ? "İndir"
                                : "Download"
                            }
                          >
                            {downloading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#ff0000]" />
                            ) : downloaded ? (
                              <CheckCircle2 className="w-4 h-4 text-[#ff0000]" />
                            ) : (
                              <ArrowDownToLine
                                className={`w-4 h-4 ${
                                  isLight
                                    ? "text-neutral-400 hover:text-neutral-900"
                                    : "text-neutral-400 hover:text-white"
                                } transition-colors`}
                              />
                            )}
                          </button>
                        );
                      })()}

                      {/* More Options Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onContextMenuTrack) {
                            onContextMenuTrack(track, e);
                          }
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-opacity cursor-pointer"
                        title="Diğer seçenekler"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DURATION */}
                    <div
                      className={`text-xs text-right font-mono flex items-center justify-end ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      <span>{track.duration || "3:30"}</span>
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
                  {t.suggestions}
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  {t.suggestionsBasedOn}
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
                  title={t.refreshSuggestions}
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${
                      isRefreshingSuggestions ? "animate-spin text-[#ff0000]" : ""
                    }`}
                  />
                  <span>{t.refresh}</span>
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
                        title={t.addToList}
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
