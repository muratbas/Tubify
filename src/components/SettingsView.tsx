import { useState, useEffect, useRef, useCallback, type FC } from "react";
import {
  User,
  Palette,
  PlaySquare,
  FolderOpen,
  Info,
  LogOut,
  LogIn,
  Star,
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Check,
  Languages,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { openExternalUrl } from "../services/api";
import type { UserProfile, SettingsTab, AudioQualityPreference } from "../types/music";

interface SettingsViewProps {
  initialTab?: SettingsTab;
  userProfile: UserProfile;
  likedSongsCount: number;
  playlistsCount: number;
  onLogout: () => Promise<void>;
  onOpenLogin: () => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

const GithubIcon: FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

function isVersionNewer(latest: string, current: string): boolean {
  const clean = (v: string) => v.replace(/^v/, "").trim();
  const v1Parts = clean(latest).split(".").map((n) => parseInt(n, 10) || 0);
  const v2Parts = clean(current).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const p1 = v1Parts[i] || 0;
    const p2 = v2Parts[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
}

export const SettingsView: FC<SettingsViewProps> = ({
  initialTab = "account",
  userProfile,
  onLogout,
  onOpenLogin,
  onScroll,
}) => {
  const { theme, themeMode, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // About Tab state
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<
    | null
    | { status: "latest" }
    | { status: "available"; version: string; body: string; url: string }
    | { status: "error"; message?: string }
  >(null);

  // Audio Quality state
  const [audioQuality, setAudioQuality] = useState<AudioQualityPreference>(() => {
    try {
      const saved = localStorage.getItem("tubify_audio_quality");
      if (saved === "high" || saved === "normal" || saved === "low") {
        return saved;
      }
    } catch {}
    return "high";
  });
  const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isQualityDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(e.target as Node)) {
        setIsQualityDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsQualityDropdownOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isQualityDropdownOpen]);

  const handleSelectQuality = (quality: AudioQualityPreference) => {
    setAudioQuality(quality);
    setIsQualityDropdownOpen(false);
    try {
      localStorage.setItem("tubify_audio_quality", quality);
      window.dispatchEvent(new CustomEvent("tubify:quality-change", { detail: quality }));
    } catch {}
  };

  // Audio Output Device state
  const [outputDevices, setOutputDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    try {
      return localStorage.getItem("tubify_output_device") || "default";
    } catch {
      return "default";
    }
  });
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  // Discord Rich Presence (RPC) State
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tubify_discord_rpc_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleDiscordRpc = () => {
    const nextVal = !discordRpcEnabled;
    setDiscordRpcEnabled(nextVal);
    try {
      localStorage.setItem("tubify_discord_rpc_enabled", String(nextVal));
      window.dispatchEvent(new CustomEvent("tubify:discord-rpc-toggle", { detail: nextVal }));
    } catch {}
  };

  const scanAndLoadAudioDevices = useCallback(
    async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        setOutputDevices([{ deviceId: "default", label: t.defaultOutputDevice }]);
        return;
      }

      setIsScanningDevices(true);
      try {
        const raw = await navigator.mediaDevices.enumerateDevices();
        const outputs = raw.filter((d) => d.kind === "audiooutput");

        const mapped: Array<{ deviceId: string; label: string }> = [];

        // 1. System Default
        const defaultItem = outputs.find((d) => d.deviceId === "default");
        let defaultLabel = t.defaultOutputDevice;
        if (defaultItem?.label) {
          const cleanSuffix = defaultItem.label.replace(/^Default\s*-\s*/i, "").trim();
          if (cleanSuffix) {
            defaultLabel = `${t.defaultOutputDevice} (${cleanSuffix})`;
          }
        }
        mapped.push({ deviceId: "default", label: defaultLabel });

        // 2. Physical Audio Output Endpoints (Speakers, Headphones, Monitors)
        let counter = 1;
        for (const d of outputs) {
          if (d.deviceId === "default" || d.deviceId === "communications") {
            continue;
          }
          let cleanLabel = d.label ? d.label.trim() : "";
          if (!cleanLabel) {
            cleanLabel = `Hoparlör / Çıkış Aygıtı ${counter}`;
          }
          mapped.push({
            deviceId: d.deviceId,
            label: cleanLabel,
          });
          counter++;
        }

        setOutputDevices(mapped);
      } catch (err) {
        console.warn("Failed to enumerate audio devices:", err);
      } finally {
        setIsScanningDevices(false);
      }
    },
    [t.defaultOutputDevice]
  );

  const handleSelectAudioOutput = async () => {
    if (typeof navigator !== "undefined" && (navigator.mediaDevices as any)?.selectAudioOutput) {
      try {
        const chosen = await (navigator.mediaDevices as any).selectAudioOutput();
        if (chosen?.deviceId) {
          handleSelectDevice(chosen.deviceId);
          await scanAndLoadAudioDevices();
        }
      } catch {
        // User closed dialog or canceled
      }
    }
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setIsDeviceDropdownOpen(false);
    try {
      localStorage.setItem("tubify_output_device", deviceId);
      window.dispatchEvent(new CustomEvent("tubify:output-device-change", { detail: deviceId }));
    } catch {}
  };

  // Initial load and device change watcher
  useEffect(() => {
    scanAndLoadAudioDevices();

    const onDeviceChange = () => scanAndLoadAudioDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [scanAndLoadAudioDevices]);

  // When opening playback tab, scan devices
  useEffect(() => {
    if (activeTab === "playback") {
      scanAndLoadAudioDevices();
    }
  }, [activeTab, scanAndLoadAudioDevices]);

  useEffect(() => {
    if (!isDeviceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(e.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDeviceDropdownOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeviceDropdownOpen]);

  // Sync initial tab when changed from props
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load app version dynamically from Tauri or package
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        const v = await getVersion();
        if (isMounted && v) setAppVersion(v);
      } catch {
        // Fallback default version 0.1.0
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await fetch("https://api.github.com/repos/muratbas/Tubify/releases/latest", {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (res.status === 404) {
        // No releases published yet on the repository; client is up-to-date
        setUpdateResult({ status: "latest" });
        return;
      }

      if (!res.ok) {
        throw new Error(`GitHub API responded with status ${res.status}`);
      }

      const data = await res.json();
      const latestTag = data.tag_name || "";
      if (latestTag && isVersionNewer(latestTag, appVersion)) {
        setUpdateResult({
          status: "available",
          version: latestTag,
          body: data.body || "",
          url: data.html_url || "https://github.com/muratbas/Tubify/releases",
        });
      } else {
        setUpdateResult({ status: "latest" });
      }
    } catch {
      setUpdateResult({ status: "error" });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const navItems = [
    {
      id: "account" as const,
      label: t.account,
      subtitle: userProfile.is_authenticated ? t.signedInToYt : t.notConnectedDesc,
      icon: User,
    },
    {
      id: "appearance" as const,
      label: t.appearance,
      subtitle: t.appearanceSubtitle,
      icon: Palette,
    },
    {
      id: "playback" as const,
      label: t.playback,
      subtitle: t.playbackSubtitle,
      icon: PlaySquare,
    },
    {
      id: "library" as const,
      label: t.library,
      subtitle: "Cache and audio buffer",
      icon: FolderOpen,
    },
    {
      id: "about" as const,
      label: t.about,
      subtitle: t.aboutSubtitle,
      icon: Info,
    },
  ];

  return (
    <div
      id="main-scroll-container"
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-10 pt-6 pb-12 space-y-7 transition-colors ${
        isLight ? "bg-[#f0f0f0] text-[#111111]" : "bg-[#030303] text-white"
      }`}
    >
      {/* 1. Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
            {t.settings}
          </h1>
          <p className={`text-xs mt-1 font-medium ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
            {t.settingsSubtitle}
          </p>
        </div>

        {/* Action Buttons: Star on GitHub & Report an issue */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openExternalUrl("https://github.com/muratbas/Tubify")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98 ${
              isLight
                ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7] hover:bg-[#fafafa]"
                : "bg-[#181818] text-slate-200 border-[#2a2a2a] hover:bg-[#222]"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />
            <span>{t.starOnGithub}</span>
          </button>

          <button
            onClick={() => openExternalUrl("https://github.com/muratbas/Tubify/issues")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98 ${
              isLight
                ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7] hover:bg-[#fafafa]"
                : "bg-[#181818] text-slate-200 border-[#2a2a2a] hover:bg-[#222]"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />
            <span>{t.reportAnIssue}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Layout: Left Sub-navigation + Right Cards */}
      <div className="flex items-start gap-8 pb-16">
        {/* Left Sub-nav */}
        <div className="w-64 space-y-1.5 shrink-0">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                  isActive
                    ? isLight
                      ? "bg-[#ffffff] text-[#111111] shadow-sm border border-[#e4e4e7]"
                      : "bg-[#161616] text-white shadow-sm border border-[#262626]"
                    : isLight
                    ? "text-[#52525b] hover:bg-[#e4e4e7]/60 hover:text-[#111111]"
                    : "text-[#888888] hover:bg-[#121212] hover:text-white"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? "bg-rose-500/10 text-[#ff0000]"
                      : isLight
                      ? "bg-[#e4e4e7] text-[#71717a]"
                      : "bg-[#1f1f1f] text-[#888888]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-tight">{item.label}</p>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isActive
                        ? isLight
                          ? "text-[#71717a]"
                          : "text-[#aaaaaa]"
                        : isLight
                        ? "text-[#a1a1aa]"
                        : "text-[#666666]"
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Cards Container */}
        <div className="flex-1 max-w-3xl space-y-6">
          {/* TAB 1: ACCOUNT (Simplified: Profile Card Only) */}
          {activeTab === "account" && (
            <div
              className={`p-6 rounded-3xl border transition-all shadow-sm ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
              }`}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between pb-5 border-b border-inherit">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-[#ff0000] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                      {t.account}
                    </h3>
                    <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {userProfile.is_authenticated ? t.signedInToYt : t.notConnectedDesc}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-[#ff0000]">
                  {userProfile.is_authenticated ? t.connected : t.signedOut}
                </span>
              </div>

              {userProfile.is_authenticated ? (
                <div className="pt-5">
                  {/* User Profile Card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      {userProfile.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover border border-[#e4e4e7] shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-base shadow-sm">
                          {userProfile.name?.[0]?.toUpperCase() || "M"}
                        </div>
                      )}
                      <div>
                        <h4 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                          {userProfile.name || "Murat"}
                        </h4>
                        <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                          {t.sessionConfirmed}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogoutClick}
                      disabled={isLoggingOut}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isLight
                          ? "bg-neutral-50 text-[#18181b] border-neutral-200 hover:bg-neutral-100"
                          : "bg-[#181818] text-slate-200 border-[#2a2a2a] hover:bg-[#222]"
                      }`}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff0000]" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-6 pb-2 text-center space-y-3">
                  <p className={`text-xs ${isLight ? "text-[#71717a]" : "text-[#888]"}`}>
                    {t.notConnectedDesc}
                  </p>
                  <button
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-2 py-2 px-5 bg-[#ff0000] hover:bg-[#e60000] text-white text-xs font-bold rounded-full shadow-md shadow-red-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t.connectGoogle}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPEARANCE (Compact 3-Theme Grid & Language, No Accent Color) */}
          {activeTab === "appearance" && (
            <div
              className={`p-6 rounded-3xl border transition-all shadow-sm space-y-7 ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  {t.appearance}
                </h3>
                <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                  {t.appearanceSubtitle}
                </p>
              </div>

              {/* Theme Selection - 3 Compact Cards */}
              <div className="space-y-3">
                <label className={`text-xs font-bold ${isLight ? "text-[#18181b]" : "text-slate-300"}`}>
                  {t.themeSelection}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Light Mode Card */}
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-2.5 group ${
                      themeMode === "light"
                        ? "border-[#ff0000] ring-2 ring-[#ff0000]/25 bg-red-50/10"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    {/* Compact Mini Preview */}
                    <div className="w-full h-14 rounded-xl bg-[#f0f0f0] border border-[#e4e4e7] p-2 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="w-2 h-2 rounded-full bg-[#ff0000]" />
                        <div className="w-8 h-1.5 rounded-full bg-[#d4d4d8]" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-1.5 rounded bg-[#ffffff]" />
                        <div className="w-1/2 h-1.5 rounded bg-[#ffffff]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sun className={`w-3.5 h-3.5 shrink-0 ${themeMode === "light" ? "text-[#ff0000]" : "text-[#888]"}`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isLight ? "text-[#111111]" : "text-white"}`}>
                            {t.lightTheme}
                          </p>
                          <p className={`text-[10px] truncate ${isLight ? "text-[#71717a]" : "text-[#888]"}`}>
                            {t.lightThemeDesc}
                          </p>
                        </div>
                      </div>
                      {themeMode === "light" && (
                        <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center shrink-0 ml-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-2.5 group ${
                      themeMode === "dark"
                        ? "border-[#ff0000] ring-2 ring-[#ff0000]/25 bg-red-50/10"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    {/* Compact Mini Preview */}
                    <div className="w-full h-14 rounded-xl bg-[#080808] border border-[#222222] p-2 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="w-2 h-2 rounded-full bg-[#ff0000]" />
                        <div className="w-8 h-1.5 rounded-full bg-[#262626]" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-1.5 rounded bg-[#181818]" />
                        <div className="w-1/2 h-1.5 rounded bg-[#181818]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Moon className={`w-3.5 h-3.5 shrink-0 ${themeMode === "dark" ? "text-[#ff0000]" : "text-[#888]"}`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isLight ? "text-[#111111]" : "text-white"}`}>
                            {t.darkTheme}
                          </p>
                          <p className={`text-[10px] truncate ${isLight ? "text-[#71717a]" : "text-[#888]"}`}>
                            {t.darkThemeDesc}
                          </p>
                        </div>
                      </div>
                      {themeMode === "dark" && (
                        <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center shrink-0 ml-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* System (OS) Theme Card */}
                  <button
                    onClick={() => setTheme("system")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-2.5 group ${
                      themeMode === "system"
                        ? "border-[#ff0000] ring-2 ring-[#ff0000]/25 bg-red-50/10"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    {/* Compact Mini Preview: Split Half Light & Half Dark */}
                    <div className="w-full h-14 rounded-xl border border-neutral-300 dark:border-neutral-800 flex overflow-hidden shadow-inner">
                      <div className="w-1/2 h-full bg-[#f0f0f0] p-1.5 flex flex-col justify-between border-r border-[#e4e4e7]">
                        <div className="w-2 h-2 rounded-full bg-[#ff0000]" />
                        <div className="w-3/4 h-1.5 rounded bg-white" />
                      </div>
                      <div className="w-1/2 h-full bg-[#080808] p-1.5 flex flex-col justify-between">
                        <div className="w-2 h-2 rounded-full bg-[#ff0000] opacity-80" />
                        <div className="w-3/4 h-1.5 rounded bg-[#181818]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Monitor className={`w-3.5 h-3.5 shrink-0 ${themeMode === "system" ? "text-[#ff0000]" : "text-[#888]"}`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isLight ? "text-[#111111]" : "text-white"}`}>
                            {t.systemTheme}
                          </p>
                          <p className={`text-[10px] truncate ${isLight ? "text-[#71717a]" : "text-[#888]"}`}>
                            {t.systemThemeDesc}
                          </p>
                        </div>
                      </div>
                      {themeMode === "system" && (
                        <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center shrink-0 ml-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div className="space-y-3 pt-3 border-t border-inherit">
                <label className={`text-xs font-bold ${isLight ? "text-[#18181b]" : "text-slate-300"}`}>
                  {t.languageSelection}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      language === "en"
                        ? "border-[#ff0000] ring-1 ring-[#ff0000]/30 bg-rose-500/5 font-bold"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Languages className="w-4 h-4 text-[#ff0000]" />
                      <span className="text-xs font-semibold">English (Default)</span>
                    </div>
                    {language === "en" && (
                      <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setLanguage("tr")}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      language === "tr"
                        ? "border-[#ff0000] ring-1 ring-[#ff0000]/30 bg-rose-500/5 font-bold"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Languages className="w-4 h-4 text-[#ff0000]" />
                      <span className="text-xs font-semibold">Türkçe</span>
                    </div>
                    {language === "tr" && (
                      <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAYBACK */}
          {activeTab === "playback" && (
            <div
              className={`p-6 rounded-3xl border transition-all shadow-sm space-y-5 ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  {t.playback}
                </h3>
                <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                  {t.playbackSubtitle}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-4">
                    <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                      {t.streamingQuality}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {t.streamingQualityDesc}
                    </p>
                  </div>

                  {/* Audio Quality Dropdown Selector */}
                  <div className="relative shrink-0" ref={qualityDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsQualityDropdownOpen((prev) => !prev)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                        isLight
                          ? "bg-white border-[#e4e4e7] text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300"
                          : "bg-[#181818] border-[#2a2a2a] text-neutral-200 hover:bg-[#202020] hover:border-[#383838]"
                      }`}
                    >
                      <span>
                        {audioQuality === "high"
                          ? t.qualityHigh
                          : audioQuality === "normal"
                          ? t.qualityNormal
                          : t.qualityLow}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isQualityDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isQualityDropdownOpen && (
                      <div
                        className={`absolute right-0 top-full mt-1.5 z-40 min-w-[260px] rounded-2xl shadow-2xl p-1.5 text-xs font-medium select-none animate-in fade-in zoom-in-95 duration-100 ${
                          isLight
                            ? "bg-white border border-neutral-200 text-neutral-800 shadow-neutral-400/20"
                            : "bg-[#1e1e1e] border border-white/10 text-white shadow-black/80"
                        }`}
                      >
                        {[
                          { key: "high" as const, label: t.qualityHigh },
                          { key: "normal" as const, label: t.qualityNormal },
                          { key: "low" as const, label: t.qualityLow },
                        ].map((opt) => {
                          const isSelected = audioQuality === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => handleSelectQuality(opt.key)}
                              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer ${
                                isSelected
                                  ? isLight
                                    ? "text-[#ff0000] font-bold bg-red-50/70"
                                    : "text-[#ff0000] font-bold bg-white/10"
                                  : isLight
                                  ? "hover:bg-neutral-100 text-neutral-700"
                                  : "hover:bg-white/10 text-neutral-300"
                              }`}
                            >
                              <span className="truncate">{opt.label}</span>
                              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 stroke-[3] text-[#ff0000]" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Audio Output Device Row */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-inherit">
                  <div className="min-w-0 pr-4">
                    <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                      {t.outputDevice}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {t.outputDeviceDesc}
                    </p>
                  </div>

                  {/* Output Device Dropdown Selector with Refresh Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scanAndLoadAudioDevices()}
                      disabled={isScanningDevices}
                      data-tooltip={t.scanDevices}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isLight
                          ? "bg-white border-[#e4e4e7] text-neutral-600 hover:text-black hover:bg-neutral-50 shadow-sm"
                          : "bg-[#181818] border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#202020]"
                      }`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isScanningDevices ? "animate-spin text-[#ff0000]" : ""}`}
                      />
                    </button>

                    <div className="relative shrink-0" ref={deviceDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDeviceDropdownOpen((prev) => !prev)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm max-w-[260px] ${
                          isLight
                            ? "bg-white border-[#e4e4e7] text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300"
                            : "bg-[#181818] border-[#2a2a2a] text-neutral-200 hover:bg-[#202020] hover:border-[#383838]"
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 shrink-0 text-[#ff0000]" />
                        <span className="truncate">
                          {outputDevices.find((d) => d.deviceId === selectedDeviceId)?.label ||
                            (selectedDeviceId === "default" ? t.defaultOutputDevice : selectedDeviceId)}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                            isDeviceDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isDeviceDropdownOpen && (
                        <div
                          className={`absolute right-0 top-full mt-1.5 z-40 min-w-[280px] max-w-[360px] max-h-64 overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl p-1.5 text-xs font-medium select-none animate-in fade-in zoom-in-95 duration-100 ${
                            isLight
                              ? "bg-white border border-neutral-200 text-neutral-800 shadow-neutral-400/20"
                              : "bg-[#1e1e1e] border border-white/10 text-white shadow-black/80"
                          }`}
                        >
                          {(outputDevices.length > 0
                            ? outputDevices
                            : [{ deviceId: "default", label: t.defaultOutputDevice }]
                          ).map((dev) => {
                            const isSelected = selectedDeviceId === dev.deviceId;
                            return (
                              <button
                                key={dev.deviceId}
                                type="button"
                                onClick={() => handleSelectDevice(dev.deviceId)}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer ${
                                  isSelected
                                    ? isLight
                                      ? "text-[#ff0000] font-bold bg-red-50/70"
                                      : "text-[#ff0000] font-bold bg-white/10"
                                    : isLight
                                    ? "hover:bg-neutral-100 text-neutral-700"
                                    : "hover:bg-white/10 text-neutral-300"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Volume2
                                    className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#ff0000]" : "text-neutral-400"}`}
                                  />
                                  <span className="truncate">{dev.label}</span>
                                </div>
                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 stroke-[3] text-[#ff0000]" />
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          <div className="pt-1 mt-1 border-t border-inherit space-y-1">
                            {typeof navigator !== "undefined" && typeof (navigator.mediaDevices as any)?.selectAudioOutput === "function" && (
                              <button
                                type="button"
                                onClick={handleSelectAudioOutput}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isLight
                                    ? "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <Volume2 className="w-3 h-3 text-[#ff0000]" />
                                <span>{t.selectFromSystem}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => scanAndLoadAudioDevices()}
                              disabled={isScanningDevices}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                                isLight
                                  ? "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${isScanningDevices ? "animate-spin text-[#ff0000]" : ""}`}
                              />
                              <span>{isScanningDevices ? t.scanningDevices : t.scanDevices}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-inherit">
                  <div>
                    <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                      Crossfade Transitions
                    </p>
                    <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      Allows smooth crossfades between songs.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#ff0000] font-semibold">1.5s</span>
                </div>

                {/* Discord Rich Presence (RPC) Row */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-inherit">
                  <div className="min-w-0 pr-4">
                    <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                      {t.discordRpcTitle}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {t.discordRpcDesc}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={discordRpcEnabled}
                    onClick={handleToggleDiscordRpc}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      discordRpcEnabled ? "bg-[#ff0000]" : isLight ? "bg-neutral-300" : "bg-neutral-700"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        discordRpcEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIBRARY */}
          {activeTab === "library" && (
            <div
              className={`p-6 rounded-3xl border transition-all shadow-sm space-y-5 ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  {t.library}
                </h3>
                <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                  Cache and audio buffer settings
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                    Streaming Cache
                  </p>
                  <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                    Preload next queued track for instantaneous zero-latency playback.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-semibold">
                  Enabled
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: ABOUT (Hakkında: App Info, Updates & GitHub) */}
          {activeTab === "about" && (
            <div className="space-y-6">
              {/* Main App Brand Card */}
              <div
                className={`p-6 rounded-3xl border transition-all shadow-sm ${
                  isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Tubify Brand Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff2a2a] via-[#ff0000] to-[#b30000] flex items-center justify-center text-white shadow-lg shadow-red-500/25 shrink-0">
                    <Sparkles className="w-7 h-7 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className={`text-xl font-extrabold tracking-tight ${isLight ? "text-[#111111]" : "text-white"}`}>
                        Tubify
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                        v{appVersion}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-medium ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      Ultra-lightweight Standalone YouTube Music Client
                    </p>
                  </div>
                </div>
              </div>

              {/* Updates Section Card */}
              <div
                className={`p-6 rounded-3xl border transition-all shadow-sm space-y-4 ${
                  isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                      {t.checkForUpdates}
                    </h3>
                    <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      {t.version}: v{appVersion}
                    </p>
                  </div>

                  <button
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#ff0000] hover:bg-[#e60000] text-white transition-all cursor-pointer shadow-md shadow-red-500/20 active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                    <span>{isCheckingUpdate ? t.checkingForUpdates : t.checkForUpdates}</span>
                  </button>
                </div>

                {/* Update Check Results */}
                {updateResult && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    {updateResult.status === "latest" && (
                      <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          {t.upToDate} (v{appVersion})
                        </span>
                      </div>
                    )}

                    {updateResult.status === "available" && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              {t.updateAvailable}: {updateResult.version}
                            </span>
                          </div>
                          <button
                            onClick={() => openExternalUrl(updateResult.url)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{t.downloadUpdate}</span>
                          </button>
                        </div>

                        {updateResult.body && (
                          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 text-[11px] leading-relaxed max-h-36 overflow-y-auto custom-scrollbar font-mono whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                            {updateResult.body}
                          </div>
                        )}
                      </div>
                    )}

                    {updateResult.status === "error" && (
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-semibold">{t.updateCheckFailed}</span>
                        </div>
                        <button
                          onClick={handleCheckUpdate}
                          className="text-xs font-bold underline hover:opacity-80 cursor-pointer"
                        >
                          Tekrar dene
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Source Code & Links Card */}
              <div
                className={`p-6 rounded-3xl border transition-all shadow-sm space-y-4 ${
                  isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
                }`}
              >
                <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  {t.sourceCodeGithub}
                </h3>

                <button
                  onClick={() => openExternalUrl("https://github.com/muratbas/Tubify")}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer text-left group hover:scale-[1.01] active:scale-[0.99] ${
                    isLight
                      ? "bg-[#fafafa] border-[#e4e4e7] hover:bg-[#f4f4f5]"
                      : "bg-[#141414] border-[#222] hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shrink-0">
                      <GithubIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                        muratbas/Tubify
                      </p>
                      <p className={`text-[11px] mt-0.5 ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                        {t.sourceCodeGithubDesc}
                      </p>
                    </div>
                  </div>

                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-[#ff0000] transition-colors" />
                </button>
              </div>

              {/* Footer info */}
              <div className="text-center pt-2">
                <p className={`text-[11px] font-medium ${isLight ? "text-[#a1a1aa]" : "text-[#555]"}`}>
                  Tubify • MIT License • YouTube & YouTube Music are trademarks of Google LLC.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
