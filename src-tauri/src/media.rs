use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

#[cfg(target_os = "windows")]
#[derive(Clone, Copy)]
pub struct TaskbarIcons {
    pub prev: isize,
    pub play: isize,
    pub pause: isize,
    pub next: isize,
}

pub struct MediaState {
    pub smtc: Mutex<Option<souvlaki::MediaControls>>,
    #[cfg(target_os = "windows")]
    pub main_hwnd: Mutex<Option<isize>>,
    #[cfg(target_os = "windows")]
    pub icons: Mutex<Option<TaskbarIcons>>,
}

#[derive(serde::Deserialize)]
pub struct MediaMetadataPayload {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub cover_url: Option<String>,
    pub duration_secs: Option<u64>,
    pub is_playing: bool,
}

#[cfg(target_os = "windows")]
fn create_hicon_from_png(bytes: &[u8]) -> Option<windows::Win32::UI::WindowsAndMessaging::HICON> {
    use windows::Win32::UI::WindowsAndMessaging::{CreateIconFromResourceEx, IMAGE_FLAGS};
    unsafe {
        CreateIconFromResourceEx(
            bytes,
            true,
            0x00030000,
            0,
            0,
            IMAGE_FLAGS(0),
        ).ok()
    }
}

#[cfg(target_os = "windows")]
fn str_to_tip(s: &str) -> [u16; 260] {
    let mut tip = [0u16; 260];
    for (i, c) in s.encode_utf16().take(259).enumerate() {
        tip[i] = c;
    }
    tip
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn thumbbar_subclass_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
    _uidsubclass: usize,
    refdata: usize,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::Shell::DefSubclassProc;

    const WM_COMMAND: u32 = 0x0111;
    const THBN_CLICKED: u16 = 0x1800;

    if msg == WM_COMMAND {
        let hiword = ((wparam.0 >> 16) & 0xffff) as u16;
        let loword = (wparam.0 & 0xffff) as u16;

        if hiword == THBN_CLICKED {
            let app = &*(refdata as *const AppHandle);
            match loword {
                100 => {
                    let _ = app.emit("player-previous", ());
                }
                101 => {
                    let _ = app.emit("player-toggle-play", ());
                }
                102 => {
                    let _ = app.emit("player-next", ());
                }
                _ => {}
            }
        }
    }

    DefSubclassProc(hwnd, msg, wparam, lparam)
}

#[cfg(target_os = "windows")]
fn update_thumbbar_buttons(hwnd_val: isize, is_playing: bool, icons: TaskbarIcons) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
    use windows::Win32::UI::Shell::{
        ITaskbarList3, TaskbarList, THUMBBUTTON, THBF_ENABLED, THB_FLAGS, THB_ICON, THB_TOOLTIP,
    };
    use windows::Win32::UI::WindowsAndMessaging::HICON;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        if let Ok(taskbar) = CoCreateInstance::<_, ITaskbarList3>(&TaskbarList, None, CLSCTX_INPROC_SERVER) {
            let _ = taskbar.HrInit();

            let btn_prev = THUMBBUTTON {
                dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                iId: 100,
                hIcon: HICON(icons.prev as *mut _),
                szTip: str_to_tip("Önceki Parça"),
                dwFlags: THBF_ENABLED,
                ..Default::default()
            };

            let btn_play = THUMBBUTTON {
                dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                iId: 101,
                hIcon: if is_playing {
                    HICON(icons.pause as *mut _)
                } else {
                    HICON(icons.play as *mut _)
                },
                szTip: str_to_tip(if is_playing { "Duraklat" } else { "Oynat" }),
                dwFlags: THBF_ENABLED,
                ..Default::default()
            };

            let btn_next = THUMBBUTTON {
                dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                iId: 102,
                hIcon: HICON(icons.next as *mut _),
                szTip: str_to_tip("Sonraki Parça"),
                dwFlags: THBF_ENABLED,
                ..Default::default()
            };

            let buttons = [btn_prev, btn_play, btn_next];
            let res = taskbar.ThumbBarUpdateButtons(HWND(hwnd_val as *mut _), &buttons);
            if let Err(e) = res {
                eprintln!("[Tubify ThumbBar] ThumbBarUpdateButtons failed: {e:?}");
            }
        }
    }
}

pub fn setup_system_tray_and_media(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();

    // 1. Build Tray Menu Items (Only "Tubify'ı Göster" and "Kapat")
    let show_item = MenuItem::with_id(app, "show", "Tubify'ı Göster", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Kapat", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .separator()
        .item(&quit_item)
        .build()?;

    // 2. Build Tray Icon
    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Tubify")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.unminimize();
                        let _ = win.set_focus();
                    }
                }
                "quit" => {
                    use tauri_plugin_window_state::AppHandleExt;
                    let _ = app.save_window_state(
                        tauri_plugin_window_state::StateFlags::all()
                            & !tauri_plugin_window_state::StateFlags::VISIBLE,
                    );
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }

    let _tray = tray_builder.build(app)?;

    // 3. Setup SMTC via souvlaki & HWND
    #[cfg(target_os = "windows")]
    let (hwnd_ptr, hwnd_isize) = {
        use raw_window_handle::{HasWindowHandle, RawWindowHandle};
        if let Some(win) = app.get_webview_window("main") {
            if let Ok(handle) = win.window_handle() {
                match handle.as_raw() {
                    RawWindowHandle::Win32(win32) => {
                        let val = win32.hwnd.get();
                        (Some(val as *mut std::ffi::c_void), Some(val as isize))
                    }
                    _ => (None, None),
                }
            } else {
                (None, None)
            }
        } else {
            (None, None)
        }
    };

    #[cfg(not(target_os = "windows"))]
    let (hwnd_ptr, hwnd_isize): (Option<*mut std::ffi::c_void>, Option<isize>) = (None, None);

    // Set window icon explicitly for Windows Taskbar & Alt+Tab
    if let Some(win) = app.get_webview_window("main") {
        if let Some(icon) = app.default_window_icon() {
            let _ = win.set_icon(icon.clone());
        }
    }

    #[cfg(target_os = "windows")]
    if let Some(hwnd_val) = hwnd_isize {
        use windows::Win32::Foundation::{HWND, WPARAM, LPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{SendMessageW, WM_SETICON, ICON_BIG, ICON_SMALL};
        if let Some(hicon) = create_hicon_from_png(include_bytes!("../icons/icon.png")) {
            unsafe {
                SendMessageW(HWND(hwnd_val as *mut _), WM_SETICON, Some(WPARAM(ICON_BIG as usize)), Some(LPARAM(hicon.0 as isize)));
                SendMessageW(HWND(hwnd_val as *mut _), WM_SETICON, Some(WPARAM(ICON_SMALL as usize)), Some(LPARAM(hicon.0 as isize)));
            }
        }
    }

    let config = souvlaki::PlatformConfig {
        dbus_name: "tubify",
        display_name: "Tubify",
        hwnd: hwnd_ptr,
    };

    let smtc_controls = match souvlaki::MediaControls::new(config) {
        Ok(mut controls) => {
            let smtc_app = app_handle.clone();
            let attach_res = controls.attach(move |event: souvlaki::MediaControlEvent| {
                match event {
                    souvlaki::MediaControlEvent::Play => {
                        let _ = smtc_app.emit("media-control-action", "play");
                    }
                    souvlaki::MediaControlEvent::Pause => {
                        let _ = smtc_app.emit("media-control-action", "pause");
                    }
                    souvlaki::MediaControlEvent::Toggle => {
                        let _ = smtc_app.emit("player-toggle-play", ());
                    }
                    souvlaki::MediaControlEvent::Next => {
                        let _ = smtc_app.emit("player-next", ());
                    }
                    souvlaki::MediaControlEvent::Previous => {
                        let _ = smtc_app.emit("player-previous", ());
                    }
                    souvlaki::MediaControlEvent::Stop => {
                        let _ = smtc_app.emit("media-control-action", "pause");
                    }
                    _ => {}
                }
            });
            if let Err(e) = attach_res {
                eprintln!("[Tubify SMTC] Event attach failed: {e:?}");
            }
            Some(controls)
        }
        Err(e) => {
            eprintln!("[Tubify SMTC] Initialization failed: {e:?}");
            None
        }
    };

    // 4. Setup Windows Taskbar Thumbnail Toolbar Buttons (ITaskbarList3)
    #[cfg(target_os = "windows")]
    let taskbar_icons = if let Some(hwnd_val) = hwnd_isize {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
        use windows::Win32::UI::Shell::{
            ITaskbarList3, TaskbarList, THUMBBUTTON, THBF_ENABLED, THB_FLAGS, THB_ICON, THB_TOOLTIP,
            SetWindowSubclass,
        };

        let icon_prev = create_hicon_from_png(include_bytes!("../icons/thumb_prev.png"));
        let icon_play = create_hicon_from_png(include_bytes!("../icons/thumb_play.png"));
        let icon_pause = create_hicon_from_png(include_bytes!("../icons/thumb_pause.png"));
        let icon_next = create_hicon_from_png(include_bytes!("../icons/thumb_next.png"));

        if let (Some(ip), Some(ipl), Some(ips), Some(inxt)) = (icon_prev, icon_play, icon_pause, icon_next) {
            unsafe {
                // Initialize ITaskbarList3
                if let Ok(taskbar) = CoCreateInstance::<_, ITaskbarList3>(&TaskbarList, None, CLSCTX_INPROC_SERVER) {
                    let _ = taskbar.HrInit();

                    let btn_prev = THUMBBUTTON {
                        dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                        iId: 100,
                        hIcon: ip,
                        szTip: str_to_tip("Önceki Parça"),
                        dwFlags: THBF_ENABLED,
                        ..Default::default()
                    };
                    let btn_play = THUMBBUTTON {
                        dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                        iId: 101,
                        hIcon: ipl,
                        szTip: str_to_tip("Oynat"),
                        dwFlags: THBF_ENABLED,
                        ..Default::default()
                    };
                    let btn_next = THUMBBUTTON {
                        dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                        iId: 102,
                        hIcon: inxt,
                        szTip: str_to_tip("Sonraki Parça"),
                        dwFlags: THBF_ENABLED,
                        ..Default::default()
                    };

                    let buttons = [btn_prev, btn_play, btn_next];
                    let add_res = taskbar.ThumbBarAddButtons(HWND(hwnd_val as *mut _), &buttons);
                    if let Err(e) = add_res {
                        eprintln!("[Tubify ThumbBar] ThumbBarAddButtons: {e:?}");
                    }
                }

                // Subclass window to intercept WM_COMMAND
                let refdata = Box::into_raw(Box::new(app_handle.clone())) as usize;
                let sub_res = SetWindowSubclass(HWND(hwnd_val as *mut _), Some(thumbbar_subclass_proc), 1337, refdata);
                if !sub_res.as_bool() {
                    eprintln!("[Tubify ThumbBar] SetWindowSubclass failed");
                }
            }

            Some(TaskbarIcons {
                prev: ip.0 as isize,
                play: ipl.0 as isize,
                pause: ips.0 as isize,
                next: inxt.0 as isize,
            })
        } else {
            None
        }
    } else {
        None
    };

    // 5. Save to App State
    let media_state = MediaState {
        smtc: Mutex::new(smtc_controls),
        #[cfg(target_os = "windows")]
        main_hwnd: Mutex::new(hwnd_isize),
        #[cfg(target_os = "windows")]
        icons: Mutex::new(taskbar_icons),
    };
    app.manage(media_state);

    Ok(())
}

#[tauri::command]
pub fn update_media_metadata(
    app: AppHandle,
    state: tauri::State<'_, MediaState>,
    payload: MediaMetadataPayload,
) -> Result<(), String> {
    // 1. Update Tray Tooltip
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if !payload.title.is_empty() && !payload.artist.is_empty() {
            format!("{} - {}", payload.title, payload.artist)
        } else if !payload.title.is_empty() {
            payload.title.clone()
        } else {
            "Tubify".to_string()
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }

    // 2. Update SMTC (souvlaki)
    if let Ok(mut smtc_guard) = state.smtc.lock() {
        if let Some(ref mut controls) = *smtc_guard {
            let metadata = souvlaki::MediaMetadata {
                title: Some(&payload.title),
                album: payload.album.as_deref(),
                artist: Some(&payload.artist),
                cover_url: payload.cover_url.as_deref(),
                duration: payload.duration_secs.map(std::time::Duration::from_secs),
            };
            let _ = controls.set_metadata(metadata);

            let playback = if payload.is_playing {
                souvlaki::MediaPlayback::Playing { progress: None }
            } else {
                souvlaki::MediaPlayback::Paused { progress: None }
            };
            let _ = controls.set_playback(playback);
        }
    }

    // 3. Update Windows Taskbar Thumbnail Play/Pause Button
    #[cfg(target_os = "windows")]
    {
        let hwnd_opt = state.main_hwnd.lock().ok().and_then(|h| *h);
        let icons_opt = state.icons.lock().ok().and_then(|i| *i);
        if let (Some(hwnd_val), Some(icons)) = (hwnd_opt, icons_opt) {
            let is_playing = payload.is_playing;
            let _ = app.run_on_main_thread(move || {
                update_thumbbar_buttons(hwnd_val, is_playing, icons);
            });
        }
    }

    Ok(())
}

#[tauri::command]
pub fn update_playback_status(
    app: AppHandle,
    state: tauri::State<'_, MediaState>,
    is_playing: bool,
) -> Result<(), String> {
    // 1. Update SMTC
    if let Ok(mut smtc_guard) = state.smtc.lock() {
        if let Some(ref mut controls) = *smtc_guard {
            let playback = if is_playing {
                souvlaki::MediaPlayback::Playing { progress: None }
            } else {
                souvlaki::MediaPlayback::Paused { progress: None }
            };
            let _ = controls.set_playback(playback);
        }
    }

    // 2. Update Taskbar Thumbnail Toolbar
    #[cfg(target_os = "windows")]
    {
        let hwnd_opt = state.main_hwnd.lock().ok().and_then(|h| *h);
        let icons_opt = state.icons.lock().ok().and_then(|i| *i);
        if let (Some(hwnd_val), Some(icons)) = (hwnd_opt, icons_opt) {
            let _ = app.run_on_main_thread(move || {
                update_thumbbar_buttons(hwnd_val, is_playing, icons);
            });
        }
    }

    Ok(())
}
