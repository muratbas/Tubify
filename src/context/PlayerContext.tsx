import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Track,
  PlaybackStatus,
  RightDrawerTab,
  QueueViewMode,
  MoodCategory,
  RepeatMode,
  PlaybackTracking,
} from "../types/music";
import {
  getStreamUrl,
  getStoredAudioQuality,
  toggleYtLike,
  getRadioTracks,
  updateMediaMetadata,
  updateDiscordPresence,
  clearDiscordPresence,
  getDownloadedTracks,
  getDownloadedAudioBlobUrl,
  getPlaybackTracking,
  sendPlaybackPing,
  sendWatchtimePing,
} from "../services/api";

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
  queueSourceId: string;
  is16x9Aspect: boolean;
  isRightDrawerOpen: boolean;
  rightDrawerTab: RightDrawerTab;
  queueViewMode: QueueViewMode;
  isSidebarCollapsed: boolean;
  activeMood: MoodCategory;
  isMiniPlayer: boolean;
  likedTrackIds: Set<string>;
  recentTracks: Track[];

  playTrack: (track: Track, newQueue?: Track[], sourceId?: string) => Promise<void>;
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
  setQueue: (tracks: Track[], sourceId?: string) => void;
  setQueueSourceId: (sourceId: string) => void;
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
  const [queueSourceId, setQueueSourceId] = useState<string>("");

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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Filter out any legacy mock filler tracks
      const MOCK_IDS = new Set(["ViwtNLUqkMY", "gN9O1k_iV9Q", "bU_kF9_H7g4", "0Wc2J3Y9s8w", "gQlMMD8auMs", "kJQP7kiw5Fk", "fJ9rUzIMcZQ", "JGwWNGJdvx8", "3JZ_D3ELwOQ", "hT_nvWreIhg"]);
      return parsed.filter((t: Track) => t && t.id && !MOCK_IDS.has(t.id));
    } catch {
      return [];
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  currentTrackRef.current = activeTrack;

  const queueRef = useRef<Track[]>([]);
  queueRef.current = queue;

  const playbackHistoryRef = useRef<Track[]>([]);

  const queueSourceIdRef = useRef<string>("");
  queueSourceIdRef.current = queueSourceId;

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

  const playbackStatusRef = useRef<PlaybackStatus>(playbackStatus);
  playbackStatusRef.current = playbackStatus;

  const durationRef = useRef<number>(duration);
  durationRef.current = duration;

  // Preloading & Stream Caching Refs
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedTrackRef = useRef<{ trackId: string; url: string } | null>(null);
  const streamCacheRef = useRef<Map<string, { url: string; timestamp: number }>>(new Map());
  const upcomingTrackRef = useRef<Track | null>(null);

  // Downloaded track IDs ref for offline playback
  const downloadedIdsRef = useRef<Set<string>>(new Set());
  const retryFallbackRef = useRef<(track: Track, reason: string) => Promise<void>>(() => Promise.resolve());

  // Playback & Watchtime Tracking Ref (YouTube Music Account Sync)
  const trackingSessionRef = useRef<{
    trackId: string;
    tracking: PlaybackTracking | null;
    playbackPingSent: boolean;
    watchtimePingSent: boolean;
  }>({
    trackId: "",
    tracking: null,
    playbackPingSent: false,
    watchtimePingSent: false,
  });

  useEffect(() => {
    getDownloadedTracks()
      .then((tracks) => {
        tracks.forEach((t) => downloadedIdsRef.current.add(t.track_id));
      })
      .catch((err) => console.warn("Failed to check downloaded tracks:", err));

    const unlisteners: (() => void)[] = [];
    const setupDownloadListeners = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisteners.push(
          await listen<{ track_id: string }>("download_completed", (e) => {
            if (e.payload?.track_id) downloadedIdsRef.current.add(e.payload.track_id);
          })
        );
        unlisteners.push(
          await listen<{ track_id: string }>("download_deleted", (e) => {
            if (e.payload?.track_id) downloadedIdsRef.current.delete(e.payload.track_id);
          })
        );
      } catch {}
    };
    setupDownloadListeners();
    return () => unlisteners.forEach((u) => u());
  }, []);

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
      if (downloadedIdsRef.current.has(candidate.id) || queueSourceIdRef.current === "downloads") {
        try {
          streamUrl = await getDownloadedAudioBlobUrl(candidate.id);
        } catch {
          streamUrl = `http://tubify-local.localhost/track/${candidate.id}`;
        }
      } else {
        const quality = getStoredAudioQuality();
        const cacheKey = `${candidate.id}_${quality}`;
        const cached = streamCacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
          streamUrl = cached.url;
        } else {
          const stream = await getStreamUrl(candidate.id, quality);
          streamUrl = stream.url;
          streamCacheRef.current.set(cacheKey, { url: streamUrl, timestamp: Date.now() });
        }
      }

      // Pre-buffer in secondary invisible audio element
      const targetVol = isMutedRef.current ? 0 : volumeRef.current;
      if (!preloadAudioRef.current) {
        const pAudio = new Audio();
        pAudio.preload = "auto";
        pAudio.volume = targetVol;
        pAudio.muted = true;
        const savedSink = localStorage.getItem("tubify_output_device");
        if (savedSink && typeof (pAudio as any).setSinkId === "function") {
          (pAudio as any).setSinkId(savedSink).catch(() => {});
        }
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

  // Handle quality preference changes dynamically
  useEffect(() => {
    const handleQualityChange = () => {
      streamCacheRef.current.clear();
      if (preloadAudioRef.current) {
        preloadAudioRef.current.pause();
        preloadAudioRef.current.src = "";
      }
      preloadUpcoming();
    };
    window.addEventListener("tubify:quality-change", handleQualityChange);
    return () => {
      window.removeEventListener("tubify:quality-change", handleQualityChange);
    };
  }, [preloadUpcoming]);

  // Handle audio output device changes dynamically
  useEffect(() => {
    const handleDeviceChange = (e: Event) => {
      const deviceId = (e as CustomEvent<string>).detail;
      if (typeof (audioRef.current as any)?.setSinkId === "function") {
        (audioRef.current as any).setSinkId(deviceId).catch((err: any) => {
          console.warn("Failed to setSinkId on audioRef:", err);
        });
      }
      if (typeof (preloadAudioRef.current as any)?.setSinkId === "function") {
        (preloadAudioRef.current as any).setSinkId(deviceId).catch(() => {});
      }
    };
    window.addEventListener("tubify:output-device-change", handleDeviceChange);
    return () => {
      window.removeEventListener("tubify:output-device-change", handleDeviceChange);
    };
  }, []);

  const lastNextTimeRef = useRef(0);
  const lastPrevTimeRef = useRef(0);

  // Next track resolver with debounce guard
  const nextTrack = useCallback(() => {
    const now = Date.now();
    if (now - lastNextTimeRef.current < 250) {
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
    if (now - lastPrevTimeRef.current < 250) {
      return;
    }
    lastPrevTimeRef.current = now;

    const curQueue = queueRef.current;
    const curTrack = currentTrackRef.current;
    if (!curTrack && curQueue.length === 0) return;

    // If repeat mode is 'one', restart current track
    if (repeatModeRef.current === "one" && curTrack) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.play().catch(console.error);
      }
      return;
    }

    // 1. In shuffle mode, prefer previous track from actual playback history
    if (isShuffleRef.current && playbackHistoryRef.current.length > 0) {
      const prev = playbackHistoryRef.current.pop();
      if (prev) {
        playTrackInternal(prev, true);
        return;
      }
    }

    // 2. Sequential queue navigation: if we are at track index > 0, go to previous track in queue
    const idx = curTrack ? curQueue.findIndex((t) => t.id === curTrack.id) : -1;
    if (idx > 0) {
      playTrackInternal(curQueue[idx - 1], true);
      return;
    }

    // 3. Fallback to playback history if queue has reached beginning (idx <= 0)
    if (playbackHistoryRef.current.length > 0) {
      const prev = playbackHistoryRef.current.pop();
      if (prev) {
        playTrackInternal(prev, true);
        return;
      }
    }

    // 4. Wrap around in repeat all mode
    if (repeatModeRef.current === "all" && curQueue.length > 1) {
      playTrackInternal(curQueue[curQueue.length - 1], true);
      return;
    }

    // 5. At very beginning of all playback: rewind current track to start
    if (audioRef.current) {
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
    const savedSink = localStorage.getItem("tubify_output_device");
    if (savedSink && typeof (audio as any).setSinkId === "function") {
      (audio as any).setSinkId(savedSink).catch(() => {});
    }
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

      // Playback tracking: send watchtime ping once track plays for at least 20s (15-30s range)
      const session = trackingSessionRef.current;
      if (
        audio.currentTime >= 20 &&
        !session.watchtimePingSent &&
        session.tracking?.videostats_watchtime_url
      ) {
        session.watchtimePingSent = true;
        const dur = audio.duration || 0;
        sendWatchtimePing(
          session.tracking.videostats_watchtime_url,
          session.tracking.cpn,
          dur,
          audio.currentTime
        ).catch(() => {});
      }
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      enforceVolume();
      setPlaybackStatus("playing");

      // Playback tracking: send playback start ping
      const session = trackingSessionRef.current;
      if (session.tracking?.videostats_playback_url && !session.playbackPingSent) {
        session.playbackPingSent = true;
        sendPlaybackPing(session.tracking.videostats_playback_url, session.tracking.cpn).catch(() => {});
      }
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
      const track = currentTrackRef.current;
      const src = audio.src || "";
      if (track) {
        if (src.includes("tubify-local.localhost") || src.includes("tubify-local://")) {
          retryFallbackRef.current(track, "offline_failed");
          return;
        }
        if (streamCacheRef.current.has(track.id)) {
          retryFallbackRef.current(track, "cached_failed");
          return;
        }
      }
      setPlaybackStatus("error");
      setPlaybackError("Audio stream could not be loaded. Please check your connection.");
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

  // Discord Rich Presence (RPC) Integration
  const discordDebounceTimerRef = useRef<number | null>(null);

  const syncDiscordRpc = useCallback((overrideCurrentTime?: number, overridePlaying?: boolean) => {
    if (discordDebounceTimerRef.current) {
      window.clearTimeout(discordDebounceTimerRef.current);
    }

    discordDebounceTimerRef.current = window.setTimeout(() => {
      let isEnabled = true;
      try {
        const saved = localStorage.getItem("tubify_discord_rpc_enabled");
        isEnabled = saved !== null ? saved === "true" : true;
      } catch {}

      if (!isEnabled) {
        clearDiscordPresence();
        return;
      }

      const curTrack = currentTrackRef.current;
      if (!curTrack) {
        clearDiscordPresence();
        return;
      }

      const isPlaying = overridePlaying !== undefined ? overridePlaying : playbackStatusRef.current === "playing";
      if (!isPlaying) {
        clearDiscordPresence();
        return;
      }

      const audio = audioRef.current;
      const curTime = overrideCurrentTime !== undefined ? overrideCurrentTime : (audio?.currentTime || 0);

      let durationSecs = Math.round(audio?.duration || durationRef.current || 0);
      if ((!durationSecs || durationSecs <= 0) && curTrack.duration) {
        const parts = curTrack.duration.split(":").map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          durationSecs = parts[0] * 60 + parts[1];
        } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          durationSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }

      updateDiscordPresence({
        title: curTrack.title,
        artist: curTrack.artist,
        album_cover_url: curTrack.thumbnail || undefined,
        is_playing: true,
        current_time_sec: curTime,
        duration_sec: durationSecs > 0 ? durationSecs : undefined,
      });
    }, 150);
  }, []);

  // Sync Discord RPC on track change or play/pause state change
  useEffect(() => {
    if (!activeTrack || playbackStatus !== "playing") {
      if (discordDebounceTimerRef.current) {
        window.clearTimeout(discordDebounceTimerRef.current);
      }
      clearDiscordPresence();
      return;
    }

    syncDiscordRpc(undefined, true);
  }, [activeTrack?.id, playbackStatus, syncDiscordRpc]);

  // Clean up Discord RPC when app window or webview unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearDiscordPresence();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Listen for Discord RPC toggle changes from Settings
  useEffect(() => {
    const handleDiscordToggle = (e: Event) => {
      const isEnabled = (e as CustomEvent<boolean>).detail;
      if (!isEnabled) {
        if (discordDebounceTimerRef.current) {
          window.clearTimeout(discordDebounceTimerRef.current);
        }
        clearDiscordPresence();
      } else {
        syncDiscordRpc();
      }
    };

    window.addEventListener("tubify:discord-rpc-toggle", handleDiscordToggle);
    return () => {
      window.removeEventListener("tubify:discord-rpc-toggle", handleDiscordToggle);
    };
  }, [syncDiscordRpc]);

  const playTrackInternal = async (track: Track, isFromPrev = false) => {
    if (!audioRef.current) return;

    if (!isFromPrev && currentTrackRef.current && currentTrackRef.current.id !== track.id) {
      playbackHistoryRef.current.push(currentTrackRef.current);
      if (playbackHistoryRef.current.length > 50) {
        playbackHistoryRef.current.shift();
      }
    }

    currentTrackRef.current = track;
    setActiveTrack(track);
    setPlaybackError(null);

    // Initialize playback tracking session for YouTube account history sync
    trackingSessionRef.current = {
      trackId: track.id,
      tracking: null,
      playbackPingSent: false,
      watchtimePingSent: false,
    };

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

    const ensurePlaybackTracking = (targetTrackId: string) => {
      if (!trackingSessionRef.current.tracking && trackingSessionRef.current.trackId === targetTrackId) {
        getPlaybackTracking(targetTrackId)
          .then((tracking) => {
            if (tracking && trackingSessionRef.current.trackId === targetTrackId) {
              trackingSessionRef.current.tracking = tracking;
              if (audioRef.current && !audioRef.current.paused && !trackingSessionRef.current.playbackPingSent) {
                trackingSessionRef.current.playbackPingSent = true;
                if (tracking.videostats_playback_url) {
                  sendPlaybackPing(tracking.videostats_playback_url, tracking.cpn).catch(() => {});
                }
              }
            }
          })
          .catch(() => {});
      }
    };

    const playNetworkStream = async (trackToPlay: Track, forceFresh = false) => {
      setPlaybackStatus("loading");
      setPlaybackError(null);
      try {
        let streamUrl = "";
        let trackingData: PlaybackTracking | null = null;
        const quality = getStoredAudioQuality();
        const cacheKey = `${trackToPlay.id}_${quality}`;
        if (!forceFresh) {
          const cached = streamCacheRef.current.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
            streamUrl = cached.url;
            ensurePlaybackTracking(trackToPlay.id);
          }
        }
        if (!streamUrl) {
          const stream = await getStreamUrl(trackToPlay.id, quality);
          streamUrl = stream.url;
          streamCacheRef.current.set(cacheKey, { url: streamUrl, timestamp: Date.now() });
          if (stream.playback_tracking) {
            trackingData = stream.playback_tracking;
          }
        }
        if (trackingData && trackingSessionRef.current.trackId === trackToPlay.id) {
          trackingSessionRef.current.tracking = trackingData;
          if (audioRef.current && !audioRef.current.paused && !trackingSessionRef.current.playbackPingSent) {
            trackingSessionRef.current.playbackPingSent = true;
            if (trackingData.videostats_playback_url) {
              sendPlaybackPing(trackingData.videostats_playback_url, trackingData.cpn).catch(() => {});
            }
          }
        }
        if (audioRef.current && currentTrackRef.current?.id === trackToPlay.id) {
          audioRef.current.src = streamUrl;
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

    retryFallbackRef.current = async (failedTrack: Track, reason: string) => {
      console.warn(`[Player] Fallback triggered for "${failedTrack.title}": ${reason}`);
      if (reason === "offline_failed") {
        downloadedIdsRef.current.delete(failedTrack.id);
      } else if (reason === "cached_failed") {
        streamCacheRef.current.delete(failedTrack.id);
      }
      await playNetworkStream(failedTrack, true);
    };

    // 0. OFFLINE / DOWNLOADED CHECK (HIGHEST PRIORITY):
    // If track is downloaded or queue is downloads, directly play via local disk with 0ms loading!
    const isOffline = downloadedIdsRef.current.has(track.id) || queueSourceIdRef.current === "downloads";
    if (isOffline) {
      try {
        let offlineUrl = "";
        try {
          offlineUrl = await getDownloadedAudioBlobUrl(track.id);
        } catch {
          offlineUrl = `http://tubify-local.localhost/track/${track.id}`;
        }
        if (audioRef.current && currentTrackRef.current?.id === track.id) {
          audioRef.current.src = offlineUrl;
          audioRef.current.currentTime = 0;
          const targetVol = isMutedRef.current ? 0 : volumeRef.current;
          audioRef.current.volume = targetVol;
          await audioRef.current.play();
          audioRef.current.volume = targetVol;
          setPlaybackStatus("playing");
          ensurePlaybackTracking(track.id);
          return;
        }
      } catch (err) {
        console.warn("Failed to play local offline track, falling back to network fetch:", err);
      }
    }

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
        ensurePlaybackTracking(track.id);
        return;
      } catch (e) {
        console.warn("Instant playback from preloaded buffer failed, falling back to fresh fetch:", e);
      }
    }

    // 2. NORMAL / CACHED NETWORK FETCH:
    await playNetworkStream(track, false);
  };

  const playTrack = async (track: Track, newQueue?: Track[], sourceId?: string) => {
    if (newQueue && newQueue.length > 0) {
      queueRef.current = newQueue;
      setQueueState(newQueue);
      if (sourceId !== undefined) {
        queueSourceIdRef.current = sourceId;
        setQueueSourceId(sourceId);
      }
    } else if (sourceId !== undefined) {
      queueSourceIdRef.current = sourceId;
      setQueueSourceId(sourceId);
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
    syncDiscordRpc(time);
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
    const active = currentTrackRef.current;
    const remaining = active ? [active] : [];
    setQueueState(remaining);
    queueRef.current = remaining;
    queueSourceIdRef.current = "";
    setQueueSourceId("");
    upcomingTrackRef.current = null;
    preloadedTrackRef.current = null;
    showToast("Sıra temizlendi");
  }, [showToast]);

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

  const setQueue = (tracks: Track[], sourceId?: string) => {
    queueRef.current = tracks;
    setQueueState(tracks);
    if (sourceId !== undefined) {
      queueSourceIdRef.current = sourceId;
      setQueueSourceId(sourceId);
    }
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
    const radioSourceId = `radio:${track.id}`;

    // 1. Instant Playback: If this track isn't already playing, start playing it immediately!
    if (currentTrackRef.current?.id !== track.id) {
      queueRef.current = [track];
      setQueueState([track]);
      queueSourceIdRef.current = radioSourceId;
      setQueueSourceId(radioSourceId);
      playTrackInternal(track);
    } else {
      queueSourceIdRef.current = radioSourceId;
      setQueueSourceId(radioSourceId);
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
        queueSourceIdRef.current = radioSourceId;
        setQueueSourceId(radioSourceId);

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
        queueSourceId,
        setQueueSourceId,
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
