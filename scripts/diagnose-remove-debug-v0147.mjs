import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const rustPath = process.argv[3] || 'desktop/src-tauri/src/main.rs';
let html = await readFile(htmlPath, 'utf8');
let rust = await readFile(rustPath, 'utf8');

// v0.1.47: quitar COMPLETO el segundo script de diagnóstico WebView.
// No se toca lógica de negocio, fiscal ni los scripts de login/producción.
const debugRe = /<script\b[^>]*data-fr-webview-debug=["']1["'][^>]*>[\s\S]*?<\/script>/i;
const debugMatches = html.match(new RegExp(debugRe.source, 'gi')) || [];
if (debugMatches.length !== 1) throw new Error(`Se esperaba 1 script data-fr-webview-debug; encontrados ${debugMatches.length}`);
html = html.replace(debugRe, '');
if (/data-fr-webview-debug=["']1["']/i.test(html)) throw new Error('Persistió script debug WebView');
if (html.includes('window.fetch=async function') || html.includes('const nativeFetch=window.fetch.bind(window)')) throw new Error('Persistió override fetch del debug');

// Instrumentación independiente: mantener el HEAD probe como primer script original.
// Insertar BEFORE/AFTER alrededor de cada script restante a partir del segundo.
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const originals = [...html.matchAll(scriptRe)];
if (originals.length < 10) throw new Error(`Muy pocos scripts tras quitar debug: ${originals.length}`);
if (!/id=["']frFix1HeadProbe["']/i.test(originals[0][1])) throw new Error('frFix1HeadProbe dejó de ser el primer script');
let ordinal = 0;
html = html.replace(scriptRe, (whole) => {
  ordinal += 1;
  if (ordinal === 1) return whole;
  const id = String(ordinal).padStart(2, '0');
  return `<script data-fr-parser-probe="before-${id}">document.title='FR47|B|${id}'</script>${whole}<script data-fr-parser-probe="after-${id}">document.title='FR47|A|${id}'</script>`;
});

// Validar todos los scripts inline generados.
const generated = [...html.matchAll(scriptRe)];
for (let i=0;i<generated.length;i++) {
  if (/\bsrc=["']/i.test(generated[i][1])) continue;
  try { new vm.Script(generated[i][2], {filename:`v0147-inline-${i+1}.js`}); }
  catch (error) { throw new Error(`Script inline ${i+1} inválido: ${error.message}`); }
}

// Sonda Rust independiente de invoke() de la página.
if (!rust.includes('use tauri::{AppHandle, Emitter};')) throw new Error('Import Tauri base inesperado');
rust = rust.replace('use tauri::{AppHandle, Emitter};', 'use tauri::{AppHandle, Emitter, Manager};');
const helper = String.raw`
fn start_native_v0147_probe(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_title = String::new();
        let mut eval_sent = false;
        for tick in 0..300u32 {
            std::thread::sleep(Duration::from_millis(100));
            let Some(webview) = app.get_webview_window("main") else { continue; };
            if let Ok(title) = webview.title() {
                if title != last_title {
                    write_startup_log(&format!("NATIVE_TITLE_CHANGE {}", title));
                    last_title = title;
                }
            }
            if tick >= 30 && !eval_sent {
                eval_sent = true;
                let script = r#"(()=>{try{const ids=['businessCode','loginUser','loginPin'];const present=ids.map(id=>document.getElementById(id)?'1':'0').join('');document.title='FR47DOM|'+document.readyState+'|'+present}catch(e){document.title='FR47DOM|ERR'}})();"#;
                match webview.eval(script) {
                    Ok(_) => write_startup_log("NATIVE_EVAL_SENT_V0147"),
                    Err(error) => write_startup_log(&format!("NATIVE_EVAL_ERROR_V0147 {}", error)),
                }
            }
        }
    });
}
`;
const mainPos = rust.indexOf('fn main()');
if (mainPos < 0) throw new Error('No se encontró fn main()');
rust = rust.slice(0, mainPos) + helper + '\n' + rust.slice(mainPos);
if (!rust.includes('.setup(|_| {')) throw new Error('Setup FIX1 inesperado');
rust = rust.replace('.setup(|_| {', '.setup(|app| {');
const setupMarker = 'write_startup_log(&format!("SETUP_OK {}", env!("CARGO_PKG_VERSION")));';
if (!rust.includes(setupMarker)) throw new Error('SETUP_OK esperado no encontrado');
rust = rust.replace(setupMarker, `${setupMarker}\n            start_native_v0147_probe(app.handle().clone());`);

await writeFile(htmlPath, html, 'utf8');
await writeFile(rustPath, rust, 'utf8');
console.log(`WEBVIEW DIAG V0.1.47 OK: debug WebView completo removido; ${originals.length} scripts restantes; probes nativos instalados.`);
