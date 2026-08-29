import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const desktop = resolve(root, 'desktop');
const syncPath = resolve(desktop, 'scripts', 'sync-web.mjs');
const rustPath = resolve(desktop, 'src-tauri', 'src', 'main.rs');
const tauriPath = resolve(desktop, 'src-tauri', 'tauri.conf.json');
const webviewProfile = String(process.env.FR_WEBVIEW_PROFILE || 'webview-profile-v2').trim();
if (!/^[a-zA-Z0-9._-]+$/.test(webviewProfile)) throw new Error('FR_WEBVIEW_PROFILE inválido');

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
for (const marker of ['desktop_info', 'check_for_updates', 'install_update']) {
  if (!rust.includes(marker)) throw new Error(`main.rs: falta comando nativo requerido: ${marker}`);
}

const runtimeCommands = `#[tauri::command]\nfn webview_milestone(step: String, detail: String) -> Result<(), String> {\n    let safe_step: String = step.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-').take(80).collect();\n    if safe_step.is_empty() { return Err(\"step vacío\".into()); }\n    let safe_detail: String = detail.chars().take(2000).collect();\n    let safe_detail = safe_detail.replace('\\n', \" \").replace('\\r', \" \" );\n    write_startup_log(&format!(\"WEBVIEW_MILESTONE {} {}\", safe_step, safe_detail));\n    Ok(())\n}\n\n#[tauri::command]\nfn login_ui_ready(report: String) -> Result<(), String> {\n    let safe: String = report.chars().take(4000).collect();\n    let safe = safe.replace('\\n', \" \").replace('\\r', \" \" );\n    write_startup_log(&format!(\"LOGIN_UI_READY {}\", safe));\n    Ok(())\n}\n\n`;
if (!rust.includes('fn webview_milestone(') || !rust.includes('fn login_ui_ready(')) {
  const mainNeedle = 'fn main() {';
  if (!rust.includes(mainNeedle)) throw new Error('main.rs: no se encontró fn main para agregar diagnóstico WebView2');
  rust = rust.replace(mainNeedle, runtimeCommands + mainNeedle);
}

for (const marker of ['webview_milestone', 'login_ui_ready']) {
  if (!rust.includes(marker)) throw new Error(`main.rs: no se agregó comando ${marker}`);
}
if (!/generate_handler!\[[\s\S]*webview_milestone[\s\S]*login_ui_ready[\s\S]*\]/.test(rust)) {
  const handlerNeedle = `            install_update\n        ])`;
  const handlerPatch = `            install_update,\n            webview_milestone,\n            login_ui_ready\n        ])`;
  if (!rust.includes(handlerNeedle)) throw new Error('main.rs: no se encontró generate_handler esperado para agregar diagnósticos WebView2');
  rust = rust.replace(handlerNeedle, handlerPatch);
}

const setupNeedle = `    tauri::Builder::default()\n        .setup(|_| {`;
const pageLoadPatch = `    tauri::Builder::default()\n        .on_page_load(|_, payload| {\n            write_startup_log(&format!(\"PAGE_LOAD {:?} {}\", payload.event(), payload.url()));\n        })\n        .setup(|_| {`;
if (rust.includes(setupNeedle)) rust = rust.replace(setupNeedle, pageLoadPatch);
else if (!rust.includes('PAGE_LOAD {:?} {}')) throw new Error('main.rs: no se pudo agregar diagnóstico nativo de carga WebView2');
await writeFile(rustPath, rust, 'utf8');

const tauri = JSON.parse(await readFile(tauriPath, 'utf8'));
tauri.app ??= {};
tauri.app.withGlobalTauri = true;
if (!Array.isArray(tauri.app.windows) || !tauri.app.windows.length) throw new Error('tauri.conf.json: falta ventana principal');
const mainWindow = tauri.app.windows.find(w => w?.label === 'main') || tauri.app.windows[0];
mainWindow.dataDirectory = webviewProfile;
mainWindow.incognito = false;
await writeFile(tauriPath, JSON.stringify(tauri, null, 2) + '\n', 'utf8');

console.log(`PREPARE WINDOWS DESKTOP OK: perfil WebView2 aislado=${webviewProfile}, page-load + webview_milestone + login_ui_ready instrumentados.`);
