import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  type FC,
} from "react";
import { Music2, Mic, RotateCw, X, Sparkles } from "lucide-react";
import type { Track, LyricsData, LyricLine } from "../types/music";
import { fetchLyrics } from "../services/lyrics";
import { useTheme } from "../context/ThemeContext";
import { getOptimizedThumbnail } from "./HomeView";

interface LyricsViewProps {
  activeTrack: Track | null;
  currentTime: number;
  duration?: number;
  onSeek: (time: number) => void;
  onClose?: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const LyricsView: FC<LyricsViewProps> = ({
  activeTrack,
  currentTime,
  duration,
  onSeek,
  onClose,
  onScroll,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // High-resolution thumbnail with fallback
  const [coverSrc, setCoverSrc] = useState<string>(() =>
    getOptimizedThumbnail(activeTrack?.thumbnail)
  );

  useEffect(() => {
    setCoverSrc(getOptimizedThumbnail(activeTrack?.thumbnail));
  }, [activeTrack?.thumbnail]);

  const handleCoverError = () => {
    if (coverSrc.includes("maxresdefault.jpg")) {
      setCoverSrc(coverSrc.replace("maxresdefault.jpg", "hqdefault.jpg"));
    } else if (activeTrack?.thumbnail && coverSrc !== activeTrack.thumbnail) {
      setCoverSrc(activeTrack.thumbnail);
    }
  };

  // Auto-scroll & manual wheel suspension refs
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<number | null>(null);

  // Load lyrics when activeTrack changes
  const loadLyrics = useCallback(async () => {
    if (!activeTrack) {
      setLyricsData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await fetchLyrics(activeTrack, duration);
      setLyricsData(data);
    } catch (err) {
      console.error("Lyrics fetch error:", err);
      setLyricsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeTrack, duration]);

  useEffect(() => {
    loadLyrics();
  }, [loadLyrics]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Clean up user scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // Compute activeIndex based on currentTime
  const lines: LyricLine[] = lyricsData?.syncedLyrics || [];
  let activeIndex = -1;

  if (lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) {
        activeIndex = i;
      } else {
        break;
      }
    }
    // If before first line, keep activeIndex at -1 or highlight first if close
    if (activeIndex === -1 && lines.length > 0 && currentTime < lines[0].time) {
      activeIndex = 0;
    }
  }

  // Smoothly center active line when activeIndex changes, unless user is manually scrolling
  useEffect(() => {
    if (activeIndex >= 0 && !isUserScrollingRef.current && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  // Auto-center on initial lyrics load
  useEffect(() => {
    if (lyricsData?.isSynced && activeIndex >= 0) {
      const timer = window.setTimeout(() => {
        if (!isUserScrollingRef.current && activeLineRef.current) {
          activeLineRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [lyricsData]);

  // Manual mouse wheel scroll handler with 3.5s suspension
  const handleWheel = () => {
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) {
      window.clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
      // Re-center active line
      if (activeLineRef.current) {
        activeLineRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 3500); // 3.5 seconds suspension
  };

  // User clicked a line to seek
  const handleLineClick = (time: number) => {
    onSeek(time);
    isUserScrollingRef.current = false;
    if (userScrollTimeoutRef.current) {
      window.clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = null;
    }
  };

  // Reset line refs length
  lineRefs.current = [];

  return (
    <div
      className={`relative flex-1 flex h-full w-full overflow-hidden pt-14 select-none transition-colors duration-200 ${
        isLight ? "bg-white text-neutral-950" : "bg-[#0c0c0c] text-white"
      }`}
    >
      {/* Close button in top-right corner */}
      {onClose && (
        <button
          onClick={onClose}
          data-tooltip="Kapat (Esc)"
          data-tooltip-side="bottom"
          className={`absolute top-18 right-8 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isLight
              ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black"
              : "bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white"
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* ------------------------------------------------------------- */}
      {/* A. SOL SÜTUN (Sabit Parça Bilgisi - w-72 flex-shrink-0)       */}
      {/* ------------------------------------------------------------- */}
      <div className="w-72 flex-shrink-0 flex flex-col justify-between h-full p-8 md:p-10 select-none">
        {/* Üst Parça Bilgisi */}
        <div className="flex flex-col">
          {/* Büyük, Yuvarlatılmış Albüm Kapağı */}
          <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-md mb-4 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={activeTrack?.title || "Track Cover"}
                onError={handleCoverError}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <Music2 className="w-16 h-16 text-neutral-400 dark:text-neutral-600 stroke-[1.5]" />
            )}
          </div>

          {/* Şarkı Adı */}
          <h2
            className="font-bold text-lg text-neutral-950 dark:text-white leading-snug line-clamp-2"
            title={activeTrack?.title || "Bilinmeyen Şarkı"}
          >
            {activeTrack?.title || "Çalan Şarkı Yok"}
          </h2>

          {/* Sanatçı Adı */}
          <p
            className="text-sm font-medium text-neutral-500 mt-1 truncate"
            title={activeTrack?.artist}
          >
            {activeTrack?.artist || "—"}
          </p>
        </div>

        {/* Alt Footer (Sol Alt Köşe) */}
        <div className="pt-4 border-t border-neutral-200/50 dark:border-white/5">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                lyricsData?.isSynced
                  ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : lyricsData?.plainLyrics
                  ? "bg-amber-500"
                  : "bg-neutral-400"
              }`}
            />
            <span>
              {lyricsData?.isSynced
                ? "Synced • via LRCLIB"
                : lyricsData?.plainLyrics
                ? "Plain • via LRCLIB"
                : "via LRCLIB"}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* B. SAĞ SÜTUN (Kaydırılabilir Şarkı Sözleri Akışı)             */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={lyricsContainerRef}
        onWheel={handleWheel}
        onScroll={onScroll}
        className="flex-1 h-full overflow-y-auto scroll-smooth scrollbar-none py-28 px-8 md:px-14 flex flex-col relative"
      >
        {/* 1. Durum: Şarkı Çalmıyor */}
        {!activeTrack && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
            <Music2 className="w-14 h-14 text-neutral-300 dark:text-neutral-700 mb-4 stroke-[1.25]" />
            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-1">
              Çalan Şarkı Yok
            </h3>
            <p className="text-sm text-neutral-400 max-w-xs">
              Şarkı sözlerini görüntülemek için bir parça başlatın.
            </p>
          </div>
        )}

        {/* 2. Durum: Yükleniyor */}
        {activeTrack && isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-medium text-neutral-400">
              Sözler aranıyor...
            </span>
          </div>
        )}

        {/* 3. Durum: Söz Bulunamadı veya Hata */}
        {activeTrack && !isLoading && (!lyricsData || (!lyricsData.isSynced && !lyricsData.plainLyrics)) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center mb-4 text-neutral-400 dark:text-neutral-500">
              <Mic className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
              Şarkı sözü bulunamadı
            </h3>
            <button
              onClick={loadLyrics}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              Tekrar Dene
            </button>
          </div>
        )}

        {/* 4. Durum: Senkronize Şarkı Sözleri (Synced Lyrics with Focus Blur / Depth of Field) */}
        {activeTrack && !isLoading && lyricsData?.isSynced && lines.length > 0 && (
          <div className="flex flex-col space-y-4 max-w-3xl pb-32">
            {lines.map((line, index) => {
              const distance = Math.abs(index - activeIndex);
              const isActive = distance === 0;

              // Distance-based Depth of Field (Focus Blur) calculation
              let distanceClasses = "opacity-20 blur-[2.5px] text-neutral-500 dark:text-neutral-500 font-bold";
              if (distance === 0) {
                distanceClasses = "opacity-100 filter-none text-neutral-950 dark:text-white font-extrabold scale-100";
              } else if (distance === 1) {
                distanceClasses = "opacity-70 blur-[0.4px] text-neutral-800 dark:text-neutral-200 font-bold";
              } else if (distance === 2) {
                distanceClasses = "opacity-45 blur-[1.2px] text-neutral-600 dark:text-neutral-400 font-bold";
              }

              return (
                <div
                  key={`${index}_${line.time}`}
                  ref={(el) => {
                    lineRefs.current[index] = el;
                    if (isActive) {
                      activeLineRef.current = el;
                    }
                  }}
                  onClick={() => handleLineClick(line.time)}
                  className={`group flex items-center py-2.5 text-2xl md:text-3xl transition-all duration-300 ease-out cursor-pointer origin-left rounded-lg px-2 -mx-2 ${distanceClasses} ${
                    !isActive
                      ? "hover:blur-none hover:opacity-85 hover:text-neutral-900 dark:hover:text-neutral-100"
                      : ""
                  }`}
                >
                  {/* O an çalan satır dikey kırmızı çizgi göstergesi */}
                  <span
                    className={`w-1.5 h-7 rounded-full mr-3 shrink-0 inline-block align-middle transition-all duration-300 ${
                      isActive ? "bg-red-500 opacity-100 scale-100" : "opacity-0 scale-75"
                    }`}
                  />
                  <span className="leading-snug select-none">{line.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Durum: Düz Metin Şarkı Sözleri (Plain Lyrics Fallback) */}
        {activeTrack && !isLoading && !lyricsData?.isSynced && lyricsData?.plainLyrics && (
          <div className="flex flex-col max-w-2xl pb-32 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-6 text-xs text-neutral-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Zaman damgalı sözler bulunamadı, düz metin gösteriliyor</span>
            </div>
            <div className="text-xl md:text-2xl font-medium leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-line select-text">
              {lyricsData.plainLyrics}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LyricsView;
