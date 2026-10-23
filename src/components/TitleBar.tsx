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
  ArrowDownToLine,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useDownload } from "../context/DownloadContext";
import { DownloadsPopover } from "./DownloadsPopover";
import type { UserProfile } from "../types/music";

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  userProfile: UserProfile;
  currentView: "home" | "playlist" | "search" | "settings" | "artist" | "album" | "lyrics" | "downloads";
  currentTabTitle?: string;
  onOpenLogin: () => void;
  onOpenSettings: (tab?: "account" | "appearance" | "playback" | "library" | "window" | "shortcuts") => void;
  onNavigateHome: () => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onOpenDownloadsView?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isScrolled?: boolean;
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
  onOpenDownloadsView,
  canGoBack = false,
  canGoForward = false,
  isScrolled = false,
  currentView: _currentView = "home",
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const {
    isPopoverOpen: isDownloadsOpen,
    togglePopover: toggleDownloadsPopover,
    setIsPopoverOpen: setIsDownloadsOpen,
    isDownloadingAny,
  } = useDownload();

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
      className={`h-14 w-full select-none flex items-center justify-between px-5 z-20 shrink-0 transition-all duration-300 ease-out relative ${
        isScrolled
          ? isLight
            ? "bg-white/90 backdrop-blur-md border-b border-black/5 shadow-sm text-[#111111]"
            : "bg-[#121212]/90 backdrop-blur-md border-b border-white/5 shadow-sm text-white"
          : "bg-transparent border-b border-transparent shadow-none text-current"
      }`}
    >
      {/* Left: Navigation Buttons (< and >) and Search Bar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onNavigateBack || onNavigateHome}
          disabled={!canGoBack}
          {...(canGoBack ? { "data-tooltip": "Geri", "data-tooltip-side": "bottom" } : {})}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            canGoBack
              ? isLight
                ? "bg-black/10 hover:bg-black/20 text-neutral-800 cursor-pointer active:scale-95"
                : "bg-black/40 hover:bg-black/70 text-white cursor-pointer active:scale-95"
              : isLight
              ? "bg-black/5 text-neutral-300 cursor-not-allowed opacity-40"
              : "bg-white/5 text-white/20 cursor-not-allowed opacity-30"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onNavigateForward}
          disabled={!canGoForward}
          {...(canGoForward ? { "data-tooltip": "İleri", "data-tooltip-side": "bottom" } : {})}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            canGoForward
              ? isLight
                ? "bg-black/10 hover:bg-black/20 text-neutral-800 cursor-pointer active:scale-95"
                : "bg-black/40 hover:bg-black/70 text-white cursor-pointer active:scale-95"
              : isLight
              ? "bg-black/5 text-neutral-300 cursor-not-allowed opacity-40"
              : "bg-white/5 text-white/20 cursor-not-allowed opacity-30"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Extended Spotifast Search Bar - Flexible and responsive */}
        <div className="relative w-44 sm:w-60 md:w-80 lg:w-[420px] max-w-[420px] min-w-[120px] flex-1 ml-1 group">
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
          <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center pointer-events-none">
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

      {/* Broad Middle Draggable Region */}
      <div
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
        className="flex-1 h-full min-w-4 cursor-default"
      />

      {/* Settings and Profile */}
      <div className="flex items-center gap-2 shrink-0 mr-28">
        {/* Downloads Button and Popover */}
        <div className="relative">
          <button
            onClick={toggleDownloadsPopover}
            data-tooltip="İndirilenler"
            data-tooltip-side="bottom"
            className={`p-2 rounded-full transition-colors cursor-pointer relative ${
              isLight
                ? "text-neutral-600 hover:text-neutral-900 hover:bg-black/5"
                : "text-neutral-300 hover:text-white hover:bg-white/10"
            } ${isDownloadsOpen ? (isLight ? "bg-black/10 text-neutral-900" : "bg-white/15 text-white") : ""}`}
          >
            {isDownloadingAny ? (
              <div className="relative flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4 text-[#ff0000]" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff0000] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff0000]"></span>
                </span>
              </div>
            ) : (
              <ArrowDownToLine className="w-4 h-4" />
            )}
          </button>

          <DownloadsPopover
            isOpen={isDownloadsOpen}
            onClose={() => setIsDownloadsOpen(false)}
            onOpenDownloadsView={onOpenDownloadsView || (() => {})}
          />
        </div>

        {/* Settings Button */}
        <button
          onClick={() => onOpenSettings("account")}
          data-tooltip={t.settings}
          data-tooltip-side="bottom"
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
                data-tooltip={userProfile.name || "Kullanıcı"}
                data-tooltip-side="bottom"
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
      </div>

      {/* Windows Native Controls (- □ ×) - PERMANENTLY ANCHORED to top-right corner of window, NEVER pushed off-screen */}
      <div className="absolute right-0 top-0 h-14 flex items-center z-50 pr-2">
        <button
          onClick={() => minimizeWindow()}
          data-tooltip="Simge Durumuna Küçült"
          data-tooltip-side="bottom"
          className={`w-10 h-9 flex items-center justify-center transition-colors cursor-pointer ${
            isLight ? "text-neutral-600 hover:bg-black/10 hover:text-black" : "text-neutral-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => toggleMaximizeWindow()}
          data-tooltip="Büyüt / Geri Yükle"
          data-tooltip-side="bottom"
          className={`w-10 h-9 flex items-center justify-center transition-colors cursor-pointer ${
            isLight ? "text-neutral-600 hover:bg-black/10 hover:text-black" : "text-neutral-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => closeWindow()}
          data-tooltip="Kapat"
          data-tooltip-side="bottom"
          className="w-10 h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
export default TitleBar;
