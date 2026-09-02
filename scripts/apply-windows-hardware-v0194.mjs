import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = resolve(process.argv[2] || 'desktop');
const rustPath = resolve(desktop, 'src-tauri', 'src', 'main.rs');
const cargoPath = resolve(desktop, 'src-tauri', 'Cargo.toml');
const distPath = resolve(desktop, 'dist');
const indexPath = resolve(distPath, 'index.html');
const snippetPath = resolve(repo, 'desktop-native-v0194', 'hardware.rs.inc');
const bridgeSource = resolve(repo, 'solrak-windows-native-v0194.js');
const bridgeTarget = resolve(distPath, 'solrak-windows-native-v0194.js');

let rust = await readFile(rustPath, 'utf8');
const snippet = await readFile(snippetPath, 'utf8');
if (!rust.includes('SOLRAK_HARDWARE_V0194_BEGIN')) {
  const marker = '#[tauri::command]\nfn desktop_info';
  if (!rust.includes(marker)) throw new Error('main.rs: no se encontró desktop_info para insertar hardware v0.1.94');
  rust = rust.replace(marker, `${snippet.trim()}\n\n${marker}`);
}
if (!rust.includes('.manage(HardwareStateV0194::default())')) {
  const builder = 'tauri::Builder::default()';
  if (!rust.includes(builder)) throw new Error('main.rs: no se encontró Builder de Tauri');
  rust = rust.replace(builder, `${builder}\n        .manage(HardwareStateV0194::default())`);
}
const commands = [
  'list_serial_ports_v0194',
  'scale_connect_v0194',
  'scale_read_v0194',
  'scale_disconnect_v0194',
  'list_windows_printers_v0194',
  'print_windows_raw_v0194',
];
if (!commands.every((name) => new RegExp(`generate_handler!\\[[\\s\\S]*\\b${name}\\b`).test(rust))) {
  const handlerMarker = /tauri::generate_handler!\[\s*desktop_info,/;
  if (!handlerMarker.test(rust)) throw new Error('main.rs: no se encontró handler con desktop_info');
  rust = rust.replace(handlerMarker, `tauri::generate_handler![\n            desktop_info,\n            ${commands.join(',\n            ')},`);
}
await writeFile(rustPath, rust, 'utf8');

let cargo = await readFile(cargoPath, 'utf8');
if (!/^serialport\s*=/m.test(cargo)) {
  const dependency = 'serialport = { version = "4", default-features = false }\n';
  const marker = '[dependencies]\n';
  if (!cargo.includes(marker)) throw new Error('Cargo.toml: no se encontró [dependencies]');
  cargo = cargo.replace(marker, marker + dependency);
}
await writeFile(cargoPath, cargo, 'utf8');

await copyFile(bridgeSource, bridgeTarget);
let html = await readFile(indexPath, 'utf8');
const tag = '<script src="solrak-windows-native-v0194.js"></script>';
if (!html.includes(tag)) {
  const peripheralTag = '<script src="solrak-peripherals-v0191.js"></script>';
  if (html.includes(peripheralTag)) html = html.replace(peripheralTag, `${tag}\n${peripheralTag}`);
  else if (html.includes('</body>')) html = html.replace('</body>', `${tag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto de inserción para el puente Windows');
}
await writeFile(indexPath, html, 'utf8');

for (const name of commands) {
  if (!rust.includes(name)) throw new Error(`main.rs: falta ${name}`);
}
if (!rust.includes('serialport::available_ports()')) throw new Error('main.rs: falta enumeración serial real');
if (!rust.includes('WritePrinter')) throw new Error('main.rs: falta envío RAW al spooler de Windows');
if (!html.includes(tag)) throw new Error('dist/index.html: puente Windows v0.1.94 no integrado');

console.log(`SOLRAK v0.1.94 hardware aplicado en ${desktop}`);
