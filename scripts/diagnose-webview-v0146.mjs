import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const rustPath = process.argv[3] || 'desktop/src-tauri/src/main.rs';

let html = await readFile(htmlPath, 'utf8');
let rust = await readFile(rustPath, 'utf8');

// Hipótesis v0.1.46: conservar el tracer, pero quitar SOLO el monkey-patch global de fetch.
const fetchOverride = /const nativeFetch=window\.fetch\.bind\(window\);window\.fetch=async function\(input,init\)\{[\s\S]*?\};let hb=0;/;
if (!fetchOverride.test(html)) throw new Error('No se encontró el override global de window.fetch esperado');
html = html.replace(fetchOverride, 'let hb=0;');
if (html.includes('const nativeFetch=window.fetch.bind(window)') || html.includes('window.fetch=async function')) {
  throw new Error('El override global de fetch no fue eliminado por completo');
}

// Señal de parser independiente del invoke: no envolvemos ni reordenamos scripts originales.
// El primer script (HEAD probe) se conserva como primer script. A partir del segundo,
// insertamos micro-scripts BEFORE/AFTER que solo cambian document.title.
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const originals = [...html.matchAll(scriptRe)];
if (originals.length < 10) throw new Error(`Cantidad de scripts inesperada: ${originals.length}`);
let ordinal = 0;
html = html.replace(scriptRe, (whole) => {
  ordinal += 1;
  if (ordinal === 1) return whole;
  const id = String(ordinal).padStart(2, '0');
  const before = `<script data-fr-parser-probe="before-${id}">document.title='FRP|B|${id}'</script>`;
  const after = `<script data-fr-parser-probe="after-${id}">document.title='FRP|A|${id}'</script>`;
  return `${before}${whole}${after}`;
});

// Validar sintaxis de todos los scripts inline después de instrumentar.
const instrumented = [...html.matchAll(scriptRe)];
for (let i = 0; i < instrumented.length; i++) {
  const attrs = instrumented[i][1];
  if (/\bsrc=["']/i.test(attrs)) continue;
  try { new vm.Script(instrumented[i][2], { filename: `v0146-inline-${i + 1}.js` }); }
  catch (error) { throw new Error(`Script inline ${i + 1} inválido tras diagnóstico: ${error.message}`); }
}

// Segunda señal independiente: Rust observa el título nativo sin depender de window.__TAURI__.invoke.
if (!rust.includes('use tauri::{AppHandle, Emitter};')) throw new Error('No se encontró import Tauri esperado');
rust = rust.replace('use tauri::{AppHandle, Emitter};', 'use tauri::{AppHandle, Emitter, Manager};');

const helper = String.raw`
fn start_native_title_probe(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_title = String::new();
        let mut eval_sent = false;
        for tick in 0..120u32 {
            std::thread::sleep(Duration::from_millis(250));
            let Some(webview) = app.get_webview_window("main") else {
                if tick == 4 { write_startup_log("NATIVE_TITLE_PROBE no-main-window"); }
                continue;
            };
            if let Ok(title) = webview.title() {
                if title != last_title {
                    write_startup_log(&format!("NATIVE_TITLE_CHANGE {}", title));
                    last_title = title;
                }
            }
            if tick >= 20 && !eval_sent {
                eval_sent = true;
                let script = r#"(()=>{try{const ids=['businessCode','loginUser','loginPin'];const present=ids.map(id=>document.getElementById(id)?'1':'0').join('');document.title='FR_NATIVE_DOM|'+document.readyState+'|'+present}catch(e){document.title='FR_NATIVE_DOM|ERR'}})();"#;
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

const setupMarker = 'write_startup_log(&format!("SETUP_OK {}", env!("CARGO_PKG_VERSION")));';
if (!rust.includes(setupMarker)) throw new Error('No se encontró SETUP_OK esperado para iniciar sonda nativa');
rust = rust.replace(setupMarker, `${setupMarker}\n            start_native_title_probe(app.handle().clone());`);

await writeFile(htmlPath, html, 'utf8');
await writeFile(rustPath, rust, 'utf8');
console.log(`WEBVIEW DIAG V0.1.46 OK: fetch override eliminado; ${originals.length} scripts originales; parser probes + sonda nativa instalados.`);
