import { useState, useEffect, useRef, useMemo, type FC, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  Home,
  Search,
  Library,
  Plus,
  Pin,
  Music2,
  FolderPlus,
  LayoutGrid,
  List,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  Folder,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "../context/ThemeContext";
import { usePlayer } from "../context/PlayerContext";
import { useLanguage, type Translations } from "../context/LanguageContext";
import type { Playlist, UserProfile } from "../types/music";
import { PlaylistContextMenu, type ContextMenuPosition } from "./PlaylistContextMenu";
import { EditPlaylistModal } from "./EditPlaylistModal";
import { CreatePlaylistModal, type PrivacyStatus } from "./CreatePlaylistModal";

interface SidebarProps {
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist | "liked" | "episodes") => void;
  onPlayPlaylist?: (playlist: Playlist | "liked", shuffle?: boolean) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onEditPlaylist?: (
    playlistId: string,
    title: string,
    description?: string,
    privacyStatus?: PrivacyStatus,
    customThumbnail?: string | null
  ) => Promise<void> | void;
  onOpenEditModal?: (playlist: Playlist) => void;
  onCreatePlaylist?: (
    title: string,
    description?: string,
    privacyStatus?: PrivacyStatus
  ) => Promise<void>;
  likedSongsCount: number | string;
  playlists: Playlist[];
  userProfile: UserProfile;
  onOpenLogin: () => void;
  currentView?: "home" | "playlist" | "search" | "settings";
  onNavigateHome?: () => void;
  onNavigateSearch?: () => void;
}

type SortOption = "recent" | "alphabetical" | "custom";

function getSortLabel(opt: SortOption, t: Translations): string {
  switch (opt) {
    case "recent":
      return t.sortRecent;
    case "alphabetical":
      return t.sortAlphabetical;
    case "custom":
      return t.sortCustom;
  }
}

/**
 * Filter out duplicate Liked Songs playlist ("Beğendiğim müzikler" / "LM" / "VLLM")
 */
export function isLikedSongsPlaylist(pl: { id?: string; title?: string } | null | undefined): boolean {
  if (!pl) return false;
  const id = pl.id?.toLowerCase().trim() || "";
  const title = pl.title?.toLowerCase().trim() || "";
  if (id === "lm" || id === "vllm" || id === "femusic_liked" || id === "liked") return true;
  if (
    title === "beğendiğim müzikler" ||
    title === "beğenilenler" ||
    title === "liked music" ||
    title === "liked songs"
  ) {
    return true;
  }
  return false;
}

function cleanSidebarTrackCount(raw: string, t: Translations): string {
  const cleaned = raw
    .replace(/parça(lar)?/gi, "")
    .replace(/şarkı(lar)?/gi, "")
    .replace(/videos?/gi, "")
    .replace(/tracks?/gi, "")
    .replace(/songs?/gi, "")
    .trim();
  return cleaned ? `${cleaned} ${cleaned === "1" ? t.songCountSingle : t.songCountMultiple}` : raw;
}

/**
 * Clean subtitle helper ensuring "Google Hesabı" or "Google Account" NEVER appears
 */
function getPlaylistSubtitle(pl: Playlist, userProfileName: string | null | undefined, t: Translations): string {
  if (pl.track_count && pl.track_count.trim()) {
    const countText = cleanSidebarTrackCount(pl.track_count.trim(), t);
    return `${t.playlistLabel} • ${countText}`;
  }

  // Check if we have local stored track count
  try {
    const local = localStorage.getItem(`tubify_playlist_tracks_${pl.id}`);
    if (local) {
      const arr = JSON.parse(local);
      if (Array.isArray(arr) && arr.length > 0) {
        return `${t.playlistLabel} • ${arr.length} ${arr.length === 1 ? t.songCountSingle : t.songCountMultiple}`;
      }
    }
  } catch {}

  const author = userProfileName?.trim();
  const isGoogle =
    author &&
    (author.toLowerCase().includes("google") ||
      author.toLowerCase().includes("hesab"));

  if (author && !isGoogle) {
    return `${t.playlistLabel} • ${author}`;
  }

  return t.playlistLabel;
}

/**
 * Clean subtitle for 2-column Grid cards: e.g. "1177 şarkı" or "murat"
 */
function getGridSubtitle(pl: Playlist, userProfileName: string | null | undefined, t: Translations): string {
  if (pl.track_count && pl.track_count.trim()) {
    return cleanSidebarTrackCount(pl.track_count.trim(), t);
  }

  try {
    const local = localStorage.getItem(`tubify_playlist_tracks_${pl.id}`);
    if (local) {
      const arr = JSON.parse(local);
      if (Array.isArray(arr) && arr.length > 0) {
        return `${arr.length} ${arr.length === 1 ? t.songCountSingle : t.songCountMultiple}`;
      }
    }
  } catch {}

  const author = userProfileName?.trim();
  const isGoogle =
    author &&
    (author.toLowerCase().includes("google") ||
      author.toLowerCase().includes("hesab"));

  if (author && !isGoogle) {
    return author;
  }

  return t.playlistLabel;
}

/**
 * Record playlist playback timestamp so it moves to top of 'Son çalınanlar'
 * ONLY called when music actually starts playing from this playlist.
 */
export function recordPlaylistPlayed(id: string) {
  if (!id || id === "liked" || id === "LM") return;
  try {
    const saved = localStorage.getItem("tubify_playlist_interactions");
    const map = saved ? JSON.parse(saved) : {};
    map[id] = Date.now();
    localStorage.setItem("tubify_playlist_interactions", JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent("tubify-playlist-played", { detail: { id, timestamp: map[id] } })
    );
  } catch {}
}

export const Sidebar: FC<SidebarProps> = ({
  selectedPlaylistId,
  onSelectPlaylist,
  onPlayPlaylist,
  onDeletePlaylist,
  onEditPlaylist,
  onOpenEditModal,
  onCreatePlaylist,
  likedSongsCount,
  playlists,
  userProfile,
  onOpenLogin,
  currentView = "home",
  onNavigateHome,
  onNavigateSearch,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const player = usePlayer();
  const { t } = useLanguage();

  const [filterText, setFilterText] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // View mode: 'list' (default row view) vs 'grid' (2-column card view)
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("tubify_sidebar_view_mode");
      if (saved === "list" || saved === "grid") return saved;
    } catch {}
    return "list";
  });

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === "list" ? "grid" : "list";
      try {
        localStorage.setItem("tubify_sidebar_view_mode", next);
      } catch {}
      return next;
    });
  };

  // Mini-sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tubify_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tubify_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const likedSongsCountText =
    typeof likedSongsCount === "number"
      ? `${likedSongsCount.toLocaleString()} ${likedSongsCount === 1 ? t.songCountSingle : t.songCountMultiple}`
      : cleanSidebarTrackCount(String(likedSongsCount), t);

  // Sorting state & persistent storage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem("tubify_sidebar_sort");
      if (saved === "recent" || saved === "alphabetical" || saved === "custom") {
        return saved;
      }
    } catch {}
    return "recent";
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  // Track playlist interaction timestamps for "Son çalınanlar"
  const [interactionTimestamps, setInteractionTimestamps] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("tubify_playlist_interactions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Exportable global helper to record playlist playback
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ id: string; timestamp: number }>;
      if (custom.detail?.id) {
        setInteractionTimestamps((prev) => ({
          ...prev,
          [custom.detail.id]: custom.detail.timestamp,
        }));
      }
    };
    window.addEventListener("tubify-playlist-played", handler);
    return () => window.removeEventListener("tubify-playlist-played", handler);
  }, []);

  // Pinned playlists state & persistent storage
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("tubify_pinned_playlist_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const togglePin = (playlistId: string) => {
    setPinnedPlaylistIds((prev) => {
      const next = new Set(prev);
      const isPinned = next.has(playlistId);
      if (isPinned) {
        next.delete(playlistId);
        player.showToast(t.toastUnpinned);
      } else {
        next.add(playlistId);
        player.showToast(t.toastPinned);
      }
      try {
        localStorage.setItem("tubify_pinned_playlist_ids", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Hidden playlists state & persistent storage
  const [hiddenPlaylistIds, setHiddenPlaylistIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("tubify_hidden_playlist_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [isHiddenFolderOpen, setIsHiddenFolderOpen] = useState(false);

  const toggleHide = (playlistId: string) => {
    setHiddenPlaylistIds((prev) => {
      const next = new Set(prev);
      const isHidden = next.has(playlistId);
      if (isHidden) {
        next.delete(playlistId);
        player.showToast(t.toastUnhidden);
      } else {
        next.add(playlistId);
        player.showToast(t.toastHidden);
      }
      try {
        localStorage.setItem("tubify_hidden_playlist_ids", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    playlist: Playlist | "liked";
    position: ContextMenuPosition;
    isHidden?: boolean;
    isPinned?: boolean;
  } | null>(null);

  // Edit Modal State
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!isSortDropdownOpen) return;
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSortDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortDropdownOpen]);

  // Custom playlist order state & persistent storage
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tubify_custom_playlist_order");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const customOrderRef = useRef<string[]>(customOrder);

  useEffect(() => {
    customOrderRef.current = customOrder;
  }, [customOrder]);

  // Drag and Drop state for playlist reordering (Pure Pointer Events)
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

  const dragPointerRef = useRef<{
    playlistId: string;
    startX: number;
    startY: number;
    isDragActive: boolean;
  } | null>(null);
  const ignoreClickRef = useRef(false);

  const customOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    customOrder.forEach((id, idx) => {
      map.set(id, idx);
    });
    return map;
  }, [customOrder]);

  const handleSelectSort = (opt: SortOption) => {
    if (opt === "custom") {
      const allCurrent = [
        ...sortedPinnedPlaylists.map((p) => p.id),
        ...sortedUnpinnedPlaylists.map((p) => p.id),
      ];
      let base = customOrderRef.current.filter((id) => allCurrent.includes(id));
      for (const id of allCurrent) {
        if (!base.includes(id)) {
          base.push(id);
        }
      }
      customOrderRef.current = base;
      setCustomOrder(base);
      try {
        localStorage.setItem("tubify_custom_playlist_order", JSON.stringify(base));
      } catch {}
    }
    setSortOption(opt);
    setIsSortDropdownOpen(false);
    try {
      localStorage.setItem("tubify_sidebar_sort", opt);
    } catch {}
  };

  // Filter out Liked Songs duplicates & apply search query
  const eligiblePlaylists = useMemo(() => {
    return playlists.filter((pl) => {
      if (isLikedSongsPlaylist(pl)) return false;
      if (!filterText) return true;
      return pl.title.toLowerCase().includes(filterText.toLowerCase());
    });
  }, [playlists, filterText]);

  // Separate hidden vs visible playlists
  const { visiblePlaylists, hiddenPlaylists } = useMemo(() => {
    const visible: Playlist[] = [];
    const hidden: Playlist[] = [];
    for (const pl of eligiblePlaylists) {
      if (hiddenPlaylistIds.has(pl.id)) {
        hidden.push(pl);
      } else {
        visible.push(pl);
      }
    }
    return { visiblePlaylists: visible, hiddenPlaylists: hidden };
  }, [eligiblePlaylists, hiddenPlaylistIds]);

  // Sort helper function
  const sortList = (list: Playlist[]) => {
    return [...list].sort((a, b) => {
      if (sortOption === "recent") {
        const timeA = interactionTimestamps[a.id] || 0;
        const timeB = interactionTimestamps[b.id] || 0;
        if (timeB !== timeA) return timeB - timeA;
        return 0;
      }
      if (sortOption === "alphabetical") {
        return a.title.localeCompare(b.title, "tr-TR", { sensitivity: "base" });
      }
      if (sortOption === "custom") {
        const hasA = customOrderMap.has(a.id);
        const hasB = customOrderMap.has(b.id);
        if (hasA && hasB) {
          return customOrderMap.get(a.id)! - customOrderMap.get(b.id)!;
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return 0;
      }
      return 0;
    });
  };

  // Pinned vs Unpinned visible playlists
  const sortedPinnedPlaylists = useMemo(() => {
    return sortList(visiblePlaylists.filter((pl) => pinnedPlaylistIds.has(pl.id)));
  }, [visiblePlaylists, pinnedPlaylistIds, sortOption, interactionTimestamps, customOrderMap]);

  const sortedUnpinnedPlaylists = useMemo(() => {
    return sortList(visiblePlaylists.filter((pl) => !pinnedPlaylistIds.has(pl.id)));
  }, [visiblePlaylists, pinnedPlaylistIds, sortOption, interactionTimestamps, customOrderMap]);

  const sortedPinnedPlaylistsRef = useRef(sortedPinnedPlaylists);
  sortedPinnedPlaylistsRef.current = sortedPinnedPlaylists;

  const sortedUnpinnedPlaylistsRef = useRef(sortedUnpinnedPlaylists);
  sortedUnpinnedPlaylistsRef.current = sortedUnpinnedPlaylists;

  // Pointer-based Drag & Drop handlers (100% reliable in Tauri/WebView2)
  const handlePlaylistPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    pl: Playlist | "liked"
  ) => {
    if (e.button !== 0) return; // Only left mouse button
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) {
      return;
    }

    const playlistId = typeof pl === "string" ? pl : pl.id;
    if (playlistId === "liked") return; // Liked songs stays anchored at top

    dragPointerRef.current = {
      playlistId,
      startX: e.clientX,
      startY: e.clientY,
      isDragActive: false,
    };
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const state = dragPointerRef.current;
      if (!state) return;

      const dx = Math.abs(e.clientX - state.startX);
      const dy = Math.abs(e.clientY - state.startY);

      if (!state.isDragActive) {
        if (dx >= 4 || dy >= 4) {
          state.isDragActive = true;
          ignoreClickRef.current = true;
          setDraggedPlaylistId(state.playlistId);
          document.body.style.cursor = "grabbing";

          // Current displayed order
          const currentDisplayed = [
            ...sortedPinnedPlaylistsRef.current.map((p) => p.id),
            ...sortedUnpinnedPlaylistsRef.current.map((p) => p.id),
          ];

          // Switch to custom sort if not already in custom sort, WITHOUT toast notification!
          if (sortOption !== "custom") {
            customOrderRef.current = currentDisplayed;
            setCustomOrder(currentDisplayed);
            try {
              localStorage.setItem("tubify_custom_playlist_order", JSON.stringify(currentDisplayed));
            } catch {}

            setSortOption("custom");
            try {
              localStorage.setItem("tubify_sidebar_sort", "custom");
            } catch {}
          } else {
            let existing = customOrderRef.current.filter((id) => currentDisplayed.includes(id));
            for (const id of currentDisplayed) {
              if (!existing.includes(id)) {
                existing.push(id);
              }
            }
            customOrderRef.current = existing;
            setCustomOrder(existing);
            try {
              localStorage.setItem("tubify_custom_playlist_order", JSON.stringify(existing));
            } catch {}
          }
        } else {
          return;
        }
      }

      // Drag is active: find hovered playlist card
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const playlistCard = el?.closest("[data-playlist-id]");
      if (!playlistCard) {
        setDropTargetId(null);
        setDropPosition(null);
        return;
      }

      const targetId = playlistCard.getAttribute("data-playlist-id");
      if (!targetId || targetId === state.playlistId) {
        setDropTargetId(null);
        setDropPosition(null);
        return;
      }

      if (targetId === "liked") {
        setDropTargetId("liked");
        setDropPosition("after");
        return;
      }

      const rect = playlistCard.getBoundingClientRect();
      const isTopHalf = (e.clientY - rect.top) < rect.height / 2;
      const pos: "before" | "after" = isTopHalf ? "before" : "after";

      setDropTargetId(targetId);
      setDropPosition(pos);
    };

    const onPointerUp = (e: PointerEvent) => {
      const state = dragPointerRef.current;
      if (!state) return;

      document.body.style.cursor = "";
      dragPointerRef.current = null;

      if (!state.isDragActive) {
        setDraggedPlaylistId(null);
        setDropTargetId(null);
        setDropPosition(null);
        return;
      }

      const sourceId = state.playlistId;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const playlistCard = el?.closest("[data-playlist-id]");
      let finalTargetId = playlistCard?.getAttribute("data-playlist-id") || null;
      let pos: "before" | "after" = "after";

      if (playlistCard && finalTargetId !== "liked") {
        const rect = playlistCard.getBoundingClientRect();
        pos = (e.clientY - rect.top) < rect.height / 2 ? "before" : "after";
      }

      setDraggedPlaylistId(null);
      setDropTargetId(null);
      setDropPosition(null);

      setTimeout(() => {
        ignoreClickRef.current = false;
      }, 150);

      const allCurrentIds = [
        ...sortedPinnedPlaylistsRef.current.map((p) => p.id),
        ...sortedUnpinnedPlaylistsRef.current.map((p) => p.id),
      ];

      let baseOrder = (customOrderRef.current.length > 0 ? customOrderRef.current : allCurrentIds).filter((id) => allCurrentIds.includes(id));
      for (const id of allCurrentIds) {
        if (!baseOrder.includes(id)) {
          baseOrder.push(id);
        }
      }

      if (!finalTargetId) {
        finalTargetId = baseOrder[baseOrder.length - 1];
      }

      if (!finalTargetId || sourceId === finalTargetId) {
        return;
      }

      baseOrder = baseOrder.filter((id) => id !== sourceId);

      if (finalTargetId === "liked") {
        baseOrder.unshift(sourceId);
      } else {
        const targetIndex = baseOrder.indexOf(finalTargetId);
        if (targetIndex !== -1) {
          const insertIndex = pos === "after" ? targetIndex + 1 : targetIndex;
          baseOrder.splice(insertIndex, 0, sourceId);
        } else {
          baseOrder.push(sourceId);
        }
      }

      // Sync pinned status
      if (finalTargetId === "liked") {
        if (pinnedPlaylistIds.size > 0 && !pinnedPlaylistIds.has(sourceId)) {
          setPinnedPlaylistIds((prev) => {
            const next = new Set(prev);
            next.add(sourceId);
            try {
              localStorage.setItem("tubify_pinned_playlist_ids", JSON.stringify(Array.from(next)));
            } catch {}
            return next;
          });
        }
      } else if (pinnedPlaylistIds.has(finalTargetId) && !pinnedPlaylistIds.has(sourceId)) {
        setPinnedPlaylistIds((prev) => {
          const next = new Set(prev);
          next.add(sourceId);
          try {
            localStorage.setItem("tubify_pinned_playlist_ids", JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        });
      } else if (!pinnedPlaylistIds.has(finalTargetId) && pinnedPlaylistIds.has(sourceId)) {
        setPinnedPlaylistIds((prev) => {
          const next = new Set(prev);
          next.delete(sourceId);
          try {
            localStorage.setItem("tubify_pinned_playlist_ids", JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        });
      }

      customOrderRef.current = baseOrder;
      setCustomOrder(baseOrder);
      try {
        localStorage.setItem("tubify_custom_playlist_order", JSON.stringify(baseOrder));
      } catch {}
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [sortOption, pinnedPlaylistIds]);

  const isHomeActive = currentView === "home" && !selectedPlaylistId;
  const isSearchActive = currentView === "search";

  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest(".no-drag")
      ) {
        return;
      }
      try {
        getCurrentWindow().startDragging();
      } catch (err) {
        console.debug("Drag error:", err);
      }
    }
  };

  const handlePlaylistClick = (pl: Playlist | "liked") => {
    if (ignoreClickRef.current) return;
    // Only navigate to the playlist; do NOT update 'Son çalınanlar' on simple click/view
    onSelectPlaylist(pl);
  };

  const handlePlaylistContextMenu = (
    e: MouseEvent,
    pl: Playlist | "liked",
    isHidden: boolean = false
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const isPinned = typeof pl !== "string" ? pinnedPlaylistIds.has(pl.id) : false;
    setContextMenu({
      playlist: pl,
      position: { x: e.clientX, y: e.clientY },
      isHidden,
      isPinned,
    });
  };

  const handlePlayContextMenuAction = (pl: Playlist | "liked", shuffle: boolean) => {
    if (typeof pl !== "string") {
      recordPlaylistPlayed(pl.id);
    }
    if (onPlayPlaylist) {
      onPlayPlaylist(pl, shuffle);
    } else {
      onSelectPlaylist(pl);
    }
  };

  const handleSaveEditedPlaylist = async (
    playlistId: string,
    title: string,
    description?: string,
    privacyStatus?: PrivacyStatus,
    customThumbnail?: string | null
  ) => {
    if (onEditPlaylist) {
      await onEditPlaylist(playlistId, title, description, privacyStatus, customThumbnail);
    }
  };

  const handleDeleteContextMenuAction = (pl: Playlist) => {
    if (onDeletePlaylist) {
      onDeletePlaylist(pl.id);
    }
    setCustomOrder((prev) => {
      const next = prev.filter((id) => id !== pl.id);
      try {
        localStorage.setItem("tubify_custom_playlist_order", JSON.stringify(next));
      } catch {}
      return next;
    });
    player.showToast(`"${pl.title}" kitaplıktan silindi`);
  };

  return (
    <aside
      className={`${
        isCollapsed ? "w-[72px]" : "w-[260px]"
      } flex flex-col select-none shrink-0 h-full border-r transition-all duration-200 ease-in-out ${
        isLight
          ? "bg-white border-[#f0f0f0] text-neutral-800"
          : "bg-[#121212] border-white/10 text-white"
      }`}
    >
      {/* 1. Top Section: Ana Sayfa & Ara */}
      {isCollapsed ? (
        <div
          data-tauri-drag-region
          onMouseDown={handleMouseDown}
          className="px-2 pt-3.5 space-y-2 shrink-0 flex flex-col items-center"
        >
          <button
            onClick={onNavigateHome}
            data-tooltip="Ana Sayfa"
            data-tooltip-side="right"
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isHomeActive
                ? "text-[#ff0000] bg-red-50/60 dark:bg-white/10"
                : isLight
                ? "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            onClick={onNavigateSearch}
            data-tooltip="Ara"
            data-tooltip-side="right"
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isSearchActive
                ? "text-[#ff0000] bg-red-50/60 dark:bg-white/10"
                : isLight
                ? "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          data-tauri-drag-region
          onMouseDown={handleMouseDown}
          className="px-5 pt-3.5 space-y-3.5 shrink-0"
        >
          <button
            onClick={onNavigateHome}
            className={`w-full flex items-center gap-4 text-sm font-semibold transition-colors cursor-pointer text-left ${
              isHomeActive
                ? "text-[#ff0000]"
                : isLight
                ? "text-neutral-700 hover:text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Home className={`w-5 h-5 ${isHomeActive ? "text-[#ff0000]" : ""}`} />
            <span>{t.home}</span>
          </button>

          <button
            onClick={onNavigateSearch}
            className={`w-full flex items-center gap-4 text-sm font-semibold transition-colors cursor-pointer text-left ${
              isSearchActive
                ? "text-[#ff0000]"
                : isLight
                ? "text-neutral-700 hover:text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Search className={`w-5 h-5 ${isSearchActive ? "text-[#ff0000]" : ""}`} />
            <span>{t.search}</span>
          </button>
        </div>
      )}

      {/* Thin Horizontal Divider */}
      <div
        className={`my-3 ${isCollapsed ? "mx-2" : "mx-4"} border-b ${
          isLight ? "border-neutral-200" : "border-white/10"
        }`}
      />

      {/* 2. Library Section: Kitaplık Header + Sıralama Seçicisi + Çalma Listeleri */}
      {isCollapsed ? (
        <div className="flex-1 flex flex-col px-2 overflow-hidden min-h-0 items-center">
          {/* Collapsed Library Header: Single centered expand button */}
          <div className="flex items-center justify-center py-1 shrink-0">
            <button
              onClick={toggleCollapse}
              data-tooltip={t.expandLibrary}
              data-tooltip-side="right"
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isLight
                  ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>

          {/* Collapsed Vertical Single Column Covers */}
          <div className="flex-1 overflow-y-auto px-1 py-1.5 space-y-2.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center w-full">
            {/* Beğenilenler */}
            <div
              data-playlist-id="liked"
              onClick={() => handlePlaylistClick("liked")}
              onContextMenu={(e) => handlePlaylistContextMenu(e, "liked", false)}
              data-tooltip={`${t.likedSongs} • ${likedSongsCountText}`}
              data-tooltip-side="right"
              className={`w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff0033] via-[#cc0029] to-[#700010] flex items-center justify-center shrink-0 shadow-sm cursor-pointer select-none transition-all active:scale-95 hover:brightness-110 relative ${
                selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                  ? "ring-2 ring-[#ff0000] ring-offset-2 ring-offset-white dark:ring-offset-[#121212]"
                  : ""
              }`}
            >
              {dropTargetId === "liked" && (
                <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
              )}
              <svg
                className="w-5 h-5 text-white fill-white pointer-events-none"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm p-0.5 rounded-full text-white pointer-events-none">
                <Pin className="w-2 h-2 fill-white text-white rotate-45" />
              </div>
            </div>

            {/* Pinned Playlists */}
            {sortedPinnedPlaylists.map((pl) => {
              const isSelected = selectedPlaylistId === pl.id;
              const subtitle = getPlaylistSubtitle(pl, userProfile.name, t);
              const isDragging = draggedPlaylistId === pl.id;

              return (
                <div
                  key={`mini-${pl.id}`}
                  data-playlist-id={pl.id}
                  onPointerDown={(e) => handlePlaylistPointerDown(e, pl)}
                  onClick={() => handlePlaylistClick(pl)}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, pl, false)}
                  data-tooltip={`${pl.title} • ${subtitle}`}
                  data-tooltip-side="right"
                  className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm cursor-pointer select-none transition-all active:scale-95 hover:brightness-110 relative ${
                    isDragging ? "opacity-30 scale-95 ring-2 ring-[#ff0000]" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-[#ff0000] ring-offset-2 ring-offset-white dark:ring-offset-[#121212]"
                      : ""
                  }`}
                >
                  {dropTargetId === pl.id && dropPosition === "before" && (
                    <div className="absolute -top-1.5 left-0 right-0 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                  )}
                  {dropTargetId === pl.id && dropPosition === "after" && (
                    <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                  )}
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt={pl.title}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isLight ? "bg-neutral-100" : "bg-[#282828]"
                      }`}
                    >
                      <Music2 className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm p-0.5 rounded-full text-white pointer-events-none">
                    <Pin className="w-2 h-2 fill-white text-white rotate-45" />
                  </div>
                </div>
              );
            })}

            {/* Unpinned Playlists */}
            {sortedUnpinnedPlaylists.map((pl) => {
              const isSelected = selectedPlaylistId === pl.id;
              const subtitle = getPlaylistSubtitle(pl, userProfile.name, t);
              const isDragging = draggedPlaylistId === pl.id;

              return (
                <div
                  key={`mini-${pl.id}`}
                  data-playlist-id={pl.id}
                  onPointerDown={(e) => handlePlaylistPointerDown(e, pl)}
                  onClick={() => handlePlaylistClick(pl)}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, pl, false)}
                  data-tooltip={`${pl.title} • ${subtitle}`}
                  data-tooltip-side="right"
                  className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm cursor-pointer select-none transition-all active:scale-95 hover:brightness-110 relative ${
                    isDragging ? "opacity-30 scale-95 ring-2 ring-[#ff0000]" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-[#ff0000] ring-offset-2 ring-offset-white dark:ring-offset-[#121212]"
                      : ""
                  }`}
                >
                  {dropTargetId === pl.id && dropPosition === "before" && (
                    <div className="absolute -top-1.5 left-0 right-0 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                  )}
                  {dropTargetId === pl.id && dropPosition === "after" && (
                    <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                  )}
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt={pl.title}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isLight ? "bg-neutral-100" : "bg-[#282828]"
                      }`}
                    >
                      <Music2 className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-3 overflow-hidden min-h-0">
          {/* Kitaplık Header */}
          <div
            className={`flex items-center justify-between px-2 py-1 ${
              isLight ? "text-neutral-700" : "text-neutral-300"
            }`}
          >
            <button
              onClick={onNavigateHome}
              className={`flex items-center gap-2.5 font-bold text-sm transition-colors cursor-pointer ${
                isLight ? "hover:text-neutral-900" : "hover:text-white"
              }`}
            >
              <Library className="w-5 h-5" />
              <span>{t.library}</span>
            </button>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setIsSearchOpen((prev) => !prev)}
                data-tooltip={t.searchInLibrary}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (!userProfile.is_authenticated) {
                    onOpenLogin();
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                data-tooltip={t.createPlaylist}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={toggleViewMode}
                data-tooltip={viewMode === "list" ? t.viewGrid : t.viewList}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                }`}
              >
                {viewMode === "list" ? (
                  <LayoutGrid className="w-4 h-4" />
                ) : (
                  <List className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={toggleCollapse}
                data-tooltip={t.collapseLibrary}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
                }`}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3 Seçenekli Sıralama (Sorting) Açılır Menüsü veya Kitaplık Arama Çubuğu */}
          <div className="px-2 py-2 shrink-0 relative">
            {isSearchOpen ? (
              <div className="w-full relative">
                <input
                  type="text"
                  autoFocus
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder={t.searchInLibraryPlaceholder}
                  className={`w-full h-7 pl-2 pr-6 rounded-md text-xs outline-none transition-colors ${
                    isLight
                      ? "bg-neutral-100 border border-neutral-300/80 text-neutral-900 focus:bg-white"
                      : "bg-[#242424] text-white focus:bg-[#2e2e2e]"
                  }`}
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="relative inline-block" ref={sortDropdownRef}>
                <button
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isSortDropdownOpen
                      ? isLight
                        ? "bg-neutral-200 text-black"
                        : "bg-white/20 text-white"
                      : isLight
                      ? "bg-neutral-100/90 text-neutral-700 hover:bg-neutral-200"
                      : "bg-white/10 text-white/80 hover:bg-white/15"
                  }`}
                  title={t.sortBy}
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      isSortDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                  <span>{getSortLabel(sortOption, t)}</span>
                </button>

                {/* Sorting Dropdown Menu */}
                {isSortDropdownOpen && (
                  <div
                    className={`absolute top-full left-0 mt-1.5 z-40 min-w-[170px] rounded-xl shadow-2xl p-1.5 text-xs font-medium select-none animate-in fade-in zoom-in-95 duration-100 ${
                      isLight
                        ? "bg-white border border-neutral-200/90 text-neutral-800 shadow-neutral-400/20"
                        : "bg-[#282828] border border-white/10 text-white shadow-black/80"
                    }`}
                  >
                    {(["recent", "alphabetical", "custom"] as SortOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSelectSort(opt)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                          sortOption === opt
                            ? isLight
                              ? "text-black font-semibold bg-neutral-100/70"
                              : "text-white font-semibold bg-white/10"
                            : isLight
                            ? "hover:bg-neutral-100 text-neutral-700"
                            : "hover:bg-white/10 text-neutral-300"
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          {sortOption === opt && (
                            <Check className="w-3.5 h-3.5 stroke-[2.5] text-neutral-900 dark:text-white" />
                          )}
                        </div>
                        <span>{getSortLabel(opt, t)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Playlist Container: List View OR 2-Column Grid View */}
          <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
            {viewMode === "list" ? (
              /* LIST VIEW (Rows) */
              <div className="space-y-0.5">
                {/* Pinned 1: Beğenilenler */}
                <div
                  data-playlist-id="liked"
                  onClick={() => handlePlaylistClick("liked")}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, "liked", false)}
                  className={`relative flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group select-none ${
                    selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                      ? isLight
                        ? "bg-neutral-100/90 text-neutral-900"
                        : "bg-white/15 text-white"
                      : isLight
                      ? "hover:bg-neutral-100/60 text-neutral-600"
                      : "hover:bg-white/5 text-neutral-400"
                  }`}
                >
                  {dropTargetId === "liked" && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-md bg-gradient-to-br from-[#ff0033] via-[#cc0029] to-[#700010] flex items-center justify-center shrink-0 shadow-sm pointer-events-none">
                      <svg
                        className="w-5 h-5 text-white fill-white pointer-events-none"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                          selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                            ? "text-[#ff0000]"
                            : isLight
                            ? "text-neutral-900"
                            : "text-white"
                        }`}
                      >
                        {t.likedSongs}
                      </h4>
                      <p
                        className={`text-xs truncate leading-normal py-0.5 ${
                          isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}
                      >
                        {t.playlistLabel} • {likedSongsCountText}
                      </p>
                    </div>
                  </div>

                  <Pin className="w-3.5 h-3.5 text-[#ff0000] fill-[#ff0000] rotate-45 shrink-0 pointer-events-none" />
                </div>

                {/* Pinned User Playlists */}
                {sortedPinnedPlaylists.map((pl) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const subtitle = getPlaylistSubtitle(pl, userProfile.name, t);
                  const isDragging = draggedPlaylistId === pl.id;

                  return (
                    <div
                      key={`pinned-${pl.id}`}
                      data-playlist-id={pl.id}
                      onPointerDown={(e) => handlePlaylistPointerDown(e, pl)}
                      onClick={() => handlePlaylistClick(pl)}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl, false)}
                      className={`relative flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group select-none ${
                        isDragging ? "opacity-30 scale-[0.98] bg-neutral-200/50 dark:bg-white/10" : ""
                      } ${
                        isSelected
                          ? isLight
                            ? "bg-neutral-100/90 text-neutral-900"
                            : "bg-white/15 text-white"
                          : isLight
                          ? "hover:bg-neutral-100/60 text-neutral-600"
                          : "hover:bg-white/5 text-neutral-400"
                      }`}
                    >
                      {dropTargetId === pl.id && dropPosition === "before" && (
                        <div className="absolute top-0 left-2 right-2 h-0.5 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}
                      {dropTargetId === pl.id && dropPosition === "after" && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}

                      <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            draggable={false}
                            className="w-11 h-11 rounded-md object-cover shrink-0 bg-neutral-200 pointer-events-none"
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                              isLight ? "bg-neutral-100" : "bg-[#282828]"
                            }`}
                          >
                            <Music2 className="w-5 h-5 text-neutral-400" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4
                            className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                              isSelected
                                ? "text-[#ff0000]"
                                : isLight
                                ? "text-neutral-900"
                                : "text-white"
                            }`}
                          >
                            {pl.title}
                          </h4>
                          <p
                            className={`text-xs truncate leading-normal py-0.5 ${
                              isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}
                          >
                            {subtitle}
                          </p>
                        </div>
                      </div>

                      <Pin className="w-3.5 h-3.5 text-[#ff0000] fill-[#ff0000] rotate-45 shrink-0 pointer-events-none" />
                    </div>
                  );
                })}

                {/* Unpinned User Playlists */}
                {sortedUnpinnedPlaylists.map((pl) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const subtitle = getPlaylistSubtitle(pl, userProfile.name, t);
                  const isDragging = draggedPlaylistId === pl.id;

                  return (
                    <div
                      key={pl.id}
                      data-playlist-id={pl.id}
                      onPointerDown={(e) => handlePlaylistPointerDown(e, pl)}
                      onClick={() => handlePlaylistClick(pl)}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl, false)}
                      className={`relative flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group select-none ${
                        isDragging ? "opacity-30 scale-[0.98] bg-neutral-200/50 dark:bg-white/10" : ""
                      } ${
                        isSelected
                          ? isLight
                            ? "bg-neutral-100/90 text-neutral-900"
                            : "bg-white/15 text-white"
                          : isLight
                          ? "hover:bg-neutral-100/60 text-neutral-600"
                          : "hover:bg-white/5 text-neutral-400"
                      }`}
                    >
                      {dropTargetId === pl.id && dropPosition === "before" && (
                        <div className="absolute top-0 left-2 right-2 h-0.5 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}
                      {dropTargetId === pl.id && dropPosition === "after" && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}

                      <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            draggable={false}
                            className="w-11 h-11 rounded-md object-cover shrink-0 bg-neutral-200 pointer-events-none"
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                              isLight ? "bg-neutral-100" : "bg-[#282828]"
                            }`}
                          >
                            <Music2 className="w-5 h-5 text-neutral-400" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4
                            className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                              isSelected
                                ? "text-[#ff0000]"
                                : isLight
                                ? "text-neutral-900"
                                : "text-white"
                            }`}
                          >
                            {pl.title}
                          </h4>
                          <p
                            className={`text-xs truncate leading-normal py-0.5 ${
                              isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}
                          >
                            {subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Gizlenenler Klasörü (List View) */}
                {hiddenPlaylists.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-neutral-200/60 dark:border-white/10">
                    <button
                      onClick={() => setIsHiddenFolderOpen((prev) => !prev)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                        isLight
                          ? "hover:bg-neutral-100/80 text-neutral-600 hover:text-neutral-900"
                          : "hover:bg-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="text-xs font-semibold truncate">
                          {t.hiddenPlaylists} ({hiddenPlaylists.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isHiddenFolderOpen ? "rotate-180 text-neutral-800 dark:text-white" : "text-neutral-400"
                        }`}
                      />
                    </button>

                    {isHiddenFolderOpen && (
                      <div className="space-y-0.5 mt-1 pl-1">
                        {hiddenPlaylists.map((pl) => {
                          const isSelected = selectedPlaylistId === pl.id;
                          const subtitle = getPlaylistSubtitle(pl, userProfile.name, t);

                          return (
                            <div
                              key={`hidden-${pl.id}`}
                              onClick={() => handlePlaylistClick(pl)}
                              onContextMenu={(e) => handlePlaylistContextMenu(e, pl, true)}
                              className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer opacity-85 hover:opacity-100 ${
                                isSelected
                                  ? isLight
                                    ? "bg-neutral-100/90 text-neutral-900"
                                    : "bg-white/15 text-white"
                                  : isLight
                                  ? "hover:bg-neutral-100/60 text-neutral-600"
                                  : "hover:bg-white/5 text-neutral-400"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {pl.thumbnail ? (
                                  <img
                                    src={pl.thumbnail}
                                    alt={pl.title}
                                    className="w-10 h-10 rounded-md object-cover shrink-0 bg-neutral-200 grayscale-[40%]"
                                  />
                                ) : (
                                  <div
                                    className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                                      isLight ? "bg-neutral-100" : "bg-[#282828]"
                                    }`}
                                  >
                                    <Music2 className="w-4 h-4 text-neutral-400" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <h4
                                    className={`text-xs font-semibold truncate leading-normal py-0.5 ${
                                      isSelected
                                        ? "text-[#ff0000]"
                                        : isLight
                                        ? "text-neutral-800"
                                        : "text-white"
                                    }`}
                                  >
                                    {pl.title}
                                  </h4>
                                  <p
                                    className={`text-[11px] truncate leading-normal ${
                                      isLight ? "text-neutral-400" : "text-neutral-500"
                                    }`}
                                  >
                                    {subtitle}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* GRID VIEW (2 Columns Cards - grid-cols-2 gap-3 px-1) */
              <div className="grid grid-cols-2 gap-2.5 pb-2">
                {/* Pinned 1: Beğenilenler */}
                <div
                  data-playlist-id="liked"
                  onClick={() => handlePlaylistClick("liked")}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, "liked", false)}
                  className={`relative flex flex-col group cursor-pointer select-none p-1.5 rounded-xl transition-all ${
                    selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                      ? isLight
                        ? "bg-neutral-100/90 text-neutral-900"
                        : "bg-white/15 text-white"
                      : isLight
                      ? "hover:bg-neutral-100/60 text-neutral-700"
                      : "hover:bg-white/5 text-neutral-300"
                  }`}
                >
                  {dropTargetId === "liked" && (
                    <div className="absolute -bottom-1 left-1 right-1 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                  )}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-[#ff0033] via-[#cc0029] to-[#700010] flex items-center justify-center pointer-events-none">
                    <svg
                      className="w-9 h-9 text-white fill-white drop-shadow-sm pointer-events-none"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {/* Top-left dark translucent pin badge */}
                    <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white shadow-sm flex items-center justify-center pointer-events-none">
                      <Pin className="w-3 h-3 fill-white text-white rotate-45" />
                    </div>
                  </div>

                  <h4
                    className={`font-semibold text-[13px] truncate mt-1.5 leading-snug pointer-events-none ${
                      selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                        ? "text-[#ff0000]"
                        : isLight
                        ? "text-neutral-900"
                        : "text-white"
                    }`}
                  >
                    {t.likedSongs}
                  </h4>
                  <p
                    className={`text-[11px] truncate leading-tight pointer-events-none ${
                      isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {likedSongsCountText}
                  </p>
                </div>

                {/* Pinned User Playlists (Grid) */}
                {sortedPinnedPlaylists.map((pl) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const gridSubtitle = getGridSubtitle(pl, userProfile.name, t);
                  const isDragging = draggedPlaylistId === pl.id;

                  return (
                    <div
                      key={`grid-pinned-${pl.id}`}
                      data-playlist-id={pl.id}
                      onPointerDown={(e) => handlePlaylistPointerDown(e, pl)}
                      onClick={() => handlePlaylistClick(pl)}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl, false)}
                      className={`relative flex flex-col group cursor-pointer select-none p-1.5 rounded-xl transition-all ${
                        isDragging ? "opacity-30 scale-95 ring-2 ring-[#ff0000]" : ""
                      } ${
                        isSelected
                          ? isLight
                            ? "bg-neutral-100/90 text-neutral-900"
                            : "bg-white/15 text-white"
                          : isLight
                          ? "hover:bg-neutral-100/60 text-neutral-700"
                          : "hover:bg-white/5 text-neutral-300"
                      }`}
                    >
                      {dropTargetId === pl.id && dropPosition === "before" && (
                        <div className="absolute -top-1 left-1 right-1 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}
                      {dropTargetId === pl.id && dropPosition === "after" && (
                        <div className="absolute -bottom-1 left-1 right-1 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}

                      <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 pointer-events-none">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            draggable={false}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music2 className="w-8 h-8 text-neutral-400" />
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white shadow-sm flex items-center justify-center pointer-events-none">
                          <Pin className="w-3 h-3 fill-white text-white rotate-45" />
                        </div>
                      </div>

                      <h4
                        className={`font-semibold text-[13px] truncate mt-1.5 leading-snug pointer-events-none ${
                          isSelected
                            ? "text-[#ff0000]"
                            : isLight
                            ? "text-neutral-900"
                            : "text-white"
                        }`}
                      >
                        {pl.title}
                      </h4>
                      <p
                        className={`text-[11px] truncate leading-tight pointer-events-none ${
                          isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}
                      >
                        {gridSubtitle}
                      </p>
                    </div>
                  );
                })}

                {/* Unpinned User Playlists (Grid) */}
                {sortedUnpinnedPlaylists.map((pl) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const gridSubtitle = getGridSubtitle(pl, userProfile.name, t);
                  const isDragging = draggedPlaylistId === pl.id;

                  return (
                    <div
                      key={`grid-${pl.id}`}
                      data-playlist-id={pl.id}
                      onPointerDown={(e) => handlePlaylistPointerDown(e, pl)}
                      onClick={() => handlePlaylistClick(pl)}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl, false)}
                      className={`relative flex flex-col group cursor-pointer select-none p-1.5 rounded-xl transition-all ${
                        isDragging ? "opacity-30 scale-95 ring-2 ring-[#ff0000]" : ""
                      } ${
                        isSelected
                          ? isLight
                            ? "bg-neutral-100/90 text-neutral-900"
                            : "bg-white/15 text-white"
                          : isLight
                          ? "hover:bg-neutral-100/60 text-neutral-700"
                          : "hover:bg-white/5 text-neutral-300"
                      }`}
                    >
                      {dropTargetId === pl.id && dropPosition === "before" && (
                        <div className="absolute -top-1 left-1 right-1 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}
                      {dropTargetId === pl.id && dropPosition === "after" && (
                        <div className="absolute -bottom-1 left-1 right-1 h-1 bg-[#ff0000] rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      )}

                      <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800 pointer-events-none">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            draggable={false}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music2 className="w-8 h-8 text-neutral-400" />
                          </div>
                        )}
                      </div>

                      <h4
                        className={`font-semibold text-[13px] truncate mt-1.5 leading-snug pointer-events-none ${
                          isSelected
                            ? "text-[#ff0000]"
                            : isLight
                            ? "text-neutral-900"
                            : "text-white"
                        }`}
                      >
                        {pl.title}
                      </h4>
                      <p
                        className={`text-[11px] truncate leading-tight pointer-events-none ${
                          isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}
                      >
                        {gridSubtitle}
                      </p>
                    </div>
                  );
                })}

                {/* Gizlenenler Klasörü (Grid View) */}
                {hiddenPlaylists.length > 0 && (
                  <div className="col-span-2 pt-2 mt-2 border-t border-neutral-200/60 dark:border-white/10">
                    <button
                      onClick={() => setIsHiddenFolderOpen((prev) => !prev)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                        isLight
                          ? "hover:bg-neutral-100/80 text-neutral-600 hover:text-neutral-900"
                          : "hover:bg-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="text-xs font-semibold truncate">
                          {t.hiddenPlaylists} ({hiddenPlaylists.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isHiddenFolderOpen ? "rotate-180 text-neutral-800 dark:text-white" : "text-neutral-400"
                        }`}
                      />
                    </button>

                    {isHiddenFolderOpen && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {hiddenPlaylists.map((pl) => {
                          const isSelected = selectedPlaylistId === pl.id;
                          const gridSubtitle = getGridSubtitle(pl, userProfile.name, t);

                          return (
                            <div
                              key={`grid-hidden-${pl.id}`}
                              onClick={() => handlePlaylistClick(pl)}
                              onContextMenu={(e) => handlePlaylistContextMenu(e, pl, true)}
                              className={`flex flex-col group cursor-pointer p-1.5 rounded-xl transition-all opacity-80 hover:opacity-100 ${
                                isSelected
                                  ? isLight
                                    ? "bg-neutral-100/90 text-neutral-900"
                                    : "bg-white/15 text-white"
                                  : isLight
                                  ? "hover:bg-neutral-100/60 text-neutral-700"
                                  : "hover:bg-white/5 text-neutral-300"
                              }`}
                            >
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800">
                                {pl.thumbnail ? (
                                  <img
                                    src={pl.thumbnail}
                                    alt={pl.title}
                                    className="w-full h-full object-cover grayscale-[40%]"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Music2 className="w-8 h-8 text-neutral-400" />
                                  </div>
                                )}
                              </div>

                              <h4
                                className={`font-semibold text-xs truncate mt-1.5 leading-snug ${
                                  isSelected
                                    ? "text-[#ff0000]"
                                    : isLight
                                    ? "text-neutral-900"
                                    : "text-white"
                                }`}
                              >
                                {pl.title}
                              </h4>
                              <p
                                className={`text-[10px] truncate leading-tight ${
                                  isLight ? "text-neutral-400" : "text-neutral-500"
                                }`}
                              >
                                {gridSubtitle}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Connect Google CTA if not signed in */}
            {eligiblePlaylists.length === 0 && !userProfile.is_authenticated && (
              <div
                className={`p-4 mt-2 text-center rounded-lg space-y-2 ${
                  isLight ? "bg-neutral-50 border border-neutral-200" : "bg-[#181818]"
                }`}
              >
                <FolderPlus className="w-6 h-6 mx-auto text-neutral-400" />
                <p className={`text-xs font-bold ${isLight ? "text-neutral-900" : "text-white"}`}>
                  {t.createFirstPlaylist}
                </p>
                <p className={`text-[11px] ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                  {t.createFirstPlaylistDesc}
                </p>
                <button
                  onClick={onOpenLogin}
                  className="w-full py-1.5 px-3 bg-[#ff0000] text-white text-xs font-bold rounded-full hover:bg-[#e60000] transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {t.signIn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playlist Context Menu */}
      {contextMenu && (
        <PlaylistContextMenu
          playlist={contextMenu.playlist}
          position={contextMenu.position}
          isHidden={contextMenu.isHidden}
          isPinned={contextMenu.isPinned}
          onClose={() => setContextMenu(null)}
          onPlay={handlePlayContextMenuAction}
          onEdit={(pl) => {
            if (onOpenEditModal) {
              onOpenEditModal(pl);
            } else {
              setEditingPlaylist(pl);
            }
          }}
          onDelete={handleDeleteContextMenuAction}
          onToggleHide={toggleHide}
          onTogglePin={togglePin}
        />
      )}

      {/* Edit Playlist Modal (Fallback if not provided globally) */}
      {!onOpenEditModal && (
        <EditPlaylistModal
          isOpen={!!editingPlaylist}
          playlist={editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
          onSave={handleSaveEditedPlaylist}
        />
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (title, desc, priv) => {
          if (onCreatePlaylist) {
            await onCreatePlaylist(title, desc, priv);
          }
        }}
      />
    </aside>
  );
};

export default Sidebar;
