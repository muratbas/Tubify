import { useState, useEffect, useMemo, useCallback, type FC } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, isLikedSongsPlaylist, recordPlaylistPlayed } from "./components/Sidebar";
import { HomeView } from "./components/HomeView";
import { PlaylistView } from "./components/PlaylistView";
import { ArtistView } from "./components/ArtistView";
import { AlbumView } from "./components/AlbumView";
import { SettingsView } from "./components/SettingsView";
import { PlayerBar } from "./components/PlayerBar";
import { RightDrawer } from "./components/RightDrawer";
import { MiniPlayerHUD } from "./components/MiniPlayerHUD";
import { LoginModal } from "./components/LoginModal";
import { MicroVisualizer } from "./components/MicroVisualizer";
import { useTheme } from "./context/ThemeContext";
import { useLanguage } from "./context/LanguageContext";
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
} from "./services/api";
import { CustomTooltip } from "./components/CustomTooltip";
import type { Track, UserProfile, Playlist } from "./types/music";
import { TrackContextMenu, type ContextMenuPosition } from "./components/TrackContextMenu";
import { Loader2, Music2, Heart, Play, AlertCircle, Check, MoreHorizontal } from "lucide-react";

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

const INITIAL_LISTEN_AGAIN: Track[] = [
  {
    id: "kJQP7kiw5Fk",
    title: "Despacito",
    artist: "Luis Fonsi",
    album: "VIDA",
    thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg",
    duration: "3:47",
  },
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷",
    thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg",
    duration: "3:53",
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg",
    duration: "5:55",
  },
  {
    id: "OPf0YbXqDm0",
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    album: "Uptown Special",
    thumbnail: "https://i.ytimg.com/vi/OPf0YbXqDm0/mqdefault.jpg",
    duration: "4:30",
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
  const { t } = useLanguage();
  const player = usePlayer();
  const isLight = theme === "light";

  // Navigation Entry Definition & History Stack
  const [history, setHistory] = useState<
    (
      | { type: "home" }
      | { type: "search"; query: string }
      | { type: "playlist"; playlist: Playlist | { id: string; title: string; description?: string; thumbnail?: string | null } }
      | { type: "artist"; artistId: string; artistName?: string; thumbnail?: string }
      | { type: "album"; albumId: string; albumTitle?: string; artistName?: string; thumbnail?: string }
      | { type: "settings"; tab?: "account" | "appearance" | "playback" | "library" | "window" | "shortcuts" }
    )[]
  >([{ type: "home" }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentNav = history[historyIndex] || { type: "home" };
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateTo = (
    entry:
      | { type: "home" }
      | { type: "search"; query: string }
      | { type: "playlist"; playlist: Playlist | { id: string; title: string; description?: string; thumbnail?: string | null } }
      | { type: "artist"; artistId: string; artistName?: string; thumbnail?: string }
      | { type: "album"; albumId: string; albumTitle?: string; artistName?: string; thumbnail?: string }
      | { type: "settings"; tab?: "account" | "appearance" | "playback" | "library" | "window" | "shortcuts" }
  ) => {
    const cur = history[historyIndex];
    if (
      cur.type === entry.type &&
      (entry.type === "home" ||
        (entry.type === "search" && cur.type === "search" && cur.query === entry.query) ||
        (entry.type === "playlist" && cur.type === "playlist" && cur.playlist.id === entry.playlist.id) ||
        (entry.type === "artist" && cur.type === "artist" && cur.artistId === entry.artistId) ||
        (entry.type === "album" && cur.type === "album" && cur.albumId === entry.albumId) ||
        (entry.type === "settings" && cur.type === "settings" && cur.tab === entry.tab))
    ) {
      return;
    }
    const newHistory = history.slice(0, historyIndex + 1).concat(entry);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setIsScrolled(false);
  };

  const handleGoBack = () => {
    if (canGoBack) {
      setHistoryIndex((prev) => prev - 1);
      setIsScrolled(false);
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      setHistoryIndex((prev) => prev + 1);
      setIsScrolled(false);
    }
  };

  // Dynamic Sticky TitleBar scroll state (Durum B: scrollTop > 10)
  const [isScrolled, setIsScrolled] = useState(false);
  const handleViewScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  }, []);



  // Mouse 4 / 5 (Browser Back & Forward) Hardware Navigation
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        // Mouse 4: Back
        e.preventDefault();
        e.stopPropagation();
        if (canGoBack) {
          setHistoryIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (e.button === 4) {
        // Mouse 5: Forward
        e.preventDefault();
        e.stopPropagation();
        if (canGoForward) {
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

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // User Profile & Google Library
  const [userProfile, setUserProfile] = useState<UserProfile>({ is_authenticated: false });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    "account" | "appearance" | "playback" | "library" | "window" | "shortcuts"
  >("account");
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
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

        const cleanPlaylists = pls.value
          .filter((p) => !isLikedSongsPlaylist(p) && !deletedIds.has(p.id))
          .map((p) => {
            if (editedMap[p.id]) {
              return {
                ...p,
                title: editedMap[p.id].title || p.title,
                description:
                  editedMap[p.id].description !== undefined
                    ? editedMap[p.id].description
                    : p.description,
              };
            }
            return p;
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
        if (shuffle) {
          const randIdx = Math.floor(Math.random() * tracks.length);
          player.playTrack(tracks[randIdx], tracks);
          if (!player.isShuffle) player.toggleShuffle();
        } else {
          player.playTrack(tracks[0], tracks);
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
        if (shuffle) {
          const randIdx = Math.floor(Math.random() * tracks.length);
          player.playTrack(tracks[randIdx], tracks);
          if (!player.isShuffle) player.toggleShuffle();
        } else {
          player.playTrack(tracks[0], tracks);
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

  const handleEditPlaylist = (playlistId: string, title: string, description?: string) => {
    try {
      const saved = localStorage.getItem("tubify_edited_playlists");
      const editedMap = saved ? JSON.parse(saved) : {};
      editedMap[playlistId] = { title, description };
      localStorage.setItem("tubify_edited_playlists", JSON.stringify(editedMap));
    } catch {}

    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, title, description } : p))
    );

    if (currentNav.type === "playlist" && currentNav.playlist.id === playlistId) {
      const updated = { ...currentNav.playlist, title, description };
      setHistory((prev) =>
        prev.map((item, idx) =>
          idx === historyIndex && item.type === "playlist"
            ? { ...item, playlist: updated }
            : item
        )
      );
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    loadUserData();
  };

  const handleOpenSettings = (
    tab: "account" | "appearance" | "playback" | "library" | "window" | "shortcuts" = "account"
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

  // Next / Prev track queue resolver
  const currentQueue = useMemo(() => {
    if (currentNav.type === "playlist") {
      if (currentNav.playlist.id === "liked") return likedSongs;
      if (currentNav.playlist.id === "episodes") return EPISODES_TRACKS;
      return playlistTracks;
    }
    if (currentNav.type === "search") {
      return searchResults;
    }
    return [...player.recentTracks, ...INITIAL_RECOMMENDED];
  }, [currentNav, likedSongs, playlistTracks, searchResults, player.recentTracks]);

  // Keep queue synced to player context
  useEffect(() => {
    if (currentQueue.length > 0) {
      player.setQueue(currentQueue);
    }
  }, [currentQueue]);

  // Search handler
  const handleSearchSubmit = async () => {
    const q = searchQuery.trim();
    if (!q) return;
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

  const loadPlaylistTracks = async (playlistId: string) => {
    setIsLoadingTracks(true);
    setPlaylistTracks([]);
    setContinuationToken(null);
    try {
      const page = await getPlaylistTracksPage(playlistId, null);
      setPlaylistTracks(page.tracks);
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
    } finally {
      setIsLoadingTracks(false);
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
          {/* Header / TitleBar (z-20) */}
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-auto">
            <TitleBar
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (!q && currentNav.type === "search") {
                  navigateTo({ type: "home" });
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
                  : player.activeTrack?.title
              }
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onOpenSettings={handleOpenSettings}
              onNavigateHome={() => navigateTo({ type: "home" })}
              onNavigateBack={handleGoBack}
              onNavigateForward={handleGoForward}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              isScrolled={isScrolled}
            />
          </div>

          {/* Module 2 İçerik: Ana İçerik Paneli ve Sağ Panel */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative z-10 bg-transparent">
            <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden bg-transparent">

            {/* Audio error banner */}
            {player.playbackError && (
              <div className="mx-6 mt-16 p-3 rounded-2xl bg-[#ff0000]/10 border border-[#ff0000]/30 text-rose-500 text-xs flex items-center justify-between z-20">
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
                likedSongsTotalCount={likedSongsTotalCount}
                userProfileName={userProfile.name}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t) => {
                  if (currentNav.playlist.id) {
                    recordPlaylistPlayed(currentNav.playlist.id);
                  }
                  player.playTrack(t, activePlaylistTracks);
                }}
                onPlayAll={() => {
                  if (activePlaylistTracks.length > 0) {
                    if (currentNav.playlist.id) {
                      recordPlaylistPlayed(currentNav.playlist.id);
                    }
                    player.playTrack(activePlaylistTracks[0], activePlaylistTracks);
                  }
                }}
                onToggleShuffle={player.toggleShuffle}
                isShuffle={player.isShuffle}
                onToggleLike={(t) => player.toggleLike(t, userProfile.is_authenticated)}
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
              />
            )}

            {/* VIEW 3: Artist View */}
            {currentNav.type === "artist" && (
              <ArtistView
                artistId={currentNav.artistId}
                artistName={currentNav.artistName}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t, q) => player.playTrack(t, q || activePlaylistTracks)}
                onPlayAll={(tracks) => {
                  if (tracks.length > 0) player.playTrack(tracks[0], tracks);
                }}
                onToggleShuffle={player.toggleShuffle}
                isShuffle={player.isShuffle}
                onToggleLike={(t) => player.toggleLike(t, userProfile.is_authenticated)}
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
                onPlayTrack={(t, q) => player.playTrack(t, q || activePlaylistTracks)}
                onPlayAll={(tracks) => {
                  if (tracks.length > 0) player.playTrack(tracks[0], tracks);
                }}
                onToggleShuffle={player.toggleShuffle}
                isShuffle={player.isShuffle}
                onToggleLike={(t) => player.toggleLike(t, userProfile.is_authenticated)}
                likedTrackIds={player.likedTrackIds}
                onNavigateArtist={handleNavigateArtist}
                onContextMenuTrack={handleOpenContextMenu}
                onBackToHome={() => navigateTo({ type: "home" })}
                onScroll={handleViewScroll}
              />
            )}

            {/* VIEW 5: Search View */}
            {currentNav.type === "search" && (
              <div
                onScroll={handleViewScroll}
                className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 md:p-8 pt-16 space-y-6 pb-28 relative z-10 bg-transparent ${
                  isLight ? "text-[#111111]" : "text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className={`text-2xl font-black tracking-tight ${
                      isLight ? "text-[#18181b]" : "text-white"
                    }`}
                  >
                    {t.searchResultsFor} "{searchQuery}"
                  </h2>
                  <button
                    onClick={() => navigateTo({ type: "home" })}
                    className={`text-xs font-semibold transition-colors cursor-pointer ${
                      isLight
                        ? "text-[#71717a] hover:text-[#111111]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {t.backToHome}
                  </button>
                </div>

                {isSearching ? (
                  <div
                    className={`py-24 flex flex-col items-center justify-center gap-3 ${
                      isLight ? "text-[#71717a]" : "text-white/60"
                    }`}
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-[#ff0000]" />
                  </div>
                ) : searchError ? (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                    {searchError}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div
                    className={`py-24 text-center space-y-2 ${
                      isLight ? "text-[#71717a]" : "text-white/40"
                    }`}
                  >
                    <p className="text-sm font-semibold">{t.noResultsFound}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.map((track, idx) => {
                      const isActive = player.activeTrack?.id === track.id;
                      const isLiked = player.likedTrackIds.has(track.id);

                      return (
                        <div
                          key={`search-${track.id}-${idx}`}
                          onClick={() => player.playTrack(track, searchResults)}
                          onContextMenu={(e) => handleOpenContextMenu(track, e)}
                          className={`flex items-center justify-between p-3 rounded-2xl transition-all group cursor-pointer active:scale-[0.99] ${
                            isActive
                              ? isLight
                                ? "bg-[#ffffff] shadow-sm border border-[#e4e4e7] text-black"
                                : "bg-white/[0.12] border border-white/[0.1] text-white"
                              : isLight
                              ? "hover:bg-[#ffffff]/80 text-[#18181b]"
                              : "hover:bg-white/[0.04] text-white/80"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm ${
                                isLight ? "bg-[#e4e4e7]" : "bg-zinc-800"
                              }`}
                            >
                              {track.thumbnail ? (
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music2 className="w-5 h-5 text-[#ff0000]" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                              </div>
                              {isActive && player.playbackStatus === "playing" && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <MicroVisualizer isPlaying={true} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4
                                className={`text-xs font-bold truncate leading-tight ${
                                  isActive
                                    ? "text-[#ff0000]"
                                    : isLight
                                    ? "text-[#18181b]"
                                    : "text-white"
                                }`}
                              >
                                {track.title}
                              </h4>
                              <p
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigateArtist(track.artist_id || track.artist, track.artist);
                                }}
                                className={`text-[11px] truncate mt-0.5 hover:underline cursor-pointer ${
                                  isLight ? "text-[#71717a] hover:text-black" : "text-white/60 hover:text-white"
                                }`}
                              >
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                player.toggleLike(track, userProfile.is_authenticated);
                              }}
                              className={`p-1.5 transition-colors cursor-pointer ${
                                isLight
                                  ? "text-[#a1a1aa] hover:text-[#ff0000]"
                                  : "text-white/40 hover:text-[#ff0000]"
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isLiked ? "text-[#ff0000] fill-[#ff0000]" : ""
                                }`}
                              />
                            </button>
                            <button
                              onClick={(e) => handleOpenContextMenu(track, e)}
                              className={`p-1.5 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 ${
                                isLight
                                  ? "text-[#a1a1aa] hover:text-black"
                                  : "text-white/40 hover:text-white"
                              }`}
                              title="Daha fazla seçenek"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <span
                              className={`text-xs font-mono font-medium ${
                                isLight ? "text-[#71717a]" : "text-white/50"
                              }`}
                            >
                              {track.duration || "3:30"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 6: Home View */}
            {currentNav.type === "home" && (
              <HomeView
                recentlyPlayed={player.recentTracks}
                recommendations={INITIAL_RECOMMENDED}
                listenAgain={INITIAL_LISTEN_AGAIN}
                activeTrack={player.activeTrack}
                isPlaying={player.playbackStatus === "playing"}
                onPlayTrack={(t) => player.playTrack(t, [...player.recentTracks, ...INITIAL_RECOMMENDED])}
                onNavigateArtist={handleNavigateArtist}
                onContextMenuTrack={handleOpenContextMenu}
                onScroll={handleViewScroll}
              />
            )}
            </main>

            {/* Module 3: Sağ Panel (Queue / Lyrics / NowPlaying) */}
            {player.queueViewMode !== "closed" && (
              <div className="pt-14 flex h-full shrink-0">
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

      {/* Track Context Menu */}
      {contextMenu && (
        <TrackContextMenu
          track={contextMenu.track}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onNavigateArtist={handleNavigateArtist}
          onNavigateAlbum={handleNavigateAlbum}
          playlists={playlists}
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
