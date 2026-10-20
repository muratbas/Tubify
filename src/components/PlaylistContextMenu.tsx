import { useEffect, useRef, useMemo, type FC } from "react";
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

function getClampedPosition(pos: ContextMenuPosition | null) {
  if (!pos) return { x: 0, y: 0 };
  const menuWidth = 220;
  const menuHeight = 280;
  let x = pos.x;
  let y = pos.y;
  if (typeof window !== "undefined") {
    if (x + menuWidth > window.innerWidth - 10) {
      x = Math.max(10, window.innerWidth - menuWidth - 10);
    }
    if (y + menuHeight > window.innerHeight - 10) {
      y = Math.max(10, window.innerHeight - menuHeight - 10);
    }
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  const coords = useMemo(() => getClampedPosition(position), [position]);

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

    window.addEventListener("mousedown", handleClickOutside, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("wheel", handleWheel, { passive: true, capture: true });

    return () => {
      window.removeEventListener("mousedown", handleClickOutside, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("wheel", handleWheel, true);
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
    player.showToast("Çalma listesi bağlantısı panoya kopyalandı");
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      className={`fixed z-[9999] min-w-[210px] rounded-lg shadow-2xl p-1.5 text-xs font-medium select-none animate-in fade-in zoom-in-95 duration-100 ${
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
        <span>Çal</span>
      </button>

      {/* 2. Karışık Çal */}
      <button
        onClick={() => handlePlay(true)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
          isLight ? "hover:bg-neutral-100 text-neutral-800" : "hover:bg-white/10 text-neutral-200"
        }`}
      >
        <Shuffle className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
        <span>Karışık Çal</span>
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
            <span>Düzenle</span>
          </button>

          {/* 4. Kitaplığından Sil */}
          <button
            onClick={handleDelete}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
              isLight ? "hover:bg-rose-50 text-rose-600" : "hover:bg-rose-500/10 text-rose-400"
            }`}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Kitaplığından Sil</span>
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
                <span>Kitaplığında Göster</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
                <span>Kitaplığından Gizle</span>
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
                <span>Sabitlemeyi Kaldır</span>
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 shrink-0 text-[#ff0000]" />
                <span>Başa Sabitle</span>
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
        <span>Bağlantıyı Kopyala</span>
      </button>
    </div>
  );
};

export default PlaylistContextMenu;
