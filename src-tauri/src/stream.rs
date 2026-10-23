use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    pub url: String,
    pub format: String,
    pub bitrate: Option<u64>,
    pub duration: Option<f64>,
    pub title: Option<String>,
    pub headers: HashMap<String, String>,
}

pub const ANDROID_USER_AGENT: &str =
    "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14; tr_TR; Pixel 7 Pro)";

pub async fn resolve_audio_stream_android(video_id: &str) -> Result<StreamInfo, String> {
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

    // Priority 1: audio/webm; codecs="opus" (ITAG 251 ~160kbps)
    // Priority 2: audio/mp4; codecs="mp4a.40.2" (ITAG 140 ~128kbps)
    // Fallback: any audio format with direct url

    let mut candidate_p1: Option<&serde_json::Value> = None;
    let mut candidate_p2: Option<&serde_json::Value> = None;
    let mut candidate_fallback: Option<&serde_json::Value> = None;

    for fmt in adaptive_formats {
        let has_url = fmt
            .get("url")
            .and_then(|u| u.as_str())
            .map(|s| !s.is_empty())
            .unwrap_or(false);
        if !has_url {
            continue;
        }

        let mime = fmt.get("mimeType").and_then(|m| m.as_str()).unwrap_or("");
        if !mime.starts_with("audio/") {
            continue;
        }

        let is_opus = mime.contains("audio/webm") && mime.contains("opus");
        let is_mp4a = mime.contains("audio/mp4") && mime.contains("mp4a");

        if is_opus {
            let br = fmt.get("bitrate").and_then(|b| b.as_u64()).unwrap_or(0);
            let prev_br = candidate_p1
                .and_then(|c| c.get("bitrate"))
                .and_then(|b| b.as_u64())
                .unwrap_or(0);
            if candidate_p1.is_none() || br > prev_br {
                candidate_p1 = Some(fmt);
            }
        } else if is_mp4a {
            let br = fmt.get("bitrate").and_then(|b| b.as_u64()).unwrap_or(0);
            let prev_br = candidate_p2
                .and_then(|c| c.get("bitrate"))
                .and_then(|b| b.as_u64())
                .unwrap_or(0);
            if candidate_p2.is_none() || br > prev_br {
                candidate_p2 = Some(fmt);
            }
        } else if candidate_fallback.is_none() {
            candidate_fallback = Some(fmt);
        }
    }

    let selected_format = candidate_p1
        .or(candidate_p2)
        .or(candidate_fallback)
        .ok_or_else(|| "No suitable audio format with direct URL found".to_string())?;

    let stream_url = selected_format
        .get("url")
        .and_then(|u| u.as_str())
        .ok_or_else(|| "Selected format has no url".to_string())?
        .to_string();

    let format_id = selected_format
        .get("itag")
        .and_then(|i| i.as_u64())
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

pub async fn resolve_audio_stream_ytdlp(video_id: &str) -> Result<StreamInfo, String> {
    let ytdlp = find_ytdlp_path()
        .ok_or_else(|| "yt-dlp binary not found in bin/ or PATH".to_string())?;

    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let mut cmd = Command::new(&ytdlp);
    cmd.args([
        "-j",
        "--no-playlist",
        "-f",
        "ba/b",
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
        });
    }

    // Try finding best audio format in formats array
    if let Some(formats) = json.get("formats").and_then(|v| v.as_array()) {
        for f in formats.iter().rev() {
            let is_audio = f.get("vcodec").and_then(|v| v.as_str()) == Some("none")
                || f.get("resolution").and_then(|v| v.as_str()) == Some("audio only");
            if is_audio {
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
                    });
                }
            }
        }
    }

    Err("Could not find playable audio stream format in response".to_string())
}

pub async fn resolve_audio_stream(video_id: &str) -> Result<StreamInfo, String> {
    // 1. Primary: Fast, direct Android Music client resolution
    match resolve_audio_stream_android(video_id).await {
        Ok(info) => return Ok(info),
        Err(_) => {
            // Android Music endpoint may require auth/PO token, proceed smoothly to robust yt-dlp extractor
        }
    }

    // 2. Secondary fallback: yt-dlp
    resolve_audio_stream_ytdlp(video_id).await
}
