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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTracksResult {
    pub tracks: Vec<Track>,
    pub continuation: Option<String>,
    pub track_count: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistItem {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub thumbnail: Option<String>,
    pub item_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistDetails {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub subscribers: Option<String>,
    pub thumbnail: Option<String>,
    pub top_tracks: Vec<Track>,
    pub albums: Vec<ArtistItem>,
    pub singles: Vec<ArtistItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumDetails {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub artist_id: Option<String>,
    pub year: Option<String>,
    pub thumbnail: Option<String>,
    pub description: Option<String>,
    pub track_count: Option<String>,
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
    let mut artist_id: Option<String> = None;
    let mut album: Option<String> = None;
    let mut album_id: Option<String> = None;
    let mut duration: Option<String> = None;

    if let Some(runs) = mrlir
        .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .and_then(|v| v.as_array())
    {
        let mut artist_parts: Vec<&str> = Vec::new();
        for r in runs {
            let text = r.get("text").and_then(|t| t.as_str()).unwrap_or("");
            let b_id = r
                .pointer("/navigationEndpoint/browseEndpoint/browseId")
                .and_then(|v| v.as_str());

            if let Some(bid) = b_id {
                if bid.starts_with("UC") || bid.starts_with("FEmusic_artist") {
                    if artist_id.is_none() {
                        artist_id = Some(bid.to_string());
                    }
                } else if bid.starts_with("MPREb_") || bid.starts_with("FEmusic_library_privately_owned_release") || bid.starts_with("OLAK5uy_") {
                    if album_id.is_none() {
                        album_id = Some(bid.to_string());
                        if album.is_none() && !text.is_empty() {
                            album = Some(text.to_string());
                        }
                    }
                }
            }

            if text != "Song" && text != " • " && text != " & " && text != ", " && !text.is_empty() {
                if text.chars().all(|c| c.is_ascii_digit() || c == ':') && text.contains(':') {
                    duration = Some(text.to_string());
                } else if b_id.is_some() && !b_id.unwrap().starts_with("UC") && album.is_none() {
                    album = Some(text.to_string());
                } else if artist_parts.is_empty() || (b_id.is_some() && b_id.unwrap().starts_with("UC")) {
                    artist_parts.push(text);
                }
            }
        }
        if !artist_parts.is_empty() {
            artist = artist_parts.join(", ");
        }
    }

    if let Some(runs) = mrlir
        .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .and_then(|v| v.as_array())
    {
        if let Some(first) = runs.first() {
            if let Some(al) = first.get("text").and_then(|t| t.as_str()) {
                if !al.is_empty() {
                    album = Some(al.to_string());
                }
            }
            if let Some(bid) = first.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|v| v.as_str()) {
                album_id = Some(bid.to_string());
            }
        }
    }

    if duration.is_none() {
        if let Some(dur) = mrlir
            .pointer("/fixedColumns/0/musicResponsiveListItemFixedColumnRenderer/text/runs/0/text")
            .and_then(|v| v.as_str())
        {
            duration = Some(dur.to_string());
        }
    }

    let thumbnail = mrlir
        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|item| item.get("url"))
        .and_then(|v| v.as_str())
        .map(|v| v.to_string());

    let is_explicit = mrlir
        .get("badges")
        .and_then(|b| b.as_array())
        .map(|arr| {
            arr.iter().any(|b| {
                b.pointer("/musicInlineBadgeRenderer/icon/iconType")
                    .and_then(|t| t.as_str())
                    .map(|t| t == "MUSIC_EXPLICIT_BADGE")
                    .unwrap_or(false)
            })
        });

    Some(Track {
        id: video_id,
        title,
        artist,
        artist_id,
        album,
        album_id,
        duration,
        thumbnail,
        is_explicit,
    })
}

pub fn parse_playlist_panel_video_renderer(ppvr: &serde_json::Value) -> Option<Track> {
    let video_id = ppvr.get("videoId").and_then(|v| v.as_str())?.to_string();
    let title = ppvr
        .pointer("/title/runs/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown Title")
        .to_string();

    let duration = ppvr
        .pointer("/lengthText/runs/0/text")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let thumbnail = ppvr
        .pointer("/thumbnail/thumbnails")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|item| item.get("url"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| Some(format!("https://i.ytimg.com/vi/{}/mqdefault.jpg", video_id)));

    let is_explicit = ppvr
        .get("badges")
        .and_then(|b| b.as_array())
        .map(|arr| {
            arr.iter().any(|b| {
                b.pointer("/musicInlineBadgeRenderer/icon/iconType")
                    .and_then(|t| t.as_str())
                    .map(|t| t == "MUSIC_EXPLICIT_BADGE")
                    .unwrap_or(false)
            })
        });

    let mut artist_id: Option<String> = None;
    let mut album: Option<String> = None;
    let mut album_id: Option<String> = None;
    let mut artist_parts: Vec<&str> = Vec::new();

    let runs_opt = ppvr
        .pointer("/longBylineText/runs")
        .or_else(|| ppvr.pointer("/shortBylineText/runs"))
        .and_then(|v| v.as_array());

    if let Some(runs) = runs_opt {
        for r in runs {
            let text = r.get("text").and_then(|t| t.as_str()).unwrap_or("").trim();
            if text.is_empty() || text == "•" || text == "&" || text == "," {
                continue;
            }

            let b_id = r
                .pointer("/navigationEndpoint/browseEndpoint/browseId")
                .and_then(|v| v.as_str());

            if let Some(bid) = b_id {
                if bid.starts_with("UC") || bid.starts_with("FEmusic_artist") {
                    if artist_id.is_none() {
                        artist_id = Some(bid.to_string());
                    }
                    if !artist_parts.contains(&text) {
                        artist_parts.push(text);
                    }
                } else if bid.starts_with("MPREb_")
                    || bid.starts_with("FEmusic_library_privately_owned_release")
                    || bid.starts_with("OLAK5uy_")
                    || bid.starts_with("MP")
                {
                    if album_id.is_none() {
                        album_id = Some(bid.to_string());
                    }
                    if album.is_none() {
                        album = Some(text.to_string());
                    }
                } else {
                    if artist_parts.is_empty() {
                        artist_parts.push(text);
                    }
                }
            } else {
                let is_metric = text.contains("görüntüleme")
                    || text.contains("views")
                    || text.contains("view")
                    || text.contains("beğeni")
                    || text.contains("likes")
                    || text.contains("like");

                if !is_metric {
                    if artist_parts.is_empty() {
                        artist_parts.push(text);
                    } else if album.is_none() && !artist_parts.contains(&text) {
                        album = Some(text.to_string());
                    }
                }
            }
        }
    }

    let artist = if !artist_parts.is_empty() {
        artist_parts.join(", ")
    } else {
        "Unknown Artist".to_string()
    };

    Some(Track {
        id: video_id,
        title,
        artist,
        artist_id,
        album,
        album_id,
        duration,
        thumbnail,
        is_explicit,
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
        } else if let Some(ppvr) = obj.get("playlistPanelVideoRenderer") {
            if let Some(track) = parse_playlist_panel_video_renderer(ppvr) {
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

            let mut track_count = None;
            if let Some(runs) = card.pointer("/subtitle/runs").and_then(|v| v.as_array()) {
                for r in runs {
                    if let Some(text) = r.get("text").and_then(|t| t.as_str()).map(|s| s.trim()) {
                        let t_lower = text.to_lowercase();
                        if (t_lower.contains("şarkı") || t_lower.contains("parça") || t_lower.contains("song") || t_lower.contains("track") || t_lower.contains("video"))
                            && text.chars().any(|c| c.is_ascii_digit()) {
                            track_count = Some(text.to_string());
                            break;
                        }
                    }
                }
            }

            if let Some(b_id) = browse_id {
                let is_liked = b_id == "VLLM" || b_id == "LM" || b_id == "FEmusic_liked" || title.to_lowercase().contains("beğen") || title.to_lowercase().contains("liked");
                if is_liked && track_count.is_some() {
                    if let Some(first_pl) = playlists.first_mut() {
                        if first_pl.id == "LM" || first_pl.id == "liked" {
                            first_pl.track_count = track_count.clone();
                        }
                    }
                }

                if seen.insert(b_id.to_string()) {
                    playlists.push(Playlist {
                        id: b_id.to_string(),
                        title: title.to_string(),
                        description: subtitle,
                        thumbnail: thumb,
                        track_count,
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

pub fn extract_continuation_token(value: &serde_json::Value) -> Option<String> {
    if let Some(token) = value.pointer("/continuationCommand/token").and_then(|v| v.as_str()) {
        if !token.is_empty() {
            return Some(token.to_string());
        }
    }
    if let Some(token) = value.pointer("/nextContinuationData/continuation").and_then(|v| v.as_str()) {
        if !token.is_empty() {
            return Some(token.to_string());
        }
    }

    if let Some(obj) = value.as_object() {
        for (_, child) in obj {
            if let Some(token) = extract_continuation_token(child) {
                return Some(token);
            }
        }
    } else if let Some(arr) = value.as_array() {
        for child in arr {
            if let Some(token) = extract_continuation_token(child) {
                return Some(token);
            }
        }
    }
    None
}

pub async fn fetch_liked_songs() -> Result<Vec<Track>, String> {
    fetch_playlist_tracks("VLLM").await
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

pub async fn fetch_playlist_tracks_page(
    playlist_id: &str,
    continuation_token: Option<&str>,
) -> Result<PlaylistTracksResult, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        if let Some(s) = lock.as_ref() {
            (s.cookie.clone(), s.sapisid.clone())
        } else {
            ("".to_string(), None)
        }
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    // If continuation token is provided, fetch just that continuation page
    if let Some(token) = continuation_token {
        let cont_url = reqwest::Url::parse_with_params(
            "https://music.youtube.com/youtubei/v1/browse",
            &[("continuation", token), ("ctoken", token)],
        ).map_err(|e| e.to_string())?;

        let cont_payload = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "tr",
                    "gl": "TR"
                }
            }
        });

        let res = client
            .post(cont_url)
            .json(&cont_payload)
            .send()
            .await
            .map_err(|e| format!("Ağ hatası: {}", e))?;

        let next_json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| format!("Ayrıştırma hatası: {}", e))?;

        let mut tracks = Vec::new();
        let mut seen = std::collections::HashSet::new();
        collect_tracks_recursive(&next_json, &mut tracks, &mut seen);
        let next_continuation = extract_continuation_token(&next_json);

        return Ok(PlaylistTracksResult {
            tracks,
            continuation: next_continuation,
            track_count: None,
        });
    }

    // Initial browse request
    let browse_id = if playlist_id == "LM" || playlist_id == "liked" {
        "VLLM".to_string()
    } else if playlist_id.starts_with("VL")
        || playlist_id.starts_with("FEmusic_")
        || playlist_id.starts_with("MPREb_")
        || playlist_id.starts_with("OLAK5uy_")
    {
        playlist_id.to_string()
    } else {
        format!("VL{}", playlist_id)
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

    let next_continuation = extract_continuation_token(&json);

    // Extract total track count from playlist header
    let mut track_count = None;
    let header_opt = json.pointer("/header/musicResponsiveHeaderRenderer")
        .or_else(|| json.pointer("/header/musicDetailHeaderRenderer"))
        .or_else(|| json.pointer("/header/musicEditablePlaylistDetailHeaderRenderer/header/musicResponsiveHeaderRenderer"))
        .or_else(|| json.pointer("/header/musicEditablePlaylistDetailHeaderRenderer/header/musicDetailHeaderRenderer"))
        .or_else(|| json.pointer("/contents/twoColumnBrowseResultsRenderer/header/musicResponsiveHeaderRenderer"))
        .or_else(|| json.pointer("/contents/twoColumnBrowseResultsRenderer/header/musicDetailHeaderRenderer"))
        .or_else(|| find_renderer(&json, &["musicResponsiveHeaderRenderer", "musicDetailHeaderRenderer", "musicEditablePlaylistDetailHeaderRenderer"]));

    if let Some(header) = header_opt {
        let mut runs = Vec::new();
        if let Some(arr) = header.pointer("/secondSubtitle/runs").and_then(|v| v.as_array()) {
            runs.extend(arr.iter());
        }
        if let Some(arr) = header.pointer("/subtitle/runs").and_then(|v| v.as_array()) {
            runs.extend(arr.iter());
        }
        for r in runs {
            if let Some(text) = r.get("text").and_then(|t| t.as_str()).map(|s| s.trim()) {
                let t_lower = text.to_lowercase();
                if (t_lower.contains("şarkı") || t_lower.contains("parça") || t_lower.contains("song") || t_lower.contains("track") || t_lower.contains("video"))
                    && text.chars().any(|c| c.is_ascii_digit()) {
                    track_count = Some(text.to_string());
                    break;
                }
            }
        }
    }

    Ok(PlaylistTracksResult {
        tracks,
        continuation: next_continuation,
        track_count,
    })
}

pub async fn fetch_playlist_tracks(playlist_id: &str) -> Result<Vec<Track>, String> {
    let result = fetch_playlist_tracks_page(playlist_id, None).await?;
    Ok(result.tracks)
}

pub async fn fetch_artist_details(browse_id: &str) -> Result<ArtistDetails, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        if let Some(s) = lock.as_ref() {
            (s.cookie.clone(), s.sapisid.clone())
        } else {
            ("".to_string(), None)
        }
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

    let mut name = "Sanatçı".to_string();
    let mut description = None;
    let mut subscribers = None;
    let mut thumbnail = None;

    if let Some(header) = json.get("header").and_then(|h| h.get("musicImmersiveHeaderRenderer").or_else(|| h.get("musicVisualHeaderRenderer"))) {
        if let Some(n) = header.pointer("/title/runs/0/text").and_then(|v| v.as_str()) {
            name = n.to_string();
        }
        if let Some(d) = header.pointer("/description/runs/0/text").and_then(|v| v.as_str()) {
            description = Some(d.to_string());
        }
        if let Some(sub) = header.pointer("/subscriptionButton/subscribeButtonRenderer/subscriberCountText/runs/0/text").and_then(|v| v.as_str()) {
            subscribers = Some(sub.to_string());
        }
        if let Some(thumb) = header.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|u| u.as_str()) {
            thumbnail = Some(thumb.to_string());
        }
    }

    let mut top_tracks = Vec::new();
    let mut albums = Vec::new();
    let mut singles = Vec::new();
    let mut seen_tracks = std::collections::HashSet::new();

    if let Some(sections) = json.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|v| v.as_array()) {
        for sec in sections {
            if let Some(shelf) = sec.get("musicShelfRenderer") {
                if let Some(items) = shelf.get("contents").and_then(|v| v.as_array()) {
                    for it in items {
                        if let Some(mrlir) = it.get("musicResponsiveListItemRenderer") {
                            if let Some(track) = parse_mrlir_item(mrlir) {
                                if seen_tracks.insert(track.id.clone()) {
                                    top_tracks.push(track);
                                }
                            }
                        }
                    }
                }
            }

            if let Some(carousel) = sec.get("musicCarouselShelfRenderer") {
                let sec_title = carousel.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_lowercase();
                let is_single = sec_title.contains("single") || sec_title.contains("ep") || sec_title.contains("tekli");

                if let Some(items) = carousel.get("contents").and_then(|v| v.as_array()) {
                    for it in items {
                        if let Some(card) = it.get("musicTwoRowItemRenderer") {
                            let b_id = card.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|v| v.as_str());
                            let item_title = card.pointer("/title/runs/0/text").and_then(|v| v.as_str()).unwrap_or("Album");
                            let mut item_sub = None;
                            if let Some(runs) = card.pointer("/subtitle/runs").and_then(|v| v.as_array()) {
                                let parts: Vec<&str> = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).collect();
                                if !parts.is_empty() {
                                    item_sub = Some(parts.join(" • "));
                                }
                            }
                            let item_thumb = card.pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
                                .and_then(|v| v.as_array())
                                .and_then(|arr| arr.last())
                                .and_then(|t| t.get("url"))
                                .and_then(|u| u.as_str())
                                .map(|s| s.to_string());

                            if let Some(id) = b_id {
                                let item = ArtistItem {
                                    id: id.to_string(),
                                    title: item_title.to_string(),
                                    subtitle: item_sub,
                                    thumbnail: item_thumb,
                                    item_type: if is_single { "single".to_string() } else { "album".to_string() },
                                };
                                if is_single {
                                    singles.push(item);
                                } else {
                                    albums.push(item);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if top_tracks.is_empty() {
        collect_tracks_recursive(&json, &mut top_tracks, &mut seen_tracks);
    }

    Ok(ArtistDetails {
        id: browse_id.to_string(),
        name,
        description,
        subscribers,
        thumbnail,
        top_tracks,
        albums,
        singles,
    })
}

fn find_renderer<'a>(value: &'a serde_json::Value, names: &[&str]) -> Option<&'a serde_json::Value> {
    if let Some(obj) = value.as_object() {
        for &name in names {
            if let Some(v) = obj.get(name) {
                return Some(v);
            }
        }
        for (_, child) in obj {
            if let Some(found) = find_renderer(child, names) {
                return Some(found);
            }
        }
    } else if let Some(arr) = value.as_array() {
        for child in arr {
            if let Some(found) = find_renderer(child, names) {
                return Some(found);
            }
        }
    }
    None
}

pub async fn fetch_album_details(browse_id: &str) -> Result<AlbumDetails, String> {
    let clean_browse_id = if browse_id.starts_with("VL") && (browse_id.contains("MPREb_") || browse_id.contains("OLAK5uy_")) {
        &browse_id[2..]
    } else {
        browse_id
    };

    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        if let Some(s) = lock.as_ref() {
            (s.cookie.clone(), s.sapisid.clone())
        } else {
            ("".to_string(), None)
        }
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
        "browseId": clean_browse_id
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

    let mut title = "Albüm".to_string();
    let mut artist = "Unknown Artist".to_string();
    let mut artist_id: Option<String> = None;
    let mut year: Option<String> = None;
    let mut thumbnail: Option<String> = None;
    let mut description: Option<String> = None;
    let mut track_count: Option<String> = None;

    let header_opt = json.pointer("/header/musicResponsiveHeaderRenderer")
        .or_else(|| json.pointer("/header/musicDetailHeaderRenderer"))
        .or_else(|| json.pointer("/contents/twoColumnBrowseResultsRenderer/header/musicResponsiveHeaderRenderer"))
        .or_else(|| json.pointer("/contents/twoColumnBrowseResultsRenderer/header/musicDetailHeaderRenderer"))
        .or_else(|| find_renderer(&json, &["musicResponsiveHeaderRenderer", "musicDetailHeaderRenderer"]));

    if let Some(header) = header_opt {
        // Title
        if let Some(t) = header.pointer("/title/runs/0/text")
            .or_else(|| header.pointer("/title/simpleText"))
            .and_then(|v| v.as_str()) {
            if !t.is_empty() {
                title = t.to_string();
            }
        }

        // Artist & Artist ID from straplineTextOne
        if let Some(runs) = header.pointer("/straplineTextOne/runs").and_then(|v| v.as_array()) {
            let mut parts = Vec::new();
            for r in runs {
                let text = r.get("text").and_then(|t| t.as_str()).unwrap_or("").trim();
                let b_id = r.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|v| v.as_str());
                if let Some(bid) = b_id {
                    if bid.starts_with("UC") || bid.starts_with("FEmusic_artist") {
                        if artist_id.is_none() {
                            artist_id = Some(bid.to_string());
                        }
                    }
                }
                if !text.is_empty() && text != " • " && text != " & " && text != ", " {
                    parts.push(text);
                }
            }
            if !parts.is_empty() {
                artist = parts.join(", ");
            }
        }

        // Subtitle & SecondSubtitle fallback for Artist, Year, Track Count
        let mut sub_runs = Vec::new();
        if let Some(arr) = header.pointer("/subtitle/runs").and_then(|v| v.as_array()) {
            sub_runs.extend(arr.iter());
        }
        if let Some(arr) = header.pointer("/secondSubtitle/runs").and_then(|v| v.as_array()) {
            sub_runs.extend(arr.iter());
        }

        for r in sub_runs {
            let text = r.get("text").and_then(|t| t.as_str()).unwrap_or("").trim();
            let b_id = r.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|v| v.as_str());

            if let Some(bid) = b_id {
                if bid.starts_with("UC") || bid.starts_with("FEmusic_artist") {
                    if artist_id.is_none() {
                        artist_id = Some(bid.to_string());
                    }
                    if artist == "Unknown Artist" && !text.is_empty() {
                        artist = text.to_string();
                    }
                }
            }

            if year.is_none() && text.len() == 4 && text.chars().all(|c| c.is_ascii_digit()) {
                year = Some(text.to_string());
            } else if track_count.is_none() && (text.contains("şarkı") || text.contains("parça") || text.contains("song") || text.contains("track")) {
                track_count = Some(text.to_string());
            }
        }

        // Thumbnail from header
        let get_last_thumb = |val: &serde_json::Value| -> Option<String> {
            if let Some(arr) = val.as_array() {
                arr.last()
                    .and_then(|t| t.get("url"))
                    .and_then(|u| u.as_str())
                    .map(|s| s.to_string())
            } else {
                None
            }
        };

        thumbnail = header.pointer("/thumbnail/musicResponsiveHeaderThumbnailRenderer/thumbnail/thumbnails").and_then(get_last_thumb)
            .or_else(|| header.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails").and_then(get_last_thumb))
            .or_else(|| header.pointer("/thumbnail/croppedSquareThumbnailRenderer/thumbnail/thumbnails").and_then(get_last_thumb))
            .or_else(|| header.pointer("/straplineThumbnail/musicThumbnailRenderer/thumbnail/thumbnails").and_then(get_last_thumb))
            .or_else(|| header.pointer("/thumbnails").and_then(get_last_thumb));

        // Description
        if let Some(d) = header.pointer("/description/musicDescriptionShelfRenderer/description/runs/0/text")
            .or_else(|| header.pointer("/description/runs/0/text"))
            .or_else(|| header.pointer("/description/simpleText"))
            .and_then(|v| v.as_str()) {
            description = Some(d.to_string());
        }
    }

    // Microformat Fallback (for Title, Artist, Thumbnail, Description)
    if let Some(mf) = json.pointer("/microformat/microformatDataRenderer") {
        if title == "Albüm" || title.is_empty() {
            if let Some(mf_title) = mf.get("title").and_then(|v| v.as_str()) {
                if let Some(idx) = mf_title.find(" - Album by ") {
                    title = mf_title[..idx].trim().to_string();
                    if artist == "Unknown Artist" {
                        artist = mf_title[idx + 12..].trim().to_string();
                    }
                } else if let Some(idx) = mf_title.find(" - Albüm - ") {
                    title = mf_title[..idx].trim().to_string();
                    if artist == "Unknown Artist" {
                        artist = mf_title[idx + 11..].trim().to_string();
                    }
                } else {
                    title = mf_title.to_string();
                }
            }
        }

        if artist == "Unknown Artist" {
            if let Some(owner) = mf.pointer("/pageOwnerDetails/name").and_then(|v| v.as_str()) {
                if !owner.is_empty() {
                    artist = owner.to_string();
                }
            }
        }

        if artist_id.is_none() {
            if let Some(ext_id) = mf.pointer("/pageOwnerDetails/externalChannelId").and_then(|v| v.as_str()) {
                if !ext_id.is_empty() {
                    artist_id = Some(ext_id.to_string());
                }
            }
        }

        if thumbnail.is_none() {
            if let Some(arr) = mf.pointer("/thumbnail/thumbnails").and_then(|v| v.as_array()) {
                thumbnail = arr.last().and_then(|t| t.get("url")).and_then(|u| u.as_str()).map(|s| s.to_string());
            }
        }

        if description.is_none() {
            if let Some(d) = mf.get("description").and_then(|v| v.as_str()) {
                if !d.is_empty() {
                    description = Some(d.to_string());
                }
            }
        }
    }

    // Collect tracks recursively
    let mut tracks = Vec::new();
    let mut seen = std::collections::HashSet::new();
    collect_tracks_recursive(&json, &mut tracks, &mut seen);

    // If album thumbnail still missing, fallback to first track thumbnail
    if thumbnail.is_none() {
        thumbnail = tracks.iter().find_map(|t| t.thumbnail.clone());
    }

    // Inheritance: ensure each track receives the album artist, album title, album_id, and thumbnail
    for t in &mut tracks {
        if t.album.is_none() || t.album.as_deref() == Some("Albüm") {
            t.album = Some(title.clone());
        }
        if t.album_id.is_none() {
            t.album_id = Some(clean_browse_id.to_string());
        }
        if t.thumbnail.is_none() || t.thumbnail.as_deref() == Some("") {
            t.thumbnail = thumbnail.clone();
        }
        if (t.artist == "Unknown Artist" || t.artist.trim().is_empty()) && artist != "Unknown Artist" {
            t.artist = artist.clone();
        }
        if t.artist_id.is_none() && artist_id.is_some() {
            t.artist_id = artist_id.clone();
        }
    }

    if track_count.is_none() && !tracks.is_empty() {
        track_count = Some(format!("{} şarkı", tracks.len()));
    }

    Ok(AlbumDetails {
        id: clean_browse_id.to_string(),
        title,
        artist,
        artist_id,
        year,
        thumbnail,
        description,
        track_count,
        tracks,
    })
}

pub async fn fetch_radio_tracks(video_id: &str) -> Result<Vec<Track>, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        if let Some(s) = lock.as_ref() {
            (s.cookie.clone(), s.sapisid.clone())
        } else {
            ("".to_string(), None)
        }
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let url = "https://music.youtube.com/youtubei/v1/next";
    let playlist_id = format!("RDAMVM{}", video_id);
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "videoId": video_id,
        "playlistId": playlist_id,
        "isAudioOnly": true
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

pub async fn create_playlist(
    title: &str,
    description: Option<&str>,
    privacy_status: Option<&str>,
) -> Result<String, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let url = "https://music.youtube.com/youtubei/v1/playlist/create";
    let privacy = privacy_status.unwrap_or("PUBLIC");
    let mut payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "title": title,
        "privacyStatus": privacy
    });

    if let Some(desc) = description {
        if !desc.trim().is_empty() {
            payload["description"] = serde_json::Value::String(desc.to_string());
        }
    }

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("İstek gönderilemedi: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Çalma listesi oluşturulamadı: {}", err_text));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSON ayrıştırılamadı: {}", e))?;

    if let Some(pid) = json.get("playlistId").and_then(|v| v.as_str()) {
        return Ok(pid.to_string());
    }

    if let Some(pid) = json.pointer("/playlistId").and_then(|v| v.as_str()) {
        return Ok(pid.to_string());
    }

    Err("Sunucudan çalma listesi kimliği (playlistId) alınamadı".to_string())
}

pub async fn delete_playlist(playlist_id: &str) -> Result<(), String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);
    let url = "https://music.youtube.com/youtubei/v1/playlist/delete";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "playlistId": clean_id
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Silme isteği gönderilemedi: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Silme işlemi başarısız: {}", err_text));
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
