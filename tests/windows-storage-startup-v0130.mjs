import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const tauriPath = process.argv[3] || 'desktop/src-tauri/tauri.conf.json';
const version = String(process.env.FR_VERSION || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('FR_VERSION requerido');

const [html, tauriRaw] = await Promise.all([
  readFile(htmlPath, 'utf8'),
  readFile(tauriPath, 'utf8'),
]);
const tauri = JSON.parse(tauriRaw);

if (tauri?.app?.withGlobalTauri !== true) throw new Error('Tauri no expone el API global: app.withGlobalTauri debe ser true');

const required = [
  'id="frStorageMigration"',
  `data-fr-storage-version="${version}"`,
  "const VERSION_KEY='fr_webview_storage_version'",
  'localStorage.clear()',
  'sessionStorage.clear()',
  'window.__FR_STORAGE_RESET__',
  'id="frNativeDesktopJs"',
  'window.__TAURI__',
  'desktop_info',
  'check_for_updates',
  'install_update',
  'data-fr-production-clean="1"',
];
for (const marker of required) if (!html.includes(marker)) throw new Error(`Falta marcador de arranque limpio: ${marker}`);

const scriptOpenings = [...html.matchAll(/<script(?:\s[^>]*)?>/gi)];
if (!scriptOpenings.length) throw new Error('HTML sin scripts');
const firstOpening = scriptOpenings[0][0];
if (!firstOpening.includes('id="frStorageMigration"')) throw new Error('La limpieza de almacenamiento no es el primer script del documento');

const migrationPos = html.indexOf('id="frStorageMigration"');
for (const later of ['const API_URL=', 'id="frNativeDesktopJs"', 'data-fr-login-clean="1"']) {
  const pos = html.indexOf(later);
  if (pos >= 0 && migrationPos > pos) throw new Error(`La limpieza ocurre demasiado tarde: después de ${later}`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((s) => s.trim());
for (let i = 0; i < inlineScripts.length; i++) {
  try { new vm.Script(inlineScripts[i], { filename: `inline-${i + 1}.js` }); }
  catch (error) { throw new Error(`JavaScript inválido en script inline ${i + 1}: ${error.message}`); }
}

console.log(`WINDOWS STARTUP CLEAN OK ${version}: migración WebView2 corre primero, scripts válidos y window.__TAURI__ queda habilitado.`);
