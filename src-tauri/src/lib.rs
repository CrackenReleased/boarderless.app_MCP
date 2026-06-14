// src-tauri/src/lib.rs
use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use tauri::{Manager, State};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

struct AppState {
    child: Arc<Mutex<Option<Child>>>,
    server_path: PathBuf,
}

#[tauri::command]
fn get_server_path(state: State<'_, AppState>) -> String {
    state.server_path.to_string_lossy().to_string()
}

fn launch_browser_impl(profile_type: &str) {
    let exe_path = if cfg!(target_os = "windows") {
        let paths = vec![
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ];
        paths.into_iter().find(|p| std::path::Path::new(p).exists()).unwrap_or("chrome.exe")
    } else if cfg!(target_os = "macos") {
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    } else {
        "google-chrome"
    };

    let is_edge = exe_path.to_lowercase().contains("edge") || exe_path.to_lowercase().contains("msedge");
    let mut cmd = Command::new(exe_path);
    cmd.arg("--remote-debugging-port=9222")
       .arg("--no-first-run")
       .arg("--no-default-browser-check");

    if profile_type == "personal" {
        // Use default Chrome/Edge profile directory
        if cfg!(target_os = "windows") {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let sub_dir = if is_edge { "Microsoft\\Edge\\User Data" } else { "Google\\Chrome\\User Data" };
                let profile_path = std::path::Path::new(&local_app_data).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else if cfg!(target_os = "macos") {
            if let Ok(home) = std::env::var("HOME") {
                let sub_dir = if is_edge { "Library/Application Support/Microsoft Edge" } else { "Library/Application Support/Google/Chrome" };
                let profile_path = std::path::Path::new(&home).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else {
            if let Ok(home) = std::env::var("HOME") {
                let sub_dir = if is_edge { ".config/microsoft-edge" } else { ".config/google-chrome" };
                let profile_path = std::path::Path::new(&home).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        }
    } else {
        // Isolated profile directory
        if cfg!(target_os = "windows") {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let profile_path = std::path::Path::new(&local_app_data).join("boarderless-mcp-profile");
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else if cfg!(target_os = "macos") {
            if let Ok(home) = std::env::var("HOME") {
                let profile_path = std::path::Path::new(&home).join("Library/Application Support/boarderless-mcp-profile");
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else {
            if let Ok(home) = std::env::var("HOME") {
                let profile_path = std::path::Path::new(&home).join(".boarderless-mcp-profile");
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        }
    }

    cmd.arg("https://boarderless.app/canvas");
    let _ = cmd.spawn();
}

#[tauri::command]
fn launch_browser(profile_type: String) {
    launch_browser_impl(&profile_type);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_server_path, launch_browser])
        .setup(|app| {
            let resource_dir = app.path().resource_dir().unwrap_or_default();
            let mut server_path = resource_dir.join("mcp-stdio-server.js");
            if !server_path.exists() {
                server_path = std::env::current_dir().unwrap_or_default().join("mcp-stdio-server.js");
            }

            // Spawn the node MCP server in background
            let child = Command::new("node")
                .arg(&server_path)
                .spawn()
                .ok();

            let state = AppState {
                child: Arc::new(Mutex::new(child)),
                server_path,
            };
            app.manage(state);

            // System Tray Menu Setup
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let launch_i = MenuItem::with_id(app, "launch", "Launch Debug Browser", true, None::<&str>)?;
            let open_i = MenuItem::with_id(app, "open", "Show Control Panel", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &launch_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            if let Some(mut child) = state.child.lock().unwrap().take() {
                                let _ = child.kill();
                            }
                        }
                        app.exit(0);
                    }
                    "launch" => {
                        launch_browser_impl("personal");
                    }
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Instead of closing the app, hide the window so it stays in system tray
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
