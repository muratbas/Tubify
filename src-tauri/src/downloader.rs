use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedTrack {
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<String>,
    pub file_path: String,
    pub cover_path: Option<String>,
    #[serde(default = "default_mime_type")]
    pub mime_type: String,
    pub file_size: u64,
    #[serde(default)]
    pub cached_at: u64,
    #[serde(default)]
    pub downloaded_at: u64,
}

fn default_mime_type() -> String {
    "audio/webm".to_string()
}

pub type DownloadedTrack = CachedTrack;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub track_id: String,
    pub progress: f64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

// Active download abort senders
static ACTIVE_DOWNLOADS: OnceLock<Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>>> =
    OnceLock::new();

fn get_active_downloads() -> &'static Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>> {
    ACTIVE_DOWNLOADS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn get_app_data_path(app: &AppHandle) -> PathBuf {
    if let Ok(dir) = app.path().app_data_dir() {
        return dir;
    }
    // Fallback to local APPDATA on Windows or current dir
    if let Ok(appdata) = std::env::var("APPDATA") {
        return PathBuf::from(appdata).join("com.tubify.music");
    }
    PathBuf::from("downloads_data")
}

pub fn get_cache_dir(app: &AppHandle) -> PathBuf {
    get_app_data_path(app).join("cache")
}

pub fn get_tracks_dir(app: &AppHandle) -> PathBuf {
    get_cache_dir(app).join("tracks")
}

pub fn get_covers_dir(app: &AppHandle) -> PathBuf {
    get_cache_dir(app).join("covers")
}

pub fn get_library_path(app: &AppHandle) -> PathBuf {
    get_cache_dir(app).join("library.json")
}

pub fn load_metadata(app: &AppHandle) -> Vec<CachedTrack> {
    let library_file = get_library_path(app);
    let tracks_dir = get_tracks_dir(app);
    let covers_dir = get_covers_dir(app);

    // If cache/library.json exists, load it
    if library_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&library_file) {
            if let Ok(tracks) = serde_json::from_str::<Vec<CachedTrack>>(&content) {
                return tracks;
            }
        }
    }

    // Auto-migration from legacy downloads/downloads.json
    let legacy_file = get_app_data_path(app).join("downloads").join("downloads.json");
    let legacy_tracks_dir = get_app_data_path(app).join("downloads").join("tracks");
    let legacy_covers_dir = get_app_data_path(app).join("downloads").join("covers");

    if legacy_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&legacy_file) {
            if let Ok(legacy_tracks) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
                let _ = std::fs::create_dir_all(&tracks_dir);
                let _ = std::fs::create_dir_all(&covers_dir);
                let mut migrated: Vec<CachedTrack> = Vec::new();

                for item in legacy_tracks {
                    let track_id = item.get("track_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    if track_id.is_empty() {
                        continue;
                    }
                    let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                    let artist = item.get("artist").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                    let album = item.get("album").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let duration = item.get("duration").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let downloaded_at = item.get("downloaded_at").and_then(|v| v.as_u64()).unwrap_or(0);

                    let legacy_track_path = legacy_tracks_dir.join(format!("{}.mp3", &track_id));
                    let new_track_path = tracks_dir.join(format!("{}.bin", &track_id));

                    if legacy_track_path.exists() && !new_track_path.exists() {
                        let _ = std::fs::rename(&legacy_track_path, &new_track_path);
                    }

                    let legacy_cover_path = legacy_covers_dir.join(format!("{}.jpg", &track_id));
                    let new_cover_path = covers_dir.join(format!("{}.bin", &track_id));
                    if legacy_cover_path.exists() && !new_cover_path.exists() {
                        let _ = std::fs::rename(&legacy_cover_path, &new_cover_path);
                    }

                    let file_size = if new_track_path.exists() {
                        std::fs::metadata(&new_track_path).map(|m| m.len()).unwrap_or(0)
                    } else {
                        item.get("file_size").and_then(|v| v.as_u64()).unwrap_or(0)
                    };

                    let mime = detect_audio_mime_type(&new_track_path);

                    let cover_path = if new_cover_path.exists() {
                        Some(new_cover_path.to_string_lossy().to_string())
                    } else {
                        None
                    };

                    migrated.push(CachedTrack {
                        track_id,
                        title,
                        artist,
                        album,
                        duration,
                        file_path: new_track_path.to_string_lossy().to_string(),
                        cover_path,
                        mime_type: mime.to_string(),
                        file_size,
                        cached_at: downloaded_at,
                        downloaded_at,
                    });
                }

                let _ = save_metadata(app, &migrated);
                return migrated;
            }
        }
    }

    Vec::new()
}

pub fn save_metadata(app: &AppHandle, tracks: &[CachedTrack]) -> Result<(), String> {
    let file = get_library_path(app);
    if let Some(parent) = file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(tracks)
        .map_err(|e| format!("Failed to serialize library metadata: {}", e))?;
    std::fs::write(&file, json)
        .map_err(|e| format!("Failed to write library metadata: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_cached_library(app: AppHandle) -> Result<Vec<CachedTrack>, String> {
    let mut tracks = load_metadata(&app);
    let tracks_dir = get_tracks_dir(&app);
    
    // Filter out tracks whose files no longer exist on disk
    let initial_count = tracks.len();
    tracks.retain(|t| {
        let p = PathBuf::from(&t.file_path);
        if p.exists() {
            true
        } else {
            let fallback = tracks_dir.join(format!("{}.bin", t.track_id));
            fallback.exists()
        }
    });

    if tracks.len() != initial_count {
        let _ = save_metadata(&app, &tracks);
    }

    Ok(tracks)
}

#[tauri::command]
pub async fn get_downloaded_tracks(app: AppHandle) -> Result<Vec<CachedTrack>, String> {
    get_cached_library(app).await
}

#[tauri::command]
pub async fn delete_cached_track(app: AppHandle, video_id: String) -> Result<(), String> {
    cancel_download(video_id.clone()).await?;

    let tracks_dir = get_tracks_dir(&app);
    let covers_dir = get_covers_dir(&app);

    let track_file = tracks_dir.join(format!("{}.bin", &video_id));
    let temp_file = tracks_dir.join(format!("{}.tmp", &video_id));
    let cover_file = covers_dir.join(format!("{}.bin", &video_id));

    let _ = tokio::fs::remove_file(track_file).await;
    let _ = tokio::fs::remove_file(temp_file).await;
    let _ = tokio::fs::remove_file(cover_file).await;

    // Remove legacy paths if any
    let legacy_tracks_dir = get_app_data_path(&app).join("downloads").join("tracks");
    let legacy_covers_dir = get_app_data_path(&app).join("downloads").join("covers");
    let _ = tokio::fs::remove_file(legacy_tracks_dir.join(format!("{}.mp3", &video_id))).await;
    let _ = tokio::fs::remove_file(legacy_covers_dir.join(format!("{}.jpg", &video_id))).await;

    // Remove from metadata
    let mut tracks = load_metadata(&app);
    tracks.retain(|t| t.track_id != video_id);
    save_metadata(&app, &tracks)?;

    // Emit event
    let _ = app.emit("download_deleted", serde_json::json!({ "track_id": video_id }));
    let _ = app.emit("cache_deleted", serde_json::json!({ "video_id": video_id }));

    Ok(())
}

#[tauri::command]
pub async fn delete_downloaded_track(app: AppHandle, track_id: String) -> Result<(), String> {
    delete_cached_track(app, track_id).await
}

#[tauri::command]
pub async fn get_cached_track_bytes(app: AppHandle, video_id: String) -> Result<(Vec<u8>, String), String> {
    let tracks_dir = get_tracks_dir(&app);
    let mut file_path = tracks_dir.join(format!("{}.bin", &video_id));
    if !file_path.exists() {
        let legacy = get_app_data_path(&app).join("downloads").join("tracks").join(format!("{}.mp3", &video_id));
        if legacy.exists() {
            file_path = legacy;
        } else {
            return Err("Cached track file not found".to_string());
        }
    }
    let mime = detect_audio_mime_type(&file_path);
    let bytes = tokio::fs::read(&file_path)
        .await
        .map_err(|e| format!("Failed to read cached audio file: {}", e))?;
    Ok((bytes, mime.to_string()))
}

#[tauri::command]
pub async fn get_downloaded_audio_bytes(app: AppHandle, track_id: String) -> Result<(Vec<u8>, String), String> {
    get_cached_track_bytes(app, track_id).await
}

#[tauri::command]
pub async fn cancel_download(track_id: String) -> Result<(), String> {
    let sender = {
        let mut lock = get_active_downloads().lock().unwrap();
        lock.remove(&track_id)
    };

    if let Some(s) = sender {
        let _ = s.send(());
    }

    Ok(())
}


#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    track_id: String,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<String>,
    audio_url: Option<String>,
    cover_url: Option<String>,
) -> Result<DownloadedTrack, String> {
    // Ensure directories exist
    let tracks_dir = get_tracks_dir(&app);
    let covers_dir = get_covers_dir(&app);

    tokio::fs::create_dir_all(&tracks_dir)
        .await
        .map_err(|e| format!("Failed to create tracks dir: {}", e))?;
    tokio::fs::create_dir_all(&covers_dir)
        .await
        .map_err(|e| format!("Failed to create covers dir: {}", e))?;

    let track_path = tracks_dir.join(format!("{}.bin", &track_id));
    let temp_track_path = tracks_dir.join(format!("{}.tmp", &track_id));
    let cover_path = covers_dir.join(format!("{}.bin", &track_id));

    // If already downloaded and valid, return existing
    if track_path.exists() {
        let metadata = load_metadata(&app);
        if let Some(existing) = metadata.into_iter().find(|t| t.track_id == track_id) {
            return Ok(existing);
        }
    }

    // Resolve audio stream URL if not provided
    let (stream_url, custom_headers) = match audio_url.filter(|s| !s.trim().is_empty()) {
        Some(u) => (u, None),
        None => {
            let info = crate::stream::resolve_audio_stream(&track_id, Some("high")).await?;
            (info.url, Some(info.headers))
        }
    };

    // Prepare cancellation channel
    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut lock = get_active_downloads().lock().unwrap();
        lock.insert(track_id.clone(), cancel_tx);
    }

    // Start HTTP download with reqwest
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create reqwest client: {}", e))?;

    let mut req_builder = client
        .get(&stream_url)
        .header("Range", "bytes=0-");

    if let Some(hdrs) = custom_headers {
        for (k, v) in hdrs {
            req_builder = req_builder.header(k, v);
        }
    } else {
        req_builder = req_builder.header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        );
    }

    let mut response = req_builder
        .send()
        .await
        .map_err(|e| format!("Failed to initiate download stream: {}", e))?;

    let status = response.status();
    if !status.is_success() && status != reqwest::StatusCode::PARTIAL_CONTENT {
        // Remove from active downloads
        {
            let mut lock = get_active_downloads().lock().unwrap();
            lock.remove(&track_id);
        }
        return Err(format!("Download stream HTTP error: {}", status));
    }

    let total_bytes = response.content_length().unwrap_or(0);

    let raw_file = tokio::fs::File::create(&temp_track_path)
        .await
        .map_err(|e| format!("Failed to create temp audio file: {}", e))?;
    
    // 128 KB write buffer for maximum disk throughput
    let mut writer = tokio::io::BufWriter::with_capacity(128 * 1024, raw_file);

    let mut downloaded_bytes: u64 = 0;
    let mut last_emit_percent = 0.0;
    let mut last_emit_time = std::time::Instant::now();
    let mut is_cancelled = false;

    // Initial 0% emit
    let _ = app.emit(
        "download_progress",
        DownloadProgressPayload {
            track_id: track_id.clone(),
            progress: 0.0,
            downloaded_bytes: 0,
            total_bytes,
        },
    );

    loop {
        tokio::select! {
            _ = &mut cancel_rx => {
                is_cancelled = true;
                break;
            }
            chunk_result = response.chunk() => {
                match chunk_result {
                    Ok(Some(chunk)) => {
                        if let Err(e) = writer.write_all(&chunk).await {
                            {
                                let mut lock = get_active_downloads().lock().unwrap();
                                lock.remove(&track_id);
                            }
                            let _ = tokio::fs::remove_file(&temp_track_path).await;
                            return Err(format!("Error writing audio chunk: {}", e));
                        }
                        downloaded_bytes += chunk.len() as u64;

                        let progress = if total_bytes > 0 {
                            (downloaded_bytes as f64 / total_bytes as f64) * 100.0
                        } else {
                            0.0
                        };

                        // Debounced emit: Every 2.5% progress or minimum 120ms interval
                        let now = std::time::Instant::now();
                        let percent_diff = (progress - last_emit_percent).abs();
                        let time_diff = now.duration_since(last_emit_time);

                        if percent_diff >= 2.5 || time_diff.as_millis() >= 120 || (total_bytes > 0 && downloaded_bytes >= total_bytes) {
                            last_emit_percent = progress;
                            last_emit_time = now;
                            let _ = app.emit(
                                "download_progress",
                                DownloadProgressPayload {
                                    track_id: track_id.clone(),
                                    progress: (progress * 10.0).round() / 10.0,
                                    downloaded_bytes,
                                    total_bytes,
                                },
                            );
                        }
                    }
                    Ok(None) => {
                        // Stream finished
                        break;
                    }
                    Err(e) => {
                        {
                            let mut lock = get_active_downloads().lock().unwrap();
                            lock.remove(&track_id);
                        }
                        let _ = tokio::fs::remove_file(&temp_track_path).await;
                        return Err(format!("Download stream error: {}", e));
                    }
                }
            }
        }
    }

    // Cleanup active downloads map
    {
        let mut lock = get_active_downloads().lock().unwrap();
        lock.remove(&track_id);
    }

    if is_cancelled {
        let _ = tokio::fs::remove_file(&temp_track_path).await;
        let _ = app.emit("download_cancelled", serde_json::json!({ "track_id": track_id }));
        return Err("Download cancelled by user".to_string());
    }

    // Flush and finalize buffered audio file
    if let Err(e) = writer.flush().await {
        let _ = tokio::fs::remove_file(&temp_track_path).await;
        return Err(format!("Failed to flush audio file: {}", e));
    }
    drop(writer);

    if let Err(e) = tokio::fs::rename(&temp_track_path, &track_path).await {
        let _ = tokio::fs::remove_file(&temp_track_path).await;
        return Err(format!("Failed to finalize audio file: {}", e));
    }

    let file_size = tokio::fs::metadata(&track_path)
        .await
        .map(|m| m.len())
        .unwrap_or(downloaded_bytes);

    // Download cover image if provided
    let mut final_cover_path: Option<String> = None;
    if let Some(c_url) = cover_url.filter(|s| !s.trim().is_empty()) {
        if let Ok(cover_res) = client.get(&c_url).send().await {
            if cover_res.status().is_success() {
                if let Ok(bytes) = cover_res.bytes().await {
                    if let Ok(mut c_file) = tokio::fs::File::create(&cover_path).await {
                        let _ = c_file.write_all(&bytes).await;
                        let _ = c_file.flush().await;
                        final_cover_path = Some(cover_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    let now_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let mime = detect_audio_mime_type(&track_path);

    let cached_track = CachedTrack {
        track_id: track_id.clone(),
        title,
        artist,
        album,
        duration,
        file_path: track_path.to_string_lossy().to_string(),
        cover_path: final_cover_path,
        mime_type: mime.to_string(),
        file_size,
        cached_at: now_ts,
        downloaded_at: now_ts,
    };

    // Save metadata
    let mut tracks = load_metadata(&app);
    tracks.retain(|t| t.track_id != track_id);
    tracks.insert(0, cached_track.clone());
    save_metadata(&app, &tracks)?;

    // Emit 100% and completion events
    let _ = app.emit(
        "download_progress",
        DownloadProgressPayload {
            track_id: track_id.clone(),
            progress: 100.0,
            downloaded_bytes: file_size,
            total_bytes: file_size,
        },
    );
    let _ = app.emit("download_completed", cached_track.clone());
    let _ = app.emit("cache_completed", cached_track.clone());

    Ok(cached_track)
}

fn detect_audio_mime_type(file_path: &PathBuf) -> &'static str {
    if let Ok(mut f) = std::fs::File::open(file_path) {
        use std::io::Read;
        let mut magic = [0u8; 12];
        if let Ok(n) = f.read(&mut magic) {
            if n >= 4 && magic[0..4] == [0x1A, 0x45, 0xDF, 0xA3] {
                return "audio/webm";
            }
            if n >= 8 && &magic[4..8] == b"ftyp" {
                return "audio/mp4";
            }
            if n >= 3 && &magic[0..3] == b"ID3" {
                return "audio/mpeg";
            }
            if n >= 2 && magic[0] == 0xFF && (magic[1] & 0xE0) == 0xE0 {
                return "audio/mpeg";
            }
            if n >= 4 && &magic[0..4] == b"OggS" {
                return "audio/ogg";
            }
            if n >= 4 && &magic[0..4] == b"fLaC" {
                return "audio/flac";
            }
        }
    }
    "audio/webm"
}

pub fn handle_uri_scheme(
    app: &AppHandle,
    req: tauri::http::Request<Vec<u8>>,
    responder: tauri::UriSchemeResponder,
) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        // Handle preflight OPTIONS request for CORS
        if req.method() == "OPTIONS" {
            let res = tauri::http::Response::builder()
                .status(204)
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
                .header("Access-Control-Allow-Headers", "*")
                .header("Access-Control-Max-Age", "86400")
                .body(Vec::new())
                .unwrap();
            responder.respond(res);
            return;
        }

        let uri_path = req.uri().path();
        let host = req.uri().host().unwrap_or_default();
        
        let tracks_dir = get_tracks_dir(&app);
        let covers_dir = get_covers_dir(&app);

        let (resource_type, track_id) = if host == "track" || host == "cover" {
            (host, uri_path.trim_matches('/'))
        } else {
            let parts: Vec<&str> = uri_path.trim_matches('/').split('/').collect();
            (parts.get(0).copied().unwrap_or_default(), parts.get(1).copied().unwrap_or_default())
        };

        let res = match (resource_type, track_id) {
            ("track", id) if !id.is_empty() => {
                let file_path = tracks_dir.join(format!("{}.bin", id));
                if file_path.exists() {
                    let mime = detect_audio_mime_type(&file_path);
                    serve_file(&file_path, &req, mime)
                } else {
                    let legacy = tracks_dir.join(format!("{}.mp3", id));
                    if legacy.exists() {
                        let mime = detect_audio_mime_type(&legacy);
                        serve_file(&legacy, &req, mime)
                    } else {
                        tauri::http::Response::builder()
                            .status(404)
                            .header("Access-Control-Allow-Origin", "*")
                            .body(Vec::new())
                            .unwrap()
                    }
                }
            }
            ("cover", id) if !id.is_empty() => {
                let file_path = covers_dir.join(format!("{}.bin", id));
                if file_path.exists() {
                    serve_file(&file_path, &req, "image/jpeg")
                } else {
                    let legacy = covers_dir.join(format!("{}.jpg", id));
                    if legacy.exists() {
                        serve_file(&legacy, &req, "image/jpeg")
                    } else {
                        tauri::http::Response::builder()
                            .status(404)
                            .header("Access-Control-Allow-Origin", "*")
                            .body(Vec::new())
                            .unwrap()
                    }
                }
            }
            _ => {
                tauri::http::Response::builder()
                    .status(400)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap()
            }
        };

        responder.respond(res);
    });
}

fn serve_file(
    file_path: &PathBuf,
    req: &tauri::http::Request<Vec<u8>>,
    content_type: &str,
) -> tauri::http::Response<Vec<u8>> {
    use std::io::{Read, Seek, SeekFrom};

    let mut file = match std::fs::File::open(file_path) {
        Ok(f) => f,
        Err(_) => {
            return tauri::http::Response::builder()
                .status(404)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap();
        }
    };

    let file_len = match file.metadata() {
        Ok(m) => m.len(),
        Err(_) => {
            return tauri::http::Response::builder()
                .status(404)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap();
        }
    };

    // If HEAD request, return 200 without body
    if req.method() == "HEAD" {
        return tauri::http::Response::builder()
            .status(200)
            .header("Content-Type", content_type)
            .header("Accept-Ranges", "bytes")
            .header("Content-Length", file_len.to_string())
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            .header("Access-Control-Allow-Headers", "*")
            .body(Vec::new())
            .unwrap();
    }

    // Check Range header
    let range_header = req
        .headers()
        .get("range")
        .and_then(|v| v.to_str().ok());

    if let Some(range) = range_header {
        if let Some(range_spec) = range.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_spec.split('-').collect();
            let start: u64 = parts[0].parse().unwrap_or(0);
            let end: u64 = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse().unwrap_or(file_len - 1)
            } else {
                file_len - 1
            };
            let end = end.min(file_len.saturating_sub(1));

            if start <= end && start < file_len {
                let length = (end - start) + 1;
                if file.seek(SeekFrom::Start(start)).is_ok() {
                    let mut buffer = vec![0u8; length as usize];
                    if file.read_exact(&mut buffer).is_ok() {
                        return tauri::http::Response::builder()
                            .status(206)
                            .header("Content-Type", content_type)
                            .header("Accept-Ranges", "bytes")
                            .header("Content-Range", format!("bytes {}-{}/{}", start, end, file_len))
                            .header("Content-Length", length.to_string())
                            .header("Access-Control-Allow-Origin", "*")
                            .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
                            .header("Access-Control-Allow-Headers", "*")
                            .body(buffer)
                            .unwrap();
                    }
                }
            }
        }
    }

    // Full file response
    let mut buffer = Vec::new();
    if file.seek(SeekFrom::Start(0)).is_ok() && file.read_to_end(&mut buffer).is_ok() {
        tauri::http::Response::builder()
            .status(200)
            .header("Content-Type", content_type)
            .header("Accept-Ranges", "bytes")
            .header("Content-Length", buffer.len().to_string())
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            .header("Access-Control-Allow-Headers", "*")
            .body(buffer)
            .unwrap()
    } else {
        tauri::http::Response::builder()
            .status(500)
            .header("Access-Control-Allow-Origin", "*")
            .body(Vec::new())
            .unwrap()
    }
}
