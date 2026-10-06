# Tubify 🎵

> Ultra Hafif (<60 MB RAM), Bağımsız YouTube Music Masaüstü İstemcisi.  
> Oyun oynarken bilgisayarı yormayan, API anahtarı/kota gerektirmeyen, sıfır webview wrapper minimalist masaüstü müzik çalar.

---

## ⚡ Temel Özellikler
- **Ultra Düşük Kaynak Tüketimi:** Electron tabanlı hantal çözümler yerine Tauri v2 (Rust backend) + React 19 / TypeScript + Tailwind CSS v4 mimarisi.
- **Sıfır API Ücreti:** Google Cloud / YouTube Data API v3 gerekmez; doğrudan tersine mühendislik InnerTube API üzerinden çalışır.
- **Yüksek Kaliteli Ses:** Doğrudan YouTube CDN'den 160kbps Opus / m4a adaptive ses akışı.
- **Mini-Player / Gaming HUD:** Oyun oynarken ekran köşesinde kompakt, dikkat dağıtmayan yüzen mini oynatıcı modu.
- **Özel Arayüz:** music.youtube.com webview wrapper'ı DEĞİLDİR; %100 sıfırdan modern koyu tema ile kodlanmış saf arayüz.

---

## 🛠️ Teknoloji Mimarisi

- **Masaüstü Motoru:** Tauri v2
- **Backend (Rust):**
  - `search.rs`: InnerTube `WEB_REMIX` istemcisi üzerinden API anahtarsız arama ve parça bilgisi çıkarma
  - `stream.rs`: CDN ses akışını (160kbps Opus / AAC) çözen stream resolver
  - `lib.rs`: IPC komut köprüsü (`search_music`, `get_stream_url`)
- **Frontend:**
  - React 19 + TypeScript
  - Tailwind CSS v4
  - Lucide React (Minimalist müzik ikonları)

---

## 🚀 Çalıştırma ve Geliştirme

### 1. Bağımlılıkları Yükleme
```bash
npm install
```

### 2. Geliştirme Modunda Başlatma (Web & Tauri Dev)
```bash
# Web & Dev Server (Hızlı prototip & UI testi)
npm run dev

# Tauri Masaüstü İstemcisi
npm run tauri dev
```

### 3. Üretim Paketi Oluşturma (Production Build)
```bash
npm run build
npm run tauri build
```

---

## 🔗 Uzak GitHub Reposu Bağlantısı
Yerel Git reposunu uzaktaki GitHub reponuza bağlamak için aşağıdaki komutları çalıştırabilirsiniz:

```bash
git remote add origin https://github.com/<KULLANICI_ADINIZ>/Tubify.git
git branch -M main
git push -u origin main
```
