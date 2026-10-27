use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackTracking {
    pub videostats_playback_url: Option<String>,
    pub videostats_watchtime_url: Option<String>,
    pub cpn: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    pub url: String,
    pub format: String,
    pub bitrate: Option<u64>,
    pub duration: Option<f64>,
    pub title: Option<String>,
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub playback_tracking: Option<PlaybackTracking>,
}

pub const ANDROID_USER_AGENT: &str =
    "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14; tr_TR; Pixel 7 Pro)";

fn get_format_itag(fmt: &serde_json::Value) -> Option<u64> {
    fmt.get("itag")
        .and_then(|i| i.as_u64())
        .or_else(|| fmt.get("itag").and_then(|i| i.as_str()).and_then(|s| s.parse::<u64>().ok()))
}

fn get_format_bitrate(fmt: &serde_json::Value) -> u64 {
    fmt.get("bitrate")
        .and_then(|b| b.as_u64())
        .or_else(|| fmt.get("averageBitrate").and_then(|b| b.as_u64()))
        .unwrap_or(0)
}

fn find_audio_by_itag<'a>(formats: &'a [&'a serde_json::Value], itag: u64) -> Option<&'a serde_json::Value> {
    formats.iter().copied().find(|f| get_format_itag(f) == Some(itag))
}

pub async fn resolve_audio_stream_android(
    video_id: &str,
    quality_preference: Option<&str>,
) -> Result<StreamInfo, String> {
    let client = reqwest::Client::builder()
        .user_agent(ANDROID_USER_AGENT)
        .build()
        .map_err(|e| format!("Failed to build reqwest client: {}", e))?;

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "ANDROID_MUSIC",
                "clientVersion": "6.42.52",
                "androidSdkVersion": 34,
                "hl": "tr",
                "gl": "TR"
            }
        },
        "videoId": video_id,
        "contentCheckOk": true,
        "racyCheckOk": true
    });

    let res = client
        .post("https://music.youtube.com/youtubei/v1/player")
        .header("Content-Type", "application/json")
        .header("User-Agent", ANDROID_USER_AGENT)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Player request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Player endpoint HTTP status: {}", res.status()));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse player JSON: {}", e))?;

    // Extract title & duration from videoDetails
    let title = json
        .get("videoDetails")
        .and_then(|v| v.get("title"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string());

    let duration = json
        .get("videoDetails")
        .and_then(|v| v.get("lengthSeconds"))
        .and_then(|l| l.as_str())
        .and_then(|s| s.parse::<f64>().ok());

    let adaptive_formats = json
        .get("streamingData")
        .and_then(|sd| sd.get("adaptiveFormats"))
        .and_then(|af| af.as_array())
        .ok_or_else(|| "No streamingData.adaptiveFormats found in player response".to_string())?;

    // Filter audio formats with non-empty direct url
    let audio_formats: Vec<&serde_json::Value> = adaptive_formats
        .iter()
        .filter(|fmt| {
            let has_url = fmt
                .get("url")
                .and_then(|u| u.as_str())
                .map(|s| !s.trim().is_empty())
                .unwrap_or(false);
            if !has_url {
                return false;
            }
            let mime = fmt.get("mimeType").and_then(|m| m.as_str()).unwrap_or("");
            mime.starts_with("audio/")
        })
        .collect();

    if audio_formats.is_empty() {
        return Err("No suitable audio format with direct URL found".to_string());
    }

    let pref = quality_preference.unwrap_or("auto").to_lowercase();
    let selected_format: &serde_json::Value = match pref.as_str() {
        "high" => {
            // High: Primary itag 251 (Opus ~160kbps), fallback itag 140 (AAC ~128kbps)
            find_audio_by_itag(&audio_formats, 251)
                .or_else(|| find_audio_by_itag(&audio_formats, 140))
                .or_else(|| audio_formats.iter().copied().max_by_key(|f| get_format_bitrate(f)))
                .unwrap_or(audio_formats[0])
        }
        "normal" => {
            // Normal: itag 250 (Opus ~70kbps)
            find_audio_by_itag(&audio_formats, 250)
                .or_else(|| find_audio_by_itag(&audio_formats, 251))
                .or_else(|| find_audio_by_itag(&audio_formats, 140))
                .or_else(|| audio_formats.iter().copied().max_by_key(|f| get_format_bitrate(f)))
                .unwrap_or(audio_formats[0])
        }
        "low" => {
            // Low / Data Saver: itag 249 (Opus ~50kbps)
            find_audio_by_itag(&audio_formats, 249)
                .or_else(|| find_audio_by_itag(&audio_formats, 250))
                .or_else(|| audio_formats.iter().copied().min_by_key(|f| get_format_bitrate(f)))
                .unwrap_or(audio_formats[0])
        }
        _ => {
            // Auto (Default): Highest available audio format
            find_audio_by_itag(&audio_formats, 251)
                .or_else(|| find_audio_by_itag(&audio_formats, 140))
                .or_else(|| audio_formats.iter().copied().max_by_key(|f| get_format_bitrate(f)))
                .unwrap_or(audio_formats[0])
        }
    };

    let stream_url = selected_format
        .get("url")
        .and_then(|u| u.as_str())
        .ok_or_else(|| "Selected format has no url".to_string())?
        .to_string();

    let format_id = get_format_itag(selected_format)
        .map(|i| i.to_string())
        .or_else(|| {
            selected_format
                .get("mimeType")
                .and_then(|m| m.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "audio".to_string());

    let bitrate = selected_format
        .get("bitrate")
        .and_then(|b| b.as_u64())
        .or_else(|| {
            selected_format
                .get("averageBitrate")
                .and_then(|b| b.as_u64())
        });

    let mut headers = HashMap::new();
    headers.insert("User-Agent".to_string(), ANDROID_USER_AGENT.to_string());

    Ok(StreamInfo {
        url: stream_url,
        format: format_id,
        bitrate,
        duration,
        title,
        headers,
        playback_tracking: None,
    })
}

fn find_ytdlp_path() -> Option<PathBuf> {
    // 1. Check relative to current working directory
    let cwd_paths = [
        PathBuf::from("src-tauri/bin/yt-dlp.exe"),
        PathBuf::from("bin/yt-dlp.exe"),
        PathBuf::from("yt-dlp.exe"),
        PathBuf::from("../src-tauri/bin/yt-dlp.exe"),
        PathBuf::from("../bin/yt-dlp.exe"),
    ];
    for p in &cwd_paths {
        if p.exists() {
            return Some(p.clone());
        }
    }

    // 2. Check canonicalized current dir
    if let Ok(cur) = std::env::current_dir() {
        let candidates = [
            cur.join("src-tauri").join("bin").join("yt-dlp.exe"),
            cur.join("bin").join("yt-dlp.exe"),
            cur.join("yt-dlp.exe"),
        ];
        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }
    }

    // 3. Check relative to current exe
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join("bin").join("yt-dlp.exe"),
                exe_dir.join("yt-dlp.exe"),
                exe_dir.join("../../src-tauri/bin/yt-dlp.exe"),
                exe_dir.join("../../../src-tauri/bin/yt-dlp.exe"),
            ];
            for c in &candidates {
                if c.exists() {
                    return Some(c.clone());
                }
            }
        }
    }

    // 4. Check system PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join("yt-dlp.exe");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // 5. Check %TEMP%\yt-dlp.exe
    if let Ok(temp) = std::env::var("TEMP") {
        let candidate = PathBuf::from(temp).join("yt-dlp.exe");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    None
}

pub async fn resolve_audio_stream_ytdlp(
    video_id: &str,
    quality_preference: Option<&str>,
) -> Result<StreamInfo, String> {
    let ytdlp = find_ytdlp_path()
        .ok_or_else(|| "yt-dlp binary not found in bin/ or PATH".to_string())?;

    let pref = quality_preference.unwrap_or("auto").to_lowercase();
    let format_selector = match pref.as_str() {
        "high" => "251/140/ba/b",
        "normal" => "250/251/140/ba/b",
        "low" => "249/250/ba/b",
        _ => "251/140/ba/b",
    };

    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let mut cmd = Command::new(&ytdlp);
    cmd.args([
        "-j",
        "--no-playlist",
        "-f",
        format_selector,
        "--no-warnings",
        "--no-check-certificates",
        "--prefer-free-formats",
        "--js-runtimes",
        "node",
        &url,
    ]);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse yt-dlp JSON: {}", e))?;

    let title = json.get("title").and_then(|v| v.as_str()).map(|v| v.to_string());
    let duration = json.get("duration").and_then(|v| v.as_f64());

    // Extract headers
    let mut headers = HashMap::new();
    if let Some(h) = json.get("http_headers").and_then(|v| v.as_object()) {
        for (k, v) in h {
            if let Some(val_str) = v.as_str() {
                headers.insert(k.clone(), val_str.to_string());
            }
        }
    }

    // Try finding matching audio format in formats array according to quality preference
    if let Some(formats) = json.get("formats").and_then(|v| v.as_array()) {
        let audio_formats: Vec<&serde_json::Value> = formats
            .iter()
            .filter(|f| {
                let is_audio = f.get("vcodec").and_then(|v| v.as_str()) == Some("none")
                    || f.get("resolution").and_then(|v| v.as_str()) == Some("audio only");
                let has_url = f.get("url").and_then(|u| u.as_str()).map(|s| !s.is_empty()).unwrap_or(false);
                is_audio && has_url
            })
            .collect();

        if !audio_formats.is_empty() {
            let matched_fmt = match pref.as_str() {
                "high" => audio_formats
                    .iter()
                    .copied()
                    .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("251"))
                    .or_else(|| {
                        audio_formats
                            .iter()
                            .copied()
                            .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("140"))
                    }),
                "normal" => audio_formats
                    .iter()
                    .copied()
                    .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("250"))
                    .or_else(|| {
                        audio_formats
                            .iter()
                            .copied()
                            .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("251"))
                    }),
                "low" => audio_formats
                    .iter()
                    .copied()
                    .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("249"))
                    .or_else(|| {
                        audio_formats
                            .iter()
                            .copied()
                            .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("250"))
                    }),
                _ => audio_formats
                    .iter()
                    .copied()
                    .find(|f| f.get("format_id").and_then(|v| v.as_str()) == Some("251")),
            }
            .or_else(|| audio_formats.last().copied());

            if let Some(f) = matched_fmt {
                if let Some(stream_url) = f.get("url").and_then(|v| v.as_str()) {
                    let format = f.get("format_id").and_then(|v| v.as_str()).unwrap_or("audio").to_string();
                    let bitrate = f.get("abr").and_then(|v| v.as_u64());
                    return Ok(StreamInfo {
                        url: stream_url.to_string(),
                        format,
                        bitrate,
                        duration,
                        title,
                        headers,
                        playback_tracking: None,
                    });
                }
            }
        }
    }

    // Check direct url in root
    if let Some(stream_url) = json.get("url").and_then(|v| v.as_str()) {
        let format = json.get("format_id").and_then(|v| v.as_str()).unwrap_or("audio").to_string();
        let bitrate = json.get("abr").and_then(|v| v.as_u64());
        return Ok(StreamInfo {
            url: stream_url.to_string(),
            format,
            bitrate,
            duration,
            title,
            headers,
            playback_tracking: None,
        });
    }

    Err("Could not find playable audio stream format in response".to_string())
}

pub fn generate_cpn() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let alphabet: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let mut val = now;
    let mut cpn = String::with_capacity(16);
    for i in 0..16 {
        val = val
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407 + i as u128);
        let idx = ((val >> 60) as usize) % alphabet.len();
        cpn.push(alphabet[idx] as char);
    }
    cpn
}

pub async fn fetch_playback_tracking(video_id: &str) -> Option<PlaybackTracking> {
    let (cookie, sapisid) = crate::auth::get_session_info()?;
    let (client, _) = crate::auth::build_client(&cookie, sapisid.as_deref()).ok()?;

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20240401.01.00",
                "hl": "tr",
                "gl": "TR"
            }
        },
        "videoId": video_id
    });

    let res = client
        .post("https://www.youtube.com/youtubei/v1/player")
        .header("Referer", "https://www.youtube.com/")
        .header("Origin", "https://www.youtube.com")
        .header("X-Origin", "https://www.youtube.com")
        .json(&payload)
        .send()
        .await
        .ok()?;

    if !res.status().is_success() {
        return None;
    }

    let json: serde_json::Value = res.json().await.ok()?;
    let tracking = json.get("playbackTracking")?;

    let playback_url = tracking
        .pointer("/videostatsPlaybackUrl/baseUrl")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let watchtime_url = tracking
        .pointer("/videostatsWatchtimeUrl/baseUrl")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if playback_url.is_none() && watchtime_url.is_none() {
        return None;
    }

    Some(PlaybackTracking {
        videostats_playback_url: playback_url,
        videostats_watchtime_url: watchtime_url,
        cpn: generate_cpn(),
    })
}

pub async fn ping_playback(playback_url: &str, cpn: &str) -> Result<(), String> {
    let (cookie, sapisid) = crate::auth::get_session_info().ok_or_else(|| "No session".to_string())?;
    let (client, _) = crate::auth::build_client(&cookie, sapisid.as_deref())?;

    let sep = if playback_url.contains('?') { "&" } else { "?" };
    let url = format!("{}{}cpn={}", playback_url, sep, cpn);

    let _ = client
        .get(&url)
        .header("Referer", "https://www.youtube.com/")
        .header("Origin", "https://www.youtube.com")
        .send()
        .await;

    Ok(())
}

pub async fn ping_watchtime(
    watchtime_url: &str,
    cpn: &str,
    len: f64,
    cmt: f64,
) -> Result<(), String> {
    let (cookie, sapisid) = crate::auth::get_session_info().ok_or_else(|| "No session".to_string())?;
    let (client, _) = crate::auth::build_client(&cookie, sapisid.as_deref())?;

    let sep = if watchtime_url.contains('?') { "&" } else { "?" };
    let url = format!(
        "{}{}cpn={}&state=playing&len={:.0}&cmt={:.3}&st=0.000&et={:.3}&rt={:.1}",
        watchtime_url, sep, cpn, len, cmt, cmt, cmt
    );

    let _ = client
        .get(&url)
        .header("Referer", "https://www.youtube.com/")
        .header("Origin", "https://www.youtube.com")
        .send()
        .await;

    Ok(())
}

pub async fn resolve_audio_stream(
    video_id: &str,
    quality_preference: Option<&str>,
) -> Result<StreamInfo, String> {
    let tracking_task = tokio::spawn({
        let vid = video_id.to_string();
        async move { fetch_playback_tracking(&vid).await }
    });

    // 1. Primary: Fast, direct Android Music client resolution
    let stream_res = match resolve_audio_stream_android(video_id, quality_preference).await {
        Ok(info) => Ok(info),
        Err(e) => {
            eprintln!("Android stream resolver failed ({}), falling back to yt-dlp", e);
            // 2. Secondary fallback: yt-dlp
            resolve_audio_stream_ytdlp(video_id, quality_preference).await
        }
    };

    let mut info = stream_res?;
    if let Ok(tracking) = tracking_task.await {
        info.playback_tracking = tracking;
    }

    Ok(info)
}
