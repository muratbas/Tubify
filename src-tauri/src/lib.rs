pub mod auth;
pub mod media;
pub mod search;
pub mod stream;

use auth::{AlbumDetails, ArtistDetails, Playlist, PlaylistTracksResult, UserProfile};
use search::Track;
use stream::StreamInfo;
use tauri::{AppHandle, Manager};





#[tauri::command]
async fn search_music(query: String) -> Result<Vec<Track>, String> {
    search::search_youtube_music(&query).await
}

#[tauri::command]
async fn get_stream_url(id: String) -> Result<StreamInfo, String> {
    stream::resolve_audio_stream(&id).await
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
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load previously saved session if exists
    auth::load_saved_session();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(media::setup_system_tray_and_media)
        .invoke_handler(tauri::generate_handler![
            search_music,
            get_stream_url,
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
            toggle_yt_like,
            create_yt_playlist,
            delete_yt_playlist,
            add_track_to_playlist,
            remove_track_from_playlist,
            open_google_login,
            check_login_status,
            open_external_url,
            minimize_window,
            toggle_maximize_window,
            close_window,
            media::update_media_metadata,
            media::update_playback_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tubify tauri application");
}
