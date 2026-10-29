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
  search: string;
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

  // TitleBar & Window Controls
  navBack: string;
  navForward: string;
  downloads: string;
  user: string;
  minimize: string;
  maximize: string;
  close: string;

  // Sidebar
  searchInLibrary: string;
  searchInLibraryPlaceholder: string;
  createPlaylist: string;
  expandLibrary: string;
  collapseLibrary: string;
  viewGrid: string;
  viewList: string;
  sortRecent: string;
  sortAlphabetical: string;
  sortCustom: string;
  sortBy: string;
  playlistLabel: string;
  songCountSingle: string;
  songCountMultiple: string;
  hiddenPlaylists: string;
  createFirstPlaylist: string;
  createFirstPlaylistDesc: string;

  // PlayerBar
  play: string;
  pause: string;
  previous: string;
  next: string;
  shuffleOn: string;
  shuffleOff: string;
  repeatAll: string;
  repeatOne: string;
  repeatOff: string;
  mute: string;
  unmute: string;
  volumeLevel: string;
  like: string;
  unlike: string;
  moreOptions: string;
  queue: string;
  nowPlaying: string;
  lyrics: string;

  // Context Menus
  addToQueue: string;
  playNext: string;
  startRadio: string;
  addToPlaylist: string;
  removeFromPlaylist: string;
  goToArtist: string;
  goToAlbum: string;
  copyLink: string;
  saveToLikedSongs: string;
  removeFromLikedSongs: string;
  shufflePlay: string;
  edit: string;
  deleteFromLibrary: string;
  showInLibrary: string;
  hideFromLibrary: string;
  unpinFromTop: string;
  pinToTop: string;

  // Table Headers
  tableHeaderTitle: string;
  tableHeaderAlbum: string;
  tableHeaderPlays: string;
  tableHeaderSize: string;
  tableHeaderDuration: string;

  // Search View
  searchCategoryAll: string;
  searchCategorySongs: string;
  searchCategoryArtists: string;
  searchCategoryAlbums: string;
  searchCategoryPlaylists: string;
  searchCategoryPodcasts: string;
  recentSearches: string;
  clearAll: string;
  browseAll: string;
  topResult: string;
  artist: string;
  song: string;
  allSongs: string;
  podcastEpisode: string;

  // Playlist View & General View
  filter: string;
  downloadAll: string;
  downloadingList: string;
  downloadedAll: string;
  suggestions: string;
  suggestionsBasedOn: string;
  refresh: string;
  refreshSuggestions: string;
  addToList: string;
  noDownloadsFound: string;
  noDownloadsYet: string;
  downloadDescription: string;
  deleteFromDownloads: string;
  openDownloads: string;
  lyricsNotAvailable: string;
  tryAgain: string;
  verifiedArtist: string;
  subscribers: string;
  popular: string;
  singlesAndEPs: string;
  noTracksInQueue: string;
  clearQueue: string;
  saveQueueAsPlaylist: string;
  shuffleQueue: string;
  previousTag: string;
  nowPlayingTag: string;
  durationHour: string;
  durationMinute: string;

  // Modals
  createNewPlaylist: string;
  editPlaylist: string;
  titleLabel: string;
  descriptionLabel: string;
  playlistNamePlaceholder: string;
  descriptionPlaceholder: string;
  privacyLabel: string;
  privacyPublic: string;
  privacyUnlisted: string;
  privacyPrivate: string;
  privacyPublicDesc: string;
  privacyUnlistedDesc: string;
  privacyPrivateDesc: string;
  cancel: string;
  save: string;
  saving: string;
  create: string;
  creating: string;
  chooseOrDragPhoto: string;
  chooseOrDragPhotoDrop: string;
  removeCover: string;
  invalidImageFormat: string;
  imageProcessingError: string;
  playlistCreateFailed: string;
  playlistUpdateFailed: string;

  // Additional Search & Views
  searchNoResultsFor: string;
  searchNoResultsHelp: string;
  searchMix: string;
  searchMixDesc: string;
  downloadedClickToDelete: string;
  downloading: string;
  download: string;
  removeRecentSearch: string;
  songsDownloaded: string;
  spaceUsed: string;
  totalOf: string;
  shuffle: string;
  playAll: string;
  action: string;
  playing: string;
  cancelDownload: string;
  downloadDescriptionLong: string;
  tryDifferentSearch: string;
  albumLoadError: string;
  artistLoadError: string;
  albumPageLoadError: string;
  artistPageLoadError: string;
  noPlayingTrack: string;
  playTrackToSeeLyrics: string;
  searchingLyrics: string;
  plainLyricsFallback: string;
  unknownTrack: string;
  shuffleQueueOn: string;
  speakerOutputDevice: string;
  cacheAndAudioBuffer: string;
  streamingCache: string;
  enabled: string;
  clearCache: string;

  // Toasts
  toastPinned: string;
  toastUnpinned: string;
  toastHidden: string;
  toastUnhidden: string;
  toastLinkCopied: string;
  toastAddedToLiked: string;
  toastRemovedFromLiked: string;
  toastAddedToPlaylist: string;
  toastRemovedFromPlaylist: string;
  toastGoogleConnected: string;
  toastLoginWindowError: string;
  toastPlaylistCreated: string;
  toastPlaylistUpdated: string;
  toastPlaylistCoverUpdated: string;
  toastNoLikedTracks: string;
  toastEmptyPlaylist: string;
  toastPlaylistPlayError: string;
  toastAlbumLoading: string;
  toastAlbumNoTracks: string;
  toastAlbumPlayError: string;
  toastActionFailedReverted: string;
  toastSongAddFailed: string;
  toastSongRemoveFailed: string;

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
  updateAndRestart: string;
  updating: string;
  downloadingUpdate: string;
  updateCompleteRestarting: string;
  sourceCodeGithub: string;
  sourceCodeGithubDesc: string;

  // Legacy / Additional
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
    // Navigation & General
    settings: "Settings",
    account: "Account",
    appearance: "Appearance",
    playback: "Playback",
    library: "Library",
    window: "Window",
    shortcuts: "Shortcuts",
    home: "Home",
    search: "Search",
    playlists: "Playlists",
    albums: "Albums",
    newPlaylist: "New playlist",
    filterPlaylists: "Filter playlists",
    likedSongs: "Liked Songs",
    episodesForLater: "Episodes for Later",
    recentlyPlayed: "Recently played",
    moreRecommendations: "More recommendations",
    listenAgain: "Listen again",
    searchPlaceholder: "What do you want to play?",
    searchResultsFor: "Results for",
    noResultsFound: "No results found.",
    backToHome: "Back to Home",
    signIn: "Sign In",
    signOut: "Sign out",
    signedIn: "Signed in",
    signedOut: "Signed out",
    connected: "Connected",

    // TitleBar & Window Controls
    navBack: "Back",
    navForward: "Forward",
    downloads: "Downloads",
    user: "User",
    minimize: "Minimize",
    maximize: "Maximize / Restore",
    close: "Close",

    // Sidebar
    searchInLibrary: "Search in Library",
    searchInLibraryPlaceholder: "Search in Library...",
    createPlaylist: "Create playlist",
    expandLibrary: "Expand Library",
    collapseLibrary: "Collapse Library",
    viewGrid: "View (Grid)",
    viewList: "View (List)",
    sortRecent: "Recent",
    sortAlphabetical: "Alphabetical",
    sortCustom: "Custom order",
    sortBy: "Sort by",
    playlistLabel: "Playlist",
    songCountSingle: "song",
    songCountMultiple: "songs",
    hiddenPlaylists: "Hidden",
    createFirstPlaylist: "Create your first playlist",
    createFirstPlaylistDesc: "Connect your Google account to access your playlists and liked songs.",

    // PlayerBar
    play: "Play",
    pause: "Pause",
    previous: "Previous",
    next: "Next",
    shuffleOn: "Shuffle on",
    shuffleOff: "Shuffle off",
    repeatAll: "Repeat all",
    repeatOne: "Repeat one",
    repeatOff: "Repeat off",
    mute: "Mute",
    unmute: "Unmute",
    volumeLevel: "Volume",
    like: "Like",
    unlike: "Remove from Liked Songs",
    moreOptions: "More options",
    queue: "Queue",
    nowPlaying: "Now Playing",
    lyrics: "Lyrics",

    // Context Menus
    addToQueue: "Add to Queue",
    playNext: "Play Next",
    startRadio: "Start Song Radio",
    addToPlaylist: "Add to Playlist",
    removeFromPlaylist: "Remove from this Playlist",
    goToArtist: "Go to Artist",
    goToAlbum: "Go to Album",
    copyLink: "Copy Link",
    saveToLikedSongs: "Save to Liked Songs",
    removeFromLikedSongs: "Remove from Liked Songs",
    shufflePlay: "Shuffle Play",
    edit: "Edit",
    deleteFromLibrary: "Delete from Library",
    showInLibrary: "Show in Library",
    hideFromLibrary: "Hide from Library",
    unpinFromTop: "Unpin from Top",
    pinToTop: "Pin to Top",

    // Table Headers
    tableHeaderTitle: "TITLE",
    tableHeaderAlbum: "ALBUM",
    tableHeaderPlays: "PLAYS",
    tableHeaderSize: "SIZE",
    tableHeaderDuration: "DURATION",

    // Search View
    searchCategoryAll: "All",
    searchCategorySongs: "Songs",
    searchCategoryArtists: "Artists",
    searchCategoryAlbums: "Albums",
    searchCategoryPlaylists: "Playlists",
    searchCategoryPodcasts: "Podcasts",
    recentSearches: "Recent searches",
    clearAll: "Clear all",
    browseAll: "Browse all",
    topResult: "Top result",
    artist: "Artist",
    song: "Song",
    allSongs: "All Songs",
    podcastEpisode: "Podcast Episode",

    // Playlist View & General View
    filter: "Filter",
    downloadAll: "Download list",
    downloadingList: "Downloading list...",
    downloadedAll: "List downloaded",
    suggestions: "Suggestions",
    suggestionsBasedOn: "Based on tracks in this playlist",
    refresh: "Refresh",
    refreshSuggestions: "Refresh suggestions",
    addToList: "Add to playlist",
    noDownloadsFound: "No matching songs found",
    noDownloadsYet: "No downloaded songs yet",
    downloadDescription: "Download songs and playlists for offline playback.",
    deleteFromDownloads: "Remove from downloads",
    openDownloads: "Open downloads",
    lyricsNotAvailable: "Lyrics not available",
    tryAgain: "Try Again",
    verifiedArtist: "Verified Artist",
    subscribers: "subscribers",
    popular: "Popular",
    singlesAndEPs: "Singles & EPs",
    noTracksInQueue: "No tracks in queue.",
    clearQueue: "Clear queue",
    saveQueueAsPlaylist: "Save queue as playlist",
    shuffleQueue: "Shuffle queue",
    previousTag: "(Previous) ",
    nowPlayingTag: "Now playing:",
    durationHour: "hr",
    durationMinute: "min",

    // Modals
    createNewPlaylist: "Create New Playlist",
    editPlaylist: "Edit Playlist",
    titleLabel: "Title",
    descriptionLabel: "Description (Optional)",
    playlistNamePlaceholder: "Playlist name",
    descriptionPlaceholder: "Add a description",
    privacyLabel: "Privacy",
    privacyPublic: "Public",
    privacyUnlisted: "Unlisted",
    privacyPrivate: "Private",
    privacyPublicDesc: "Anyone can search for and view.",
    privacyUnlistedDesc: "Anyone with the link can view.",
    privacyPrivateDesc: "Only you can view.",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    create: "Create",
    creating: "Creating...",
    chooseOrDragPhoto: "Choose or drag photo",
    chooseOrDragPhotoDrop: "Drop here",
    removeCover: "Remove",
    invalidImageFormat: "Please select a valid image file (PNG, JPG, WebP).",
    imageProcessingError: "An error occurred while processing the image.",
    playlistCreateFailed: "Could not create playlist",
    playlistUpdateFailed: "Could not update playlist",

    // Additional Search & Views
    searchNoResultsFor: "No results found for",
    searchNoResultsHelp: "Please make sure your words are spelled correctly, or try different keywords.",
    searchMix: "Mix",
    searchMixDesc: "Tubify custom mix based on",
    downloadedClickToDelete: "Downloaded (Click to delete)",
    downloading: "Downloading...",
    download: "Download",
    removeRecentSearch: "Remove",
    songsDownloaded: "songs downloaded",
    spaceUsed: "space used",
    totalOf: "Total",
    shuffle: "Shuffle Play",
    playAll: "Play All",
    action: "Action",
    playing: "Playing",
    cancelDownload: "Cancel",
    downloadDescriptionLong: "Download tracks to build your offline music collection.",
    tryDifferentSearch: "Try a different search query.",
    albumLoadError: "Failed to load album details",
    artistLoadError: "Failed to load artist details",
    albumPageLoadError: "Could not load album page",
    artistPageLoadError: "Could not load artist page",
    noPlayingTrack: "No track playing",
    playTrackToSeeLyrics: "Play a track to view lyrics.",
    searchingLyrics: "Searching for lyrics...",
    plainLyricsFallback: "Synced lyrics unavailable, showing plain text",
    unknownTrack: "Unknown Track",
    shuffleQueueOn: "Shuffle on",
    speakerOutputDevice: "Speaker / Audio Output",
    cacheAndAudioBuffer: "Cache and audio buffer settings.",
    streamingCache: "Streaming Cache",
    enabled: "Enabled",
    clearCache: "Clear Cache",

    // Toasts
    toastPinned: "Pinned to top",
    toastUnpinned: "Unpinned from top",
    toastHidden: "Hidden from library",
    toastUnhidden: "Shown in library",
    toastLinkCopied: "Link copied to clipboard",
    toastAddedToLiked: "Added to Liked Songs",
    toastRemovedFromLiked: "Removed from Liked Songs",
    toastAddedToPlaylist: "Added to playlist",
    toastRemovedFromPlaylist: "Removed from playlist",
    toastGoogleConnected: "Google & YouTube Music account connected!",
    toastLoginWindowError: "Could not open sign in window.",
    toastPlaylistCreated: "Playlist created",
    toastPlaylistUpdated: "Playlist updated",
    toastPlaylistCoverUpdated: "Playlist artwork updated",
    toastNoLikedTracks: "No liked songs found",
    toastEmptyPlaylist: "No tracks in this playlist yet",
    toastPlaylistPlayError: "Could not play playlist",
    toastAlbumLoading: "Loading album...",
    toastAlbumNoTracks: "No playable tracks found in this album",
    toastAlbumPlayError: "Could not play album",
    toastActionFailedReverted: "Action failed, changes reverted",
    toastSongAddFailed: "Could not add song to playlist",
    toastSongRemoveFailed: "Could not remove song from playlist",

    // Settings view
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
    updateAndRestart: "Update and Restart Now",
    updating: "Updating...",
    downloadingUpdate: "Downloading update...",
    updateCompleteRestarting: "Update complete. Restarting...",
    sourceCodeGithub: "Source Code (GitHub)",
    sourceCodeGithubDesc: "Visit open source repository, star or contribute.",

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
    // Navigation & General
    settings: "Ayarlar",
    account: "Hesap",
    appearance: "Görünüm",
    playback: "Çalma",
    library: "Kitaplık",
    window: "Pencere",
    shortcuts: "Kısayollar",
    home: "Ana Sayfa",
    search: "Ara",
    playlists: "Çalma Listeleri",
    albums: "Albümler",
    newPlaylist: "Yeni çalma listesi",
    filterPlaylists: "Listeleri filtrele",
    likedSongs: "Beğenilenler",
    episodesForLater: "Sonra Dinlenecek Bölümler",
    recentlyPlayed: "Son dinledikleriniz",
    moreRecommendations: "Daha fazla öneri",
    listenAgain: "Yeniden dinleyin",
    searchPlaceholder: "Ne çalmak istersiniz?",
    searchResultsFor: "Sonuçlar:",
    noResultsFound: "Sonuç bulunamadı.",
    backToHome: "Ana Sayfaya Dön",
    signIn: "Giriş Yap",
    signOut: "Hesaptan çıkış yap",
    signedIn: "Giriş yapıldı",
    signedOut: "Çıkış yapıldı",
    connected: "Bağlı",

    // TitleBar & Window Controls
    navBack: "Geri",
    navForward: "İleri",
    downloads: "İndirilenler",
    user: "Kullanıcı",
    minimize: "Simge Durumuna Küçült",
    maximize: "Büyüt / Geri Yükle",
    close: "Kapat",

    // Sidebar
    searchInLibrary: "Kitaplıkta ara",
    searchInLibraryPlaceholder: "Kitaplıkta ara...",
    createPlaylist: "Çalma listesi oluştur",
    expandLibrary: "Kitaplığı Genişlet",
    collapseLibrary: "Kitaplığı Daralt",
    viewGrid: "Görünüm (Izgara)",
    viewList: "Görünüm (Liste)",
    sortRecent: "Son çalınanlar",
    sortAlphabetical: "Ad",
    sortCustom: "Özel sıralama",
    sortBy: "Sıralama ölçütü",
    playlistLabel: "Çalma listesi",
    songCountSingle: "şarkı",
    songCountMultiple: "şarkı",
    hiddenPlaylists: "Gizlenenler",
    createFirstPlaylist: "İlk çalma listeni oluştur",
    createFirstPlaylistDesc: "Çalma listelerine ve beğenilen şarkılarına erişmek için Google hesabına bağlan.",

    // PlayerBar
    play: "Oynat",
    pause: "Duraklat",
    previous: "Önceki",
    next: "Sonraki",
    shuffleOn: "Karışık Açık",
    shuffleOff: "Karışık Kapalı",
    repeatAll: "Tümünü Tekrarla",
    repeatOne: "Tek Parçayı Tekrarla",
    repeatOff: "Tekrar Kapalı",
    mute: "Sesi Kapat",
    unmute: "Sesi Aç",
    volumeLevel: "Ses seviyesi",
    like: "Beğen",
    unlike: "Beğenilenler'den kaldır",
    moreOptions: "Daha fazla seçenek",
    queue: "Sıradaki Şarkılar",
    nowPlaying: "Şu An Çalan",
    lyrics: "Şarkı Sözleri",

    // Context Menus
    addToQueue: "Sıraya Ekle",
    playNext: "Bundan Sonra Çal",
    startRadio: "Şarkı Radyosunu Başlat",
    addToPlaylist: "Çalma Listesine Ekle",
    removeFromPlaylist: "Bu Çalma Listesinden Kaldır",
    goToArtist: "Sanatçıya Git",
    goToAlbum: "Albüme Git",
    copyLink: "Bağlantıyı Kopyala",
    saveToLikedSongs: "Beğenilenler'e Ekle",
    removeFromLikedSongs: "Beğenilenler'den Kaldır",
    shufflePlay: "Karışık Çal",
    edit: "Düzenle",
    deleteFromLibrary: "Kitaplığından Sil",
    showInLibrary: "Kitaplığında Göster",
    hideFromLibrary: "Kitaplığından Gizle",
    unpinFromTop: "Sabitlemeyi Kaldır",
    pinToTop: "Başa Sabitle",

    // Table Headers
    tableHeaderTitle: "BAŞLIK",
    tableHeaderAlbum: "ALBÜM",
    tableHeaderPlays: "DİNLENME SAYISI",
    tableHeaderSize: "BOYUT",
    tableHeaderDuration: "SÜRE",

    // Search View
    searchCategoryAll: "Tümü",
    searchCategorySongs: "Şarkılar",
    searchCategoryArtists: "Sanatçılar",
    searchCategoryAlbums: "Albümler",
    searchCategoryPlaylists: "Çalma Listeleri",
    searchCategoryPodcasts: "Podcast'ler",
    recentSearches: "Son aramalar",
    clearAll: "Hepsini temizle",
    browseAll: "Hepsine göz at",
    topResult: "En iyi sonuç",
    artist: "Sanatçı",
    song: "Şarkı",
    allSongs: "Tüm Şarkılar",
    podcastEpisode: "Podcast Bölümü",

    // Playlist View & General View
    filter: "Filtrele",
    downloadAll: "Listeyi İndir",
    downloadingList: "Liste indiriliyor...",
    downloadedAll: "Tüm liste indirildi",
    suggestions: "Öneriler",
    suggestionsBasedOn: "Bu çalma listesindeki parçalara göre",
    refresh: "Yenile",
    refreshSuggestions: "Önerileri Yenile",
    addToList: "Listeye Ekle",
    noDownloadsFound: "Eşleşen şarkı bulunamadı",
    noDownloadsYet: "Henüz indirilmiş şarkı yok",
    downloadDescription: "Çevrimdışı müzik arşivinizi oluşturmak için parçaları indirin.",
    deleteFromDownloads: "İndirilenlerden Sil",
    openDownloads: "İndirilenleri aç",
    lyricsNotAvailable: "Şarkı sözü bulunamadı",
    tryAgain: "Tekrar Dene",
    verifiedArtist: "Onaylı Sanatçı",
    subscribers: "abone",
    popular: "Popüler",
    singlesAndEPs: "Single ve EP'ler",
    noTracksInQueue: "Sırada parça yok.",
    clearQueue: "Sırayı temizle",
    saveQueueAsPlaylist: "Sırayı çalma listesi olarak kaydet",
    shuffleQueue: "Sırayı Karıştır",
    previousTag: "(Önceki) ",
    nowPlayingTag: "Şu an çalan:",
    durationHour: "sa",
    durationMinute: "dk",

    // Modals
    createNewPlaylist: "Yeni Çalma Listesi Oluştur",
    editPlaylist: "Çalma Listesini Düzenle",
    titleLabel: "Başlık",
    descriptionLabel: "Açıklama (İsteğe bağlı)",
    playlistNamePlaceholder: "Çalma listesi adı",
    descriptionPlaceholder: "Açıklama ekle",
    privacyLabel: "Gizlilik",
    privacyPublic: "Herkese Açık",
    privacyUnlisted: "Liste Dışı",
    privacyPrivate: "Özel",
    privacyPublicDesc: "Herkes arayabilir ve görüntüleyebilir.",
    privacyUnlistedDesc: "Yalnızca bağlantıya sahip olanlar görüntüleyebilir.",
    privacyPrivateDesc: "Yalnızca siz görüntüleyebilirsiniz.",
    cancel: "İptal",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    create: "Oluştur",
    creating: "Oluşturuluyor...",
    chooseOrDragPhoto: "Fotoğraf seç veya sürükle",
    chooseOrDragPhotoDrop: "Buraya bırakın",
    removeCover: "Kaldır",
    invalidImageFormat: "Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WebP).",
    imageProcessingError: "Resim işlenirken bir sorun oluştu.",
    playlistCreateFailed: "Çalma listesi oluşturulamadı",
    playlistUpdateFailed: "Çalma listesi güncellenemedi",

    // Additional Search & Views
    searchNoResultsFor: "için sonuç bulunamadı",
    searchNoResultsHelp: "Lütfen kelimeleri doğru yazdığından emin ol veya farklı anahtar kelimelerle tekrar dene.",
    searchMix: "Karışımı",
    searchMixDesc: "ve benzeri sanatçılardan oluşan Tubify özel karışımı",
    downloadedClickToDelete: "İndirildi (Silmek için tıkla)",
    downloading: "İndiriliyor...",
    download: "İndir",
    removeRecentSearch: "Kaldır",
    songsDownloaded: "şarkı indirildi",
    spaceUsed: "alan kullanılıyor",
    totalOf: "Toplam",
    shuffle: "Karışık Çal",
    playAll: "Tümünü Oynat",
    action: "İşlem",
    playing: "Oynatılıyor",
    cancelDownload: "İptal Et",
    downloadDescriptionLong: "Çalma listesi sayfalarında 'Listeyi İndir' butonuna basarak veya şarkılara sağ tıklayıp 'İndir' seçeneğini kullanarak çevrimdışı müzik arşivinizi oluşturun.",
    tryDifferentSearch: "Farklı bir arama terimi deneyin.",
    albumLoadError: "Albüm bilgileri yüklenemedi",
    artistLoadError: "Sanatçı bilgileri yüklenemedi",
    albumPageLoadError: "Albüm Sayfası Yüklenemedi",
    artistPageLoadError: "Sanatçı Sayfası Yüklenemedi",
    noPlayingTrack: "Çalan Şarkı Yok",
    playTrackToSeeLyrics: "Şarkı sözlerini görüntülemek için bir parça başlatın.",
    searchingLyrics: "Sözler aranıyor...",
    plainLyricsFallback: "Zaman damgalı sözler bulunamadı, düz metin gösteriliyor",
    unknownTrack: "Bilinmeyen Şarkı",
    shuffleQueueOn: "Karışık Çalma Açık",
    speakerOutputDevice: "Hoparlör / Çıkış Aygıtı",
    cacheAndAudioBuffer: "Önbellek ve ses tamponlama ayarları.",
    streamingCache: "Akış Önbelleği",
    enabled: "Etkin",
    clearCache: "Önbelleği Temizle",

    // Toasts
    toastPinned: "Başa sabitlendi",
    toastUnpinned: "Sabitleme kaldırıldı",
    toastHidden: "Kitaplıktan gizlendi",
    toastUnhidden: "Kitaplıkta gösterildi",
    toastLinkCopied: "Bağlantı panoya kopyalandı",
    toastAddedToLiked: "Beğenilenler'e eklendi",
    toastRemovedFromLiked: "Beğenilenler'den kaldırıldı",
    toastAddedToPlaylist: "Çalma listesine eklendi",
    toastRemovedFromPlaylist: "Çalma listesinden kaldırıldı",
    toastGoogleConnected: "Google & YouTube Music hesabınız bağlandı!",
    toastLoginWindowError: "Giriş penceresi açılamadı.",
    toastPlaylistCreated: "Çalma listesi oluşturuldu",
    toastPlaylistUpdated: "Çalma listesi güncellendi",
    toastPlaylistCoverUpdated: "Çalma listesi kapağı güncellendi",
    toastNoLikedTracks: "Beğenilen şarkı bulunamadı",
    toastEmptyPlaylist: "Bu çalma listesinde henüz şarkı yok",
    toastPlaylistPlayError: "Çalma listesi oynatılamadı",
    toastAlbumLoading: "Albüm yükleniyor...",
    toastAlbumNoTracks: "Bu albümde çalınabilir şarkı bulunamadı",
    toastAlbumPlayError: "Albüm oynatılamadı",
    toastActionFailedReverted: "İşlem başarısız oldu, değişiklik geri alındı",
    toastSongAddFailed: "Şarkı çalma listesine eklenemedi",
    toastSongRemoveFailed: "Şarkı çalma listesinden kaldırılamadı",

    // Settings view
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
    updateAndRestart: "Şimdi Güncelle ve Yeniden Başlat",
    updating: "Güncelleniyor...",
    downloadingUpdate: "Güncelleme indiriliyor...",
    updateCompleteRestarting: "Güncelleme tamamlandı. Yeniden başlatılıyor...",
    sourceCodeGithub: "Kaynak Kodu (GitHub)",
    sourceCodeGithubDesc: "Açık kaynak depoyu ziyaret edin, yıldız verin veya katkıda bulunun.",

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
    return "en";
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
