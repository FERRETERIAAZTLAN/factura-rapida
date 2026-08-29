import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const rustPath = process.argv[3] || 'desktop/src-tauri/src/main.rs';

let html = await readFile(htmlPath, 'utf8');
let rust = await readFile(rustPath, 'utf8');

// v0.1.46 probó que quitar solo el monkey-patch de fetch NO basta.
// Conservamos ese cambio y ahora quitamos el único invoke que ocurre durante el parser temprano.
const fetchOverride = /const nativeFetch=window\.fetch\.bind\(window\);window\.fetch=async function\(input,init\)\{[\s\S]*?\};let hb=0;/;
if (!fetchOverride.test(html)) throw new Error('No se encontró el override global de window.fetch esperado');
html = html.replace(fetchOverride, 'let hb=0;');

const headProbeRe = /<script id="frFix1HeadProbe">[\s\S]*?<\/script>\s*/i;
if (!headProbeRe.test(html)) throw new Error('No se encontró frFix1HeadProbe para retirar invoke parser-time');
html = html.replace(headProbeRe, '');
if (html.includes('HEAD_SCRIPT_STARTED') || html.includes('id="frFix1HeadProbe"')) {
  throw new Error('Persistió el invoke HEAD_SCRIPT_STARTED durante el parser');
}

// Señal realmente observable por Rust: el parser cambia location.hash antes/después de cada script original.
// Rust consulta WebviewWindow::url(); no depende de window.__TAURI__, invoke, fetch ni document.title.
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const originals = [...html.matchAll(scriptRe)];
if (originals.length < 10) throw new Error(`Cantidad de scripts inesperada: ${originals.length}`);
let ordinal = 0;
html = html.replace(scriptRe, (whole) => {
  ordinal += 1;
  const id = String(ordinal).padStart(2, '0');
  const before = `<script data-fr-url-probe="before-${id}">location.hash='FRP_B_${id}'</script>`;
  const after = `<script data-fr-url-probe="after-${id}">location.hash='FRP_A_${id}'</script>`;
  return `${before}${whole}${after}`;
});

const instrumented = [...html.matchAll(scriptRe)];
for (let i = 0; i < instrumented.length; i++) {
  const attrs = instrumented[i][1];
  if (/\bsrc=["']/i.test(attrs)) continue;
  try { new vm.Script(instrumented[i][2], { filename: `v0147-inline-${i + 1}.js` }); }
  catch (error) { throw new Error(`Script inline ${i + 1} inválido tras diagnóstico: ${error.message}`); }
}

if (!rust.includes('use tauri::{AppHandle, Emitter};')) throw new Error('No se encontró import Tauri esperado');
rust = rust.replace('use tauri::{AppHandle, Emitter};', 'use tauri::{AppHandle, Emitter, Manager};');

const helper = String.raw`
fn start_native_url_probe(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_url = String::new();
        let mut eval_sent = false;
        for tick in 0..600u32 {
            std::thread::sleep(Duration::from_millis(50));
            let Some(webview) = app.get_webview_window("main") else {
                if tick == 20 { write_startup_log("NATIVE_URL_PROBE no-main-window"); }
                continue;
            };
            if let Ok(url) = webview.url() {
                let current = url.to_string();
                if current != last_url {
                    write_startup_log(&format!("NATIVE_URL_CHANGE {}", current));
                    last_url = current;
                }
            }
            if tick >= 100 && !eval_sent {
                eval_sent = true;
                let script = r#"(()=>{try{const ids=['businessCode','loginUser','loginPin'];const present=ids.map(id=>document.getElementById(id)?'1':'0').join('');location.hash='FR_NATIVE_DOM_'+document.readyState+'_'+present}catch(e){location.hash='FR_NATIVE_DOM_ERR'}})();"#;
                match webview.eval(script) {
                    Ok(_) => write_startup_log("NATIVE_EVAL_SENT"),
                    Err(error) => write_startup_log(&format!("NATIVE_EVAL_ERROR {}", error)),
                }
            }
        }
    });
}
`;

const mainPos = rust.indexOf('fn main()');
if (mainPos < 0) throw new Error('No se encontró fn main() en Rust');
rust = rust.slice(0, mainPos) + helper + '\n' + rust.slice(mainPos);

const setupClosure = '.setup(|_| {';
if (!rust.includes(setupClosure)) throw new Error('No se encontró closure setup FIX1 esperado');
rust = rust.replace(setupClosure, '.setup(|app| {');

const setupMarker = 'write_startup_log(&format!("SETUP_OK {}", env!("CARGO_PKG_VERSION")));';
if (!rust.includes(setupMarker)) throw new Error('No se encontró SETUP_OK esperado');
rust = rust.replace(setupMarker, `${setupMarker}\n            start_native_url_probe(app.handle().clone());`);

await writeFile(htmlPath, html, 'utf8');
await writeFile(rustPath, rust, 'utf8');
console.log(`WEBVIEW DIAG V0.1.47 OK: head invoke eliminado; fetch nativo; ${originals.length} scripts con URL probes observables desde Rust.`);
