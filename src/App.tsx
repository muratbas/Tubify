import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { TrackCard } from "./components/TrackCard";
import { PlayerBar } from "./components/PlayerBar";
import { MiniPlayerHUD } from "./components/MiniPlayerHUD";
import { searchMusic, getStreamUrl, getClientVersion } from "./services/api";
import type { Track, StreamInfo, PlaybackStatus } from "./types/music";
import { Search, Loader2, Sparkles, AlertCircle, X, ListMusic, Music } from "lucide-react";

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

  // Quick genre tags for fast gaming exploration
  const quickTags = ["Daft Punk", "Lofi Hip Hop", "Synthwave 80s", "Gaming EDM", "The Weeknd", "Hans Zimmer"];

  // Initialize Client Version
  useEffect(() => {
    getClientVersion().then(setClientVersion).catch(console.error);
  }, []);

  // Sync favorites with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tubify_favorites", JSON.stringify(favorites));
    } catch (e) {
      console.error("Failed to save favorites", e);
    }
  }, [favorites]);

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

    const onEnded = () => {
      handleNextTrack();
    };

    const onError = () => {
      console.error("Audio playback error:", audio.error);
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

  // Perform YouTube search
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
      console.error("Search error:", msg);
      setSearchError(`Arama hatası: ${msg}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Play a track
  const handlePlayTrack = async (track: Track) => {
    if (!audioRef.current) return;

    // If same track is already paused, simply play it
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
      console.error("Play error:", msg);
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

  const handleNextTrack = useCallback(() => {
    if (!activeTrack) return;
    const currentList = currentTab === "favorites" ? favorites : tracks;
    const currentIndex = currentList.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex >= 0 && currentIndex < currentList.length - 1) {
      handlePlayTrack(currentList[currentIndex + 1]);
    } else if (currentList.length > 0) {
      handlePlayTrack(currentList[0]);
    }
  }, [activeTrack, currentTab, favorites, tracks]);

  const handlePrevTrack = useCallback(() => {
    if (!activeTrack) return;
    const currentList = currentTab === "favorites" ? favorites : tracks;
    const currentIndex = currentList.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex > 0) {
      handlePlayTrack(currentList[currentIndex - 1]);
    } else if (currentList.length > 0) {
      handlePlayTrack(currentList[currentList.length - 1]);
    }
  }, [activeTrack, currentTab, favorites, tracks]);

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

  const handleToggleFavorite = (track: Track) => {
    setFavorites((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) {
        return prev.filter((t) => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  };

  // Initial popular search on load
  useEffect(() => {
    handleSearch("Daft Punk");
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside input
      if (e.target instanceof HTMLInputElement) return;

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

  const displayedTracks = currentTab === "favorites" ? favorites : tracks;

  return (
    <div className="flex h-screen w-screen bg-[#090c12] text-slate-100 overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        favoritesCount={favorites.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0d14]">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-[#1b2333] px-8 flex items-center justify-between gap-4 bg-[#0a0d14]/90 backdrop-blur-md z-20 shrink-0">
          {/* Search Box */}
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

          {/* Quick Tags / Info */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 hidden md:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {clientVersion}
            </span>
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Quick Category Chips */}
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

          {/* Error Message */}
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

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ListMusic className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                {currentTab === "favorites" ? "Favori Şarkılarım" : "Arama Sonuçları"}
              </h2>
              <span className="text-xs bg-[#161e2e] text-slate-400 px-2 py-0.5 rounded-md font-mono">
                {displayedTracks.length} parça
              </span>
            </div>
          </div>

          {/* Loading Skeleton / Spinner */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium">YouTube Music InnerTube katalogu taranıyor...</p>
            </div>
          )}

          {/* Empty state for favorites */}
          {!isSearching && currentTab === "favorites" && favorites.length === 0 && (
            <div className="text-center py-24 text-slate-500 space-y-2">
              <Music className="w-12 h-12 mx-auto stroke-slate-600" />
              <h3 className="text-base font-semibold text-slate-300">Henüz favori şarkı eklenmedi</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Beğendiğiniz parçaların üzerindeki kalp simgesine basarak buraya ekleyebilirsiniz.
              </p>
            </div>
          )}

          {/* Track Grid */}
          {!isSearching && displayedTracks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isActive={activeTrack?.id === track.id}
                  isPlaying={playbackStatus === "playing"}
                  isFavorite={favorites.some((f) => f.id === track.id)}
                  onPlay={handlePlayTrack}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
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
    </div>
  );
}

export default App;
