import { type FC } from "react";
import { Play, Pause, Music2, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { usePlayer } from "../context/PlayerContext";
import { MoodFilterBar } from "./MoodFilterBar";
import type { Track } from "../types/music";

interface HomeViewProps {
  recentlyPlayed: Track[];
  recommendations: Track[];
  listenAgain: Track[];
  activeTrack?: Track | null;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track) => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
}

export const HomeView: FC<HomeViewProps> = ({
  recentlyPlayed,
  recommendations,
  listenAgain,
  activeTrack: propActiveTrack,
  isPlaying: propIsPlaying,
  onPlayTrack: propOnPlayTrack,
  onNavigateArtist,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const player = usePlayer();
  const isLight = theme === "light";

  const activeTrack = propActiveTrack !== undefined ? propActiveTrack : player.activeTrack;
  const isPlaying =
    propIsPlaying !== undefined ? propIsPlaying : player.playbackStatus === "playing";
  const onPlayTrack = propOnPlayTrack || player.playTrack;

  // Filter recommendations based on active mood if selected
  const displayRecommendations = recommendations;

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-6 md:px-8 pt-16 space-y-7 pb-28 transition-colors relative ${
        isLight ? "text-[#111111]" : "text-white"
      }`}
    >
      {/* 0. Top YouTube Music Mood / Genre Filter Chips */}
      <div className="sticky top-0 z-20 py-2 -mx-2 px-2 backdrop-blur-md bg-transparent">
        <MoodFilterBar />
      </div>

      {/* 1. Quick Picks / Recently Played (Asymmetrical Mini Bento Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            className={`text-lg font-black tracking-tight ${
              isLight ? "text-[#18181b]" : "text-white"
            }`}
          >
            {t.recentlyPlayed}
          </h2>
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Quick Selection
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {recentlyPlayed.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`recent-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group flex items-center rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer relative shadow-sm active:scale-[0.98] ${
                  isLight
                    ? isActive
                      ? "bg-[#ffffff] border-[#ff0000] ring-1 ring-[#ff0000]/30 shadow-md"
                      : "bg-[#ffffff] hover:bg-[#f4f4f5] border-[#e4e4e7]"
                    : isActive
                    ? "bg-white/[0.12] border-white/20 ring-1 ring-white/10"
                    : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]"
                }`}
              >
                {track.thumbnail ? (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-14 h-14 object-cover shrink-0 bg-zinc-800"
                  />
                ) : (
                  <div
                    className={`w-14 h-14 flex items-center justify-center shrink-0 ${
                      isLight ? "bg-[#e4e4e7]" : "bg-white/[0.06]"
                    }`}
                  >
                    <Music2 className="w-5 h-5 text-[#ff0000]" />
                  </div>
                )}

                <div className="px-3 min-w-0 flex-1">
                  <h4
                    className={`text-xs font-bold truncate ${
                      isActive
                        ? "text-[#ff0000]"
                        : isLight
                        ? "text-[#18181b]"
                        : "text-white"
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
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateArtist) {
                          onNavigateArtist(track.artist_id || track.artist, track.artist);
                        }
                      }}
                      className={`text-[11px] truncate hover:underline cursor-pointer ${
                        isLight ? "text-[#71717a] hover:text-black" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {track.artist}
                    </p>
                  </div>
                </div>

                {/* Tactile Play Button Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track);
                  }}
                  className="mr-3 w-8 h-8 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 shadow-md shadow-red-500/20 shrink-0"
                >
                  {isActive && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. More Recommendations (Double-Bezel Grid Cards) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff0000]" />
            <h2
              className={`text-lg font-black tracking-tight ${
                isLight ? "text-[#18181b]" : "text-white"
              }`}
            >
              {t.moreRecommendations}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            InnerTube Stream
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {displayRecommendations.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`rec-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col space-y-2 relative shadow-sm active:scale-[0.98] ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#f4f4f5] border-[#e4e4e7]"
                    : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08]"
                }`}
              >
                {/* 1:1 Clean Aspect with InnerTube object-cover */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 shadow-md">
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
                  <div className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl shadow-red-600/40 hover:scale-110 active:scale-90">
                    {isActive && isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 pt-0.5">
                  <h4
                    className={`text-xs font-bold truncate leading-tight ${
                      isActive
                        ? "text-[#ff0000]"
                        : isLight
                        ? "text-[#18181b]"
                        : "text-white"
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
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateArtist) {
                          onNavigateArtist(track.artist_id || track.artist, track.artist);
                        }
                      }}
                      className={`text-[11px] truncate hover:underline cursor-pointer ${
                        isLight ? "text-[#71717a] hover:text-black" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {track.artist}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Listen Again */}
      <section className="space-y-3.5">
        <h2
          className={`text-lg font-black tracking-tight ${
            isLight ? "text-[#18181b]" : "text-white"
          }`}
        >
          {t.listenAgain}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {listenAgain.map((track, i) => {
            const isActive = activeTrack?.id === track.id;
            return (
              <div
                key={`listen-${track.id}-${i}`}
                onClick={() => onPlayTrack(track)}
                className={`group p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col space-y-2 relative shadow-sm active:scale-[0.98] ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#f4f4f5] border-[#e4e4e7]"
                    : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08]"
                }`}
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 shadow-md">
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

                  <div className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl shadow-red-600/40 hover:scale-110 active:scale-90">
                    {isActive && isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 pt-0.5">
                  <h4
                    className={`text-xs font-bold truncate leading-tight ${
                      isActive
                        ? "text-[#ff0000]"
                        : isLight
                        ? "text-[#18181b]"
                        : "text-white"
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
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateArtist) {
                          onNavigateArtist(track.artist_id || track.artist, track.artist);
                        }
                      }}
                      className={`text-[11px] truncate hover:underline cursor-pointer ${
                        isLight ? "text-[#71717a] hover:text-black" : "text-white/60 hover:text-white"
                      }`}
                    >
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
