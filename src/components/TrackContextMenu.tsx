import { useState, useEffect, useRef, useMemo, type FC } from "react";
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
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
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
}

function getClampedPosition(pos: ContextMenuPosition | null) {
  if (!pos) return { x: 0, y: 0, submenuSide: "right" as const };
  const menuWidth = 220;
  const menuHeight = 290;
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
  const submenuSide =
    typeof window !== "undefined" && x + menuWidth + 200 > window.innerWidth
      ? ("left" as const)
      : ("right" as const);
  return { x, y, submenuSide };
}

export const TrackContextMenu: FC<TrackContextMenuProps> = ({
  track,
  position,
  onClose,
  onNavigateArtist,
  onNavigateAlbum,
  playlists = [],
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const player = usePlayer();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showSubmenu, setShowSubmenu] = useState(false);

  const coords = useMemo(() => getClampedPosition(position), [position]);
  const submenuSide = coords.submenuSide;

  const isLiked = track ? player.likedTrackIds.has(track.id) : false;

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

    // Close when the page or scroll container scrolls (capture phase)
    const handleScroll = (e: Event) => {
      // If scrolling occurred inside the context menu (e.g. playlist submenu list), do NOT close
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    const handleWheel = (e: WheelEvent) => {
      // If wheel scrolling occurred outside the context menu, close immediately
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture phase so all events anywhere in the window are intercepted
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

  const handleToggleLike = () => {
    player.toggleLike(track, true);
    player.showToast(
      isLiked
        ? `"${track.title}" Beğenilenler'den kaldırıldı`
        : `"${track.title}" Beğenilenler'e eklendi`
    );
    onClose();
  };

  const handleAddToPlaylist = (pl: Playlist | "liked") => {
    if (pl === "liked") {
      player.toggleLike(track, true);
      player.showToast(`"${track.title}" Beğenilenler'e eklendi`);
    } else {
      try {
        const key = `tubify_playlist_tracks_${pl.id}`;
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
        player.showToast(`"${track.title}", "${pl.title}" listesine eklendi`);
      } catch (e) {
        console.error("Failed to add track to playlist storage:", e);
        player.showToast(`"${pl.title}" listesine eklendi`);
      }
    }
    onClose();
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
        className="relative"
        onMouseEnter={() => setShowSubmenu(true)}
        onMouseLeave={() => setShowSubmenu(false)}
      >
        <button
          onClick={() => setShowSubmenu((prev) => !prev)}
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

        {/* Submenu */}
        {showSubmenu && (
          <div
            style={{
              [submenuSide === "right" ? "left" : "right"]: "100%",
              top: "-4px",
            }}
            className={`absolute z-[10000] min-w-[190px] max-h-[260px] overflow-y-auto custom-scrollbar rounded-lg shadow-2xl p-1.5 text-xs select-none ${
              isLight
                ? "bg-white border border-neutral-200 text-neutral-800 shadow-neutral-500/20"
                : "bg-[#282828] border border-white/10 text-white shadow-black/80"
            }`}
          >
            {/* Beğenilenler */}
            <button
              onClick={() => handleAddToPlaylist("liked")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
                isLight ? "hover:bg-neutral-100" : "hover:bg-white/10"
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
                  isLight ? "hover:bg-neutral-100" : "hover:bg-white/10"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] shrink-0" />
                <span className="truncate">{pl.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
