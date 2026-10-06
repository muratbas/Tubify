import { useState, type FC } from "react";
import { Play, Pause, Shuffle, Repeat, Heart, Clock3, Music2, Search, ArrowLeft } from "lucide-react";
import type { Track, Playlist } from "../types/music";

interface PlaylistViewProps {
  playlist: Playlist | { id: "liked"; title: string; description?: string };
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
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none bg-[#030303]">
      {/* Top Hero Banner (Screenshot 2 Match) */}
      <div className="relative p-8 pb-6 bg-gradient-to-b from-[#3a0d14] via-[#1c080b] to-[#030303] flex flex-col gap-6">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Geri Dön</span>
          </button>
        )}

        <div className="flex items-end gap-7">
          {/* Cover Art */}
          <div className="shrink-0 shadow-2xl">
            {isLikedPlaylist ? (
              <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-[#ff334b] via-[#e60023] to-[#730018] flex items-center justify-center shadow-2xl shadow-red-950/60 border border-white/10">
                <Heart className="w-24 h-24 text-white fill-white drop-shadow-md" />
              </div>
            ) : "thumbnail" in playlist && playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className="w-48 h-48 rounded-2xl object-cover shadow-2xl border border-white/10 bg-[#1a1a1a]"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl bg-[#1c1c1c] border border-white/10 flex items-center justify-center">
                <Music2 className="w-20 h-20 text-[#ff0000]" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300">
              PLAYLIST
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm truncate">
              {isLikedPlaylist ? "Liked Songs" : playlist.title}
            </h1>
            <p className="text-xs text-[#aaaaaa] font-medium flex items-center gap-2">
              <span>YouTube Music</span>
              <span>•</span>
              <span>{tracks.length}+ songs</span>
            </p>
          </div>
        </div>

        {/* Action Buttons Row (Screenshot 2 Match) */}
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
                ? "bg-white text-black border-white shadow-sm"
                : "bg-[#181818] text-white border-[#303030] hover:bg-[#222222]"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>

          {/* Loop Pill Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#303030] bg-[#181818] hover:bg-[#222222] text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>

          {/* Search within playlist */}
          <div className="ml-auto relative">
            <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search in playlist..."
              className="h-8 pl-8 pr-3 bg-[#161616] border border-[#2b2b2b] rounded-full text-xs text-white placeholder-[#666] focus:outline-none focus:border-[#444] w-48"
            />
          </div>
        </div>
      </div>

      {/* Tracklist Table (Spotify Style!) */}
      <div className="px-8 pb-20">
        {isLoadingTracks ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Şarkılar yükleniyor...</p>
          </div>
        ) : displayTracks.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <p className="text-sm font-medium">Bu listede henüz şarkı bulunamadı.</p>
            <p className="text-xs text-slate-600">Aramayı kullanarak yeni parçalar ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_60px_60px] gap-4 px-4 py-2 text-[11px] font-semibold text-[#888888] border-b border-[#202020] uppercase tracking-wider">
              <span>#</span>
              <span>Name</span>
              <span>Album</span>
              <span className="text-center">Like</span>
              <span className="text-right flex items-center justify-end">
                <Clock3 className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#121212] pt-1">
              {displayTracks.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onDoubleClick={() => onPlayTrack(track)}
                    className={`grid grid-cols-[40px_1fr_1fr_60px_60px] gap-4 items-center px-4 py-2 rounded-xl transition-colors group cursor-pointer ${
                      isActive ? "bg-[#222222]" : "hover:bg-[#161616]"
                    }`}
                  >
                    {/* Index or Play icon on hover */}
                    <div className="text-xs font-semibold text-[#777] flex items-center">
                      <span className="group-hover:hidden">{isActive && isPlaying ? "▶" : idx + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(track);
                        }}
                        className="hidden group-hover:flex w-6 h-6 items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        {isActive && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Name: Artwork + Title + Artist */}
                    <div className="flex items-center gap-3 min-w-0">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-10 h-10 rounded-md object-cover shrink-0 bg-[#222]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-[#222] flex items-center justify-center shrink-0">
                          <Music2 className="w-4 h-4 text-[#ff0000]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isActive ? "text-[#ff0000]" : "text-white group-hover:text-white"
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#888888] truncate">{track.artist}</p>
                      </div>
                    </div>

                    {/* Album */}
                    <div className="text-xs text-[#888888] truncate">
                      {track.album || "—"}
                    </div>

                    {/* Like Button */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        className="p-1 text-[#666] hover:text-[#ff0000] transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform active:scale-125 ${
                            isLiked ? "text-[#ff0000] fill-[#ff0000]" : "hover:scale-110"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-[#777777] text-right font-mono">
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
