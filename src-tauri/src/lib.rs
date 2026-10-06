pub mod auth;
pub mod search;
pub mod stream;

use auth::{Playlist, UserProfile};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load previously saved session if exists
    auth::load_saved_session();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            search_music,
            get_stream_url,
            get_client_version,
            get_user_profile,
            save_google_cookie,
            logout_google,
            get_yt_liked_songs,
            get_yt_playlists,
            toggle_yt_like,
            open_google_login,
            check_login_status,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tubify tauri application");
}
