use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::search::Track;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub is_authenticated: bool,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub thumbnail: Option<String>,
    pub track_count: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeSection {
    pub title: String,
    pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionData {
    pub cookie: String,
    pub sapisid: Option<String>,
    pub profile: Option<UserProfile>,
}

// Global thread-safe session store
pub static SESSION: Mutex<Option<SessionData>> = Mutex::new(None);

fn get_session_file_path() -> PathBuf {
    if let Ok(path) = std::env::current_dir() {
        return path.join("tubify_session.json");
    }
    PathBuf::from("tubify_session.json")
}

pub fn load_saved_session() {
    let file = get_session_file_path();
    if file.exists() {
        if let Ok(content) = fs::read_to_string(&file) {
            if let Ok(data) = serde_json::from_str::<SessionData>(&content) {
                let mut lock = SESSION.lock().unwrap();
                *lock = Some(data);
            }
        }
    }
}

pub fn save_session_to_file(data: &SessionData) {
    let file = get_session_file_path();
    if let Ok(json) = serde_json::to_string_pretty(data) {
        let _ = fs::write(file, json);
    }
}

pub fn clear_session_file() {
    let file = get_session_file_path();
    if file.exists() {
        let _ = fs::remove_file(file);
    }
    let mut lock = SESSION.lock().unwrap();
    *lock = None;
}

pub fn extract_sapisid(cookies: &str) -> Option<String> {
    for part in cookies.split(';') {
        let trimmed = part.trim();
        if trimmed.starts_with("SAPISID=") {
            return Some(trimmed.trim_start_matches("SAPISID=").to_string());
        }
        if trimmed.starts_with("__Secure-3PAPISID=") {
            return Some(trimmed.trim_start_matches("__Secure-3PAPISID=").to_string());
        }
    }
    None
}

pub fn generate_sapisid_hash(sapisid: &str, origin: &str) -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let payload = format!("{} {} {}", timestamp, sapisid, origin);
    let mut hasher = Sha1::new();
    hasher.update(payload.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    format!("SAPISIDHASH {}_{}", timestamp, hash)
}

fn build_client(cookie: &str, sapisid: Option<&str>) -> Result<(reqwest::Client, reqwest::header::HeaderMap), String> {
    let origin = "https://music.youtube.com";
    let mut headers = reqwest::header::HeaderMap::new();

    headers.insert(
        reqwest::header::USER_AGENT,
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            .parse()
            .map_err(|e| format!("{}", e))?,
    );
    headers.insert(
        reqwest::header::ORIGIN,
        origin.parse().map_err(|e| format!("{}", e))?,
    );
    headers.insert(
        reqwest::header::REFERER,
        "https://music.youtube.com/".parse().map_err(|e| format!("{}", e))?,
    );
    if let Ok(val) = origin.parse() {
        headers.insert("X-Origin", val);
    }
    if let Ok(val) = "67".parse() {
        headers.insert("X-YouTube-Client-Name", val);
    }
    if let Ok(val) = "1.20240401.01.00".parse() {
        headers.insert("X-YouTube-Client-Version", val);
    }

    let clean_cookie = cookie.replace('\r', "").replace('\n', "");
    if !clean_cookie.trim().is_empty() {
        if let Ok(c_val) = clean_cookie.parse() {
            headers.insert(reqwest::header::COOKIE, c_val);
        }
    }

    if let Some(sid) = sapisid {
        let auth_val = generate_sapisid_hash(sid, origin);
        if let Ok(a_val) = auth_val.parse() {
            headers.insert(reqwest::header::AUTHORIZATION, a_val);
        }
    }

    let client = reqwest::Client::builder()
        .default_headers(headers.clone())
        .build()
        .map_err(|e| e.to_string())?;

    Ok((client, headers))
}

pub async fn verify_and_save_cookie(raw_cookie: &str) -> Result<UserProfile, String> {
    let sapisid = extract_sapisid(raw_cookie);
    let (client, _) = build_client(raw_cookie, sapisid.as_deref())?;

    let url = "https://music.youtube.com/youtubei/v1/browse";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "browseId": "FEmusic_home"
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Bağlantı hatası: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSON ayrıştırma hatası: {}", e))?;

    let name = Some("Google Hesabım".to_string());
    let mut avatar_url = None;

    if let Some(avatar) = json
        .pointer("/background/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
    {
        avatar_url = Some(avatar.to_string());
    }

    if let Some(av) = json
        .pointer("/topbar/musicAppHeaderRenderer/avatar/thumbnails")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
    {
        avatar_url = Some(av.to_string());
    }

    let profile = UserProfile {
        is_authenticated: true,
        name,
        email: None,
        avatar_url,
    };

    let session = SessionData {
        cookie: raw_cookie.to_string(),
        sapisid,
        profile: Some(profile.clone()),
    };

    save_session_to_file(&session);
    let mut lock = SESSION.lock().unwrap();
    *lock = Some(session);

    Ok(profile)
}

pub fn get_current_user_profile() -> UserProfile {
    let lock = SESSION.lock().unwrap();
    if let Some(session) = lock.as_ref() {
        if let Some(prof) = &session.profile {
            return prof.clone();
        }
    }
    UserProfile {
        is_authenticated: false,
        name: None,
        email: None,
        avatar_url: None,
    }
}

pub fn parse_mrlir_item(mrlir: &serde_json::Value) -> Option<Track> {
    let video_id = mrlir
        .pointer("/playlistItemData/videoId")
        .or_else(|| {
            mrlir.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/navigationEndpoint/watchEndpoint/videoId")
        })
        .or_else(|| {
            mrlir.pointer("/doubleTapEndpoint/watchEndpoint/videoId")
        })
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())?;

    let title = mrlir
        .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown Title")
        .to_string();

    let mut artist = "Unknown Artist".to_string();
    if let Some(runs) = mrlir
        .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .and_then(|v| v.as_array())
    {
        let parts: Vec<&str> = runs
            .iter()
            .filter_map(|r| r.get("text").and_then(|t| t.as_str()))
            .filter(|t| *t != "Song" && *t != " • " && *t != " & " && *t != ", ")
            .collect();
        if !parts.is_empty() {
            artist = parts.join(", ");
        }
    }

    let mut album = None;
    if let Some(runs) = mrlir
        .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .and_then(|v| v.as_array())
    {
        if let Some(al) = runs.first().and_then(|r| r.get("text")).and_then(|t| t.as_str()) {
            album = Some(al.to_string());
        }
    }

    let mut duration = None;
    if let Some(dur) = mrlir
        .pointer("/fixedColumns/0/musicResponsiveListItemFixedColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())
    {
        duration = Some(dur.to_string());
    }

    let thumbnail = mrlir
        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|item| item.get("url"))
        .and_then(|v| v.as_str())
        .map(|v| v.to_string());

    Some(Track {
        id: video_id,
        title,
        artist,
        album,
        duration,
        thumbnail,
    })
}

pub fn collect_tracks_recursive(
    value: &serde_json::Value,
    tracks: &mut Vec<Track>,
    seen: &mut std::collections::HashSet<String>,
) {
    if let Some(obj) = value.as_object() {
        if let Some(mrlir) = obj.get("musicResponsiveListItemRenderer") {
            if let Some(track) = parse_mrlir_item(mrlir) {
                if seen.insert(track.id.clone()) {
                    tracks.push(track);
                }
            }
        }
        for (_, child) in obj {
            collect_tracks_recursive(child, tracks, seen);
        }
    } else if let Some(arr) = value.as_array() {
        for child in arr {
            collect_tracks_recursive(child, tracks, seen);
        }
    }
}

pub fn collect_playlists_recursive(
    value: &serde_json::Value,
    playlists: &mut Vec<Playlist>,
    seen: &mut std::collections::HashSet<String>,
) {
    if let Some(obj) = value.as_object() {
        if let Some(card) = obj.get("musicTwoRowItemRenderer") {
            let browse_id = card
                .pointer("/navigationEndpoint/browseEndpoint/browseId")
                .and_then(|v| v.as_str());
            let title = card
                .pointer("/title/runs/0/text")
                .and_then(|v| v.as_str())
                .unwrap_or("Playlist");
            let subtitle = card
                .pointer("/subtitle/runs/0/text")
                .and_then(|v| v.as_str())
                .map(|v| v.to_string());
            let thumb = card
                .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(|u| u.as_str())
                .map(|v| v.to_string());

            if let Some(b_id) = browse_id {
                if seen.insert(b_id.to_string()) {
                    playlists.push(Playlist {
                        id: b_id.to_string(),
                        title: title.to_string(),
                        description: subtitle,
                        thumbnail: thumb,
                        track_count: None,
                    });
                }
            }
        }
        for (_, child) in obj {
            collect_playlists_recursive(child, playlists, seen);
        }
    } else if let Some(arr) = value.as_array() {
        for child in arr {
            collect_playlists_recursive(child, playlists, seen);
        }
    }
}

pub async fn fetch_liked_songs() -> Result<Vec<Track>, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock
            .as_ref()
            .ok_or_else(|| "Giriş yapılmamış. Lütfen Google hesabınızla giriş yapın.".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let url = "https://music.youtube.com/youtubei/v1/browse";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "browseId": "FEmusic_liked"
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ağ hatası: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Ayrıştırma hatası: {}", e))?;

    let mut tracks = Vec::new();
    let mut seen = std::collections::HashSet::new();
    collect_tracks_recursive(&json, &mut tracks, &mut seen);

    Ok(tracks)
}

pub async fn fetch_user_playlists() -> Result<Vec<Playlist>, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let url = "https://music.youtube.com/youtubei/v1/browse";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "browseId": "FEmusic_library_landing"
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ağ hatası: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Ayrıştırma hatası: {}", e))?;

    let mut playlists = Vec::new();
    let mut seen = std::collections::HashSet::new();

    // Pinned Liked Songs playlist
    playlists.push(Playlist {
        id: "LM".to_string(),
        title: "Liked Songs".to_string(),
        description: Some("YouTube Music".to_string()),
        thumbnail: None,
        track_count: None,
    });
    seen.insert("LM".to_string());
    seen.insert("FEmusic_liked".to_string());

    collect_playlists_recursive(&json, &mut playlists, &mut seen);

    Ok(playlists)
}

pub async fn fetch_playlist_tracks(playlist_id: &str) -> Result<Vec<Track>, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        if let Some(s) = lock.as_ref() {
            (s.cookie.clone(), s.sapisid.clone())
        } else {
            ("".to_string(), None)
        }
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let browse_id = if playlist_id == "LM" {
        "FEmusic_liked".to_string()
    } else if !playlist_id.starts_with("VL") && !playlist_id.starts_with("FEmusic_") {
        format!("VL{}", playlist_id)
    } else {
        playlist_id.to_string()
    };

    let url = "https://music.youtube.com/youtubei/v1/browse";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "browseId": browse_id
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ağ hatası: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Ayrıştırma hatası: {}", e))?;

    let mut tracks = Vec::new();
    let mut seen = std::collections::HashSet::new();
    collect_tracks_recursive(&json, &mut tracks, &mut seen);

    Ok(tracks)
}

pub async fn toggle_like_yt(video_id: &str, like: bool) -> Result<(), String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let endpoint = if like {
        "https://music.youtube.com/youtubei/v1/like/like"
    } else {
        "https://music.youtube.com/youtubei/v1/like/removelike"
    };

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "target": {
            "videoId": video_id
        }
    });

    let res = client
        .post(endpoint)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Beğeni gönderilemedi: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Sunucu yanıtı: {}", res.status()));
    }

    Ok(())
}

pub async fn check_and_sync_cookies(win: &tauri::WebviewWindow) -> Result<UserProfile, String> {
    let cookies = win.cookies().map_err(|e| format!("Çerezler okunamadı: {}", e))?;
    let mut cookie_map = std::collections::HashMap::new();
    for c in cookies {
        cookie_map.insert(c.name().to_string(), c.value().to_string());
    }

    if cookie_map.contains_key("SAPISID") || cookie_map.contains_key("__Secure-1PAPISID") {
        let full_cookie = cookie_map
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("; ");

        let profile = verify_and_save_cookie(&full_cookie).await?;
        return Ok(profile);
    }

    Err("Henüz YouTube Music oturumu algılanmadı.".to_string())
}

pub async fn open_login_webview(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("google_login_window") {
        let _ = win.set_focus();
        return Ok(());
    }

    let url_str = "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fmusic.youtube.com%2F&hl=tr";
    let parsed_url: url::Url = url_str.parse().map_err(|e| format!("{}", e))?;

    let win = WebviewWindowBuilder::new(&app, "google_login_window", WebviewUrl::External(parsed_url))
        .title("Google & YouTube Music Girişi - Tubify")
        .inner_size(540.0, 720.0)
        .center()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .initialization_script("try { delete window.chrome.webview; } catch(e) {}")
        .build()
        .map_err(|e| format!("Giriş penceresi açılamadı: {}", e))?;

    let win_clone = win.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        for _ in 0..180 {
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

            if app_clone.get_webview_window("google_login_window").is_none() {
                break;
            }

            if let Ok(profile) = check_and_sync_cookies(&win_clone).await {
                let _ = app_clone.emit("auth-success", profile);
                let _ = win_clone.close();
                break;
            }
        }
    });

    Ok(())
}
