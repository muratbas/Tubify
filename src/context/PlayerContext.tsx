import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Track, PlaybackStatus, RightDrawerTab, QueueViewMode, MoodCategory, RepeatMode } from "../types/music";
import {
  getStreamUrl,
  toggleYtLike,
  getRadioTracks,
  updateMediaMetadata,
} from "../services/api";

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
  repeatMode: RepeatMode;
  queue: Track[];
  is16x9Aspect: boolean;
  isRightDrawerOpen: boolean;
  rightDrawerTab: RightDrawerTab;
  queueViewMode: QueueViewMode;
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
  setQueueViewMode: (mode: QueueViewMode) => void;
  toggleQueue: () => void;
  clearQueue: () => void;
  saveQueueAsPlaylist: () => void;
  toggleSidebarCollapsed: () => void;
  setActiveMood: (mood: MoodCategory) => void;
  toggleMiniPlayer: () => void;
  toggleLike: (track: Track, isAuthenticated?: boolean) => Promise<void>;
  setQueue: (tracks: Track[]) => void;
  clearPlaybackError: () => void;
  syncLikedIds: (ids: string[]) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  startRadio: (track: Track) => Promise<void>;
  removeFromQueue: (trackId: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tubify_volume");
      if (saved !== null) {
        let val = parseFloat(saved);
        if (!isNaN(val)) {
          if (val > 1 && val <= 100) val = val / 100;
          if (val >= 0 && val <= 1) return val;
        }
      }
    } catch {}
    return 0.85;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tubify_muted") === "true";
    } catch {
      return false;
    }
  });
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem("tubify_repeat_mode");
      if (saved === "all" || saved === "one") return saved;
    } catch {}
    return "off";
  });
  const isRepeat = repeatMode !== "off";
  const [queue, setQueueState] = useState<Track[]>([]);

  // Desktop Panels & Layout State
  const [is16x9Aspect, setIs16x9Aspect] = useState(false);
  const [queueViewMode, setQueueViewMode] = useState<QueueViewMode>("closed");
  const isRightDrawerOpen = queueViewMode !== "closed";
  const [rightDrawerTab, setRightDrawerTabState] = useState<RightDrawerTab>("queue");
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

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;

  const isRepeatRef = useRef(isRepeat);
  isRepeatRef.current = isRepeat;

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

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

  // Sync volume and mute settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tubify_volume", String(volume));
      localStorage.setItem("tubify_muted", String(isMuted));
    } catch {}
  }, [volume, isMuted]);

  // Determine the upcoming candidate track in queue
  const getUpcomingTrack = useCallback((): Track | null => {
    const curQueue = queueRef.current;
    const curTrack = currentTrackRef.current;
    if (!curTrack || curQueue.length === 0) return null;

    if (repeatModeRef.current === "one") {
      return curTrack;
    }

    if (isShuffleRef.current) {
      if (curQueue.length <= 1) return repeatModeRef.current === "all" ? curTrack : null;
      const candidates = curQueue.filter((t) => t.id !== curTrack.id);
      if (candidates.length === 0) return repeatModeRef.current === "all" ? curTrack : null;
      const randIdx = Math.floor(Math.random() * candidates.length);
      return candidates[randIdx];
    }

    const idx = curQueue.findIndex((t) => t.id === curTrack.id);
    if (idx !== -1 && idx + 1 < curQueue.length) {
      return curQueue[idx + 1];
    } else if (repeatModeRef.current === "all" && curQueue.length > 0) {
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
      const targetVol = isMutedRef.current ? 0 : volumeRef.current;
      if (!preloadAudioRef.current) {
        const pAudio = new Audio();
        pAudio.preload = "auto";
        pAudio.volume = targetVol;
        pAudio.muted = true;
        preloadAudioRef.current = pAudio;
      } else {
        preloadAudioRef.current.volume = targetVol;
      }

      preloadAudioRef.current.src = streamUrl;
      preloadAudioRef.current.load();
      preloadedTrackRef.current = { trackId: candidate.id, url: streamUrl };
    } catch (e) {
      console.warn("Silent preload failed for next track:", candidate.title, e);
    }
  }, [getUpcomingTrack]);

  const lastNextTimeRef = useRef(0);
  const lastPrevTimeRef = useRef(0);

  // Next track resolver with debounce guard
  const nextTrack = useCallback(() => {
    const now = Date.now();
    if (now - lastNextTimeRef.current < 450) {
      return;
    }
    lastNextTimeRef.current = now;

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
    } else if (repeatModeRef.current === "all" && curQueue.length > 0) {
      playTrackInternal(curQueue[0]);
    } else if (repeatModeRef.current === "one" && curTrack) {
      playTrackInternal(curTrack);
    } else {
      setPlaybackStatus("paused");
    }
  }, []);

  const prevTrack = useCallback(() => {
    const now = Date.now();
    if (now - lastPrevTimeRef.current < 450) {
      return;
    }
    lastPrevTimeRef.current = now;

    const curQueue = queueRef.current;
    const curTrack = currentTrackRef.current;
    if (!curTrack || curQueue.length === 0) return;

    // If currently playing track has played for more than 3 seconds, rewind to the beginning
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

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

  const prevTrackRef = useRef(prevTrack);
  prevTrackRef.current = prevTrack;

  const togglePlayPauseRef = useRef<() => void>(() => {});

  // Initialize HTMLAudioElement ONCE on mount
  useEffect(() => {
    const audio = new Audio();
    const initVol = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    audio.volume = !isNaN(initVol) ? initVol : 0.85;
    audioRef.current = audio;

    const enforceVolume = () => {
      const target = isMutedRef.current ? 0 : volumeRef.current;
      if (!isNaN(target) && isFinite(target) && Math.abs(audio.volume - target) > 0.005) {
        audio.volume = target;
      }
    };

    const onTimeUpdate = () => {
      enforceVolume();
      setCurrentTime(audio.currentTime);
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      enforceVolume();
      setPlaybackStatus("playing");
    };
    const onPause = () => setPlaybackStatus("paused");
    const onEnded = () => {
      if (repeatModeRef.current === "one") {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          enforceVolume();
          audioRef.current.play().catch(console.error);
        }
        return;
      }
      setPlaybackStatus("paused");
      nextTrackRef.current();
    };
    const onError = () => {
      setPlaybackStatus("error");
      setPlaybackError("Audio stream could not be loaded. Trying backup route...");
    };
    const onVolumeChange = () => {
      enforceVolume();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", enforceVolume);
    audio.addEventListener("loadedmetadata", enforceVolume);
    audio.addEventListener("canplay", enforceVolume);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("volumechange", onVolumeChange);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", enforceVolume);
      audio.removeEventListener("loadedmetadata", enforceVolume);
      audio.removeEventListener("canplay", enforceVolume);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("volumechange", onVolumeChange);
      if (preloadAudioRef.current) {
        preloadAudioRef.current.src = "";
        preloadAudioRef.current = null;
      }
    };
  }, []);

  // Separate effect to handle volume & mute changes without resetting audio element
  useEffect(() => {
    const targetVol = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    if (!isNaN(targetVol) && isFinite(targetVol)) {
      if (audioRef.current && Math.abs(audioRef.current.volume - targetVol) > 0.005) {
        audioRef.current.volume = targetVol;
      }
      if (preloadAudioRef.current && Math.abs(preloadAudioRef.current.volume - targetVol) > 0.005) {
        preloadAudioRef.current.volume = targetVol;
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

  // Listen for Windows Media Keys, System Tray actions, and MediaSession actions
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    // 1. Web MediaSession action handlers (vital for Chromium/WebView2 hardware media key capture)
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          nextTrackRef.current();
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          prevTrackRef.current();
        });
        navigator.mediaSession.setActionHandler("play", () => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(console.error);
          }
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
        });
      } catch (err) {
        console.warn("MediaSession action handler setup failed:", err);
      }
    }

    // 2. Hardware Keyboard Media Key & Space shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space key shortcut: toggle playback when program is focused (ignored in text inputs)
      if (e.code === "Space" || e.key === " ") {
        const target = e.target as HTMLElement | null;
        const isTextInput =
          target &&
          (target.tagName === "TEXTAREA" ||
            (target.tagName === "INPUT" &&
              !["range", "checkbox", "radio", "button", "submit", "reset"].includes(
                (target as HTMLInputElement).type
              )) ||
            target.tagName === "SELECT" ||
            target.isContentEditable ||
            Boolean(target.closest("textarea, select, [contenteditable='true']")) ||
            Boolean(
              target.closest("input:not([type='range']):not([type='checkbox']):not([type='radio'])")
            ));

        if (!isTextInput) {
          e.preventDefault();
          togglePlayPauseRef.current();
          return;
        }
      }

      if (e.key === "MediaTrackNext") {
        e.preventDefault();
        nextTrackRef.current();
      } else if (e.key === "MediaTrackPrevious") {
        e.preventDefault();
        prevTrackRef.current();
      } else if (e.key === "MediaPlayPause") {
        e.preventDefault();
        togglePlayPauseRef.current();
      } else if (e.key === "MediaStop") {
        e.preventDefault();
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // 3. Tauri IPC listeners for Taskbar Thumbnail Toolbar & System Tray
    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        unlisteners.push(
          await listen<void>("player-toggle-play", () => {
            togglePlayPauseRef.current();
          })
        );

        unlisteners.push(
          await listen<void>("player-next", () => {
            nextTrackRef.current();
          })
        );

        unlisteners.push(
          await listen<void>("player-previous", () => {
            prevTrackRef.current();
          })
        );

        unlisteners.push(
          await listen<string>("media-control-action", (event) => {
            const action = event.payload;
            if (action === "play") {
              if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play().catch(console.error);
              }
            } else if (action === "pause") {
              if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
              }
            }
          })
        );
      } catch (err) {
        console.warn("Failed to attach player control listeners:", err);
      }
    };

    setupListener();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlisteners.forEach((u) => u());
    };
  }, []);

  // Sync currently playing track & playback status with OS (System Tray tooltip, SMTC & MediaSession)
  useEffect(() => {
    if (!activeTrack) {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }
      updateMediaMetadata({
        title: "",
        artist: "",
        album: "",
        cover_url: "",
        duration_secs: 0,
        is_playing: false,
      });
      return;
    }

    let durationSecs = Math.round(duration);
    if ((!durationSecs || durationSecs <= 0) && activeTrack.duration) {
      const parts = activeTrack.duration.split(":").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        durationSecs = parts[0] * 60 + parts[1];
      } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        durationSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: activeTrack.title,
          artist: activeTrack.artist,
          album: activeTrack.album || undefined,
          artwork: activeTrack.thumbnail
            ? [{ src: activeTrack.thumbnail, sizes: "512x512", type: "image/jpeg" }]
            : [],
        });
        navigator.mediaSession.playbackState = playbackStatus === "playing" ? "playing" : "paused";
      } catch (err) {
        console.warn("MediaSession metadata update failed:", err);
      }
    }

    updateMediaMetadata({
      title: activeTrack.title,
      artist: activeTrack.artist,
      album: activeTrack.album || undefined,
      cover_url: activeTrack.thumbnail || undefined,
      duration_secs: durationSecs > 0 ? durationSecs : undefined,
      is_playing: playbackStatus === "playing",
    });
  }, [
    activeTrack?.id,
    activeTrack?.title,
    activeTrack?.artist,
    activeTrack?.album,
    activeTrack?.thumbnail,
    playbackStatus,
    duration,
  ]);

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
        const targetVol = isMutedRef.current ? 0 : volumeRef.current;
        audioRef.current.volume = targetVol;
        await audioRef.current.play();
        audioRef.current.volume = targetVol;
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
        const targetVol = isMutedRef.current ? 0 : volumeRef.current;
        audioRef.current.volume = targetVol;
        await audioRef.current.play();
        audioRef.current.volume = targetVol;
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
        const targetVol = isMutedRef.current ? 0 : volumeRef.current;
        audioRef.current.volume = targetVol;
        await audioRef.current.play();
        audioRef.current.volume = targetVol;
        setPlaybackStatus("playing");
      }
    } catch (err: unknown) {
      setPlaybackStatus("error");
      setPlaybackError(err instanceof Error ? err.message : "Failed to load audio stream");
    }
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    if (newQueue && newQueue.length > 0) {
      queueRef.current = newQueue;
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
  togglePlayPauseRef.current = togglePlayPause;

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (vol: number) => {
    const num = isNaN(vol) ? 0.85 : vol;
    const clamped = Math.max(0, Math.min(1, num));
    setVolumeState(clamped);
    volumeRef.current = clamped;

    const newMuted = clamped === 0;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;

    try {
      localStorage.setItem("tubify_volume", clamped.toString());
      localStorage.setItem("tubify_muted", newMuted.toString());
    } catch {}

    const target = newMuted ? 0 : clamped;
    if (audioRef.current) {
      audioRef.current.volume = target;
    }
    if (preloadAudioRef.current) {
      preloadAudioRef.current.volume = target;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMutedRef.current;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;

    try {
      localStorage.setItem("tubify_muted", String(newMuted));
    } catch {}

    const target = newMuted ? 0 : (volumeRef.current > 0 ? volumeRef.current : 0.85);
    if (audioRef.current) {
      audioRef.current.volume = target;
    }
    if (preloadAudioRef.current) {
      preloadAudioRef.current.volume = target;
    }
  };

  const toggleShuffle = () => setIsShuffle((prev) => !prev);
  const toggle16x9Aspect = () => setIs16x9Aspect((prev) => !prev);

  const toggleQueue = useCallback(() => {
    setQueueViewMode((prev) => (prev === "closed" ? "mini" : "closed"));
  }, []);

  const toggleRightDrawer = useCallback((_tab?: RightDrawerTab) => {
    setQueueViewMode((prev) => (prev === "closed" ? "mini" : "closed"));
  }, []);

  const setRightDrawerTab = (tab: RightDrawerTab) => {
    setRightDrawerTabState(tab);
    if (queueViewMode === "closed") setQueueViewMode("mini");
  };

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      let next: RepeatMode;
      if (prev === "off") next = "all";
      else if (prev === "all") next = "one";
      else next = "off";

      try {
        localStorage.setItem("tubify_repeat_mode", next);
      } catch {}

      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState(activeTrack ? [activeTrack] : []);
    queueRef.current = activeTrack ? [activeTrack] : [];
    showToast("Sıra temizlendi");
  }, [activeTrack, showToast]);

  const saveQueueAsPlaylist = useCallback(() => {
    showToast("Sıra çalma listesi olarak kaydedildi");
  }, [showToast]);

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
        setLikedTrackIds((prev) => {
          const rollback = new Set(prev);
          if (isCurrentlyLiked) rollback.add(track.id);
          else rollback.delete(track.id);
          return rollback;
        });
        throw e;
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

  const addToQueue = useCallback((track: Track) => {
    setQueueState((prev) => {
      if (prev.length === 0 && !currentTrackRef.current) {
        playTrackInternal(track);
        return [track];
      }
      return [...prev, track];
    });
    showToast(`"${track.title}" sıraya eklendi`);
  }, [showToast]);

  const playNext = useCallback((track: Track) => {
    const curTrack = currentTrackRef.current;
    if (!curTrack) {
      playTrack(track, [track]);
      showToast(`"${track.title}" oynatılıyor`);
      return;
    }

    setQueueState((prev) => {
      const idx = prev.findIndex((t) => t.id === curTrack.id);
      if (idx === -1) {
        return [curTrack, track, ...prev.filter((t) => t.id !== curTrack.id)];
      }
      const updated = [...prev];
      updated.splice(idx + 1, 0, track);
      return updated;
    });

    // Invalidate preloader so it immediately preloads this play-next track!
    preloadedTrackRef.current = null;
    upcomingTrackRef.current = track;
    preloadUpcoming();

    showToast(`"${track.title}" bundan sonra çalınacak`);
  }, [playTrack, preloadUpcoming, showToast]);

  const startRadio = useCallback(async (track: Track) => {
    showToast(`"${track.title}" radyosu başlatılıyor...`);

    // 1. Instant Playback: If this track isn't already playing, start playing it immediately!
    if (currentTrackRef.current?.id !== track.id) {
      queueRef.current = [track];
      setQueueState([track]);
      playTrackInternal(track);
    }

    // 2. Fetch ~50 radio tracks from YouTube Music Watch Playlist endpoint in parallel
    try {
      const radioTracks = await getRadioTracks(track.id);
      if (radioTracks && radioTracks.length > 0) {
        // Place the currently selected track at the head of the radio queue (avoiding duplicates)
        const filtered = radioTracks.filter((t) => t.id !== track.id);
        const finalQueue = [track, ...filtered];

        queueRef.current = finalQueue;
        setQueueState(finalQueue);

        // Invalidate preloader and immediately trigger preload for track #2
        preloadedTrackRef.current = null;
        upcomingTrackRef.current = null;
        preloadUpcoming();

        showToast(`Radyo hazır: "${track.title}" (${finalQueue.length} şarkı)`);
      } else {
        queueRef.current = [track];
        setQueueState([track]);
        showToast(`Radyo listesi bulunamadı, "${track.title}" çalınıyor`);
      }
    } catch (e) {
      console.error("Radio start error:", e);
      queueRef.current = [track];
      setQueueState([track]);
      showToast("Radyo başlatılamadı, tek şarkı oynatılıyor");
    }
  }, [preloadUpcoming, showToast]);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueueState((prev) => prev.filter((t) => t.id !== trackId));
    showToast("Şarkı kuyruktan kaldırıldı");
  }, [showToast]);

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
        repeatMode,
        queue,
        is16x9Aspect,
        isRightDrawerOpen,
        queueViewMode,
        setQueueViewMode,
        toggleQueue,
        clearQueue,
        saveQueueAsPlaylist,
        rightDrawerTab,
        isSidebarCollapsed,
        activeMood,
        isMiniPlayer,
        likedTrackIds,
        recentTracks,
        toastMessage,
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
        showToast,
        addToQueue,
        playNext,
        startRadio,
        removeFromQueue,
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
