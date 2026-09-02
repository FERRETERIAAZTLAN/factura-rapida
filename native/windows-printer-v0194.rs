use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalPrintJob {
    pub printer_name: String,
    pub paper_size: String,
    pub copies: u8,
    pub text: String,
    pub sale_number: String,
    pub barcode: Option<String>,
    pub cut: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalPrintResult {
    pub ok: bool,
    pub printer_name: String,
    pub sale_number: String,
    pub copies: u8,
    pub bytes_written: u32,
}

fn powershell_lines(script: &str) -> Result<Vec<String>, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = script;
        return Err("La impresión térmica nativa solo está disponible en Windows.".into());
    }
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
            .output()
            .map_err(|error| format!("No se pudo consultar Windows: {error}"))?;
        if !output.status.success() {
            let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if detail.is_empty() { "Windows no pudo consultar las impresoras instaladas.".into() } else { detail });
        }
        Ok(String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .map(ToOwned::to_owned)
            .collect())
    }
}

#[tauri::command]
pub fn list_printers() -> Result<Vec<String>, String> {
    let mut printers = powershell_lines("Get-CimInstance Win32_Printer | Sort-Object Name | Select-Object -ExpandProperty Name")?;
    printers.sort();
    printers.dedup();
    Ok(printers)
}

fn resolve_printer(requested: &str) -> Result<String, String> {
    let requested = requested.trim();
    if requested.is_empty() || requested.eq_ignore_ascii_case("system") {
        let default = powershell_lines("Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1 -ExpandProperty Name")?
            .into_iter()
            .next()
            .ok_or_else(|| "Windows no tiene una impresora predeterminada configurada.".to_string())?;
        return Ok(default);
    }
    let installed = list_printers()?;
    if installed.iter().any(|name| name == requested) {
        Ok(requested.to_string())
    } else {
        Err(format!("La impresora '{requested}' no está instalada en Windows."))
    }
}

fn push_cp850(out: &mut Vec<u8>, ch: char) {
    match ch {
        '\n' => out.push(b'\n'),
        '\r' => {},
        '\t' => out.extend_from_slice(b"    "),
        '\u{00E1}' | '\u{00C1}' => out.push(if ch.is_uppercase() { 181 } else { 160 }),
        '\u{00E9}' | '\u{00C9}' => out.push(if ch.is_uppercase() { 144 } else { 130 }),
        '\u{00ED}' | '\u{00CD}' => out.push(if ch.is_uppercase() { 214 } else { 161 }),
        '\u{00F3}' | '\u{00D3}' => out.push(if ch.is_uppercase() { 224 } else { 162 }),
        '\u{00FA}' | '\u{00DA}' => out.push(if ch.is_uppercase() { 233 } else { 163 }),
        '\u{00F1}' => out.push(164),
        '\u{00D1}' => out.push(165),
        '\u{00FC}' => out.push(129),
        '\u{00DC}' => out.push(154),
        '\u{00BF}' => out.push(168),
        '\u{00A1}' => out.push(173),
        '\u{2013}' | '\u{2014}' => out.push(b'-'),
        '\u{2026}' => out.extend_from_slice(b"..."),
        c if c.is_ascii() => out.push(c as u8),
        _ => out.push(b'?'),
    }
}

fn cp850(text: &str) -> Vec<u8> {
    let mut out = Vec::with_capacity(text.len());
    for ch in text.chars() {
        push_cp850(&mut out, ch);
    }
    out
}

fn build_escpos(job: &ThermalPrintJob) -> Result<Vec<u8>, String> {
    if job.text.trim().is_empty() {
        return Err("El ticket está vacío.".into());
    }
    if job.text.len() > 96_000 {
        return Err("El ticket excede el tamaño permitido.".into());
    }
    if !matches!(job.paper_size.as_str(), "58" | "80") {
        return Err("El rollo térmico debe ser de 58 u 80 mm.".into());
    }
    if !(1..=2).contains(&job.copies) {
        return Err("SOLRAK permite 1 o 2 copias del ticket.".into());
    }
    if job.sale_number.is_empty() || job.sale_number.len() > 32 || !job.sale_number.bytes().all(|b| b.is_ascii_digit()) {
        return Err("El folio del ticket debe ser numérico y exacto.".into());
    }
    if let Some(barcode) = &job.barcode {
        if barcode != &job.sale_number || !barcode.bytes().all(|b| b.is_ascii_digit()) {
            return Err("El código de barras debe contener exactamente el folio numérico.".into());
        }
    }

    let mut all = Vec::new();
    for _ in 0..job.copies {
        let mut bytes = vec![0x1b, 0x40]; // ESC @: inicializar impresora
        bytes.extend_from_slice(&[0x1b, 0x74, 0x02]); // ESC t 2: CP850
        bytes.extend_from_slice(&[0x1b, 0x61, 0x00]); // izquierda
        bytes.extend_from_slice(&cp850(&job.text));
        if !job.text.ends_with('\n') {
            bytes.push(b'\n');
        }
        if let Some(barcode) = &job.barcode {
            bytes.extend_from_slice(b"\n");
            bytes.extend_from_slice(&[0x1b, 0x61, 0x01]); // centrar
            bytes.extend_from_slice(&[0x1d, 0x48, 0x02]); // HRI debajo
            bytes.extend_from_slice(&[0x1d, 0x68, 0x40]); // altura
            bytes.extend_from_slice(&[0x1d, 0x77, 0x02]); // ancho
            bytes.extend_from_slice(&[0x1d, 0x6b, 0x04]); // CODE39, terminación NUL
            bytes.extend_from_slice(barcode.as_bytes());
            bytes.push(0);
            bytes.extend_from_slice(b"\n");
            bytes.extend_from_slice(&[0x1b, 0x61, 0x00]);
        }
        bytes.extend_from_slice(b"\n\n\n");
        if job.cut {
            bytes.extend_from_slice(&[0x1d, 0x56, 0x42, 0x00]); // corte parcial, ignorado si no existe cutter
        }
        all.extend_from_slice(&bytes);
    }
    Ok(all)
}

#[cfg(target_os = "windows")]
mod spooler {
    use std::{ffi::c_void, io, ptr};

    type Handle = isize;

    #[repr(C)]
    struct DocInfo1W {
        p_doc_name: *mut u16,
        p_output_file: *mut u16,
        p_datatype: *mut u16,
    }

    #[link(name = "Winspool")]
    extern "system" {
        fn OpenPrinterW(name: *mut u16, printer: *mut Handle, defaults: *mut c_void) -> i32;
        fn ClosePrinter(printer: Handle) -> i32;
        fn StartDocPrinterW(printer: Handle, level: u32, doc_info: *mut u8) -> u32;
        fn EndDocPrinter(printer: Handle) -> i32;
        fn StartPagePrinter(printer: Handle) -> i32;
        fn EndPagePrinter(printer: Handle) -> i32;
        fn WritePrinter(printer: Handle, buffer: *const c_void, count: u32, written: *mut u32) -> i32;
    }

    fn last_error(context: &str) -> String {
        format!("{context}: {}", io::Error::last_os_error())
    }

    pub fn write_raw(printer_name: &str, data: &[u8]) -> Result<u32, String> {
        if data.is_empty() {
            return Err("No hay bytes para imprimir.".into());
        }
        let mut printer_name_w: Vec<u16> = printer_name.encode_utf16().chain(Some(0)).collect();
        let mut doc_name: Vec<u16> = "SOLRAK Ticket".encode_utf16().chain(Some(0)).collect();
        let mut raw_type: Vec<u16> = "RAW".encode_utf16().chain(Some(0)).collect();
        let mut handle: Handle = 0;
        unsafe {
            if OpenPrinterW(printer_name_w.as_mut_ptr(), &mut handle, ptr::null_mut()) == 0 {
                return Err(last_error("Windows no pudo abrir la impresora"));
            }
            let mut doc = DocInfo1W {
                p_doc_name: doc_name.as_mut_ptr(),
                p_output_file: ptr::null_mut(),
                p_datatype: raw_type.as_mut_ptr(),
            };
            if StartDocPrinterW(handle, 1, &mut doc as *mut _ as *mut u8) == 0 {
                ClosePrinter(handle);
                return Err(last_error("Windows no pudo crear el trabajo de impresión"));
            }
            if StartPagePrinter(handle) == 0 {
                EndDocPrinter(handle);
                ClosePrinter(handle);
                return Err(last_error("Windows no pudo iniciar la página térmica"));
            }
            let mut written = 0u32;
            let ok = WritePrinter(handle, data.as_ptr() as *const c_void, data.len() as u32, &mut written);
            let write_error = if ok == 0 { Some(last_error("Windows no pudo enviar los datos a la impresora")) } else { None };
            EndPagePrinter(handle);
            EndDocPrinter(handle);
            ClosePrinter(handle);
            if let Some(error) = write_error {
                return Err(error);
            }
            if written as usize != data.len() {
                return Err(format!("Windows solo envió {written} de {} bytes a la impresora.", data.len()));
            }
            Ok(written)
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod spooler {
    pub fn write_raw(_printer_name: &str, _data: &[u8]) -> Result<u32, String> {
        Err("La impresión térmica nativa solo está disponible en Windows.".into())
    }
}

#[tauri::command]
pub fn print_thermal_ticket(job: ThermalPrintJob) -> Result<ThermalPrintResult, String> {
    let printer_name = resolve_printer(&job.printer_name)?;
    let bytes = build_escpos(&job)?;
    let bytes_written = spooler::write_raw(&printer_name, &bytes)?;
    Ok(ThermalPrintResult {
        ok: true,
        printer_name,
        sale_number: job.sale_number,
        copies: job.copies,
        bytes_written,
    })
}
