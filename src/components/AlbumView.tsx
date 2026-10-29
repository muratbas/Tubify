import { useState, useEffect, useMemo, type FC } from "react";
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Clock3,
  Music2,
  Calendar,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  CheckCircle2,
  ArrowDownToLine,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useDownload } from "../context/DownloadContext";
import { getAlbumDetails } from "../services/api";
import type { AlbumDetails, Track } from "../types/music";

function formatPlays(plays?: string | number | null): string {
  if (plays === undefined || plays === null) return "";
  const raw = String(plays).replace(/\u00a0/g, " ").trim();
  if (!raw) return "";

  // If pure integer number string, e.g. "142500123" or 142500123
  const cleanDigits = raw.replace(/\s+/g, "");
  if (/^\d+$/.test(cleanDigits)) {
    const num = Number(cleanDigits);
    if (!isNaN(num)) {
      return num.toLocaleString("tr-TR");
    }
  }

  // Remove metric text suffixes like "dinlenme", "plays", "views", etc.
  const stripped = raw
    .replace(/\s*(dinlenme|plays?|views?|görüntüleme|wiedergaben|écoutes?|vues?|reproducciones)/gi, "")
    .trim();

  return stripped;
}

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
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
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
  onScroll,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isLight = theme === "light";
  const { isDownloaded, isDownloading, startTrackDownload, deleteTrackDownload } = useDownload();

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
          setError(e instanceof Error ? e.message : t.albumLoadError);
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
  }, [albumId, t.albumLoadError]);

  const defaultAlbumWord = language === "tr" ? "Albüm" : "Album";
  const displayTitle =
    (albumData?.title && albumData.title !== "Albüm" && albumData.title !== "Album"
      ? albumData.title
      : albumTitle) || defaultAlbumWord;
  const displayArtist =
    (albumData?.artist && albumData.artist !== "Unknown Artist"
      ? albumData.artist
      : initialArtistName) || "Unknown Artist";
  const displayArtistId = albumData?.artist_id || null;
  const displayThumbnail = albumData?.thumbnail || initialThumbnail || null;
  const displayYear = albumData?.year || null;
  const displayTrackCount =
    albumData?.track_count || (albumData?.tracks ? `${albumData.tracks.length} ${t.songCountMultiple}` : null);

  const tracks: Track[] = useMemo(() => {
    if (!albumData?.tracks) return [];
    return albumData.tracks.map((trk) => ({
      ...trk,
      artist:
        (trk.artist && trk.artist !== "Unknown Artist" ? trk.artist : displayArtist) || "Unknown Artist",
      artist_id: trk.artist_id || displayArtistId || undefined,
      album: trk.album && trk.album !== "Albüm" && trk.album !== "Album" ? trk.album : displayTitle,
      album_id: trk.album_id || albumId,
      thumbnail: trk.thumbnail || displayThumbnail || undefined,
      plays: trk.plays || undefined,
    }));
  }, [albumData, displayArtist, displayArtistId, displayTitle, albumId, displayThumbnail]);

  if (error && !albumData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h2 className="text-lg font-bold">{t.albumPageLoadError}</h2>
        <p className="text-xs text-neutral-400 max-w-sm">{error || "Bilinmeyen hata"}</p>
      </div>
    );
  }

  return (
    <div
      id="main-scroll-container"
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pt-0 pb-28 transition-colors bg-transparent relative z-10 ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* Hero Header - Transparent to let the fixed ambient background shine through */}
      <div className="relative px-8 pb-6 pt-6 flex flex-col gap-6 bg-transparent">
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
            className="w-14 h-14 rounded-full bg-[#ff0000] hover:bg-[#cc0000] active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title={t.playAll}
          >
            {isPlaying && activeTrack && tracks.some((trk) => trk.id === activeTrack.id) ? (
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
              title={t.shuffle}
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
            className={`grid grid-cols-[40px_minmax(180px,2fr)_minmax(100px,1fr)_84px_60px] gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b ${
              isLight ? "text-neutral-700 border-black/10" : "text-neutral-300 border-white/10"
            }`}
          >
            <span>#</span>
            <span className="min-w-0">{t.tableHeaderTitle}</span>
            <span className="text-right pr-2 text-xs font-semibold text-neutral-400 tracking-wider">
              {t.tableHeaderPlays}
            </span>
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
                    className={`grid grid-cols-[40px_minmax(180px,2fr)_minmax(100px,1fr)_84px_60px] gap-4 items-center px-4 py-2 rounded-lg transition-all group cursor-pointer ${
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
                          <span className="flex items-center gap-1 h-3.5 px-0.5" title={t.playing}>
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
                          onPlayTrack(track, tracks);
                        }}
                        className={`hidden group-hover:flex w-6 h-6 items-center justify-center hover:scale-110 transition-transform cursor-pointer ${
                          isLight ? "text-black" : "text-white"
                        }`}
                        title={t.play}
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

                    {/* Play Count (Dinlenme Sayısı) */}
                    <div
                      className={`text-xs text-right font-mono pr-2 truncate ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {formatPlays(track.plays)}
                    </div>

                    {/* ACTIONS: LIKE + DOWNLOAD + MORE */}
                    <div className="flex items-center justify-center gap-1">
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
                                ? t.downloadedClickToDelete
                                : downloading
                                ? t.downloading
                                : t.download
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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onContextMenuTrack) {
                            onContextMenuTrack(track, e);
                          }
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-opacity cursor-pointer"
                        title={t.moreOptions}
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
