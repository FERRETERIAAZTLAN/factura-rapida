import { readFile } from 'node:fs/promises';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const tauriPath = process.argv[3] || 'desktop/src-tauri/tauri.conf.json';
const rustPath = process.argv[4] || 'desktop/src-tauri/src/main.rs';
const version = String(process.env.FR_VERSION || '').trim();
const profile = String(process.env.FR_WEBVIEW_PROFILE || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('FR_VERSION requerido');
if (!profile) throw new Error('FR_WEBVIEW_PROFILE requerido');

const [html, tauriRaw, rust] = await Promise.all([
  readFile(htmlPath, 'utf8'),
  readFile(tauriPath, 'utf8'),
  readFile(rustPath, 'utf8'),
]);
const tauri = JSON.parse(tauriRaw);
const main = tauri?.app?.windows?.find?.(w => w?.label === 'main') || tauri?.app?.windows?.[0];
if (!main) throw new Error('No existe ventana principal Tauri');
if (main.dataDirectory !== profile) throw new Error(`WebView2 sigue usando perfil anterior: dataDirectory=${String(main.dataDirectory)}`);
if (main.incognito !== false) throw new Error('El perfil aislado no debe ser incognito; debe persistir dentro del nuevo directorio');
if (tauri?.app?.withGlobalTauri !== true) throw new Error('window.__TAURI__ no está habilitado por configuración');

for (const marker of [
  'id="frStorageMigration"',
  `data-fr-storage-version="${version}"`,
  'localStorage.clear()',
  'sessionStorage.clear()',
  'window.__TAURI__',
  'data-fr-production-clean="1"',
]) if (!html.includes(marker)) throw new Error(`HTML sin marcador requerido: ${marker}`);

for (const marker of [
  'PAGE_LOAD {:?} {}',
  'CARGO_PKG_VERSION',
  'desktop_info',
  'check_for_updates',
  'install_update',
]) if (!rust.includes(marker)) throw new Error(`Rust sin marcador nativo requerido: ${marker}`);

console.log(`WEBVIEW PROFILE ISOLATION OK ${version}: dataDirectory=${profile}, puente Tauri global y diagnóstico PAGE_LOAD presentes.`);
