import { useState, useEffect, type FC } from "react";
import { X, Globe, KeyRound, Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Copy, Check } from "lucide-react";
import { openGoogleLogin, saveGoogleCookie, checkLoginStatus, openExternalUrl } from "../services/api";
import type { UserProfile } from "../types/music";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginModal: FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0e131d] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Google & YouTube Music Girişi</h3>
              <p className="text-xs text-slate-400">Beğenilenler ve çalma listeleriniz doğrudan eşitlenir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-[#141b29] p-1 border border-slate-800">
          <button
            onClick={() => {
              setActiveTab("webview");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "webview"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "cookie"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Çerez (Cookie) ile Bağlan
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Webview Login */}
        {activeTab === "webview" && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="bg-[#121824] p-3.5 rounded-xl border border-slate-800 space-y-2">
              <p className="font-semibold text-white">Nasıl Çalışır?</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Google'ın resmi giriş sayfası bağımsız bir pencerede açılır.</li>
                <li>Şifreniz veya 2 Adımlı Doğrulamanız asla kaydedilmez.</li>
                <li>Giriş tamamlandığında Tubify oturumu otomatik algılar ve pencere kapanır.</li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleOpenLoginWindow}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin stroke-black" /> : <ExternalLink className="w-4 h-4" />}
                Google ile Giriş Penceresini Aç
              </button>

              <button
                onClick={handleRefreshStatus}
                disabled={isLoading}
                className="py-2.5 px-4 bg-[#1b2333] hover:bg-[#253046] text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all text-xs cursor-pointer"
              >
                Oturumu Doğrula
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Cookie Paste */}
        {activeTab === "cookie" && (
          <div className="space-y-3.5 text-xs">
            <div className="bg-[#121824] p-3 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Tarayıcınızdan 10 Saniyede Bağlanın:</span>
                <button
                  type="button"
                  onClick={() => openExternalUrl("https://music.youtube.com")}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  YouTube Music'i Aç
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Tarayıcınızda (Chrome/Edge) YouTube Music açıkken <b>F12</b> &gt; <b>Console</b> sekmesini açın.</li>
                <li className="flex items-center gap-2 flex-wrap">
                  Şu kodu konsola yapıştırıp Enter'a basın:
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px] border border-slate-700 hover:bg-slate-700 cursor-pointer"
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
              className="w-full bg-[#121824] border border-slate-800 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 text-xs font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <button
              onClick={handleSaveCookie}
              disabled={isLoading || !cookieInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin stroke-black" /> : <KeyRound className="w-4 h-4" />}
              Çerez ile Hesabı Bağla
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
