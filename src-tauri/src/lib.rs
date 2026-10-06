pub mod search;
pub mod stream;

use search::Track;
use stream::StreamInfo;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            search_music,
            get_stream_url,
            get_client_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tubify tauri application");
}
