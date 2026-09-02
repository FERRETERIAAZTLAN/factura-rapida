use serde::Serialize;
use serialport::{SerialPort, SerialPortType};
use std::fs;
use std::io::{ErrorKind, Read};
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::State;

const RAW_PRINT_HELPER: &str = include_str!("solrak_raw_print_helper_v0194.cs");

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareStatus {
    native: bool,
    hardware_bridge: bool,
    platform: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialPortItem {
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
pub struct ScaleReading {
    connected: bool,
    weight: Option<f64>,
    unit: Option<String>,
    raw: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterItem {
    name: String,
    driver_name: String,
    port_name: String,
    is_default: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintResult {
    printer_name: String,
    bytes_written: usize,
}

struct ScaleConnection {
    port: Box<dyn SerialPort>,
    buffer: String,
    last: Option<ScaleReading>,
}

#[derive(Default)]
pub struct HardwareStateV0194 {
    scale: Mutex<Option<ScaleConnection>>,
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
    let units: Vec<&str> = lower
        .split(|ch: char| !ch.is_ascii_alphabetic())
        .filter(|token| !token.is_empty())
        .collect();
    let unit = if units.iter().any(|token| *token == "kg") {
        "kg"
    } else if units.iter().any(|token| *token == "lb" || *token == "lbs") {
        "lb"
    } else if units.iter().any(|token| *token == "g") {
        "g"
    } else {
        "kg"
    };
    let mut candidates = Vec::new();
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
pub fn hardware_status_v0194() -> HardwareStatus {
    HardwareStatus {
        native: true,
        hardware_bridge: true,
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
pub fn list_serial_ports_v0194() -> Result<Vec<SerialPortItem>, String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(serial_item).collect())
        .map_err(|error| format!("No se pudieron consultar los puertos COM: {error}"))
}

#[tauri::command]
pub fn scale_connect_v0194(
    state: State<'_, HardwareStateV0194>,
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
        .data_bits(serialport::DataBits::Eight)
        .parity(serialport::Parity::None)
        .stop_bits(serialport::StopBits::One)
        .flow_control(serialport::FlowControl::None)
        .timeout(Duration::from_millis(150))
        .open()
        .map_err(|error| format!("No se pudo abrir {port_name}: {error}"))?;
    let mut guard = state.scale.lock().map_err(|_| "No se pudo bloquear el puerto de la báscula.".to_string())?;
    *guard = Some(ScaleConnection { port, buffer: String::new(), last: None });
    Ok(ScaleReading { connected: true, weight: None, unit: None, raw: None })
}

#[tauri::command]
pub fn scale_disconnect_v0194(state: State<'_, HardwareStateV0194>) -> Result<(), String> {
    let mut guard = state.scale.lock().map_err(|_| "No se pudo cerrar el puerto de la báscula.".to_string())?;
    *guard = None;
    Ok(())
}

#[tauri::command]
pub fn scale_read_v0194(state: State<'_, HardwareStateV0194>) -> Result<ScaleReading, String> {
    let mut guard = state.scale.lock().map_err(|_| "No se pudo leer el puerto de la báscula.".to_string())?;
    let connection = guard.as_mut().ok_or_else(|| "La báscula no está conectada.".to_string())?;
    let mut bytes = [0u8; 256];
    match connection.port.read(&mut bytes) {
        Ok(count) if count > 0 => {
            connection.buffer.push_str(&String::from_utf8_lossy(&bytes[..count]));
            if connection.buffer.len() > 4096 {
                let keep = connection.buffer.len().saturating_sub(2048);
                connection.buffer = connection.buffer[keep..].to_string();
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
                let reading = ScaleReading { connected: true, weight: Some(weight), unit: Some(unit), raw: Some(candidate) };
                connection.last = Some(reading.clone());
                return Ok(reading);
            }
        }
        Ok(_) => {}
        Err(error) if error.kind() == ErrorKind::TimedOut => {}
        Err(error) => return Err(format!("Error leyendo la báscula: {error}")),
    }
    Ok(connection.last.clone().unwrap_or(ScaleReading { connected: true, weight: None, unit: None, raw: None }))
}

#[cfg(target_os = "windows")]
fn windows_printers() -> Result<Vec<PrinterItem>, String> {
    let script = r#"$ErrorActionPreference='Stop'; Get-CimInstance Win32_Printer | Sort-Object Name | ForEach-Object { $n=($_.Name -replace "`t",' '); $d=($_.DriverName -replace "`t",' '); $p=($_.PortName -replace "`t",' '); $x=if($_.Default){'1'}else{'0'}; Write-Output ($n+"`t"+$d+"`t"+$p+"`t"+$x) }"#;
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|error| format!("No se pudo consultar Windows Print Spooler: {error}"))?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if error.is_empty() { "Windows no devolvió la lista de impresoras.".to_string() } else { error });
    }
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.lines().filter_map(|line| {
        let mut fields = line.splitn(4, '\t');
        let name = fields.next()?.trim().to_string();
        if name.is_empty() { return None; }
        Some(PrinterItem {
            name,
            driver_name: fields.next().unwrap_or("").trim().to_string(),
            port_name: fields.next().unwrap_or("").trim().to_string(),
            is_default: fields.next().unwrap_or("0").trim() == "1",
        })
    }).collect())
}

#[cfg(not(target_os = "windows"))]
fn windows_printers() -> Result<Vec<PrinterItem>, String> {
    Err("La detección de impresoras está disponible únicamente en Windows.".to_string())
}

#[tauri::command]
pub fn list_windows_printers_v0194() -> Result<Vec<PrinterItem>, String> {
    windows_printers()
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn print_raw_ticket_v0194(printer_name: String, data: Vec<u8>) -> Result<PrintResult, String> {
    let printer_name = printer_name.trim().to_string();
    if printer_name.is_empty() { return Err("Selecciona una impresora instalada en Windows.".to_string()); }
    if data.is_empty() { return Err("El ticket está vacío.".to_string()); }
    if data.len() > 1_000_000 { return Err("El ticket excede el tamaño permitido para impresión directa.".to_string()); }

    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    let base = std::env::temp_dir();
    let raw_path = base.join(format!("solrak-ticket-{}-{stamp}.bin", std::process::id()));
    let helper_path = base.join(format!("solrak-raw-printer-{}-{stamp}.cs", std::process::id()));
    fs::write(&raw_path, &data).map_err(|error| format!("No se pudo preparar el ticket: {error}"))?;
    fs::write(&helper_path, RAW_PRINT_HELPER).map_err(|error| format!("No se pudo preparar el controlador de impresión: {error}"))?;

    let script = "$ErrorActionPreference='Stop'; Add-Type -Path $env:SOLRAK_HELPER; if(-not [SolrakRawPrinter]::Send($env:SOLRAK_PRINTER,$env:SOLRAK_RAW)){ throw 'Windows Print Spooler rechazó el trabajo RAW' }";
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
        .env("SOLRAK_PRINTER", &printer_name)
        .env("SOLRAK_RAW", &raw_path)
        .env("SOLRAK_HELPER", &helper_path)
        .output();
    let _ = fs::remove_file(&raw_path);
    let _ = fs::remove_file(&helper_path);
    let output = output.map_err(|error| format!("No se pudo iniciar Windows Print Spooler: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() { stderr } else if !stdout.is_empty() { stdout } else { "Windows rechazó la impresión directa.".to_string() };
        return Err(detail);
    }
    Ok(PrintResult { printer_name, bytes_written: data.len() })
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn print_raw_ticket_v0194(_printer_name: String, _data: Vec<u8>) -> Result<PrintResult, String> {
    Err("La impresión RAW está disponible únicamente en Windows.".to_string())
}

#[cfg(test)]
mod tests {
    use super::parse_weight;

    #[test]
    fn parses_common_scale_frames() {
        let (weight, unit) = parse_weight("ST,GS,+  12.340 kg").expect("kg");
        assert!((weight - 12.340).abs() < 0.0001);
        assert_eq!(unit, "kg");

        let (weight, unit) = parse_weight(" 250 g").expect("g");
        assert_eq!(weight, 250.0);
        assert_eq!(unit, "g");

        let (weight, unit) = parse_weight("ST,GS,+ 12.340").expect("status frame");
        assert!((weight - 12.340).abs() < 0.0001);
        assert_eq!(unit, "kg");
    }
}
