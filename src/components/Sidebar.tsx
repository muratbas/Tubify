import { useState, type FC } from "react";
import {
  Heart,
  Search,
  ListFilter,
  Plus,
  Music2,
  FolderPlus,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  Library,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { usePlayer } from "../context/PlayerContext";
import type { Playlist, UserProfile } from "../types/music";

interface SidebarProps {
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist | "liked" | "episodes") => void;
  likedSongsCount: number;
  playlists: Playlist[];
  userProfile: UserProfile;
  onOpenLogin: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  selectedPlaylistId,
  onSelectPlaylist,
  likedSongsCount,
  playlists,
  userProfile,
  onOpenLogin,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isSidebarCollapsed, toggleSidebarCollapsed } = usePlayer();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"playlists" | "albums">("playlists");
  const [filterText, setFilterText] = useState("");

  const filteredPlaylists = playlists.filter((pl) => {
    if (pl.id === "LM") return false;
    return pl.title.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <aside
      className={`h-full flex flex-col rounded-2xl overflow-hidden shrink-0 border transition-all duration-300 relative select-none ${
        isSidebarCollapsed ? "w-[72px]" : "w-[260px] xl:w-[280px]"
      } ${
        isLight
          ? "bg-[#ffffff]/90 border-[#e4e4e7] text-[#111111] shadow-sm"
          : "bg-[#09090c]/85 border-white/[0.08] text-white shadow-2xl backdrop-blur-xl"
      }`}
    >
      {/* Top Header / Library Bar */}
      <div
        className={`p-3 flex items-center justify-between border-b shrink-0 ${
          isLight ? "border-[#e4e4e7]" : "border-white/[0.08]"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0 text-[#ff0000]">
            <Library className="w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <span
              className={`font-extrabold text-xs tracking-tight uppercase ${
                isLight ? "text-[#18181b]" : "text-white/90"
              }`}
            >
              {t.library}
            </span>
          )}
        </div>

        <button
          onClick={toggleSidebarCollapsed}
          title={isSidebarCollapsed ? t.expandSidebar : t.collapseSidebar}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
              : "text-white/60 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded Controls */}
      {!isSidebarCollapsed && (
        <div
          className={`p-3 space-y-2.5 border-b shrink-0 ${
            isLight ? "border-[#e4e4e7]" : "border-white/[0.06]"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("playlists")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "playlists"
                  ? isLight
                    ? "bg-[#18181b] text-white shadow-sm"
                    : "bg-white text-black shadow-sm"
                  : isLight
                  ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {t.playlists}
            </button>
            <button
              onClick={() => setActiveTab("albums")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "albums"
                  ? isLight
                    ? "bg-[#18181b] text-white shadow-sm"
                    : "bg-white text-black shadow-sm"
                  : isLight
                  ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {t.albums}
            </button>
          </div>

          {/* New Playlist Action Button */}
          <button
            onClick={() => {
              if (!userProfile.is_authenticated) {
                onOpenLogin();
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm active:scale-98 ${
              isLight
                ? "bg-[#ffffff] hover:bg-[#f4f4f5] text-[#18181b] border-[#e4e4e7]"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/90 border-white/[0.08]"
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-[#ff0000]" />
            <span>{t.newPlaylist}</span>
          </button>

          {/* Filter Playlists Search Input */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="relative flex-1">
              <Search
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                  isLight ? "text-[#a1a1aa]" : "text-white/40"
                }`}
              />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={t.filterPlaylists}
                className={`w-full h-7 pl-8 pr-2 rounded-lg bg-white/[0.04] text-xs focus:outline-none focus:ring-1 focus:ring-[#ff0000]/50 transition-all ${
                  isLight
                    ? "text-[#18181b] placeholder-[#a1a1aa] border border-[#e4e4e7]"
                    : "text-white placeholder-white/30 border border-white/[0.06]"
                }`}
              />
            </div>
            <button
              title="Sort"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? "text-[#71717a] hover:text-[#18181b]" : "text-white/40 hover:text-white"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Playlist List Scrollable Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 custom-scrollbar">
        {/* Pinned 1: Liked Songs */}
        <div
          onClick={() => onSelectPlaylist("liked")}
          title={isSidebarCollapsed ? `${t.likedSongs} (${likedSongsCount})` : undefined}
          className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group active:scale-98 ${
            selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
              ? isLight
                ? "bg-[#18181b] text-white shadow-sm"
                : "bg-white/[0.12] text-white border border-white/[0.1]"
              : isLight
              ? "hover:bg-[#f4f4f5] text-[#27272a]"
              : "hover:bg-white/[0.04] text-white/70 hover:text-white"
          } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff334b] via-[#e60023] to-[#800020] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold truncate leading-tight">{t.likedSongs}</h4>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
                    ? isLight
                      ? "text-white/70"
                      : "text-white/60"
                    : isLight
                    ? "text-[#71717a]"
                    : "text-white/40"
                }`}
              >
                YouTube Music • {likedSongsCount} songs
              </p>
            </div>
          )}
        </div>

        {/* Pinned 2: Episodes for Later */}
        <div
          onClick={() => onSelectPlaylist("episodes")}
          title={isSidebarCollapsed ? t.episodesForLater : undefined}
          className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group active:scale-98 ${
            selectedPlaylistId === "episodes"
              ? isLight
                ? "bg-[#18181b] text-white shadow-sm"
                : "bg-white/[0.12] text-white border border-white/[0.1]"
              : isLight
              ? "hover:bg-[#f4f4f5] text-[#27272a]"
              : "hover:bg-white/[0.04] text-white/70 hover:text-white"
          } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-white">
            <Radio className="w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold truncate leading-tight">{t.episodesForLater}</h4>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  selectedPlaylistId === "episodes"
                    ? isLight
                      ? "text-white/70"
                      : "text-white/60"
                    : isLight
                    ? "text-[#71717a]"
                    : "text-white/40"
                }`}
              >
                Auto playlist • 2 episodes
              </p>
            </div>
          )}
        </div>

        {/* User Playlists */}
        {filteredPlaylists.map((pl) => {
          const isSelected = selectedPlaylistId === pl.id;
          return (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              title={isSidebarCollapsed ? pl.title : undefined}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group active:scale-98 ${
                isSelected
                  ? isLight
                    ? "bg-[#18181b] text-white shadow-sm"
                    : "bg-white/[0.12] text-white border border-white/[0.1]"
                  : isLight
                  ? "hover:bg-[#f4f4f5] text-[#27272a]"
                  : "hover:bg-white/[0.04] text-white/70 hover:text-white"
              } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
            >
              {pl.thumbnail ? (
                <img
                  src={pl.thumbnail}
                  alt={pl.title}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 bg-zinc-800 shadow-sm group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Music2 className="w-4 h-4 text-[#ff0000]" />
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate leading-tight">{pl.title}</h4>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected
                        ? isLight
                          ? "text-white/70"
                          : "text-white/60"
                        : isLight
                        ? "text-[#71717a]"
                        : "text-white/40"
                    }`}
                  >
                    {pl.description || userProfile.name || "YouTube Music"}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state / Connect Google button */}
        {!isSidebarCollapsed && filteredPlaylists.length === 0 && !userProfile.is_authenticated && (
          <div
            className={`p-4 mt-2 text-center rounded-2xl border space-y-2.5 ${
              isLight ? "bg-[#f4f4f5]/60 border-[#e4e4e7]" : "bg-white/[0.02] border-white/[0.06]"
            }`}
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-[#ff0000]/10 flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-[#ff0000]" />
            </div>
            <p className={`text-xs font-bold ${isLight ? "text-[#18181b]" : "text-white/90"}`}>
              {t.playlists}
            </p>
            <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-white/50"}`}>
              {t.notConnectedDesc}
            </p>
            <button
              onClick={onOpenLogin}
              className="w-full py-1.5 px-3 bg-[#ff0000] hover:bg-[#e60000] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
            >
              {t.connectGoogle}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
