import { type FC } from "react";
import { Play, Pause, Music2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();
  const isLight = theme === "light";

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-8 py-6 space-y-8 pb-28 transition-colors ${
        isLight ? "bg-[#f0f0f0] text-[#111111]" : "bg-[#030303] text-white"
      }`}
    >
      {/* 1. Recently Played (Horizontal Mini Cards from Screenshot 4) */}
      <section className="space-y-3">
        <h2 className={`text-xl font-black tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
          {t.recentlyPlayed}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
          {recentlyPlayed.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`recent-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group flex items-center rounded-2xl overflow-hidden border transition-all cursor-pointer relative shadow-sm ${
                  isLight
                    ? isActive
                      ? "bg-[#ffffff] border-[#ff0000] ring-1 ring-[#ff0000]/30"
                      : "bg-[#ffffff] hover:bg-[#fafafa] border-[#e4e4e7]"
                    : isActive
                    ? "bg-[#1f1f1f] border-[#ff0000]/50"
                    : "bg-[#121212] hover:bg-[#1a1a1a] border-[#222222]"
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
                      isLight ? "bg-[#e4e4e7]" : "bg-[#1f1f1f]"
                    }`}
                  >
                    <Music2 className="w-6 h-6 text-[#ff0000]" />
                  </div>
                )}

                <div className="px-3 min-w-0 flex-1">
                  <h4
                    className={`text-xs font-bold truncate ${
                      isActive ? "text-[#ff0000]" : isLight ? "text-[#18181b]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {track.is_explicit && (
                      <span
                        title="Explicit"
                        className="w-3.5 h-3.5 rounded-[3px] bg-[#71717a] text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                      >
                        E
                      </span>
                    )}
                    <p className={`text-[11px] truncate ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {track.artist}
                    </p>
                  </div>
                </div>

                {/* Play Button Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track);
                  }}
                  className="mr-3 w-8 h-8 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-md shadow-red-500/20 shrink-0"
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

      {/* 2. More Recommendations (Grid of Square Cards from Screenshot 4) */}
      <section className="space-y-3.5">
        <h2 className={`text-xl font-black tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
          {t.moreRecommendations}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommendations.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`rec-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2 relative shadow-sm ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#fafafa] border-[#e4e4e7]"
                    : "bg-[#111111] hover:bg-[#181818] border-[#202020]"
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
                  <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95">
                    {isActive && isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-xs font-bold truncate leading-tight ${
                      isActive ? "text-[#ff0000]" : isLight ? "text-[#18181b]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {track.is_explicit && (
                      <span
                        title="Explicit"
                        className="w-3.5 h-3.5 rounded-[3px] bg-[#71717a] text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                      >
                        E
                      </span>
                    )}
                    <p className={`text-[11px] truncate ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {track.artist}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Listen Again (Row from Screenshot 4) */}
      <section className="space-y-3.5">
        <h2 className={`text-xl font-black tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
          {t.listenAgain}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {listenAgain.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`listen-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2 relative shadow-sm ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#fafafa] border-[#e4e4e7]"
                    : "bg-[#111111] hover:bg-[#181818] border-[#202020]"
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

                  <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95">
                    {isActive && isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-xs font-bold truncate leading-tight ${
                      isActive ? "text-[#ff0000]" : isLight ? "text-[#18181b]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {track.is_explicit && (
                      <span
                        title="Explicit"
                        className="w-3.5 h-3.5 rounded-[3px] bg-[#71717a] text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none select-none"
                      >
                        E
                      </span>
                    )}
                    <p className={`text-[11px] truncate ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {track.artist}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
