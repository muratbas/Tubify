import { useState, useRef, useEffect, type FC, type KeyboardEvent, type MouseEvent } from "react";
import { Search, Minus, Square, X, LogIn, Settings, Bookmark, Download } from "lucide-react";
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import type { UserProfile } from "../types/music";

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  userProfile: UserProfile;
  currentView: "home" | "playlist" | "search" | "settings";
  currentTabTitle?: string;
  onOpenLogin: () => void;
  onOpenSettings: (tab?: "account" | "appearance" | "playback" | "library" | "window" | "shortcuts") => void;
  onNavigateHome: () => void;
}

export const TitleBar: FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  userProfile,
  currentView,
  currentTabTitle,
  onOpenLogin,
  onOpenSettings,
  onNavigateHome,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: globalThis.MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    if (isAvatarMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isAvatarMenuOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest(".no-drag")
      ) {
        return;
      }
      try {
        import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
          getCurrentWindow().startDragging();
        });
      } catch {
        // Fallback
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className={`h-12 w-full select-none flex items-center justify-between px-3.5 z-40 shrink-0 transition-colors ${
        isLight
          ? "bg-[#f0f0f0] border-b border-[#e4e4e7] text-[#111111]"
          : "bg-[#030303] border-b border-white/[0.06] text-white"
      }`}
    >
      {/* Left: Branding + Nav Tab */}
      <div className="flex items-center gap-3 shrink-0" data-tauri-drag-region>
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2 pl-1 cursor-pointer group active:scale-98 transition-all"
          data-tauri-drag-region
        >
          <img
            src="/logo.png"
            alt="Tubify"
            className="w-5 h-5 rounded object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
          />
          <span
            className={`font-black text-sm tracking-tight flex items-center ${
              isLight ? "text-[#18181b]" : "text-white"
            }`}
          >
            Tubify<span className="text-[#ff0000] font-black">_</span>
          </span>
        </div>

        {/* View Tab */}
        <div className="flex items-center gap-1.5 ml-1" data-tauri-drag-region>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shadow-sm border transition-all ${
              isLight
                ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7]"
                : "bg-white/[0.06] text-white border-white/[0.08]"
            }`}
          >
            <span className="truncate max-w-[140px]">
              {currentView === "settings"
                ? t.settings
                : currentTabTitle || "Home"}
            </span>
          </div>

          <button
            onClick={onNavigateHome}
            title="Home Tab"
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
              isLight
                ? "text-[#71717a] hover:bg-[#e4e4e7] hover:text-[#18181b]"
                : "text-white/60 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            +
          </button>
        </div>
      </div>

      {/* Center: Command / Search Bar with Ctrl+K */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center" data-tauri-drag-region>
        <div className="relative w-full max-w-md group">
          <Search
            className={`w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              isLight
                ? "text-[#a1a1aa] group-focus-within:text-[#18181b]"
                : "text-white/40 group-focus-within:text-white"
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.searchPlaceholder}
            className={`w-full h-8 pl-9 pr-16 rounded-xl text-xs font-normal transition-all outline-none border shadow-sm ${
              isLight
                ? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:ring-1 focus:ring-[#18181b]/30"
                : "bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border-white/[0.08] text-white placeholder-white/40 focus:ring-1 focus:ring-white/20"
            }`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <kbd
              className={`px-1.5 py-0.5 text-[9px] font-mono font-medium rounded-md border ${
                isLight
                  ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a]"
                  : "bg-white/[0.06] border-white/[0.1] text-white/50"
              }`}
            >
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Quick Links, Settings, Avatar, Window Controls */}
      <div className="flex items-center gap-1 shrink-0" data-tauri-drag-region>
        <button
          title="Bookmarks"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]"
              : "text-white/50 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>

        <button
          title="Downloads"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]"
              : "text-white/50 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onOpenSettings("account")}
          title={t.settings}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            currentView === "settings"
              ? "text-[#ff0000] bg-rose-500/10"
              : isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]"
              : "text-white/50 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* User Profile / Avatar with Dropdown */}
        <div className="relative ml-1 mr-2" ref={avatarMenuRef}>
          {userProfile.is_authenticated ? (
            <>
              <button
                onClick={() => setIsAvatarMenuOpen((p) => !p)}
                title={userProfile.name || "Murat"}
                className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-[#ff0000] transition-all cursor-pointer"
              >
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover border border-[#d4d4d8] shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {userProfile.name?.[0]?.toUpperCase() || "M"}
                  </div>
                )}
              </button>

              {isAvatarMenuOpen && (
                <div
                  className={`absolute right-0 top-9 w-52 rounded-2xl p-3 shadow-2xl border z-50 animate-in fade-in zoom-in-95 duration-100 no-drag ${
                    isLight
                      ? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
                      : "bg-[#141416] border-white/[0.1] text-white backdrop-blur-xl"
                  }`}
                >
                  <div className="flex items-center gap-3 p-1">
                    {userProfile.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full object-cover border border-[#e4e4e7]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-sm">
                        {userProfile.name?.[0] || "M"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">
                        {userProfile.name || "Murat"}
                      </p>
                      <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-white/50"}`}>
                        {t.signedIn}
                      </p>
                    </div>
                  </div>

                  <div className={`my-2 border-t ${isLight ? "border-[#e4e4e7]" : "border-white/[0.08]"}`} />

                  <button
                    onClick={() => {
                      setIsAvatarMenuOpen(false);
                      onOpenSettings("account");
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isLight ? "hover:bg-[#f4f4f5] text-[#18181b]" : "hover:bg-white/[0.08] text-white/90"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-white/50" />
                    <span>{t.accountSettings}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={onOpenLogin}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                isLight
                  ? "bg-[#ffffff] hover:bg-[#ff0000] hover:text-white text-[#18181b] border-[#e4e4e7]"
                  : "bg-white/[0.06] hover:bg-[#ff0000] hover:text-white text-white/90 border-white/[0.1]"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>

        {/* Windows Native Controls */}
        <div className="flex items-center">
          <button
            onClick={() => minimizeWindow()}
            title="Minimize"
            className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:bg-[#e4e4e7]" : "text-white/60 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow()}
            title="Maximize"
            className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:bg-[#e4e4e7]" : "text-white/60 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeWindow()}
            title="Close"
            className="w-8 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-[#ff0000] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
