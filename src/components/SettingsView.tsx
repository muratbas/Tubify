import { useState, type FC } from "react";
import {
  User,
  Palette,
  PlaySquare,
  FolderOpen,
  AppWindow,
  Keyboard,
  LogOut,
  LogIn,
  Plus,
  Star,
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  Check,
  Languages,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { openExternalUrl } from "../services/api";
import type { UserProfile } from "../types/music";

interface SettingsViewProps {
  initialTab?: "account" | "appearance" | "playback" | "library" | "window" | "shortcuts";
  userProfile: UserProfile;
  likedSongsCount: number;
  playlistsCount: number;
  onLogout: () => Promise<void>;
  onOpenLogin: () => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

export const SettingsView: FC<SettingsViewProps> = ({
  initialTab = "account",
  userProfile,
  onLogout,
  onOpenLogin,
  onScroll,
}) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<
    "account" | "appearance" | "playback" | "library" | "window" | "shortcuts"
  >(initialTab);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    {
      id: "account" as const,
      label: t.account,
      subtitle: "Sign-in, integrations, upd...",
      icon: User,
    },
    {
      id: "appearance" as const,
      label: t.appearance,
      subtitle: "Theme and motion",
      icon: Palette,
    },
    {
      id: "playback" as const,
      label: t.playback,
      subtitle: "Transitions and session",
      icon: PlaySquare,
    },
    {
      id: "library" as const,
      label: t.library,
      subtitle: "Cache and local files",
      icon: FolderOpen,
    },
    {
      id: "window" as const,
      label: t.window,
      subtitle: "Chrome and mini player",
      icon: AppWindow,
    },
    {
      id: "shortcuts" as const,
      label: t.shortcuts,
      subtitle: "Keyboard bindings",
      icon: Keyboard,
    },
  ];

  return (
    <div
      onScroll={onScroll}
      className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none px-10 pt-6 pb-12 space-y-7 transition-colors ${
        isLight ? "bg-[#f0f0f0] text-[#111111]" : "bg-[#030303] text-white"
      }`}
    >
      {/* 1. Header Row (Screenshot 1 Match) */}
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
          {/* TAB 1: ACCOUNT (Matching Screenshot 1) */}
          {activeTab === "account" && (
            <>
              {/* Account Box */}
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
                  <div className="space-y-6 pt-5">
                    {/* User Profile Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isLight
                            ? "text-[#18181b] hover:bg-[#f4f4f5]"
                            : "text-slate-300 hover:bg-[#1c1c1c]"
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

                    {/* ACCOUNTS Subsection */}
                    <div className="space-y-2.5 pt-2">
                      <h5 className={`text-[10px] font-bold tracking-wider uppercase ${isLight ? "text-[#a1a1aa]" : "text-[#666]"}`}>
                        {t.accounts}
                      </h5>

                      <div
                        className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                          isLight ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#161616] border-[#222]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {userProfile.avatar_url ? (
                            <img
                              src={userProfile.avatar_url}
                              alt="Avatar"
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-xs">
                              {userProfile.name?.[0] || "M"}
                            </div>
                          )}
                          <span className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                            {userProfile.name || "Murat"}
                          </span>
                        </div>
                        <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      </div>

                      <button
                        onClick={onOpenLogin}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          isLight ? "text-[#52525b] hover:text-[#111111]" : "text-[#888] hover:text-white"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addAccount}</span>
                      </button>
                    </div>

                    {/* CHANNEL Subsection */}
                    <div className="space-y-2.5 pt-2">
                      <h5 className={`text-[10px] font-bold tracking-wider uppercase ${isLight ? "text-[#a1a1aa]" : "text-[#666]"}`}>
                        {t.channel}
                      </h5>

                      <div
                        className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                          isLight ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#161616] border-[#222]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {userProfile.avatar_url ? (
                            <img
                              src={userProfile.avatar_url}
                              alt="Avatar"
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-xs">
                              {userProfile.name?.[0] || "M"}
                            </div>
                          )}
                          <span className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                            {userProfile.name || "Murat"}
                          </span>
                        </div>
                        <div className="w-4 h-4 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      </div>
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

            </>
          )}

          {/* TAB 2: APPEARANCE (Theme & Language Switching) */}
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

              {/* Theme Selection */}
              <div className="space-y-3">
                <label className={`text-xs font-bold ${isLight ? "text-[#18181b]" : "text-slate-300"}`}>
                  {t.themeSelection}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Light Mode Card */}
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-3 group ${
                      theme === "light"
                        ? "border-[#ff0000] ring-2 ring-[#ff0000]/25 bg-red-50/10"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <div className="w-full h-20 rounded-xl bg-[#f0f0f0] border border-[#e4e4e7] p-2.5 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
                        <div className="w-12 h-2 rounded-full bg-[#d4d4d8]" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-3/4 h-2 rounded bg-[#ffffff]" />
                        <div className="w-1/2 h-2 rounded bg-[#ffffff]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className={`w-4 h-4 ${theme === "light" ? "text-[#ff0000]" : "text-[#888]"}`} />
                        <div>
                          <p className={`text-xs font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                            {t.lightTheme}
                          </p>
                          <p className={`text-[10px] ${isLight ? "text-[#71717a]" : "text-[#888]"}`}>
                            {t.lightThemeDesc}
                          </p>
                        </div>
                      </div>
                      {theme === "light" && (
                        <div className="w-5 h-5 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-3 group ${
                      theme === "dark"
                        ? "border-[#ff0000] ring-2 ring-[#ff0000]/25 bg-[#161616]"
                        : isLight
                        ? "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]"
                        : "border-[#222] bg-[#141414] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <div className="w-full h-20 rounded-xl bg-[#030303] border border-[#262626] p-2.5 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
                        <div className="w-12 h-2 rounded-full bg-[#222]" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-3/4 h-2 rounded bg-[#181818]" />
                        <div className="w-1/2 h-2 rounded bg-[#181818]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className={`w-4 h-4 ${theme === "dark" ? "text-[#ff0000]" : "text-[#888]"}`} />
                        <div>
                          <p className="text-xs font-bold text-white">{t.darkTheme}</p>
                          <p className="text-[10px] text-[#888]">{t.darkThemeDesc}</p>
                        </div>
                      </div>
                      {theme === "dark" && (
                        <div className="w-5 h-5 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
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

              {/* Accent Color Display */}
              <div className="flex items-center justify-between pt-3 border-t border-inherit">
                <div>
                  <p className={`text-xs font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                    {t.accentColor}
                  </p>
                  <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#777]"}`}>
                    YouTube Red (#FF0000)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#ff0000] border-2 border-white/60 shadow-md" />
                  <span className="text-xs font-mono font-semibold text-[#ff0000]">#FF0000</span>
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                      Audio Quality
                    </p>
                    <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                      Stream at maximum available YouTube Music bitrate (up to 256kbps AAC / Opus).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-semibold">
                    High Quality
                  </span>
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

          {/* TAB 5: WINDOW */}
          {activeTab === "window" && (
            <div
              className={`p-6 rounded-3xl border transition-all shadow-sm space-y-5 ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  {t.window}
                </h3>
                <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                  Desktop window behavior & overlays
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-semibold ${isLight ? "text-[#18181b]" : "text-white"}`}>
                    {t.miniPlayerMode}
                  </p>
                  <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                    {t.miniPlayerDesc}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-semibold">
                  {t.readyToUse}
                </span>
              </div>
            </div>
          )}

          {/* TAB 6: SHORTCUTS */}
          {activeTab === "shortcuts" && (
            <div
              className={`p-6 rounded-3xl border transition-all shadow-sm space-y-5 ${
                isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#101010] border-[#222222]"
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  {t.shortcuts}
                </h3>
                <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                  {t.shortcutsSubtitle}
                </p>
              </div>

              <div className="divide-y divide-inherit text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <span className={isLight ? "text-[#52525b]" : "text-slate-300"}>Play / Pause</span>
                  <kbd className="px-2 py-1 rounded-md bg-[#e4e4e7] dark:bg-[#222] font-mono text-[11px]">
                    Space
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className={isLight ? "text-[#52525b]" : "text-slate-300"}>Next Track</span>
                  <kbd className="px-2 py-1 rounded-md bg-[#e4e4e7] dark:bg-[#222] font-mono text-[11px]">
                    Ctrl + Right
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className={isLight ? "text-[#52525b]" : "text-slate-300"}>Previous Track</span>
                  <kbd className="px-2 py-1 rounded-md bg-[#e4e4e7] dark:bg-[#222] font-mono text-[11px]">
                    Ctrl + Left
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className={isLight ? "text-[#52525b]" : "text-slate-300"}>Focus Search</span>
                  <kbd className="px-2 py-1 rounded-md bg-[#e4e4e7] dark:bg-[#222] font-mono text-[11px]">
                    Ctrl + Space
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
