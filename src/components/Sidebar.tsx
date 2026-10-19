import { useState, type FC, type MouseEvent } from "react";
import {
  Home,
  Search,
  Library,
  Plus,
  Pin,
  Music2,
  FolderPlus,
  LayoutGrid,
  ChevronDown,
  PanelLeft,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "../context/ThemeContext";
import type { Playlist, UserProfile } from "../types/music";

interface SidebarProps {
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist | "liked" | "episodes") => void;
  likedSongsCount: number;
  playlists: Playlist[];
  userProfile: UserProfile;
  onOpenLogin: () => void;
  currentView?: "home" | "playlist" | "search" | "settings";
  onNavigateHome?: () => void;
  onNavigateSearch?: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  selectedPlaylistId,
  onSelectPlaylist,
  likedSongsCount,
  playlists,
  userProfile,
  onOpenLogin,
  currentView = "home",
  onNavigateHome,
  onNavigateSearch,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeFilter, setActiveFilter] = useState<"all" | "playlists" | "albums" | "artists" | "podcasts">("all");
  const [filterText, setFilterText] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredPlaylists = playlists.filter((pl) => {
    if (pl.id === "LM") return false;
    if (!filterText) return true;
    return pl.title.toLowerCase().includes(filterText.toLowerCase());
  });

  const isHomeActive = currentView === "home" && !selectedPlaylistId;
  const isSearchActive = currentView === "search";

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
    <aside
      className={`w-[260px] flex flex-col select-none shrink-0 h-full border-r transition-colors ${
        isLight
          ? "bg-white border-[#f0f0f0] text-neutral-800"
          : "bg-[#121212] border-white/10 text-white"
      }`}
    >
      {/* 1. Top Section: Ana Sayfa & Ara (No empty gap above it, immediate start) */}
      <div
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
        className="px-5 pt-3.5 space-y-3.5 shrink-0"
      >
        <button
          onClick={onNavigateHome}
          className={`w-full flex items-center gap-4 text-sm font-semibold transition-colors cursor-pointer text-left ${
            isHomeActive
              ? "text-[#ff0000]"
              : isLight
              ? "text-neutral-700 hover:text-neutral-900"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? "text-[#ff0000]" : ""}`} />
          <span>Ana Sayfa</span>
        </button>

        <button
          onClick={onNavigateSearch}
          className={`w-full flex items-center gap-4 text-sm font-semibold transition-colors cursor-pointer text-left ${
            isSearchActive
              ? "text-[#ff0000]"
              : isLight
              ? "text-neutral-700 hover:text-neutral-900"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Search className={`w-5 h-5 ${isSearchActive ? "text-[#ff0000]" : ""}`} />
          <span>Ara</span>
        </button>
      </div>

      {/* Thin Horizontal Divider */}
      <div
        className={`my-3 mx-4 border-b ${
          isLight ? "border-neutral-200" : "border-white/10"
        }`}
      />

      {/* 2. Library Section: Kitaplık, Filtreler, Çalma Listeleri */}
      <div className="flex-1 flex flex-col px-3 overflow-hidden min-h-0">
        {/* Kitaplık Header (Matching screenshot 2: Kitaplık + Search + Plus + LayoutGrid + PanelLeft) */}
        <div
          className={`flex items-center justify-between px-2 py-1 ${
            isLight ? "text-neutral-700" : "text-neutral-300"
          }`}
        >
          <button
            onClick={onNavigateHome}
            className={`flex items-center gap-2.5 font-bold text-sm transition-colors cursor-pointer ${
              isLight ? "hover:text-neutral-900" : "hover:text-white"
            }`}
          >
            <Library className="w-5 h-5" />
            <span>Kitaplık</span>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Kitaplıkta ara"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (!userProfile.is_authenticated) {
                  onOpenLogin();
                }
              }}
              title="Çalma listesi oluştur"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              title="Görünüm"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              title="Daralt"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isLight ? "hover:bg-neutral-100 hover:text-black" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills (wrapped into 2 clean rows with no scrollbar, exactly matching user screenshot 2) */}
        <div className="flex flex-wrap gap-1.5 px-2 py-2 shrink-0">
          <button
            onClick={() => setActiveFilter((prev) => (prev === "playlists" ? "all" : "playlists"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeFilter === "playlists"
                ? "bg-black text-white"
                : isLight
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                : "bg-white/10 hover:bg-white/15 text-white/80"
            }`}
          >
            Çalma Listeleri
          </button>
          <button
            onClick={() => setActiveFilter((prev) => (prev === "albums" ? "all" : "albums"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeFilter === "albums"
                ? "bg-black text-white"
                : isLight
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                : "bg-white/10 hover:bg-white/15 text-white/80"
            }`}
          >
            Albümler
          </button>
          <button
            onClick={() => setActiveFilter((prev) => (prev === "artists" ? "all" : "artists"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeFilter === "artists"
                ? "bg-black text-white"
                : isLight
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                : "bg-white/10 hover:bg-white/15 text-white/80"
            }`}
          >
            Sanatçılar
          </button>
          <button
            onClick={() => setActiveFilter((prev) => (prev === "podcasts" ? "all" : "podcasts"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeFilter === "podcasts"
                ? "bg-black text-white"
                : isLight
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                : "bg-white/10 hover:bg-white/15 text-white/80"
            }`}
          >
            Podcast'ler
          </button>
        </div>

        {/* Sort Pill Row (matches screenshot 2: v Son çalınanlar) */}
        <div className="px-2 py-1 shrink-0">
          {isSearchOpen ? (
            <div className="w-full relative">
              <input
                type="text"
                autoFocus
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Kitaplıkta ara..."
                className={`w-full h-7 pl-2 pr-6 rounded text-xs outline-none ${
                  isLight
                    ? "bg-white border border-neutral-200 text-neutral-900"
                    : "bg-[#242424] text-white"
                }`}
              />
              {filterText && (
                <button
                  onClick={() => setFilterText("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <button
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? "bg-neutral-100/90 text-neutral-700 hover:bg-neutral-200"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
              title="Sıralama ölçütü"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Son çalınanlar</span>
            </button>
          )}
        </div>

        {/* Playlist List (Scrollable, 44x44 thumbnails, zero text clipping) */}
        <div className="flex-1 overflow-y-auto px-1 py-1 space-y-0.5 custom-scrollbar">
          {/* Pinned: Beğenilenler */}
          <div
            onClick={() => onSelectPlaylist("liked")}
            className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group ${
              selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                ? isLight
                  ? "bg-neutral-100/90 text-neutral-900"
                  : "bg-white/15 text-white"
                : isLight
                ? "hover:bg-neutral-100/60 text-neutral-600"
                : "hover:bg-white/5 text-neutral-400"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-md bg-gradient-to-br from-[#450af5] via-[#8e2de2] to-[#c471ed] flex items-center justify-center shrink-0 shadow-sm">
                <svg
                  className="w-5 h-5 text-white fill-white"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              <div className="min-w-0">
                <h4
                  className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                    selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                      ? "text-[#ff0000]"
                      : isLight
                      ? "text-neutral-900"
                      : "text-white"
                  }`}
                >
                  Beğenilenler
                </h4>
                <p
                  className={`text-xs truncate leading-normal py-0.5 ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  Çalma listesi • {likedSongsCount} şarkı
                </p>
              </div>
            </div>

            {/* YouTube Red Pin */}
            <Pin className="w-3.5 h-3.5 text-[#ff0000] fill-[#ff0000] rotate-45 shrink-0" />
          </div>

          {/* User Playlists */}
          {filteredPlaylists.map((pl) => {
            const isSelected = selectedPlaylistId === pl.id;

            return (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group ${
                  isSelected
                    ? isLight
                      ? "bg-neutral-100/90 text-neutral-900"
                      : "bg-white/15 text-white"
                    : isLight
                    ? "hover:bg-neutral-100/60 text-neutral-600"
                    : "hover:bg-white/5 text-neutral-400"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt={pl.title}
                      className="w-11 h-11 rounded-md object-cover shrink-0 bg-neutral-200"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                        isLight ? "bg-neutral-100" : "bg-[#282828]"
                      }`}
                    >
                      <Music2 className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4
                      className={`text-sm font-semibold truncate leading-normal py-0.5 ${
                        isSelected
                          ? "text-[#ff0000]"
                          : isLight
                          ? "text-neutral-900"
                          : "text-white"
                      }`}
                    >
                      {pl.title}
                    </h4>
                    <p
                      className={`text-xs truncate leading-normal py-0.5 ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      Çalma Listesi • {userProfile.name || "murat"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Connect Google CTA if not signed in */}
          {filteredPlaylists.length === 0 && !userProfile.is_authenticated && (
            <div
              className={`p-4 mt-2 text-center rounded-lg space-y-2 ${
                isLight ? "bg-neutral-50 border border-neutral-200" : "bg-[#181818]"
              }`}
            >
              <FolderPlus className="w-6 h-6 mx-auto text-neutral-400" />
              <p className={`text-xs font-bold ${isLight ? "text-neutral-900" : "text-white"}`}>
                İlk çalma listeni oluştur
              </p>
              <p className={`text-[11px] ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                Çalma listelerine ve beğenilen şarkılarına erişmek için Google hesabına bağlan.
              </p>
              <button
                onClick={onOpenLogin}
                className="w-full py-1.5 px-3 bg-[#ff0000] text-white text-xs font-bold rounded-full hover:bg-[#e60000] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Giriş Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
