import { useState, useEffect, type FC } from "react";
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Clock3,
  Music2,
  Users,
  Disc3,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getArtistDetails, searchMusic } from "../services/api";
import type { ArtistDetails, Track } from "../types/music";

interface ArtistViewProps {
  artistId: string;
  artistName?: string;
  activeTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onPlayAll: (tracks: Track[]) => void;
  onToggleShuffle?: () => void;
  isShuffle?: boolean;
  onToggleLike: (track: Track) => void;
  likedTrackIds: Set<string>;
  onNavigateAlbum: (
    albumId: string,
    albumTitle?: string,
    artistName?: string,
    thumbnail?: string
  ) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
  onBackToHome?: () => void;
}

export const ArtistView: FC<ArtistViewProps> = ({
  artistId,
  artistName,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onPlayAll,
  onToggleShuffle,
  isShuffle = false,
  onToggleLike,
  likedTrackIds,
  onNavigateAlbum,
  onContextMenuTrack,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [artistData, setArtistData] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const loadArtist = async () => {
      try {
        let details: ArtistDetails;
        // If artistId is a YouTube browseId (starts with UC or FEmusic)
        if (artistId.startsWith("UC") || artistId.startsWith("FEmusic_")) {
          details = await getArtistDetails(artistId);
        } else {
          // Fallback: search YouTube Music for artist name
          const query = artistName || artistId;
          const searchTracks = await searchMusic(query);
          const matched = searchTracks.find((t) => t.artist_id?.startsWith("UC"));
          if (matched?.artist_id) {
            details = await getArtistDetails(matched.artist_id);
          } else {
            details = {
              id: artistId,
              name: artistName || artistId,
              description: null,
              subscribers: null,
              thumbnail: searchTracks[0]?.thumbnail || null,
              top_tracks: searchTracks.slice(0, 20),
              albums: [],
              singles: [],
            };
          }
        }

        if (!isCancelled) {
          setArtistData(details);
        }
      } catch (e: unknown) {
        if (!isCancelled) {
          console.error("Artist load error:", e);
          setError(e instanceof Error ? e.message : "Sanatçı bilgileri yüklenemedi");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadArtist();

    return () => {
      isCancelled = true;
    };
  }, [artistId, artistName]);

  if (isLoading) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center h-full gap-3 ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#ff0000]" />
        <p className="text-xs font-medium">Sanatçı profili yükleniyor...</p>
      </div>
    );
  }

  if (error || !artistData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h2 className="text-lg font-bold">Sanatçı Sayfası Yüklenemedi</h2>
        <p className="text-xs text-neutral-400 max-w-sm">{error || "Bilinmeyen hata"}</p>
      </div>
    );
  }

  const topSongs = artistData.top_tracks;

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pb-28 transition-colors ${
        isLight ? "bg-white text-neutral-900" : "bg-[#121212] text-white"
      }`}
    >
      {/* Hero Header with ambient backdrop */}
      <div
        className={`relative px-8 pb-6 pt-20 flex flex-col gap-6 ${
          isLight
            ? "bg-gradient-to-b from-[#fecaca]/40 via-[#fee2e2]/20 to-white"
            : "bg-gradient-to-b from-[#450a0a] via-[#1c0606] to-[#121212]"
        }`}
      >
        <div className="flex items-end gap-6 pt-2">
          {/* Circular Artist Avatar (192x192px) */}
          <div className="shrink-0 shadow-2xl rounded-full overflow-hidden w-48 h-48 border-2 border-white/20">
            {artistData.thumbnail ? (
              <img
                src={artistData.thumbnail}
                alt={artistData.name}
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
              className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                isLight ? "text-neutral-600" : "text-white/80"
              }`}
            >
              <span>Onaylı Sanatçı</span>
            </span>
            <h1
              className={`text-6xl font-extrabold tracking-tight leading-snug pb-1 pt-0.5 ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
            >
              {artistData.name}
            </h1>
            {artistData.subscribers && (
              <p
                className={`text-sm mt-0.5 flex items-center gap-1.5 ${
                  isLight ? "text-neutral-600" : "text-neutral-400"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{artistData.subscribers} abone / dinleyici</span>
              </p>
            )}
            {artistData.description && (
              <p
                className={`text-xs max-w-xl line-clamp-2 mt-1 leading-relaxed ${
                  isLight ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                {artistData.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-6 pt-4">
          <button
            onClick={() => onPlayAll(topSongs)}
            disabled={topSongs.length === 0}
            className="w-14 h-14 rounded-full bg-[#ff0000] hover:bg-[#e60000] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
            title="Tümünü Oynat"
          >
            {isPlaying && activeTrack && topSongs.some((t) => t.id === activeTrack.id) ? (
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

      {/* Main Content: Popüler Şarkılar + Albümler + Single'lar */}
      <div className="px-8 space-y-10 pt-4">
        {/* Section 1: En Popüler Şarkılar (Top Tracks) */}
        {topSongs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-4">Popüler</h2>

            <div
              className={`grid grid-cols-[40px_1fr_1fr_70px_60px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${
                isLight ? "text-neutral-500 border-neutral-200/60" : "text-neutral-400 border-white/10"
              }`}
            >
              <span>#</span>
              <span>BAŞLIK</span>
              <span>ALBÜM</span>
              <span className="text-center"></span>
              <span className="text-right flex items-center justify-end">
                <Clock3 className="w-4 h-4" />
              </span>
            </div>

            <div className="pt-2 space-y-0.5">
              {topSongs.slice(0, 10).map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onDoubleClick={() => onPlayTrack(track, topSongs)}
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        onContextMenuTrack(track, e);
                      }
                    }}
                    className={`grid grid-cols-[40px_1fr_1fr_70px_60px] gap-4 items-center px-4 py-2 rounded-lg transition-all group cursor-pointer ${
                      isActive
                        ? isLight
                          ? "bg-neutral-100/90 text-neutral-900"
                          : "bg-white/15 text-white"
                        : isLight
                        ? "hover:bg-neutral-200/60 text-neutral-600"
                        : "hover:bg-white/10 text-neutral-400"
                    }`}
                  >
                    {/* Index or Play button */}
                    <div className="text-sm font-medium flex items-center">
                      <span className={`group-hover:hidden ${isActive ? "text-[#ff0000] font-bold" : ""}`}>
                        {isActive && isPlaying ? "▶" : idx + 1}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(track, topSongs);
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

                    {/* Artwork + Title */}
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
                        <p
                          className={`text-xs truncate leading-normal py-0.5 ${
                            isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Album Link */}
                    {(() => {
                      const isSingle = !track.album || track.album.toLowerCase() === "single";
                      return (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSingle && track.album_id) {
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

                    {/* Heart Like & More */}
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
                      {track.duration || "3:30"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Albümler (Discography) */}
        {artistData.albums.length > 0 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-4">Albümler</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {artistData.albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() =>
                    onNavigateAlbum(album.id, album.title, artistData.name, album.thumbnail || undefined)
                  }
                  className={`p-3.5 rounded-xl transition-all cursor-pointer group ${
                    isLight
                      ? "hover:bg-neutral-100/90 text-neutral-900"
                      : "hover:bg-white/10 text-white"
                  }`}
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md mb-3 bg-neutral-800">
                    {album.thumbnail ? (
                      <img
                        src={album.thumbnail}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-10 h-10 text-neutral-500" />
                      </div>
                    )}
                    <div className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl transition-all transform translate-y-2 group-hover:translate-y-0">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold truncate">{album.title}</h3>
                  {album.subtitle && (
                    <p className={`text-xs truncate mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                      {album.subtitle}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Single ve EP'ler */}
        {artistData.singles.length > 0 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-4">Single ve EP'ler</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {artistData.singles.map((single) => (
                <div
                  key={single.id}
                  onClick={() =>
                    onNavigateAlbum(single.id, single.title, artistData.name, single.thumbnail || undefined)
                  }
                  className={`p-3.5 rounded-xl transition-all cursor-pointer group ${
                    isLight
                      ? "hover:bg-neutral-100/90 text-neutral-900"
                      : "hover:bg-white/10 text-white"
                  }`}
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md mb-3 bg-neutral-800">
                    {single.thumbnail ? (
                      <img
                        src={single.thumbnail}
                        alt={single.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-10 h-10 text-neutral-500" />
                      </div>
                    )}
                    <div className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl transition-all transform translate-y-2 group-hover:translate-y-0">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold truncate">{single.title}</h3>
                  {single.subtitle && (
                    <p className={`text-xs truncate mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                      {single.subtitle}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistView;
