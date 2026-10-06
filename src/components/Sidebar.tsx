import { useState, type FC } from "react";
import { Heart, Search, ListFilter, Plus, Music2, FolderPlus } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"playlists" | "albums">("playlists");
  const [filterText, setFilterText] = useState("");

  const filteredPlaylists = playlists.filter((pl) => {
    if (pl.id === "LM") return false; // Handled separately as pinned Liked Songs
    return pl.title.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <aside className="w-[280px] bg-[#0c0c0c] border-r border-[#1a1a1a] flex flex-col h-full select-none shrink-0">
      {/* Top Controls: Playlists / Albums Pills */}
      <div className="p-3.5 space-y-3 border-b border-[#181818]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("playlists")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "playlists"
                ? "bg-white text-black shadow-sm"
                : "bg-[#181818] text-[#999999] hover:text-white hover:bg-[#222222]"
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setActiveTab("albums")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "albums"
                ? "bg-white text-black shadow-sm"
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
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#161616] hover:bg-[#1f1f1f] text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-[#262626] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#ff0000]" />
          <span>New playlist</span>
        </button>

        {/* Filter Playlists Search Input */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter playlists"
              className="w-full h-7 pl-8 pr-2 bg-transparent text-xs text-white placeholder-[#555555] focus:outline-none"
            />
          </div>
          <button
            title="Sırala"
            className="p-1 text-[#666666] hover:text-white transition-colors cursor-pointer"
          >
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Playlist List Scrollable Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 custom-scrollbar">
        {/* Pinned: Liked Songs (Exact Spotify / Screenshot Match) */}
        <div
          onClick={() => onSelectPlaylist("liked")}
          className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group ${
            selectedPlaylistId === "liked" || selectedPlaylistId === "LM"
              ? "bg-[#202020] text-white"
              : "hover:bg-[#161616] text-[#b3b3b3] hover:text-white"
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#ff334b] via-[#e60023] to-[#800020] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate group-hover:text-white">
              Liked Songs
            </h4>
            <p className="text-[11px] text-[#777777] truncate">
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
                  ? "bg-[#202020] text-white"
                  : "hover:bg-[#161616] text-[#b3b3b3] hover:text-white"
              }`}
            >
              {pl.thumbnail ? (
                <img
                  src={pl.thumbnail}
                  alt={pl.title}
                  className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#222] border border-[#2a2a2a] group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Music2 className="w-5 h-5 text-[#ff0000]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold truncate group-hover:text-white">
                  {pl.title}
                </h4>
                <p className="text-[11px] text-[#777777] truncate">
                  {pl.description || userProfile.name || "YouTube Music"}
                </p>
              </div>
            </div>
          );
        })}

        {/* Empty state or connect Google prompt */}
        {filteredPlaylists.length === 0 && !userProfile.is_authenticated && (
          <div className="p-4 mt-4 text-center rounded-2xl bg-[#141414] border border-[#222] space-y-2.5">
            <div className="w-8 h-8 mx-auto rounded-full bg-[#ff0000]/10 flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-[#ff0000]" />
            </div>
            <p className="text-xs text-slate-300 font-medium">Çalma Listelerinizi Görün</p>
            <p className="text-[11px] text-[#777]">
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
