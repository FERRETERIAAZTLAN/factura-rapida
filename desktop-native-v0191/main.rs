#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serialport::{SerialPort, SerialPortType};
use std::fs::OpenOptions;
use std::io::{ErrorKind, Read, Write};
use std::panic;
use std::process::Command;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
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
    hardware_bridge: bool,
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SerialPortItem {
    port_name: String,
    port_type: String,
    manufacturer: Option<String>,
    product: Option<String>,
    serial_number: Option<String>,
    vid: Option<u16>,
    pid: Option<u16>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScaleReading {
    connected: bool,
    weight: Option<f64>,
    unit: Option<String>,
    raw: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterItem {
    name: String,
    driver_name: String,
    port_name: String,
    is_default: bool,
}

struct ScaleConnection {
    port: Box<dyn SerialPort>,
    buffer: String,
    last: Option<ScaleReading>,
}

#[derive(Default)]
struct HardwareState {
    scale: Mutex<Option<ScaleConnection>>,
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
    write_startup_log("UPDATER_PLUGIN_OK");
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

fn serial_type(port_type: &SerialPortType) -> String {
    match port_type {
        SerialPortType::UsbPort(_) => "usb".to_string(),
        SerialPortType::BluetoothPort => "bluetooth".to_string(),
        SerialPortType::PciPort => "pci".to_string(),
        SerialPortType::Unknown => "unknown".to_string(),
    }
}

fn serial_item(info: serialport::SerialPortInfo) -> SerialPortItem {
    let mut manufacturer = None;
    let mut product = None;
    let mut serial_number = None;
    let mut vid = None;
    let mut pid = None;
    if let SerialPortType::UsbPort(usb) = &info.port_type {
        manufacturer = usb.manufacturer.clone();
        product = usb.product.clone();
        serial_number = usb.serial_number.clone();
        vid = Some(usb.vid);
        pid = Some(usb.pid);
    }
    SerialPortItem {
        port_name: info.port_name,
        port_type: serial_type(&info.port_type),
        manufacturer,
        product,
        serial_number,
        vid,
        pid,
    }
}

fn parse_weight(raw: &str) -> Option<(f64, String)> {
    let lower = raw.to_ascii_lowercase();
    let unit = if lower.contains("kg") {
        "kg"
    } else if lower.contains(" lb") || lower.contains("lbs") {
        "lb"
    } else if lower.contains('g') {
        "g"
    } else {
        "kg"
    };

    let mut candidates: Vec<String> = Vec::new();
    let mut current = String::new();
    for ch in raw.chars() {
        if ch.is_ascii_digit() || matches!(ch, '+' | '-' | '.' | ',') {
            current.push(ch);
        } else if !current.is_empty() {
            candidates.push(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        candidates.push(current);
    }

    candidates
        .into_iter()
        .filter(|value| value.chars().any(|c| c.is_ascii_digit()))
        .filter_map(|value| value.replace(',', ".").parse::<f64>().ok())
        .next()
        .map(|weight| (weight, unit.to_string()))
}

#[tauri::command]
fn desktop_info(app: AppHandle) -> DesktopInfo {
    DesktopInfo {
        native: true,
        version: app.package_info().version.to_string(),
        updater_configured: updater_pubkey().is_some(),
        update_endpoint: UPDATE_ENDPOINT.to_string(),
        platform: "Windows".to_string(),
        hardware_bridge: true,
    }
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<SerialPortItem>, String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(serial_item).collect())
        .map_err(|error| format!("No se pudieron consultar los puertos COM: {error}"))
}

#[tauri::command]
fn scale_connect(
    state: State<'_, HardwareState>,
    port_name: String,
    baud_rate: u32,
) -> Result<ScaleReading, String> {
    let port_name = port_name.trim().to_string();
    if port_name.is_empty() {
        return Err("Selecciona un puerto COM para la báscula.".to_string());
    }
    if !(300..=921_600).contains(&baud_rate) {
        return Err("Velocidad serial inválida.".to_string());
    }
    let port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(180))
        .open()
        .map_err(|error| format!("No se pudo abrir {port_name}: {error}"))?;
    let mut guard = state
        .scale
        .lock()
        .map_err(|_| "No se pudo bloquear el puerto de la báscula.".to_string())?;
    *guard = Some(ScaleConnection {
        port,
        buffer: String::new(),
        last: None,
    });
    Ok(ScaleReading {
        connected: true,
        weight: None,
        unit: None,
        raw: None,
    })
}

#[tauri::command]
fn scale_disconnect(state: State<'_, HardwareState>) -> Result<(), String> {
    let mut guard = state
        .scale
        .lock()
        .map_err(|_| "No se pudo cerrar el puerto de la báscula.".to_string())?;
    *guard = None;
    Ok(())
}

#[tauri::command]
fn scale_read(state: State<'_, HardwareState>) -> Result<ScaleReading, String> {
    let mut guard = state
        .scale
        .lock()
        .map_err(|_| "No se pudo leer el puerto de la báscula.".to_string())?;
    let connection = guard
        .as_mut()
        .ok_or_else(|| "La báscula no está conectada.".to_string())?;

    let mut bytes = [0u8; 256];
    match connection.port.read(&mut bytes) {
        Ok(count) if count > 0 => {
            let chunk = String::from_utf8_lossy(&bytes[..count]);
            connection.buffer.push_str(&chunk);
            if connection.buffer.len() > 4096 {
                let keep_from = connection.buffer.len().saturating_sub(2048);
                connection.buffer = connection.buffer[keep_from..].to_string();
            }
            let candidate = connection
                .buffer
                .split(['\r', '\n'])
                .rev()
                .find(|line| !line.trim().is_empty())
                .unwrap_or(connection.buffer.trim())
                .trim()
                .to_string();
            if let Some((weight, unit)) = parse_weight(&candidate) {
                let reading = ScaleReading {
                    connected: true,
                    weight: Some(weight),
                    unit: Some(unit),
                    raw: Some(candidate),
                };
                connection.last = Some(reading.clone());
                return Ok(reading);
            }
        }
        Ok(_) => {}
        Err(error) if error.kind() == ErrorKind::TimedOut => {}
        Err(error) => return Err(format!("Error leyendo la báscula: {error}")),
    }

    Ok(connection.last.clone().unwrap_or(ScaleReading {
        connected: true,
        weight: None,
        unit: None,
        raw: None,
    }))
}

#[cfg(target_os = "windows")]
fn powershell_printers() -> Result<Vec<PrinterItem>, String> {
    let script = r#"$ErrorActionPreference='Stop'; Get-CimInstance Win32_Printer | Sort-Object Name | ForEach-Object { $n=($_.Name -replace "`t",' '); $d=($_.DriverName -replace "`t",' '); $p=($_.PortName -replace "`t",' '); $x=if($_.Default){'1'}else{'0'}; Write-Output ($n+"`t"+$d+"`t"+$p+"`t"+$x) }"#;
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|error| format!("No se pudo consultar Windows Print Spooler: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text
        .lines()
        .filter_map(|line| {
            let mut fields = line.splitn(4, '\t');
            let name = fields.next()?.trim().to_string();
            if name.is_empty() {
                return None;
            }
            Some(PrinterItem {
                name,
                driver_name: fields.next().unwrap_or("").trim().to_string(),
                port_name: fields.next().unwrap_or("").trim().to_string(),
                is_default: fields.next().unwrap_or("0").trim() == "1",
            })
        })
        .collect())
}

#[cfg(not(target_os = "windows"))]
fn powershell_printers() -> Result<Vec<PrinterItem>, String> {
    Err("La detección de impresoras está disponible únicamente en Windows.".to_string())
}

#[tauri::command]
fn list_windows_printers() -> Result<Vec<PrinterItem>, String> {
    powershell_printers()
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
            emit_update(&app, "available", Some(version.clone()), notes.clone(), None);
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
    write_startup_log("START");
    tauri::Builder::default()
        .manage(HardwareState::default())
        .setup(|_| {
            write_startup_log("SETUP_OK");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_info,
            check_for_updates,
            install_update,
            list_serial_ports,
            scale_connect,
            scale_disconnect,
            scale_read,
            list_windows_printers
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| {
            write_startup_log(&format!("RUN_ERROR: {error}"));
        });
}
