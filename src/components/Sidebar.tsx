import { useState, type FC } from "react";
import { Heart, Search, ListFilter, Plus, Music2, FolderPlus, Radio } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
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
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"playlists" | "albums">("playlists");
  const [filterText, setFilterText] = useState("");

  const filteredPlaylists = playlists.filter((pl) => {
    if (pl.id === "LM") return false;
    return pl.title.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <aside
      className={`w-[270px] flex flex-col h-full select-none shrink-0 border-r transition-colors ${
        isLight
          ? "bg-[#f0f0f0] border-[#e4e4e7] text-[#111111]"
          : "bg-[#030303] border-[#1b1b1b] text-white"
      }`}
    >
      {/* Top Controls: Playlists / Albums Pills */}
      <div className={`p-3 space-y-2.5 border-b ${isLight ? "border-[#e4e4e7]" : "border-[#181818]"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("playlists")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "playlists"
                ? isLight
                  ? "bg-[#ffffff] text-[#18181b] shadow-sm border border-[#e4e4e7]"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]"
                : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            {t.playlists}
          </button>
          <button
            onClick={() => setActiveTab("albums")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "albums"
                ? isLight
                  ? "bg-[#ffffff] text-[#18181b] shadow-sm border border-[#e4e4e7]"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]"
                : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            {t.albums}
          </button>
        </div>

        {/* New Playlist Action Button (Screenshot 1 & 3 Match) */}
        <button
          onClick={() => {
            if (!userProfile.is_authenticated) {
              onOpenLogin();
            }
          }}
          className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-full border transition-all cursor-pointer shadow-sm ${
            isLight
              ? "bg-[#ffffff] hover:bg-[#f4f4f5] text-[#18181b] border-[#e4e4e7]"
              : "bg-[#141414] hover:bg-[#1f1f1f] text-slate-200 border-[#262626]"
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-[#ff0000]" />
          <span>{t.newPlaylist}</span>
        </button>

        {/* Filter Playlists Search Input */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="relative flex-1">
            <Search
              className={`w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 ${
                isLight ? "text-[#a1a1aa]" : "text-[#666666]"
              }`}
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t.filterPlaylists}
              className={`w-full h-7 pl-7 pr-2 bg-transparent text-xs focus:outline-none ${
                isLight
                  ? "text-[#18181b] placeholder-[#a1a1aa]"
                  : "text-white placeholder-[#555555]"
              }`}
            />
          </div>
          <button
            title="Sort"
            className={`p-1 transition-colors cursor-pointer ${
              isLight ? "text-[#71717a] hover:text-[#18181b]" : "text-[#666666] hover:text-white"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Playlist List Scrollable Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 custom-scrollbar">
        {/* Pinned 1: Liked Songs (English!) */}
        <div
          onClick={() => onSelectPlaylist("liked")}
          className={`flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer group ${
            selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
              ? isLight
                ? "bg-[#ffffff] shadow-sm border border-[#e4e4e7] text-black"
                : "bg-[#1e1e1e] text-white"
              : isLight
              ? "hover:bg-[#e4e4e7]/70 text-[#27272a]"
              : "hover:bg-[#141414] text-[#b3b3b3] hover:text-white"
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff334b] via-[#e60023] to-[#800020] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`text-xs font-bold truncate ${isLight ? "text-[#18181b]" : "text-white"}`}>
              {t.likedSongs}
            </h4>
            <p className={`text-[11px] truncate ${isLight ? "text-[#71717a]" : "text-[#777777]"}`}>
              YouTube Music • {likedSongsCount} songs
            </p>
          </div>
        </div>

        {/* Pinned 2: Episodes for Later (English! Matching screenshot 1 & 3) */}
        <div
          onClick={() => onSelectPlaylist("episodes")}
          className={`flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer group ${
            selectedPlaylistId === "episodes"
              ? isLight
                ? "bg-[#ffffff] shadow-sm border border-[#e4e4e7] text-black"
                : "bg-[#1e1e1e] text-white"
              : isLight
              ? "hover:bg-[#e4e4e7]/70 text-[#27272a]"
              : "hover:bg-[#141414] text-[#b3b3b3] hover:text-white"
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-white">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`text-xs font-bold truncate ${isLight ? "text-[#18181b]" : "text-white"}`}>
              {t.episodesForLater}
            </h4>
            <p className={`text-[11px] truncate ${isLight ? "text-[#71717a]" : "text-[#777777]"}`}>
              Auto playlist • 2 episodes
            </p>
          </div>
        </div>

        {/* User Playlists (Remain as they are!) */}
        {filteredPlaylists.map((pl) => {
          const isSelected = selectedPlaylistId === pl.id;
          return (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className={`flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer group ${
                isSelected
                  ? isLight
                    ? "bg-[#ffffff] shadow-sm border border-[#e4e4e7] text-black"
                    : "bg-[#1e1e1e] text-white"
                  : isLight
                  ? "hover:bg-[#e4e4e7]/70 text-[#27272a]"
                  : "hover:bg-[#141414] text-[#b3b3b3] hover:text-white"
              }`}
            >
              {pl.thumbnail ? (
                <img
                  src={pl.thumbnail}
                  alt={pl.title}
                  className={`w-11 h-11 rounded-xl object-cover shrink-0 border group-hover:scale-105 transition-transform ${
                    isLight ? "bg-[#e4e4e7] border-[#e4e4e7]" : "bg-[#222] border-[#2a2a2a]"
                  }`}
                />
              ) : (
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    isLight ? "bg-[#e4e4e7] border-[#e4e4e7]" : "bg-[#1c1c1c] border-[#2a2a2a]"
                  }`}
                >
                  <Music2 className="w-5 h-5 text-[#ff0000]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-bold truncate ${isLight ? "text-[#18181b]" : "group-hover:text-white"}`}>
                  {pl.title}
                </h4>
                <p className={`text-[11px] truncate ${isLight ? "text-[#71717a]" : "text-[#777777]"}`}>
                  {pl.description || userProfile.name || "Murat"}
                </p>
              </div>
            </div>
          );
        })}

        {/* Empty state or connect Google prompt */}
        {filteredPlaylists.length === 0 && !userProfile.is_authenticated && (
          <div
            className={`p-4 mt-3 text-center rounded-2xl border space-y-2.5 ${
              isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#141414] border-[#222]"
            }`}
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-[#ff0000]/10 flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-[#ff0000]" />
            </div>
            <p className={`text-xs font-bold ${isLight ? "text-[#18181b]" : "text-slate-200"}`}>
              {t.playlists}
            </p>
            <p className={`text-[11px] ${isLight ? "text-[#71717a]" : "text-[#777]"}`}>
              {t.notConnectedDesc}
            </p>
            <button
              onClick={onOpenLogin}
              className="w-full py-1.5 px-3 bg-[#ff0000] hover:bg-[#e60000] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {t.connectGoogle}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
