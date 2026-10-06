import { useState, useEffect, useRef, useMemo } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { HomeView } from "./components/HomeView";
import { PlaylistView } from "./components/PlaylistView";
import { PlayerBar } from "./components/PlayerBar";
import { MiniPlayerHUD } from "./components/MiniPlayerHUD";
import { LoginModal } from "./components/LoginModal";
import { SettingsModal } from "./components/SettingsModal";
import { useTheme } from "./context/ThemeContext";
import {
  searchMusic,
  getStreamUrl,
  getUserProfile,
  logoutGoogle,
  getYtLikedSongs,
  getYtPlaylists,
  getPlaylistTracks,
  toggleYtLike,
} from "./services/api";
import type { Track, PlaybackStatus, UserProfile, Playlist } from "./types/music";
import { Loader2, Music2, Heart, Play, AlertCircle } from "lucide-react";

// Curated initial recommendations matching Screenshot 1 aesthetics
const INITIAL_RECENT: Track[] = [
  {
    id: "ViwtNLUqkMY",
    title: "Crazy In Love (feat. JAY-Z)",
    artist: "Beyoncé",
    album: "Dangerously in Love",
    thumbnail: "https://i.ytimg.com/vi/ViwtNLUqkMY/mqdefault.jpg",
    duration: "3:55",
  },
  {
    id: "gN9O1k_iV9Q",
    title: "Sesinde Aşk Var",
    artist: "Yalın",
    album: "Herşey Sensin",
    thumbnail: "https://i.ytimg.com/vi/gN9O1k_iV9Q/mqdefault.jpg",
    duration: "3:42",
  },
  {
    id: "bU_kF9_H7g4",
    title: "Sugar On My Tongue",
    artist: "Tyler, The Creator",
    album: "CHROMAKOPIA",
    thumbnail: "https://i.ytimg.com/vi/bU_kF9_H7g4/mqdefault.jpg",
    duration: "2:50",
  },
  {
    id: "0Wc2J3Y9s8w",
    title: "See You Again (feat. Kali Uchis)",
    artist: "Tyler, The Creator",
    album: "Flower Boy",
    thumbnail: "https://i.ytimg.com/vi/0Wc2J3Y9s8w/mqdefault.jpg",
    duration: "3:00",
  },
];

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

export function App() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Navigation View: "home" | "playlist" | "search"
  const [currentView, setCurrentView] = useState<"home" | "playlist" | "search">("home");
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | { id: "liked"; title: string; description?: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Audio Playback
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // User Profile & Google Library
  const [userProfile, setUserProfile] = useState<UserProfile>({ is_authenticated: false });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"account" | "appearance" | "window">("account");
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  // Local Liked Track IDs
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("tubify_liked_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Recently played history
  const [recentTracks, setRecentTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("tubify_recent_tracks");
      return saved ? JSON.parse(saved) : INITIAL_RECENT;
    } catch {
      return INITIAL_RECENT;
    }
  });

  // HUD mini-player
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handlePlay = () => setPlaybackStatus("playing");
    const handlePause = () => setPlaybackStatus("paused");
    const handleEnded = () => {
      setPlaybackStatus("paused");
      handleNextTrack();
    };
    const handleError = () => {
      setPlaybackStatus("error");
      setPlaybackError("Ses akışı oynatılamadı. Alternatif kanal deneniyor...");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Save liked IDs
  useEffect(() => {
    try {
      localStorage.setItem("tubify_liked_ids", JSON.stringify(Array.from(likedTrackIds)));
    } catch (e) {
      console.error(e);
    }
  }, [likedTrackIds]);

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
        setLikedTrackIds((prev) => {
          const next = new Set(prev);
          liked.value.forEach((t) => next.add(t.id));
          return next;
        });
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

  const handleOpenSettings = (tab: "account" | "appearance" | "window" = "account") => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
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
    setLikedTrackIds(new Set());
    if (selectedPlaylist?.id === "liked") {
      setSelectedPlaylist(null);
      setCurrentView("home");
    }
  };

  // Play a track
  const playTrack = async (track: Track) => {
    if (!audioRef.current) return;
    setActiveTrack(track);
    setPlaybackStatus("loading");
    setPlaybackError(null);

    // Save to recently played
    setRecentTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("tubify_recent_tracks", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    try {
      const stream = await getStreamUrl(track.id);
      if (audioRef.current) {
        audioRef.current.src = stream.url;
        await audioRef.current.play();
        setPlaybackStatus("playing");
      }
    } catch (err: unknown) {
      setPlaybackStatus("error");
      setPlaybackError(err instanceof Error ? err.message : "Ses akışı alınamadı");
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !activeTrack) return;
    if (playbackStatus === "playing") {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Next / Prev track resolver
  const currentQueue = useMemo(() => {
    if (currentView === "playlist") {
      return selectedPlaylist?.id === "liked" ? likedSongs : playlistTracks;
    }
    if (currentView === "search") {
      return searchResults;
    }
    return [...recentTracks, ...INITIAL_RECOMMENDED];
  }, [currentView, selectedPlaylist, likedSongs, playlistTracks, searchResults, recentTracks]);

  const handleNextTrack = () => {
    if (!activeTrack || currentQueue.length === 0) return;
    if (isShuffle) {
      const randIdx = Math.floor(Math.random() * currentQueue.length);
      playTrack(currentQueue[randIdx]);
      return;
    }
    const idx = currentQueue.findIndex((t) => t.id === activeTrack.id);
    if (idx !== -1 && idx + 1 < currentQueue.length) {
      playTrack(currentQueue[idx + 1]);
    } else if (isRepeat && currentQueue.length > 0) {
      playTrack(currentQueue[0]);
    }
  };

  const handlePrevTrack = () => {
    if (!activeTrack || currentQueue.length === 0) return;
    const idx = currentQueue.findIndex((t) => t.id === activeTrack.id);
    if (idx > 0) {
      playTrack(currentQueue[idx - 1]);
    }
  };

  // Toggle Like with YouTube sync
  const handleToggleLike = async (track: Track) => {
    const isCurrentlyLiked = likedTrackIds.has(track.id);
    const nextState = !isCurrentlyLiked;

    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (nextState) next.add(track.id);
      else next.delete(track.id);
      return next;
    });

    if (nextState) {
      setLikedSongs((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
    } else {
      setLikedSongs((prev) => prev.filter((t) => t.id !== track.id));
    }

    if (userProfile.is_authenticated) {
      try {
        await toggleYtLike(track.id, nextState);
      } catch (e) {
        console.error("YouTube like sync error:", e);
      }
    }
  };

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
      setSearchError(e instanceof Error ? e.message : "Arama yapılırken bir hata oluştu");
    } finally {
      setIsSearching(false);
    }
  };

  // Select Playlist from Sidebar
  const handleSelectPlaylist = async (pl: Playlist | "liked") => {
    if (pl === "liked" || (typeof pl !== "string" && pl.id === "LM")) {
      setSelectedPlaylist({ id: "liked", title: "Liked Songs", description: "YouTube Music" });
      setCurrentView("playlist");
      if (likedSongs.length === 0 && userProfile.is_authenticated) {
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

  const activePlaylistTracks = selectedPlaylist?.id === "liked" ? likedSongs : playlistTracks;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden select-none font-sans transition-colors ${
        isLight ? "bg-[#fafbfc] text-[#111111]" : "bg-[#030303] text-white"
      }`}
    >
      {/* 1. Custom Title Bar matching Screenshot 1 & 2 */}
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
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenSettings={handleOpenSettings}
      />

      {/* 2. Main Middle Workspace: Sidebar + Dynamic Content View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Spotify-style Sidebar */}
        <Sidebar
          selectedPlaylistId={selectedPlaylist ? selectedPlaylist.id : null}
          onSelectPlaylist={handleSelectPlaylist}
          likedSongsCount={likedSongs.length}
          playlists={playlists}
          userProfile={userProfile}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />

        {/* Right: Dynamic Views (Home, Playlist Detail, or Search) */}
        <main
          className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${
            isLight ? "bg-[#fafbfc]" : "bg-[#030303]"
          }`}
        >
          {playbackError && (
            <div className="mx-6 mt-3 p-3 rounded-xl bg-[#ff0000]/10 border border-[#ff0000]/30 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#ff0000]" />
                <span>{playbackError}</span>
              </div>
              <button
                onClick={() => setPlaybackError(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Kapat
              </button>
            </div>
          )}

          {/* VIEW 1: Playlist Detail View (Screenshot 2) */}
          {currentView === "playlist" && selectedPlaylist && (
            <PlaylistView
              playlist={selectedPlaylist}
              tracks={activePlaylistTracks}
              activeTrack={activeTrack}
              isPlaying={playbackStatus === "playing"}
              onPlayTrack={playTrack}
              onPlayAll={() => {
                if (activePlaylistTracks.length > 0) {
                  playTrack(activePlaylistTracks[0]);
                }
              }}
              onToggleShuffle={() => setIsShuffle((prev) => !prev)}
              isShuffle={isShuffle}
              onToggleLike={handleToggleLike}
              likedTrackIds={likedTrackIds}
              isLoadingTracks={isLoadingTracks}
              onBackToHome={() => {
                setSelectedPlaylist(null);
                setCurrentView("home");
              }}
            />
          )}

          {/* VIEW 2: Search View */}
          {currentView === "search" && (
            <div
              className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8 space-y-6 pb-24 transition-colors ${
                isLight ? "bg-[#fafbfc] text-[#111111]" : "bg-[#030303] text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-2xl font-bold tracking-tight ${
                    isLight ? "text-[#111111]" : "text-white"
                  }`}
                >
                  "{searchQuery}" Sonuçları
                </h2>
                <button
                  onClick={() => setCurrentView("home")}
                  className={`text-xs transition-colors cursor-pointer ${
                    isLight ? "text-[#6b7280] hover:text-[#111111]" : "text-[#888] hover:text-white"
                  }`}
                >
                  Ana Sayfaya Dön
                </button>
              </div>

              {isSearching ? (
                <div
                  className={`py-24 flex flex-col items-center justify-center gap-3 ${
                    isLight ? "text-[#6b7280]" : "text-slate-400"
                  }`}
                >
                  <Loader2 className="w-8 h-8 animate-spin text-[#ff0000]" />
                  <p className="text-xs">YouTube Music aranıyor...</p>
                </div>
              ) : searchError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div
                  className={`py-24 text-center space-y-2 ${
                    isLight ? "text-[#6b7280]" : "text-slate-500"
                  }`}
                >
                  <p className="text-sm">Sonuç bulunamadı.</p>
                  <p className="text-xs">Lütfen farklı bir şarkı veya sanatçı adı deneyin.</p>
                </div>
              ) : (
                <div className={`divide-y ${isLight ? "divide-[#e5e7eb]" : "divide-[#181818]"}`}>
                  {searchResults.map((track, idx) => {
                    const isActive = activeTrack?.id === track.id;
                    const isLiked = likedTrackIds.has(track.id);

                    return (
                      <div
                        key={`search-${track.id}-${idx}`}
                        onClick={() => playTrack(track)}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer ${
                          isActive
                            ? isLight
                              ? "bg-[#f3f4f6]"
                              : "bg-[#202020]"
                            : isLight
                            ? "hover:bg-[#f3f4f6]"
                            : "hover:bg-[#141414]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 ${
                              isLight ? "bg-[#e5e7eb]" : "bg-[#222]"
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
                          </div>

                          <div className="min-w-0">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isActive
                                  ? "text-[#ff0000]"
                                  : isLight
                                  ? "text-[#111111]"
                                  : "text-white"
                              }`}
                            >
                              {track.title}
                            </h4>
                            <p
                              className={`text-[11px] truncate mt-0.5 ${
                                isLight ? "text-[#6b7280]" : "text-[#888888]"
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
                              handleToggleLike(track);
                            }}
                            className={`p-1.5 transition-colors cursor-pointer ${
                              isLight
                                ? "text-[#9ca3af] hover:text-[#ff0000]"
                                : "text-[#666] hover:text-[#ff0000]"
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isLiked ? "text-[#ff0000] fill-[#ff0000]" : ""
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-mono ${
                              isLight ? "text-[#6b7280]" : "text-[#777]"
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

          {/* VIEW 3: Home View (Screenshot 1) */}
          {currentView === "home" && (
            <HomeView
              recentlyPlayed={recentTracks}
              recommendations={INITIAL_RECOMMENDED}
              listenAgain={INITIAL_LISTEN_AGAIN}
              activeTrack={activeTrack}
              isPlaying={playbackStatus === "playing"}
              onPlayTrack={playTrack}
            />
          )}
        </main>
      </div>

      {/* 3. Bottom Player Bar matching Screenshot 1 & 2 */}
      <PlayerBar
        track={activeTrack}
        status={playbackStatus}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isMiniPlayer={isMiniPlayer}
        isLiked={activeTrack ? likedTrackIds.has(activeTrack.id) : false}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleMiniPlayer={() => setIsMiniPlayer((prev) => !prev)}
        onToggleLike={() => activeTrack && handleToggleLike(activeTrack)}
        onToggleShuffle={() => setIsShuffle((prev) => !prev)}
        onToggleRepeat={() => setIsRepeat((prev) => !prev)}
      />

      {/* 4. Mini Player HUD overlay for gaming */}
      {isMiniPlayer && activeTrack && (
        <MiniPlayerHUD
          track={activeTrack}
          status={playbackStatus}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onNext={handleNextTrack}
          onPrev={handlePrevTrack}
          onClose={() => setIsMiniPlayer(false)}
        />
      )}

      {/* 5. Google Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 6. Settings Modal (Account, Appearance, Window) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
        userProfile={userProfile}
        likedSongsCount={likedSongs.length}
        playlistsCount={playlists.length}
        onLogout={handleLogout}
        onOpenLogin={() => {
          setIsSettingsModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />
    </div>
  );
}

export default App;
