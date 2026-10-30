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
pub struct HomeItem {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub thumbnail: Option<String>,
    pub item_type: String, // "album" | "playlist" | "track" | "radio"
    pub aspect_ratio: Option<String>, // "1:1" | "16:9"
    pub explicit: bool,
    pub video_id: Option<String>,
    pub playlist_id: Option<String>,
    pub browse_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeSection {
    pub title: String,
    pub strapline: Option<String>,
    pub items: Vec<HomeItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeFeedResult {
    pub sections: Vec<HomeSection>,
    pub continuation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTracksResult {
    pub tracks: Vec<Track>,
    #[serde(default)]
    pub suggestions: Vec<Track>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredAccount {
    pub id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub cookie: String,
    pub sapisid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionData {
    pub active_account_id: Option<String>,
    #[serde(default)]
    pub accounts: Vec<StoredAccount>,
    #[serde(default)]
    pub cookie: String,
    #[serde(default)]
    pub sapisid: Option<String>,
    #[serde(default)]
    pub profile: Option<UserProfile>,
}

impl SessionData {
    pub fn get_active_account(&self) -> Option<&StoredAccount> {
        if let Some(ref active_id) = self.active_account_id {
            if let Some(acc) = self.accounts.iter().find(|a| &a.id == active_id) {
                return Some(acc);
            }
        }
        self.accounts.first()
    }

    pub fn get_active_account_mut(&mut self) -> Option<&mut StoredAccount> {
        if let Some(ref active_id) = self.active_account_id {
            if let Some(pos) = self.accounts.iter().position(|a| &a.id == active_id) {
                return self.accounts.get_mut(pos);
            }
        }
        self.accounts.first_mut()
    }

    pub fn sync_legacy_fields(&mut self) {
        if let Some(active) = self.get_active_account().cloned() {
            self.cookie = active.cookie.clone();
            self.sapisid = active.sapisid.clone();
            self.profile = Some(UserProfile {
                is_authenticated: true,
                name: active.name.clone(),
                email: active.email.clone(),
                avatar_url: active.avatar_url.clone(),
            });
            if self.active_account_id.is_none() {
                self.active_account_id = Some(active.id.clone());
            }
        } else {
            self.cookie = String::new();
            self.sapisid = None;
            self.profile = Some(UserProfile {
                is_authenticated: false,
                name: None,
                email: None,
                avatar_url: None,
            });
            self.active_account_id = None;
        }
    }
}

// Global thread-safe session store
pub static SESSION: Mutex<Option<SessionData>> = Mutex::new(None);

pub fn get_session_file_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(path) = std::env::current_dir() {
        paths.push(path.join("tubify_session.json"));
        paths.push(path.join("src-tauri").join("tubify_session.json"));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        paths.push(PathBuf::from(appdata).join("com.tubify.music").join("tubify_session.json"));
    }
    paths.push(PathBuf::from("tubify_session.json"));
    paths
}

fn get_session_file_path() -> PathBuf {
    for p in get_session_file_paths() {
        if p.exists() {
            return p;
        }
    }
    if let Ok(path) = std::env::current_dir() {
        return path.join("tubify_session.json");
    }
    PathBuf::from("tubify_session.json")
}

pub fn load_saved_session() {
    let file = get_session_file_path();
    if file.exists() {
        if let Ok(content) = fs::read_to_string(&file) {
            if let Ok(mut data) = serde_json::from_str::<SessionData>(&content) {
                if data.accounts.is_empty() {
                    let raw_cookie = data.cookie.clone();
                    let is_auth = data.profile.as_ref().map_or(false, |p| p.is_authenticated);
                    if !raw_cookie.trim().is_empty() && is_auth {
                        let prof = data.profile.clone().unwrap_or(UserProfile {
                            is_authenticated: true,
                            name: None,
                            email: None,
                            avatar_url: None,
                        });
                        let acc_id = prof.email.clone().unwrap_or_else(|| {
                            format!("acc_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis())
                        });
                        data.accounts.push(StoredAccount {
                            id: acc_id.clone(),
                            name: prof.name,
                            email: prof.email,
                            avatar_url: prof.avatar_url,
                            cookie: raw_cookie,
                            sapisid: data.sapisid.clone(),
                        });
                        data.active_account_id = Some(acc_id);
                    }
                }

                if data.accounts.is_empty() {
                    let mut lock = SESSION.lock().unwrap();
                    *lock = None;
                    return;
                }

                if data.active_account_id.is_none() || !data.accounts.iter().any(|a| Some(&a.id) == data.active_account_id.as_ref()) {
                    data.active_account_id = data.accounts.first().map(|a| a.id.clone());
                }

                data.sync_legacy_fields();

                let should_refresh = match data.get_active_account() {
                    Some(a) => a.avatar_url.as_ref().map_or(true, |u| u.contains("=w1500-h844-") || u.is_empty()),
                    None => false,
                };
                let raw_cookie = data.get_active_account().map(|a| a.cookie.clone()).unwrap_or_default();

                {
                    let mut lock = SESSION.lock().unwrap();
                    *lock = Some(data);
                }

                if should_refresh && !raw_cookie.is_empty() {
                    tauri::async_runtime::spawn(async move {
                        let _ = verify_and_save_cookie(&raw_cookie).await;
                    });
                }
            }
        }
    }
}

pub fn save_session_to_file(data: &SessionData) {
    let mut to_save = data.clone();
    to_save.sync_legacy_fields();
    if let Ok(json) = serde_json::to_string_pretty(&to_save) {
        let file = get_session_file_path();
        let _ = fs::write(&file, &json);
        if let Ok(path) = std::env::current_dir() {
            let root_f = path.join("tubify_session.json");
            let src_f = path.join("src-tauri").join("tubify_session.json");
            if root_f != file {
                let _ = fs::write(root_f, &json);
            }
            if src_f != file {
                let _ = fs::write(src_f, &json);
            }
        }
    }
}

pub fn clear_session_file() {
    for p in get_session_file_paths() {
        if p.exists() {
            let _ = fs::remove_file(p);
        }
    }
    let mut lock = SESSION.lock().unwrap();
    *lock = None;
}

pub fn get_session_info() -> Option<(String, Option<String>)> {
    let lock = SESSION.lock().ok()?;
    let session = lock.as_ref()?;
    let active = session.get_active_account()?;
    if active.cookie.trim().is_empty() {
        return None;
    }
    Some((active.cookie.clone(), active.sapisid.clone()))
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

pub fn build_client(cookie: &str, sapisid: Option<&str>) -> Result<(reqwest::Client, reqwest::header::HeaderMap), String> {
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

pub async fn fetch_account_profile(client: &reqwest::Client) -> (Option<String>, Option<String>, Option<String>, bool) {
    let url = "https://music.youtube.com/youtubei/v1/account/account_menu";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        }
    });

    if let Ok(res) = client.post(url).json(&payload).send().await {
        if let Ok(json) = res.json::<serde_json::Value>().await {
            let is_logged_in = json.pointer("/responseContext/serviceTrackingParams")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter().any(|service| {
                        service.get("params")
                            .and_then(|p| p.as_array())
                            .map(|params| {
                                params.iter().any(|param| {
                                    param.get("key").and_then(|k| k.as_str()) == Some("logged_in")
                                        && param.get("value").and_then(|v| v.as_str()) == Some("1")
                                })
                            })
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false);

            let header = json.pointer("/actions/0/openPopupAction/popup/multiPageMenuRenderer/header/activeAccountHeaderRenderer");
            if let Some(h) = header {
                let name = h.pointer("/accountName/runs/0/text")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let avatar = h.pointer("/accountPhoto/thumbnails")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|t| t.get("url"))
                    .and_then(|u| u.as_str())
                    .map(|s| s.to_string());

                let handle = h.pointer("/channelHandle/runs/0/text")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                return (name, avatar, handle, true);
            }
            return (None, None, None, is_logged_in);
        }
    }
    (None, None, None, false)
}

pub async fn verify_and_save_cookie(raw_cookie: &str) -> Result<UserProfile, String> {
    let sapisid = extract_sapisid(raw_cookie);
    let (client, _) = build_client(raw_cookie, sapisid.as_deref())?;

    let (acct_name, acct_avatar, acct_handle, is_logged_in) = fetch_account_profile(&client).await;

    if !is_logged_in && acct_name.is_none() && acct_avatar.is_none() {
        return Err("Google oturumu geçerli değil veya süresi dolmuş.".to_string());
    }

    let name = acct_name.or_else(|| Some("Google Hesabım".to_string()));
    let mut avatar_url = acct_avatar;
    let email = acct_handle;

    if avatar_url.is_none() {
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

        if let Ok(res) = client.post(url).json(&payload).send().await {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(av) = json
                    .pointer("/topbar/musicAppHeaderRenderer/avatar/thumbnails")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|t| t.get("url"))
                    .and_then(|u| u.as_str())
                {
                    avatar_url = Some(av.to_string());
                }
            }
        }
    }

    let profile = UserProfile {
        is_authenticated: true,
        name: name.clone(),
        email: email.clone(),
        avatar_url: avatar_url.clone(),
    };

    let mut lock = SESSION.lock().unwrap();
    let mut session = lock.take().unwrap_or_default();

    let existing_idx = session.accounts.iter().position(|a| {
        if let (Some(ref e1), Some(ref e2)) = (&a.email, &email) {
            if !e1.is_empty() && !e2.is_empty() {
                return e1 == e2;
            }
        }
        if let (Some(ref n1), Some(ref n2)) = (&a.name, &name) {
            return n1 == n2;
        }
        false
    });

    let target_id = if let Some(idx) = existing_idx {
        let acc = &mut session.accounts[idx];
        acc.cookie = raw_cookie.to_string();
        acc.sapisid = sapisid.clone();
        acc.name = name;
        acc.email = email;
        acc.avatar_url = avatar_url;
        acc.id.clone()
    } else {
        let new_id = email.clone().unwrap_or_else(|| {
            format!("acc_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis())
        });
        session.accounts.push(StoredAccount {
            id: new_id.clone(),
            name,
            email,
            avatar_url,
            cookie: raw_cookie.to_string(),
            sapisid,
        });
        new_id
    };

    session.active_account_id = Some(target_id);
    session.sync_legacy_fields();
    save_session_to_file(&session);
    *lock = Some(session);

    Ok(profile)
}

pub fn get_current_user_profile() -> UserProfile {
    let lock = SESSION.lock().unwrap();
    if let Some(session) = lock.as_ref() {
        if let Some(active) = session.get_active_account() {
            return UserProfile {
                is_authenticated: true,
                name: active.name.clone(),
                email: active.email.clone(),
                avatar_url: active.avatar_url.clone(),
            };
        }
    }
    UserProfile {
        is_authenticated: false,
        name: None,
        email: None,
        avatar_url: None,
    }
}

pub fn get_all_accounts() -> Vec<AccountInfo> {
    let lock = SESSION.lock().unwrap();
    if let Some(session) = lock.as_ref() {
        let active_id = session.active_account_id.as_ref();
        return session.accounts.iter().map(|acc| {
            AccountInfo {
                id: acc.id.clone(),
                name: acc.name.clone(),
                email: acc.email.clone(),
                avatar_url: acc.avatar_url.clone(),
                is_active: active_id == Some(&acc.id),
            }
        }).collect();
    }
    Vec::new()
}

pub fn switch_account(account_id: &str) -> Result<UserProfile, String> {
    let mut lock = SESSION.lock().unwrap();
    let session = lock.as_mut().ok_or_else(|| "Oturum bulunamadı".to_string())?;

    if !session.accounts.iter().any(|a| a.id == account_id) {
        return Err("Hesap bulunamadı".to_string());
    }

    session.active_account_id = Some(account_id.to_string());
    session.sync_legacy_fields();
    let profile = UserProfile {
        is_authenticated: true,
        name: session.get_active_account().and_then(|a| a.name.clone()),
        email: session.get_active_account().and_then(|a| a.email.clone()),
        avatar_url: session.get_active_account().and_then(|a| a.avatar_url.clone()),
    };
    save_session_to_file(session);
    Ok(profile)
}

pub fn remove_account(account_id: &str) -> Result<Option<UserProfile>, String> {
    let mut lock = SESSION.lock().unwrap();
    let session = lock.as_mut().ok_or_else(|| "Oturum bulunamadı".to_string())?;

    let pos = session.accounts.iter().position(|a| a.id == account_id);
    if let Some(idx) = pos {
        session.accounts.remove(idx);
    } else {
        return Err("Hesap bulunamadı".to_string());
    }

    if session.accounts.is_empty() {
        session.active_account_id = None;
        session.sync_legacy_fields();
        let empty_session = session.clone();
        save_session_to_file(&empty_session);
        *lock = None;
        clear_session_file();
        return Ok(None);
    }

    if session.active_account_id.as_deref() == Some(account_id) {
        session.active_account_id = session.accounts.first().map(|a| a.id.clone());
    }
    session.sync_legacy_fields();
    save_session_to_file(session);

    let active_profile = session.get_active_account().map(|a| UserProfile {
        is_authenticated: true,
        name: a.name.clone(),
        email: a.email.clone(),
        avatar_url: a.avatar_url.clone(),
    });

    Ok(active_profile)
}

pub fn logout_google() -> Result<(), String> {
    let active_id = {
        let lock = SESSION.lock().unwrap();
        lock.as_ref().and_then(|s| s.active_account_id.clone())
    };
    if let Some(id) = active_id {
        let _ = remove_account(&id);
    } else {
        clear_session_file();
    }
    Ok(())
}

fn is_play_count_metric(text: &str, accessibility: &str) -> bool {
    let lower_t = text.to_lowercase();
    let lower_a = accessibility.to_lowercase();

    lower_t.contains("dinlenme")
        || lower_t.contains("plays")
        || lower_t.contains("play")
        || lower_t.contains("görüntüleme")
        || lower_t.contains("views")
        || lower_t.contains("view")
        || lower_t.contains("wiedergaben")
        || lower_t.contains("écoutes")
        || lower_t.contains("vues")
        || lower_t.contains("reproducciones")
        || lower_t.contains("visualizzazioni")
        || lower_a.contains("dinlenme")
        || lower_a.contains("plays")
        || lower_a.contains("play")
        || lower_a.contains("görüntüleme")
        || lower_a.contains("views")
        || lower_a.contains("view")
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
    let mut plays: Option<String> = None;

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

            if crate::search::is_media_type_indicator(text) || crate::search::is_separator_or_empty(text) {
                continue;
            }

            if text != " • " && text != " & " && text != ", " && !text.is_empty() {
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

    if let Some(flex_cols) = mrlir.get("flexColumns").and_then(|v| v.as_array()) {
        for (idx, col) in flex_cols.iter().enumerate() {
            if idx <= 1 {
                continue;
            }

            let label = col
                .pointer("/musicResponsiveListItemFlexColumnRenderer/text/accessibility/accessibilityData/label")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let runs = col
                .pointer("/musicResponsiveListItemFlexColumnRenderer/text/runs")
                .and_then(|v| v.as_array());

            let col_text = if let Some(runs) = runs {
                runs.iter()
                    .filter_map(|r| r.get("text").and_then(|t| t.as_str()))
                    .collect::<Vec<_>>()
                    .join("")
                    .replace('\u{00a0}', " ")
                    .trim()
                    .to_string()
            } else {
                col.pointer("/musicResponsiveListItemFlexColumnRenderer/text/simpleText")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .replace('\u{00a0}', " ")
                    .trim()
                    .to_string()
            };

            if col_text.is_empty() {
                continue;
            }

            let b_id = runs.and_then(|r| r.first()).and_then(|r| {
                r.pointer("/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str())
            });

            if is_play_count_metric(&col_text, label) {
                if plays.is_none() {
                    plays = Some(col_text);
                }
            } else if let Some(bid) = b_id {
                if bid.starts_with("MPREb_")
                    || bid.starts_with("FEmusic_library_privately_owned_release")
                    || bid.starts_with("OLAK5uy_")
                    || bid.starts_with("MP")
                {
                    album_id = Some(bid.to_string());
                    if album.is_none() {
                        album = Some(col_text);
                    }
                }
            } else if album.is_none() {
                album = Some(col_text);
            }
        }
    }

    if let Some(fixed_cols) = mrlir.get("fixedColumns").and_then(|v| v.as_array()) {
        for col in fixed_cols {
            let label = col
                .pointer("/musicResponsiveListItemFixedColumnRenderer/text/accessibility/accessibilityData/label")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let text = col
                .pointer("/musicResponsiveListItemFixedColumnRenderer/text/runs/0/text")
                .or_else(|| col.pointer("/musicResponsiveListItemFixedColumnRenderer/text/simpleText"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .replace('\u{00a0}', " ")
                .trim()
                .to_string();

            if text.is_empty() {
                continue;
            }

            if text.contains(':') && duration.is_none() {
                duration = Some(text);
            } else if is_play_count_metric(&text, label) && plays.is_none() {
                plays = Some(text);
            }
        }
    }

    if plays.is_none() {
        if let Some(p) = mrlir.pointer("/playCount/simpleText")
            .or_else(|| mrlir.pointer("/playCount/runs/0/text"))
            .or_else(|| mrlir.pointer("/views/simpleText"))
            .or_else(|| mrlir.pointer("/views/runs/0/text"))
            .or_else(|| mrlir.pointer("/shortViewCount/simpleText"))
            .or_else(|| mrlir.pointer("/shortViewCount/runs/0/text"))
            .and_then(|v| v.as_str())
        {
            plays = Some(p.replace('\u{00a0}', " ").trim().to_string());
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

    let set_video_id = mrlir
        .pointer("/playlistItemData/playlistSetVideoId")
        .and_then(|v| v.as_str())
        .map(|v| v.to_string());

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
        set_video_id,
        plays,
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
    let mut plays: Option<String> = None;
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
                    || text.contains("like")
                    || text.contains("dinlenme")
                    || text.contains("plays")
                    || text.contains("play");

                if is_metric {
                    if (text.contains("dinlenme") || text.contains("plays") || text.contains("görüntüleme") || text.contains("views")) && plays.is_none() {
                        plays = Some(text.to_string());
                    }
                } else {
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
        set_video_id: None,
        plays,
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
                .or_else(|| card.pointer("/thumbnailRenderer/croppedSquareThumbnailRenderer/thumbnail/thumbnails"))
                .or_else(|| card.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails"))
                .or_else(|| card.pointer("/thumbnail/thumbnails"))
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

fn parse_number_from_track_count(text: &str) -> Option<usize> {
    let digits: String = text
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.' || *c == ',' || *c == ' ')
        .filter(|c| c.is_ascii_digit())
        .collect();
    digits.parse::<usize>().ok()
}

fn collect_suggestions_recursive(
    value: &serde_json::Value,
    suggestions: &mut Vec<Track>,
    seen_suggestions: &mut std::collections::HashSet<String>,
    seen_tracks: &std::collections::HashSet<String>,
) {
    if let Some(obj) = value.as_object() {
        if let Some(msr) = obj.get("musicShelfRenderer") {
            let mut shelf_tracks = Vec::new();
            let mut shelf_seen = std::collections::HashSet::new();
            collect_tracks_recursive(msr, &mut shelf_tracks, &mut shelf_seen);
            for t in shelf_tracks {
                if !seen_tracks.contains(&t.id) && seen_suggestions.insert(t.id.clone()) {
                    suggestions.push(t);
                }
            }
            return;
        }
        for (_, child) in obj {
            collect_suggestions_recursive(child, suggestions, seen_suggestions, seen_tracks);
        }
    } else if let Some(arr) = value.as_array() {
        for child in arr {
            collect_suggestions_recursive(child, suggestions, seen_suggestions, seen_tracks);
        }
    }
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
            suggestions: Vec::new(),
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
    let mut seen_tracks = std::collections::HashSet::new();
    let mut seen_suggestions = std::collections::HashSet::new();

    let (next_continuation, mut suggestions) = if let Some(playlist_shelf) = find_renderer(&json, &["musicPlaylistShelfRenderer"]) {
        collect_tracks_recursive(playlist_shelf, &mut tracks, &mut seen_tracks);
        let cont = extract_continuation_token(playlist_shelf);
        let mut sugg = Vec::new();
        collect_suggestions_recursive(&json, &mut sugg, &mut seen_suggestions, &seen_tracks);
        (cont, sugg)
    } else {
        collect_tracks_recursive(&json, &mut tracks, &mut seen_tracks);
        (extract_continuation_token(&json), Vec::new())
    };

    // If suggestions are not directly embedded, YouTube Music delivers them via sectionListRenderer continuation
    if suggestions.is_empty() {
        let sec_token_opt = json
            .pointer("/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/continuations/0/nextContinuationData/continuation")
            .or_else(|| json.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/continuations/0/nextContinuationData/continuation"))
            .or_else(|| json.pointer("/contents/twoColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/continuations/0/nextContinuationData/continuation"))
            .and_then(|v| v.as_str())
            .or_else(|| {
                if let Some(slr) = find_renderer(&json, &["sectionListRenderer"]) {
                    slr.pointer("/continuations/0/nextContinuationData/continuation").and_then(|v| v.as_str())
                } else {
                    None
                }
            });

        if let Some(sec_token) = sec_token_opt {
            if let Ok(cont_url) = reqwest::Url::parse_with_params(
                "https://music.youtube.com/youtubei/v1/browse",
                &[("continuation", sec_token), ("ctoken", sec_token)],
            ) {
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

                if let Ok(res) = client.post(cont_url).json(&cont_payload).send().await {
                    if let Ok(sugg_json) = res.json::<serde_json::Value>().await {
                        collect_suggestions_recursive(&sugg_json, &mut suggestions, &mut seen_suggestions, &seen_tracks);
                    }
                }
            }
        }
    }

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

    // Safety check: If playlist header explicitly declares N tracks (e.g. "1 şarkı")
    // and tracks.len() > N while suggestions is empty, split the excess into suggestions.
    if let Some(expected_count) = track_count.as_deref().and_then(parse_number_from_track_count) {
        if tracks.len() > expected_count && suggestions.is_empty() {
            let remaining = tracks.split_off(expected_count);
            for t in remaining {
                if seen_suggestions.insert(t.id.clone()) {
                    suggestions.push(t);
                }
            }
        }
    }

    Ok(PlaylistTracksResult {
        tracks,
        suggestions,
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

pub async fn edit_playlist(
    playlist_id: &str,
    title: Option<&str>,
    description: Option<&str>,
    privacy_status: Option<&str>,
) -> Result<(), String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist";

    let mut actions = Vec::new();

    if let Some(name) = title {
        let trimmed = name.trim();
        if !trimmed.is_empty() {
            actions.push(serde_json::json!({
                "action": "ACTION_SET_PLAYLIST_NAME",
                "playlistName": trimmed
            }));
        }
    }

    if let Some(desc) = description {
        actions.push(serde_json::json!({
            "action": "ACTION_SET_PLAYLIST_DESCRIPTION",
            "playlistDescription": desc.trim()
        }));
    }

    if let Some(privacy) = privacy_status {
        let trimmed = privacy.trim();
        if !trimmed.is_empty() {
            actions.push(serde_json::json!({
                "action": "ACTION_SET_PLAYLIST_PRIVACY",
                "playlistPrivacy": trimmed
            }));
        }
    }

    if actions.is_empty() {
        return Ok(());
    }

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "playlistId": clean_id,
        "actions": actions
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Düzenleme isteği gönderilemedi: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Çalma listesi düzenlenemedi (HTTP {}): {}", status, err_text));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSON ayrıştırılamadı: {}", e))?;

    if let Some(err) = json.get("error") {
        let msg = err.get("message").and_then(|m| m.as_str()).unwrap_or("Bilinmeyen hata");
        return Err(format!("YouTube Music hatası: {}", msg));
    }

    if let Some(status) = json.get("status").and_then(|v| v.as_str()) {
        if status != "STATUS_SUCCEEDED" && status != "OK" {
            return Err(format!("İşlem başarısız: {}", status));
        }
    }

    Ok(())
}

pub async fn add_track_to_playlist(playlist_id: &str, video_id: &str) -> Result<(), String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "playlistId": clean_id,
        "actions": [
            {
                "action": "ACTION_ADD_VIDEO",
                "addedVideoId": video_id,
                "dedupeOption": "DEDUPE_OPTION_CHECK"
            }
        ]
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Çalma listesine ekleme isteği gönderilemedi: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Çalma listesine eklenemedi: {}", err_text));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSON ayrıştırılamadı: {}", e))?;

    if let Some(err) = json.get("error") {
        let msg = err.get("message").and_then(|m| m.as_str()).unwrap_or("Bilinmeyen hata");
        return Err(format!("YouTube Music hatası: {}", msg));
    }

    if let Some(status) = json.get("status").and_then(|v| v.as_str()) {
        if status != "STATUS_SUCCEEDED" {
            return Err(format!("İşlem başarısız: {}", status));
        }
    }

    Ok(())
}

pub async fn remove_track_from_playlist(
    playlist_id: &str,
    video_id: &str,
    set_video_id: Option<&str>,
) -> Result<(), String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        let session = lock.as_ref().ok_or_else(|| "Giriş yapılmamış".to_string())?;
        (session.cookie.clone(), session.sapisid.clone())
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist";

    let mut action_obj = serde_json::json!({
        "action": "ACTION_REMOVE_VIDEO",
        "removedVideoId": video_id
    });
    if let Some(svid) = set_video_id {
        action_obj["setVideoId"] = serde_json::Value::String(svid.to_string());
    }

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "playlistId": clean_id,
        "actions": [action_obj]
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Çalma listesinden kaldırma isteği gönderilemedi: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Çalma listesinden kaldırılamadı: {}", err_text));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSON ayrıştırılamadı: {}", e))?;

    if let Some(err) = json.get("error") {
        let msg = err.get("message").and_then(|m| m.as_str()).unwrap_or("Bilinmeyen hata");
        return Err(format!("YouTube Music hatası: {}", msg));
    }

    if let Some(status) = json.get("status").and_then(|v| v.as_str()) {
        if status != "STATUS_SUCCEEDED" {
            return Err(format!("İşlem başarısız: {}", status));
        }
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
        .incognito(true)
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
                let _ = app_clone.emit("accounts-updated", get_all_accounts());
                let _ = win_clone.close();
                break;
            }
        }
    });

    Ok(())
}

pub fn parse_home_two_row_item(card: &serde_json::Value) -> Option<HomeItem> {
    let mut title = card
        .pointer("/title/runs/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if title.is_empty() {
        if let Some(runs) = card.pointer("/title/runs").and_then(|v| v.as_array()) {
            title = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).collect::<Vec<_>>().join("");
        }
    }
    if title.is_empty() {
        return None;
    }

    let mut subtitle = None;
    if let Some(runs) = card.pointer("/subtitle/runs").and_then(|v| v.as_array()) {
        let parts: Vec<&str> = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).collect();
        if !parts.is_empty() {
            subtitle = Some(parts.join(""));
        }
    }

    let browse_id = card
        .pointer("/navigationEndpoint/browseEndpoint/browseId")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let video_id = card
        .pointer("/navigationEndpoint/watchEndpoint/videoId")
        .or_else(|| card.pointer("/onTap/watchEndpoint/videoId"))
        .or_else(|| card.pointer("/thumbnailOverlay/musicItemThumbnailOverlayRenderer/content/musicPlayButtonRenderer/playNavigationEndpoint/watchEndpoint/videoId"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let playlist_id = card
        .pointer("/navigationEndpoint/watchEndpoint/playlistId")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut thumbnail = card
        .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
        .or_else(|| card.pointer("/thumbnailRenderer/croppedSquareThumbnailRenderer/thumbnail/thumbnails"))
        .or_else(|| card.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails"))
        .or_else(|| card.pointer("/thumbnail/thumbnails"))
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string());

    if let Some(ref mut thumb) = thumbnail {
        if thumb.starts_with("//") {
            *thumb = format!("https:{}", thumb);
        }
    }

    let aspect_str = card.get("aspectRatio").and_then(|v| v.as_str()).unwrap_or("");
    let sub_str = subtitle.as_deref().unwrap_or("").to_lowercase();
    let is_16_9 = aspect_str.contains("16_9") || aspect_str.contains("RECTANGLE") || sub_str.contains("görüntüleme") || sub_str.contains("oynatıldı");
    let aspect_ratio = if is_16_9 { Some("16:9".to_string()) } else { Some("1:1".to_string()) };

    let explicit = card.pointer("/subtitleBadges").is_some() || card.pointer("/badges").is_some();

    let item_type = if let Some(ref bid) = browse_id {
        if bid.starts_with("MPREb_") || bid.starts_with("OLAK5uy_") || sub_str.contains("albüm") || sub_str.contains("ep") || sub_str.contains("album") {
            "album".to_string()
        } else if bid.starts_with("VL") || bid.starts_with("PL") || bid.starts_with("RD") || sub_str.contains("liste") || sub_str.contains("playlist") {
            "playlist".to_string()
        } else if bid.starts_with("UC") || bid.starts_with("FEmusic_artist") {
            "artist".to_string()
        } else if video_id.is_some() {
            "track".to_string()
        } else {
            "playlist".to_string()
        }
    } else if video_id.is_some() {
        "track".to_string()
    } else {
        "playlist".to_string()
    };

    let id = video_id.clone().or_else(|| browse_id.clone()).unwrap_or_else(|| title.clone());

    Some(HomeItem {
        id,
        title,
        subtitle,
        thumbnail,
        item_type,
        aspect_ratio,
        explicit,
        video_id,
        playlist_id,
        browse_id,
    })
}

pub fn parse_home_responsive_item(mrlir: &serde_json::Value) -> Option<HomeItem> {
    let video_id = mrlir
        .pointer("/playlistItemData/videoId")
        .or_else(|| {
            mrlir.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/navigationEndpoint/watchEndpoint/videoId")
        })
        .or_else(|| {
            mrlir.pointer("/doubleTapEndpoint/watchEndpoint/videoId")
        })
        .or_else(|| {
            mrlir.pointer("/overlay/musicItemThumbnailOverlayRenderer/content/musicPlayButtonRenderer/playNavigationEndpoint/watchEndpoint/videoId")
        })
        .and_then(|v| v.as_str())
        .map(|v| v.to_string());

    let mut title = mrlir
        .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if title.is_empty() {
        if let Some(runs) = mrlir.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs").and_then(|v| v.as_array()) {
            title = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).collect::<Vec<_>>().join("");
        }
    }

    if title.is_empty() {
        return None;
    }

    let mut subtitle = None;
    if let Some(runs) = mrlir
        .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .and_then(|v| v.as_array())
    {
        let parts: Vec<&str> = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).collect();
        if !parts.is_empty() {
            subtitle = Some(parts.join(""));
        }
    }

    let mut thumbnail = mrlir
        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .or_else(|| mrlir.pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails"))
        .or_else(|| mrlir.pointer("/thumbnail/thumbnails"))
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
        .map(|v| v.to_string());

    if let Some(ref mut thumb) = thumbnail {
        if thumb.starts_with("//") {
            *thumb = format!("https:{}", thumb);
        }
    }

    let explicit = mrlir.pointer("/badges").is_some() || mrlir.pointer("/subtitleBadges").is_some();
    let id = video_id.clone().unwrap_or_else(|| title.clone());

    Some(HomeItem {
        id,
        title,
        subtitle,
        thumbnail,
        item_type: "track".to_string(),
        aspect_ratio: Some("1:1".to_string()),
        explicit,
        video_id,
        playlist_id: None,
        browse_id: None,
    })
}

pub fn parse_home_sections(contents: &[serde_json::Value]) -> Vec<HomeSection> {
    let mut sections = Vec::new();
    for sec in contents {
        let shelf = sec.get("musicCarouselShelfRenderer").or_else(|| sec.get("musicShelfRenderer"));
        if let Some(c) = shelf {
            let mut title = c
                .pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                .or_else(|| c.pointer("/title/runs/0/text"))
                .or_else(|| c.pointer("/header/musicShelfBasicHeaderRenderer/title/runs/0/text"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            if title.is_empty() {
                if let Some(runs) = c.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs").and_then(|v| v.as_array()) {
                    title = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).collect::<Vec<_>>().join("");
                }
            }

            if title.is_empty() {
                continue;
            }

            let strapline = c
                .pointer("/header/musicCarouselShelfBasicHeaderRenderer/strapline/runs/0/text")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let title_lower = title.to_lowercase();
            let strapline_lower = strapline.as_deref().unwrap_or("").to_lowercase();

            // 1. Filter "Birlikte dinleyin" / "Listen together" / Stations
            let is_listen_together = title_lower.contains("birlikte dinle")
                || title_lower.contains("listen together")
                || strapline_lower.contains("istasyon")
                || strapline_lower.contains("station");
            if is_listen_together {
                continue;
            }

            // 2. Filter "Sizin için önerilen müzik videoları" / "Recommended music videos"
            let is_music_videos = title_lower.contains("müzik video")
                || title_lower.contains("music video")
                || (title_lower.contains("video") && title_lower.contains("öner"))
                || (title_lower.contains("video") && title_lower.contains("recommend"));
            if is_music_videos {
                continue;
            }

            // 3. Filter "Yeni keşifler ve eski favoriler" / "Mixed for you"
            let is_mixed_for_you = title_lower.contains("yeni keşifler")
                || title_lower.contains("mixed for you")
                || (title_lower.contains("keşif") && title_lower.contains("favori"))
                || (title_lower.contains("discover") && title_lower.contains("favorite"));
            if is_mixed_for_you {
                continue;
            }

            let mut items = Vec::new();
            if let Some(raw_items) = c.get("contents").and_then(|v| v.as_array()) {
                for it in raw_items {
                    if let Some(card) = it.get("musicTwoRowItemRenderer") {
                        if let Some(home_item) = parse_home_two_row_item(card) {
                            items.push(home_item);
                        }
                    } else if let Some(mrlir) = it.get("musicResponsiveListItemRenderer") {
                        if let Some(home_item) = parse_home_responsive_item(mrlir) {
                            items.push(home_item);
                        }
                    }
                }
            }

            // Structural check 1: Personalized mixes (VLRDTMAK5uy_)
            if items.iter().any(|it| it.browse_id.as_deref().map(|id| id.starts_with("VLRDTMAK5uy_")).unwrap_or(false)) {
                continue;
            }

            // Structural check 2: Music video shelves (16:9 videos)
            if !items.is_empty() && items.iter().all(|it| it.aspect_ratio.as_deref() == Some("16:9")) && (title_lower.contains("video") || title_lower.contains("klip")) {
                continue;
            }

            // Structural check 3: Stations
            if items.iter().any(|it| it.title.to_lowercase().contains("station") || it.title.to_lowercase().contains("istasyon")) {
                continue;
            }

            // Filter out "Beğendiğim müzikler" (Liked songs) from "Yeniden dinleyin" (Listen again) shelf
            let is_listen_again_shelf = title_lower.contains("yeniden dinle")
                || title_lower.contains("listen again")
                || c.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str())
                    .map(|id| id == "FEmusic_listen_again")
                    .unwrap_or(false);

            if is_listen_again_shelf {
                items.retain(|it| {
                    let is_liked_id = it.id == "VLLM"
                        || it.id == "LM"
                        || it.browse_id.as_deref() == Some("VLLM")
                        || it.browse_id.as_deref() == Some("LM")
                        || it.browse_id.as_deref() == Some("FEmusic_liked");
                    let it_title_lower = it.title.to_lowercase();
                    let is_liked_title = it_title_lower.contains("beğendiğim müzik")
                        || it_title_lower.contains("liked songs")
                        || it_title_lower.contains("beğenilenler");
                    !is_liked_id && !is_liked_title
                });
            }

            if !items.is_empty() {
                sections.push(HomeSection {
                    title,
                    strapline,
                    items,
                });
            }
        }
    }
    sections
}

pub async fn fetch_home_feed(continuation: Option<&str>) -> Result<HomeFeedResult, String> {
    let (cookie, sapisid) = {
        let lock = SESSION.lock().unwrap();
        if let Some(s) = lock.as_ref() {
            (s.cookie.clone(), s.sapisid.clone())
        } else {
            ("".to_string(), None)
        }
    };

    let (client, _) = build_client(&cookie, sapisid.as_deref())?;

    let (sections, next_continuation) = if let Some(token) = continuation {
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

        let raw_sections = next_json
            .pointer("/continuationContents/sectionListContinuation/contents")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let parsed = parse_home_sections(&raw_sections);
        let next_cont = next_json
            .pointer("/continuationContents/sectionListContinuation/continuations/0/nextContinuationData/continuation")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        (parsed, next_cont)
    } else {
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
            .map_err(|e| format!("Ağ hatası: {}", e))?;

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| format!("Ayrıştırma hatası: {}", e))?;

        let raw_sections = json
            .pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let mut parsed = parse_home_sections(&raw_sections);
        let mut next_cont = json
            .pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/continuations/0/nextContinuationData/continuation")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Proactive continuation fetch: On initial load, fetch the second batch immediately
        // so user receives 5-7 shelves right away without waiting!
        if let Some(ref token) = next_cont.clone() {
            if let Ok(cont_url) = reqwest::Url::parse_with_params(
                "https://music.youtube.com/youtubei/v1/browse",
                &[("continuation", token), ("ctoken", token)],
            ) {
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

                if let Ok(res2) = client.post(cont_url).json(&cont_payload).send().await {
                    if let Ok(next_json) = res2.json::<serde_json::Value>().await {
                        if let Some(raw_cont_sections) = next_json
                            .pointer("/continuationContents/sectionListContinuation/contents")
                            .and_then(|v| v.as_array())
                        {
                            let more_parsed = parse_home_sections(raw_cont_sections);
                            parsed.extend(more_parsed);
                        }
                        next_cont = next_json
                            .pointer("/continuationContents/sectionListContinuation/continuations/0/nextContinuationData/continuation")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                    }
                }
            }
        }

        (parsed, next_cont)
    };

    Ok(HomeFeedResult {
        sections,
        continuation: next_continuation,
    })
}
