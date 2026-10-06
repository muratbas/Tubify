import { type FC } from "react";
import { Play, Pause, Music2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
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
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-8 py-6 space-y-8 pb-24 transition-colors ${
        isLight ? "bg-[#fafbfc] text-[#111111]" : "bg-[#030303] text-white"
      }`}
    >
      {/* 1. Recently Played (Horizontal Mini Cards from Screenshot 1) */}
      <section className="space-y-3">
        <h2 className={`text-xl font-bold tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
          Recently played
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {recentlyPlayed.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`recent-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group flex items-center rounded-xl overflow-hidden border transition-all cursor-pointer relative ${
                  isLight
                    ? isActive
                      ? "bg-[#f3f4f6] border-[#ff0000]/60 shadow-sm"
                      : "bg-[#ffffff] hover:bg-[#f3f4f6] border-[#e5e7eb] shadow-sm"
                    : isActive
                    ? "bg-[#222222] border-[#ff0000]/40 shadow-sm"
                    : "bg-[#141414] hover:bg-[#202020] border-[#222222] hover:border-[#383838]"
                }`}
              >
                {track.thumbnail ? (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-14 h-14 object-cover shrink-0 bg-[#222]"
                  />
                ) : (
                  <div
                    className={`w-14 h-14 flex items-center justify-center shrink-0 ${
                      isLight ? "bg-[#e5e7eb]" : "bg-[#1f1f1f]"
                    }`}
                  >
                    <Music2 className="w-6 h-6 text-[#ff0000]" />
                  </div>
                )}

                <div className="px-3 min-w-0 flex-1">
                  <h4
                    className={`text-xs font-semibold truncate ${
                      isActive ? "text-[#ff0000]" : isLight ? "text-[#111111]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className={`text-[11px] truncate ${isLight ? "text-[#6b7280]" : "text-[#888888]"}`}>
                    {track.artist}
                  </p>
                </div>

                {/* Hover Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track);
                  }}
                  className="mr-3 w-8 h-8 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-md shadow-red-500/20 shrink-0"
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
        <h2 className={`text-xl font-bold tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
          More recommendations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommendations.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`rec-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2.5 relative ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#f9fafb] border-[#e5e7eb] hover:border-[#d1d5db] shadow-sm"
                    : "bg-[#121212] hover:bg-[#1c1c1c] border-[#202020] hover:border-[#333]"
                }`}
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
                      isActive ? "text-[#ff0000]" : isLight ? "text-[#111111]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className={`text-[11px] truncate mt-0.5 ${isLight ? "text-[#6b7280]" : "text-[#888888]"}`}>
                    {track.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Listen Again (Row from Screenshot 1) */}
      <section className="space-y-3.5">
        <h2 className={`text-xl font-bold tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
          Listen again
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {listenAgain.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`listen-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2.5 relative ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#f9fafb] border-[#e5e7eb] hover:border-[#d1d5db] shadow-sm"
                    : "bg-[#121212] hover:bg-[#1c1c1c] border-[#202020] hover:border-[#333]"
                }`}
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
                      isActive ? "text-[#ff0000]" : isLight ? "text-[#111111]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className={`text-[11px] truncate mt-0.5 ${isLight ? "text-[#6b7280]" : "text-[#888888]"}`}>
                    {track.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
