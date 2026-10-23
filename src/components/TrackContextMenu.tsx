import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type FC,
} from "react";
import { createPortal } from "react-dom";
import {
  ListPlus,
  ListMusic,
  Radio,
  Heart,
  PlusCircle,
  ChevronRight,
  User,
  Disc,
  Share2,
  Trash2,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { addTrackToPlaylist } from "../services/api";
import type { Track, Playlist } from "../types/music";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface TrackContextMenuProps {
  track: Track | null;
  position: ContextMenuPosition | null;
  onClose: () => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onNavigateAlbum?: (
    albumId: string,
    albumTitle?: string,
    artistName?: string,
    thumbnail?: string
  ) => void;
  playlists?: Playlist[];
  onAddToPlaylist?: (pl: Playlist | "liked", track: Track) => Promise<void> | void;
  onRemoveFromPlaylist?: (track: Track) => Promise<void> | void;
  onToggleLike?: (track: Track) => Promise<void> | void;
}

const PLAYER_BAR_HEIGHT = 84;
const SAFETY_MARGIN = 8;
const DEFAULT_MENU_WIDTH = 220;
const DEFAULT_MENU_HEIGHT = 300;
const DEFAULT_SUBMENU_WIDTH = 195;
const DEFAULT_SUBMENU_HEIGHT = 240;

function calculateMenuPosition(
  pos: ContextMenuPosition | null,
  measuredWidth = DEFAULT_MENU_WIDTH,
  measuredHeight = DEFAULT_MENU_HEIGHT
) {
  if (!pos || typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  const maxAvailableHeight = window.innerHeight - PLAYER_BAR_HEIGHT;

  // 1. Dikey Eksen (Y Ekseni / Alt Taşma Kontrolü):
  // Eğer tıklananY + menuYuksekligi > maxAvailableHeight ise menüyü tıklanan noktanın yukarısına aç
  let y = pos.y;
  if (pos.y + measuredHeight > maxAvailableHeight) {
    y = pos.y - measuredHeight;
  } else {
    y = pos.y;
  }

  // 2. Yatay Eksen (X Ekseni / Sağ Taşma Kontrolü):
  // Eğer tıklananX + menuGenisligi > window.innerWidth ise menüyü soluna doğru yasla
  let x = pos.x;
  if (pos.x + measuredWidth > window.innerWidth - SAFETY_MARGIN) {
    x = pos.x - measuredWidth;
  } else {
    x = pos.x;
  }

  // 3. Güvenlik Payı: 0'dan küçük olmasını engelle (Math.max(8, y) ve Math.max(8, x))
  y = Math.max(SAFETY_MARGIN, y);
  x = Math.max(SAFETY_MARGIN, x);

  // Pencere sınırları içine sıkıştır
  if (y + measuredHeight > maxAvailableHeight) {
    y = Math.max(SAFETY_MARGIN, maxAvailableHeight - measuredHeight);
  }
  if (x + measuredWidth > window.innerWidth - SAFETY_MARGIN) {
    x = Math.max(SAFETY_MARGIN, window.innerWidth - measuredWidth - SAFETY_MARGIN);
  }

  return { x, y };
}

function calculateSubmenuPosition(
  triggerEl: HTMLElement | null,
  menuEl: HTMLElement | null,
  submenuEl: HTMLElement | null
) {
  if (!triggerEl || typeof window === "undefined") {
    return { left: 0, top: 0, maxHeight: 260 };
  }

  const triggerRect = triggerEl.getBoundingClientRect();
  const menuRect = menuEl ? menuEl.getBoundingClientRect() : triggerRect;
  const submenuWidth = submenuEl ? submenuEl.offsetWidth : DEFAULT_SUBMENU_WIDTH;
  const submenuHeight = submenuEl ? submenuEl.offsetHeight : DEFAULT_SUBMENU_HEIGHT;
  const maxAvailableHeight = window.innerHeight - PLAYER_BAR_HEIGHT;

  // 1. Yatay Eksen (X Ekseni / Sağ Taşma Kontrolü):
  // Ana menünün sağına açıldığında pencere dışına taşıyorsa sol tarafına aç
  let left: number;
  if (menuRect.right + submenuWidth > window.innerWidth - SAFETY_MARGIN) {
    left = menuRect.left - submenuWidth;
  } else {
    left = menuRect.right;
  }

  left = Math.max(SAFETY_MARGIN, left);
  if (left + submenuWidth > window.innerWidth - SAFETY_MARGIN) {
    left = Math.max(SAFETY_MARGIN, window.innerWidth - submenuWidth - SAFETY_MARGIN);
  }

  // 2. Dikey Eksen (Y Ekseni / Alt Taşma Kontrolü):
  // Alt menünün boyu pencerenin altına taşıyorsa, yukarıya doğru hizala
  let top: number;
  const wouldOverflowBottom = triggerRect.top + submenuHeight > maxAvailableHeight;

  if (wouldOverflowBottom) {
    top = triggerRect.bottom - submenuHeight;
  } else {
    top = triggerRect.top;
  }

  top = Math.max(SAFETY_MARGIN, top);
  if (top + submenuHeight > maxAvailableHeight) {
    top = Math.max(SAFETY_MARGIN, maxAvailableHeight - submenuHeight);
  }

  const maxHeight = Math.max(120, Math.min(260, maxAvailableHeight - SAFETY_MARGIN));

  return { left, top, maxHeight };
}

export const TrackContextMenu: FC<TrackContextMenuProps> = ({
  track,
  position,
  onClose,
  onNavigateArtist,
  onNavigateAlbum,
  playlists = [],
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onToggleLike,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const player = usePlayer();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const submenuRef = useRef<HTMLDivElement | null>(null);
  const submenuTimeoutRef = useRef<number | null>(null);

  const [coords, setCoords] = useState<{ x: number; y: number }>(() =>
    calculateMenuPosition(position)
  );
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [submenuCoords, setSubmenuCoords] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  }>({ left: 0, top: 0, maxHeight: 260 });

  // 1. Akıllı Boyut & Viewport Collision Tespiti (useLayoutEffect ile paint öncesi)
  useLayoutEffect(() => {
    if (!position) return;
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const adjusted = calculateMenuPosition(position, rect.width, rect.height);
      setCoords(adjusted);
    } else {
      setCoords(calculateMenuPosition(position));
    }
  }, [position, track?.id, playlists.length]);

  // 2. Alt Menü (Submenu) Konumlandırma Hesaplaması
  useLayoutEffect(() => {
    if (!showSubmenu) return;
    const calculated = calculateSubmenuPosition(
      triggerRef.current,
      menuRef.current,
      submenuRef.current
    );
    setSubmenuCoords(calculated);
  }, [showSubmenu, playlists.length]);

  // Submenu Hover ve Click Kontrolleri
  const handleTriggerMouseEnter = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    const initial = calculateSubmenuPosition(
      triggerRef.current,
      menuRef.current,
      null
    );
    setSubmenuCoords(initial);
    setShowSubmenu(true);
  };

  const handleTriggerMouseLeave = () => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    submenuTimeoutRef.current = window.setTimeout(() => {
      setShowSubmenu(false);
    }, 150);
  };

  const handleSubmenuMouseEnter = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    submenuTimeoutRef.current = window.setTimeout(() => {
      setShowSubmenu(false);
    }, 150);
  };

  const handleTriggerClick = () => {
    if (!showSubmenu) {
      const initial = calculateSubmenuPosition(
        triggerRef.current,
        menuRef.current,
        null
      );
      setSubmenuCoords(initial);
      setShowSubmenu(true);
    } else {
      setShowSubmenu(false);
    }
  };

  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  const isLiked = track ? player.likedTrackIds.has(track.id) : false;

  // Click outside, ESC key, and Scroll/Wheel auto-close listeners
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (submenuRef.current && submenuRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Close when the page or scroll container scrolls (capture phase)
    const handleScroll = (e: Event) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (submenuRef.current && submenuRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (submenuRef.current && submenuRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleResize = () => {
      onClose();
    };

    window.addEventListener("mousedown", handleClickOutside, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("wheel", handleWheel, { passive: true, capture: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("wheel", handleWheel, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [position, onClose]);

  if (!track || !position) return null;

  const handleAddToQueue = () => {
    player.addToQueue(track);
    onClose();
  };

  const handlePlayNext = () => {
    player.playNext(track);
    onClose();
  };

  const handleStartRadio = () => {
    player.startRadio(track);
    onClose();
  };

  const handleToggleLike = async () => {
    onClose();
    if (onToggleLike) {
      await onToggleLike(track);
    } else {
      await player.toggleLike(track, true);
      player.showToast(
        isLiked
          ? `"${track.title}" Beğenilenler'den kaldırıldı`
          : `"${track.title}" Beğenilenler'e eklendi`
      );
    }
  };

  const handleAddToPlaylist = async (pl: Playlist | "liked") => {
    onClose();
    if (onAddToPlaylist) {
      await onAddToPlaylist(pl, track);
      return;
    }

    if (pl === "liked" || pl.id === "LM" || pl.id === "VLLM") {
      if (onToggleLike) {
        await onToggleLike(track);
      } else {
        await player.toggleLike(track, true);
        player.showToast(`"${track.title}" Beğenilenler'e eklendi`);
      }
      return;
    }

    try {
      const cleanPlaylistId = pl.id.startsWith("VL") ? pl.id.slice(2) : pl.id;
      await addTrackToPlaylist(cleanPlaylistId, track.id);

      const key = `tubify_playlist_tracks_${pl.id}`;
      try {
        const existingRaw = localStorage.getItem(key);
        const existing: Track[] = existingRaw ? JSON.parse(existingRaw) : [];
        if (!existing.some((t) => t.id === track.id)) {
          existing.push({
            ...track,
            added_at: new Date().toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          });
          localStorage.setItem(key, JSON.stringify(existing));
        }
      } catch {}

      player.showToast(`"${track.title}", "${pl.title}" listesine eklendi`);
    } catch (e: any) {
      console.error("Failed to add track to playlist:", e);
      player.showToast(`Listeye eklenemedi: ${e?.message || e}`);
    }
  };

  const handleGoArtist = () => {
    if (onNavigateArtist && track.artist) {
      onNavigateArtist(track.artist_id || track.artist, track.artist);
    }
    onClose();
  };

  const handleGoAlbum = () => {
    if (onNavigateAlbum && track.album_id) {
      onNavigateAlbum(
        track.album_id,
        track.album || undefined,
        track.artist,
        track.thumbnail || undefined
      );
    }
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`https://music.youtube.com/watch?v=${track.id}`);
    player.showToast("Şarkı bağlantısı panoya kopyalandı");
    onClose();
  };

  const handleRemoveFromPlaylist = async () => {
    if (!track || !onRemoveFromPlaylist) return;
    onClose();
    await onRemoveFromPlaylist(track);
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      className={`fixed z-[9999] min-w-[210px] max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-none rounded-lg shadow-2xl p-1.5 text-xs font-medium select-none animate-in fade-in zoom-in-95 duration-100 ${
        isLight
          ? "bg-white border border-neutral-200 text-neutral-800 shadow-neutral-500/20"
          : "bg-[#282828] border border-white/10 text-white shadow-black/80"
      }`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Add to Queue */}
      <button
        onClick={handleAddToQueue}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <ListPlus className="w-4 h-4 shrink-0 text-[#ff0000]" />
        <span>Sıraya Ekle</span>
      </button>

      {/* 2. Play Next */}
      <button
        onClick={handlePlayNext}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <ListMusic className="w-4 h-4 shrink-0" />
        <span>Bundan Sonra Çal</span>
      </button>

      {/* 3. Start Radio */}
      <button
        onClick={handleStartRadio}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Radio className="w-4 h-4 shrink-0 text-[#ff0000]" />
        <span>Şarkı Radyosunu Başlat</span>
      </button>

      <div className={`h-[1px] my-1 ${isLight ? "bg-neutral-200" : "bg-white/[0.08]"}`} />

      {/* 4. Like / Unlike */}
      <button
        onClick={handleToggleLike}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Heart
          className={`w-4 h-4 shrink-0 ${
            isLiked ? "text-[#ff0000] fill-[#ff0000]" : "text-neutral-400"
          }`}
        />
        <span>{isLiked ? "Beğenilenler'den Kaldır" : "Beğenilenler'e Ekle"}</span>
      </button>

      {/* 5. Add to Playlist with Submenu */}
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
      >
        <button
          onClick={handleTriggerClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
            showSubmenu
              ? isLight
                ? "bg-neutral-100 text-neutral-900"
                : "bg-white/15 text-white"
              : isLight
              ? "hover:bg-neutral-100 text-neutral-800"
              : "hover:bg-white/10 text-neutral-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Çalma Listesine Ekle</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
        </button>

        {/* Submenu Portal */}
        {showSubmenu &&
          createPortal(
            <div
              ref={submenuRef}
              style={{
                left: `${submenuCoords.left}px`,
                top: `${submenuCoords.top}px`,
                maxHeight: `${submenuCoords.maxHeight}px`,
              }}
              onMouseEnter={handleSubmenuMouseEnter}
              onMouseLeave={handleSubmenuMouseLeave}
              className={`fixed z-[10000] min-w-[190px] overflow-y-auto custom-scrollbar rounded-lg shadow-2xl p-1.5 text-xs select-none ${
                isLight
                  ? "bg-white border border-neutral-200 text-neutral-800 shadow-neutral-500/20"
                  : "bg-[#282828] border border-white/10 text-white shadow-black/80"
              }`}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Beğenilenler */}
              <button
                onClick={() => handleAddToPlaylist("liked")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
                  isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-[#ff0000] shrink-0" />
                <span className="truncate">Beğenilen Şarkılar</span>
              </button>

              {playlists.length > 0 && (
                <div className={`h-[1px] my-1 ${isLight ? "bg-neutral-200" : "bg-white/[0.08]"}`} />
              )}

              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
                    isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] shrink-0" />
                  <span className="truncate">{pl.title}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
      </div>

      {/* Remove from this Playlist */}
      {onRemoveFromPlaylist && (
        <button
          onClick={handleRemoveFromPlaylist}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
            isLight
              ? "hover:bg-red-50 text-red-600"
              : "hover:bg-red-500/10 text-red-400"
          }`}
        >
          <Trash2 className="w-4 h-4 shrink-0 text-[#ff0000]" />
          <span>Bu Çalma Listesinden Kaldır</span>
        </button>
      )}

      <div className={`h-[1px] my-1 ${isLight ? "bg-neutral-200" : "bg-white/[0.08]"}`} />

      {/* 6. Go to Artist */}
      {track.artist && (
        <button
          onClick={handleGoArtist}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
            isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>Sanatçıya Git</span>
        </button>
      )}

      {/* 7. Go to Album */}
      {track.album_id && track.album && track.album.toLowerCase() !== "single" && (
        <button
          onClick={handleGoAlbum}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
            isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
          }`}
        >
          <Disc className="w-4 h-4 shrink-0" />
          <span>Albüme Git</span>
        </button>
      )}

      {/* 8. Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Share2 className="w-4 h-4 shrink-0" />
        <span>Şarkı Bağlantısını Kopyala</span>
      </button>
    </div>
  );
};

export default TrackContextMenu;
