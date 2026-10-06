import { useState, type FC } from "react";
import {
  X,
  User,
  Palette,
  AppWindow,
  LogOut,
  LogIn,
  CheckCircle2,
  Shield,
  Music2,
  Heart,
  Loader2,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { UserProfile } from "../types/music";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "account" | "appearance" | "window";
  userProfile: UserProfile;
  likedSongsCount: number;
  playlistsCount: number;
  onLogout: () => Promise<void>;
  onOpenLogin: () => void;
}

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "account",
  userProfile,
  likedSongsCount,
  playlistsCount,
  onLogout,
  onOpenLogin,
}) => {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"account" | "appearance" | "window">(initialTab);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      onClose();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border transition-colors ${
          isLight
            ? "bg-[#ffffff] border-[#e5e7eb] text-[#111111]"
            : "bg-[#0c0c0c] border-[#262626] text-slate-100"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight ? "border-[#e5e7eb]" : "border-[#1c1c1c]"
          }`}
        >
          <h3 className={`font-bold text-base ${isLight ? "text-[#111111]" : "text-white"}`}>
            Ayarlar
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? "text-[#6b7280] hover:text-[#111111] hover:bg-[#f3f4f6]"
                : "text-slate-400 hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar Tabs + Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: 3 Tabs (Account, Appearance, Window) */}
          <div
            className={`w-48 border-r p-3 space-y-1 shrink-0 ${
              isLight ? "bg-[#f9fafb] border-[#e5e7eb]" : "bg-[#090909] border-[#1c1c1c]"
            }`}
          >
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "account"
                  ? isLight
                    ? "bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/30 shadow-sm"
                    : "bg-[#ff0000]/10 text-white border border-[#ff0000]/30 shadow-sm"
                  : isLight
                  ? "text-[#4b5563] hover:text-[#111111] hover:bg-[#e5e7eb]"
                  : "text-[#888888] hover:text-white hover:bg-[#141414]"
              }`}
            >
              <User className={`w-4 h-4 ${activeTab === "account" ? "text-[#ff0000]" : ""}`} />
              <span>Account</span>
            </button>

            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "appearance"
                  ? isLight
                    ? "bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/30 shadow-sm"
                    : "bg-[#ff0000]/10 text-white border border-[#ff0000]/30 shadow-sm"
                  : isLight
                  ? "text-[#4b5563] hover:text-[#111111] hover:bg-[#e5e7eb]"
                  : "text-[#888888] hover:text-white hover:bg-[#141414]"
              }`}
            >
              <Palette className={`w-4 h-4 ${activeTab === "appearance" ? "text-[#ff0000]" : ""}`} />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab("window")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "window"
                  ? isLight
                    ? "bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/30 shadow-sm"
                    : "bg-[#ff0000]/10 text-white border border-[#ff0000]/30 shadow-sm"
                  : isLight
                  ? "text-[#4b5563] hover:text-[#111111] hover:bg-[#e5e7eb]"
                  : "text-[#888888] hover:text-white hover:bg-[#141414]"
              }`}
            >
              <AppWindow className={`w-4 h-4 ${activeTab === "window" ? "text-[#ff0000]" : ""}`} />
              <span>Window</span>
            </button>
          </div>

          {/* Right: Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {/* TAB 1: ACCOUNT (Hesap Ayarları) */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <h4 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                    Hesap Bilgileri
                  </h4>
                  <p className={`text-xs ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                    YouTube Music ve Google oturumu bağlantı durumunuz
                  </p>
                </div>

                {userProfile.is_authenticated ? (
                  <div className="space-y-5">
                    {/* User Card */}
                    <div
                      className={`p-4 rounded-2xl border flex items-center gap-4 ${
                        isLight
                          ? "bg-[#f9fafb] border-[#e5e7eb]"
                          : "bg-[#141414] border-[#222222]"
                      }`}
                    >
                      {userProfile.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt="Google Avatar"
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#ff0000]/40 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                          {userProfile.name?.[0]?.toUpperCase() || "YT"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5
                            className={`font-bold text-base truncate ${
                              isLight ? "text-[#111111]" : "text-white"
                            }`}
                          >
                            {userProfile.name || "Google Hesabım"}
                          </h5>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Bağlı
                          </span>
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isLight ? "text-[#6b7280]" : "text-[#888]"
                          }`}
                        >
                          {userProfile.email || "YouTube Music Hesabı"}
                        </p>
                        <p
                          className={`text-[11px] mt-1 ${
                            isLight ? "text-[#9ca3af]" : "text-slate-500"
                          }`}
                        >
                          Beğenilen şarkılar ve çalma listeleri cihazınızla eşitleniyor.
                        </p>
                      </div>
                    </div>

                    {/* Synced Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          isLight
                            ? "bg-[#f9fafb] border-[#e5e7eb]"
                            : "bg-[#121212] border-[#1f1f1f]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#ff0000]/10 flex items-center justify-center text-[#ff0000]">
                          <Heart className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <p
                            className={`text-lg font-bold ${
                              isLight ? "text-[#111111]" : "text-white"
                            }`}
                          >
                            {likedSongsCount}
                          </p>
                          <p className={`text-[11px] ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                            Beğenilen Şarkı
                          </p>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          isLight
                            ? "bg-[#f9fafb] border-[#e5e7eb]"
                            : "bg-[#121212] border-[#1f1f1f]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#ff0000]/10 flex items-center justify-center text-[#ff0000]">
                          <Music2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p
                            className={`text-lg font-bold ${
                              isLight ? "text-[#111111]" : "text-white"
                            }`}
                          >
                            {playlistsCount}
                          </p>
                          <p className={`text-[11px] ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                            Çalma Listesi
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleLogoutClick}
                        disabled={isLoggingOut}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 border ${
                          isLight
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                            : "bg-[#1f1416] hover:bg-[#33181c] text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {isLoggingOut ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <LogOut className="w-4 h-4 text-rose-500" />
                        )}
                        <span>Hesaptan Çıkış Yap</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-6 rounded-2xl border text-center space-y-4 ${
                      isLight
                        ? "bg-[#f9fafb] border-[#e5e7eb]"
                        : "bg-[#141414] border-[#222222]"
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#ff0000]/10 flex items-center justify-center text-[#ff0000]">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className={`font-bold text-sm ${isLight ? "text-[#111111]" : "text-white"}`}>
                        Google & YouTube Music Bağlı Değil
                      </h5>
                      <p className={`text-xs max-w-sm mx-auto ${isLight ? "text-[#6b7280]" : "text-[#888]"}`}>
                        Kendi çalma listelerinize ve beğendiğiniz şarkılara erişmek için Google hesabınızla giriş yapabilirsiniz.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenLogin();
                      }}
                      className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#ff0000] hover:bg-[#e60000] text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Google ile Giriş Yap</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: APPEARANCE (Görünüm & Tema Seçimi) */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h4 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                    Görünüm Ayarları
                  </h4>
                  <p className={`text-xs ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                    Tubify arayüz temasını ve stil tercihlerini yönetin
                  </p>
                </div>

                {/* Theme Selector Cards */}
                <div className="space-y-3">
                  <label className={`text-xs font-bold ${isLight ? "text-[#374151]" : "text-slate-300"}`}>
                    Tema Seçimi
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dark / OLED Mode Option */}
                    <button
                      onClick={() => setTheme("dark")}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-3 group ${
                        theme === "dark"
                          ? "border-[#ff0000] ring-2 ring-[#ff0000]/30 bg-[#161616]"
                          : isLight
                          ? "border-[#e5e7eb] bg-[#f9fafb] hover:bg-[#f3f4f6]"
                          : "border-[#222222] bg-[#141414] hover:bg-[#1a1a1a]"
                      }`}
                    >
                      {/* Theme Preview Box */}
                      <div className="w-full h-20 rounded-xl bg-[#030303] border border-[#262626] p-2 flex flex-col justify-between shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
                          <div className="w-12 h-2 rounded-full bg-[#222222]" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="w-3/4 h-2 rounded bg-[#1e1e1e]" />
                          <div className="w-1/2 h-2 rounded bg-[#161616]" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Moon className={`w-4 h-4 ${theme === "dark" ? "text-[#ff0000]" : "text-[#888]"}`} />
                          <div>
                            <p className="text-xs font-bold text-white">Koyu Tema (OLED)</p>
                            <p className="text-[10px] text-[#888]">Derin siyah & kırmızı</p>
                          </div>
                        </div>
                        {theme === "dark" && (
                          <div className="w-5 h-5 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Light Mode Option */}
                    <button
                      onClick={() => setTheme("light")}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-3 group ${
                        theme === "light"
                          ? "border-[#ff0000] ring-2 ring-[#ff0000]/30 bg-red-50/10"
                          : isLight
                          ? "border-[#e5e7eb] bg-[#f9fafb] hover:bg-[#f3f4f6]"
                          : "border-[#222222] bg-[#141414] hover:bg-[#1a1a1a]"
                      }`}
                    >
                      {/* Theme Preview Box */}
                      <div className="w-full h-20 rounded-xl bg-[#ffffff] border border-[#e5e7eb] p-2 flex flex-col justify-between shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
                          <div className="w-12 h-2 rounded-full bg-[#e5e7eb]" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="w-3/4 h-2 rounded bg-[#f3f4f6]" />
                          <div className="w-1/2 h-2 rounded bg-[#e5e7eb]" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sun className={`w-4 h-4 ${theme === "light" ? "text-[#ff0000]" : "text-[#888]"}`} />
                          <div>
                            <p className={`text-xs font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                              Açık Tema (Light)
                            </p>
                            <p className="text-[10px] text-[#888]">Ferah beyaz & gri</p>
                          </div>
                        </div>
                        {theme === "light" && (
                          <div className="w-5 h-5 rounded-full bg-[#ff0000] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Accent Color Display */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? "bg-[#f9fafb] border-[#e5e7eb]" : "bg-[#141414] border-[#222222]"
                  }`}
                >
                  <div>
                    <p className={`text-xs font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                      Vurgu Rengi (Accent)
                    </p>
                    <p className={`text-[11px] ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                      YouTube Kırmızısı (#FF0000)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#ff0000] border-2 border-white/60 shadow-md" />
                    <span className="text-xs font-mono font-semibold text-[#ff0000]">#FF0000</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WINDOW (Pencere) */}
            {activeTab === "window" && (
              <div className="space-y-5">
                <div>
                  <h4 className={`text-sm font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                    Pencere & Ekran Ayarları
                  </h4>
                  <p className={`text-xs ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                    Masaüstü pencere davranışları
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isLight ? "bg-[#f9fafb] border-[#e5e7eb]" : "bg-[#141414] border-[#222222]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-bold ${isLight ? "text-[#111111]" : "text-white"}`}>
                        Mini HUD Oyuncu Modu
                      </p>
                      <p className={`text-[11px] ${isLight ? "text-[#6b7280]" : "text-[#777]"}`}>
                        Oyun oynarken ekranda kompakt yarı saydam oynatıcı
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-semibold">
                      Kullanıma Hazır
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
