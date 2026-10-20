use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    #[serde(default)]
    pub artist_id: Option<String>,
    pub album: Option<String>,
    #[serde(default)]
    pub album_id: Option<String>,
    pub duration: Option<String>,
    pub thumbnail: Option<String>,
    #[serde(default)]
    pub is_explicit: Option<bool>,
    #[serde(default)]
    pub set_video_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub query: String,
    pub tracks: Vec<Track>,
}

/// Search YouTube Music using reverse-engineered InnerTube API (WEB_REMIX client)
pub async fn search_youtube_music(query: &str) -> Result<Vec<Track>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let search_url = "https://music.youtube.com/youtubei/v1/search";
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "query": query
    });

    let res = client
        .post(search_url)
        .header("Referer", "https://music.youtube.com/")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut tracks = Vec::new();

    // Helper closure to parse a musicResponsiveListItemRenderer
    let parse_mrlir = |mrlir: &serde_json::Value| -> Option<Track> {
        let video_id = mrlir
            .pointer("/playlistItemData/videoId")
            .or_else(|| {
                mrlir.pointer(
                    "/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/navigationEndpoint/watchEndpoint/videoId",
                )
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

        // Check flexColumns 2 if present (often Album)
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

        // Fixed column duration fallback
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
            set_video_id: None,
        })
    };

    // Parse Music sections
    if let Some(contents) = json
        .pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
        .and_then(|v| v.as_array())
    {
        for section in contents {
            // Check itemSectionRenderer
            if let Some(items) = section.pointer("/itemSectionRenderer/contents").and_then(|v| v.as_array()) {
                for item in items {
                    if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                        if let Some(t) = parse_mrlir(mrlir) {
                            if !tracks.iter().any(|existing: &Track| existing.id == t.id) {
                                tracks.push(t);
                            }
                        }
                    }
                }
            }

            // Check musicShelfRenderer
            if let Some(items) = section.pointer("/musicShelfRenderer/contents").and_then(|v| v.as_array()) {
                for item in items {
                    if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                        if let Some(t) = parse_mrlir(mrlir) {
                            if !tracks.iter().any(|existing: &Track| existing.id == t.id) {
                                tracks.push(t);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(tracks)
}
