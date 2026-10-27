use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;

// Official verified YouTube Music Discord Application Client ID
pub const DISCORD_CLIENT_ID: &str = "1177081335727267940";

#[derive(Deserialize, Debug, Clone)]
pub struct DiscordActivityData {
    pub title: String,
    pub artist: String,
    pub album_cover_url: Option<String>,
    pub is_playing: bool,
    pub current_time_sec: Option<f64>,
    pub duration_sec: Option<f64>,
}

struct DiscordRpcInner {
    client: Mutex<Option<DiscordIpcClient>>,
    last_fail_instant: Mutex<Option<Instant>>,
}

#[derive(Clone)]
pub struct DiscordRpcManager {
    inner: Arc<DiscordRpcInner>,
}

impl DiscordRpcManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(DiscordRpcInner {
                client: Mutex::new(None),
                last_fail_instant: Mutex::new(None),
            }),
        }
    }

    pub fn update_presence(&self, data: DiscordActivityData) -> Result<(), String> {
        // If not playing (paused or stopped), clear the Discord presence immediately
        if !data.is_playing {
            return self.clear_presence();
        }

        // Enforce cooldown if a recent connection attempt failed
        {
            if let Ok(guard) = self.inner.last_fail_instant.lock() {
                if let Some(fail_time) = *guard {
                    if fail_time.elapsed() < Duration::from_secs(10) {
                        return Ok(());
                    }
                }
            }
        }

        let mut client_lock = self
            .inner
            .client
            .lock()
            .map_err(|_| "Failed to lock Discord RPC state".to_string())?;

        // If not connected, try connecting
        if client_lock.is_none() {
            match DiscordIpcClient::new(DISCORD_CLIENT_ID) {
                Ok(mut new_client) => {
                    if new_client.connect().is_ok() {
                        *client_lock = Some(new_client);
                    } else {
                        // Discord not running or connection refused - record cooldown and return silently
                        if let Ok(mut fail_guard) = self.inner.last_fail_instant.lock() {
                            *fail_guard = Some(Instant::now());
                        }
                        return Ok(());
                    }
                }
                Err(_) => {
                    return Ok(());
                }
            }
        }

        let title = if data.title.trim().is_empty() {
            "Müzik Dinliyor".to_string()
        } else {
            data.title.trim().to_string()
        };

        let artist = if data.artist.trim().is_empty() {
            "Bilinmeyen Sanatçı".to_string()
        } else {
            data.artist.trim().to_string()
        };

        let mut act = activity::Activity::new()
            .activity_type(activity::ActivityType::Listening)
            .details(&title)
            .state(&artist);

        // Assets: Attach album cover image with title and artist tooltip
        let mut assets = activity::Assets::new();
        let mut has_assets = false;

        let display_meta = format!("{title} • {artist}");
        if let Some(cover_url) = data.album_cover_url.as_deref().filter(|s| s.starts_with("http")) {
            assets = assets.large_image(cover_url).large_text(&display_meta);
            has_assets = true;
        }

        if has_assets {
            act = act.assets(assets);
        }

        // Live countdown timestamps to render the interactive playerbar (00:02 ————— 03:58)
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        let current_sec = data.current_time_sec.unwrap_or(0.0).max(0.0) as i64;
        let start_ts = now.saturating_sub(current_sec);

        let duration_sec = data.duration_sec.unwrap_or(0.0).max(0.0) as i64;
        if duration_sec > 0 {
            let end_ts = start_ts + duration_sec;
            if end_ts > now {
                let timestamps = activity::Timestamps::new().start(start_ts).end(end_ts);
                act = act.timestamps(timestamps);
            } else {
                let timestamps = activity::Timestamps::new().start(start_ts);
                act = act.timestamps(timestamps);
            }
        } else {
            let timestamps = activity::Timestamps::new().start(start_ts);
            act = act.timestamps(timestamps);
        }

        if let Some(client) = client_lock.as_mut() {
            if let Err(err) = client.set_activity(act) {
                eprintln!("[Discord RPC] Failed to set activity: {:?}. Resetting client.", err);
                *client_lock = None;
                if let Ok(mut fail_guard) = self.inner.last_fail_instant.lock() {
                    *fail_guard = Some(Instant::now());
                }
            }
        }

        Ok(())
    }

    pub fn clear_presence(&self) -> Result<(), String> {
        let mut client_lock = self
            .inner
            .client
            .lock()
            .map_err(|_| "Failed to lock Discord RPC state".to_string())?;

        if let Some(client) = client_lock.as_mut() {
            if let Err(err) = client.clear_activity() {
                eprintln!("[Discord RPC] Failed to clear activity: {:?}. Resetting client.", err);
                *client_lock = None;
            }
        }

        Ok(())
    }
}
