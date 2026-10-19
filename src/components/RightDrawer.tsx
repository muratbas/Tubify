import { useRef, useEffect, type FC } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Trash2,
  ListPlus,
  Music2,
  MoreHorizontal,
  Volume2,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import type { Track } from "../types/music";

interface RightDrawerProps {
  onContextMenuTrack?: (track: Track, e: React.MouseEvent) => void;
}

export const RightDrawer: FC<RightDrawerProps> = ({ onContextMenuTrack }) => {
  const {
    activeTrack,
    playbackStatus,
    queue,
    queueViewMode,
    setQueueViewMode,
    isShuffle,
    toggleShuffle,
    clearQueue,
    saveQueueAsPlaylist,
    playTrack,
  } = usePlayer();

  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isPlaying = playbackStatus === "playing";

  const activeTrackRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active track into view when it changes
  useEffect(() => {
    if (activeTrackRef.current) {
      activeTrackRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeTrack?.id]);

  if (queueViewMode === "closed") return null;

  const isMini = queueViewMode === "mini";

  // Find index of currently playing track
  const activeIndex = activeTrack ? queue.findIndex((t) => t.id === activeTrack.id) : -1;

  // -------------------------------------------------------------
  // MINI STRIP MODE (w-[60px]) — Refer to Zuno Image 2
  // -------------------------------------------------------------
  if (isMini) {
    return (
      <aside
        className={`w-[60px] h-full flex flex-col shrink-0 border-l transition-all duration-200 ease-in-out select-none relative z-20 ${
          isLight
            ? "bg-white border-neutral-200/80 text-neutral-900"
            : "bg-[#0c0c0c] border-white/10 text-white"
        }`}
      >
        {/* Top Header: Expand Button (<) */}
        <div className="h-12 flex items-center justify-center shrink-0 border-b border-neutral-200/60 dark:border-white/10">
          <button
            onClick={() => setQueueViewMode("expanded")}
            title="Expand queue"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? "text-neutral-600 hover:text-black hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical Strip of Artwork Covers (Shows ALL tracks: past, active, upcoming) */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 flex flex-col items-center gap-2.5">
          {/* If activeTrack is not in queue list, show it at top */}
          {activeTrack && activeIndex === -1 && (
            <div
              ref={activeTrackRef}
              onClick={() => playTrack(activeTrack)}
              className="relative group cursor-pointer"
              title={`Şu an çalan: ${activeTrack.title} • ${activeTrack.artist}`}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden ring-2 ring-[#FF0000] p-0.5 bg-neutral-900">
                {activeTrack.thumbnail ? (
                  <img
                    src={activeTrack.thumbnail}
                    alt={activeTrack.title}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 rounded-md">
                    <Music2 className="w-4 h-4 text-[#FF0000]" />
                  </div>
                )}
              </div>
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-0.5">
                    <div className="w-0.5 h-3 bg-[#FF0000] rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-0.5 h-4 bg-[#FF0000] rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-0.5 h-2 bg-[#FF0000] rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Render all queue tracks: past tracks are dimmed, active has red ring, upcoming have full opacity */}
          {queue.map((track, idx) => {
            const isActive = activeIndex !== -1 ? idx === activeIndex : activeTrack?.id === track.id;
            const isPast = activeIndex !== -1 && idx < activeIndex;

            if (isActive) {
              return (
                <div
                  key={`mini-active-${track.id}-${idx}`}
                  ref={activeTrackRef}
                  onClick={() => playTrack(track)}
                  className="relative group cursor-pointer"
                  title={`Şu an çalan: ${track.title} • ${track.artist}`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden ring-2 ring-[#FF0000] p-0.5 bg-neutral-900">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 rounded-md">
                        <Music2 className="w-4 h-4 text-[#FF0000]" />
                      </div>
                    )}
                  </div>
                  {isPlaying ? (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center pointer-events-none">
                      <div className="flex items-center gap-0.5">
                        <div className="w-0.5 h-3 bg-[#FF0000] rounded-full animate-bounce [animation-delay:0ms]" />
                        <div className="w-0.5 h-4 bg-[#FF0000] rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="w-0.5 h-2 bg-[#FF0000] rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <Volume2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`mini-track-${track.id}-${idx}`}
                onClick={() => playTrack(track)}
                onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                className={`relative group cursor-pointer transition-all ${
                  isPast
                    ? "opacity-50 hover:opacity-100"
                    : "opacity-100 hover:scale-105 active:scale-95"
                }`}
                title={`${isPast ? "(Önceki) " : ""}${track.title} • ${track.artist}`}
              >
                <div className="w-10 h-10 rounded-md overflow-hidden bg-neutral-200 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/5">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-neutral-400" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // EXPANDED FULL QUEUE MODE (w-[300px]) — Refer to Zuno Image 1
  // -------------------------------------------------------------
  return (
    <aside
      className={`w-[300px] h-full flex flex-col shrink-0 border-l transition-all duration-200 ease-in-out select-none relative z-20 ${
        isLight
          ? "bg-white border-neutral-200/80 text-neutral-900"
          : "bg-[#0c0c0c] border-white/10 text-white"
      }`}
    >
      {/* Header: Collapse Button (>) + Title + Actions (Shuffle, Save, Clear) */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-neutral-200/60 dark:border-white/10 shrink-0">
        {/* Left: Collapse Button + "Up next" Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setQueueViewMode("mini")}
            title="Collapse queue"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? "text-neutral-600 hover:text-black hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold tracking-tight truncate leading-none">
            {t.queue || "Up next"}
          </h3>
        </div>

        {/* Right: Actions (Shuffle, Save, Clear) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Shuffle Toggle */}
          <button
            onClick={toggleShuffle}
            title={isShuffle ? "Karışık Çalma Açık" : "Sırayı Karıştır"}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isShuffle
                ? "text-[#FF0000] bg-rose-500/10"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          {/* Save queue as playlist */}
          <button
            onClick={saveQueueAsPlaylist}
            title="Sırayı çalma listesi olarak kaydet"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isLight
                ? "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>

          {/* Clear queue */}
          <button
            onClick={clearQueue}
            title="Sırayı temizle"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isLight
                ? "text-neutral-500 hover:text-[#FF0000] hover:bg-rose-50"
                : "text-neutral-400 hover:text-[#FF0000] hover:bg-rose-950/20"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1">
        {/* Fallback Now Playing Card if activeTrack is not part of queue array */}
        {activeTrack && activeIndex === -1 && (
          <div
            ref={activeTrackRef}
            className={`p-2.5 rounded-xl border transition-all mb-2 ${
              isLight
                ? "bg-rose-500/[0.06] border-rose-500/20 shadow-sm"
                : "bg-rose-500/[0.1] border-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 bg-neutral-200 dark:bg-zinc-800 shadow-sm">
                {activeTrack.thumbnail ? (
                  <img
                    src={activeTrack.thumbnail}
                    alt={activeTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-[#FF0000]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold truncate leading-normal py-0.5 text-[#FF0000]"
                >
                  {activeTrack.title}
                </p>
                <p
                  className={`text-xs truncate leading-normal py-0.5 ${
                    isLight ? "text-neutral-600" : "text-neutral-300"
                  }`}
                >
                  {activeTrack.artist}
                </p>
              </div>

              {onContextMenuTrack && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onContextMenuTrack(activeTrack, e);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    isLight
                      ? "text-neutral-500 hover:text-black hover:bg-black/5"
                      : "text-neutral-300 hover:text-white hover:bg-white/10"
                  }`}
                  title="Daha fazla seçenek"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* FULL QUEUE LIST: Past tracks + Active Track Card + Upcoming tracks */}
        {queue.length === 0 && !activeTrack ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Sırada parça yok.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {queue.map((track, idx) => {
              const isActive = activeIndex !== -1 ? idx === activeIndex : activeTrack?.id === track.id;
              const isPast = activeIndex !== -1 && idx < activeIndex;

              // If this is the active track in queue -> Render the special Now Playing Card
              if (isActive) {
                return (
                  <div
                    key={`queue-active-${track.id}-${idx}`}
                    ref={activeTrackRef}
                    onClick={() => playTrack(track)}
                    onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                    className={`p-2.5 rounded-xl border transition-all my-1.5 cursor-pointer ${
                      isLight
                        ? "bg-rose-500/[0.06] border-rose-500/20 shadow-sm"
                        : "bg-rose-500/[0.1] border-rose-500/25"
                    }`}
                  >
                    {/* Active Song Row: EXACT typography matching PlaylistView */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 bg-neutral-200 dark:bg-zinc-800 shadow-sm">
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music2 className="w-4 h-4 text-[#FF0000]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate leading-normal py-0.5 text-[#FF0000]`}
                        >
                          {track.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {track.is_explicit && (
                            <span
                              title="Explicit"
                              className="w-3.5 h-3.5 rounded-[2px] bg-neutral-500 text-white text-[9px] font-black shrink-0 inline-flex items-center justify-center leading-none"
                            >
                              E
                            </span>
                          )}
                          <p
                            className={`text-xs truncate leading-normal py-0.5 ${
                              isLight ? "text-neutral-600" : "text-neutral-300"
                            }`}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {onContextMenuTrack && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onContextMenuTrack(track, e);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isLight
                              ? "text-neutral-500 hover:text-black hover:bg-black/5"
                              : "text-neutral-300 hover:text-white hover:bg-white/10"
                          }`}
                          title="Daha fazla seçenek"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Normal Track Row (Past tracks have opacity-50, upcoming tracks have 100% FULL opacity and playlist typography)
              return (
                <div
                  key={`queue-track-${track.id}-${idx}`}
                  onClick={() => playTrack(track)}
                  onContextMenu={(e) => onContextMenuTrack?.(track, e)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer group ${
                    isPast ? "opacity-50 hover:opacity-100" : "opacity-100"
                  } ${
                    isLight
                      ? "hover:bg-neutral-200/60"
                      : "hover:bg-white/10"
                  }`}
                >
                  {/* Artwork */}
                  <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-200 dark:bg-zinc-800 shadow-sm">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                  </div>

                  {/* Info: EXACT text style & color from PlaylistView */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                        isLight ? "text-neutral-900" : "text-white"
                      } group-hover:text-[#ff0000] transition-colors`}
                    >
                      {track.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      {track.is_explicit && (
                        <span
                          title="Explicit"
                          className="w-3.5 h-3.5 rounded-[2px] bg-neutral-500 text-white text-[9px] font-black shrink-0 inline-flex items-center justify-center leading-none"
                        >
                          E
                        </span>
                      )}
                      <p
                        className={`text-xs truncate leading-normal py-0.5 ${
                          isLight
                            ? "text-neutral-500 hover:text-neutral-900"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  {/* More Context Options on hover */}
                  {onContextMenuTrack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenuTrack(track, e);
                      }}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                        isLight
                          ? "text-neutral-500 hover:text-black hover:bg-black/5"
                          : "text-neutral-400 hover:text-white hover:bg-white/10"
                      }`}
                      title="Daha fazla seçenek"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightDrawer;
