import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "web";
const fail = (message) => { throw new Error(`SOLRAK v0.1.94: ${message}`); };

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  const index = source.indexOf(search);
  if (index < 0) fail(`no se encontró ${label}`);
  if (source.indexOf(search, index + search.length) >= 0) fail(`${label} aparece más de una vez`);
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

function patchWeb() {
  const file = "solrak-sumapro-tickets-v0169.js";
  let code = fs.readFileSync(file, "utf8");
  if (code.includes("SOLRAK_NATIVE_PRINTER_V0194")) {
    console.log("SOLRAK v0.1.94 web ya aplicado");
    return;
  }

  code = replaceOnce(
    code,
    '    printerEnabled: true,\n    autoPrint: false,',
    '    printerEnabled: true,\n    printerName: "system",\n    autoPrint: false,',
    "printerName default",
  );
  code = replaceOnce(
    code,
    '<p class="solrakTicketHelp">SOLRAK prepara el ticket térmico y usa la ventana de impresión de Windows. Deja tu impresora POS como predeterminada para imprimir con menos pasos.</p>',
    '<p class="solrakTicketHelp">SOLRAK envía el ticket directamente a la impresora térmica instalada en Windows mediante el puente nativo. No abre ventanas de impresión del navegador.</p>',
    "ayuda de impresora",
  );
  code = replaceOnce(
    code,
    '      printerEnabled: !!byId("solrakTicketPrinterEnabled")?.checked,\n      autoPrint: !!byId("solrakTicketAutoPrint")?.checked,',
    '      printerEnabled: !!byId("solrakTicketPrinterEnabled")?.checked,\n      printerName: byId("solrakTicketPrinter")?.value || "system",\n      autoPrint: !!byId("solrakTicketAutoPrint")?.checked,',
    "lectura de impresora",
  );
  code = replaceOnce(
    code,
    '      solrakTicketPaper: currentSettings.paperSize,\n      solrakTicketCopies: String(currentSettings.copies),',
    '      solrakTicketPrinter: currentSettings.printerName || "system",\n      solrakTicketPaper: currentSettings.paperSize,\n      solrakTicketCopies: String(currentSettings.copies),',
    "sincronización de impresora",
  );

  const start = code.indexOf("  function printReceipt(receipt, options = {}) {");
  const end = code.indexOf("  function readTicketForm() {", start);
  if (start < 0 || end < 0 || end <= start) fail("bloque printReceipt");
  const replacement = fs.readFileSync("native/ticket-print-v0194.fragment.txt", "utf8");
  if (!replacement.includes("SOLRAK_NATIVE_PRINTER_V0194")) fail("fragmento web v0.1.94 inválido");
  code = code.slice(0, start) + replacement + code.slice(end);
  if (/frame\.contentWindow\?\.print\(\)|contentWindow\.print\(\)/.test(code)) fail("quedó impresión web por iframe");
  fs.writeFileSync(file, code);
  console.log("SOLRAK v0.1.94 web aplicado");
}

function patchDesktop(desktopDir) {
  if (!desktopDir) fail("falta directorio desktop");
  const srcDir = path.join(desktopDir, "src-tauri", "src");
  const mainFile = path.join(srcDir, "main.rs");
  if (!fs.existsSync(mainFile)) fail(`no existe ${mainFile}`);
  fs.mkdirSync(srcDir, { recursive: true });
  fs.copyFileSync("native/windows-printer-v0194.rs", path.join(srcDir, "windows_printer_v0194.rs"));
  let main = fs.readFileSync(mainFile, "utf8");
  if (!main.includes("mod windows_printer_v0194;")) {
    main = replaceOnce(
      main,
      "\nfn main() {",
      "\nmod windows_printer_v0194;\nuse windows_printer_v0194::{list_printers, print_thermal_ticket};\n\nfn main() {",
      "entrada del módulo de impresora",
    );
  }
  if (!main.includes("list_printers, print_thermal_ticket, desktop_info")) {
    main = replaceOnce(
      main,
      "            desktop_info, check_for_updates, install_update, webview_milestone, login_ui_ready",
      "            list_printers, print_thermal_ticket, desktop_info, check_for_updates, install_update, webview_milestone, login_ui_ready",
      "registro de comandos Tauri",
    );
  }
  fs.writeFileSync(mainFile, main);
  console.log(`SOLRAK v0.1.94 nativo aplicado a ${desktopDir}`);
}

if (mode === "web") patchWeb();
else if (mode === "desktop") patchDesktop(process.argv[3]);
else fail(`modo desconocido: ${mode}`);
