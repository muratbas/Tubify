import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { TrackCard } from "./components/TrackCard";
import { PlayerBar } from "./components/PlayerBar";
import { MiniPlayerHUD } from "./components/MiniPlayerHUD";
import { LoginModal } from "./components/LoginModal";
import {
  searchMusic,
  getStreamUrl,
  getClientVersion,
  getUserProfile,
  logoutGoogle,
  getYtLikedSongs,
  getYtPlaylists,
  toggleYtLike,
} from "./services/api";
import type { Track, StreamInfo, PlaybackStatus, UserProfile, Playlist } from "./types/music";
import {
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  ListMusic,
  Music,
  Heart,
  LogIn,
  Disc3,
  RotateCcw,
} from "lucide-react";

export function App() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // User Profile & Google Auth
  const [userProfile, setUserProfile] = useState<UserProfile>({ is_authenticated: false });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Local Favorites
  const [favorites, setFavorites] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("tubify_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentTab, setCurrentTab] = useState<string>("explore");
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [clientVersion, setClientVersion] = useState("Tubify v0.1.0");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const quickTags = ["Daft Punk", "Lofi Hip Hop", "Synthwave 80s", "Gaming EDM", "The Weeknd", "Hans Zimmer"];

  // Initialize Client Version & User Profile
  useEffect(() => {
    getClientVersion().then(setClientVersion).catch(console.error);
    getUserProfile()
      .then((prof) => {
        setUserProfile(prof);
        if (prof.is_authenticated) {
          loadUserData();
        }
      })
      .catch(console.error);
  }, []);

  // Sync favorites with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tubify_favorites", JSON.stringify(favorites));
    } catch (e) {
      console.error("Failed to save favorites", e);
    }
  }, [favorites]);

  const loadUserData = async () => {
    setIsLoadingLibrary(true);
    try {
      const [liked, pls] = await Promise.allSettled([getYtLikedSongs(), getYtPlaylists()]);
      if (liked.status === "fulfilled") {
        setLikedSongs(liked.value);
      }
      if (pls.status === "fulfilled") {
        setPlaylists(pls.value);
      }
    } catch (e) {
      console.error("Error loading user data", e);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    loadUserData();
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUserProfile({ is_authenticated: false });
    setLikedSongs([]);
    setPlaylists([]);
    if (currentTab === "liked" || currentTab === "library") {
      setCurrentTab("explore");
    }
  };

  // Audio element setup
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = isMuted ? 0 : volume;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => setPlaybackStatus("playing");
    const onPause = () => setPlaybackStatus("paused");
    const onEnded = () => handleNextTrack();
    const onError = () => {
      setPlaybackStatus("error");
      setPlaybackError("Ses akışı başlatılamadı veya CDN bağlantısı koptu.");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, []);

  // Perform search
  const handleSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setIsSearching(true);
    setSearchError(null);
    setCurrentTab("explore");

    try {
      const results = await searchMusic(term);
      setTracks(results);
      if (results.length === 0) {
        setSearchError("Sonuç bulunamadı. Lütfen başka bir arama terimi deneyin.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchError(`Arama hatası: ${msg}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Play a track
  const handlePlayTrack = async (track: Track) => {
    if (!audioRef.current) return;

    if (activeTrack?.id === track.id) {
      if (playbackStatus === "paused") {
        audioRef.current.play().catch(console.error);
        return;
      } else if (playbackStatus === "playing") {
        audioRef.current.pause();
        return;
      }
    }

    setActiveTrack(track);
    setPlaybackStatus("loading");
    setPlaybackError(null);
    setCurrentTime(0);

    try {
      const stream = await getStreamUrl(track.id);
      setStreamInfo(stream);

      audioRef.current.src = stream.url;
      audioRef.current.load();
      await audioRef.current.play();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPlaybackStatus("error");
      setPlaybackError(`Ses linki çözümlenemedi: ${msg}`);
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

  const getActiveList = useCallback(() => {
    if (currentTab === "favorites") return favorites;
    if (currentTab === "liked") return likedSongs;
    return tracks;
  }, [currentTab, favorites, likedSongs, tracks]);

  const handleNextTrack = useCallback(() => {
    if (!activeTrack) return;
    const list = getActiveList();
    const currentIndex = list.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex >= 0 && currentIndex < list.length - 1) {
      handlePlayTrack(list[currentIndex + 1]);
    } else if (list.length > 0) {
      handlePlayTrack(list[0]);
    }
  }, [activeTrack, getActiveList]);

  const handlePrevTrack = useCallback(() => {
    if (!activeTrack) return;
    const list = getActiveList();
    const currentIndex = list.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex > 0) {
      handlePlayTrack(list[currentIndex - 1]);
    } else if (list.length > 0) {
      handlePlayTrack(list[list.length - 1]);
    }
  }, [activeTrack, getActiveList]);

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      audioRef.current.volume = volume;
    } else {
      setIsMuted(true);
      audioRef.current.volume = 0;
    }
  };

  // Toggle favorite & sync with YouTube Music if authenticated
  const handleToggleFavorite = async (track: Track) => {
    const isFav = favorites.some((t) => t.id === track.id) || likedSongs.some((t) => t.id === track.id);
    const newLikedState = !isFav;

    setFavorites((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      return exists ? prev.filter((t) => t.id !== track.id) : [track, ...prev];
    });

    if (userProfile.is_authenticated) {
      setLikedSongs((prev) => {
        const exists = prev.some((t) => t.id === track.id);
        return exists ? prev.filter((t) => t.id !== track.id) : [track, ...prev];
      });

      // Send 2-way sync to YouTube Music API
      try {
        await toggleYtLike(track.id, newLikedState);
      } catch (e) {
        console.warn("YouTube Music sync error:", e);
      }
    }
  };

  useEffect(() => {
    handleSearch("Daft Punk");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "ArrowRight") {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5);
        }
      } else if (e.code === "ArrowLeft") {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
        }
      } else if (e.key === "m" || e.key === "M") {
        handleToggleMute();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause]);

  return (
    <div className="flex h-screen w-screen bg-[#090c12] text-slate-100 overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab === "liked" || tab === "library") {
            if (userProfile.is_authenticated && likedSongs.length === 0) {
              loadUserData();
            }
          }
        }}
        favoritesCount={favorites.length}
        likedSongsCount={likedSongs.length}
        userProfile={userProfile}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0d14]">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-[#1b2333] px-8 flex items-center justify-between gap-4 bg-[#0a0d14]/90 backdrop-blur-md z-20 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative flex-1 max-w-xl group"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Şarkı, sanatçı veya albüm ara... (Ctrl+K)"
              className="w-full bg-[#131926] hover:bg-[#182133] focus:bg-[#182133] border border-[#212b3e] focus:border-emerald-500/60 rounded-xl py-2.5 pl-11 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-3">
            {userProfile.is_authenticated && (
              <button
                onClick={loadUserData}
                disabled={isLoadingLibrary}
                className="text-xs p-2 rounded-lg bg-[#141b29] hover:bg-[#1c2436] text-slate-400 hover:text-emerald-400 border border-[#20293d] transition-all"
                title="Kütüphaneyi Yenile"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoadingLibrary ? "animate-spin" : ""}`} />
              </button>
            )}
            <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 hidden md:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {clientVersion}
            </span>
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Quick Category Chips (Explore Tab) */}
          {currentTab === "explore" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-slate-500 mr-1 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Önerilen:
              </span>
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    handleSearch(tag);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#141b29] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-[#20293d] hover:border-emerald-500/40 transition-all shrink-0 active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Error Messages */}
          {searchError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {playbackError && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 text-amber-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{playbackError}</span>
            </div>
          )}

          {/* TAB 1: EXPLORE & SEARCH */}
          {currentTab === "explore" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <ListMusic className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white tracking-wide">Arama Sonuçları</h2>
                <span className="text-xs bg-[#161e2e] text-slate-400 px-2 py-0.5 rounded-md font-mono">
                  {tracks.length} parça
                </span>
              </div>

              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <p className="text-sm font-medium">YouTube Music InnerTube taranıyor...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isActive={activeTrack?.id === track.id}
                      isPlaying={playbackStatus === "playing"}
                      isFavorite={favorites.some((f) => f.id === track.id) || likedSongs.some((f) => f.id === track.id)}
                      onPlay={handlePlayTrack}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIKED SONGS (YouTube Music) */}
          {currentTab === "liked" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  <h2 className="text-lg font-bold text-white tracking-wide">Beğenilen Şarkılarım</h2>
                  <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md font-mono border border-rose-500/20">
                    YouTube Music {likedSongs.length > 0 ? `(${likedSongs.length})` : ""}
                  </span>
                </div>
              </div>

              {!userProfile.is_authenticated ? (
                <div className="text-center py-24 bg-[#0e131d] rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
                    <Heart className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">YouTube Music Hesabınızı Bağlayın</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Beğendiğiniz tüm şarkıları Tubify'da listelemek ve dinlemek için Google hesabınızla giriş yapın.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="inline-flex items-center gap-2 py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    <LogIn className="w-4 h-4" />
                    Google ile Giriş Yap
                  </button>
                </div>
              ) : isLoadingLibrary ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                  <p className="text-sm font-medium">Beğenilen şarkılarınız YouTube Music'ten çekiliyor...</p>
                </div>
              ) : likedSongs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {likedSongs.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isActive={activeTrack?.id === track.id}
                      isPlaying={playbackStatus === "playing"}
                      isFavorite={true}
                      onPlay={handlePlayTrack}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500">
                  <p>Henüz beğenilen parça bulunamadı veya kütüphane boş.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLAYLISTS (YouTube Music) */}
          {currentTab === "library" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Disc3 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white tracking-wide">Çalma Listelerim</h2>
                <span className="text-xs bg-[#161e2e] text-slate-400 px-2 py-0.5 rounded-md font-mono">
                  {playlists.length} liste
                </span>
              </div>

              {!userProfile.is_authenticated ? (
                <div className="text-center py-24 bg-[#0e131d] rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                    <Disc3 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Çalma Listelerinizi Eşitleyin</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Özel çalma listelerinizi görmek ve kesintisiz dinlemek için giriş yapın.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="inline-flex items-center gap-2 py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    <LogIn className="w-4 h-4" />
                    Google ile Giriş Yap
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => {
                        if (pl.id === "LM") {
                          setCurrentTab("liked");
                        }
                      }}
                      className="group bg-[#131926] hover:bg-[#1c2436] p-4 rounded-xl border border-[#1e2638] hover:border-emerald-500/40 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#090d14] mb-3 flex items-center justify-center">
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt={pl.title} className="w-full h-full object-cover" />
                        ) : (
                          <Disc3 className="w-10 h-10 text-emerald-400/80" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {pl.title}
                        </h4>
                        {pl.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{pl.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LOCAL FAVORITES */}
          {currentTab === "favorites" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Heart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white tracking-wide">Lokal Favorilerim</h2>
                <span className="text-xs bg-[#161e2e] text-slate-400 px-2 py-0.5 rounded-md font-mono">
                  {favorites.length} parça
                </span>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-24 text-slate-500 space-y-2">
                  <Music className="w-12 h-12 mx-auto stroke-slate-600" />
                  <h3 className="text-base font-semibold text-slate-300">Henüz lokal favori eklenmedi</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Şarkıların üzerindeki kalp simgesine basarak parçaları favorilere ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {favorites.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isActive={activeTrack?.id === track.id}
                      isPlaying={playbackStatus === "playing"}
                      isFavorite={true}
                      onPlay={handlePlayTrack}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Bottom Audio Player Bar */}
        <PlayerBar
          track={activeTrack}
          status={playbackStatus}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isMiniPlayer={isMiniPlayer}
          streamFormat={streamInfo?.format}
          onPlayPause={handlePlayPause}
          onNext={handleNextTrack}
          onPrev={handlePrevTrack}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleMiniPlayer={() => setIsMiniPlayer((prev) => !prev)}
        />
      </div>

      {/* Mini Player HUD Overlay (Gaming HUD Mode) */}
      {isMiniPlayer && (
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

      {/* Google Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
