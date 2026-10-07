import { useState, useEffect, type FC } from "react";
import { X, Globe, KeyRound, Loader2, CheckCircle2, AlertCircle, ExternalLink, Copy, Check } from "lucide-react";
import { openGoogleLogin, saveGoogleCookie, checkLoginStatus, openExternalUrl } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import type { UserProfile } from "../types/music";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginModal: FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"webview" | "cookie">("webview");
  const [cookieInput, setCookieInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Auto-detect authentication from Rust background event
  useEffect(() => {
    if (!isOpen) return;

    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const un = await listen<UserProfile>("auth-success", (event) => {
          setSuccess("Oturum başarıyla algılandı ve bağlandı!");
          setTimeout(() => {
            onLoginSuccess(event.payload);
            onClose();
          }, 1000);
        });
        unlisten = un;
      } catch {
        // Dev / web fallback
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isOpen, onLoginSuccess, onClose]);

  if (!isOpen) return null;

  const handleOpenLoginWindow = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await openGoogleLogin();
    } catch (e: unknown) {
      setError("Giriş penceresi açılamadı: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await checkLoginStatus();
      if (profile.is_authenticated) {
        setSuccess("Oturum başarıyla doğrulandı!");
        setTimeout(() => {
          onLoginSuccess(profile);
          onClose();
        }, 1000);
      } else {
        setError("Henüz aktif bir oturum algılanamadı. Lütfen giriş yaptığınızdan emin olun veya çerez ile bağlanmayı deneyin.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCookie = async () => {
    if (!cookieInput.trim()) {
      setError("Lütfen geçerli bir çerez (cookie) metni yapıştırın.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const profile = await saveGoogleCookie(cookieInput.trim());
      setSuccess("Tebrikler! YouTube Music hesabınız başarıyla bağlandı.");
      setTimeout(() => {
        onLoginSuccess(profile);
        onClose();
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Çerez doğrulanamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText("copy(document.cookie)");
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className={`relative w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-colors space-y-5 ${
          isLight
            ? "bg-[#ffffff] border-[#e5e7eb] text-[#111111]"
            : "bg-[#0c0c0c] border-[#262626] text-slate-100"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isLight ? "border-[#e5e7eb]" : "border-[#1c1c1c]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo.png" alt="Tubify" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${isLight ? "text-[#111111]" : "text-white"}`}>
                Google & YouTube Music Girişi
              </h3>
              <p className={`text-xs ${isLight ? "text-[#6b7280]" : "text-[#888888]"}`}>
                Beğenilenler ve çalma listeleriniz doğrudan eşitlenir
              </p>
            </div>
          </div>
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

        {/* Tab Selection */}
        <div
          className={`flex rounded-xl p-1 border ${
            isLight ? "bg-[#f3f4f6] border-[#e5e7eb]" : "bg-[#141414] border-[#222222]"
          }`}
        >
          <button
            onClick={() => {
              setActiveTab("webview");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "webview"
                ? isLight
                  ? "bg-white text-black shadow-sm font-bold"
                  : "bg-[#252525] text-white shadow-sm font-bold"
                : isLight
                ? "text-[#6b7280] hover:text-[#111111]"
                : "text-[#888888] hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Otomatik Giriş Penceresi
          </button>
          <button
            onClick={() => {
              setActiveTab("cookie");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "cookie"
                ? isLight
                  ? "bg-white text-black shadow-sm font-bold"
                  : "bg-[#252525] text-white shadow-sm font-bold"
                : isLight
                ? "text-[#6b7280] hover:text-[#111111]"
                : "text-[#888888] hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Çerez (Cookie) ile Bağlan
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Webview Login */}
        {activeTab === "webview" && (
          <div className="space-y-4 text-xs">
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isLight ? "bg-[#f9fafb] border-[#e5e7eb]" : "bg-[#141414] border-[#222222]"
              }`}
            >
              <p className={`font-semibold ${isLight ? "text-[#111111]" : "text-white"}`}>
                Nasıl Çalışır?
              </p>
              <ul
                className={`list-disc list-inside space-y-1 text-[11px] ${
                  isLight ? "text-[#6b7280]" : "text-[#888888]"
                }`}
              >
                <li>Google'ın resmi giriş sayfası bağımsız bir pencerede açılır.</li>
                <li>Şifreniz veya 2 Adımlı Doğrulamanız asla kaydedilmez.</li>
                <li>Giriş tamamlandığında Tubify oturumu otomatik algılar ve pencere kapanır.</li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleOpenLoginWindow}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#ff0000] hover:bg-[#e60000] text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-red-600/20"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin stroke-white" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Giriş Penceresini Aç
              </button>

              <button
                onClick={handleRefreshStatus}
                disabled={isLoading}
                className={`py-2.5 px-4 font-semibold rounded-xl border transition-all text-xs cursor-pointer ${
                  isLight
                    ? "bg-[#ffffff] hover:bg-[#f3f4f6] text-[#374151] border-[#d1d5db]"
                    : "bg-[#1b1b1b] hover:bg-[#252525] text-slate-200 border-[#333333]"
                }`}
              >
                Oturumu Doğrula
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Cookie Paste */}
        {activeTab === "cookie" && (
          <div className="space-y-3.5 text-xs">
            <div
              className={`p-3 rounded-xl border space-y-2 text-[11px] ${
                isLight ? "bg-[#f9fafb] border-[#e5e7eb] text-[#374151]" : "bg-[#141414] border-[#222222] text-[#888888]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isLight ? "text-[#111111]" : "text-white"}`}>
                  Tarayıcınızdan 10 Saniyede Bağlanın:
                </span>
                <button
                  type="button"
                  onClick={() => openExternalUrl("https://music.youtube.com")}
                  className="flex items-center gap-1 text-[#ff0000] hover:underline font-semibold cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  YouTube Music'i Aç
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tarayıcınızda YouTube Music açıkken <b>F12</b> &gt; <b>Console</b> sekmesini açın.</li>
                <li className="flex items-center gap-2 flex-wrap">
                  Şu kodu konsola yapıştırıp Enter'a basın:
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                      isLight
                        ? "bg-[#ffffff] text-[#ff0000] border-[#d1d5db] hover:bg-[#f3f4f6]"
                        : "bg-[#202020] text-[#ff0000] border-[#333333] hover:bg-[#2a2a2a]"
                    }`}
                  >
                    {copiedSnippet ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    copy(document.cookie)
                  </button>
                </li>
                <li>Panoya kopyalanan çerezi aşağıdaki kutucuğa yapıştırın:</li>
              </ol>
            </div>

            <textarea
              rows={3}
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder="SAPISID=...; __Secure-3PAPISID=...; LOGIN_INFO=..."
              className={`w-full border rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#ff0000] ${
                isLight
                  ? "bg-[#ffffff] border-[#d1d5db] text-[#111111] placeholder-[#9ca3af]"
                  : "bg-[#141414] border-[#2a2a2a] text-slate-200 placeholder-[#666666]"
              }`}
            />
            <button
              onClick={handleSaveCookie}
              disabled={isLoading || !cookieInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#ff0000] hover:bg-[#e60000] text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-red-600/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin stroke-white" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Çerez ile Hesabı Bağla
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
