import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const desktop = resolve(root, 'desktop');
const syncPath = resolve(desktop, 'scripts', 'sync-web.mjs');
const rustPath = resolve(desktop, 'src-tauri', 'src', 'main.rs');

let sync = await readFile(syncPath, 'utf8');
const oldSource = 'const source = resolve(repo, "index.html");';
const newSource = 'const source = process.env.FR_WEB_SOURCE ? resolve(process.env.FR_WEB_SOURCE) : resolve(repo, "index.html");';
if (!sync.includes(oldSource) && !sync.includes(newSource)) {
  throw new Error('sync-web.mjs: no se encontró la declaración de source esperada');
}
sync = sync.replace(oldSource, newSource);
await writeFile(syncPath, sync, 'utf8');

let rust = await readFile(rustPath, 'utf8');
const replacements = [
  ['write_startup_log("UPDATER_PLUGIN_OK 0.1.4");', 'write_startup_log(&format!("UPDATER_PLUGIN_OK {}", env!("CARGO_PKG_VERSION")));'],
  ['write_startup_log("START 0.1.4");', 'write_startup_log(&format!("START {}", env!("CARGO_PKG_VERSION")));'],
  ['write_startup_log("SETUP_OK 0.1.4");', 'write_startup_log(&format!("SETUP_OK {}", env!("CARGO_PKG_VERSION")));'],
];
for (const [from, to] of replacements) {
  if (rust.includes(from)) rust = rust.replace(from, to);
  else if (!rust.includes(to)) throw new Error(`main.rs: no se encontró patrón esperado: ${from}`);
}
await writeFile(rustPath, rust, 'utf8');

console.log('PREPARE WINDOWS DESKTOP OK: sync-web usa FR_WEB_SOURCE y Rust reporta CARGO_PKG_VERSION.');
