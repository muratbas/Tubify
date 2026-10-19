import { type FC, type ChangeEvent } from "react";
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
  PanelRight,
  Tv,
  Disc3,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { usePlayer } from "../context/PlayerContext";
import { MicroVisualizer } from "./MicroVisualizer";
import type { Track, PlaybackStatus } from "../types/music";

interface PlayerBarProps {
  track?: Track | null;
  status?: PlaybackStatus;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  isMiniPlayer?: boolean;
  isLiked?: boolean;
  isShuffle?: boolean;
  isRepeat?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (vol: number) => void;
  onToggleMute?: () => void;
  onToggleMiniPlayer?: () => void;
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

export const PlayerBar: FC<PlayerBarProps> = (props) => {
  const { theme } = useTheme();
  const player = usePlayer();
  const isLight = theme === "light";

  // Use props if passed, otherwise fall back to PlayerContext
  const track = props.track !== undefined ? props.track : player.activeTrack;
  const status = props.status !== undefined ? props.status : player.playbackStatus;
  const currentTime = props.currentTime !== undefined ? props.currentTime : player.currentTime;
  const duration = props.duration !== undefined ? props.duration : player.duration;
  const volume = props.volume !== undefined ? props.volume : player.volume;
  const isMuted = props.isMuted !== undefined ? props.isMuted : player.isMuted;
  const isMiniPlayer = props.isMiniPlayer !== undefined ? props.isMiniPlayer : player.isMiniPlayer;
  const isShuffle = props.isShuffle !== undefined ? props.isShuffle : player.isShuffle;
  const isRepeat = props.isRepeat !== undefined ? props.isRepeat : player.isRepeat;

  const isLiked =
    props.isLiked !== undefined
      ? props.isLiked
      : track
      ? player.likedTrackIds.has(track.id)
      : false;

  const onPlayPause = props.onPlayPause || player.togglePlayPause;
  const onNext = props.onNext || player.nextTrack;
  const onPrev = props.onPrev || player.prevTrack;
  const onSeek = props.onSeek || player.seek;
  const onVolumeChange = props.onVolumeChange || player.setVolume;
  const onToggleMute = props.onToggleMute || player.toggleMute;
  const onToggleMiniPlayer = props.onToggleMiniPlayer || player.toggleMiniPlayer;
  const onToggleLike =
    props.onToggleLike || (() => track && player.toggleLike(track));
  const onToggleShuffle = props.onToggleShuffle || player.toggleShuffle;
  const onToggleRepeat = props.onToggleRepeat || player.toggleRepeat;

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
      className={`h-[82px] px-4 md:px-6 rounded-2xl flex items-center justify-between select-none z-40 relative shrink-0 border transition-all duration-300 ${
        isLight
          ? "bg-[#ffffff]/90 border-[#e4e4e7] text-[#111111] shadow-xl"
          : "bg-[#09090c]/85 border-white/[0.08] text-white shadow-2xl backdrop-blur-2xl"
      }`}
    >
      {/* 0. Top Interactive Seek Bar overlay with hover expansion */}
      <div className="absolute top-0 left-4 right-4 h-1.5 hover:h-2.5 transition-all group cursor-pointer -translate-y-1/2">
        <div
          className={`w-full h-full rounded-full overflow-hidden relative ${
            isLight ? "bg-[#e4e4e7]" : "bg-white/[0.08]"
          }`}
        >
          <div
            className="h-full bg-gradient-to-r from-[#ff0000] to-[#e60023] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeekChange}
          aria-label="Seek progress"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* 1. Left Side: Track Info + MicroVisualizer + Like */}
      <div className="flex items-center gap-3.5 min-w-[200px] max-w-[30%]">
        <div
          className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md ${
            isLight ? "bg-[#e4e4e7] ring-1 ring-black/5" : "bg-zinc-800 ring-1 ring-white/10"
          }`}
        >
          {track?.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="w-5 h-5 text-[#ff0000]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              title={track?.title}
              className={`text-xs font-bold truncate leading-tight tracking-tight ${
                isLight ? "text-[#18181b]" : "text-white"
              }`}
            >
              {track ? track.title : "Tubify Desktop"}
            </h4>
            {track && isPlaying && <MicroVisualizer isPlaying={isPlaying} />}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            {track?.is_explicit && (
              <span
                title="Explicit"
                className="w-3.5 h-3.5 rounded-[3px] bg-[#71717a] text-white text-[8px] font-black shrink-0 inline-flex items-center justify-center leading-none"
              >
                E
              </span>
            )}
            <p
              title={track?.artist}
              className={`text-[11px] font-medium truncate ${
                isLight ? "text-[#71717a]" : "text-white/60"
              }`}
            >
              {track ? track.artist : "Choose a track to start"}
            </p>
          </div>
        </div>

        {track && (
          <button
            onClick={onToggleLike}
            className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 active:scale-90 ${
              isLiked
                ? "text-[#ff0000] bg-rose-500/10"
                : isLight
                ? "text-[#a1a1aa] hover:text-[#ff0000] hover:bg-[#f4f4f5]"
                : "text-white/40 hover:text-[#ff0000] hover:bg-white/[0.06]"
            }`}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-[#ff0000]" : ""}`} />
          </button>
        )}
      </div>

      {/* 2. Center: Controls + Time indicators */}
      <div className="flex flex-col items-center gap-1 flex-1 max-w-[480px]">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
              isShuffle
                ? "text-[#ff0000] bg-rose-500/10"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                : "text-white/50 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrev}
            disabled={!track}
            title="Previous track"
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight
                ? "text-[#18181b] hover:bg-[#f4f4f5]"
                : "text-white/80 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            disabled={!track && !isLoading}
            title={isPlaying ? "Pause" : "Play"}
            className="w-10 h-10 rounded-full bg-[#ff0000] hover:bg-[#e60000] text-white flex items-center justify-center shadow-lg hover:shadow-red-500/25 transition-all cursor-pointer active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!track}
            title="Next track"
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight
                ? "text-[#18181b] hover:bg-[#f4f4f5]"
                : "text-white/80 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            title={isRepeat ? "Repeat On" : "Repeat Off"}
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
              isRepeat
                ? "text-[#ff0000] bg-rose-500/10"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                : "text-white/50 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Small time readout */}
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-tight font-medium text-white/50">
          <span className={isLight ? "text-[#52525b]" : "text-white/70"}>
            {formatTime(currentTime)}
          </span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right: Volume + 1:1/16:9 Toggle + Drawer toggle + MiniPlayer */}
      <div className="flex items-center gap-3 min-w-[200px] justify-end">
        {/* Aspect Ratio Button */}
        <button
          onClick={player.toggle16x9Aspect}
          title={player.is16x9Aspect ? "16:9 Video Mode" : "1:1 Album Mode"}
          className={`p-2 rounded-xl transition-all cursor-pointer hidden md:flex items-center gap-1.5 text-xs font-semibold ${
            player.is16x9Aspect
              ? "bg-[#ff0000]/15 text-[#ff0000]"
              : isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
              : "text-white/50 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          {player.is16x9Aspect ? (
            <Tv className="w-4 h-4 text-[#ff0000]" />
          ) : (
            <Disc3 className="w-4 h-4" />
          )}
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:text-[#18181b]" : "text-white/60 hover:text-white"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
          <div className="w-20 h-1 bg-white/[0.1] rounded-full overflow-hidden relative cursor-pointer group-hover:h-1.5 transition-all">
            <div
              className="h-full bg-white/80 group-hover:bg-[#ff0000] rounded-full transition-all"
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Volume slider"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Drawer Toggle (Now Playing / Queue) */}
        <button
          onClick={() => player.toggleRightDrawer()}
          title="Toggle Now Playing & Queue Drawer"
          className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            player.isRightDrawerOpen
              ? "bg-[#ff0000] text-white shadow-md shadow-red-500/20"
              : isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>

        {/* Mini Player HUD */}
        <button
          onClick={onToggleMiniPlayer}
          title={isMiniPlayer ? "Close Mini Player" : "Open Mini Player HUD"}
          className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            isMiniPlayer
              ? "text-[#ff0000] bg-rose-500/10"
              : isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
              : "text-white/50 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
