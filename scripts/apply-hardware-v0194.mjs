import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const src = resolve(desktop, 'src-tauri', 'src');
const cargoPath = resolve(desktop, 'src-tauri', 'Cargo.toml');
const mainPath = resolve(src, 'main.rs');
const indexPath = resolve(dist, 'index.html');
const ticketsPath = resolve(dist, 'solrak-sumapro-tickets-v0169.js');

await copyFile(resolve(root, 'solrak-hardware-v0194.js'), resolve(dist, 'solrak-hardware-v0194.js'));
await copyFile(resolve(root, 'desktop-native-v0194', 'solrak_hardware_v0194.rs'), resolve(src, 'solrak_hardware_v0194.rs'));
await copyFile(resolve(root, 'desktop-native-v0194', 'solrak_raw_print_helper_v0194.cs'), resolve(src, 'solrak_raw_print_helper_v0194.cs'));

let cargo = await readFile(cargoPath, 'utf8');
if (!/^serialport\s*=/m.test(cargo)) {
  const dependencyAnchor = /^\[dependencies\]\s*$/m;
  if (!dependencyAnchor.test(cargo)) throw new Error('Cargo.toml: no se encontró [dependencies]');
  cargo = cargo.replace(dependencyAnchor, '[dependencies]\nserialport = { version = "4", default-features = false }');
}
await writeFile(cargoPath, cargo, 'utf8');

let main = await readFile(mainPath, 'utf8');
const moduleBlock = `mod solrak_hardware_v0194;\nuse solrak_hardware_v0194::{\n    hardware_status_v0194, list_serial_ports_v0194, list_windows_printers_v0194,\n    print_raw_ticket_v0194, scale_connect_v0194, scale_disconnect_v0194, scale_read_v0194,\n    HardwareStateV0194,\n};\n`;
if (!main.includes('mod solrak_hardware_v0194;')) {
  const marker = 'use tauri_plugin_updater::UpdaterExt;';
  if (!main.includes(marker)) throw new Error('main.rs: no se encontró import de updater');
  main = main.replace(marker, `${marker}\n\n${moduleBlock}`);
}
if (!main.includes('.manage(HardwareStateV0194::default())')) {
  const marker = '.invoke_handler(tauri::generate_handler![';
  if (!main.includes(marker)) throw new Error('main.rs: no se encontró invoke_handler');
  main = main.replace(marker, `.manage(HardwareStateV0194::default())\n        ${marker}`);
}
const required = [
  'hardware_status_v0194', 'list_serial_ports_v0194', 'scale_connect_v0194',
  'scale_read_v0194', 'scale_disconnect_v0194', 'list_windows_printers_v0194',
  'print_raw_ticket_v0194'
];
const handler = /tauri::generate_handler!\[([\s\S]*?)\]/m;
const match = main.match(handler);
if (!match) throw new Error('main.rs: generate_handler no encontrado');
let body = match[1];
for (const command of required) {
  if (!new RegExp(`\\b${command}\\b`).test(body)) body = body.replace(/\s*$/, '') + `,\n            ${command}\n        `;
}
main = main.replace(handler, `tauri::generate_handler![${body}]`);
await writeFile(mainPath, main, 'utf8');

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-hardware-v0194.js"></script>';
if (!index.includes(scriptTag)) {
  if (!index.includes('</body>')) throw new Error('dist/index.html: no se encontró </body>');
  index = index.replace('</body>', `${scriptTag}\n</body>`);
}
await writeFile(indexPath, index, 'utf8');

let tickets = await readFile(ticketsPath, 'utf8');
const directMarker = 'nativeHardware?.directPrintEnabled?.()';
const browserHelperMarker = 'function solrakPrintBrowserV0194(html)';
if (!tickets.includes(directMarker)) {
  const printStart = tickets.indexOf('  function printReceipt(receipt, options = {}) {');
  const frameStart = tickets.indexOf('    const frame = document.createElement("iframe");', printStart);
  const nextFunction = tickets.indexOf('\n\n  function readTicketForm()', frameStart);
  if (printStart < 0 || frameStart < 0 || nextFunction < 0) throw new Error('tickets v0.1.69: no se encontró el bloque de impresión esperado');

  const browserHelper = `  function solrakPrintBrowserV0194(html) {\n    const frame = document.createElement("iframe");\n    frame.title = "Impresión de ticket";\n    frame.style.cssText =\n      "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";\n    frame.onload = () => {\n      setTimeout(() => {\n        try {\n          frame.contentWindow?.focus();\n          frame.contentWindow?.print();\n        } catch {\n          if (typeof window.notice === "function")\n            window.notice("Windows no pudo abrir la impresión del ticket.", true);\n        }\n      }, 120);\n      setTimeout(() => frame.remove(), 60000);\n    };\n    document.body.appendChild(frame);\n    frame.srcdoc = html;\n    return true;\n  }\n\n`;
  tickets = tickets.slice(0, printStart) + browserHelper + tickets.slice(printStart);

  const shiftedPrintStart = tickets.indexOf('  function printReceipt(receipt, options = {}) {');
  const shiftedFrameStart = tickets.indexOf('    const frame = document.createElement("iframe");', shiftedPrintStart);
  const shiftedNextFunction = tickets.indexOf('\n\n  function readTicketForm()', shiftedFrameStart);
  const fallbackBlock = `    const nativeHardware = window.SOLRAKHardwareV0194;\n    if (nativeHardware?.directPrintEnabled?.()) {\n      nativeHardware.printReceipt(receipt, currentSettings).catch((error) => {\n        if (typeof window.notice === "function")\n          window.notice(\`Impresión directa no disponible: \${error?.message || error}. Se abrirá la impresión de Windows.\`, true);\n        solrakPrintBrowserV0194(html);\n      });\n      return true;\n    }\n    return solrakPrintBrowserV0194(html);\n  }`;
  tickets = tickets.slice(0, shiftedFrameStart) + fallbackBlock + tickets.slice(shiftedNextFunction);
}
await writeFile(ticketsPath, tickets, 'utf8');

for (const [file, markers] of [
  [mainPath, ['HardwareStateV0194', 'print_raw_ticket_v0194', 'scale_read_v0194']],
  [indexPath, ['solrak-hardware-v0194.js']],
  [ticketsPath, [directMarker, browserHelperMarker, 'Se abrirá la impresión de Windows.']],
]) {
  const text = await readFile(file, 'utf8');
  for (const marker of markers) if (!text.includes(marker)) throw new Error(`${file}: falta ${marker}`);
}

console.log('APPLY HARDWARE v0.1.94 OK: RAW/ESC-POS, fallback Windows, spooler, báscula COM y escáner teclado integrados en paquete nativo.');
