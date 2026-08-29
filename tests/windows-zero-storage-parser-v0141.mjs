import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const tauriPath = process.argv[3] || 'desktop/src-tauri/tauri.conf.json';
const rustPath = process.argv[4] || 'desktop/src-tauri/src/main.rs';
const html = await readFile(htmlPath, 'utf8');
const tauri = JSON.parse(await readFile(tauriPath, 'utf8'));
const rust = await readFile(rustPath, 'utf8');

for (const marker of [
  '<meta name="fr-zero-storage-parser" content="2">',
  'window.__FR_SESSION_BOOT_DEFERRED__=true',
  'window.__FR_NATIVE_PREFS_DEFERRED__=true',
  'window.__FR_DEBUG_LOG__=logs.slice(-200)',
  'data-fr-storage-mode="isolated-profile"',
  'data-fr-xlsx-nonblocking="1"',
  'data-fr-production-clean="1"',
  'data-fr-facturar-real="8"',
  'data-fr-login-clean="1"',
  'id="frNativeDesktopJs"',
  'window.__TAURI__',
]) if (!html.includes(marker)) throw new Error(`Falta marcador: ${marker}`);

for (const forbidden of [
  "let session=JSON.parse(localStorage.getItem(LS)||'null');",
  "const saved=localStorage.getItem('frDesktopAutoCheck');",
  "localStorage.setItem('fr_debug_log'",
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
]) if (html.includes(forbidden)) throw new Error(`Persistio patron prohibido: ${forbidden}`);

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
if (scripts.length < 10) throw new Error(`Scripts inesperados: ${scripts.length}`);
for (let i = 0; i < scripts.length; i++) {
  const src = (scripts[i][1].match(/\bsrc=["']([^"']+)/i) || [])[1];
  if (src) continue;
  try { new vm.Script(scripts[i][2], { filename: `inline-${i + 1}.js` }); }
  catch (e) { throw new Error(`Script inline ${i + 1} no compila: ${e.message}`); }
}

if (tauri?.app?.withGlobalTauri !== true) throw new Error('withGlobalTauri no esta habilitado');
const main = (tauri?.app?.windows || []).find(w => w?.label === 'main') || tauri?.app?.windows?.[0];
if (!main || String(main.dataDirectory || '') !== String(process.env.FR_WEBVIEW_PROFILE || '')) throw new Error('Perfil WebView2 incorrecto');
for (const cmd of ['desktop_info','check_for_updates','install_update','webview_milestone','login_ui_ready']) if (!rust.includes(cmd)) throw new Error(`Rust sin ${cmd}`);
console.log(`ZERO STORAGE PARSER V0.1.41 OK scripts=${scripts.length}`);
