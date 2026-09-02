// SOLRAK_HARDWARE_V0194_BEGIN
use serialport::{SerialPort, SerialPortType};
use std::io::{ErrorKind, Read};
use std::process::Command;
use tauri::State;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SerialPortItemV0194 {
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
struct ScaleReadingV0194 {
    connected: bool,
    weight: Option<f64>,
    unit: Option<String>,
    raw: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterItemV0194 {
    name: String,
    driver_name: String,
    port_name: String,
    is_default: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrintResultV0194 {
    ok: bool,
    printer_name: String,
    bytes_written: usize,
}

struct ScaleConnectionV0194 {
    port: Box<dyn SerialPort>,
    buffer: String,
    last: Option<ScaleReadingV0194>,
}

#[derive(Default)]
struct HardwareStateV0194 {
    scale: Mutex<Option<ScaleConnectionV0194>>,
}

fn serial_type_v0194(port_type: &SerialPortType) -> String {
    match port_type {
        SerialPortType::UsbPort(_) => "usb".to_string(),
        SerialPortType::BluetoothPort => "bluetooth".to_string(),
        SerialPortType::PciPort => "pci".to_string(),
        SerialPortType::Unknown => "unknown".to_string(),
    }
}

fn serial_item_v0194(info: serialport::SerialPortInfo) -> SerialPortItemV0194 {
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
    SerialPortItemV0194 {
        port_name: info.port_name,
        port_type: serial_type_v0194(&info.port_type),
        manufacturer,
        product,
        serial_number,
        vid,
        pid,
    }
}

fn parse_weight_v0194(raw: &str) -> Option<(f64, String)> {
    let lower = raw.to_ascii_lowercase();
    let unit = if lower.contains("kg") {
        "kg"
    } else if lower.contains("lbs") || lower.contains(" lb") {
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
fn list_serial_ports_v0194() -> Result<Vec<SerialPortItemV0194>, String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(serial_item_v0194).collect())
        .map_err(|error| format!("No se pudieron consultar los puertos COM: {error}"))
}

#[tauri::command]
fn scale_connect_v0194(
    state: State<'_, HardwareStateV0194>,
    port_name: String,
    baud_rate: u32,
) -> Result<ScaleReadingV0194, String> {
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
    *guard = Some(ScaleConnectionV0194 {
        port,
        buffer: String::new(),
        last: None,
    });
    Ok(ScaleReadingV0194 {
        connected: true,
        weight: None,
        unit: None,
        raw: None,
    })
}

#[tauri::command]
fn scale_disconnect_v0194(state: State<'_, HardwareStateV0194>) -> Result<(), String> {
    let mut guard = state
        .scale
        .lock()
        .map_err(|_| "No se pudo cerrar el puerto de la báscula.".to_string())?;
    *guard = None;
    Ok(())
}

#[tauri::command]
fn scale_read_v0194(state: State<'_, HardwareStateV0194>) -> Result<ScaleReadingV0194, String> {
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
            if let Some((weight, unit)) = parse_weight_v0194(&candidate) {
                let reading = ScaleReadingV0194 {
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
    Ok(connection.last.clone().unwrap_or(ScaleReadingV0194 {
        connected: true,
        weight: None,
        unit: None,
        raw: None,
    }))
}

#[cfg(target_os = "windows")]
fn windows_printers_v0194() -> Result<Vec<PrinterItemV0194>, String> {
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
    Ok(text
        .lines()
        .filter_map(|line| {
            let mut fields = line.splitn(4, '\t');
            let name = fields.next()?.trim().to_string();
            if name.is_empty() { return None; }
            Some(PrinterItemV0194 {
                name,
                driver_name: fields.next().unwrap_or("").trim().to_string(),
                port_name: fields.next().unwrap_or("").trim().to_string(),
                is_default: fields.next().unwrap_or("0").trim() == "1",
            })
        })
        .collect())
}

#[cfg(not(target_os = "windows"))]
fn windows_printers_v0194() -> Result<Vec<PrinterItemV0194>, String> {
    Err("La detección de impresoras está disponible únicamente en Windows.".to_string())
}

#[tauri::command]
fn list_windows_printers_v0194() -> Result<Vec<PrinterItemV0194>, String> {
    windows_printers_v0194()
}

#[cfg(target_os = "windows")]
fn send_raw_to_windows_printer_v0194(printer_name: &str, data: &[u8]) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("Selecciona una impresora instalada en Windows.".to_string());
    }
    if data.is_empty() {
        return Err("El trabajo de impresión está vacío.".to_string());
    }
    if data.len() > 1_048_576 {
        return Err("El trabajo de impresión excede 1 MB.".to_string());
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let path = std::env::temp_dir().join(format!("solrak-ticket-{}-{stamp}.bin", std::process::id()));
    std::fs::write(&path, data).map_err(|error| format!("No se pudo preparar el ticket: {error}"))?;
    let script = r#"
$ErrorActionPreference='Stop'
$code=@'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class SolrakRawPrinterV0194 {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.Drv", SetLastError=true)] static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  static extern int StartDocPrinter(IntPtr handle, int level, [In] DOCINFO info);
  [DllImport("winspool.Drv", SetLastError=true)] static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.Drv", SetLastError=true)] static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.Drv", SetLastError=true)] static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.Drv", SetLastError=true)] static extern bool WritePrinter(IntPtr handle, IntPtr bytes, int count, out int written);
  public static void Send(string printer, byte[] bytes) {
    IntPtr h;
    if(!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter");
    try {
      var info=new DOCINFO { pDocName="SOLRAK Ticket", pDataType="RAW" };
      if(StartDocPrinter(h,1,info)==0) throw new Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter");
      try {
        if(!StartPagePrinter(h)) throw new Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter");
        IntPtr p=Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes,0,p,bytes.Length);
          int written;
          if(!WritePrinter(h,p,bytes.Length,out written) || written!=bytes.Length) throw new Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter");
        } finally { Marshal.FreeCoTaskMem(p); }
        if(!EndPagePrinter(h)) throw new Win32Exception(Marshal.GetLastWin32Error(), "EndPagePrinter");
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@
Add-Type -TypeDefinition $code -Language CSharp
$bytes=[System.IO.File]::ReadAllBytes($env:SOLRAK_RAW_FILE)
[SolrakRawPrinterV0194]::Send($env:SOLRAK_PRINTER_NAME,$bytes)
"#;
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
        .env("SOLRAK_RAW_FILE", path.as_os_str())
        .env("SOLRAK_PRINTER_NAME", printer_name)
        .output();
    let _ = std::fs::remove_file(&path);
    let output = output.map_err(|error| format!("No se pudo iniciar Windows Print Spooler: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Err(if !stderr.is_empty() { stderr } else if !stdout.is_empty() { stdout } else { "Windows rechazó el trabajo de impresión.".to_string() });
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn send_raw_to_windows_printer_v0194(_printer_name: &str, _data: &[u8]) -> Result<(), String> {
    Err("La impresión directa está disponible únicamente en Windows.".to_string())
}

#[tauri::command]
fn print_windows_raw_v0194(printer_name: String, data: Vec<u8>) -> Result<PrintResultV0194, String> {
    send_raw_to_windows_printer_v0194(printer_name.trim(), &data)?;
    Ok(PrintResultV0194 {
        ok: true,
        printer_name: printer_name.trim().to_string(),
        bytes_written: data.len(),
    })
}
// SOLRAK_HARDWARE_V0194_END
