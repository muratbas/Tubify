import { useState, useEffect, useMemo, type FC } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { HomeView } from "./components/HomeView";
import { PlaylistView } from "./components/PlaylistView";
import { SettingsView } from "./components/SettingsView";
import { PlayerBar } from "./components/PlayerBar";
import { RightDrawer } from "./components/RightDrawer";
import { AmbientBackground } from "./components/AmbientBackground";
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
  getPlaylistTracks,
} from "./services/api";
import type { Track, UserProfile, Playlist } from "./types/music";
import { Loader2, Music2, Heart, Play, AlertCircle } from "lucide-react";

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

  // Navigation View: "home" | "playlist" | "search" | "settings"
  const [currentView, setCurrentView] = useState<"home" | "playlist" | "search" | "settings">("home");
  const [selectedPlaylist, setSelectedPlaylist] = useState<
    Playlist | { id: "liked"; title: string; description?: string } | { id: "episodes"; title: string; description?: string } | null
  >(null);

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
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

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
        setPlaylists(pls.value);
      }
    } catch (e) {
      console.error("Library sync error:", e);
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
    setCurrentView("settings");
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
    if (selectedPlaylist?.id === "liked") {
      setSelectedPlaylist(null);
      setCurrentView("home");
    }
  };

  // Next / Prev track queue resolver
  const currentQueue = useMemo(() => {
    if (currentView === "playlist") {
      if (selectedPlaylist?.id === "liked") return likedSongs;
      if (selectedPlaylist?.id === "episodes") return EPISODES_TRACKS;
      return playlistTracks;
    }
    if (currentView === "search") {
      return searchResults;
    }
    return [...player.recentTracks, ...INITIAL_RECOMMENDED];
  }, [currentView, selectedPlaylist, likedSongs, playlistTracks, searchResults, player.recentTracks]);

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
    setCurrentView("search");

    try {
      const results = await searchMusic(q);
      setSearchResults(results);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Search error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  // Select Playlist from Sidebar
  const handleSelectPlaylist = async (pl: Playlist | "liked" | "episodes") => {
    if (pl === "episodes") {
      setSelectedPlaylist({ id: "episodes", title: "Episodes for Later", description: "Auto playlist • 2 episodes" });
      setPlaylistTracks(EPISODES_TRACKS);
      setCurrentView("playlist");
      return;
    }

    if (pl === "liked" || (typeof pl !== "string" && pl.id === "LM")) {
      setSelectedPlaylist({ id: "liked", title: "Liked Songs", description: "YouTube Music" });
      setCurrentView("playlist");
      if (userProfile.is_authenticated) {
        setIsLoadingTracks(true);
        try {
          const songs = await getYtLikedSongs();
          setLikedSongs(songs);
        } finally {
          setIsLoadingTracks(false);
        }
      }
      return;
    }

    setSelectedPlaylist(pl);
    setCurrentView("playlist");
    setIsLoadingTracks(true);
    try {
      const tracks = await getPlaylistTracks(pl.id);
      setPlaylistTracks(tracks);
    } catch (e) {
      console.error(e);
      setPlaylistTracks([]);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const activePlaylistTracks =
    selectedPlaylist?.id === "liked"
      ? likedSongs
      : selectedPlaylist?.id === "episodes"
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
        <Sidebar
          selectedPlaylistId={selectedPlaylist ? selectedPlaylist.id : null}
          onSelectPlaylist={handleSelectPlaylist}
          likedSongsCount={likedSongs.length}
          playlists={playlists}
          userProfile={userProfile}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          currentView={currentView}
          onNavigateHome={() => {
            setCurrentView("home");
            setSelectedPlaylist(null);
          }}
          onNavigateSearch={() => {
            setCurrentView("search");
            setSelectedPlaylist(null);
          }}
        />

        {/* Module 2: Sağ Alan (Üstte Header + Altta Ana İçerik) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
          {/* Header SADECE sağdaki Ana İçerik panelinin en üstünde */}
          <TitleBar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (!q && currentView === "search") {
                setCurrentView("home");
              }
            }}
            onSearchSubmit={handleSearchSubmit}
            userProfile={userProfile}
            currentView={currentView}
            currentTabTitle={selectedPlaylist?.title || player.activeTrack?.title}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenSettings={handleOpenSettings}
            onNavigateHome={() => {
              setCurrentView("home");
              setSelectedPlaylist(null);
            }}
            onNavigateBack={() => {
              if (currentView !== "home" || selectedPlaylist) {
                setCurrentView("home");
                setSelectedPlaylist(null);
              }
            }}
          />

          {/* Module 2 İçerik: Ana İçerik Paneli (Bitişik, rounded-none, shadow-none) */}
          <main
            className={`flex-1 flex flex-col h-full overflow-hidden relative ${
              isLight ? "bg-[#ffffff]" : "bg-[#121212]"
            }`}
          >
            {/* Apple Music Style Ambient Blur Background */}
            <AmbientBackground thumbnail={player.activeTrack?.thumbnail} />

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
          {currentView === "settings" && (
            <SettingsView
              initialTab={settingsInitialTab}
              userProfile={userProfile}
              likedSongsCount={likedSongs.length}
              playlistsCount={playlists.length}
              onLogout={handleLogout}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {/* VIEW 2: Playlist Detail View */}
          {currentView === "playlist" && selectedPlaylist && (
            <PlaylistView
              playlist={selectedPlaylist}
              tracks={activePlaylistTracks}
              activeTrack={player.activeTrack}
              isPlaying={player.playbackStatus === "playing"}
              onPlayTrack={(t) => player.playTrack(t, activePlaylistTracks)}
              onPlayAll={() => {
                if (activePlaylistTracks.length > 0) {
                  player.playTrack(activePlaylistTracks[0], activePlaylistTracks);
                }
              }}
              onToggleShuffle={player.toggleShuffle}
              isShuffle={player.isShuffle}
              onToggleLike={(t) => player.toggleLike(t, userProfile.is_authenticated)}
              likedTrackIds={player.likedTrackIds}
              isLoadingTracks={isLoadingTracks}
              onBackToHome={() => {
                setSelectedPlaylist(null);
                setCurrentView("home");
              }}
            />
          )}

          {/* VIEW 3: Search View */}
          {currentView === "search" && (
            <div
              className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 md:p-8 pt-20 space-y-6 pb-28 relative ${
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
                  onClick={() => setCurrentView("home")}
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
                  <p className="text-xs font-medium">Searching YouTube Music...</p>
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
                              className={`text-[11px] truncate mt-0.5 ${
                                isLight ? "text-[#71717a]" : "text-white/60"
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

          {/* VIEW 4: Home View */}
          {currentView === "home" && (
            <HomeView
              recentlyPlayed={player.recentTracks}
              recommendations={INITIAL_RECOMMENDED}
              listenAgain={INITIAL_LISTEN_AGAIN}
              activeTrack={player.activeTrack}
              isPlaying={player.playbackStatus === "playing"}
              onPlayTrack={(t) => player.playTrack(t, [...player.recentTracks, ...INITIAL_RECOMMENDED])}
            />
          )}
        </main>
        </div>

        {/* Module 3: Sağ Panel (Açılıp Kapanabilir Drawer: Now Playing 1:1/16:9, Queue, Lyrics) */}
        <RightDrawer />
      </div>

      {/* Module 4: Alt Sabit/Yüzen Oynatıcı Barı (Bento Docked Card) */}
      <PlayerBar />

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
    </div>
  );
};

export default App;
