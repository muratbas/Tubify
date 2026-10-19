import { useState, useRef, useEffect, type FC, type KeyboardEvent, type MouseEvent } from "react";
import {
  Search,
  Minus,
  Square,
  X,
  LogIn,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
}

export const TitleBar: FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  userProfile,
  onOpenLogin,
  onOpenSettings,
  onNavigateHome,
  onNavigateBack,
  onNavigateForward,
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
        getCurrentWindow().startDragging();
      } catch (err) {
        console.debug("Drag error:", err);
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className="h-14 w-full select-none flex items-center justify-between px-5 z-30 shrink-0 bg-transparent transition-colors absolute top-0 left-0 right-0"
    >
      {/* Left: Navigation Buttons (< and >) and Search Bar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onNavigateBack || onNavigateHome}
          title="Geri"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isLight
              ? "bg-black/10 hover:bg-black/20 text-neutral-800"
              : "bg-black/40 hover:bg-black/70 text-white"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onNavigateForward}
          title="İleri"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isLight
              ? "bg-black/5 hover:bg-black/15 text-neutral-500"
              : "bg-black/20 hover:bg-black/50 text-white/50"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Round Spotifast Search Bar (w-[280px]) */}
        <div className="relative w-[280px] ml-1 group">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              isLight
                ? "text-neutral-500 group-focus-within:text-neutral-900"
                : "text-neutral-400 group-focus-within:text-white"
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ne çalmak istersiniz?"
            className={`w-full h-8 pl-9 pr-12 rounded-full text-sm font-medium transition-all outline-none border shadow-sm ${
              isLight
                ? "bg-white text-neutral-900 placeholder-neutral-500 border-neutral-200/80 focus:border-neutral-400"
                : "bg-[#242424] text-white placeholder-neutral-400 border-transparent focus:border-white/20"
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <kbd
              className={`px-1.5 py-0.2 text-[10px] font-mono font-medium rounded ${
                isLight ? "bg-neutral-100 text-neutral-500" : "bg-white/10 text-white/40"
              }`}
            >
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Broad Middle Draggable Region - Allows instant dragging anywhere between search and right buttons */}
      <div
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
        className="flex-1 h-full min-w-8 cursor-default"
      />

      {/* Right: Settings, User Avatar, and Window Controls (- □ ×) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Settings Button */}
        <button
          onClick={() => onOpenSettings("account")}
          title={t.settings}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isLight
              ? "text-neutral-600 hover:text-neutral-900 hover:bg-black/5"
              : "text-neutral-300 hover:text-white hover:bg-white/10"
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile / Avatar with Dropdown */}
        <div className="relative mr-2" ref={avatarMenuRef}>
          {userProfile.is_authenticated ? (
            <>
              <button
                onClick={() => setIsAvatarMenuOpen((p) => !p)}
                title={userProfile.name || "Kullanıcı"}
                className="flex items-center p-0.5 rounded-full hover:scale-105 transition-all cursor-pointer ring-2 ring-transparent hover:ring-[#ff0000]"
              >
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {userProfile.name?.[0]?.toUpperCase() || "M"}
                  </div>
                )}
              </button>

              {isAvatarMenuOpen && (
                <div
                  className={`absolute right-0 top-11 w-52 rounded-xl p-2 shadow-2xl border z-50 animate-in fade-in zoom-in-95 duration-100 no-drag ${
                    isLight
                      ? "bg-white border-neutral-200 text-neutral-900"
                      : "bg-[#282828] border-white/10 text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 p-2">
                    {userProfile.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full object-cover"
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
                      <p className={`text-[11px] ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                        {t.signedIn}
                      </p>
                    </div>
                  </div>

                  <div className={`my-1 border-t ${isLight ? "border-neutral-200" : "border-white/10"}`} />

                  <button
                    onClick={() => {
                      setIsAvatarMenuOpen(false);
                      onOpenSettings("account");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isLight ? "hover:bg-neutral-100 text-neutral-900" : "hover:bg-white/10 text-white"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-neutral-500" />
                    <span>{t.accountSettings}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#ff0000] text-white hover:bg-[#e60000] hover:scale-105 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>

        {/* Windows Native Controls (- □ ×) */}
        <div className="flex items-center -mr-2">
          <button
            onClick={() => minimizeWindow()}
            title="Simge Durumuna Küçült"
            className={`w-10 h-9 flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? "text-neutral-600 hover:bg-black/10 hover:text-black" : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow()}
            title="Büyüt / Geri Yükle"
            className={`w-10 h-9 flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? "text-neutral-600 hover:bg-black/10 hover:text-black" : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => closeWindow()}
            title="Kapat"
            className="w-10 h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
export default TitleBar;
