import { type FC } from "react";
import { Play, Pause, Music2 } from "lucide-react";
import type { Track } from "../types/music";

interface HomeViewProps {
  recentlyPlayed: Track[];
  recommendations: Track[];
  listenAgain: Track[];
  activeTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
}

export const HomeView: FC<HomeViewProps> = ({
  recentlyPlayed,
  recommendations,
  listenAgain,
  activeTrack,
  isPlaying,
  onPlayTrack,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none bg-[#030303] px-8 py-6 space-y-8 pb-24">
      {/* 1. Recently Played (Horizontal Mini Cards from Screenshot 1) */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white tracking-tight">Recently played</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {recentlyPlayed.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`recent-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group flex items-center bg-[#141414] hover:bg-[#202020] rounded-xl overflow-hidden border border-[#222222] hover:border-[#383838] transition-all cursor-pointer shadow-sm relative ${
                  isActive ? "bg-[#222222] border-[#ff0000]/40" : ""
                }`}
              >
                {track.thumbnail ? (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-14 h-14 object-cover shrink-0 bg-[#222]"
                  />
                ) : (
                  <div className="w-14 h-14 bg-[#1f1f1f] flex items-center justify-center shrink-0">
                    <Music2 className="w-6 h-6 text-[#ff0000]" />
                  </div>
                )}

                <div className="px-3 min-w-0 flex-1">
                  <h4
                    className={`text-xs font-semibold truncate ${
                      isActive ? "text-[#ff0000]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-[#888888] truncate">{track.artist}</p>
                </div>

                {/* Hover Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track);
                  }}
                  className="mr-3 w-8 h-8 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-md shadow-red-500/20"
                >
                  {isActive && isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. More Recommendations (Grid of Square Cards from Screenshot 1) */}
      <section className="space-y-3.5">
        <h2 className="text-xl font-bold text-white tracking-tight">More recommendations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommendations.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`rec-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className="group p-3 bg-[#121212] hover:bg-[#1c1c1c] rounded-2xl border border-[#202020] hover:border-[#333] transition-all cursor-pointer flex flex-col space-y-2.5 relative shadow-sm"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#222]">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-8 h-8 text-[#ff0000]" />
                    </div>
                  )}

                  {/* Float Play Button on Card Hover */}
                  <div className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95">
                    {isActive && isPlaying ? (
                      <Pause className="w-5 h-5 fill-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-xs font-bold truncate ${
                      isActive ? "text-[#ff0000]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-[#888888] truncate mt-0.5">{track.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Listen Again (Row from Screenshot 1) */}
      <section className="space-y-3.5">
        <h2 className="text-xl font-bold text-white tracking-tight">Listen again</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {listenAgain.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`listen-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className="group p-3 bg-[#121212] hover:bg-[#1c1c1c] rounded-2xl border border-[#202020] hover:border-[#333] transition-all cursor-pointer flex flex-col space-y-2.5 relative shadow-sm"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#222]">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-8 h-8 text-[#ff0000]" />
                    </div>
                  )}

                  <div className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95">
                    {isActive && isPlaying ? (
                      <Pause className="w-5 h-5 fill-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-xs font-bold truncate ${
                      isActive ? "text-[#ff0000]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-[#888888] truncate mt-0.5">{track.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
