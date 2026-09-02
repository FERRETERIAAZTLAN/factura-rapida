import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const desktop = resolve(process.argv[2] || 'desktop');
const repo = resolve(process.cwd());
const rustSource = resolve(repo, 'desktop-native-v0192/main.rs');
const cargoSource = resolve(repo, 'desktop-native-v0192/Cargo.toml');
const jsSource = resolve(repo, 'solrak-native-peripherals-v0192.js');
const rustTarget = resolve(desktop, 'src-tauri/src/main.rs');
const cargoTarget = resolve(desktop, 'src-tauri/Cargo.toml');
const distJs = resolve(desktop, 'dist/solrak-native-peripherals-v0192.js');
const distIndex = resolve(desktop, 'dist/index.html');

await copyFile(rustSource, rustTarget);
await copyFile(cargoSource, cargoTarget);
await copyFile(jsSource, distJs);

let html = await readFile(distIndex, 'utf8');
const tag = '<script src="solrak-native-peripherals-v0192.js"></script>';
if (!html.includes(tag)) {
  const before = '<script src="solrak-peripherals-v0191.js"></script>';
  if (html.includes(before)) html = html.replace(before, `${tag}\n${before}`);
  else if (html.includes('</body>')) html = html.replace('</body>', `${tag}\n</body>`);
  else throw new Error('dist/index.html no tiene punto seguro para integrar v0.1.92');
  await writeFile(distIndex, html, 'utf8');
}

const rust = await readFile(rustTarget, 'utf8');
const cargo = await readFile(cargoTarget, 'utf8');
for (const marker of ['print_thermal_ticket', 'list_windows_printers', 'scale_connect', 'scale_read', 'raw_spool']) {
  if (!rust.includes(marker)) throw new Error(`main.rs nativo no contiene ${marker}`);
}
if (!cargo.includes('serialport')) throw new Error('Cargo.toml perdió serialport');
console.log('SOLRAK v0.1.92 native peripherals integrated');
