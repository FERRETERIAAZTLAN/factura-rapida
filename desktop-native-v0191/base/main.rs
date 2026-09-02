#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs::OpenOptions;
use std::io::Write;
use std::panic;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

const UPDATE_ENDPOINT: &str =
    "https://github.com/FERRETERIAAZTLAN/factura-rapida/releases/latest/download/latest.json";

static UPDATER_READY: AtomicBool = AtomicBool::new(false);
static UPDATER_INIT_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopInfo {
    native: bool,
    version: String,
    updater_configured: bool,
    update_endpoint: String,
    platform: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheck {
    available: bool,
    current_version: String,
    version: Option<String>,
    notes: Option<String>,
    date: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateState {
    state: String,
    version: Option<String>,
    message: Option<String>,
    progress: Option<u8>,
}

fn write_startup_log(message: &str) {
    let path = std::env::temp_dir().join("factura-rapida-startup.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{}", message);
    }
}

fn updater_pubkey() -> Option<&'static str> {
    option_env!("FR_UPDATER_PUBKEY")
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn emit_update(
    app: &AppHandle,
    state: &str,
    version: Option<String>,
    message: Option<String>,
    progress: Option<u8>,
) {
    let _ = app.emit(
        "factura-update-state",
        UpdateState {
            state: state.to_string(),
            version,
            message,
            progress,
        },
    );
}

/// Registra el updater de forma perezosa.
/// IMPORTANTE: nunca se ejecuta durante el arranque de la aplicación.
/// Si falla, devuelve error al panel de Configuración sin cerrar Factura Rápida.
fn ensure_updater_plugin(app: &AppHandle) -> Result<(), String> {
    if UPDATER_READY.load(Ordering::Acquire) {
        return Ok(());
    }

    let _guard = UPDATER_INIT_LOCK
        .lock()
        .map_err(|_| "No se pudo iniciar el servicio de actualizaciones.".to_string())?;

    if UPDATER_READY.load(Ordering::Acquire) {
        return Ok(());
    }

    let pubkey = updater_pubkey()
        .ok_or_else(|| "El servicio de actualizaciones no está disponible.".to_string())?;

    app.plugin(
        tauri_plugin_updater::Builder::new()
            .pubkey(pubkey.to_string())
            .build(),
    )
    .map_err(|error| {
        write_startup_log(&format!("UPDATER_PLUGIN_ERROR: {error}"));
        "No se pudo iniciar el servicio de actualizaciones.".to_string()
    })?;

    UPDATER_READY.store(true, Ordering::Release);
    write_startup_log("UPDATER_PLUGIN_OK 0.1.4");
    Ok(())
}

fn build_updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    ensure_updater_plugin(app)?;

    let pubkey = updater_pubkey()
        .ok_or_else(|| "El servicio de actualizaciones no está disponible.".to_string())?;
    let endpoint = url::Url::parse(UPDATE_ENDPOINT).map_err(|e| e.to_string())?;

    app.updater_builder()
        .pubkey(pubkey)
        .endpoints(vec![endpoint])
        .map_err(|e| e.to_string())?
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn desktop_info(app: AppHandle) -> DesktopInfo {
    DesktopInfo {
        native: true,
        version: app.package_info().version.to_string(),
        // La disponibilidad se basa en que la clave pública esté integrada.
        // El plugin se inicializa solo cuando realmente se vaya a consultar.
        updater_configured: updater_pubkey().is_some(),
        update_endpoint: UPDATE_ENDPOINT.to_string(),
        platform: "Windows".to_string(),
    }
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<UpdateCheck, String> {
    let current_version = app.package_info().version.to_string();
    emit_update(&app, "checking", None, None, None);

    let updater = build_updater(&app).map_err(|error| {
        emit_update(&app, "disabled", None, Some(error.clone()), None);
        error
    })?;

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.to_string();
            let notes = update.body.clone();
            let date = update.date.map(|value| value.to_string());
            emit_update(
                &app,
                "available",
                Some(version.clone()),
                notes.clone(),
                None,
            );
            Ok(UpdateCheck {
                available: true,
                current_version,
                version: Some(version),
                notes,
                date,
            })
        }
        Ok(None) => {
            emit_update(&app, "current", None, None, None);
            Ok(UpdateCheck {
                available: false,
                current_version,
                version: None,
                notes: None,
                date: None,
            })
        }
        Err(error) => {
            let message = error.to_string();
            emit_update(&app, "error", None, Some(message.clone()), None);
            Err(message)
        }
    }
}

#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = build_updater(&app)?;
    emit_update(&app, "checking", None, None, None);

    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        emit_update(
            &app,
            "current",
            None,
            Some("Ya tienes la versión más reciente.".into()),
            None,
        );
        return Ok(());
    };

    let version = update.version.to_string();
    let progress_app = app.clone();
    let finished_app = app.clone();
    let version_progress = version.clone();
    let mut downloaded: u64 = 0;

    emit_update(
        &app,
        "downloading",
        Some(version.clone()),
        Some("Descargando actualización…".into()),
        Some(0),
    );

    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded = downloaded.saturating_add(chunk_length as u64);
                let progress = content_length
                    .filter(|total| *total > 0)
                    .map(|total| ((downloaded.saturating_mul(100) / total).min(100)) as u8);
                emit_update(
                    &progress_app,
                    "downloading",
                    Some(version_progress.clone()),
                    Some("Descargando actualización…".into()),
                    progress,
                );
            },
            move || {
                emit_update(
                    &finished_app,
                    "downloaded",
                    None,
                    Some("Descarga terminada. Instalando…".into()),
                    Some(100),
                );
            },
        )
        .await
        .map_err(|error| {
            let message = error.to_string();
            emit_update(&app, "error", Some(version), Some(message.clone()), None);
            message
        })?;

    Ok(())
}

fn main() {
    panic::set_hook(Box::new(|info| {
        write_startup_log(&format!("PANIC: {info}"));
    }));

    write_startup_log("START 0.1.4");

    // El updater NO se registra aquí.
    // La ventana abre primero y el servicio se inicializa bajo demanda.
    tauri::Builder::default()
        .setup(|_| {
            write_startup_log("SETUP_OK 0.1.4");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_info,
            check_for_updates,
            install_update
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| {
            write_startup_log(&format!("RUN_ERROR: {error}"));
        });
}
