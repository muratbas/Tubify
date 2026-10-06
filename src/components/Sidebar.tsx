import type { FC } from "react";
import { Music2, Compass, Library, Heart, Cpu, Sparkles, LogIn, LogOut, User, ListMusic } from "lucide-react";
import type { UserProfile } from "../types/music";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  favoritesCount: number;
  likedSongsCount: number;
  userProfile: UserProfile;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  favoritesCount,
  likedSongsCount,
  userProfile,
  onOpenLogin,
  onLogout,
}) => {
  const navItems = [
    { id: "explore", label: "Keşfet & Ara", icon: Compass },
    {
      id: "liked",
      label: "Beğenilen Şarkılar",
      icon: Heart,
      badge: userProfile.is_authenticated ? (likedSongsCount > 0 ? likedSongsCount : "YT") : undefined,
    },
    { id: "library", label: "Çalma Listelerim", icon: ListMusic },
    { id: "favorites", label: "Lokal Favoriler", icon: Library, badge: favoritesCount > 0 ? favoritesCount : undefined },
  ];

  return (
    <aside className="w-64 bg-[#0d1117] border-r border-[#1e2638] flex flex-col justify-between p-5 select-none shrink-0 h-full">
      <div>
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Music2 className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white tracking-wide">Tubify</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                v2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Ultra-Light Music Client</p>
          </div>
        </div>

        {/* User Account Card */}
        <div className="mb-6 p-3 rounded-xl bg-[#131926] border border-[#1e2638] transition-all">
          {userProfile.is_authenticated ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  {userProfile.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-white truncate">
                    {userProfile.name || "Google Hesabım"}
                  </h5>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    YT Music Bağlı
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              Google ile Giriş Yap
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#161d2b]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Hardware / Engine Metrics Footer */}
      <div className="pt-4 border-t border-[#1e2638]/70 space-y-2">
        <div className="bg-[#131824] rounded-lg p-3 border border-[#1e293b]/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Bellek Kullanımı
            </span>
            <span className="text-emerald-400 font-semibold font-mono">&lt; 50 MB</span>
          </div>
          <div className="w-full bg-[#1e2638] h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full w-[25%]" />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1e2638] text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Sıfır Webview Wrapper
            </span>
            <span className="text-slate-300">InnerTube</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
