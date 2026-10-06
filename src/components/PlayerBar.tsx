import type { FC, ChangeEvent } from "react";
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
  Music2,
  Heart,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Track, PlaybackStatus } from "../types/music";

interface PlayerBarProps {
  track: Track | null;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isMiniPlayer: boolean;
  isLiked?: boolean;
  isShuffle?: boolean;
  isRepeat?: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleMiniPlayer: () => void;
  onToggleLike?: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
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
  isLiked = false,
  isShuffle = false,
  isRepeat = false,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleMiniPlayer,
  onToggleLike,
  onToggleShuffle,
  onToggleRepeat,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const handleSeekChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  return (
    <div
      className={`h-[74px] px-5 flex items-center justify-between select-none z-40 relative shrink-0 border-t transition-colors ${
        isLight
          ? "bg-[#f0f0f0] border-[#e4e4e7] text-[#111111]"
          : "bg-[#030303] border-[#1b1b1b] text-white"
      }`}
    >
      {/* 0. Top Full-Width Interactive Seek Bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 hover:h-2 transition-all group cursor-pointer ${
          isLight ? "bg-[#e4e4e7]" : "bg-[#222222]"
        }`}
      >
        <div
          className="h-full bg-[#ff0000] relative group-hover:bg-[#ff2222]"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity" />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={currentTime}
          onChange={handleSeekChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* 1. Track Info & Like Button (Left - Screenshot Match) */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {track ? (
          <>
            <div
              className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border shadow-sm ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#161616] border-[#252525]"
              }`}
            >
              {track.thumbnail ? (
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#ff0000]">
                  <Music2 className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4
                className={`text-xs font-bold truncate leading-tight ${isLight ? "text-[#18181b]" : "text-white"}`}
                title={track.title}
              >
                {track.title}
              </h4>
              <p
                className={`text-[11px] truncate mt-0.5 ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}
                title={track.artist}
              >
                {track.artist}
              </p>
            </div>
            {onToggleLike && (
              <button
                onClick={onToggleLike}
                title={isLiked ? "Unlike" : "Like"}
                className={`p-1 transition-colors cursor-pointer active:scale-125 shrink-0 ${
                  isLight ? "text-[#a1a1aa] hover:text-[#ff0000]" : "text-[#666666] hover:text-[#ff0000]"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked ? "text-[#ff0000] fill-[#ff0000]" : "hover:scale-110"
                  }`}
                />
              </button>
            )}
          </>
        ) : (
          <div className={`text-xs italic ${isLight ? "text-[#a1a1aa]" : "text-[#555555]"}`}>
            No track playing
          </div>
        )}
      </div>

      {/* 2. Playback Controls (Center - Screenshot Match) */}
      <div className="flex items-center gap-3.5">
        {/* Shuffle */}
        <button
          onClick={onToggleShuffle}
          title="Shuffle"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isShuffle
              ? "text-[#ff0000]"
              : isLight
              ? "text-[#71717a] hover:text-black"
              : "text-[#777777] hover:text-white"
          }`}
        >
          <Shuffle className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          onClick={onPrev}
          disabled={!track}
          title="Previous"
          className={`p-1.5 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 cursor-pointer ${
            isLight ? "text-[#52525b] hover:text-black" : "text-[#aaaaaa] hover:text-white"
          }`}
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        {/* Play / Pause Circular Button in YouTube Red */}
        <button
          onClick={onPlayPause}
          disabled={!track && !isLoading}
          className="w-10 h-10 rounded-full bg-[#ff0000] hover:bg-[#e60000] text-white flex items-center justify-center shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!track}
          title="Next"
          className={`p-1.5 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 cursor-pointer ${
            isLight ? "text-[#52525b] hover:text-black" : "text-[#aaaaaa] hover:text-white"
          }`}
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>

        {/* Repeat */}
        <button
          onClick={onToggleRepeat}
          title="Repeat"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isRepeat
              ? "text-[#ff0000]"
              : isLight
              ? "text-[#71717a] hover:text-black"
              : "text-[#777777] hover:text-white"
          }`}
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Time, HUD Mode & Volume (Right - Screenshot Match) */}
      <div className="flex items-center justify-end gap-3.5 w-1/4 min-w-[200px]">
        {/* Timestamp */}
        <span
          className={`text-[11px] font-mono select-none font-medium ${
            isLight ? "text-[#71717a]" : "text-[#888888]"
          }`}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* HUD Mini-Player */}
        <button
          onClick={onToggleMiniPlayer}
          title="Mini HUD Player"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isMiniPlayer
              ? "text-[#ff0000] bg-rose-500/10"
              : isLight
              ? "text-[#71717a] hover:text-black hover:bg-[#e4e4e7]"
              : "text-[#777777] hover:text-white hover:bg-[#1a1a1a]"
          }`}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            className={`p-1 transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:text-black" : "text-[#888888] hover:text-white"
            }`}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className={`w-18 h-1 accent-[#ff0000] rounded-lg appearance-none cursor-pointer ${
              isLight ? "bg-[#e4e4e7]" : "bg-[#282828]"
            }`}
          />
        </div>
      </div>
    </div>
  );
};
