pub mod auth;
pub mod discord;
pub mod downloader;
pub mod media;
pub mod search;
pub mod stream;
pub mod updater;

use auth::{AlbumDetails, ArtistDetails, Playlist, PlaylistTracksResult, UserProfile};
use search::Track;
use stream::StreamInfo;
use tauri::{AppHandle, Manager};





#[tauri::command]
async fn search_music(query: String, language: Option<String>) -> Result<Vec<Track>, String> {
    search::search_youtube_music(&query, language.as_deref()).await
}

#[tauri::command]
async fn get_stream_url(
    video_id: Option<String>,
    id: Option<String>,
    quality_preference: Option<String>,
) -> Result<StreamInfo, String> {
    let vid = video_id.or(id).ok_or_else(|| "Video ID is required".to_string())?;
    stream::resolve_audio_stream(&vid, quality_preference.as_deref()).await
}

#[tauri::command]
async fn get_playback_tracking(video_id: String) -> Result<Option<stream::PlaybackTracking>, String> {
    Ok(stream::fetch_playback_tracking(&video_id).await)
}

#[tauri::command]
async fn send_playback_ping(playback_url: String, cpn: String) -> Result<(), String> {
    tokio::spawn(async move {
        let _ = stream::ping_playback(&playback_url, &cpn).await;
    });
    Ok(())
}

#[tauri::command]
async fn send_watchtime_ping(
    watchtime_url: String,
    cpn: String,
    len: f64,
    cmt: f64,
) -> Result<(), String> {
    tokio::spawn(async move {
        let _ = stream::ping_watchtime(&watchtime_url, &cpn, len, cmt).await;
    });
    Ok(())
}

#[tauri::command]
fn get_client_version() -> String {
    "Tubify v0.1.0 (Ultra-lightweight)".to_string()
}

#[tauri::command]
fn get_user_profile() -> UserProfile {
    auth::get_current_user_profile()
}

#[tauri::command]
async fn save_google_cookie(cookie: String) -> Result<UserProfile, String> {
    auth::verify_and_save_cookie(&cookie).await
}

#[tauri::command]
fn logout_google() -> Result<(), String> {
    auth::clear_session_file();
    Ok(())
}

#[tauri::command]
async fn get_yt_liked_songs() -> Result<Vec<Track>, String> {
    auth::fetch_liked_songs().await
}

#[tauri::command]
async fn get_yt_playlists() -> Result<Vec<Playlist>, String> {
    auth::fetch_user_playlists().await
}

#[tauri::command]
async fn toggle_yt_like(video_id: String, like: bool) -> Result<(), String> {
    auth::toggle_like_yt(&video_id, like).await
}

#[tauri::command]
async fn create_yt_playlist(
    title: String,
    description: Option<String>,
    privacy_status: Option<String>,
) -> Result<String, String> {
    auth::create_playlist(&title, description.as_deref(), privacy_status.as_deref()).await
}

#[tauri::command]
async fn delete_yt_playlist(playlist_id: String) -> Result<(), String> {
    auth::delete_playlist(&playlist_id).await
}

#[tauri::command]
async fn edit_yt_playlist(
    playlist_id: String,
    title: Option<String>,
    description: Option<String>,
    privacy_status: Option<String>,
) -> Result<(), String> {
    auth::edit_playlist(
        &playlist_id,
        title.as_deref(),
        description.as_deref(),
        privacy_status.as_deref(),
    )
    .await
}

#[tauri::command]
async fn add_track_to_playlist(playlist_id: String, video_id: String) -> Result<(), String> {
    auth::add_track_to_playlist(&playlist_id, &video_id).await
}

#[tauri::command]
async fn remove_track_from_playlist(
    playlist_id: String,
    video_id: String,
    set_video_id: Option<String>,
) -> Result<(), String> {
    auth::remove_track_from_playlist(&playlist_id, &video_id, set_video_id.as_deref()).await
}

#[tauri::command]
async fn open_google_login(app: AppHandle) -> Result<(), String> {
    auth::open_login_webview(app).await
}

#[tauri::command]
async fn check_login_status(app: AppHandle) -> Result<UserProfile, String> {
    if let Some(win) = app.get_webview_window("google_login_window") {
        if let Ok(profile) = auth::check_and_sync_cookies(&win).await {
            let _ = win.close();
            return Ok(profile);
        }
    }
    let current = auth::get_current_user_profile();
    if current.is_authenticated {
        Ok(current)
    } else {
        Err("Oturum henüz algılanamadı. Giriş yaptıktan sonra tekrar deneyin veya çerez yapıştırın.".to_string())
    }
}

#[tauri::command]
async fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(&url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_playlist_tracks(playlist_id: String) -> Result<Vec<Track>, String> {
    auth::fetch_playlist_tracks(&playlist_id).await
}

#[tauri::command]
async fn get_playlist_tracks_page(
    playlist_id: String,
    continuation: Option<String>,
) -> Result<PlaylistTracksResult, String> {
    auth::fetch_playlist_tracks_page(&playlist_id, continuation.as_deref()).await
}

#[tauri::command]
async fn get_artist_details(browse_id: String) -> Result<ArtistDetails, String> {
    auth::fetch_artist_details(&browse_id).await
}

#[tauri::command]
async fn get_album_details(browse_id: String) -> Result<AlbumDetails, String> {
    auth::fetch_album_details(&browse_id).await
}

#[tauri::command]
async fn get_radio_tracks(video_id: String) -> Result<Vec<Track>, String> {
    auth::fetch_radio_tracks(&video_id).await
}

#[tauri::command]
async fn get_home_feed(continuation: Option<String>) -> Result<auth::HomeFeedResult, String> {
    auth::fetch_home_feed(continuation.as_deref()).await
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) {
    if let Ok(is_max) = window.is_maximized() {
        if is_max {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
async fn update_discord_presence(
    discord: tauri::State<'_, discord::DiscordRpcManager>,
    activity_data: discord::DiscordActivityData,
) -> Result<(), String> {
    let rpc = discord.inner().clone();
    tokio::task::spawn_blocking(move || rpc.update_presence(activity_data))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn clear_discord_presence(
    discord: tauri::State<'_, discord::DiscordRpcManager>,
) -> Result<(), String> {
    let rpc = discord.inner().clone();
    tokio::task::spawn_blocking(move || rpc.clear_presence())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn close_window(app: AppHandle, window: tauri::Window, discord: tauri::State<discord::DiscordRpcManager>) {
    use tauri_plugin_window_state::AppHandleExt;
    let _ = discord.clear_presence();
    let _ = app.save_window_state(
        tauri_plugin_window_state::StateFlags::all()
            & !tauri_plugin_window_state::StateFlags::VISIBLE,
    );
    let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load previously saved session if exists
    auth::load_saved_session();

    tauri::Builder::default()
        .manage(discord::DiscordRpcManager::new())
        .manage(updater::UpdaterState::default())
        .register_asynchronous_uri_scheme_protocol("tubify-local", |ctx, req, resp| {
            let app = ctx.app_handle();
            downloader::handle_uri_scheme(app, req, resp);
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        & !tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .with_filter(|label| label == "main")
                .build(),
        )
        .setup(media::setup_system_tray_and_media)
        .invoke_handler(tauri::generate_handler![
            search_music,
            get_stream_url,
            get_playback_tracking,
            send_playback_ping,
            send_watchtime_ping,
            get_client_version,
            get_user_profile,
            save_google_cookie,
            logout_google,
            get_yt_liked_songs,
            get_yt_playlists,
            get_playlist_tracks,
            get_playlist_tracks_page,
            get_artist_details,
            get_album_details,
            get_radio_tracks,
            get_home_feed,
            toggle_yt_like,
            create_yt_playlist,
            delete_yt_playlist,
            edit_yt_playlist,
            add_track_to_playlist,
            remove_track_from_playlist,
            open_google_login,
            check_login_status,
            open_external_url,
            minimize_window,
            toggle_maximize_window,
            close_window,
            update_discord_presence,
            clear_discord_presence,
            media::update_media_metadata,
            media::update_playback_status,
            downloader::start_download,
            downloader::cancel_download,
            downloader::get_downloaded_tracks,
            downloader::delete_downloaded_track,
            downloader::get_downloaded_audio_bytes,
            downloader::get_cached_library,
            downloader::delete_cached_track,
            downloader::get_cached_track_bytes,
            updater::check_for_updates,
            updater::install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tubify tauri application");
}
