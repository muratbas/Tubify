import type { FC } from "react";
import { Play, Pause, SkipBack, SkipForward, Minimize2, Music, Loader2 } from "lucide-react";
import type { Track, PlaybackStatus } from "../types/music";

interface MiniPlayerHUDProps {
  track: Track | null;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const MiniPlayerHUD: FC<MiniPlayerHUDProps> = ({
  track,
  status,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onClose,
}) => {
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!track) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-[#0f141f]/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-black/80 select-none animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wider uppercase text-[10px]">
          <img src="/logo.png" alt="Tubify" className="w-3.5 h-3.5 object-contain" />
          Tubify Mini HUD
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60 transition-colors"
          title="Büyük Görünüme Dön"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Track Info */}
      <div className="flex items-center gap-3.5 mb-3.5">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 flex-shrink-0">
          {track.thumbnail ? (
            <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <Music className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
          <p className="text-xs text-slate-400 truncate mt-0.5">{track.artist}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-3">
        <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Minimal Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrev}
          className="text-slate-300 hover:text-white transition-colors p-1"
          title="Önceki"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={onPlayPause}
          className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin stroke-black" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-black stroke-black" />
          ) : (
            <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
          )}
        </button>

        <button
          onClick={onNext}
          className="text-slate-300 hover:text-white transition-colors p-1"
          title="Sonraki"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
