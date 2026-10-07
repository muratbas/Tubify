import { useState, useRef, useEffect, type FC, type KeyboardEvent, type MouseEvent } from "react";
import { Search, Minus, Square, X, LogIn, Settings, Bookmark, Download } from "lucide-react";
import { minimizeWindow, toggleMaximizeWindow, closeWindow, openExternalUrl } from "../services/api";
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
      if (target.closest("button") || target.closest("input") || target.closest("a") || target.closest(".no-drag")) {
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
      className={`h-11 w-full select-none flex items-center justify-between px-3 z-40 shrink-0 transition-colors ${
        isLight
          ? "bg-[#f0f0f0] border-b border-[#e4e4e7] text-[#111111]"
          : "bg-[#030303] border-b border-[#1b1b1b] text-white"
      }`}
    >
      {/* Left: Branding + Top Tabs (Screenshot 1 & 4 Match) */}
      <div className="flex items-center gap-2.5 shrink-0" data-tauri-drag-region>
        {/* Brand */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2 pl-1 cursor-pointer group"
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

        {/* View Tabs matching Screenshot 1 [Bauklötze] [Settings] [+] */}
        <div className="flex items-center gap-1 ml-1" data-tauri-drag-region>
          {currentView === "settings" ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm border ${
                isLight
                  ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7]"
                  : "bg-[#181818] text-white border-[#2a2a2a]"
              }`}
            >
              <span>{t.settings}</span>
            </div>
          ) : currentTabTitle ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm border truncate max-w-[150px] ${
                isLight
                  ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7]"
                  : "bg-[#181818] text-white border-[#2a2a2a]"
              }`}
            >
              <span className="truncate">{currentTabTitle}</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm border ${
                isLight
                  ? "bg-[#ffffff] text-[#18181b] border-[#e4e4e7]"
                  : "bg-[#181818] text-white border-[#2a2a2a]"
              }`}
            >
              <span>Home</span>
            </div>
          )}

          <button
            onClick={onNavigateHome}
            title="New Tab"
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:bg-[#e4e4e7] hover:text-[#18181b]" : "text-[#888] hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            +
          </button>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center" data-tauri-drag-region>
        <div className="relative w-full">
          <Search
            className={`w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isLight ? "text-[#a1a1aa]" : "text-[#717171]"
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.searchPlaceholder}
            className={`w-full h-7.5 pl-9 pr-20 rounded-full text-xs font-normal transition-all outline-none border shadow-sm ${
              isLight
                ? "bg-[#ffffff] hover:bg-[#ffffff] focus:bg-[#ffffff] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#d4d4d8]"
                : "bg-[#141414] hover:bg-[#1c1c1c] focus:bg-[#202020] border-[#262626] text-white placeholder-[#717171] focus:border-[#404040]"
            }`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                isLight
                  ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a]"
                  : "bg-[#0c0c0c] border-[#2b2b2b] text-[#888888]"
              }`}
            >
              Ctrl Space
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Quick Icons, Settings, Avatar (With Dropdown), Native Window Controls */}
      <div className="flex items-center gap-0.5 shrink-0" data-tauri-drag-region>
        {/* Bookmark Icon (Matching screenshot 1 & 4) */}
        <button
          title="Bookmarks"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]" : "text-[#888888] hover:text-white hover:bg-[#181818]"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>

        {/* Download Icon (Matching screenshot 1 & 4) */}
        <button
          title="Downloads"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]" : "text-[#888888] hover:text-white hover:bg-[#181818]"
          }`}
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Discord Link */}
        <button
          onClick={() => openExternalUrl("https://discord.com")}
          title="Discord"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight ? "text-[#71717a] hover:text-[#5865F2] hover:bg-[#e4e4e7]" : "text-[#888888] hover:text-white hover:bg-[#181818]"
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </button>

        {/* YouTube Music Icon */}
        <button
          onClick={() => openExternalUrl("https://music.youtube.com")}
          title="YouTube Music"
          className="p-1.5 rounded-md transition-colors cursor-pointer text-[#ff0000] hover:bg-rose-500/10"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-[#ff0000] flex items-center justify-center">
            <div className="w-0 h-0 border-t-[2.5px] border-t-transparent border-l-[4px] border-l-white border-b-[2.5px] border-b-transparent ml-0.5" />
          </div>
        </button>

        {/* GitHub Link */}
        <button
          onClick={() => openExternalUrl("https://github.com/muratbas/Tubify")}
          title="GitHub Repo"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]" : "text-[#888888] hover:text-white hover:bg-[#181818]"
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => onOpenSettings("account")}
          title={t.settings}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            currentView === "settings"
              ? "text-[#ff0000] bg-rose-500/10"
              : isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]"
              : "text-[#888888] hover:text-white hover:bg-[#181818]"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* User Profile / Avatar with Dropdown (Screenshot 2 Match) */}
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

              {/* Dropdown Menu (Screenshot 2 Match!) */}
              {isAvatarMenuOpen && (
                <div
                  className={`absolute right-0 top-9 w-52 rounded-2xl p-3 shadow-2xl border z-50 animate-in fade-in zoom-in-95 duration-100 no-drag ${
                    isLight
                      ? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
                      : "bg-[#141414] border-[#2a2a2a] text-white"
                  }`}
                >
                  {/* User info row */}
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
                      <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#888888]"}`}>
                        {t.signedIn}
                      </p>
                    </div>
                  </div>

                  <div className={`my-2 border-t ${isLight ? "border-[#e4e4e7]" : "border-[#222222]"}`} />

                  {/* Account Settings button */}
                  <button
                    onClick={() => {
                      setIsAvatarMenuOpen(false);
                      onOpenSettings("account");
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isLight ? "hover:bg-[#f4f4f5] text-[#18181b]" : "hover:bg-[#1f1f1f] text-slate-200"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-[#71717a]" />
                    <span>{t.accountSettings}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={onOpenLogin}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                isLight
                  ? "bg-[#ffffff] hover:bg-[#ff0000] hover:text-white text-[#18181b] border-[#e4e4e7]"
                  : "bg-[#181818] hover:bg-[#ff0000] hover:text-white text-slate-300 border-[#303030]"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>

        {/* Windows Native Control Buttons (Minimize, Maximize, Close) */}
        <div className="flex items-center ml-1">
          <button
            onClick={() => minimizeWindow()}
            title="Minimize"
            className={`w-9 h-8 flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:text-black hover:bg-[#e4e4e7]" : "text-[#aaaaaa] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow()}
            title="Maximize"
            className={`w-9 h-8 flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:text-black hover:bg-[#e4e4e7]" : "text-[#aaaaaa] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeWindow()}
            title="Close"
            className="w-9 h-8 flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
