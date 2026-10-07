# Tubify — Proje Durum ve Mimari Raporu (STATUS.md)

**Son Güncelleme:** 7 Ekim 2026  
**Sürüm:** v0.1.0-alpha  
**Geliştirici:** Murat Baş & AI Pair Programming  

---

## 1. Proje Özeti ve Vizyon

**Tubify**, resmi YouTube Music altyapısını kullanan, sistem kaynaklarını minimum düzeyde tüketen (ultra-lightweight), modern **Spotify arayüz dinamikleri** ile **YouTube Music renk ve marka kimliğini** harmanlayan bağımsız bir masaüstü müzik istemcisidir.

- **Düşük Kaynak Tüketimi:** Ağır Electron tabanlı istemciler yerine Rust + Tauri v2 altyapısıyla çalışarak ~40-70 MB RAM aralığında ultra hafif çalışma hedeflenir.
- **Doğal Entegrasyon:** Kullanıcının resmi YouTube Music kütüphanesine (Beğenilen Şarkılar, Çalma Listeleri, Geçmiş, Öneriler) doğrudan erişim ve iki yönlü senkronizasyon sağlar.
- **Tasarım Mükemmeliyeti:** Spotify yerleşim düzeni (sidebar, playlist hero, parça tablosu, alt oynatıcı) ile YouTube Kırmızısı (`#FF0000`) aksan renkleri, yekpare `#f0f0f0` açık tema ve derin OLED siyah koyu tema deneyimi sunar.

---

## 2. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji / Kütüphane | Versiyon / Rol |
| :--- | :--- | :--- |
| **Masaüstü Çekirdeği** | **Tauri v2** | `v2.x` — Güvenli Rust-Webview köprüsü, pencere yönetimi, IPC |
| **Backend / Core** | **Rust (Edition 2021)** | `tokio` (asenkron runtime), `reqwest` (rustls-tls, HTTP/2), `serde` |
| **Ön Yüz Framework** | **React 19 & TypeScript** | Modern fonksiyonel bileşenler, Strict typing |
| **Derleyici / Bundler** | **Vite 8** | `@vitejs/plugin-react`, `@tailwindcss/vite` |
| **Stil & Tasarım** | **Tailwind CSS v4** | CSS değişkenleri (`--bg-main`, `--accent`), modern atomik stiller |
| **Tipografi** | **Google Fonts Inter** | 300, 400, 500, 600, 700, 800, 900 ağırlıkları |
| **İkon Seti** | **Lucide React** | `lucide-react` modern minimalist SVG ikonlar |
| **Müzik Altyapısı** | **YouTube InnerTube API** | `WEB_REMIX` istemcisi ters mühendislik çözümü, `SAPISIDHASH` auth |

---

## 3. Klasör ve Proje Mimarisi

```
Tubify/
├── STATUS.md                          # Proje mimari ve durum dokümantasyonu
├── README.md                          # Proje tanıtım ve başlangıç rehberi
├── package.json                       # Frontend bağımlılıkları ve scriptler
├── vite.config.ts                     # Vite derleme ve Tauri dev sunucu yapılandırması
├── index.html                         # Uygulama HTML giriş noktası (Inter font tanımlı)
│
├── src-tauri/                         # Rust & Tauri Masaüstü Katmanı
│   ├── Cargo.toml                     # Rust bağımlılıkları ve release optimizasyonları
│   ├── tauri.conf.json                # Pencere boyutları, frameless pencere, bundle ayarları
│   ├── capabilities/
│   │   └── default.json               # IPC izinleri (pencere sürükleme, opener, core)
│   └── src/
│       ├── lib.rs                     # Tauri komutlarının kaydedildiği ana modül
│       ├── main.rs                    # Masaüstü çalıştırılabilir dosya giriş noktası
│       ├── auth.rs                    # Google WebView, Cookie parse, InnerTube kütüphane & like servisi
│       ├── stream.rs                  # YouTube ses akışı format seçici ve URL çözücü
│       └── search.rs                  # YouTube Music arama ve sonuç ayrıştırma servisi
│
└── src/                               # React Frontend Katmanı
    ├── main.tsx                       # React kökü (ThemeProvider & LanguageProvider sarılı)
    ├── App.tsx                        # Ana uygulama orkestrasyonu, görünüm yönlendirme ve oynatıcı state'i
    ├── index.css                      # Tailwind v4 importu, tema CSS değişkenleri, custom scrollbar
    ├── context/
    │   ├── ThemeContext.tsx           # Koyu (OLED) ve Açık (#f0f0f0) tema yönetimi (Default: Light)
    │   └── LanguageContext.tsx        # Çoklu dil desteği (Default: İngilizce / Türkçe)
    ├── services/
    │   └── api.ts                     # Tauri IPC `invoke` çağrıları ve tarayıcı/dev fallback'leri
    ├── types/
    │   └── music.ts                   # Track, StreamInfo, UserProfile, Playlist tip tanımları
    └── components/
        ├── TitleBar.tsx               # Özel çerçevesiz pencere çubuğu, arama kutusu, profil menüsü
        ├── Sidebar.tsx                # Çalma listesi filtreleme, Liked Songs, Episodes for Later
        ├── HomeView.tsx               # Ana sayfa: Recently played, Recommendations, Listen again
        ├── PlaylistView.tsx           # Spotify tarzı çalma listesi detay sayfası, hero banner, şarkı tablosu
        ├── SettingsView.tsx           # Tam sayfa ayarlar (Account, Appearance, Last.fm, Shortcuts vb.)
        ├── PlayerBar.tsx              # Alt sabit oynatıcı çubuğu, seek bar, ses kontrolü, like butonu
        ├── MiniPlayerHUD.tsx          # Oyun ve çoklu görev için kompakt yüzen HUD oynatıcı
        └── LoginModal.tsx             # Google WebView / Çerez giriş diyaloğu
```

---

## 4. Tamamlanan Özellikler ve Aşamalar

### 4.1. Pencere ve Masaüstü Entegrasyonu
- [x] **Çerçevesiz (Frameless) Tasarım:** İşletim sisteminin varsayılan başlık çubuğu kaldırıldı (`decorations: false`).
- [x] **Özel Sürükleme (Window Dragging):** Başlık çubuğu üzerinden pencereyi taşıma yetkisi (`core:window:allow-start-dragging`) ve `getCurrentWindow().startDragging()` entegrasyonu sağlandı.
- [x] **Pencere Kontrolleri:** Minimize, Maximize/Restore ve Kapat butonları Tauri API ile bağlandı.

### 4.2. Tasarım & Temalandırma (Spotify UI + YouTube Red)
- [x] **Kesintisiz Açık Tema (`#f0f0f0`):** TitleBar, Sidebar ve ana sayfa arasındaki yapay kontrast kaldırıldı; yekpare `#f0f0f0` tuval üzerine saf beyaz (`#ffffff`) zarif gölgeli kartlar oturtuldu.
- [x] **OLED Koyu Tema (`#030303`):** Derin siyahlar ve YouTube Kırmızısı vurguları.
- [x] **Varsayılan Tema:** Uygulama açılışta doğrudan **Light Mode** olarak başlar (`tubify_theme` ile kalıcı).
- [x] **Tipografi:** Google Fonts `Inter` tanımlandı; yazı tipi kalınlıkları ve hiyerarşi ekran görüntülerine göre kalibre edildi.

### 4.3. Çoklu Dil Desteği (i18n)
- [x] **Varsayılan Dil İngilizce (`en`):** Tüm arayüz, menüler ve sabit çalma listeleri varsayılan olarak İngilizce'dir.
- [x] **Türkçe Dil Desteği (`tr`):** Ayarlar ekranından anında Türkçe veya İngilizce seçilebilir (`tubify_lang` ile kalıcı).

### 4.4. Arayüz Bileşenleri
- [x] **TitleBar:**
  - Sol tarafta `Tubify_` marka logosu ve aktif sekme göstergesi (`[Settings]`, `[Playlist]`, `+`).
  - Ortada `Ctrl + Space` kısayol etiketli arama çubuğu.
  - Sağ tarafta Discord, YouTube Music, GitHub butonları ve Ayarlar butonu.
  - **Profil Açılır Menüsü (Dropdown):** Kullanıcı avatarına tıklandığında açılan `Murat / Signed in` ve `Account settings` menüsü.
- [x] **Sidebar:**
  - `Playlists` ve `Albums` hap butonları, `+ New playlist` butonu ve anlık arama/filtreleme.
  - Sabitlenmiş İngilizce kartlar: **`Liked Songs`** (`YouTube Music`) ve **`Episodes for Later`** (`Auto playlist • 2 episodes`).
  - Kullanıcının kendi YouTube Music çalma listelerinin dinamik listesi.
- [x] **HomeView:**
  - `Recently played` (3 sütunlu yatay mini kartlar ve hover play butonları).
  - `More recommendations` (kare albüm kapağı kartları).
  - `Listen again` (öneri satırı).
- [x] **PlaylistView:**
  - Dinamik arka plan degrade geçişli Hero banner (Liked Songs için özel kalp tasarımı).
  - Büyük dairesel oynat butonları, `Shuffle` ve `Loop` pill butonları, liste içi filtreleme.
  - Spotify tarzı şarkı listesi tablosu (`#`, Şarkı Adı/Sanatçı, Albüm, Beğeni, Süre).
- [x] **SettingsView (Tam Sayfa):**
  - Modal baloncuk yerine tam sayfa düzen.
  - Sol alt menü: `Account`, `Appearance`, `Playback`, `Library`, `Window`, `Shortcuts`.
  - **Account Kartı:** YouTube Music bağlantı durumu, `Murat`, `Session confirmed just now`, `Sign out` butonu, hesap ve kanal satırları.
  - **Last.fm Kartı:** Scrobble açma/kapama switch'i ve `Connect Last.fm` butonu.
  - **Appearance Kartı:** Görsel Koyu/Açık tema seçim kartları ve Dil seçimi.
- [x] **PlayerBar:**
  - En üstte tam genişlikte tıklanabilir ve sürüklenebilir hassas parça ilerleme çubuğu.
  - Sol tarafta çalan şarkı bilgisi, albüm kapağı ve beğeni butonu.
  - Ortada önceki, sonraki, shuffle, repeat ve kırmızı oynat/duraklat butonları.
  - Sağ tarafta zaman damgası, Mini HUD modu ve ses seviyesi kaydırıcısı.
- [x] **Mini Player HUD:**
  - Oyun oynarken ekranda kompakt, yarı saydam ve her zaman üstte kalabilen mini oynatıcı.

### 4.5. Backend ve YouTube Music Entegrasyonu
- [x] **Google WebView Girişi:** Bağımsız webview açarak Google oturumu başlatma ve arka planda çerezleri yakalama.
- [x] **Manuel Çerez Import:** Kullanıcının `copy(document.cookie)` ile tek tıkla hesabını bağlayabilmesi.
- [x] **InnerTube Kütüphane Ayrıştırıcı:** `FEmusic_liked_videos` ve kullanıcı çalma listelerini özyinelemeli (recursive) JSON ayrıştırıcı ile eksiksiz çekme.
- [x] **İki Yönlü Beğeni Senkronizasyonu:** Uygulama içinde beğenilen şarkının YouTube Music üzerinde de anında beğenilmesi/kaldırılması (`toggle_yt_like`).
- [x] **Özel Marka Logosu & Taskbar Simgesi:** Kullanıcının sağladığı `tubify.png` baz alınarak `npx tauri icon` ile tüm platform ikonları (`icon.ico`, `icon.png`, `Square...Logo` vb.) üretildi. TitleBar, LoginModal, Mini HUD ve favicon güncellendi.
- [x] **Keskin Köşeli Playlist Kapakları (Crisp Square Covers):** PlaylistView ve Sidebar üzerinde çalma listesi kapakları Spotify tarzında net, tam oturan ve gölgeli kare (`rounded-none`) formatına getirildi.

---

## 5. Teknik Kararlar ve Notlar

1. **InnerTube `WEB_REMIX` Protokolü:**
   - Resmi YouTube Music web istemcisi taklit edilerek ek API anahtarına gerek kalmadan arama, akış ve kütüphane işlemleri gerçekleştirilir.
   - Oturum doğrulaması için Google `SAPISID` çerezi üzerinden SHA-1 tabanlı `SAPISIDHASH` başlığı üretilir.
2. **Tauri IPC İzin Politikası (`capabilities/default.json`):**
   - Tauri v2 güvenlik modeli gereği pencere sürükleme için `"core:window:allow-start-dragging"` açıkça tanımlanmıştır.
   - Harici bağlantıların sistem varsayılan tarayıcısında açılması için `opener:default` yetkilendirilmiştir.
3. **Frontend Durum Yönetimi ve Kalıcılık:**
   - Tema tercihi (`tubify_theme`), dil tercihi (`tubify_lang`), beğenilen şarkı ID seti (`tubify_liked_ids`) ve son çalınanlar (`tubify_recent_tracks`) `localStorage` üzerinde saklanır.
4. **Git Politikası (Kritik Kural):**
   - Kullanıcı talimatı: **"bundan sonra commitleri ben atacağım."**
   - Antigravity hiçbir zaman doğrudan `git commit` veya `git push` komutları çalıştırmaz; tüm değişiklikleri çalışma alanında temiz bırakır.

---

## 6. Sıradaki Görevler ve Yol Haritası (Roadmap)

### 🎯 Sıradaki 1. Görev: SMTC (Windows System Media Transport Controls) Entegrasyonu
- **Amaç:** Klavyedeki fiziksel medya tuşlarının (Play, Pause, Next, Prev), Windows ses çubuğundaki medya kutucuğunun ve kilit ekranında çalan şarkı/kapak görselinin aktif hale getirilmesi.
- **Teknik Yol:** Rust tarafında `windows` veya `souvlaki` / `tauri-plugin-media-controls` kütüphanelerinin entegrasyonu ve ses oynatma durumuyla senkronize edilmesi.

### 🎯 Sıradaki 2. Görev: Discord Rich Presence (RPC)
- **Amaç:** Discord profilinde kullanıcının o an Tubify üzerinde ne dinlediğini (şarkı adı, sanatçı, albüm kapağı, geçen süre) canlı göstermek.
- **Teknik Yol:** Rust tarafında `discord-rich-presence` kütüphanesi ile IPC bağlantısı kurmak.

### 🎯 Sıradaki 3. Görev: Last.fm Gerçek Scrobbler API Entegrasyonu
- **Amaç:** SettingsView'da arayüzü ve butonları hazır olan Last.fm scrobble işlevinin gerçek Last.fm 2.0 API'sine (`track.scrobble`, `track.updateNowPlaying`) bağlanması.

### 🎯 Sıradaki 4. Görev: Yerel Ses Önbelleği (Streaming Cache)
- **Amaç:** Çalınan parçaların ve sıradaki şarkının parçalı olarak yerel geçici disk alanında önbelleğe alınması; şarkı geçişlerinde sıfır gecikme (zero-latency) ve veri tasarrufu sağlanması.

### 🎯 Sıradaki 5. Görev: Global Klavye Kısayolları (Global Shortcuts)
- **Amaç:** Uygulama simge durumundayken veya oyundayken dahi global tuş kombinasyonlarıyla (örn. `Ctrl+Alt+Right`) şarkı değiştirebilme.
- **Teknik Yol:** `tauri-plugin-global-shortcut` eklentisi.

---

*Bu belge projenin güncel referans noktasıdır ve yeni özellikler tamamlandıkça güncellenecektir.*
