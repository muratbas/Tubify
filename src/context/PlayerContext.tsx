import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Track, PlaybackStatus, RightDrawerTab, MoodCategory } from "../types/music";
import { getStreamUrl, toggleYtLike } from "../services/api";

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

interface PlayerContextType {
  activeTrack: Track | null;
  playbackStatus: PlaybackStatus;
  playbackError: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  queue: Track[];
  is16x9Aspect: boolean;
  isRightDrawerOpen: boolean;
  rightDrawerTab: RightDrawerTab;
  isSidebarCollapsed: boolean;
  activeMood: MoodCategory;
  isMiniPlayer: boolean;
  likedTrackIds: Set<string>;
  recentTracks: Track[];

  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggle16x9Aspect: () => void;
  toggleRightDrawer: (tab?: RightDrawerTab) => void;
  setRightDrawerTab: (tab: RightDrawerTab) => void;
  toggleSidebarCollapsed: () => void;
  setActiveMood: (mood: MoodCategory) => void;
  toggleMiniPlayer: () => void;
  toggleLike: (track: Track, isAuthenticated?: boolean) => Promise<void>;
  setQueue: (tracks: Track[]) => void;
  clearPlaybackError: () => void;
  syncLikedIds: (ids: string[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [queue, setQueueState] = useState<Track[]>([]);

  // Desktop Panels & Layout State
  const [is16x9Aspect, setIs16x9Aspect] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [rightDrawerTab, setRightDrawerTabState] = useState<RightDrawerTab>("nowPlaying");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMood, setActiveMood] = useState<MoodCategory>("all");
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  // Liked Track IDs
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("tubify_liked_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Recently played
  const [recentTracks, setRecentTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("tubify_recent_tracks");
      return saved ? JSON.parse(saved) : INITIAL_RECENT;
    } catch {
      return INITIAL_RECENT;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  currentTrackRef.current = activeTrack;

  const queueRef = useRef<Track[]>([]);
  queueRef.current = queue;

  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;

  const isRepeatRef = useRef(isRepeat);
  isRepeatRef.current = isRepeat;

  // Preloading & Stream Caching Refs
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedTrackRef = useRef<{ trackId: string; url: string } | null>(null);
  const streamCacheRef = useRef<Map<string, { url: string; timestamp: number }>>(new Map());
  const upcomingTrackRef = useRef<Track | null>(null);

  // Sync liked IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tubify_liked_ids", JSON.stringify(Array.from(likedTrackIds)));
    } catch (e) {
      console.error("Failed to store liked track IDs:", e);
    }
  }, [likedTrackIds]);

  // Determine the upcoming candidate track in queue
  const getUpcomingTrack = useCallback((): Track | null => {
    const curQueue = queueRef.current;
    const curTrack = currentTrackRef.current;
    if (!curTrack || curQueue.length === 0) return null;

    if (isShuffleRef.current) {
      if (curQueue.length <= 1) return isRepeatRef.current ? curTrack : null;
      const candidates = curQueue.filter((t) => t.id !== curTrack.id);
      if (candidates.length === 0) return isRepeatRef.current ? curTrack : null;
      const randIdx = Math.floor(Math.random() * candidates.length);
      return candidates[randIdx];
    }

    const idx = curQueue.findIndex((t) => t.id === curTrack.id);
    if (idx !== -1 && idx + 1 < curQueue.length) {
      return curQueue[idx + 1];
    } else if (isRepeatRef.current && curQueue.length > 0) {
      return curQueue[0];
    }
    return null;
  }, []);

  // Preload upcoming track stream & audio buffer
  const preloadUpcoming = useCallback(async () => {
    const candidate = getUpcomingTrack();
    if (!candidate) {
      upcomingTrackRef.current = null;
      return;
    }

    upcomingTrackRef.current = candidate;

    // Skip if already preloaded
    if (preloadedTrackRef.current?.trackId === candidate.id) {
      return;
    }

    try {
      let streamUrl = "";
      const cached = streamCacheRef.current.get(candidate.id);
      if (cached && Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
        streamUrl = cached.url;
      } else {
        const stream = await getStreamUrl(candidate.id);
        streamUrl = stream.url;
        streamCacheRef.current.set(candidate.id, { url: streamUrl, timestamp: Date.now() });
      }

      // Pre-buffer in secondary invisible audio element
      if (!preloadAudioRef.current) {
        const pAudio = new Audio();
        pAudio.preload = "auto";
        pAudio.volume = 0;
        pAudio.muted = true;
        preloadAudioRef.current = pAudio;
      }

      preloadAudioRef.current.src = streamUrl;
      preloadAudioRef.current.load();
      preloadedTrackRef.current = { trackId: candidate.id, url: streamUrl };
    } catch (e) {
      console.warn("Silent preload failed for next track:", candidate.title, e);
    }
  }, [getUpcomingTrack]);

  // Next track resolver
  const nextTrack = useCallback(() => {
    const curQueue = queueRef.current;
    const curTrack = currentTrackRef.current;
    if (!curTrack || curQueue.length === 0) return;

    // 1. FAST PATH: If an upcoming preloaded track is ready, play it seamlessly!
    const upcoming = upcomingTrackRef.current;
    if (upcoming && curQueue.some((t) => t.id === upcoming.id)) {
      upcomingTrackRef.current = null;
      playTrackInternal(upcoming);
      return;
    }

    // 2. Fallback if upcoming was not pre-determined
    if (isShuffleRef.current) {
      const candidates = curQueue.filter((t) => t.id !== curTrack.id);
      const randTrack =
        candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : curQueue[0];
      playTrackInternal(randTrack);
      return;
    }

    const idx = curQueue.findIndex((t) => t.id === curTrack.id);
    if (idx !== -1 && idx + 1 < curQueue.length) {
      playTrackInternal(curQueue[idx + 1]);
    } else if (isRepeatRef.current && curQueue.length > 0) {
      playTrackInternal(curQueue[0]);
    } else {
      setPlaybackStatus("paused");
    }
  }, []);

  const prevTrack = useCallback(() => {
    const curQueue = queueRef.current;
    const curTrack = currentTrackRef.current;
    if (!curTrack || curQueue.length === 0) return;

    const idx = curQueue.findIndex((t) => t.id === curTrack.id);
    if (idx > 0) {
      playTrackInternal(curQueue[idx - 1]);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, []);

  const nextTrackRef = useRef(nextTrack);
  nextTrackRef.current = nextTrack;

  // Initialize HTMLAudioElement ONCE on mount
  useEffect(() => {
    const audio = new Audio();
    const initVol = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    audio.volume = !isNaN(initVol) ? initVol : 0.85;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaybackStatus("playing");
    const onPause = () => setPlaybackStatus("paused");
    const onEnded = () => {
      setPlaybackStatus("paused");
      nextTrackRef.current();
    };
    const onError = () => {
      setPlaybackStatus("error");
      setPlaybackError("Audio stream could not be loaded. Trying backup route...");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      if (preloadAudioRef.current) {
        preloadAudioRef.current.src = "";
        preloadAudioRef.current = null;
      }
    };
  }, []);

  // Separate effect to handle volume & mute changes without resetting audio element
  useEffect(() => {
    if (audioRef.current) {
      const targetVol = isMuted ? 0 : Math.max(0, Math.min(1, volume));
      if (!isNaN(targetVol) && isFinite(targetVol)) {
        audioRef.current.volume = targetVol;
      }
    }
  }, [volume, isMuted]);

  // Preload upcoming track 3 seconds after current track enters playing state
  useEffect(() => {
    if (!activeTrack || playbackStatus !== "playing") return;

    const timer = window.setTimeout(() => {
      preloadUpcoming();
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTrack?.id, playbackStatus, queue, isShuffle, isRepeat, preloadUpcoming]);

  const playTrackInternal = async (track: Track) => {
    if (!audioRef.current) return;
    setActiveTrack(track);
    setPlaybackError(null);

    // Save to recents
    setRecentTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 10);
      try {
        localStorage.setItem("tubify_recent_tracks", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // 1. INSTANT SWAP: If track is already preloaded and buffered, play immediately!
    if (preloadedTrackRef.current && preloadedTrackRef.current.trackId === track.id) {
      const preloadedUrl = preloadedTrackRef.current.url;
      preloadedTrackRef.current = null; // Consumed

      try {
        audioRef.current.src = preloadedUrl;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setPlaybackStatus("playing");
        return;
      } catch (e) {
        console.warn("Instant playback from preloaded buffer failed, falling back to fresh fetch:", e);
      }
    }

    // 2. MEMORY CACHE PATH: Check if stream URL is in memory cache
    const cached = streamCacheRef.current.get(track.id);
    if (cached && Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
      try {
        audioRef.current.src = cached.url;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setPlaybackStatus("playing");
        return;
      } catch {
        // Fallback to fresh network fetch
      }
    }

    // 3. NORMAL PATH: Fresh network fetch
    setPlaybackStatus("loading");
    try {
      const stream = await getStreamUrl(track.id);
      streamCacheRef.current.set(track.id, { url: stream.url, timestamp: Date.now() });
      if (audioRef.current) {
        audioRef.current.src = stream.url;
        await audioRef.current.play();
        setPlaybackStatus("playing");
      }
    } catch (err: unknown) {
      setPlaybackStatus("error");
      setPlaybackError(err instanceof Error ? err.message : "Failed to load audio stream");
    }
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    if (newQueue && newQueue.length > 0) {
      setQueueState(newQueue);
    }
    await playTrackInternal(track);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !activeTrack) return;
    if (playbackStatus === "playing") {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (vol: number) => {
    const num = isNaN(vol) ? 0.85 : vol;
    const clamped = Math.max(0, Math.min(1, num));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      const vol = volume > 0 ? Math.min(1, volume) : 0.85;
      audioRef.current.volume = vol;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleShuffle = () => setIsShuffle((prev) => !prev);
  const toggleRepeat = () => setIsRepeat((prev) => !prev);
  const toggle16x9Aspect = () => setIs16x9Aspect((prev) => !prev);

  const toggleRightDrawer = (tab?: RightDrawerTab) => {
    if (tab) {
      setRightDrawerTabState(tab);
      setIsRightDrawerOpen(true);
    } else {
      setIsRightDrawerOpen((prev) => !prev);
    }
  };

  const setRightDrawerTab = (tab: RightDrawerTab) => {
    setRightDrawerTabState(tab);
    if (!isRightDrawerOpen) setIsRightDrawerOpen(true);
  };

  const toggleSidebarCollapsed = () => setIsSidebarCollapsed((prev) => !prev);
  const toggleMiniPlayer = () => setIsMiniPlayer((prev) => !prev);
  const clearPlaybackError = () => setPlaybackError(null);

  const toggleLike = async (track: Track, isAuthenticated = false) => {
    const isCurrentlyLiked = likedTrackIds.has(track.id);
    const nextState = !isCurrentlyLiked;

    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (nextState) next.add(track.id);
      else next.delete(track.id);
      return next;
    });

    if (isAuthenticated) {
      try {
        await toggleYtLike(track.id, nextState);
      } catch (e) {
        console.error("YouTube like sync error:", e);
      }
    }
  };

  const syncLikedIds = (ids: string[]) => {
    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const setQueue = (tracks: Track[]) => {
    setQueueState(tracks);
  };

  return (
    <PlayerContext.Provider
      value={{
        activeTrack,
        playbackStatus,
        playbackError,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isRepeat,
        queue,
        is16x9Aspect,
        isRightDrawerOpen,
        rightDrawerTab,
        isSidebarCollapsed,
        activeMood,
        isMiniPlayer,
        likedTrackIds,
        recentTracks,
        playTrack,
        togglePlayPause,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
        toggleShuffle,
        toggleRepeat,
        toggle16x9Aspect,
        toggleRightDrawer,
        setRightDrawerTab,
        toggleSidebarCollapsed,
        setActiveMood,
        toggleMiniPlayer,
        toggleLike,
        setQueue,
        clearPlaybackError,
        syncLikedIds,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextType {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
