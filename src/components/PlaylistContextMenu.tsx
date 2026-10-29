import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type FC,
} from "react";
import {
  Play,
  Shuffle,
  Pencil,
  Trash2,
  EyeOff,
  Eye,
  Pin,
  PinOff,
  Share2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { usePlayer } from "../context/PlayerContext";
import { useLanguage } from "../context/LanguageContext";
import type { Playlist } from "../types/music";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface PlaylistContextMenuProps {
  playlist: Playlist | "liked" | null;
  position: ContextMenuPosition | null;
  onClose: () => void;
  onPlay: (playlist: Playlist | "liked", shuffle: boolean) => void;
  onEdit?: (playlist: Playlist) => void;
  onDelete?: (playlist: Playlist) => void;
  onToggleHide?: (playlistId: string) => void;
  isHidden?: boolean;
  onTogglePin?: (playlistId: string) => void;
  isPinned?: boolean;
}

const PLAYER_BAR_HEIGHT = 84;
const SAFETY_MARGIN = 8;
const DEFAULT_MENU_WIDTH = 220;
const DEFAULT_MENU_HEIGHT = 280;

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

export const PlaylistContextMenu: FC<PlaylistContextMenuProps> = ({
  playlist,
  position,
  onClose,
  onPlay,
  onEdit,
  onDelete,
  onToggleHide,
  isHidden = false,
  onTogglePin,
  isPinned = false,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const player = usePlayer();
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [coords, setCoords] = useState<{ x: number; y: number }>(() =>
    calculateMenuPosition(position)
  );

  // Akıllı Boyut & Viewport Collision Tespiti (useLayoutEffect ile paint öncesi)
  useLayoutEffect(() => {
    if (!position) return;
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const adjusted = calculateMenuPosition(position, rect.width, rect.height);
      setCoords(adjusted);
    } else {
      setCoords(calculateMenuPosition(position));
    }
  }, [position, playlist]);

  // Click outside, ESC key, and Scroll/Wheel auto-close listeners
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    const handleWheel = (e: WheelEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
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

  if (!playlist || !position) return null;

  const isLiked = playlist === "liked" || (typeof playlist !== "string" && playlist.id === "liked");

  const handlePlay = (shuffle: boolean) => {
    onPlay(playlist, shuffle);
    onClose();
  };

  const handleEdit = () => {
    if (!isLiked && typeof playlist !== "string" && onEdit) {
      onEdit(playlist);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!isLiked && typeof playlist !== "string" && onDelete) {
      onDelete(playlist);
    }
    onClose();
  };

  const handleToggleHide = () => {
    if (!isLiked && typeof playlist !== "string" && onToggleHide) {
      onToggleHide(playlist.id);
    }
    onClose();
  };

  const handleTogglePin = () => {
    if (!isLiked && typeof playlist !== "string" && onTogglePin) {
      onTogglePin(playlist.id);
    }
    onClose();
  };

  const handleCopyLink = () => {
    let url = "https://music.youtube.com/playlist?list=LM";
    if (typeof playlist !== "string" && playlist.id) {
      url = `https://music.youtube.com/playlist?list=${playlist.id}`;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    player.showToast(t.toastLinkCopied);
    onClose();
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
      {/* 1. Çal */}
      <button
        onClick={() => handlePlay(false)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Play className="w-4 h-4 shrink-0 text-[#ff0000] fill-[#ff0000]" />
        <span>{t.play}</span>
      </button>

      {/* 2. Karışık Çal */}
      <button
        onClick={() => handlePlay(true)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Shuffle className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
        <span>{t.shufflePlay}</span>
      </button>

      {/* Beğenilenler Dokunulmazlığı: Düzenle, Sil, Gizle, Sabitle Beğenilenler için gösterilmez */}
      {!isLiked && (
        <>
          <div className={`h-[1px] my-1 ${isLight ? "bg-neutral-200" : "bg-white/[0.08]"}`} />

          {/* 3. Düzenle */}
          <button
            onClick={handleEdit}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
              isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
            }`}
          >
            <Pencil className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
            <span>{t.edit}</span>
          </button>

          {/* 4. Kitaplığından Sil */}
          <button
            onClick={handleDelete}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
              isLight ? "hover:bg-rose-50 text-rose-600" : "hover:bg-rose-500/10 text-rose-400"
            }`}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>{t.deleteFromLibrary}</span>
          </button>

          {/* 5. Kitaplığından Gizle / Göster */}
          <button
            onClick={handleToggleHide}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
              isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
            }`}
          >
            {isHidden ? (
              <>
                <Eye className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{t.showInLibrary}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
                <span>{t.hideFromLibrary}</span>
              </>
            )}
          </button>

          <div className={`h-[1px] my-1 ${isLight ? "bg-neutral-200" : "bg-white/[0.08]"}`} />

          {/* 6. Başa Sabitle / Sabitlemeyi Kaldır */}
          <button
            onClick={handleTogglePin}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
              isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
            }`}
          >
            {isPinned ? (
              <>
                <PinOff className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
                <span>{t.unpinFromTop}</span>
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 shrink-0 text-[#ff0000]" />
                <span>{t.pinToTop}</span>
              </>
            )}
          </button>
        </>
      )}

      <div className={`h-[1px] my-1 ${isLight ? "bg-neutral-200" : "bg-white/[0.08]"}`} />

      {/* 7. Bağlantıyı Kopyala */}
      <button
        onClick={handleCopyLink}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Share2 className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
        <span>{t.copyLink}</span>
      </button>
    </div>
  );
};

export default PlaylistContextMenu;
