import { useRef, useEffect, type FC } from "react";
import { CheckCircle2, XCircle, Music2, ArrowDownToLine } from "lucide-react";
import { useDownload } from "../context/DownloadContext";

interface DownloadsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDownloadsView: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return "0 MB";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DownloadsPopover: FC<DownloadsPopoverProps> = ({
  isOpen,
  onClose,
  onOpenDownloadsView,
}) => {
  const {
    downloadedTracks,
    activeDownloads,
    cancelTrackDownload,
    totalSavedCount,
    totalSavedFormatted,
  } = useDownload();

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeList = Array.from(activeDownloads.values());
  const completedList = downloadedTracks.slice(0, 5); // Show latest 5 in popover preview
  const isEmpty = activeList.length === 0 && completedList.length === 0;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-11 w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 no-drag select-none"
    >
      {/* Header Area */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
        <h3 className="font-bold text-base text-neutral-900 dark:text-white">
          Downloads
        </h3>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {totalSavedCount} saved • {totalSavedFormatted}
        </span>
      </div>

      {/* Items List (Max 4-5 items visible, scrolling on vertical overflow) */}
      <div className="max-h-64 overflow-y-auto custom-scrollbar my-2 space-y-2.5 pr-0.5">
        {isEmpty && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2">
              <ArrowDownToLine className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Henüz indirilen şarkı yok
            </p>
          </div>
        )}

        {/* 1. Active Downloads (in progress) */}
        {activeList.map((item) => (
          <div
            key={item.track_id}
            className="flex items-center gap-3 p-1 rounded-xl group transition-colors"
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <Music2 className="w-4 h-4 text-neutral-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-neutral-900 dark:text-white leading-tight">
                {item.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff0000] rounded-full transition-all duration-200"
                    style={{ width: `${Math.max(5, item.progress)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {Math.round(item.progress)}%
                </span>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => cancelTrackDownload(item.track_id)}
              data-tooltip="İptal Et"
              data-tooltip-side="left"
              className="p-1 rounded-full text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* 2. Completed Downloads */}
        {completedList.map((track) => (
          <div
            key={track.track_id}
            className="flex items-center gap-3 p-1 rounded-xl transition-colors"
          >
            {track.cover_path ? (
              <img
                src={`http://tubify-local.localhost/cover/${track.track_id}`}
                alt={track.title}
                onError={(e) => {
                  // Fallback
                  (e.target as HTMLElement).style.display = "none";
                }}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <Music2 className="w-4 h-4 text-neutral-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-neutral-900 dark:text-white leading-tight">
                {track.title}
              </p>
              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                {formatBytes(track.file_size)}
              </p>
            </div>

            <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
          </div>
        ))}
      </div>

      {/* Bottom Button: Open downloads */}
      <button
        onClick={() => {
          onClose();
          onOpenDownloadsView();
        }}
        className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white py-2 mt-2 w-full text-center hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
      >
        Open downloads
      </button>
    </div>
  );
};
