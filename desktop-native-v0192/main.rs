#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serialport::{SerialPort, SerialPortType};
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Read, Write};
use std::panic;
use std::process::Command;
use std::sync::{atomic::{AtomicBool, Ordering}, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::UpdaterExt;

const UPDATE_ENDPOINT: &str = "https://github.com/FERRETERIAAZTLAN/factura-rapida/releases/latest/download/latest.json";
static UPDATER_READY: AtomicBool = AtomicBool::new(false);
static UPDATER_INIT_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopInfo { native: bool, version: String, updater_configured: bool, update_endpoint: String, platform: String, hardware_bridge: bool, direct_print: bool }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheck { available: bool, current_version: String, version: Option<String>, notes: Option<String>, date: Option<String> }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateState { state: String, version: Option<String>, message: Option<String>, progress: Option<u8> }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SerialPortItem { port_name: String, port_type: String, manufacturer: Option<String>, product: Option<String>, serial_number: Option<String>, vid: Option<u16>, pid: Option<u16> }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScaleReading { connected: bool, weight: Option<f64>, unit: Option<String>, raw: Option<String> }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterItem { name: String, driver_name: String, port_name: String, is_default: bool }
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrintTicketJob { printer_name: String, folio: String, text: String, #[serde(default = "default_true")] barcode: bool, #[serde(default = "default_true")] cut: bool }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrintTicketResult { ok: bool, printer_name: String, folio: String, bytes_written: usize }
fn default_true() -> bool { true }

struct ScaleConnection { port: Box<dyn SerialPort>, buffer: String, last: Option<ScaleReading> }
#[derive(Default)]
struct HardwareState { scale: Mutex<Option<ScaleConnection>> }

fn write_startup_log(message: &str) {
    let path = std::env::temp_dir().join("factura-rapida-startup.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) { let _ = writeln!(file, "{}", message); }
}
fn updater_pubkey() -> Option<&'static str> { option_env!("FR_UPDATER_PUBKEY").map(str::trim).filter(|value| !value.is_empty()) }
fn emit_update(app: &AppHandle, state: &str, version: Option<String>, message: Option<String>, progress: Option<u8>) {
    let _ = app.emit("factura-update-state", UpdateState { state: state.to_string(), version, message, progress });
}
fn ensure_updater_plugin(app: &AppHandle) -> Result<(), String> {
    if UPDATER_READY.load(Ordering::Acquire) { return Ok(()); }
    let _guard = UPDATER_INIT_LOCK.lock().map_err(|_| "No se pudo iniciar el servicio de actualizaciones.".to_string())?;
    if UPDATER_READY.load(Ordering::Acquire) { return Ok(()); }
    let pubkey = updater_pubkey().ok_or_else(|| "El servicio de actualizaciones no está disponible.".to_string())?;
    app.plugin(tauri_plugin_updater::Builder::new().pubkey(pubkey.to_string()).build()).map_err(|error| {
        write_startup_log(&format!("UPDATER_PLUGIN_ERROR: {error}"));
        "No se pudo iniciar el servicio de actualizaciones.".to_string()
    })?;
    UPDATER_READY.store(true, Ordering::Release);
    write_startup_log("UPDATER_PLUGIN_OK");
    Ok(())
}
fn build_updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    ensure_updater_plugin(app)?;
    let pubkey = updater_pubkey().ok_or_else(|| "El servicio de actualizaciones no está disponible.".to_string())?;
    let endpoint = url::Url::parse(UPDATE_ENDPOINT).map_err(|e| e.to_string())?;
    app.updater_builder().pubkey(pubkey).endpoints(vec![endpoint]).map_err(|e| e.to_string())?.timeout(Duration::from_secs(30)).build().map_err(|e| e.to_string())
}

fn serial_type(port_type: &SerialPortType) -> String {
    match port_type { SerialPortType::UsbPort(_) => "usb".into(), SerialPortType::BluetoothPort => "bluetooth".into(), SerialPortType::PciPort => "pci".into(), SerialPortType::Unknown => "unknown".into() }
}
fn serial_item(info: serialport::SerialPortInfo) -> SerialPortItem {
    let (mut manufacturer, mut product, mut serial_number, mut vid, mut pid) = (None, None, None, None, None);
    if let SerialPortType::UsbPort(usb) = &info.port_type { manufacturer = usb.manufacturer.clone(); product = usb.product.clone(); serial_number = usb.serial_number.clone(); vid = Some(usb.vid); pid = Some(usb.pid); }
    SerialPortItem { port_name: info.port_name, port_type: serial_type(&info.port_type), manufacturer, product, serial_number, vid, pid }
}
fn parse_weight(raw: &str) -> Option<(f64, String)> {
    let lower = raw.to_ascii_lowercase();
    let unit = if lower.contains("kg") { "kg" } else if lower.contains(" lb") || lower.contains("lbs") { "lb" } else if lower.contains('g') { "g" } else { "kg" };
    let mut candidates = Vec::<String>::new(); let mut current = String::new();
    for ch in raw.chars() { if ch.is_ascii_digit() || matches!(ch, '+' | '-' | '.' | ',') { current.push(ch); } else if !current.is_empty() { candidates.push(std::mem::take(&mut current)); } }
    if !current.is_empty() { candidates.push(current); }
    candidates.into_iter().filter(|value| value.chars().any(|c| c.is_ascii_digit())).filter_map(|value| value.replace(',', ".").parse::<f64>().ok()).next().map(|weight| (weight, unit.to_string()))
}
fn ascii_text(value: &str) -> String {
    value.chars().map(|c| match c {
        'á'|'à'|'ä'|'â'|'Á'|'À'|'Ä'|'Â' => 'A', 'é'|'è'|'ë'|'ê'|'É'|'È'|'Ë'|'Ê' => 'E',
        'í'|'ì'|'ï'|'î'|'Í'|'Ì'|'Ï'|'Î' => 'I', 'ó'|'ò'|'ö'|'ô'|'Ó'|'Ò'|'Ö'|'Ô' => 'O',
        'ú'|'ù'|'ü'|'û'|'Ú'|'Ù'|'Ü'|'Û' => 'U', 'ñ'|'Ñ' => 'N', '¿'|'¡' => ' ',
        '\n'|'\r'|'\t' => c, c if c.is_ascii() && !c.is_control() => c, _ => '?',
    }).collect()
}
fn build_escpos(job: &PrintTicketJob) -> Result<Vec<u8>, String> {
    let folio = job.folio.trim();
    if folio.is_empty() { return Err("No se puede imprimir un ticket sin folio.".into()); }
    if job.barcode && !folio.chars().all(|c| c.is_ascii_digit()) { return Err("El código de barras requiere un folio numérico exacto.".into()); }
    let mut out = vec![0x1b,0x40,0x1b,0x74,0x02,0x1b,0x61,0x00];
    out.extend_from_slice(ascii_text(&job.text).as_bytes()); if !job.text.ends_with('\n') { out.push(b'\n'); }
    if job.barcode {
        let mut data = Vec::with_capacity(folio.len()+2); data.extend_from_slice(b"{B"); data.extend_from_slice(folio.as_bytes());
        if data.len() > 255 { return Err("El folio es demasiado largo para CODE128.".into()); }
        out.extend_from_slice(&[0x1b,0x61,0x01,0x1d,0x48,0x02,0x1d,0x77,0x02,0x1d,0x68,0x46,0x1d,0x6b,0x49,data.len() as u8]);
        out.extend_from_slice(&data); out.push(b'\n'); out.extend_from_slice(folio.as_bytes()); out.push(b'\n');
    }
    out.extend_from_slice(b"\n\n\n"); if job.cut { out.extend_from_slice(&[0x1d,0x56,0x00]); } Ok(out)
}

#[cfg(target_os = "windows")]
fn raw_spool(printer_name: &str, bytes: &[u8]) -> Result<usize, String> {
    let token = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let base = format!("solrak-print-{}-{token}", std::process::id());
    let data_path = std::env::temp_dir().join(format!("{base}.bin")); let script_path = std::env::temp_dir().join(format!("{base}.ps1"));
    fs::write(&data_path, bytes).map_err(|e| format!("No se pudo preparar el ticket: {e}"))?;
    let script = r#"
param([Parameter(Mandatory=$true)][string]$PrinterName,[Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public static class SolrakRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct DOC_INFO_1 { [MarshalAs(UnmanagedType.LPWStr)] public string pDocName; [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPWStr)] public string pDatatype; }
  [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", EntryPoint="ClosePrinter", SetLastError=true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] static extern int StartDocPrinter(IntPtr h, int level, IntPtr info);
  [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true)] static extern bool WritePrinter(IntPtr h, IntPtr p, int count, out int written);
  public static int Send(string printerName,string path) {
    IntPtr printer; if(!OpenPrinter(printerName,out printer,IntPtr.Zero)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"OpenPrinter");
    IntPtr docPtr=IntPtr.Zero; GCHandle pin=default(GCHandle);
    try {
      DOC_INFO_1 doc=new DOC_INFO_1 { pDocName="SOLRAK Ticket", pOutputFile=null, pDatatype="RAW" }; docPtr=Marshal.AllocHGlobal(Marshal.SizeOf(doc)); Marshal.StructureToPtr(doc,docPtr,false);
      if(StartDocPrinter(printer,1,docPtr)==0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"StartDocPrinter");
      if(!StartPagePrinter(printer)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"StartPagePrinter");
      byte[] data=File.ReadAllBytes(path); pin=GCHandle.Alloc(data,GCHandleType.Pinned); int written=0;
      if(!WritePrinter(printer,pin.AddrOfPinnedObject(),data.Length,out written)||written!=data.Length) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"WritePrinter");
      EndPagePrinter(printer); EndDocPrinter(printer); return written;
    } finally { if(pin.IsAllocated) pin.Free(); if(docPtr!=IntPtr.Zero) Marshal.FreeHGlobal(docPtr); ClosePrinter(printer); }
  }
}
'@
$written=[SolrakRawPrinter]::Send($PrinterName,$FilePath)
Write-Output $written
"#;
    if let Err(error)=fs::write(&script_path,script) { let _=fs::remove_file(&data_path); return Err(format!("No se pudo preparar Windows Print Spooler: {error}")); }
    let output=Command::new("powershell.exe").args(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File"]).arg(&script_path).arg("-PrinterName").arg(printer_name).arg("-FilePath").arg(&data_path).output();
    let _=fs::remove_file(&script_path); let _=fs::remove_file(&data_path); let output=output.map_err(|e| format!("No se pudo iniciar Windows Print Spooler: {e}"))?;
    if !output.status.success() { let detail=String::from_utf8_lossy(&output.stderr).trim().to_string(); return Err(if detail.is_empty(){"Windows rechazó el trabajo de impresión.".into()}else{format!("Windows rechazó el trabajo de impresión: {detail}")}); }
    let reported=String::from_utf8_lossy(&output.stdout).lines().rev().find_map(|line| line.trim().parse::<usize>().ok()).unwrap_or(bytes.len());
    if reported!=bytes.len(){return Err(format!("Windows escribió {reported} de {} bytes.",bytes.len()));} Ok(reported)
}
#[cfg(not(target_os = "windows"))]
fn raw_spool(_printer_name:&str,_bytes:&[u8])->Result<usize,String>{Err("La impresión RAW está disponible únicamente en Windows.".into())}

#[tauri::command]
fn desktop_info(app:AppHandle)->DesktopInfo{DesktopInfo{native:true,version:app.package_info().version.to_string(),updater_configured:updater_pubkey().is_some(),update_endpoint:UPDATE_ENDPOINT.into(),platform:"Windows".into(),hardware_bridge:true,direct_print:true}}
#[tauri::command]
fn list_serial_ports()->Result<Vec<SerialPortItem>,String>{serialport::available_ports().map(|ports|ports.into_iter().map(serial_item).collect()).map_err(|error|format!("No se pudieron consultar los puertos COM: {error}"))}
#[tauri::command]
fn scale_connect(state:State<'_,HardwareState>,port_name:String,baud_rate:u32)->Result<ScaleReading,String>{
    let port_name=port_name.trim().to_string(); if port_name.is_empty(){return Err("Selecciona un puerto COM para la báscula.".into());} if !(300..=921_600).contains(&baud_rate){return Err("Velocidad serial inválida.".into());}
    let port=serialport::new(&port_name,baud_rate).timeout(Duration::from_millis(180)).open().map_err(|error|format!("No se pudo abrir {port_name}: {error}"))?;
    let mut guard=state.scale.lock().map_err(|_|"No se pudo bloquear el puerto de la báscula.".to_string())?; *guard=Some(ScaleConnection{port,buffer:String::new(),last:None}); Ok(ScaleReading{connected:true,weight:None,unit:None,raw:None})
}
#[tauri::command]
fn scale_disconnect(state:State<'_,HardwareState>)->Result<(),String>{let mut guard=state.scale.lock().map_err(|_|"No se pudo cerrar el puerto de la báscula.".to_string())?;*guard=None;Ok(())}
#[tauri::command]
fn scale_read(state:State<'_,HardwareState>)->Result<ScaleReading,String>{
    let mut guard=state.scale.lock().map_err(|_|"No se pudo leer el puerto de la báscula.".to_string())?; let connection=guard.as_mut().ok_or_else(||"La báscula no está conectada.".to_string())?; let mut bytes=[0u8;256];
    match connection.port.read(&mut bytes){Ok(count) if count>0=>{let chunk=String::from_utf8_lossy(&bytes[..count]);connection.buffer.push_str(&chunk);if connection.buffer.len()>4096{let keep=connection.buffer.len().saturating_sub(2048);connection.buffer=connection.buffer[keep..].to_string();}let candidate=connection.buffer.split(['\r','\n']).rev().find(|line|!line.trim().is_empty()).unwrap_or(connection.buffer.trim()).trim().to_string();if let Some((weight,unit))=parse_weight(&candidate){let reading=ScaleReading{connected:true,weight:Some(weight),unit:Some(unit),raw:Some(candidate)};connection.last=Some(reading.clone());return Ok(reading);}},Ok(_)=>{},Err(error) if error.kind()==ErrorKind::TimedOut=>{},Err(error)=>return Err(format!("Error leyendo la báscula: {error}"))}
    Ok(connection.last.clone().unwrap_or(ScaleReading{connected:true,weight:None,unit:None,raw:None}))
}
#[cfg(target_os="windows")]
fn powershell_printers()->Result<Vec<PrinterItem>,String>{
    let script=r#"$ErrorActionPreference='Stop'; Get-CimInstance Win32_Printer | Sort-Object Name | ForEach-Object { $n=($_.Name -replace "`t",' '); $d=($_.DriverName -replace "`t",' '); $p=($_.PortName -replace "`t",' '); $x=if($_.Default){'1'}else{'0'}; Write-Output ($n+"`t"+$d+"`t"+$p+"`t"+$x) }"#;
    let output=Command::new("powershell.exe").args(["-NoProfile","-NonInteractive","-Command",script]).output().map_err(|error|format!("No se pudo consultar Windows Print Spooler: {error}"))?; if !output.status.success(){return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());}
    let text=String::from_utf8_lossy(&output.stdout);Ok(text.lines().filter_map(|line|{let mut fields=line.splitn(4,'\t');let name=fields.next()?.trim().to_string();if name.is_empty(){return None;}Some(PrinterItem{name,driver_name:fields.next().unwrap_or("").trim().to_string(),port_name:fields.next().unwrap_or("").trim().to_string(),is_default:fields.next().unwrap_or("0").trim()=="1"})}).collect())
}
#[cfg(not(target_os="windows"))]
fn powershell_printers()->Result<Vec<PrinterItem>,String>{Err("La detección de impresoras está disponible únicamente en Windows.".into())}
#[tauri::command]
fn list_windows_printers()->Result<Vec<PrinterItem>,String>{powershell_printers()}
#[tauri::command]
fn print_thermal_ticket(job:PrintTicketJob)->Result<PrintTicketResult,String>{
    let printer_name=job.printer_name.trim().to_string();if printer_name.is_empty(){return Err("Selecciona una impresora instalada en Windows.".into());}
    let printers=powershell_printers()?;if !printers.iter().any(|p|p.name.eq_ignore_ascii_case(&printer_name)){return Err("La impresora seleccionada ya no está instalada en Windows.".into());}
    let bytes=build_escpos(&job)?;let written=raw_spool(&printer_name,&bytes)?;Ok(PrintTicketResult{ok:true,printer_name,folio:job.folio.trim().to_string(),bytes_written:written})
}

#[tauri::command]
async fn check_for_updates(app:AppHandle)->Result<UpdateCheck,String>{
    let current_version=app.package_info().version.to_string();emit_update(&app,"checking",None,None,None);let updater=build_updater(&app).map_err(|error|{emit_update(&app,"disabled",None,Some(error.clone()),None);error})?;
    match updater.check().await{Ok(Some(update))=>{let version=update.version.to_string();let notes=update.body.clone();let date=update.date.map(|value|value.to_string());emit_update(&app,"available",Some(version.clone()),notes.clone(),None);Ok(UpdateCheck{available:true,current_version,version:Some(version),notes,date})},Ok(None)=>{emit_update(&app,"current",None,None,None);Ok(UpdateCheck{available:false,current_version,version:None,notes:None,date:None})},Err(error)=>{let message=error.to_string();emit_update(&app,"error",None,Some(message.clone()),None);Err(message)}}
}
#[tauri::command]
async fn install_update(app:AppHandle)->Result<(),String>{
    let updater=build_updater(&app)?;emit_update(&app,"checking",None,None,None);let Some(update)=updater.check().await.map_err(|e|e.to_string())? else{emit_update(&app,"current",None,Some("Ya tienes la versión más reciente.".into()),None);return Ok(());};let version=update.version.to_string();let progress_app=app.clone();let finished_app=app.clone();let version_progress=version.clone();let mut downloaded:u64=0;emit_update(&app,"downloading",Some(version.clone()),Some("Descargando actualización…".into()),Some(0));
    update.download_and_install(move|chunk_length,content_length|{downloaded=downloaded.saturating_add(chunk_length as u64);let progress=content_length.filter(|total|*total>0).map(|total|((downloaded.saturating_mul(100)/total).min(100)) as u8);emit_update(&progress_app,"downloading",Some(version_progress.clone()),Some("Descargando actualización…".into()),progress);},move||{emit_update(&finished_app,"downloaded",None,Some("Descarga terminada. Instalando…".into()),Some(100));}).await.map_err(|error|{let message=error.to_string();emit_update(&app,"error",Some(version),Some(message.clone()),None);message})?;Ok(())
}

fn main(){panic::set_hook(Box::new(|info|write_startup_log(&format!("PANIC: {info}"))));write_startup_log("START");tauri::Builder::default().manage(HardwareState::default()).setup(|_|{write_startup_log("SETUP_OK");Ok(())}).invoke_handler(tauri::generate_handler![desktop_info,check_for_updates,install_update,list_serial_ports,scale_connect,scale_disconnect,scale_read,list_windows_printers,print_thermal_ticket]).run(tauri::generate_context!()).unwrap_or_else(|error|write_startup_log(&format!("RUN_ERROR: {error}")));}
