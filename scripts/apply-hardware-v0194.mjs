import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const src = resolve(desktop, 'src-tauri', 'src');
const cargoPath = resolve(desktop, 'src-tauri', 'Cargo.toml');
const mainPath = resolve(src, 'main.rs');
const indexPath = resolve(dist, 'index.html');
const ticketsPath = resolve(dist, 'solrak-sumapro-tickets-v0169.js');
const uiOperativaPath = resolve(dist, 'solrak-ui-operativa-v0183.js');

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
if (!tickets.includes(directMarker)) {
  const frameNeedle = '    const frame = document.createElement("iframe");';
  if (!tickets.includes(frameNeedle)) throw new Error('tickets v0.1.69: no se encontró inicio de impresión por iframe');
  const patch = `    const nativeHardware = window.SOLRAKHardwareV0194;\n    if (nativeHardware?.directPrintEnabled?.()) {\n      nativeHardware.printReceipt(receipt, currentSettings).catch((error) => {\n        if (typeof window.notice === "function") window.notice(error?.message || "No se pudo imprimir el ticket en la impresora térmica.", true);\n      });\n      return true;\n    }\n${frameNeedle}`;
  tickets = tickets.replace(frameNeedle, patch);
}
await writeFile(ticketsPath, tickets, 'utf8');

// WebView2: impedir que el observador global de v0.1.83 observe las mutaciones que su propio sync() produce.
// Se conserva la observación de cambios reales del POS; solo se suspende durante cada sincronización.
let uiOperativa = await readFile(uiOperativaPath, 'utf8');
const startupGuardMarker = 'syncObserver?.disconnect();';
if (!uiOperativa.includes(startupGuardMarker)) {
  const stateRe = /let\s+syncQueued\s*=\s*false\s*;/;
  if (!stateRe.test(uiOperativa)) throw new Error('UI v0.1.83: no se encontró estado de sincronización');
  uiOperativa = uiOperativa.replace(
    stateRe,
    (match) => `${match}\n  let syncObserver = null;\n  const SYNC_OBSERVER_OPTIONS = { childList: true, subtree: true, characterData: true };`
  );

  const timerRe = /setTimeout\(\s*\(\)\s*=>\s*\{\s*syncQueued\s*=\s*false\s*;\s*sync\(\)\s*;\s*\}\s*,\s*15\s*\)\s*;/;
  if (!timerRe.test(uiOperativa)) throw new Error('UI v0.1.83: no se encontró temporizador de scheduleSync esperado');
  uiOperativa = uiOperativa.replace(
    timerRe,
    `setTimeout(() => {\n      syncQueued = false;\n      syncObserver?.disconnect();\n      try { sync(); }\n      finally {\n        if (syncObserver && document.body?.isConnected) syncObserver.observe(document.body, SYNC_OBSERVER_OPTIONS);\n      }\n    }, 15);`
  );

  const observerRe = /new\s+MutationObserver\(\s*scheduleSync\s*\)\s*\.observe\(\s*document\.body\s*,\s*\{\s*childList\s*:\s*true\s*,\s*subtree\s*:\s*true\s*,\s*characterData\s*:\s*true\s*\}\s*\)\s*;/;
  if (!observerRe.test(uiOperativa)) throw new Error('UI v0.1.83: no se encontró MutationObserver esperado');
  uiOperativa = uiOperativa.replace(
    observerRe,
    'syncObserver = new MutationObserver(scheduleSync); syncObserver.observe(document.body, SYNC_OBSERVER_OPTIONS);'
  );
}
new vm.Script(uiOperativa, { filename: 'solrak-ui-operativa-v0183.js' });
await writeFile(uiOperativaPath, uiOperativa, 'utf8');

for (const [file, markers] of [
  [mainPath, ['HardwareStateV0194', 'print_raw_ticket_v0194', 'scale_read_v0194']],
  [indexPath, ['solrak-hardware-v0194.js']],
  [ticketsPath, [directMarker]],
  [uiOperativaPath, [startupGuardMarker, 'SYNC_OBSERVER_OPTIONS', 'syncObserver = new MutationObserver(scheduleSync)']],
]) {
  const text = await readFile(file, 'utf8');
  for (const marker of markers) if (!text.includes(marker)) throw new Error(`${file}: falta ${marker}`);
}

console.log('APPLY HARDWARE v0.1.94 OK: RAW/ESC-POS, spooler Windows, báscula COM, escáner teclado y arranque WebView sin autoobservación DOM.');