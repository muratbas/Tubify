use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResponse {
    pub has_update: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub downloaded: usize,
    pub total: Option<u64>,
    pub percentage: Option<f64>,
}

#[derive(Clone, Default)]
pub struct UpdaterState {
    pub pending_update: Arc<Mutex<Option<Update>>>,
}

#[tauri::command]
pub async fn check_for_updates(
    app: AppHandle,
    state: tauri::State<'_, UpdaterState>,
) -> Result<UpdateCheckResponse, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        let version = Some(update.version.clone());
        let body = update.body.clone();
        let date = update.date.as_ref().map(|d| d.to_string());

        let mut lock = state.pending_update.lock().await;
        *lock = Some(update);

        Ok(UpdateCheckResponse {
            has_update: true,
            version,
            body,
            date,
        })
    } else {
        let mut lock = state.pending_update.lock().await;
        *lock = None;

        Ok(UpdateCheckResponse {
            has_update: false,
            version: None,
            body: None,
            date: None,
        })
    }
}

#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    state: tauri::State<'_, UpdaterState>,
) -> Result<(), String> {
    let update = {
        let mut lock = state.pending_update.lock().await;
        if let Some(u) = lock.take() {
            u
        } else {
            let updater = app.updater().map_err(|e| e.to_string())?;
            updater
                .check()
                .await
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "No update available".to_string())?
        }
    };

    let mut downloaded: usize = 0;
    let app_handle_for_progress = app.clone();

    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length;
                let percentage = content_length.map(|total| {
                    if total > 0 {
                        ((downloaded as f64 / total as f64) * 100.0).min(100.0)
                    } else {
                        0.0
                    }
                });
                let _ = app_handle_for_progress.emit(
                    "download-progress",
                    DownloadProgressPayload {
                        downloaded,
                        total: content_length,
                        percentage,
                    },
                );
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}
