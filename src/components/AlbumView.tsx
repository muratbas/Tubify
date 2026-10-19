import { useState, useEffect, useMemo, type FC } from "react";
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Clock3,
  Music2,
  Calendar,
  Disc,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getAlbumDetails } from "../services/api";
import type { AlbumDetails, Track } from "../types/music";

interface AlbumViewProps {
  albumId: string;
  albumTitle?: string;
  initialArtistName?: string;
  initialThumbnail?: string;
  activeTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onPlayAll: (tracks: Track[]) => void;
  onToggleShuffle?: () => void;
  isShuffle?: boolean;
  onToggleLike: (track: Track) => void;
  likedTrackIds: Set<string>;
  onNavigateArtist: (artistId: string, artistName: string) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
  onBackToHome?: () => void;
}

export const AlbumView: FC<AlbumViewProps> = ({
  albumId,
  albumTitle,
  initialArtistName,
  initialThumbnail,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onPlayAll,
  onToggleShuffle,
  isShuffle = false,
  onToggleLike,
  likedTrackIds,
  onNavigateArtist,
  onContextMenuTrack,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [albumData, setAlbumData] = useState<AlbumDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const loadAlbum = async () => {
      try {
        const details = await getAlbumDetails(albumId);
        if (!isCancelled) {
          setAlbumData(details);
        }
      } catch (e: unknown) {
        if (!isCancelled) {
          console.error("Album load error:", e);
          setError(e instanceof Error ? e.message : "Albüm bilgileri yüklenemedi");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAlbum();

    return () => {
      isCancelled = true;
    };
  }, [albumId]);

  const displayTitle =
    (albumData?.title && albumData.title !== "Albüm" ? albumData.title : albumTitle) || "Albüm";
  const displayArtist =
    (albumData?.artist && albumData.artist !== "Unknown Artist"
      ? albumData.artist
      : initialArtistName) || "Unknown Artist";
  const displayArtistId = albumData?.artist_id || null;
  const displayThumbnail = albumData?.thumbnail || initialThumbnail || null;
  const displayYear = albumData?.year || null;
  const displayTrackCount =
    albumData?.track_count || (albumData?.tracks ? `${albumData.tracks.length} şarkı` : null);

  const tracks: Track[] = useMemo(() => {
    if (!albumData?.tracks) return [];
    return albumData.tracks.map((t) => ({
      ...t,
      artist:
        (t.artist && t.artist !== "Unknown Artist" ? t.artist : displayArtist) || "Unknown Artist",
      artist_id: t.artist_id || displayArtistId || undefined,
      album: t.album && t.album !== "Albüm" ? t.album : displayTitle,
      album_id: t.album_id || albumId,
      thumbnail: t.thumbnail || displayThumbnail || undefined,
    }));
  }, [albumData, displayArtist, displayArtistId, displayTitle, albumId, displayThumbnail]);

  if (error && !albumData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h2 className="text-lg font-bold">Albüm Sayfası Yüklenemedi</h2>
        <p className="text-xs text-neutral-400 max-w-sm">{error || "Bilinmeyen hata"}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pb-28 transition-colors ${
        isLight ? "bg-white text-neutral-900" : "bg-[#121212] text-white"
      }`}
    >
      {/* Hero Header */}
      <div
        className={`relative px-8 pb-6 pt-6 flex flex-col gap-6 ${
          isLight
            ? "bg-gradient-to-b from-[#e0e7ff]/60 via-[#f1f5f9]/30 to-white"
            : "bg-gradient-to-b from-[#1e1b4b]/80 via-[#0f172a]/40 to-[#121212]"
        }`}
      >
        <div className="flex items-end gap-6 pt-2">
          {/* Cover Art 192x192px */}
          <div className="shrink-0 shadow-2xl rounded-lg overflow-hidden w-48 h-48 bg-neutral-800">
            {displayThumbnail ? (
              <img
                src={displayThumbnail}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                <Music2 className="w-16 h-16 text-neutral-500" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1.5 min-w-0 pb-1">
            <span
              className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                isLight ? "text-neutral-600" : "text-white/80"
              }`}
            >
              <Disc className="w-3.5 h-3.5 text-[#ff0000]" />
              <span>Albüm</span>
            </span>
            <h1
              className={`text-5xl lg:text-6xl font-extrabold tracking-tight leading-snug pb-1 pt-0.5 line-clamp-2 ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
              title={displayTitle}
            >
              {displayTitle}
            </h1>
            <div
              className={`text-sm mt-0.5 flex items-center gap-2 flex-wrap ${
                isLight ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              <button
                onClick={() =>
                  onNavigateArtist(displayArtistId || displayArtist, displayArtist)
                }
                className={`font-bold hover:underline cursor-pointer ${
                  isLight ? "text-neutral-900" : "text-white"
                }`}
              >
                {displayArtist}
              </button>
              {displayYear && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{displayYear}</span>
                  </span>
                </>
              )}
              {displayTrackCount && (
                <>
                  <span>•</span>
                  <span>{displayTrackCount}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-6 pt-4">
          <button
            onClick={() => onPlayAll(tracks)}
            disabled={tracks.length === 0}
            className="w-14 h-14 rounded-full bg-[#ff0000] hover:bg-[#e60000] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
            title="Tümünü Oynat"
          >
            {isPlaying && activeTrack && tracks.some((t) => t.id === activeTrack.id) ? (
              <Pause className="w-6 h-6 fill-white stroke-white" />
            ) : (
              <Play className="w-6 h-6 fill-white stroke-white ml-1" />
            )}
          </button>

          {onToggleShuffle && (
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
          )}
        </div>
      </div>

      {/* Tracklist */}
      <div className="px-8 pt-4 pb-16">
        <div className="w-full">
          <div
            className={`grid grid-cols-[40px_1fr_70px_60px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${
              isLight ? "text-neutral-500 border-neutral-200/60" : "text-neutral-400 border-white/10"
            }`}
          >
            <span>#</span>
            <span>BAŞLIK</span>
            <span className="text-center"></span>
            <span className="text-right flex items-center justify-end">
              <Clock3 className="w-4 h-4" />
            </span>
          </div>

          {isLoading && tracks.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-20 gap-3 ${
                isLight ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              <Loader2 className="w-8 h-8 animate-spin text-[#ff0000]" />
              <p className="text-xs font-medium">Albüm şarkıları yükleniyor...</p>
            </div>
          ) : (
            <div className="pt-2 space-y-0.5">
              {tracks.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onDoubleClick={() => onPlayTrack(track, tracks)}
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        onContextMenuTrack(track, e);
                      }
                    }}
                    className={`grid grid-cols-[40px_1fr_70px_60px] gap-4 items-center px-4 py-2 rounded-lg transition-all group cursor-pointer ${
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
                          onPlayTrack(track, tracks);
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

                    {/* Thumbnail, Title & Artist */}
                    <div className="flex items-center gap-3 min-w-0">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded object-cover shrink-0"
                          loading="lazy"
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
                        <p
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateArtist(
                              track.artist_id || displayArtistId || track.artist,
                              track.artist
                            );
                          }}
                          className={`text-xs truncate leading-normal py-0.5 hover:underline cursor-pointer ${
                            isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Like Button & More */}
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

                    {/* Duration */}
                    <div
                      className={`text-xs text-right font-mono ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {track.duration || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumView;
