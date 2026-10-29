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
    #[serde(default)]
    pub plays: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub query: String,
    pub tracks: Vec<Track>,
}

pub fn is_media_type_indicator(text: &str) -> bool {
    let lower = text.trim().to_lowercase();
    matches!(
        lower.as_str(),
        "song"
            | "songs"
            | "şarkı"
            | "şarkılar"
            | "video"
            | "videos"
            | "videolar"
            | "artist"
            | "artists"
            | "sanatçı"
            | "sanatçılar"
            | "album"
            | "albums"
            | "albüm"
            | "albümler"
            | "single"
            | "singles"
            | "tekli"
            | "tekliler"
            | "ep"
            | "podcast"
            | "podcasts"
    )
}

pub fn is_separator_or_empty(text: &str) -> bool {
    let trimmed = text.trim();
    trimmed.is_empty()
        || trimmed == "•"
        || trimmed == "·"
        || trimmed == "&"
        || trimmed == ","
        || trimmed == "|"
        || trimmed == "/"
        || trimmed == "-"
}

pub fn is_play_count_metric(text: &str, accessibility: &str) -> bool {
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

/// Search YouTube Music using reverse-engineered InnerTube API (WEB_REMIX client)
pub async fn search_youtube_music(query: &str, language: Option<&str>) -> Result<Vec<Track>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let session_opt = crate::auth::get_session_info();
    let (client, is_authenticated) = if let Some((ref cookie, ref sapisid)) = session_opt {
        match crate::auth::build_client(cookie, sapisid.as_deref()) {
            Ok((c, _)) => (c, true),
            Err(_) => {
                let c = reqwest::Client::builder()
                    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
                    .build()
                    .map_err(|e| e.to_string())?;
                (c, false)
            }
        }
    } else {
        let c = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .build()
            .map_err(|e| e.to_string())?;
        (c, false)
    };

    // If authenticated, fire background search history / suggest sync
    if is_authenticated {
        let client_clone = client.clone();
        let query_str = trimmed.to_string();
        tokio::spawn(async move {
            // 1. Ping YouTube suggest completion endpoint
            let encoded: String = url::form_urlencoded::byte_serialize(query_str.as_bytes()).collect();
            let suggest_url = format!(
                "https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q={}",
                encoded
            );
            let _ = client_clone
                .get(&suggest_url)
                .header("Referer", "https://music.youtube.com/")
                .header("Origin", "https://music.youtube.com")
                .send()
                .await;

            // 2. Ping YouTube Music search suggestions endpoint
            let suggest_post_url = "https://music.youtube.com/youtubei/v1/music/get_search_suggestions";
            let suggest_payload = serde_json::json!({
                "context": {
                    "client": {
                        "clientName": "WEB_REMIX",
                        "clientVersion": "1.20240401.01.00",
                        "hl": "tr",
                        "gl": "TR"
                    }
                },
                "input": query_str
            });
            let _ = client_clone
                .post(suggest_post_url)
                .json(&suggest_payload)
                .send()
                .await;
        });
    }

    let search_url = "https://music.youtube.com/youtubei/v1/search";
    let is_en = language == Some("en");
    let hl = if is_en { "en" } else { "tr" };
    let gl = if is_en { "US" } else { "TR" };
    let accept_lang = if is_en {
        "en-US,en;q=0.9"
    } else {
        "tr-TR,tr;q=0.9,en;q=0.8"
    };

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": hl,
                "gl": gl
            }
        },
        "query": trimmed
    });

    let res = client
        .post(search_url)
        .header("Referer", "https://music.youtube.com/")
        .header("Accept-Language", accept_lang)
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
        let mut plays: Option<String> = None;

        if let Some(runs) = mrlir
            .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs")
            .and_then(|v| v.as_array())
        {
            let mut artist_parts: Vec<&str> = Vec::new();
            for r in runs {
                let text = r.get("text").and_then(|t| t.as_str()).unwrap_or("").trim();
                let accessibility = r
                    .pointer("/accessibility/accessibilityData/label")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let b_id = r
                    .pointer("/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str());

                // Skip media type indicators like "Şarkı", "Song", "Video" and separators
                if is_media_type_indicator(text) || is_separator_or_empty(text) {
                    continue;
                }

                // Check if this run is a play count or view count metric
                if is_play_count_metric(text, accessibility) {
                    if plays.is_none() {
                        plays = Some(text.to_string());
                    }
                    continue;
                }

                // Check for duration (e.g. "3:45")
                if text.chars().all(|c| c.is_ascii_digit() || c == ':') && text.contains(':') {
                    duration = Some(text.to_string());
                    continue;
                }

                if let Some(bid) = b_id {
                    if bid.starts_with("UC") || bid.starts_with("FEmusic_artist") {
                        if artist_id.is_none() {
                            artist_id = Some(bid.to_string());
                        }
                        artist_parts.push(text);
                    } else if bid.starts_with("MPREb_")
                        || bid.starts_with("FEmusic_library_privately_owned_release")
                        || bid.starts_with("OLAK5uy_")
                    {
                        if album_id.is_none() {
                            album_id = Some(bid.to_string());
                            if album.is_none() && !text.is_empty() {
                                album = Some(text.to_string());
                            }
                        }
                    } else if album.is_none() {
                        album = Some(text.to_string());
                    }
                } else if artist_parts.is_empty() {
                    artist_parts.push(text);
                }
            }
            if !artist_parts.is_empty() {
                artist = artist_parts.join(", ");
            }
        }

        // Check flexColumns 2 if present (often Album, or play count metric if no album)
        if let Some(runs) = mrlir
            .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs")
            .and_then(|v| v.as_array())
        {
            for r in runs {
                let al = r.get("text").and_then(|t| t.as_str()).unwrap_or("").trim();
                let accessibility = r
                    .pointer("/accessibility/accessibilityData/label")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let b_id = r
                    .pointer("/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str());

                if is_media_type_indicator(al) || is_separator_or_empty(al) {
                    continue;
                }

                if is_play_count_metric(al, accessibility) {
                    if plays.is_none() {
                        plays = Some(al.to_string());
                    }
                    continue;
                }

                if let Some(bid) = b_id {
                    if bid.starts_with("MPREb_")
                        || bid.starts_with("FEmusic_library_privately_owned_release")
                        || bid.starts_with("OLAK5uy_")
                        || bid.starts_with("MP")
                    {
                        if album_id.is_none() {
                            album_id = Some(bid.to_string());
                        }
                        if album.is_none() {
                            album = Some(al.to_string());
                        }
                    }
                } else if album.is_none() && !al.is_empty() {
                    album = Some(al.to_string());
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
            plays,
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
