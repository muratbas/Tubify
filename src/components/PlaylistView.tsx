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
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import type { Track, Playlist } from "../types/music";

interface PlaylistViewProps {
  playlist: Playlist | { id: string; title: string; description?: string; thumbnail?: string | null };
  tracks: Track[];
  activeTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
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
}

export const PlaylistView: FC<PlaylistViewProps> = ({
  playlist,
  tracks,
  activeTrack,
  isPlaying,
  onPlayTrack,
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
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const [filterQuery, setFilterQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLikedPlaylist = playlist.id === "liked" || playlist.id === "LM";

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
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pb-28 transition-colors ${
        isLight ? "bg-white text-neutral-900" : "bg-[#121212] text-white"
      }`}
    >
      {/* Top Hero Banner with Soft Gradient melting into pure white */}
      <div
        className={`relative px-8 pb-6 pt-20 flex flex-col gap-6 ${
          isLight
            ? "bg-gradient-to-b from-[#b4c6fc]/70 via-[#e0e7ff]/40 to-white"
            : "bg-gradient-to-b from-[#351b6d] via-[#1f103d] to-[#121212]"
        }`}
      >
        <div className="flex items-end gap-6 pt-2">
          {/* Cover Art: 192x192px (w-48 h-48) with soft shadow */}
          <div className="shrink-0 shadow-xl rounded-md overflow-hidden w-48 h-48">
            {isLikedPlaylist ? (
              <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#8e2de2] to-[#c471ed] flex items-center justify-center">
                <svg
                  className="w-20 h-20 text-white fill-white drop-shadow-md"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            ) : "thumbnail" in playlist && playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className="w-full h-full object-cover bg-neutral-200"
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
            <h1
              className={`text-6xl font-extrabold tracking-tight leading-snug pb-2 pt-1 ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
            >
              {isLikedPlaylist ? "Beğenilenler" : playlist.title}
            </h1>
            <p
              className={`text-sm mt-1 flex items-center gap-1.5 ${
                isLight ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              <span className={`font-semibold ${isLight ? "text-neutral-800" : "text-white"}`}>
                murat
              </span>
              <span>•</span>
              <span>{tracks.length.toLocaleString()} şarkı</span>
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-6 pt-4">
          {/* Big YouTube Red Circular Play Button (w-14 h-14) */}
          <button
            onClick={onPlayAll}
            disabled={tracks.length === 0}
            className="w-14 h-14 rounded-full bg-[#ff0000] hover:bg-[#e60000] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
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

          {/* More Options */}
          <button
            className={`transition-colors cursor-pointer p-2 ${
              isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
            title="Daha fazla seçenek"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>

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
            <p className="text-xs font-medium">Şarkılar yükleniyor...</p>
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
            <div
              className={`grid grid-cols-[40px_1fr_1fr_140px_70px_60px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${
                isLight
                  ? "text-neutral-500 border-neutral-200/60"
                  : "text-neutral-400 border-white/10"
              }`}
            >
              <span className="flex items-center">
                <span>#</span>
                <span className="text-[#ff0000] text-[9px] ml-1">▲</span>
              </span>
              <span>BAŞLIK</span>
              <span>ALBÜM</span>
              <span></span>
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
                    className={`grid grid-cols-[40px_1fr_1fr_140px_70px_60px] gap-4 items-center px-4 py-2 rounded-lg transition-all group cursor-pointer ${
                      isActive
                        ? isLight
                          ? "bg-neutral-100/90 text-neutral-900"
                          : "bg-white/15 text-white"
                        : isLight
                        ? "hover:bg-neutral-200/60 text-neutral-600"
                        : "hover:bg-white/10 text-neutral-400"
                    }`}
                  >
                    {/* # Index or Play Icon */}
                    <div className="text-sm font-medium flex items-center">
                      <span className={`group-hover:hidden ${isActive ? "text-[#ff0000] font-bold" : ""}`}>
                        {isActive && isPlaying ? "▶" : idx + 1}
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
                    <div className="flex items-center gap-3.5 min-w-0">
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
                      <div className="min-w-0">
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
                            !isSingle && track.album_id ? "hover:underline cursor-pointer" : ""
                          } ${
                            isLight ? "text-neutral-600 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          {!isSingle ? track.album : ""}
                        </div>
                      );
                    })()}

                    {/* EKLENME TARİHİ */}
                    <div
                      className={`text-xs truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {track.added_at || "—"}
                    </div>

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
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <div className="w-4 h-4 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin" />
                  <span>Daha fazla şarkı yükleniyor...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PlaylistView;
