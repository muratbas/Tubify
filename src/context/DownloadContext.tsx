import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Track, DownloadedTrack, DownloadProgressPayload, ActiveDownload } from "../types/music";
import {
  startDownload,
  cancelDownload,
  getDownloadedTracks,
  deleteDownloadedTrack,
} from "../services/api";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface DownloadContextType {
  downloadedTracks: DownloadedTrack[];
  downloadedIds: Set<string>;
  activeDownloads: Map<string, ActiveDownload>;
  isDownloadingAny: boolean;
  totalSavedCount: number;
  totalSavedBytes: number;
  totalSavedFormatted: string;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  togglePopover: () => void;
  startTrackDownload: (track: Track) => Promise<void>;
  cancelTrackDownload: (trackId: string) => Promise<void>;
  deleteTrackDownload: (trackId: string) => Promise<void>;
  downloadPlaylistTracks: (tracks: Track[]) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  isDownloading: (trackId: string) => boolean;
  getActiveDownload: (trackId: string) => ActiveDownload | undefined;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloadedTracks, setDownloadedTracks] = useState<DownloadedTrack[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [activeDownloads, setActiveDownloads] = useState<Map<string, ActiveDownload>>(new Map());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const activeDownloadsRef = useRef<Map<string, ActiveDownload>>(activeDownloads);
  activeDownloadsRef.current = activeDownloads;

  // Initial load of downloaded tracks
  const refreshDownloaded = useCallback(async () => {
    try {
      const tracks = await getDownloadedTracks();
      setDownloadedTracks(tracks);
      setDownloadedIds(new Set(tracks.map((t) => t.track_id)));
    } catch (e) {
      console.warn("Failed to load downloaded tracks:", e);
    }
  }, []);

  useEffect(() => {
    refreshDownloaded();
  }, [refreshDownloaded]);

  // Setup Tauri event listeners for real-time IPC download progress and completion
  useEffect(() => {
    if (!isTauri) return;

    let unlistenProgress: (() => void) | undefined;
    let unlistenCompleted: (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;
    let unlistenDeleted: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        unlistenProgress = await listen<DownloadProgressPayload>(
          "download_progress",
          (event) => {
            const { track_id, progress, downloaded_bytes, total_bytes } = event.payload;
            setActiveDownloads((prev) => {
              const current = prev.get(track_id);
              if (!current) return prev;
              const next = new Map(prev);
              next.set(track_id, {
                ...current,
                progress: Math.min(100, Math.max(0, progress)),
                downloaded_bytes,
                total_bytes,
              });
              return next;
            });
          }
        );

        unlistenCompleted = await listen<DownloadedTrack>(
          "download_completed",
          (event) => {
            const track = event.payload;
            setActiveDownloads((prev) => {
              if (!prev.has(track.track_id)) return prev;
              const next = new Map(prev);
              next.delete(track.track_id);
              return next;
            });
            setDownloadedTracks((prev) => {
              const filtered = prev.filter((t) => t.track_id !== track.track_id);
              return [track, ...filtered];
            });
            setDownloadedIds((prev) => new Set(prev).add(track.track_id));
          }
        );

        unlistenCancelled = await listen<{ track_id: string }>(
          "download_cancelled",
          (event) => {
            const { track_id } = event.payload;
            setActiveDownloads((prev) => {
              if (!prev.has(track_id)) return prev;
              const next = new Map(prev);
              next.delete(track_id);
              return next;
            });
          }
        );

        unlistenDeleted = await listen<{ track_id: string }>(
          "download_deleted",
          (event) => {
            const { track_id } = event.payload;
            setDownloadedTracks((prev) => prev.filter((t) => t.track_id !== track_id));
            setDownloadedIds((prev) => {
              const next = new Set(prev);
              next.delete(track_id);
              return next;
            });
          }
        );
      } catch (err) {
        console.warn("Failed to attach download event listeners:", err);
      }
    };

    setupListeners();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenCompleted) unlistenCompleted();
      if (unlistenCancelled) unlistenCancelled();
      if (unlistenDeleted) unlistenDeleted();
    };
  }, []);

  const isDownloaded = useCallback(
    (trackId: string): boolean => {
      return downloadedIds.has(trackId);
    },
    [downloadedIds]
  );

  const isDownloading = useCallback(
    (trackId: string): boolean => {
      return activeDownloads.has(trackId);
    },
    [activeDownloads]
  );

  const getActiveDownload = useCallback(
    (trackId: string): ActiveDownload | undefined => {
      return activeDownloads.get(trackId);
    },
    [activeDownloads]
  );

  const startTrackDownload = useCallback(
    async (track: Track) => {
      if (!track.id) return;
      if (downloadedIds.has(track.id)) return;
      if (activeDownloadsRef.current.has(track.id)) return;

      // Register in active downloads map immediately
      const activeItem: ActiveDownload = {
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail || null,
        progress: 0,
        downloaded_bytes: 0,
        total_bytes: 0,
        status: "downloading",
      };

      setActiveDownloads((prev) => new Map(prev).set(track.id, activeItem));

      try {
        await startDownload(
          track.id,
          track.title,
          track.artist,
          null, // Let Rust resolve audio stream URL cleanly
          track.thumbnail || null,
          track.album || null,
          track.duration || null
        );
      } catch (err) {
        console.error("Download failed for track:", track.title, err);
        setActiveDownloads((prev) => {
          const next = new Map(prev);
          next.delete(track.id);
          return next;
        });
      }
    },
    [downloadedIds]
  );

  const cancelTrackDownload = useCallback(async (trackId: string) => {
    setActiveDownloads((prev) => {
      const next = new Map(prev);
      next.delete(trackId);
      return next;
    });
    try {
      await cancelDownload(trackId);
    } catch (err) {
      console.warn("Failed to cancel download:", err);
    }
  }, []);

  const deleteTrackDownload = useCallback(async (trackId: string) => {
    setDownloadedTracks((prev) => prev.filter((t) => t.track_id !== trackId));
    setDownloadedIds((prev) => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
    try {
      await deleteDownloadedTrack(trackId);
    } catch (err) {
      console.warn("Failed to delete downloaded track:", err);
    }
  }, []);

  // Bulk download tracks from playlist or album
  const downloadPlaylistTracks = useCallback(
    async (tracks: Track[]) => {
      const toDownload = tracks.filter(
        (t) => t.id && !downloadedIds.has(t.id) && !activeDownloadsRef.current.has(t.id)
      );

      if (toDownload.length === 0) return;

      // Open popover so user can monitor progress
      setIsPopoverOpen(true);

      // Download concurrently in chunks of 2 to avoid overwhelming network and CPU
      const concurrency = 2;
      for (let i = 0; i < toDownload.length; i += concurrency) {
        const batch = toDownload.slice(i, i + concurrency);
        await Promise.allSettled(batch.map((t) => startTrackDownload(t)));
      }
    },
    [downloadedIds, startTrackDownload]
  );

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  // Compute total saved storage stats
  const totalSavedCount = downloadedTracks.length;
  const totalSavedBytes = downloadedTracks.reduce((acc, t) => acc + (t.file_size || 0), 0);
  const totalSavedFormatted =
    totalSavedBytes >= 1024 * 1024 * 1024
      ? `${(totalSavedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
      : `${(totalSavedBytes / (1024 * 1024)).toFixed(1)} MB`;

  const isDownloadingAny = activeDownloads.size > 0;

  return (
    <DownloadContext.Provider
      value={{
        downloadedTracks,
        downloadedIds,
        activeDownloads,
        isDownloadingAny,
        totalSavedCount,
        totalSavedBytes,
        totalSavedFormatted,
        isPopoverOpen,
        setIsPopoverOpen,
        togglePopover,
        startTrackDownload,
        cancelTrackDownload,
        deleteTrackDownload,
        downloadPlaylistTracks,
        isDownloaded,
        isDownloading,
        getActiveDownload,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error("useDownload must be used within a DownloadProvider");
  }
  return context;
}
