use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<String>,
    pub thumbnail: Option<String>,
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
            let artist_parts: Vec<&str> = runs
                .iter()
                .filter_map(|r| r.get("text").and_then(|t| t.as_str()))
                .filter(|t| *t != "Song" && *t != " • " && *t != " & " && *t != ", ")
                .collect();
            if !artist_parts.is_empty() {
                artist = artist_parts.join(", ");
            }
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
            album: None,
            duration: None,
            thumbnail,
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
