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

fn find_ytdlp_path() -> Option<PathBuf> {
    // 1. Check relative to current exe
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let p1 = exe_dir.join("bin").join("yt-dlp.exe");
            if p1.exists() {
                return Some(p1);
            }
            let p2 = exe_dir.join("yt-dlp.exe");
            if p2.exists() {
                return Some(p2);
            }
        }
    }

    // 2. Check current working directory
    let cwd_paths = [
        PathBuf::from("src-tauri/bin/yt-dlp.exe"),
        PathBuf::from("bin/yt-dlp.exe"),
        PathBuf::from("yt-dlp.exe"),
    ];
    for p in &cwd_paths {
        if p.exists() {
            return Some(p.clone());
        }
    }

    // 3. Check system PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join("yt-dlp.exe");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // 4. Check %TEMP%\yt-dlp.exe
    if let Ok(temp) = std::env::var("TEMP") {
        let candidate = PathBuf::from(temp).join("yt-dlp.exe");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    None
}

pub async fn resolve_audio_stream(video_id: &str) -> Result<StreamInfo, String> {
    let ytdlp = find_ytdlp_path()
        .ok_or_else(|| "yt-dlp binary not found in bin/ or PATH".to_string())?;

    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let output = Command::new(&ytdlp)
        .args([
            "-j",
            "--no-playlist",
            "-f",
            "ba/b",
            &url,
        ])
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
