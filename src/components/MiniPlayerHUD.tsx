import type { FC } from "react";
import { Play, Pause, SkipBack, SkipForward, Minimize2, Music2, Loader2 } from "lucide-react";
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
    <div className="fixed bottom-24 right-6 z-50 w-84 bg-[#0a0a0d]/90 backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-4 shadow-2xl select-none animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2 text-white/80 font-bold tracking-wider uppercase text-[10px]">
          <img src="/logo.png" alt="Tubify" className="w-3.5 h-3.5 object-contain" />
          Tubify Mini HUD
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Return to Main View"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Track Info */}
      <div className="flex items-center gap-3.5 mb-3.5">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0 shadow-md">
          {track.thumbnail ? (
            <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="w-5 h-5 text-[#ff0000]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate leading-tight">{track.title}</h4>
          <p className="text-[11px] text-white/60 truncate mt-0.5">{track.artist}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-3">
        <div className="w-full bg-white/[0.1] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#ff0000] to-[#e60023] h-full rounded-full transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/50">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Minimal Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrev}
          className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer active:scale-95"
          title="Previous"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={onPlayPause}
          className="w-10 h-10 rounded-full bg-[#ff0000] hover:bg-[#e60000] text-white flex items-center justify-center shadow-lg shadow-red-500/25 active:scale-90 transition-all cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={onNext}
          className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer active:scale-95"
          title="Next"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
