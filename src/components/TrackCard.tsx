import type { FC } from "react";
import { Play, Pause, Heart, Music } from "lucide-react";
import type { Track } from "../types/music";

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  isActive: boolean;
  isFavorite: boolean;
  onPlay: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
}

export const TrackCard: FC<TrackCardProps> = ({
  track,
  isPlaying,
  isActive,
  isFavorite,
  onPlay,
  onToggleFavorite,
}) => {
  return (
    <div
      onClick={() => onPlay(track)}
      className={`group relative bg-[#131926] hover:bg-[#1c2436] p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isActive
          ? "border-emerald-500/50 shadow-md shadow-emerald-500/10 bg-[#172030]"
          : "border-[#1e2638]/70 hover:border-slate-700 hover:shadow-lg"
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#0a0d14] mb-3">
        {track.thumbnail ? (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Music className="w-10 h-10" />
          </div>
        )}

        {/* Play / Pause Overlay Button */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30 transform transition-transform group-hover:scale-110 active:scale-95">
            {isActive && isPlaying ? (
              <Pause className="w-5 h-5 fill-black stroke-black" />
            ) : (
              <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
            )}
          </div>
        </div>

        {/* Duration Badge */}
        {track.duration && (
          <span className="absolute bottom-2 right-2 text-[10px] font-medium bg-black/70 text-slate-200 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {track.duration}
          </span>
        )}
      </div>

      {/* Info & Favorite button */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-semibold truncate ${
              isActive ? "text-emerald-400" : "text-slate-100 group-hover:text-white"
            }`}
            title={track.title}
          >
            {track.title}
          </h4>
          <p className="text-xs text-slate-400 truncate mt-0.5" title={track.artist}>
            {track.artist}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(track);
          }}
          className={`p-1.5 rounded-full transition-colors ${
            isFavorite
              ? "text-rose-500 hover:text-rose-400"
              : "text-slate-500 hover:text-slate-300 hover:bg-[#252f44]"
          }`}
          title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-500" : ""}`} />
        </button>
      </div>
    </div>
  );
};
