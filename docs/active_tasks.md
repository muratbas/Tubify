# Tubify UI/UX Refactoring - Aktif Görev Takibi

## Mevcut Durum & Hedef
Rust/InnerTube bağlantılarını ve IPC katmanını bozmadan arayüzü hibrit masaüstü (Spotify Bento-Grid + Apple Music Ambient + YT Music geek kontrolleri) mimarisine ve tasteskill kurallarına göre sıfırdan refactor etmek.

## Tamamlanan Analizler
- [x] `src-tauri` Rust invoke komutları ve IPC köprüleri analiz edildi (`search_music`, `get_stream_url`, `get_user_profile`, `save_google_cookie`, vb.).
- [x] `src/` klasörü, mevcut `services/api.ts`, `App.tsx` state yönetimi ve bileşenler incelendi.
- [x] `.agents/skills` (design-taste, high-end-visual-design) standartları ve `AGENTS.md` prensipleri haritalandırıldı.

## Tamamlanan Aşamalar
- [x] **Aşama 1:** Mimari & Bento-Grid Layout İskeleti (`TitleBar`, daraltılabilir `Sidebar`, `Main Viewport`, açılıp kapanabilir `RightDrawer`, `PlayerBar`).
- [x] **Aşama 2:** Audio/Player Global State Ayrımı (`PlayerContext.tsx` - Tekil kaynak Single Source of Truth prensibi).
- [x] **Aşama 3:** Orta Panel İçerikleri (YT Music tarzı `MoodFilterBar` chip'leri, `AmbientBackground` mesh gradient, `HomeView`, `PlaylistView`, `SearchView`).
- [x] **Aşama 4:** Sağ Panel (`RightDrawer.tsx` - "Şu An Çalan", 1:1 Kare Albüm vs 16:9 Video en-boy oranı toggle'ı, "Sıradaki Şarkılar / Queue", "Şarkı Sözleri / Lyrics").
- [x] **Aşama 5:** Alt Player Bar (`PlayerBar.tsx` - `MicroVisualizer` ses dalgası animasyonu, pürüzsüz timeline seek, ses kontrolü, dokunsal `active:scale` geri bildirimleri).
- [x] **Aşama 6:** Verification & Build Test (`npm run build` hatasız sıfır regresyon ile tamamlandı).
- [x] **Aşama 7:** Birebir Spotify Desktop Görsel Uyumu:
  - `SpotifyMix` font ailesi (`SpotifyMix-Light.ttf`, `SpotifyMix-Medium.ttf`) projeye dahil edildi ve ana font yapıldı.
  - `tubify.ico` favicon ve proje ikonları olarak bağlandı.
  - TitleBar sadeleştirildi: logo, "Tubify_" yazısı, aktif sekme balonu ve "+" butonu kaldırıldı; yerine geri/ileri yön butonları ve "Ne çalmak istersiniz?" arama çubuğu yerleştirildi.
  - Sol Sidebar iki katmanlı Spotify yapısına kavuşturuldu: Üstte Ana Sayfa & Ara kutusu, altta Kitaplık + filtre hapları (Çalma Listeleri, Albümler, Sanatçılar, Podcast'ler) ve sabit "Beğenilenler" kartı.
  - Çalma listesi görünümü görseldeki Beğenilenler mor gradienti, yeşil yuvarlak play butonu ve Spotify şarkı tablosu ile uyarlandı.
  - Alt oynatıcı barı Spotify koyu stiline dönüştürüldü.
- [x] **Aşama 8:** Bitişik (Edge-to-Edge Split Pane) Mimariye Geçiş ve YouTube Music Red (#FF0000) Vurgu Renkleri:
  - Baloncuk / Bento yapısı (yüzen kutular, padding boşlukları, yuvarlatılmış dış köşeler) tamamen kaldırıldı.
  - Sol Sidebar ekranın en sol üstünden (`top-0 left-0`) alt oynatıcı çubuğuna kadar kesintisiz, tek parça ve bitişik dikey sınırla (`border-r`) bağlandı.
  - Global üst bar kaldırıldı; Header (`TitleBar`) SADECE sağdaki Ana İçerik panelinin en üstüne yerleştirildi (`bg-transparent`, alttaki gradient ile bütünleşik).
  - Geri/İleri (`< >`) butonları ve arama çubuğu sağdaki ana içerik alanının sol üst köşesinde (dikey ayırıcı çizginin hemen sağında) konumlandırıldı.
  - Sağ üstteki yeşil sürüm rozeti ("v0.1.0 hazır"), miniplayer genişlet ve ekolayzır ikonları tamamen temizlendi; sadece Ayarlar, Profil Avatarı ve Pencere Kontrolleri bırakıldı.
  - Spotify yeşili tamamen silindi; Çalma Listesi büyük Play butonu, şarkı listesindeki beğeni kalpleri, slider/progress bar ve aktif sekmeler YouTube Music Kırmızısı (`#FF0000`) yapıldı.
  - Açık (Light) ve Koyu (Dark) mod tüm panellere (Sidebar, Ana İçerik ve Alt Player Bar) homojen şekilde uygulandı.
  - `npm run build` ile sıfır hata/regresyon doğrulandı.
- [x] **Aşama 9:** Spotifast Birebir Anatomik Uyum & TitleBar Sürükleme Onarımı:
  - Sol üstteki Tubify logosu kaldırıldı (logo sadece system trayde gözükecek şekilde izole edildi).
  - TitleBar pencere sürükleme (dragging) sorunu giderildi: Asenkron promise gecikmesi kaldırılarak `@tauri-apps/api/window` senkron `getCurrentWindow().startDragging()` çağrısına bağlandı; arama çubuğu ile sağ kontroller arasına geniş `flex-1` sürükleme alanı eklendi.
  - Zero-Gap Split Layout: Sol Sidebar `w-[260px]` (`bg-white`, `border-r border-[#f0f0f0]`), Sağ Ana Alan `flex-1` yumuşak gradientten saf beyaza eriyen zemin, Alt Player Bar `h-[84px]` (`bg-white`, `border-t border-[#f0f0f0]`).
  - Sol Sidebar Detayları: "Ana Sayfa" & "Ara" `font-medium text-sm`, ince ayırıcı çizgi (`border-b border-neutral-200 my-3`), filtre hapları seçilide `bg-black text-white` seçilmemişte `bg-neutral-100 text-neutral-700`, liste öğelerinde `44x44px` kapaklar ve kırmızı pin.
  - Şeffaf Üst Bar: `w-[280px]` tam yuvarlak beyaz arama çubuğu, yuvarlak yarı şeffaf `< >` butonları, sağda sadece Ayarlar, Profil ve Pencere kontrolleri.
  - Hero ve Tracklist: `192x192px` kapak, `text-6xl font-extrabold` başlık, aksiyon barında `w-14 h-14` kırmızı Play butonu, `# ▲` kırmızı sıralama oku, satır hover'ında yumuşak gri zemin (`hover:bg-neutral-200/60 rounded-lg`), sıra numarası yerine siyah `▶` play ikonu, kırmızı kalp ve üç nokta (`...`).
  - Alt Oynatıcı: `h-[84px]`, `56x56px` kapak, ortada `w-9 h-9` siyah daire içinde beyaz Play butonu, ince ve zarif progress bar (`h-1 bg-neutral-200`).
  - `npm run build` ile sıfır hata doğrulandı.

## Gelecek / Sonraki Adımlar
- Kullanıcı deneyimini izlemek ve talep edilen ince ayarları uygulamak.
