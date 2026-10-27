import { useState, type FC, type MouseEvent } from "react";
import {
  Play,
  Pause,
  Shuffle,
  Trash2,
  Music2,
  Search,
  ArrowDownToLine,
  CheckCircle2,
  HardDrive,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { usePlayer } from "../context/PlayerContext";
import { useDownload } from "../context/DownloadContext";
import type { Track } from "../types/music";

interface DownloadsViewProps {
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onContextMenuTrack?: (track: Track, e: MouseEvent) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return "0 MB";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DownloadsView: FC<DownloadsViewProps> = ({
  onScroll,
  onContextMenuTrack,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { activeTrack, playbackStatus, playTrack, togglePlayPause } = usePlayer();
  const {
    downloadedTracks,
    deleteTrackDownload,
    totalSavedCount,
    totalSavedFormatted,
  } = useDownload();

  const [searchFilter, setSearchFilter] = useState("");
  const isPlaying = playbackStatus === "playing";

  // Convert DownloadedTrack to Track for player compatibility
  const trackList: Track[] = downloadedTracks.map((d) => ({
    id: d.track_id,
    title: d.title,
    artist: d.artist,
    album: d.album || undefined,
    duration: d.duration || undefined,
    thumbnail: d.cover_path ? `http://tubify-local.localhost/cover/${d.track_id}` : undefined,
  }));

  const filteredTracks = trackList.filter((t) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album && t.album.toLowerCase().includes(q))
    );
  });

  const handlePlayAll = () => {
    if (filteredTracks.length === 0) return;
    const firstTrack = filteredTracks[0];
    const isCurrentActive = activeTrack && activeTrack.id === firstTrack.id;
    if (isCurrentActive) {
      togglePlayPause();
    } else {
      playTrack(firstTrack, filteredTracks, "downloads");
    }
  };

  const handleShuffleAll = () => {
    if (filteredTracks.length === 0) return;
    const shuffled = [...filteredTracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled, "downloads");
  };

  return (
    <div
      id="main-scroll-container"
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none pt-0 pb-28 transition-colors bg-transparent relative z-10 ${
        isLight ? "text-neutral-900" : "text-white"
      }`}
    >
      {/* Hero Header Banner */}
      <div className="px-8 pt-8 pb-6 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
          {/* Cover / Icon Container */}
          <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center shadow-2xl shrink-0 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors pointer-events-none" />
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#ff0000] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <ArrowDownToLine className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mt-1 pt-1 pb-1 leading-normal overflow-visible">
              İndirilenler
            </h1>
            <p
              className={`text-sm mt-3 flex items-center gap-2 ${
                isLight ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              <HardDrive className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>
                {totalSavedCount} şarkı indirildi • Toplam {totalSavedFormatted} alan kullanılıyor
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between gap-4 mt-8 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Big YouTube Red Play Button */}
            <button
              onClick={handlePlayAll}
              disabled={filteredTracks.length === 0}
              className="w-14 h-14 rounded-full bg-[#ff0000] hover:bg-[#cc0000] active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shadow-md"
              title="Oynat"
            >
              {isPlaying && activeTrack && filteredTracks.some((t) => t.id === activeTrack.id) ? (
                <Pause className="w-6 h-6 fill-white stroke-white" />
              ) : (
                <Play className="w-6 h-6 fill-white stroke-white ml-1" />
              )}
            </button>

            {/* Shuffle Button */}
            <button
              onClick={handleShuffleAll}
              disabled={filteredTracks.length === 0}
              className={`p-2 transition-colors cursor-pointer rounded-full disabled:opacity-50 ${
                isLight
                  ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title="Karışık Çal"
            >
              <Shuffle className="w-6 h-6" />
            </button>
          </div>

          {/* Filter Search Input (🔍 Filtrele) */}
          <div className="ml-auto relative">
            <Search
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-neutral-400"
              }`}
            />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrele"
              className={`h-8 pl-9 pr-4 rounded-full text-sm font-medium outline-none w-44 transition-colors ${
                isLight
                  ? "bg-neutral-100/80 hover:bg-neutral-200/80 focus:bg-white focus:ring-1 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-500"
                  : "bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-neutral-400"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Track List Table */}
      <div className="px-8 mt-4">
        {filteredTracks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center mb-3 text-neutral-400">
              <ArrowDownToLine className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {searchFilter ? "Eşleşen şarkı bulunamadı" : "Henüz indirilmiş şarkı yok"}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
              {searchFilter
                ? "Farklı bir arama terimi deneyin."
                : "Çalma listesi sayfalarında 'Listeyi İndir' butonuna basarak veya şarkılara sağ tıklayıp 'İndir' seçeneğini kullanarak çevrimdışı müzik arşivinizi oluşturun."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table Header */}
            <div
              className={`grid grid-cols-[40px_minmax(200px,1.5fr)_minmax(120px,1fr)_90px_60px] gap-4 px-4 py-2 border-b text-[11px] font-bold uppercase tracking-wider ${
                isLight ? "text-neutral-600 border-black/10" : "text-neutral-400 border-white/10"
              }`}
            >
              <div>#</div>
              <div>Başlık</div>
              <div>Albüm</div>
              <div className="text-right">Boyut</div>
              <div className="text-center">İşlem</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-transparent mt-1">
              {filteredTracks.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const orig = downloadedTracks.find((d) => d.track_id === track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, filteredTracks, "downloads")}
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        e.preventDefault();
                        onContextMenuTrack(track, e);
                      }
                    }}
                    className={`grid grid-cols-[40px_minmax(200px,1.5fr)_minmax(120px,1fr)_90px_60px] gap-4 items-center px-4 py-2.5 rounded-lg group transition-colors cursor-pointer ${
                      isActive
                        ? isLight
                          ? "bg-black/[0.07] text-neutral-950 font-medium"
                          : "bg-white/[0.12] text-white font-medium"
                        : isLight
                        ? "hover:bg-black/[0.05] text-neutral-700"
                        : "hover:bg-white/[0.08] text-neutral-300"
                    }`}
                  >
                    {/* # Index or Play State */}
                    <div className="text-sm font-medium flex items-center">
                      <span className={`group-hover:hidden ${isActive ? "text-[#ff0000] font-bold" : ""}`}>
                        {isActive && isPlaying ? (
                          <span className="flex items-center gap-1 h-3.5 px-0.5" title="Oynatılıyor">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-tubify-dot-1" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-tubify-dot-2" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-tubify-dot-3" />
                          </span>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActive) {
                            togglePlayPause();
                          } else {
                            playTrack(track, filteredTracks, "downloads");
                          }
                        }}
                        className={`hidden group-hover:flex w-6 h-6 items-center justify-center hover:scale-110 transition-transform cursor-pointer ${
                          isLight ? "text-black" : "text-white"
                        }`}
                        title="Oynat"
                      >
                        {isActive && isPlaying ? (
                          <Pause className="w-4 h-4 fill-current stroke-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current stroke-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Title + Artist */}
                    <div className="flex items-center gap-3.5 min-w-[200px] overflow-hidden">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover shrink-0 bg-neutral-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                            isLight ? "bg-neutral-200" : "bg-[#282828]"
                          }`}
                        >
                          <Music2 className="w-4 h-4 text-[#ff0000]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                            isActive
                              ? "text-[#ff0000]"
                              : isLight
                              ? "text-neutral-900"
                              : "text-white"
                          }`}
                        >
                          {track.title}
                        </p>
                        <p
                          className={`text-xs truncate leading-normal py-0.5 ${
                            isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Album */}
                    <div
                      className={`text-xs truncate ${
                        isLight ? "text-neutral-600" : "text-neutral-400"
                      }`}
                    >
                      {track.album || "—"}
                    </div>

                    {/* File Size */}
                    <div
                      className={`text-xs text-right font-mono flex items-center justify-end gap-1.5 ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#ff0000] shrink-0" />
                      <span>{orig ? formatBytes(orig.file_size) : "—"}</span>
                    </div>

                    {/* Actions: Delete Button */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrackDownload(track.id);
                        }}
                        data-tooltip="İndirilenlerden Sil"
                        data-tooltip-side="left"
                        className="p-1.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-neutral-200/50 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsView;
