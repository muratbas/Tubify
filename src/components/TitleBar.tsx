import { type FC, type KeyboardEvent } from "react";
import { Search, Minus, Square, X, Plus, Music2, LogIn } from "lucide-react";
import { minimizeWindow, toggleMaximizeWindow, closeWindow, openExternalUrl } from "../services/api";
import type { UserProfile, Track } from "../types/music";

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  userProfile: UserProfile;
  onOpenLogin: () => void;
  activeTrack: Track | null;
  activeTabTitle?: string;
}

export const TitleBar: FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  userProfile,
  onOpenLogin,
  activeTrack,
  activeTabTitle = "Home",
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-12 w-full bg-[#030303] select-none flex items-center justify-between px-3 z-40 border-b border-[#1b1b1b] shrink-0"
    >
      {/* Left: Branding & Tab Pills */}
      <div className="flex items-center gap-3 shrink-0" data-tauri-drag-region>
        {/* Tubify Brand (Requested: Sol üstteki zuno logosu yerine Tubify yaz) */}
        <div className="flex items-center gap-1.5 pl-1 cursor-default" data-tauri-drag-region>
          <div className="w-5 h-5 rounded-full bg-[#ff0000] flex items-center justify-center shadow-sm shadow-red-500/30">
            <div className="w-0 h-0 border-t-[3.5px] border-t-transparent border-l-[6px] border-l-white border-b-[3.5px] border-b-transparent ml-0.5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white flex items-center">
            Tubify<span className="text-[#ff0000] font-black">_</span>
          </span>
        </div>

        {/* Tab pill (Screenshot match) */}
        <div className="flex items-center gap-1 ml-2" data-tauri-drag-region>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#141414] border border-[#262626] rounded-lg text-xs text-white max-w-[200px] shadow-sm">
            <Music2 className="w-3.5 h-3.5 text-[#ff0000] shrink-0 animate-pulse" />
            <span className="truncate font-medium">
              {activeTrack ? `${activeTrack.title} - ${activeTrack.artist}` : activeTabTitle}
            </span>
          </div>
          <button
            title="Yeni Sekme"
            className="p-1 text-[#717171] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Search Bar (Screenshot match) */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center" data-tauri-drag-region>
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#717171] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search artists, songs, playlists, and albums"
            className="w-full h-8 pl-10 pr-20 bg-[#161616] hover:bg-[#1c1c1c] focus:bg-[#202020] border border-[#282828] focus:border-[#404040] rounded-full text-xs text-white placeholder-[#717171] transition-all outline-none"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#888888] bg-[#0c0c0c] border border-[#2b2b2b] rounded">
              Ctrl Space
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions, Avatar, Window Controls */}
      <div className="flex items-center gap-1 shrink-0" data-tauri-drag-region>
        {/* Discord Link */}
        <button
          onClick={() => openExternalUrl("https://discord.com")}
          title="Discord"
          className="p-1.5 text-[#888888] hover:text-white hover:bg-[#181818] rounded-md transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </button>

        {/* GitHub Link */}
        <button
          onClick={() => openExternalUrl("https://github.com/muratbas/Tubify")}
          title="GitHub Repo"
          className="p-1.5 text-[#888888] hover:text-white hover:bg-[#181818] rounded-md transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </button>

        {/* User Profile / Login Avatar */}
        <div className="ml-1 mr-2">
          {userProfile.is_authenticated ? (
            <button
              onClick={onOpenLogin}
              title={`Bağlı: ${userProfile.name || "Google Hesabım"}`}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-[#ff0000]/50 transition-all cursor-pointer"
            >
              {userProfile.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover border border-[#333]"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-[10px]">
                  {userProfile.name?.[0]?.toUpperCase() || "YT"}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1e1e1e] hover:bg-[#ff0000] hover:text-white text-slate-300 text-[11px] font-semibold border border-[#303030] transition-all cursor-pointer shadow-sm"
            >
              <LogIn className="w-3 h-3" />
              <span>Giriş Yap</span>
            </button>
          )}
        </div>

        {/* Windows Native Control Buttons (Minimize, Maximize, Close) */}
        <div className="flex items-center ml-1">
          <button
            onClick={() => minimizeWindow()}
            title="Küçült"
            className="w-9 h-8 flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow()}
            title="Ekranı Kapla"
            className="w-9 h-8 flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeWindow()}
            title="Kapat"
            className="w-9 h-8 flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
