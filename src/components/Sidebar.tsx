import { useState, type FC } from "react";
import { Heart, Search, ListFilter, Plus, Music2, FolderPlus } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Playlist, UserProfile } from "../types/music";

interface SidebarProps {
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist | "liked") => void;
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
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"playlists" | "albums">("playlists");
  const [filterText, setFilterText] = useState("");

  const filteredPlaylists = playlists.filter((pl) => {
    if (pl.id === "LM") return false;
    return pl.title.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <aside
      className={`w-[280px] border-r flex flex-col h-full select-none shrink-0 transition-colors ${
        isLight
          ? "bg-[#f3f4f6] border-[#e5e7eb] text-[#111111]"
          : "bg-[#0c0c0c] border-[#1a1a1a] text-white"
      }`}
    >
      {/* Top Controls: Playlists / Albums Pills */}
      <div className={`p-3.5 space-y-3 border-b ${isLight ? "border-[#e5e7eb]" : "border-[#181818]"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("playlists")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "playlists"
                ? isLight
                  ? "bg-black text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "bg-[#e5e7eb] text-[#4b5563] hover:text-black hover:bg-[#d1d5db]"
                : "bg-[#181818] text-[#999999] hover:text-white hover:bg-[#222222]"
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setActiveTab("albums")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "albums"
                ? isLight
                  ? "bg-black text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "bg-[#e5e7eb] text-[#4b5563] hover:text-black hover:bg-[#d1d5db]"
                : "bg-[#181818] text-[#999999] hover:text-white hover:bg-[#222222]"
            }`}
          >
            Albums
          </button>
        </div>

        {/* New Playlist Action Button */}
        <button
          onClick={() => {
            if (!userProfile.is_authenticated) {
              onOpenLogin();
            }
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
            isLight
              ? "bg-[#ffffff] hover:bg-[#f9fafb] text-[#1f2937] border-[#d1d5db] shadow-sm"
              : "bg-[#161616] hover:bg-[#1f1f1f] text-slate-300 hover:text-white border-[#262626]"
          }`}
        >
          <Plus className="w-4 h-4 text-[#ff0000]" />
          <span>New playlist</span>
        </button>

        {/* Filter Playlists Search Input */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="relative flex-1">
            <Search
              className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                isLight ? "text-[#9ca3af]" : "text-[#666666]"
              }`}
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter playlists"
              className={`w-full h-7 pl-8 pr-2 bg-transparent text-xs focus:outline-none ${
                isLight
                  ? "text-[#111111] placeholder-[#9ca3af]"
                  : "text-white placeholder-[#555555]"
              }`}
            />
          </div>
          <button
            title="Sırala"
            className={`p-1 transition-colors cursor-pointer ${
              isLight ? "text-[#6b7280] hover:text-[#111111]" : "text-[#666666] hover:text-white"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Playlist List Scrollable Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 custom-scrollbar">
        {/* Pinned: Liked Songs */}
        <div
          onClick={() => onSelectPlaylist("liked")}
          className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group ${
            selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
              ? isLight
                ? "bg-[#e5e7eb] text-black"
                : "bg-[#202020] text-white"
              : isLight
              ? "hover:bg-[#e5e7eb] text-[#374151]"
              : "hover:bg-[#161616] text-[#b3b3b3] hover:text-white"
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#ff334b] via-[#e60023] to-[#800020] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`text-xs font-bold truncate ${isLight ? "text-[#111111]" : "text-white"}`}>
              Liked Songs
            </h4>
            <p className={`text-[11px] truncate ${isLight ? "text-[#6b7280]" : "text-[#777777]"}`}>
              YouTube Music • {likedSongsCount} songs
            </p>
          </div>
        </div>

        {/* User Playlists */}
        {filteredPlaylists.map((pl) => {
          const isSelected = selectedPlaylistId === pl.id;
          return (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group ${
                isSelected
                  ? isLight
                    ? "bg-[#e5e7eb] text-black"
                    : "bg-[#202020] text-white"
                  : isLight
                  ? "hover:bg-[#e5e7eb] text-[#374151]"
                  : "hover:bg-[#161616] text-[#b3b3b3] hover:text-white"
              }`}
            >
              {pl.thumbnail ? (
                <img
                  src={pl.thumbnail}
                  alt={pl.title}
                  className={`w-12 h-12 rounded-lg object-cover shrink-0 border group-hover:scale-105 transition-transform ${
                    isLight ? "bg-[#e5e7eb] border-[#d1d5db]" : "bg-[#222] border-[#2a2a2a]"
                  }`}
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    isLight ? "bg-[#e5e7eb] border-[#d1d5db]" : "bg-[#1c1c1c] border-[#2a2a2a]"
                  }`}
                >
                  <Music2 className="w-5 h-5 text-[#ff0000]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-semibold truncate ${isLight ? "text-[#111111]" : "group-hover:text-white"}`}>
                  {pl.title}
                </h4>
                <p className={`text-[11px] truncate ${isLight ? "text-[#6b7280]" : "text-[#777777]"}`}>
                  {pl.description || userProfile.name || "YouTube Music"}
                </p>
              </div>
            </div>
          );
        })}

        {/* Empty state or connect Google prompt */}
        {filteredPlaylists.length === 0 && !userProfile.is_authenticated && (
          <div
            className={`p-4 mt-4 text-center rounded-2xl border space-y-2.5 ${
              isLight ? "bg-[#ffffff] border-[#e5e7eb]" : "bg-[#141414] border-[#222]"
            }`}
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-[#ff0000]/10 flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-[#ff0000]" />
            </div>
            <p className={`text-xs font-medium ${isLight ? "text-[#111111]" : "text-slate-300"}`}>
              Çalma Listelerinizi Görün
            </p>
            <p className={`text-[11px] ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
              YouTube Music hesabınızdaki tüm listelere erişmek için bağlanın.
            </p>
            <button
              onClick={onOpenLogin}
              className="w-full py-1.5 px-3 bg-[#ff0000] hover:bg-[#e60000] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm shadow-red-500/20 active:scale-95"
            >
              Google ile Bağlan
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
