import { readFile } from 'node:fs/promises';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const rustPath = process.argv[3] || 'desktop/src-tauri/src/main.rs';
const html = await readFile(htmlPath, 'utf8');
const rust = await readFile(rustPath, 'utf8');

function assert(ok, message){ if(!ok) throw new Error(message); }

assert(!html.includes('id="frFix1HeadProbe"'), 'frFix1HeadProbe debe estar fuera del arranque v0.1.47');
assert(!html.includes('HEAD_SCRIPT_STARTED'), 'No debe existir invoke HEAD_SCRIPT_STARTED parser-time');
assert(!html.includes('const nativeFetch=window.fetch.bind(window)'), 'fetch global no debe quedar monkey-patched');
assert(!html.includes('window.fetch=async function'), 'window.fetch debe conservar implementación nativa');

const before = [...html.matchAll(/data-fr-url-probe="before-(\d+)"/g)];
const after = [...html.matchAll(/data-fr-url-probe="after-(\d+)"/g)];
assert(before.length >= 10, `Se esperaban >=10 probes BEFORE; hay ${before.length}`);
assert(before.length === after.length, `BEFORE/AFTER desbalanceados: ${before.length}/${after.length}`);
assert(html.includes("location.hash='FRP_B_01'"), 'Falta primer marcador URL');
assert(html.includes(`location.hash='FRP_A_${String(after.length).padStart(2,'0')}'`), 'Falta último marcador URL');

for (const marker of [
  'fn start_native_url_probe(app: AppHandle)',
  'app.get_webview_window("main")',
  'webview.url()',
  'NATIVE_URL_CHANGE',
  'NATIVE_EVAL_SENT',
  "location.hash='FR_NATIVE_DOM_'",
  'start_native_url_probe(app.handle().clone());'
]) assert(rust.includes(marker), `Rust sin marcador requerido: ${marker}`);

console.log(`WINDOWS WEBVIEW PROBE V0.1.47 OK: ${before.length} BEFORE + ${after.length} AFTER por URL; sin invoke temprano ni fetch override.`);
