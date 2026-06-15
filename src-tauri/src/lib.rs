// src-tauri/src/lib.rs
use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use tauri::{Manager, State};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

struct AppState {
    child: Arc<Mutex<Option<Child>>>,
    browser_child: Arc<Mutex<Option<Child>>>,
    server_path: PathBuf,
}

#[derive(serde::Serialize)]
struct BrowserInfo {
    name: String,
    id: String,
    path: String,
}

#[tauri::command]
fn get_server_path(state: State<'_, AppState>) -> String {
    state.server_path.to_string_lossy().to_string()
}

#[tauri::command]
fn get_installed_browsers() -> Vec<BrowserInfo> {
    let mut browsers = Vec::new();
    
    let checks = vec![
        ("Google Chrome", "chrome", if cfg!(target_os = "windows") {
            vec![
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            ]
        } else if cfg!(target_os = "macos") {
            vec!["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        } else {
            vec!["google-chrome"]
        }),
        ("Microsoft Edge", "edge", if cfg!(target_os = "windows") {
            vec![
                "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
                "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            ]
        } else if cfg!(target_os = "macos") {
            vec!["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
        } else {
            vec!["microsoft-edge"]
        }),
        ("Brave", "brave", if cfg!(target_os = "windows") {
            vec![
                "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
                "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
            ]
        } else if cfg!(target_os = "macos") {
            vec!["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"]
        } else {
            vec!["brave-browser"]
        }),
        ("Opera", "opera", if cfg!(target_os = "windows") {
            vec![
                "C:\\Program Files\\Opera\\launcher.exe",
                "C:\\Program Files (x86)\\Opera\\launcher.exe",
            ]
        } else if cfg!(target_os = "macos") {
            vec!["/Applications/Opera.app/Contents/MacOS/Opera"]
        } else {
            vec!["opera"]
        }),
    ];

    #[cfg(target_os = "windows")]
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();

    for (name, id, paths) in checks {
        let mut found_path = None;
        for p in paths {
            if std::path::Path::new(p).exists() {
                found_path = Some(p.to_string());
                break;
            }
        }
        
        #[cfg(target_os = "windows")]
        if found_path.is_none() && !local_app_data.is_empty() {
            let local_path = match id {
                "chrome" => Some(std::path::Path::new(&local_app_data).join("Google\\Chrome\\Application\\chrome.exe")),
                "brave" => Some(std::path::Path::new(&local_app_data).join("BraveSoftware\\Brave-Browser\\Application\\brave.exe")),
                "opera" => Some(std::path::Path::new(&local_app_data).join("Programs\\Opera\\launcher.exe")),
                _ => None,
            };
            if let Some(lp) = local_path {
                if lp.exists() {
                    found_path = Some(lp.to_string_lossy().to_string());
                }
            }
        }

        if let Some(path) = found_path {
            browsers.push(BrowserInfo {
                name: name.to_string(),
                id: id.to_string(),
                path,
            });
        }
    }

    if browsers.is_empty() {
        browsers.push(BrowserInfo {
            name: "Google Chrome".to_string(),
            id: "chrome".to_string(),
            path: "chrome.exe".to_string(),
        });
    }

    browsers
}

fn launch_browser_impl(profile_type: &str, mode: &str, browser_name: &str) -> Option<Child> {
    let exe_path = if cfg!(target_os = "windows") {
        match browser_name {
            "edge" => {
                let paths = vec![
                    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
                ];
                paths.into_iter().find(|p| std::path::Path::new(p).exists()).unwrap_or("msedge.exe").to_string()
            }
            "brave" => {
                let mut path = "brave.exe".to_string();
                let paths = vec![
                    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
                    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
                ];
                for p in paths {
                    if std::path::Path::new(p).exists() {
                        path = p.to_string();
                        break;
                    }
                }
                if path == "brave.exe" {
                    if let Ok(la) = std::env::var("LOCALAPPDATA") {
                        let lp = std::path::Path::new(&la).join("BraveSoftware\\Brave-Browser\\Application\\brave.exe");
                        if lp.exists() {
                            path = lp.to_string_lossy().to_string();
                        }
                    }
                }
                path
            }
            "opera" => {
                let mut path = "launcher.exe".to_string();
                let paths = vec![
                    "C:\\Program Files\\Opera\\launcher.exe",
                    "C:\\Program Files (x86)\\Opera\\launcher.exe",
                ];
                for p in paths {
                    if std::path::Path::new(p).exists() {
                        path = p.to_string();
                        break;
                    }
                }
                if path == "launcher.exe" {
                    if let Ok(la) = std::env::var("LOCALAPPDATA") {
                        let lp = std::path::Path::new(&la).join("Programs\\Opera\\launcher.exe");
                        if lp.exists() {
                            path = lp.to_string_lossy().to_string();
                        }
                    }
                }
                path
            }
            _ => { // "chrome"
                let mut path = "chrome.exe".to_string();
                let paths = vec![
                    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
                ];
                for p in paths {
                    if std::path::Path::new(p).exists() {
                        path = p.to_string();
                        break;
                    }
                }
                if path == "chrome.exe" {
                    if let Ok(la) = std::env::var("LOCALAPPDATA") {
                        let lp = std::path::Path::new(&la).join("Google\\Chrome\\Application\\chrome.exe");
                        if lp.exists() {
                            path = lp.to_string_lossy().to_string();
                        }
                    }
                }
                path
            }
        }
    } else if cfg!(target_os = "macos") {
        match browser_name {
            "edge" => "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge".to_string(),
            "brave" => "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser".to_string(),
            "opera" => "/Applications/Opera.app/Contents/MacOS/Opera".to_string(),
            _ => "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome".to_string(),
        }
    } else {
        match browser_name {
            "edge" => "microsoft-edge".to_string(),
            "brave" => "brave-browser".to_string(),
            "opera" => "opera".to_string(),
            _ => "google-chrome".to_string(),
        }
    };

    let is_edge = browser_name == "edge";
    let is_brave = browser_name == "brave";
    let is_opera = browser_name == "opera";

    let mut cmd = Command::new(exe_path);
    
    if mode == "debug" {
        cmd.arg("--remote-debugging-port=9222");
    }
    if std::env::var("BOARDERLESS_MCP_HEADLESS").unwrap_or_default() == "true" {
        cmd.arg("--headless=new");
    }
    cmd.arg("--no-first-run")
       .arg("--no-default-browser-check");

    if profile_type == "personal" {
        if cfg!(target_os = "windows") {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let sub_dir = if is_edge {
                    "Microsoft\\Edge\\User Data"
                } else if is_brave {
                    "BraveSoftware\\Brave-Browser\\User Data"
                } else if is_opera {
                    "Opera Software\\Opera Stable"
                } else {
                    "Google\\Chrome\\User Data"
                };
                let profile_path = std::path::Path::new(&local_app_data).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else if cfg!(target_os = "macos") {
            if let Ok(home) = std::env::var("HOME") {
                let sub_dir = if is_edge {
                    "Library/Application Support/Microsoft Edge"
                } else if is_brave {
                    "Library/Application Support/BraveSoftware/Brave-Browser"
                } else if is_opera {
                    "Library/Application Support/com.operasoftware.Opera"
                } else {
                    "Library/Application Support/Google/Chrome"
                };
                let profile_path = std::path::Path::new(&home).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else {
            if let Ok(home) = std::env::var("HOME") {
                let sub_dir = if is_edge {
                    ".config/microsoft-edge"
                } else if is_brave {
                    ".config/BraveSoftware/Brave-Browser"
                } else if is_opera {
                    ".config/opera"
                } else {
                    ".config/google-chrome"
                };
                let profile_path = std::path::Path::new(&home).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        }
    } else {
        if cfg!(target_os = "windows") {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let sub_dir = if is_edge {
                    "boarderless-mcp-edge-profile"
                } else if is_brave {
                    "boarderless-mcp-brave-profile"
                } else if is_opera {
                    "boarderless-mcp-opera-profile"
                } else {
                    "boarderless-mcp-profile"
                };
                let profile_path = std::path::Path::new(&local_app_data).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else if cfg!(target_os = "macos") {
            if let Ok(home) = std::env::var("HOME") {
                let sub_dir = if is_edge {
                    "Library/Application Support/boarderless-mcp-edge-profile"
                } else if is_brave {
                    "Library/Application Support/boarderless-mcp-brave-profile"
                } else if is_opera {
                    "Library/Application Support/boarderless-mcp-opera-profile"
                } else {
                    "Library/Application Support/boarderless-mcp-profile"
                };
                let profile_path = std::path::Path::new(&home).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        } else {
            if let Ok(home) = std::env::var("HOME") {
                let sub_dir = if is_edge {
                    ".boarderless-mcp-edge-profile"
                } else if is_brave {
                    ".boarderless-mcp-brave-profile"
                } else if is_opera {
                    ".boarderless-mcp-opera-profile"
                } else {
                    ".boarderless-mcp-profile"
                };
                let profile_path = std::path::Path::new(&home).join(sub_dir);
                cmd.arg(format!("--user-data-dir={}", profile_path.to_string_lossy()));
            }
        }
    }

    cmd.arg("https://boarderless.app/canvas");
    cmd.spawn().ok()
}

#[tauri::command]
fn launch_browser(profile_type: String, mode: String, browser_name: String, state: State<'_, AppState>) {
    if let Some(mut old_child) = state.browser_child.lock().unwrap().take() {
        let _ = old_child.kill();
    }
    if let Some(child) = launch_browser_impl(&profile_type, &mode, &browser_name) {
        *state.browser_child.lock().unwrap() = Some(child);
    }
}

#[tauri::command]
fn kill_active_browser(state: State<'_, AppState>) {
    if let Some(mut old_child) = state.browser_child.lock().unwrap().take() {
        let _ = old_child.kill();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_server_path, launch_browser, kill_active_browser, get_installed_browsers])
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
                browser_child: Arc::new(Mutex::new(None)),
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
                            if let Some(mut b_child) = state.browser_child.lock().unwrap().take() {
                                let _ = b_child.kill();
                            }
                        }
                        app.exit(0);
                    }
                    "launch" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            if let Some(mut old_child) = state.browser_child.lock().unwrap().take() {
                                let _ = old_child.kill();
                            }
                            if let Some(child) = launch_browser_impl("personal", "debug", "chrome") {
                                *state.browser_child.lock().unwrap() = Some(child);
                            }
                        }
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
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
