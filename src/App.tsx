import { useState, useEffect, useCallback, useRef, type FC } from "react";
import {
  generateHistoryKey,
  saveScrollPosition,
  getScrollPosition,
  restoreScroll,
} from "./utils/scrollRestoration";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, isLikedSongsPlaylist, recordPlaylistPlayed } from "./components/Sidebar";
import { HomeView } from "./components/HomeView";
import { PlaylistView } from "./components/PlaylistView";
import { ArtistView } from "./components/ArtistView";
import { AlbumView } from "./components/AlbumView";
import { SettingsView } from "./components/SettingsView";
import { SearchView } from "./components/SearchView";
import { LyricsView } from "./components/LyricsView";
import { DownloadsView } from "./components/DownloadsView";
import { PlayerBar } from "./components/PlayerBar";
import { RightDrawer } from "./components/RightDrawer";
import { MiniPlayerHUD } from "./components/MiniPlayerHUD";
import { LoginModal } from "./components/LoginModal";
import { useTheme } from "./context/ThemeContext";
import { usePlayer } from "./context/PlayerContext";
import {
  searchMusic,
  getUserProfile,
  logoutGoogle,
  getYtLikedSongs,
  getYtPlaylists,
  getPlaylistTracksPage,
  createYtPlaylist,
  deleteYtPlaylist,
  editYtPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} from "./services/api";
import { CustomTooltip } from "./components/CustomTooltip";
import { EditPlaylistModal, type PrivacyStatus } from "./components/EditPlaylistModal";
import type { Track, UserProfile, Playlist, SettingsTab } from "./types/music";
import { TrackContextMenu, type ContextMenuPosition } from "./components/TrackContextMenu";
import { AlertCircle, Check } from "lucide-react";

const INITIAL_RECOMMENDED: Track[] = [
  {
    id: "Ckom3gf57Yw",
    title: "Hayırlı Günler 2.0",
    artist: "deth, nieh",
    album: "Single",
    thumbnail: "https://i.ytimg.com/vi/Ckom3gf57Yw/mqdefault.jpg",
    duration: "3:10",
  },
  {
    id: "8j7416MTn08",
    title: "Bitmesin",
    artist: "Gökhan Türkmen",
    album: "Romantik",
    thumbnail: "https://i.ytimg.com/vi/8j7416MTn08/mqdefault.jpg",
    duration: "4:15",
  },
  {
    id: "2Vv-BfVoq4g",
    title: "Feel It Still",
    artist: "Portugal. The Man",
    album: "Woodstock",
    thumbnail: "https://i.ytimg.com/vi/2Vv-BfVoq4g/mqdefault.jpg",
    duration: "2:43",
  },
  {
    id: "3YxaaGgTQYM",
    title: "Bring Me To Life",
    artist: "Evanescence",
    album: "Fallen",
    thumbnail: "https://i.ytimg.com/vi/3YxaaGgTQYM/mqdefault.jpg",
    duration: "3:58",
  },
  {
    id: "3A20hK_h8eE",
    title: "Leaving Tonight",
    artist: "The Neighbourhood",
    album: "I Love You.",
    thumbnail: "https://i.ytimg.com/vi/3A20hK_h8eE/mqdefault.jpg",
    duration: "4:01",
  },
  {
    id: "rYEDA3JcQqw",
    title: "Rolling in the Deep",
    artist: "Adele",
    album: "21",
    thumbnail: "https://i.ytimg.com/vi/rYEDA3JcQqw/mqdefault.jpg",
    duration: "3:48",
  },
];


const EPISODES_TRACKS: Track[] = [
  {
    id: "ep-1",
    title: "The Architecture of Audio Engines",
    artist: "Tech & Soundscapes",
    album: "Auto playlist • Episodes for Later",
    thumbnail: "https://i.ytimg.com/vi/bU_kF9_H7g4/mqdefault.jpg",
    duration: "48:12",
  },
  {
    id: "ep-2",
    title: "Mastering Music in Modern DAWs",
    artist: "Tubify Sound Lab",
    album: "Auto playlist • Episodes for Later",
    thumbnail: "https://i.ytimg.com/vi/0Wc2J3Y9s8w/mqdefault.jpg",
    duration: "36:45",
  },
];

export const App: FC = () => {
  const { theme } = useTheme();
  const player = usePlayer();
  const isLight = theme === "light";

  // Navigation Entry Definition & History Stack
  type NavEntry =
    | { type: "home"; key: string }
    | { type: "search"; query: string; key: string }
    | { type: "playlist"; playlist: Playlist | { id: string; title: string; description?: string; thumbnail?: string | null }; key: string }
    | { type: "artist"; artistId: string; artistName?: string; thumbnail?: string; key: string }
    | { type: "album"; albumId: string; albumTitle?: string; artistName?: string; thumbnail?: string; key: string }
    | { type: "settings"; tab?: SettingsTab; key: string }
    | { type: "lyrics"; key: string }
    | { type: "downloads"; key: string };

  const [history, setHistory] = useState<NavEntry[]>([
    { type: "home", key: generateHistoryKey("home") },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentNav = history[historyIndex] || history[0];
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const mainContentRef = useRef<HTMLElement>(null);

  // Helper to persist current page scroll offset before navigating away
  const saveCurrentScroll = useCallback(() => {
    const curKey = history[historyIndex]?.key;
    if (!curKey) return;
    const container = mainContentRef.current?.querySelector<HTMLElement>(
      "#main-scroll-container, .overflow-y-auto"
    );
    if (container) {
      saveScrollPosition(curKey, container.scrollTop);
    }
  }, [history, historyIndex]);

  const navigateTo = (
    entry:
      | { type: "home"; key?: string }
      | { type: "search"; query: string; key?: string }
      | { type: "playlist"; playlist: Playlist | { id: string; title: string; description?: string; thumbnail?: string | null }; key?: string }
      | { type: "artist"; artistId: string; artistName?: string; thumbnail?: string; key?: string }
      | { type: "album"; albumId: string; albumTitle?: string; artistName?: string; thumbnail?: string; key?: string }
      | { type: "settings"; tab?: SettingsTab; key?: string }
      | { type: "lyrics"; key?: string }
      | { type: "downloads"; key?: string }
  ) => {
    const cur = history[historyIndex];
    if (
      cur &&
      cur.type === entry.type &&
      (entry.type === "home" ||
        entry.type === "lyrics" ||
        entry.type === "downloads" ||
        (entry.type === "search" && cur.type === "search" && cur.query === entry.query) ||
        (entry.type === "playlist" && cur.type === "playlist" && cur.playlist.id === entry.playlist.id) ||
        (entry.type === "artist" && cur.type === "artist" && cur.artistId === entry.artistId) ||
        (entry.type === "album" && cur.type === "album" && cur.albumId === entry.albumId) ||
        (entry.type === "settings" && cur.type === "settings" && cur.tab === entry.tab))
    ) {
      return;
    }

    // Save current scroll position before pushing a fresh entry
    saveCurrentScroll();

    const entryWithKey: NavEntry = {
      ...entry,
      key: entry.key || generateHistoryKey(entry.type),
    } as NavEntry;

    const newHistory = history.slice(0, historyIndex + 1).concat(entryWithKey);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGoBack = () => {
    if (canGoBack) {
      saveCurrentScroll();
      setHistoryIndex((prev) => prev - 1);
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      saveCurrentScroll();
      setHistoryIndex((prev) => prev + 1);
    }
  };

  // Dynamic Sticky TitleBar scroll state & real-time scroll position tracking
  const [isScrolled, setIsScrolled] = useState(false);
  const handleViewScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const top = e.currentTarget.scrollTop;
      setIsScrolled(top > 10);
      const curKey = history[historyIndex]?.key;
      if (curKey) {
        saveScrollPosition(curKey, top);
      }
    },
    [history, historyIndex]
  );

  // Scroll Restoration when active history entry changes
  useEffect(() => {
    const curKey = currentNav.key;
    if (!curKey) return;
    const savedPos = getScrollPosition(curKey);

    const container = mainContentRef.current?.querySelector<HTMLElement>(
      "#main-scroll-container, .overflow-y-auto"
    );

    if (!container) return;

    const cleanup = restoreScroll(container, savedPos, (scrolled) => {
      setIsScrolled(scrolled);
    });

    return cleanup;
  }, [historyIndex, currentNav.key]);

  // Mouse 4 / 5 (Browser Back & Forward) Hardware Navigation
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        // Mouse 4: Back
        e.preventDefault();
        e.stopPropagation();
        if (canGoBack) {
          saveCurrentScroll();
          setHistoryIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (e.button === 4) {
        // Mouse 5: Forward
        e.preventDefault();
        e.stopPropagation();
        if (canGoForward) {
          saveCurrentScroll();
          setHistoryIndex((prev) => Math.min(history.length - 1, prev + 1));
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Prevent WebView2 default browser history navigation
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("auxclick", handleAuxClick);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("auxclick", handleAuxClick);
    };
  }, [canGoBack, canGoForward, history.length]);

  // Global WebView2 / Tauri Context Menu Blocker (Suppress Chromium inspect/back/forward on blank areas)
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // Prevents Edge/Chromium WebView2 default context menu from popping up
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleGlobalContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleGlobalContextMenu);
    };
  }, []);

  const handleNavigateArtist = (artistId: string, artistName: string, thumbnail?: string) => {
    navigateTo({ type: "artist", artistId, artistName, thumbnail });
  };

  const handleNavigateAlbum = (
    albumId: string,
    albumTitle?: string,
    artistName?: string,
    thumbnail?: string
  ) => {
    navigateTo({ type: "album", albumId, albumTitle, artistName, thumbnail });
  };

  const handleToggleLyrics = useCallback(() => {
    if (currentNav.type === "lyrics") {
      if (canGoBack) {
        handleGoBack();
      } else {
        navigateTo({ type: "home" });
      }
    } else {
      if (player.queueViewMode !== "closed") {
        player.setQueueViewMode("closed");
      }
      navigateTo({ type: "lyrics" });
    }
  }, [currentNav.type, canGoBack, player.queueViewMode, player.setQueueViewMode]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // User Profile & Google Library
  const [userProfile, setUserProfile] = useState<UserProfile>({ is_authenticated: false });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("account");
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [likedSongsTotalCount, setLikedSongsTotalCount] = useState<string | null>(() => {
    try {
      return localStorage.getItem("tubify_liked_total_count");
    } catch {
      return null;
    }
  });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [playlistSuggestions, setPlaylistSuggestions] = useState<Track[]>([]);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Global Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    track: Track;
    position: ContextMenuPosition;
  } | null>(null);

  const handleOpenContextMenu = (track: Track, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      track,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Load User Profile on Startup
  useEffect(() => {
    getUserProfile()
      .then((prof) => {
        setUserProfile(prof);
        if (prof.is_authenticated) {
          loadUserData();
        }
      })
      .catch(console.error);
  }, []);

  const loadUserData = async () => {
    try {
      const [liked, pls] = await Promise.allSettled([getYtLikedSongs(), getYtPlaylists()]);
      if (liked.status === "fulfilled" && liked.value.length > 0) {
        setLikedSongs(liked.value);
        player.syncLikedIds(liked.value.map((t) => t.id));
      }
      if (pls.status === "fulfilled" && pls.value.length > 0) {
        let deletedIds = new Set<string>();
        let editedMap: Record<string, { title: string; description?: string }> = {};
        try {
          const delSaved = localStorage.getItem("tubify_deleted_playlist_ids");
          if (delSaved) deletedIds = new Set(JSON.parse(delSaved));
          const edSaved = localStorage.getItem("tubify_edited_playlists");
          if (edSaved) editedMap = JSON.parse(edSaved);
        } catch {}

        let customCovers: Record<string, string> = {};
        try {
          const covSaved = localStorage.getItem("tubify_custom_playlist_covers");
          if (covSaved) customCovers = JSON.parse(covSaved);
        } catch {}

        const cleanPlaylists = pls.value
          .filter((p) => !isLikedSongsPlaylist(p) && !deletedIds.has(p.id))
          .map((p) => {
            const cleanId = p.id.startsWith("VL") ? p.id.slice(2) : p.id;
            const ed = editedMap[p.id] || editedMap[cleanId];
            const customCover = customCovers[p.id] || customCovers[cleanId];
            return {
              ...p,
              title: ed?.title || p.title,
              description: ed?.description !== undefined ? ed.description : p.description,
              thumbnail: customCover !== undefined ? customCover : p.thumbnail,
            };
          });

        setPlaylists(cleanPlaylists);

        const lmPl = pls.value.find((p) => p.id === "LM" || p.id === "liked" || p.id === "VLLM");
        if (lmPl?.track_count) {
          setLikedSongsTotalCount(lmPl.track_count);
          try {
            localStorage.setItem("tubify_liked_total_count", lmPl.track_count);
          } catch {}
        }
      }

      // Fetch Liked Songs page to ensure exact track count is retrieved without full scrolling
      getPlaylistTracksPage("liked", null)
        .then((page) => {
          if (page.track_count) {
            setLikedSongsTotalCount(page.track_count);
            try {
              localStorage.setItem("tubify_liked_total_count", page.track_count);
            } catch {}
          }
          if (page.tracks.length > 0) {
            setLikedSongs(page.tracks);
            player.syncLikedIds(page.tracks.map((t) => t.id));
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error("Library sync error:", e);
    }
  };

  const handlePlayPlaylist = async (pl: Playlist | "liked", shuffle: boolean = false) => {
    if (pl === "liked") {
      let tracks = likedSongs;
      if (tracks.length === 0) {
        try {
          const res = await getYtLikedSongs();
          tracks = res;
          setLikedSongs(res);
        } catch {}
      }
      if (tracks.length > 0) {
        const sourceId = "playlist:liked";
        if (shuffle) {
          const randIdx = Math.floor(Math.random() * tracks.length);
          player.playTrack(tracks[randIdx], tracks, sourceId);
          if (!player.isShuffle) player.toggleShuffle();
        } else {
          player.playTrack(tracks[0], tracks, sourceId);
          if (player.isShuffle) player.toggleShuffle();
        }
      } else {
        player.showToast("Beğenilen şarkı bulunamadı");
      }
      return;
    }

    try {
      if (typeof pl !== "string" && pl.id) {
        recordPlaylistPlayed(pl.id);
      }
      const page = await getPlaylistTracksPage(pl.id, null);
      let tracks = page.tracks;
      if (tracks.length === 0) {
        try {
          const local = localStorage.getItem(`tubify_playlist_tracks_${pl.id}`);
          if (local) tracks = JSON.parse(local);
        } catch {}
      }
      if (tracks.length > 0) {
        const sourceId = typeof pl === "string" ? pl : `playlist:${pl.id}`;
        if (shuffle) {
          const randIdx = Math.floor(Math.random() * tracks.length);
          player.playTrack(tracks[randIdx], tracks, sourceId);
          if (!player.isShuffle) player.toggleShuffle();
        } else {
          player.playTrack(tracks[0], tracks, sourceId);
          if (player.isShuffle) player.toggleShuffle();
        }
      } else {
        player.showToast("Bu çalma listesinde henüz şarkı yok");
      }
    } catch (e) {
      console.error("Failed to play playlist:", e);
      player.showToast("Çalma listesi oynatılamadı");
    }
  };

  const handleCreatePlaylist = async (
    title: string,
    description?: string,
    privacyStatus?: "PUBLIC" | "UNLISTED" | "PRIVATE"
  ) => {
    const playlistId = await createYtPlaylist(title, description, privacyStatus);
    const newPlaylist: Playlist = {
      id: playlistId,
      title,
      description: description || undefined,
      thumbnail: null,
      track_count: "0 şarkı",
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    player.showToast(`"${title}" çalma listesi oluşturuldu`);
    navigateTo({ type: "playlist", playlist: newPlaylist });
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const saved = localStorage.getItem("tubify_deleted_playlist_ids");
      const deletedIds: string[] = saved ? JSON.parse(saved) : [];
      if (!deletedIds.includes(playlistId)) {
        deletedIds.push(playlistId);
        localStorage.setItem("tubify_deleted_playlist_ids", JSON.stringify(deletedIds));
      }
    } catch {}

    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));

    if (currentNav.type === "playlist" && currentNav.playlist.id === playlistId) {
      navigateTo({ type: "home" });
    }

    try {
      await deleteYtPlaylist(playlistId);
    } catch (err) {
      console.warn("YouTube Music playlist delete error:", err);
    }
  };

  const handleEditPlaylist = async (
    playlistId: string,
    title: string,
    description?: string,
    privacyStatus?: PrivacyStatus,
    customThumbnail?: string | null
  ) => {
    const cleanId = playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;

    // Snapshot state for rollback if network/IPC fails
    const prevPlaylists = playlists;
    const prevHistory = history;

    // 1. Optimistic UI update for playlists state
    setPlaylists((prev) =>
      prev.map((p) => {
        const pClean = p.id.startsWith("VL") ? p.id.slice(2) : p.id;
        if (pClean === cleanId || p.id === playlistId) {
          return {
            ...p,
            title,
            description: description !== undefined ? description : p.description,
            privacy_status: privacyStatus || p.privacy_status,
            thumbnail: customThumbnail !== undefined ? customThumbnail : p.thumbnail,
          };
        }
        return p;
      })
    );

    // 2. Optimistic UI update for current view & history if this playlist is active
    if (
      currentNav.type === "playlist" &&
      (currentNav.playlist.id === playlistId ||
        currentNav.playlist.id === cleanId ||
        currentNav.playlist.id === `VL${cleanId}`)
    ) {
      const updated = {
        ...currentNav.playlist,
        title,
        description: description !== undefined ? description : currentNav.playlist.description,
        privacy_status:
          privacyStatus ||
          ("privacy_status" in currentNav.playlist ? currentNav.playlist.privacy_status : undefined),
        thumbnail: customThumbnail !== undefined ? customThumbnail : currentNav.playlist.thumbnail,
      };
      setHistory((prev) =>
        prev.map((item, idx) =>
          idx === historyIndex && item.type === "playlist"
            ? { ...item, playlist: updated }
            : item
        )
      );
    }

    // 3. Update localStorage cache
    try {
      const saved = localStorage.getItem("tubify_edited_playlists");
      const editedMap = saved ? JSON.parse(saved) : {};
      editedMap[playlistId] = { title, description, privacyStatus };
      editedMap[cleanId] = { title, description, privacyStatus };
      localStorage.setItem("tubify_edited_playlists", JSON.stringify(editedMap));
    } catch {}

    // Save custom cover if modified
    if (customThumbnail !== undefined) {
      try {
        const savedCovers = localStorage.getItem("tubify_custom_playlist_covers");
        const coversMap = savedCovers ? JSON.parse(savedCovers) : {};
        if (customThumbnail) {
          coversMap[playlistId] = customThumbnail;
          coversMap[cleanId] = customThumbnail;
        } else {
          delete coversMap[playlistId];
          delete coversMap[cleanId];
        }
        localStorage.setItem("tubify_custom_playlist_covers", JSON.stringify(coversMap));
      } catch {}
    }

    // 4. InnerTube API call
    try {
      await editYtPlaylist(cleanId, title, description, privacyStatus);
      player.showToast("Çalma listesi güncellendi");
    } catch (err: unknown) {
      console.error("YouTube Music playlist edit error:", err);
      // Rollback on failure
      setPlaylists(prevPlaylists);
      setHistory(prevHistory);
      const errMsg = err instanceof Error ? err.message : String(err);
      player.showToast(`Çalma listesi güncellenemedi: ${errMsg}`);
      throw err;
    }
  };

  const handleUpdatePlaylistCover = (playlistId: string, customThumbnail: string) => {
    const cleanId = playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;

    // 1. Optimistic UI update for playlists state
    setPlaylists((prev) =>
      prev.map((p) => {
        const pClean = p.id.startsWith("VL") ? p.id.slice(2) : p.id;
        if (pClean === cleanId || p.id === playlistId) {
          return { ...p, thumbnail: customThumbnail };
        }
        return p;
      })
    );

    // 2. Optimistic UI update for current view & history if this playlist is active
    if (
      currentNav.type === "playlist" &&
      (currentNav.playlist.id === playlistId ||
        currentNav.playlist.id === cleanId ||
        currentNav.playlist.id === `VL${cleanId}`)
    ) {
      const updated = {
        ...currentNav.playlist,
        thumbnail: customThumbnail,
      };
      setHistory((prev) =>
        prev.map((item, idx) =>
          idx === historyIndex && item.type === "playlist"
            ? { ...item, playlist: updated }
            : item
        )
      );
    }

    // 3. Save custom cover to localStorage
    try {
      const savedCovers = localStorage.getItem("tubify_custom_playlist_covers");
      const coversMap = savedCovers ? JSON.parse(savedCovers) : {};
      if (customThumbnail) {
        coversMap[playlistId] = customThumbnail;
        coversMap[cleanId] = customThumbnail;
      } else {
        delete coversMap[playlistId];
        delete coversMap[cleanId];
      }
      localStorage.setItem("tubify_custom_playlist_covers", JSON.stringify(coversMap));
    } catch {}

    player.showToast("Çalma listesi kapağı güncellendi");
  };

  const handleToggleLike = async (track: Track) => {
    const isCurrentlyLiked = player.likedTrackIds.has(track.id);
    const nextLiked = !isCurrentlyLiked;

    // Snapshot state for rollback if network/IPC fails
    const prevLikedSongs = likedSongs;
    const prevTotalCount = likedSongsTotalCount;
    const prevLikedTrackIds = new Set(player.likedTrackIds);

    // 1. Optimistic UI update: immediately remove/add row & update counters
    if (!nextLiked) {
      // Unliking: immediately filter out of liked songs
      setLikedSongs((prev) => prev.filter((t) => t.id !== track.id));

      setLikedSongsTotalCount((prev) => {
        if (!prev) {
          const newLen = Math.max(0, prevLikedSongs.length - 1);
          return `${newLen} şarkı`;
        }
        const digits = prev.replace(/[^\d]/g, "");
        if (!digits) return prev;
        const currentNum = parseInt(digits, 10);
        const newNum = Math.max(0, currentNum - 1);
        const formatted = `${newNum.toLocaleString("tr-TR")} şarkı`;
        try {
          localStorage.setItem("tubify_liked_total_count", formatted);
        } catch {}
        return formatted;
      });

      player.showToast(`"${track.title}" Beğenilenler'den kaldırıldı`);
    } else {
      // Liking: immediately prepend to liked songs
      setLikedSongs((prev) => {
        if (prev.some((t) => t.id === track.id)) return prev;
        return [track, ...prev];
      });

      setLikedSongsTotalCount((prev) => {
        if (!prev) {
          const newLen = prevLikedSongs.length + 1;
          return `${newLen} şarkı`;
        }
        const digits = prev.replace(/[^\d]/g, "");
        if (!digits) return prev;
        const currentNum = parseInt(digits, 10);
        const newNum = currentNum + 1;
        const formatted = `${newNum.toLocaleString("tr-TR")} şarkı`;
        try {
          localStorage.setItem("tubify_liked_total_count", formatted);
        } catch {}
        return formatted;
      });

      player.showToast(`"${track.title}" Beğenilenler'e eklendi`);
    }

    // 2. Perform backend toggle
    try {
      await player.toggleLike(track, userProfile.is_authenticated);
    } catch (err) {
      console.error("Failed to toggle like on YouTube Music, rolling back:", err);
      // 3. Rollback on failure!
      setLikedSongs(prevLikedSongs);
      setLikedSongsTotalCount(prevTotalCount);
      try {
        if (prevTotalCount) {
          localStorage.setItem("tubify_liked_total_count", prevTotalCount);
        }
      } catch {}
      player.syncLikedIds(Array.from(prevLikedTrackIds));
      player.showToast("İşlem başarısız oldu, değişiklik geri alındı");
    }
  };

  const handleAddToPlaylist = async (pl: Playlist | "liked", track: Track) => {
    // 1. Liked Songs handling (Special case for LM / VLLM / liked)
    if (
      pl === "liked" ||
      (typeof pl !== "string" && (pl.id === "LM" || pl.id === "VLLM" || pl.id === "liked"))
    ) {
      await handleToggleLike(track);
      return;
    }

    // 2. Custom playlist handling: Clean "VL" prefix from playlist ID
    const rawId = pl.id;
    const cleanPlaylistId = rawId.startsWith("VL") ? rawId.slice(2) : rawId;

    try {
      // 3. InnerTube browse/edit_playlist API call
      await addTrackToPlaylist(cleanPlaylistId, track.id);

      // 4. Update local storage cache
      try {
        const key = `tubify_playlist_tracks_${rawId}`;
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

      // 5. Instantly update playlists state so sidebar track_count increments
      setPlaylists((prev) =>
        prev.map((item) => {
          const itemClean = item.id.startsWith("VL") ? item.id.slice(2) : item.id;
          if (itemClean === cleanPlaylistId) {
            const raw = item.track_count || "";
            const match = raw.match(/\d+/);
            const currentCount = match ? parseInt(match[0], 10) : 0;
            const newCount = currentCount + 1;
            return { ...item, track_count: `${newCount} şarkı` };
          }
          return item;
        })
      );

      // 6. If user is currently viewing this playlist, append to current playlist view immediately
      if (
        currentNav.type === "playlist" &&
        (currentNav.playlist.id === rawId ||
          (currentNav.playlist.id.startsWith("VL")
            ? currentNav.playlist.id.slice(2)
            : currentNav.playlist.id) === cleanPlaylistId)
      ) {
        setPlaylistTracks((prev) => {
          if (prev.some((t) => t.id === track.id)) return prev;
          return [...prev, track];
        });
      }

      player.showToast(`"${track.title}", "${pl.title}" listesine eklendi`);
    } catch (e: any) {
      console.error("Failed to add track to playlist:", e);
      player.showToast(`Listeye eklenemedi: ${e?.message || e}`);
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    loadUserData();
  };

  const handleOpenSettings = (
    tab: SettingsTab = "account"
  ) => {
    setSettingsInitialTab(tab);
    navigateTo({ type: "settings", tab });
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.error("Logout error:", e);
    }
    setUserProfile({ is_authenticated: false });
    setLikedSongs([]);
    setPlaylists([]);
    if (currentNav.type === "playlist" && currentNav.playlist.id === "liked") {
      navigateTo({ type: "home" });
    }
  };


  // Search handlers
  const handleExecuteSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    navigateTo({ type: "search", query: q });

    try {
      const results = await searchMusic(q);
      setSearchResults(results);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Search error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    handleExecuteSearch(searchQuery);
  };

  // Debounced auto-search when user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      handleExecuteSearch(trimmed);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPlaylistTracks = async (playlistId: string) => {
    setIsLoadingTracks(true);
    setPlaylistTracks([]);
    setPlaylistSuggestions([]);
    setContinuationToken(null);
    try {
      const page = await getPlaylistTracksPage(playlistId, null);
      let tracks = page.tracks;
      if (tracks.length === 0 && playlistId !== "liked" && playlistId !== "LM") {
        try {
          const local =
            localStorage.getItem(`tubify_playlist_tracks_${playlistId}`) ||
            (playlistId.startsWith("VL")
              ? localStorage.getItem(`tubify_playlist_tracks_${playlistId.slice(2)}`)
              : localStorage.getItem(`tubify_playlist_tracks_VL${playlistId}`));
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              tracks = parsed;
            }
          }
        } catch {}
      }
      setPlaylistTracks(tracks);
      setPlaylistSuggestions(page.suggestions || []);
      setContinuationToken(page.continuation || null);
      if (playlistId === "liked" || playlistId === "LM") {
        setLikedSongs(page.tracks);
        if (page.track_count) {
          setLikedSongsTotalCount(page.track_count);
          try {
            localStorage.setItem("tubify_liked_total_count", page.track_count);
          } catch {}
        }
      } else if (page.track_count) {
        setPlaylists((prev) =>
          prev.map((p) => (p.id === playlistId ? { ...p, track_count: page.track_count } : p))
        );
      }
    } catch (e) {
      console.error("Failed to load playlist tracks:", e);
      setPlaylistTracks([]);
      setPlaylistSuggestions([]);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleRefreshSuggestions = async () => {
    if (currentNav.type !== "playlist" || isRefreshingSuggestions) return;
    setIsRefreshingSuggestions(true);
    try {
      const page = await getPlaylistTracksPage(currentNav.playlist.id, null);
      if (page.suggestions && page.suggestions.length > 0) {
        setPlaylistSuggestions(page.suggestions);
      }
    } catch (e) {
      console.error("Failed to refresh suggestions:", e);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  };

  const handleAddSuggestionToPlaylist = async (track: Track) => {
    if (currentNav.type !== "playlist") return;
    const pl = currentNav.playlist;
    const rawId = pl.id;
    const cleanPlaylistId = rawId.startsWith("VL") ? rawId.slice(2) : rawId;

    // 1. Optimistic UI: remove from suggestions and append to tracks
    const prevSuggestions = playlistSuggestions;
    const prevTracks = playlistTracks;

    setPlaylistSuggestions((prev) => prev.filter((t) => t.id !== track.id));
    setPlaylistTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });

    // 2. Increment track_count in currentNav and playlists
    setPlaylists((prev) =>
      prev.map((item) => {
        const itemClean = item.id.startsWith("VL") ? item.id.slice(2) : item.id;
        if (itemClean === cleanPlaylistId || item.id === rawId) {
          const raw = item.track_count || "";
          const match = raw.match(/\d+/);
          const currentCount = match ? parseInt(match[0], 10) : 0;
          return { ...item, track_count: `${currentCount + 1} şarkı` };
        }
        return item;
      })
    );

    // 3. InnerTube edit_playlist API call
    try {
      await addTrackToPlaylist(cleanPlaylistId, track.id);

      // 4. Update local storage cache
      try {
        const key = `tubify_playlist_tracks_${rawId}`;
        const existingRaw = localStorage.getItem(key);
        const existing: Track[] = existingRaw ? JSON.parse(existingRaw) : [];
        if (!existing.some((t) => t.id === track.id)) {
          existing.push(track);
          localStorage.setItem(key, JSON.stringify(existing));
        }
      } catch {}

      player.showToast(`"${track.title}" çalma listesine eklendi`);
    } catch (err: unknown) {
      console.error("Failed to add suggestion to playlist:", err);
      // Rollback on failure
      setPlaylistSuggestions(prevSuggestions);
      setPlaylistTracks(prevTracks);
      player.showToast("Şarkı çalma listesine eklenemedi");
    }
  };

  const handleRemoveTrackFromCurrentPlaylist = async (track: Track) => {
    if (currentNav.type !== "playlist") return;
    const pl = currentNav.playlist;
    const rawId = pl.id;
    const cleanPlaylistId = rawId.startsWith("VL") ? rawId.slice(2) : rawId;

    // 1. Optimistic UI: remove from playlistTracks
    const prevTracks = playlistTracks;
    setPlaylistTracks((prev) => prev.filter((t) => t.id !== track.id));

    // 2. Decrement track count in playlists state
    setPlaylists((prev) =>
      prev.map((item) => {
        const itemClean = item.id.startsWith("VL") ? item.id.slice(2) : item.id;
        if (itemClean === cleanPlaylistId || item.id === rawId) {
          const raw = item.track_count || "";
          const match = raw.match(/\d+/);
          const currentCount = match ? parseInt(match[0], 10) : 0;
          return { ...item, track_count: `${Math.max(0, currentCount - 1)} şarkı` };
        }
        return item;
      })
    );

    // 3. InnerTube edit_playlist API call
    try {
      await removeTrackFromPlaylist(cleanPlaylistId, track.id, track.set_video_id);

      // 4. Update local storage cache
      try {
        const key = `tubify_playlist_tracks_${rawId}`;
        const existingRaw = localStorage.getItem(key);
        const existing: Track[] = existingRaw ? JSON.parse(existingRaw) : [];
        const updated = existing.filter((t) => t.id !== track.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}

      player.showToast(`"${track.title}" çalma listesinden kaldırıldı`);
    } catch (err: unknown) {
      console.error("Failed to remove track from playlist:", err);
      // Rollback on failure
      setPlaylistTracks(prevTracks);
      player.showToast("Şarkı çalma listesinden kaldırılamadı");
    }
  };

  const handleLoadMoreTracks = async () => {
    if (isLoadingMore || !continuationToken || currentNav.type !== "playlist") return;
    setIsLoadingMore(true);
    try {
      const page = await getPlaylistTracksPage(currentNav.playlist.id, continuationToken);
      if (page.tracks.length > 0) {
        setPlaylistTracks((prev) => [...prev, ...page.tracks]);
        if (currentNav.playlist.id === "liked" || currentNav.playlist.id === "LM") {
          setLikedSongs((prev) => [...prev, ...page.tracks]);
        }

        // Playback Context Isolation:
        // Only append newly loaded tracks to active playback queue if current playlist is the active queue source!
        const currentSourceId =
          currentNav.playlist.id === "liked" || currentNav.playlist.id === "LM"
            ? "playlist:liked"
            : `playlist:${currentNav.playlist.id}`;
        if (player.queueSourceId === currentSourceId) {
          player.setQueue([...player.queue, ...page.tracks], currentSourceId);
        }
      }
      setContinuationToken(page.continuation || null);
    } catch (e) {
      console.error("Failed to load more tracks:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Select Playlist from Sidebar
  const handleSelectPlaylist = async (pl: Playlist | "liked" | "episodes") => {
    if (pl === "episodes") {
      const episodesPl = {
        id: "episodes",
        title: "Episodes for Later",
        description: "Auto playlist • 2 episodes",
      };
      setPlaylistTracks(EPISODES_TRACKS);
      setContinuationToken(null);
      navigateTo({ type: "playlist", playlist: episodesPl });
      return;
    }

    const plObj =
      pl === "liked" || (typeof pl !== "string" && pl.id === "LM")
        ? { id: "liked", title: "Liked Songs", description: "YouTube Music" }
        : pl;

    navigateTo({ type: "playlist", playlist: plObj });
    loadPlaylistTracks(plObj.id);
  };

  const activePlaylistTracks =
    currentNav.type === "playlist" && currentNav.playlist.id === "liked"
      ? likedSongs
      : currentNav.type === "playlist" && currentNav.playlist.id === "episodes"
      ? EPISODES_TRACKS
      : playlistTracks;

  return (
    <div
      className={`h-screen w-screen overflow-hidden select-none flex flex-col ${
        isLight ? "bg-[#ffffff] text-[#18181b]" : "bg-[#0a0a0a] text-white"
      } font-sans`}
    >
      {/* Middle Workspace: Sol Panel (Sidebar) + Sağ Alan (Header + Main Content) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Module 1: Sol Panel (Sidebar) - Ekranın en sol üstünden (top-0 left-0) oynatıcıya kadar kesintisiz tek parça */}
        {/* Module 1: Sol Panel (Sidebar) */}
        <Sidebar
          selectedPlaylistId={currentNav.type === "playlist" ? currentNav.playlist.id : null}
          onSelectPlaylist={handleSelectPlaylist}
          onPlayPlaylist={handlePlayPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onEditPlaylist={handleEditPlaylist}
          onOpenEditModal={(pl) => setEditingPlaylist(pl)}
          likedSongsCount={likedSongsTotalCount || likedSongs.length}
          playlists={playlists}
          userProfile={userProfile}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          currentView={
            currentNav.type === "playlist" || currentNav.type === "search" || currentNav.type === "settings"
              ? currentNav.type
              : "home"
          }
          onNavigateHome={() => navigateTo({ type: "home" })}
          onNavigateSearch={() => navigateTo({ type: "search", query: searchQuery })}
        />

        {/* Module 2: Sağ Alan */}
        <div
          className={`relative flex-1 flex flex-col h-full overflow-hidden min-w-0 ${
            isLight ? "bg-white" : "bg-[#0c0c0c]"
          }`}
        >
          {/* Header / TitleBar */}
          <div className="relative w-full z-20 shrink-0 pointer-events-auto">
            <TitleBar
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (q && currentNav.type !== "search") {
                  navigateTo({ type: "search", query: q });
                }
              }}
              onSearchSubmit={handleSearchSubmit}
              userProfile={userProfile}
              currentView={currentNav.type}
              currentTabTitle={
                currentNav.type === "playlist"
                  ? currentNav.playlist.title
                  : currentNav.type === "artist"
                  ? currentNav.artistName
                  : currentNav.type === "album"
                  ? currentNav.albumTitle
                  : currentNav.type === "lyrics"
                  ? "Şarkı Sözleri"
                  : player.activeTrack?.title
              }
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onOpenSettings={handleOpenSettings}
              onNavigateHome={() => navigateTo({ type: "home" })}
              onNavigateBack={handleGoBack}
              onNavigateForward={handleGoForward}
              onOpenDownloadsView={() => navigateTo({ type: "downloads" })}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              isScrolled={isScrolled}
            />
          </div>

          {/* Module 2 İçerik: Ana İçerik Paneli ve Sağ Panel */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative z-10 bg-transparent">
            <main
              ref={mainContentRef}
              className="relative z-10 flex-1 flex flex-col h-full overflow-hidden bg-transparent"
            >

            {/* Audio error banner */}
            {player.playbackError && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-[#ff0000]/10 border border-[#ff0000]/30 text-rose-500 text-xs flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#ff0000]" />
                  <span>{player.playbackError}</span>
                </div>
                <button
                  onClick={player.clearPlaybackError}
                  className="text-xs text-white/50 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}

            {/* VIEW 1: Settings View */}
            {currentNav.type === "settings" && (
              <SettingsView
                initialTab={settingsInitialTab}
                userProfile={userProfile}
                likedSongsCount={likedSongs.length}
                playlistsCount={playlists.length}
                onLogout={handleLogout}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 2: Playlist Detail View */}
            {currentNav.type === "playlist" && (
              <PlaylistView
                playlist={currentNav.playlist}
                tracks={activePlaylistTracks}
                suggestions={playlistSuggestions}
                likedSongsTotalCount={likedSongsTotalCount}
                userProfileName={userProfile.name}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t) => {
                  if (currentNav.playlist.id) {
                    recordPlaylistPlayed(currentNav.playlist.id);
                  }
                  const sourceId =
                    currentNav.playlist.id === "liked" || currentNav.playlist.id === "LM"
                      ? "playlist:liked"
                      : `playlist:${currentNav.playlist.id}`;
                  player.playTrack(t, activePlaylistTracks, sourceId);
                }}
                onPlaySuggestion={(t) => {
                  player.playTrack(t, [t], `suggestion:${t.id}`);
                }}
                onPlayAll={() => {
                  if (activePlaylistTracks.length > 0) {
                    if (currentNav.playlist.id) {
                      recordPlaylistPlayed(currentNav.playlist.id);
                    }
                    const sourceId =
                      currentNav.playlist.id === "liked" || currentNav.playlist.id === "LM"
                        ? "playlist:liked"
                        : `playlist:${currentNav.playlist.id}`;
                    player.playTrack(activePlaylistTracks[0], activePlaylistTracks, sourceId);
                  }
                }}
                onToggleShuffle={player.toggleShuffle}
                isShuffle={player.isShuffle}
                onToggleLike={handleToggleLike}
                likedTrackIds={player.likedTrackIds}
                isLoadingTracks={isLoadingTracks}
                hasMore={!!continuationToken}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMoreTracks}
                onNavigateArtist={handleNavigateArtist}
                onNavigateAlbum={handleNavigateAlbum}
                onContextMenuTrack={handleOpenContextMenu}
                onBackToHome={() => navigateTo({ type: "home" })}
                onScroll={handleViewScroll}
                onAddSuggestion={handleAddSuggestionToPlaylist}
                onRefreshSuggestions={handleRefreshSuggestions}
                isRefreshingSuggestions={isRefreshingSuggestions}
                onOpenEditModal={(pl) => setEditingPlaylist(pl)}
                onDeletePlaylist={handleDeletePlaylist}
                onEditCover={handleUpdatePlaylistCover}
              />
            )}

            {/* VIEW 3: Artist View */}
            {currentNav.type === "artist" && (
              <ArtistView
                artistId={currentNav.artistId}
                artistName={currentNav.artistName}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t, q) => {
                  const sourceId = `artist:${currentNav.artistId}`;
                  player.playTrack(t, q || [t], sourceId);
                }}
                onPlayAll={(tracks) => {
                  if (tracks.length > 0) {
                    const sourceId = `artist:${currentNav.artistId}`;
                    player.playTrack(tracks[0], tracks, sourceId);
                  }
                }}
                onToggleShuffle={player.toggleShuffle}
                isShuffle={player.isShuffle}
                onToggleLike={handleToggleLike}
                likedTrackIds={player.likedTrackIds}
                onNavigateAlbum={handleNavigateAlbum}
                onContextMenuTrack={handleOpenContextMenu}
                onBackToHome={() => navigateTo({ type: "home" })}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 4: Album View */}
            {currentNav.type === "album" && (
              <AlbumView
                albumId={currentNav.albumId}
                albumTitle={currentNav.albumTitle}
                initialArtistName={currentNav.artistName}
                initialThumbnail={currentNav.thumbnail}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t, q) => {
                  const sourceId = `album:${currentNav.albumId}`;
                  player.playTrack(t, q || [t], sourceId);
                }}
                onPlayAll={(tracks) => {
                  if (tracks.length > 0) {
                    const sourceId = `album:${currentNav.albumId}`;
                    player.playTrack(tracks[0], tracks, sourceId);
                  }
                }}
                onToggleShuffle={player.toggleShuffle}
                isShuffle={player.isShuffle}
                onToggleLike={handleToggleLike}
                likedTrackIds={player.likedTrackIds}
                onNavigateArtist={handleNavigateArtist}
                onContextMenuTrack={handleOpenContextMenu}
                onBackToHome={() => navigateTo({ type: "home" })}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 5: Search View */}
            {currentNav.type === "search" && (
              <SearchView
                query={searchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                searchError={searchError}
                userPlaylists={playlists}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                likedTrackIds={player.likedTrackIds}
                onPlayTrack={(t, q) => {
                  const sourceId = `search:${searchQuery}`;
                  player.playTrack(t, q || searchResults, sourceId);
                }}
                onToggleLike={handleToggleLike}
                onContextMenuTrack={handleOpenContextMenu}
                onNavigateArtist={handleNavigateArtist}
                onNavigateAlbum={handleNavigateAlbum}
                onSelectPlaylist={(pl) => navigateTo({ type: "playlist", playlist: pl })}
                onSelectQuery={(q) => {
                  setSearchQuery(q);
                  handleExecuteSearch(q);
                }}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 6: Home View */}
            {currentNav.type === "home" && (
              <HomeView
                recentlyPlayed={player.recentTracks}
                recommendations={INITIAL_RECOMMENDED}
                playlists={playlists}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t, list) => {
                  player.playTrack(t, list || [...player.recentTracks, ...INITIAL_RECOMMENDED], "home");
                }}
                onSelectPlaylist={(pl) => navigateTo({ type: "playlist", playlist: pl })}
                onPlayPlaylist={(pl) => handlePlayPlaylist(pl)}
                onNavigateArtist={handleNavigateArtist}
                onNavigateAlbum={handleNavigateAlbum}
                onNavigateDownloads={() => navigateTo({ type: "downloads" })}
                onNavigateBrowse={() => navigateTo({ type: "search", query: "" })}
                onContextMenuTrack={handleOpenContextMenu}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 7: Synced Lyrics View */}
            {currentNav.type === "lyrics" && (
              <LyricsView
                activeTrack={player.activeTrack}
                currentTime={player.currentTime}
                duration={player.duration}
                onSeek={player.seek}
                onClose={() => (canGoBack ? handleGoBack() : navigateTo({ type: "home" }))}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 8: Downloads View */}
            {currentNav.type === "downloads" && (
              <DownloadsView
                onScroll={handleViewScroll}
                onContextMenuTrack={handleOpenContextMenu}
              />
            )}
            </main>

            {/* Module 3: Sağ Panel (Queue / Lyrics / NowPlaying) */}
            {player.queueViewMode !== "closed" && (
              <div className="h-full flex shrink-0 overflow-hidden">
                <RightDrawer onContextMenuTrack={handleOpenContextMenu} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module 4: Alt Sabit Oynatıcı Barı */}
      <PlayerBar
        onNavigateArtist={handleNavigateArtist}
        onNavigateAlbum={handleNavigateAlbum}
        onContextMenuTrack={handleOpenContextMenu}
        onToggleLike={() => player.activeTrack && handleToggleLike(player.activeTrack)}
        onToggleLyrics={handleToggleLyrics}
        isLyricsActive={currentNav.type === "lyrics"}
      />

      {/* HUD mini-player overlay */}
      {player.isMiniPlayer && player.activeTrack && (
        <MiniPlayerHUD
          track={player.activeTrack}
          status={player.playbackStatus}
          currentTime={player.currentTime}
          duration={player.duration}
          onPlayPause={player.togglePlayPause}
          onNext={player.nextTrack}
          onPrev={player.prevTrack}
          onClose={player.toggleMiniPlayer}
        />
      )}

      {/* Google Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Global Edit Playlist Modal */}
      <EditPlaylistModal
        isOpen={!!editingPlaylist}
        playlist={editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        onSave={handleEditPlaylist}
      />

      {/* Track Context Menu */}
      {contextMenu && (
        <TrackContextMenu
          track={contextMenu.track}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onNavigateArtist={handleNavigateArtist}
          onNavigateAlbum={handleNavigateAlbum}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
          onToggleLike={handleToggleLike}
          onRemoveFromPlaylist={
            currentNav.type === "playlist" &&
            currentNav.playlist.id !== "liked" &&
            currentNav.playlist.id !== "LM" &&
            currentNav.playlist.id !== "episodes"
              ? handleRemoveTrackFromCurrentPlaylist
              : undefined
          }
        />
      )}

      {/* Floating Toast Notification Pill */}
      {player.toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border ${
              isLight
                ? "bg-neutral-900/90 text-white border-neutral-800"
                : "bg-black/90 text-white border-white/20"
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-[#ff0000] flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
            </div>
            <span>{player.toastMessage}</span>
          </div>
        </div>
      )}

      {/* Global Custom Tooltip System */}
      <CustomTooltip />
    </div>
  );
};

export default App;
