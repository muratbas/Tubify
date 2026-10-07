import { useState, type FC } from "react";
import { Play, Pause, Shuffle, Repeat, Heart, Clock3, Music2, Search, ArrowLeft } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import type { Track, Playlist } from "../types/music";

interface PlaylistViewProps {
  playlist: Playlist | { id: "liked"; title: string; description?: string } | { id: "episodes"; title: string; description?: string };
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
  onBackToHome,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const [filterQuery, setFilterQuery] = useState("");
  const isLikedPlaylist = playlist.id === "liked" || playlist.id === "LM";

  const displayTracks = tracks.filter((t) => {
    if (!filterQuery) return true;
    return (
      t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (t.album && t.album.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  });

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pb-24 transition-colors ${
        isLight ? "bg-[#f0f0f0] text-[#111111]" : "bg-[#030303] text-white"
      }`}
    >
      {/* Top Hero Banner (Screenshot 3 Match) */}
      <div
        className={`relative p-8 pb-6 flex flex-col gap-6 transition-colors ${
          isLight
            ? "bg-gradient-to-b from-[#ffdbe0] via-[#faeaec] to-[#f0f0f0]"
            : "bg-gradient-to-b from-[#3a0d14] via-[#1c080b] to-[#030303]"
        }`}
      >
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer w-fit ${
              isLight ? "text-[#71717a] hover:text-[#111111]" : "text-[#888] hover:text-white"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToHome}</span>
          </button>
        )}

        <div className="flex items-end gap-7">
          {/* Cover Art - Crisp square styling like Spotify */}
          <div className="shrink-0 shadow-2xl">
            {isLikedPlaylist ? (
              <div className="w-48 h-48 rounded-none bg-gradient-to-br from-[#ff334b] via-[#e60023] to-[#730018] flex items-center justify-center shadow-2xl shadow-red-950/25 border border-white/20">
                <Heart className="w-24 h-24 text-white fill-white drop-shadow-md" />
              </div>
            ) : "thumbnail" in playlist && playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className={`w-48 h-48 rounded-none object-cover shadow-2xl border ${
                  isLight ? "border-[#e4e4e7] bg-[#e4e4e7]" : "border-white/10 bg-[#1a1a1a]"
                }`}
              />
            ) : (
              <div
                className={`w-48 h-48 rounded-none border flex items-center justify-center shadow-2xl ${
                  isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#1c1c1c] border-white/10"
                }`}
              >
                <Music2 className="w-20 h-20 text-[#ff0000]" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-2 min-w-0">
            <span
              className={`text-[11px] font-bold tracking-widest uppercase ${
                isLight ? "text-[#dc2626]" : "text-slate-300"
              }`}
            >
              PLAYLIST
            </span>
            <h1
              className={`text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm truncate ${
                isLight ? "text-[#18181b]" : "text-white"
              }`}
            >
              {isLikedPlaylist ? t.likedSongs : playlist.title}
            </h1>
            <p
              className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? "text-[#71717a]" : "text-[#aaaaaa]"
              }`}
            >
              <span>YouTube Music</span>
              <span>•</span>
              <span>{tracks.length} songs</span>
            </p>
          </div>
        </div>

        {/* Action Buttons Row (Screenshot 3 Match) */}
        <div className="flex items-center gap-3 pt-2">
          {/* Big Red Circular Play Button */}
          <button
            onClick={onPlayAll}
            disabled={tracks.length === 0}
            className="w-13 h-13 rounded-full bg-[#ff0000] hover:bg-[#e60000] text-white flex items-center justify-center shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPlaying && activeTrack && tracks.some((t) => t.id === activeTrack.id) ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </button>

          {/* Shuffle Pill Button */}
          <button
            onClick={onToggleShuffle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              isShuffle
                ? "bg-black text-white border-black shadow-sm"
                : isLight
                ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7] hover:bg-[#fafafa]"
                : "bg-[#181818] text-white border-[#303030] hover:bg-[#222222]"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>

          {/* Loop Pill Button */}
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              isLight
                ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7] hover:bg-[#fafafa]"
                : "bg-[#181818] text-white border-[#303030] hover:bg-[#222222]"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>

          {/* Search within playlist */}
          <div className="ml-auto relative">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? "text-[#a1a1aa]" : "text-[#666]"
              }`}
            />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search in playlist..."
              className={`h-8 pl-8 pr-3 border rounded-full text-xs font-medium focus:outline-none w-48 ${
                isLight
                  ? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#d4d4d8]"
                  : "bg-[#161616] border-[#2b2b2b] text-white placeholder-[#666] focus:border-[#444]"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tracklist Table (Spotify / Screenshot 3 Style) */}
      <div className="px-8 pb-16">
        {isLoadingTracks ? (
          <div
            className={`py-20 flex flex-col items-center justify-center gap-3 ${
              isLight ? "text-[#71717a]" : "text-slate-400"
            }`}
          >
            <div className="w-8 h-8 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Loading tracks...</p>
          </div>
        ) : displayTracks.length === 0 ? (
          <div
            className={`py-20 text-center space-y-2 ${
              isLight ? "text-[#71717a]" : "text-slate-500"
            }`}
          >
            <p className="text-sm font-semibold">{t.noResultsFound}</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div
              className={`grid grid-cols-[40px_1fr_1fr_60px_60px] gap-4 px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-b ${
                isLight
                  ? "text-[#71717a] border-[#e4e4e7]"
                  : "text-[#888888] border-[#202020]"
              }`}
            >
              <span>#</span>
              <span>Name</span>
              <span>Album</span>
              <span className="text-center">Like</span>
              <span className="text-right flex items-center justify-end">
                <Clock3 className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Table Rows */}
            <div className="pt-1 space-y-0.5">
              {displayTracks.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onDoubleClick={() => onPlayTrack(track)}
                    className={`grid grid-cols-[40px_1fr_1fr_60px_60px] gap-4 items-center px-4 py-2 rounded-2xl transition-all group cursor-pointer ${
                      isActive
                        ? isLight
                          ? "bg-[#ffffff] shadow-sm text-black"
                          : "bg-[#1e1e1e] text-white"
                        : isLight
                        ? "hover:bg-[#ffffff]/80 text-[#18181b]"
                        : "hover:bg-[#141414] text-slate-200"
                    }`}
                  >
                    {/* Index or Play icon on hover */}
                    <div
                      className={`text-xs font-semibold flex items-center ${
                        isLight ? "text-[#a1a1aa]" : "text-[#777]"
                      }`}
                    >
                      <span className="group-hover:hidden">{isActive && isPlaying ? "▶" : idx + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(track);
                        }}
                        className={`hidden group-hover:flex w-6 h-6 items-center justify-center hover:scale-110 transition-transform ${
                          isLight ? "text-black" : "text-white"
                        }`}
                      >
                        {isActive && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Name: Artwork + Title + Artist */}
                    <div className="flex items-center gap-3 min-w-0">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#222]"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isLight ? "bg-[#e4e4e7]" : "bg-[#222]"
                          }`}
                        >
                          <Music2 className="w-4 h-4 text-[#ff0000]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate leading-tight ${
                            isActive
                              ? "text-[#ff0000]"
                              : isLight
                              ? "text-[#18181b]"
                              : "text-white"
                          }`}
                        >
                          {track.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {track.is_explicit && (
                            <span
                              title="Explicit"
                              className="w-3.5 h-3.5 rounded-[3px] bg-[#71717a] text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                            >
                              E
                            </span>
                          )}
                          <p
                            className={`text-[11px] truncate ${
                              isLight ? "text-[#71717a]" : "text-[#888888]"
                            }`}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Album */}
                    <div
                      className={`text-xs truncate ${
                        isLight ? "text-[#71717a]" : "text-[#888888]"
                      }`}
                    >
                      {track.album || ""}
                    </div>

                    {/* Like Button */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        className={`p-1 transition-colors cursor-pointer ${
                          isLight ? "text-[#a1a1aa] hover:text-[#ff0000]" : "text-[#666] hover:text-[#ff0000]"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform active:scale-125 ${
                            isLiked ? "text-[#ff0000] fill-[#ff0000]" : "hover:scale-110"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Duration */}
                    <div
                      className={`text-xs text-right font-mono ${
                        isLight ? "text-[#71717a]" : "text-[#777777]"
                      }`}
                    >
                      {track.duration || "3:24"}
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
