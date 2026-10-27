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
  

  // Appearance
  appearanceSubtitle: string;
  themeSelection: string;
  darkTheme: string;
  darkThemeDesc: string;
  lightTheme: string;
  lightThemeDesc: string;
  systemTheme: string;
  systemThemeDesc: string;
  languageSelection: string;
  accentColor: string;
  
  // Playback & Window
  playbackSubtitle: string;
  streamingQuality: string;
  streamingQualityDesc: string;
  qualityHigh: string;
  qualityNormal: string;
  qualityLow: string;
  outputDevice: string;
  outputDeviceDesc: string;
  defaultOutputDevice: string;
  scanDevices: string;
  scanningDevices: string;
  selectFromSystem: string;
  miniPlayerMode: string;
  miniPlayerDesc: string;
  readyToUse: string;
  shortcutsSubtitle: string;
  discordRpcTitle: string;
  discordRpcDesc: string;

  // About
  about: string;
  aboutSubtitle: string;
  version: string;
  checkForUpdates: string;
  checkingForUpdates: string;
  upToDate: string;
  updateAvailable: string;
  updateCheckFailed: string;
  downloadUpdate: string;
  sourceCodeGithub: string;
  sourceCodeGithubDesc: string;

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
    searchPlaceholder: "Search artists, songs, playlists, and albums",
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

    appearanceSubtitle: "Manage theme, language, and motion preferences.",
    themeSelection: "Theme",
    darkTheme: "Dark (OLED)",
    darkThemeDesc: "Deep black & YouTube red accents",
    lightTheme: "Light Mode",
    lightThemeDesc: "Clean #f0f0f0 canvas with white cards",
    systemTheme: "System",
    systemThemeDesc: "Follow system theme settings",
    languageSelection: "Language",
    accentColor: "Accent Color",
    
    playbackSubtitle: "Playback transition and audio session settings.",
    streamingQuality: "Streaming Quality",
    streamingQualityDesc: "Choose the audio quality for online music streaming.",
    qualityHigh: "High (Recommended - ~160 kbps)",
    qualityNormal: "Normal (~70 kbps)",
    qualityLow: "Low / Data Saver (~50 kbps)",
    outputDevice: "Output Device",
    outputDeviceDesc: "Select the audio device used for playback (speakers, headphones).",
    defaultOutputDevice: "Default (System Default)",
    scanDevices: "Scan Audio Devices",
    scanningDevices: "Scanning...",
    selectFromSystem: "Select from System...",
    miniPlayerMode: "Mini HUD Player Mode",
    miniPlayerDesc: "Compact overlay player for gaming and multitasking.",
    readyToUse: "Ready to use",
    shortcutsSubtitle: "Customize desktop keyboard controls.",
    discordRpcTitle: "Discord Status (Rich Presence)",
    discordRpcDesc: "Show what you are listening to on your Discord profile.",

    about: "About",
    aboutSubtitle: "Version, updates and links",
    version: "Version",
    checkForUpdates: "Check for Updates",
    checkingForUpdates: "Checking for updates...",
    upToDate: "You are using the latest version",
    updateAvailable: "New version available",
    updateCheckFailed: "Failed to check for updates",
    downloadUpdate: "View Release & Download",
    sourceCodeGithub: "Source Code (GitHub)",
    sourceCodeGithubDesc: "Visit open source repository, star or contribute.",

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
    searchPlaceholder: "Sanatçı, şarkı, çalma listesi veya albüm arayın",
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
    accountSettings: "Ayarlar",
    signedInToYt: "YouTube Music oturumu açık",
    sessionConfirmed: "Oturum az önce doğrulandı.",
    addAccount: "Hesap ekle",
    accounts: "HESAPLAR",
    channel: "KANAL",
    connectGoogle: "Google ile Giriş Yap",
    notConnectedTitle: "Google & YouTube Music Bağlı Değil",
    notConnectedDesc: "Tüm çalma listelerinize ve beğendiğiniz şarkılara erişmek için Google hesabınızla giriş yapın.",

    appearanceSubtitle: "Uygulama temasını, dilini ve hareket ayarlarını yönetin.",
    themeSelection: "Tema",
    darkTheme: "Koyu Tema (OLED)",
    darkThemeDesc: "Derin siyah & YouTube kırmızısı",
    lightTheme: "Açık Tema (Light)",
    lightThemeDesc: "Ferah #f0f0f0 zemin ve beyaz kartlar",
    systemTheme: "Sistem",
    systemThemeDesc: "İşletim sistemi temasını takip et",
    languageSelection: "Dil",
    accentColor: "Vurgu Rengi",
    
    playbackSubtitle: "Ses oturumu ve geçiş tercihleri.",
    streamingQuality: "Ses Kalitesi",
    streamingQualityDesc: "Şarkıların çevrimiçi çalınırken kullanılacak ses kalitesini belirleyin.",
    qualityHigh: "Yüksek (Önerilen - ~160 kbps)",
    qualityNormal: "Normal (~70 kbps)",
    qualityLow: "Düşük / Veri Tasarrufu (~50 kbps)",
    outputDevice: "Çıkış Cihazı",
    outputDeviceDesc: "Müziğin çalınacağı ses aygıtını (hoparlör, kulaklık vb.) seçin.",
    defaultOutputDevice: "Varsayılan (Sistem Varsayılanı)",
    scanDevices: "Ses Aygıtlarını Tara",
    scanningDevices: "Aygıtlar Taranıyor...",
    selectFromSystem: "Sistemden Ses Çıkışı Seç...",
    miniPlayerMode: "Mini HUD Oyuncu Modu",
    miniPlayerDesc: "Oyun oynarken ekranda kompakt yarı saydam oynatıcı.",
    readyToUse: "Kullanıma Hazır",
    shortcutsSubtitle: "Masaüstü klavye kısayollarını özelleştirin.",
    discordRpcTitle: "Discord Durumu (Rich Presence)",
    discordRpcDesc: "Dinlediğiniz şarkıyı Discord profilinizde gösterin.",

    about: "Hakkında",
    aboutSubtitle: "Sürüm, güncellemeler ve bağlantılar",
    version: "Sürüm",
    checkForUpdates: "Güncellemeleri Denetle",
    checkingForUpdates: "Güncellemeler denetleniyor...",
    upToDate: "En son sürümü kullanıyorsunuz",
    updateAvailable: "Yeni bir sürüm mevcut",
    updateCheckFailed: "Güncelleme denetlenemedi",
    downloadUpdate: "Sürümü İncele ve İndir",
    sourceCodeGithub: "Kaynak Kodu (GitHub)",
    sourceCodeGithubDesc: "Açık kaynak depoyu ziyaret edin, yıldız verin veya katkıda bulunun.",

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
