import { type FC, type ChangeEvent } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Loader2,
  Music2,
  Heart,
  Mic2,
  ListMusic,
  Tv,
  MoreHorizontal,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import type { Track, PlaybackStatus } from "../types/music";

interface PlayerBarProps {
  track?: Track | null;
  status?: PlaybackStatus;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
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
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onNavigateAlbum?: (
    albumId: string,
    albumTitle?: string,
    artistName?: string,
    thumbnail?: string
  ) => void;
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const PlayerBar: FC<PlayerBarProps> = (props) => {
  const player = usePlayer();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const track = props.track !== undefined ? props.track : player.activeTrack;
  const status = props.status !== undefined ? props.status : player.playbackStatus;
  const currentTime = props.currentTime !== undefined ? props.currentTime : player.currentTime;
  const duration = props.duration !== undefined ? props.duration : player.duration;
  const volume = props.volume !== undefined ? props.volume : player.volume;
  const isMuted = props.isMuted !== undefined ? props.isMuted : player.isMuted;
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
    <footer
      className={`h-[84px] px-4 border-t flex items-center justify-between select-none z-40 relative shrink-0 transition-colors ${
        isLight
          ? "bg-white border-[#f0f0f0] text-neutral-900"
          : "bg-[#000000] border-[#282828] text-white"
      }`}
    >
      <div
        className="flex items-center gap-3.5 w-[30%] min-w-[180px]"
        onContextMenu={(e) => {
          if (track && props.onContextMenuTrack) {
            props.onContextMenuTrack(track, e);
          }
        }}
      >
        <div
          className={`relative w-14 h-14 rounded-md overflow-hidden shrink-0 shadow-sm ${
            isLight ? "bg-neutral-100" : "bg-[#282828]"
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
              <Music2 className={`w-6 h-6 ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
            </div>
          )}
        </div>

        <div className="min-w-0 max-w-[200px]">
          {(() => {
            const hasAlbum = !!(
              track?.album_id &&
              track.album &&
              track.album.toLowerCase() !== "single"
            );
            return (
              <h4
                onClick={() => {
                  if (hasAlbum && props.onNavigateAlbum) {
                    props.onNavigateAlbum(
                      track!.album_id!,
                      track!.album || undefined,
                      track!.artist,
                      track!.thumbnail || undefined
                    );
                  }
                }}
                title={track?.title}
                className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                  hasAlbum ? "hover:underline cursor-pointer" : ""
                } ${isLight ? "text-neutral-900" : "text-white"}`}
              >
                {track ? track.title : "Tubify"}
              </h4>
            );
          })()}
          <p
            onClick={() => {
              if (track && props.onNavigateArtist) {
                props.onNavigateArtist(track.artist_id || track.artist, track.artist);
              }
            }}
            title={track?.artist}
            className={`text-xs truncate leading-normal py-0.5 mt-0.5 hover:underline cursor-pointer ${
              isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
          >
            {track ? track.artist : "Çalmaya başlamak için bir parça seçin"}
          </p>
        </div>

        {track && (
          <>
            <button
              onClick={onToggleLike}
              className={`p-1.5 transition-transform active:scale-125 cursor-pointer ml-1 shrink-0 ${
                isLight ? "text-neutral-400 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
              }`}
              title={isLiked ? "Beğenilenler'den kaldır" : "Beğen"}
            >
              <Heart
                className={`w-4 h-4 ${
                  isLiked ? "text-[#ff0000] fill-[#ff0000]" : ""
                }`}
              />
            </button>
            <button
              onClick={(e) => {
                if (props.onContextMenuTrack) {
                  props.onContextMenuTrack(track, e);
                }
              }}
              className={`p-1.5 transition-transform active:scale-125 cursor-pointer shrink-0 ${
                isLight ? "text-neutral-400 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
              }`}
              title="Daha fazla seçenek"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* 2. Center: Playback Controls & Timeline Progress Bar */}
      <div className="flex flex-col items-center gap-1.5 w-[40%] max-w-[720px]">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? "Karışık Açık" : "Karışık Kapalı"}
            className={`transition-colors cursor-pointer ${
              isShuffle
                ? "text-[#ff0000]"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrev}
            disabled={!track}
            title="Önceki"
            className={`transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight ? "text-neutral-600 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Center Play Button: 36x36 (w-9 h-9) black circle with white icon in light mode */}
          <button
            onClick={onPlayPause}
            disabled={!track && !isLoading}
            title={isPlaying ? "Duraklat" : "Oynat"}
            className={`w-9 h-9 rounded-full hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-40 ${
              isLight ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {isLoading ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isLight ? "text-white" : "text-black"}`} />
            ) : isPlaying ? (
              <Pause className={`w-4 h-4 ${isLight ? "fill-white stroke-white" : "fill-black stroke-black"}`} />
            ) : (
              <Play className={`w-4 h-4 ml-0.5 ${isLight ? "fill-white stroke-white" : "fill-black stroke-black"}`} />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!track}
            title="Sonraki"
            className={`transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight ? "text-neutral-600 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            title={isRepeat ? "Tekrar Açık" : "Tekrar Kapalı"}
            className={`transition-colors cursor-pointer ${
              isRepeat
                ? "text-[#ff0000]"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Slider with Times */}
        <div className="w-full flex items-center gap-2">
          <span
            className={`text-[11px] font-mono w-10 text-right ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            {formatTime(currentTime)}
          </span>

          <div
            className={`flex-1 h-1 hover:h-1.5 rounded-full overflow-hidden relative group cursor-pointer transition-all ${
              isLight ? "bg-neutral-200" : "bg-[#4d4d4d]"
            }`}
          >
            <div
              className={`h-full group-hover:bg-[#ff0000] rounded-full transition-all ${
                isLight ? "bg-neutral-800" : "bg-white"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              aria-label="Şarkı ilerleme çubuğu"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span
            className={`text-[11px] font-mono w-10 ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right: Lyrics, Queue, Device, Volume */}
      <div className="flex items-center gap-3 w-[30%] justify-end">
        {/* Lyrics */}
        <button
          onClick={() => player.setRightDrawerTab("lyrics")}
          title="Şarkı Sözleri"
          className={`p-1.5 transition-colors cursor-pointer ${
            player.isRightDrawerOpen && player.rightDrawerTab === "lyrics"
              ? "text-[#ff0000]"
              : isLight
              ? "text-neutral-500 hover:text-neutral-900"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue */}
        <button
          onClick={() => player.setRightDrawerTab("queue")}
          title="Sıradaki Şarkılar"
          className={`p-1.5 transition-colors cursor-pointer ${
            player.isRightDrawerOpen && player.rightDrawerTab === "queue"
              ? "text-[#ff0000]"
              : isLight
              ? "text-neutral-500 hover:text-neutral-900"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Devices */}
        <button
          title="Bir cihaza bağlan"
          className={`p-1.5 transition-colors cursor-pointer ${
            isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Tv className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={onToggleMute}
            className={`p-1 transition-colors cursor-pointer ${
              isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
            title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
          <div
            className={`w-24 h-1 group-hover:h-1.5 rounded-full overflow-hidden relative cursor-pointer transition-all ${
              isLight ? "bg-neutral-200" : "bg-[#4d4d4d]"
            }`}
          >
            <div
              className={`h-full group-hover:bg-[#ff0000] rounded-full transition-all ${
                isLight ? "bg-neutral-800" : "bg-white"
              }`}
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onVolumeChange(val);
              }}
              aria-label="Ses seviyesi"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
export default PlayerBar;
