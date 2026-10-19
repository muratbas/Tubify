import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "en" | "tr";

export interface Translations {
  // Navigation & General
  settings: string;
  account: string;
  appearance: string;
  playback: string;
  library: string;
  window: string;
  shortcuts: string;
  home: string;
  playlists: string;
  albums: string;
  newPlaylist: string;
  filterPlaylists: string;
  likedSongs: string;
  episodesForLater: string;
  recentlyPlayed: string;
  moreRecommendations: string;
  listenAgain: string;
  searchPlaceholder: string;
  searchResultsFor: string;
  noResultsFound: string;
  backToHome: string;
  signIn: string;
  signOut: string;
  signedIn: string;
  signedOut: string;
  connected: string;
  
  // Settings view
  settingsSubtitle: string;
  starOnGithub: string;
  reportAnIssue: string;
  accountSettings: string;
  signedInToYt: string;
  sessionConfirmed: string;
  addAccount: string;
  accounts: string;
  channel: string;
  connectGoogle: string;
  notConnectedTitle: string;
  notConnectedDesc: string;
  
  // Last.fm
  lastFmTitle: string;
  lastFmDesc: string;
  scrobblePlays: string;
  scrobbleDesc: string;
  accountConnection: string;
  connectLastFm: string;
  browserWindowOpen: string;
  
  // Appearance
  appearanceSubtitle: string;
  themeSelection: string;
  darkTheme: string;
  darkThemeDesc: string;
  lightTheme: string;
  lightThemeDesc: string;
  languageSelection: string;
  accentColor: string;
  
  // Playback & Window
  playbackSubtitle: string;
  miniPlayerMode: string;
  miniPlayerDesc: string;
  readyToUse: string;
  shortcutsSubtitle: string;

  // Hybrid Desktop UI Additions
  queue: string;
  nowPlaying: string;
  lyrics: string;
  videoMode: string;
  songMode: string;
  collapseSidebar: string;
  expandSidebar: string;
  moodAll: string;
  moodRelax: string;
  moodEnergize: string;
  moodFocus: string;
  moodWorkout: string;
  moodCommute: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    settings: "Settings",
    account: "Account",
    appearance: "Appearance",
    playback: "Playback",
    library: "Library",
    window: "Window",
    shortcuts: "Shortcuts",
    home: "Home",
    playlists: "Playlists",
    albums: "Albums",
    newPlaylist: "New playlist",
    filterPlaylists: "Filter playlists",
    likedSongs: "Liked Songs",
    episodesForLater: "Episodes for Later",
    recentlyPlayed: "Recently played",
    moreRecommendations: "More recommendations",
    listenAgain: "Listen again",
    searchPlaceholder: "Search artists, songs, playlists, and albums (Ctrl+K)",
    searchResultsFor: "Results for",
    noResultsFound: "No results found.",
    backToHome: "Back to Home",
    signIn: "Sign In",
    signOut: "Sign out",
    signedIn: "Signed in",
    signedOut: "Signed out",
    connected: "Connected",
    
    settingsSubtitle: "Manage your account, library, appearance, and window behaviour.",
    starOnGithub: "Star on GitHub",
    reportAnIssue: "Report an issue",
    accountSettings: "Account settings",
    signedInToYt: "Signed in to YouTube Music",
    sessionConfirmed: "Session confirmed just now.",
    addAccount: "Add account",
    accounts: "ACCOUNTS",
    channel: "CHANNEL",
    connectGoogle: "Connect with Google",
    notConnectedTitle: "Google & YouTube Music Not Connected",
    notConnectedDesc: "Sign in with your Google account to access your playlists and liked songs.",
    
    lastFmTitle: "Last.fm",
    lastFmDesc: "Connect Last.fm to scrobble your listening history.",
    scrobblePlays: "Scrobble plays",
    scrobbleDesc: "Send now playing updates and scrobbles after a track reaches the Last.fm listening threshold.",
    accountConnection: "Account connection",
    connectLastFm: "Connect Last.fm",
    browserWindowOpen: "A browser window will open so you can approve this app on Last.fm.",
    
    appearanceSubtitle: "Manage theme, language, and motion preferences.",
    themeSelection: "Theme",
    darkTheme: "Dark (OLED)",
    darkThemeDesc: "Deep black & YouTube red accents",
    lightTheme: "Light Mode",
    lightThemeDesc: "Clean #f0f0f0 canvas with white cards",
    languageSelection: "Language",
    accentColor: "Accent Color",
    
    playbackSubtitle: "Playback transition and audio session settings.",
    miniPlayerMode: "Mini HUD Player Mode",
    miniPlayerDesc: "Compact overlay player for gaming and multitasking.",
    readyToUse: "Ready to use",
    shortcutsSubtitle: "Customize desktop keyboard controls.",

    queue: "Queue",
    nowPlaying: "Now Playing",
    lyrics: "Lyrics",
    videoMode: "Video 16:9",
    songMode: "Song 1:1",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    moodAll: "All",
    moodRelax: "Relax",
    moodEnergize: "Energize",
    moodFocus: "Focus",
    moodWorkout: "Workout",
    moodCommute: "Commute",
  },
  tr: {
    settings: "Ayarlar",
    account: "Hesap",
    appearance: "Görünüm",
    playback: "Çalma",
    library: "Kitaplık",
    window: "Pencere",
    shortcuts: "Kısayollar",
    home: "Ana Sayfa",
    playlists: "Çalma Listeleri",
    albums: "Albümler",
    newPlaylist: "Yeni çalma listesi",
    filterPlaylists: "Listeleri filtrele",
    likedSongs: "Liked Songs",
    episodesForLater: "Episodes for Later",
    recentlyPlayed: "Recently played",
    moreRecommendations: "More recommendations",
    listenAgain: "Listen again",
    searchPlaceholder: "Sanatçı, şarkı, çalma listesi veya albüm arayın (Ctrl+K)",
    searchResultsFor: "Sonuçlar:",
    noResultsFound: "Sonuç bulunamadı.",
    backToHome: "Ana Sayfaya Dön",
    signIn: "Giriş Yap",
    signOut: "Hesaptan çıkış yap",
    signedIn: "Giriş yapıldı",
    signedOut: "Çıkış yapıldı",
    connected: "Bağlı",
    
    settingsSubtitle: "Hesabınızı, kitaplığınızı, görünümünüzü ve pencere davranışlarını yönetin.",
    starOnGithub: "Star on GitHub",
    reportAnIssue: "Sorun Bildir",
    accountSettings: "Hesap ayarları",
    signedInToYt: "YouTube Music oturumu açık",
    sessionConfirmed: "Oturum az önce doğrulandı.",
    addAccount: "Hesap ekle",
    accounts: "HESAPLAR",
    channel: "KANAL",
    connectGoogle: "Google ile Giriş Yap",
    notConnectedTitle: "Google & YouTube Music Bağlı Değil",
    notConnectedDesc: "Tüm çalma listelerinize ve beğendiğiniz şarkılara erişmek için Google hesabınızla giriş yapın.",
    
    lastFmTitle: "Last.fm",
    lastFmDesc: "Dinleme geçmişinizi scrobble etmek için Last.fm'i bağlayın.",
    scrobblePlays: "Oynatmaları scrobble et",
    scrobbleDesc: "Parça dinleme eşiğine ulaştığında şimdi çalınan güncellemelerini Last.fm'e gönder.",
    accountConnection: "Hesap bağlantısı",
    connectLastFm: "Last.fm'i Bağla",
    browserWindowOpen: "Last.fm üzerinde uygulamayı onaylamanız için bir tarayıcı penceresi açılacak.",
    
    appearanceSubtitle: "Uygulama temasını, dilini ve hareket ayarlarını yönetin.",
    themeSelection: "Tema",
    darkTheme: "Koyu Tema (OLED)",
    darkThemeDesc: "Derin siyah & YouTube kırmızısı",
    lightTheme: "Açık Tema (Light)",
    lightThemeDesc: "Ferah #f0f0f0 zemin ve beyaz kartlar",
    languageSelection: "Dil",
    accentColor: "Vurgu Rengi",
    
    playbackSubtitle: "Ses oturumu ve geçiş tercihleri.",
    miniPlayerMode: "Mini HUD Oyuncu Modu",
    miniPlayerDesc: "Oyun oynarken ekranda kompakt yarı saydam oynatıcı.",
    readyToUse: "Kullanıma Hazır",
    shortcutsSubtitle: "Masaüstü klavye kısayollarını özelleştirin.",

    queue: "Sıradaki Şarkılar",
    nowPlaying: "Şu An Çalan",
    lyrics: "Şarkı Sözleri",
    videoMode: "Video 16:9",
    songMode: "Şarkı 1:1",
    collapseSidebar: "Kenar çubuğunu daralt",
    expandSidebar: "Kenar çubuğunu genişlet",
    moodAll: "Tümü",
    moodRelax: "Dinlenme",
    moodEnergize: "Enerji",
    moodFocus: "Odaklanma",
    moodWorkout: "Egzersiz",
    moodCommute: "Yolculuk",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("tubify_lang");
      if (saved === "en" || saved === "tr") return saved;
    } catch {}
    return "en"; // Default is English as requested!
  });

  useEffect(() => {
    try {
      localStorage.setItem("tubify_lang", language);
    } catch {}
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
