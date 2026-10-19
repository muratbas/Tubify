import type { FC } from "react";
import {
  X,
  Music2,
  Tv,
  Disc3,
  Heart,
  ExternalLink,
  ListMusic,
  FileText,
  Play,
  Share2,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { MicroVisualizer } from "./MicroVisualizer";
import { openExternalUrl } from "../services/api";

export const RightDrawer: FC = () => {
  const {
    activeTrack,
    playbackStatus,
    queue,
    is16x9Aspect,
    isRightDrawerOpen,
    rightDrawerTab,
    toggleRightDrawer,
    setRightDrawerTab,
    toggle16x9Aspect,
    toggleLike,
    likedTrackIds,
    playTrack,
  } = usePlayer();

  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isPlaying = playbackStatus === "playing";

  if (!isRightDrawerOpen) return null;

  const isLiked = activeTrack ? likedTrackIds.has(activeTrack.id) : false;

  const handleOpenYoutube = () => {
    if (!activeTrack) return;
    openExternalUrl(`https://music.youtube.com/watch?v=${activeTrack.id}`);
  };

  const handleShare = () => {
    if (!activeTrack) return;
    navigator.clipboard?.writeText(`https://music.youtube.com/watch?v=${activeTrack.id}`);
  };

  return (
    <aside
      className={`w-[340px] xl:w-[380px] h-full flex flex-col rounded-none overflow-hidden shrink-0 border-l transition-all duration-300 relative select-none ${
        isLight
          ? "bg-[#ffffff] border-[#e4e4e7] text-[#111111]"
          : "bg-[#0a0a0a] border-white/10 text-white"
      }`}
    >
      {/* Drawer Header with Tabs */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b shrink-0 ${
          isLight ? "border-[#e4e4e7]" : "border-white/[0.08]"
        }`}
      >
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl">
          <button
            onClick={() => setRightDrawerTab("nowPlaying")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
              rightDrawerTab === "nowPlaying"
                ? isLight
                  ? "bg-[#18181b] text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b]"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t.nowPlaying}
          </button>
          <button
            onClick={() => setRightDrawerTab("queue")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              rightDrawerTab === "queue"
                ? isLight
                  ? "bg-[#18181b] text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b]"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>{t.queue}</span>
            {queue.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  rightDrawerTab === "queue"
                    ? isLight
                      ? "bg-white/20 text-white"
                      : "bg-black/20 text-black"
                    : isLight
                    ? "bg-[#e4e4e7] text-[#52525b]"
                    : "bg-white/[0.1] text-white/70"
                }`}
              >
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setRightDrawerTab("lyrics")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
              rightDrawerTab === "lyrics"
                ? isLight
                  ? "bg-[#18181b] text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b]"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t.lyrics}
          </button>
        </div>

        <button
          onClick={() => toggleRightDrawer()}
          title="Close drawer"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
              : "text-white/60 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        {/* TAB 1: Now Playing */}
        {rightDrawerTab === "nowPlaying" && (
          <div className="space-y-6">
            {activeTrack ? (
              <>
                {/* Artwork with Aspect Switch (1:1 vs 16:9 InnerTube) */}
                <div className="relative group">
                  <div
                    className={`w-full overflow-hidden transition-all duration-300 shadow-2xl relative ${
                      is16x9Aspect
                        ? "aspect-video rounded-xl bg-black"
                        : "aspect-square rounded-2xl bg-[#141416]"
                    } ${isLight ? "ring-1 ring-black/5" : "ring-1 ring-white/10"}`}
                  >
                    {activeTrack.thumbnail ? (
                      <img
                        src={activeTrack.thumbnail}
                        alt={activeTrack.title}
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <Music2 className="w-12 h-12 text-[#ff0000]" />
                      </div>
                    )}

                    {isPlaying && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md flex items-center gap-1.5 border border-white/10">
                        <MicroVisualizer isPlaying={isPlaying} />
                        <span className="text-[10px] font-mono text-white/80">LIVE</span>
                      </div>
                    )}
                  </div>

                  {/* 1:1 vs 16:9 Aspect Ratio Toggle Button (InnerTube geek feature) */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={toggle16x9Aspect}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isLight
                          ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                          : "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-white/90"
                      }`}
                      title="Switch aspect ratio between 1:1 Album and 16:9 Video"
                    >
                      {is16x9Aspect ? (
                        <>
                          <Disc3 className="w-3.5 h-3.5 text-[#ff0000]" />
                          <span>{t.songMode}</span>
                        </>
                      ) : (
                        <>
                          <Tv className="w-3.5 h-3.5 text-[#ff0000]" />
                          <span>{t.videoMode}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleLike(activeTrack)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isLiked
                            ? "text-[#ff0000] bg-rose-500/10"
                            : isLight
                            ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                        }`}
                        title={isLiked ? "Unlike" : "Like"}
                      >
                        <Heart
                          className={`w-4 h-4 ${isLiked ? "fill-[#ff0000] text-[#ff0000]" : ""}`}
                        />
                      </button>

                      <button
                        onClick={handleOpenYoutube}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isLight
                            ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                        }`}
                        title="Open on YouTube Music"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleShare}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isLight
                            ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                        }`}
                        title="Copy YouTube URL"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Track Details */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-lg font-black tracking-tight leading-snug ${
                        isLight ? "text-[#18181b]" : "text-white"
                      }`}
                    >
                      {activeTrack.title}
                    </h3>
                  </div>

                  <p
                    className={`text-sm font-semibold tracking-tight ${
                      isLight ? "text-[#52525b]" : "text-white/70"
                    }`}
                  >
                    {activeTrack.artist}
                  </p>

                  {activeTrack.album && (
                    <p
                      className={`text-xs truncate ${
                        isLight ? "text-[#71717a]" : "text-white/50"
                      }`}
                    >
                      {activeTrack.album}
                    </p>
                  )}
                </div>

                {/* Next in Queue Preview Card */}
                {queue.length > 1 && (
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isLight
                        ? "bg-[#f4f4f5]/60 border-[#e4e4e7]"
                        : "bg-white/[0.03] border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-white/50">
                        {t.queue} Preview
                      </span>
                      <button
                        onClick={() => setRightDrawerTab("queue")}
                        className="text-[11px] font-semibold text-[#ff0000] hover:underline cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                    {(() => {
                      const curIdx = queue.findIndex((t) => t.id === activeTrack.id);
                      const next = curIdx !== -1 && curIdx + 1 < queue.length ? queue[curIdx + 1] : queue[0];
                      if (!next) return null;
                      return (
                        <div
                          onClick={() => playTrack(next)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <img
                            src={next.thumbnail || ""}
                            alt={next.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-800"
                          />
                          <div className="min-w-0 flex-1">
                            <h5
                              className={`text-xs font-bold truncate group-hover:text-[#ff0000] transition-colors ${
                                isLight ? "text-[#18181b]" : "text-white"
                              }`}
                            >
                              {next.title}
                            </h5>
                            <p
                              className={`text-[11px] truncate ${
                                isLight ? "text-[#71717a]" : "text-white/50"
                              }`}
                            >
                              {next.artist}
                            </p>
                          </div>
                          <Play className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center space-y-3">
                <Music2 className="w-10 h-10 mx-auto text-white/20" />
                <p className="text-xs text-white/50">No track playing right now.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Queue */}
        {rightDrawerTab === "queue" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Playing Next ({queue.length})
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="py-20 text-center space-y-2 text-white/40">
                <ListMusic className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs">Queue is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map((track, idx) => {
                  const isActive = activeTrack?.id === track.id;
                  const isTrackLiked = likedTrackIds.has(track.id);

                  return (
                    <div
                      key={`queue-${track.id}-${idx}`}
                      onClick={() => playTrack(track)}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                        isActive
                          ? isLight
                            ? "bg-[#ffffff] shadow-sm border border-[#e4e4e7]"
                            : "bg-white/[0.08] border border-white/[0.1] text-white"
                          : isLight
                          ? "hover:bg-white/80 text-[#18181b]"
                          : "hover:bg-white/[0.04] text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                          {track.thumbnail ? (
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music2 className="w-4 h-4 text-white/40" />
                            </div>
                          )}
                          {isActive && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <MicroVisualizer isPlaying={isPlaying} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
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
                          <p
                            className={`text-[11px] truncate ${
                              isLight ? "text-[#71717a]" : "text-white/50"
                            }`}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className={`p-1 transition-colors cursor-pointer ${
                            isTrackLiked
                              ? "text-[#ff0000]"
                              : "text-white/20 group-hover:text-white/60"
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isTrackLiked ? "fill-[#ff0000] text-[#ff0000]" : ""
                            }`}
                          />
                        </button>
                        <span className="text-[11px] font-mono text-white/40">
                          {track.duration || "3:30"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Lyrics */}
        {rightDrawerTab === "lyrics" && (
          <div className="h-full flex flex-col justify-center items-center py-10 px-4 text-center space-y-4">
            <FileText className="w-10 h-10 text-white/20" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white/80">Lyrics Stream</h4>
              <p className="text-xs text-white/40 max-w-xs">
                {activeTrack
                  ? `Real-time synced lyrics for "${activeTrack.title}" by ${activeTrack.artist}.`
                  : "Play a song to view available lyrics and liner notes."}
              </p>
            </div>
            {activeTrack && (
              <div className="w-full pt-4 space-y-3 font-medium text-xs text-white/60">
                <p className="opacity-40">{activeTrack.artist}</p>
                <p className="text-sm text-white font-bold tracking-tight">
                  {activeTrack.title}
                </p>
                <p className="opacity-70 text-[11px]">{activeTrack.album || "Single"}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
