import type { FC } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Shuffle,
  Repeat,
  Loader2,
  Music,
} from "lucide-react";
import type { Track, PlaybackStatus } from "../types/music";

interface PlayerBarProps {
  track: Track | null;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isMiniPlayer: boolean;
  streamFormat?: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleMiniPlayer: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const PlayerBar: FC<PlayerBarProps> = ({
  track,
  status,
  currentTime,
  duration,
  volume,
  isMuted,
  isMiniPlayer,
  streamFormat,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleMiniPlayer,
}) => {
  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="h-24 bg-[#0d1117]/95 backdrop-blur-md border-t border-[#1e2638] px-6 flex items-center justify-between select-none z-40 relative">
      {/* 1. Track Info (Left) */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        {track ? (
          <>
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#161d2b] flex-shrink-0 shadow-md border border-[#1e2638]">
              {track.thumbnail ? (
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Music className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate" title={track.title}>
                {track.title}
              </h4>
              <p className="text-xs text-slate-400 truncate mt-0.5" title={track.artist}>
                {track.artist}
              </p>
              {streamFormat && (
                <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {streamFormat} CDN
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500 italic">Çalınan şarkı yok</div>
        )}
      </div>

      {/* 2. Controls & Progress (Center) */}
      <div className="flex flex-col items-center gap-2 max-w-xl w-2/4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-4">
          <button
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            title="Karışık (Shuffle)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrev}
            disabled={!track}
            className="text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Önceki Şarkı"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            disabled={!track}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20 transform transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isPlaying ? "Durdur" : "Oynat"}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-black" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-black stroke-black" />
            ) : (
              <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!track}
            className="text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Sonraki Şarkı"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            title="Tekrar (Repeat)"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Seek Bar */}
        <div className="w-full flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 group py-1 flex items-center cursor-pointer">
            <div className="w-full bg-[#1e2638] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 group-hover:bg-emerald-300 h-full rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="1"
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={!track || duration === 0}
              className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
          <span className="w-9">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Extra Tools & Volume (Right) */}
      <div className="flex items-center justify-end gap-5 w-1/4 min-w-[200px]">
        {/* Mini-Player Toggle */}
        <button
          onClick={onToggleMiniPlayer}
          className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
            isMiniPlayer
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              : "bg-[#161d2b] text-slate-300 border-[#222c40] hover:text-white hover:border-slate-600"
          }`}
          title="Mini-Player / HUD Modu (Always on Top)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="font-medium hidden lg:inline">Mini HUD</span>
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
          <div className="relative w-20 group flex items-center">
            <div className="w-full bg-[#1e2638] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-slate-300 group-hover:bg-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
