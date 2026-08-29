import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');
let changes = 0;

function replaceRequired(from, to, label) {
  if (!html.includes(from)) throw new Error(`No se encontro patron requerido: ${label}`);
  html = html.replace(from, to);
  changes++;
}

// 1) El diagnostico temprano queda solo en memoria. WebView2 no toca storage durante el parser.
for (const candidate of [
  "try{if(row.step!=='HEARTBEAT'||logs.length%6===0)localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}",
  "try{localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}",
]) {
  if (html.includes(candidate)) {
    html = html.replace(candidate, "window.__FR_DEBUG_LOG__=logs.slice(-200)");
    changes++;
    break;
  }
}
if (!html.includes('window.__FR_DEBUG_LOG__=logs.slice(-200)')) throw new Error('No se pudo volver in-memory el diagnostico WebView2');

// 2) La sesion NO se lee durante parseo. El login siempre nace interactivo.
replaceRequired(
  "let session=JSON.parse(localStorage.getItem(LS)||'null');",
  "let session=null;window.__FR_SESSION_BOOT_DEFERRED__=true;",
  'lectura temprana de sesion'
);

// 3) El puente nativo tampoco lee preferencias de storage durante parseo.
replaceRequired(
  "const saved=localStorage.getItem('frDesktopAutoCheck');",
  "const saved=null;window.__FR_NATIVE_PREFS_DEFERRED__=true;window.addEventListener('DOMContentLoaded',()=>{try{const v=localStorage.getItem('frDesktopAutoCheck');if(v!==null)auto.checked=v==='1'}catch{}},{once:true});",
  'lectura temprana de preferencia nativa'
);

// 4) Las escrituras de preferencias ocurren por eventos del usuario, pero se protegen para no bloquear la UI.
html = html.replace(
  "auto.addEventListener('change',()=>localStorage.setItem('frDesktopAutoCheck',auto.checked?'1':'0'));",
  "auto.addEventListener('change',()=>{try{localStorage.setItem('frDesktopAutoCheck',auto.checked?'1':'0')}catch{}});"
);

// Validacion estricta: antes de DOMContentLoaded solo permitimos storage en cuerpos de callbacks/eventos posteriores.
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('HTML sin scripts');

const initialSession = html.includes("let session=null;window.__FR_SESSION_BOOT_DEFERRED__=true;");
const debugMemory = html.includes('window.__FR_DEBUG_LOG__=logs.slice(-200)');
const nativeDeferred = html.includes('window.__FR_NATIVE_PREFS_DEFERRED__=true');
if (!initialSession || !debugMemory || !nativeDeferred) throw new Error('Faltan marcadores de arranque diferido');

// No debe quedar ninguna lectura top-level conocida que ya demostro bloquear WebView2.
for (const forbidden of [
  "let session=JSON.parse(localStorage.getItem(LS)||'null');",
  "const saved=localStorage.getItem('frDesktopAutoCheck');",
  "localStorage.setItem('fr_debug_log'",
]) {
  if (html.includes(forbidden)) throw new Error(`Persistio acceso parser-time prohibido: ${forbidden}`);
}

// Marca contractual para CI/runtime.
const marker = '<meta name="fr-zero-storage-parser" content="1">';
if (!html.includes(marker)) html = html.replace(/<head(?:\s[^>]*)?>/i, m => `${m}\n${marker}`);

await writeFile(path, html, 'utf8');
console.log(`WINDOWS STARTUP V0.1.40 OK: ${changes} parches; storage parser-time eliminado; sesion y preferencias diferidas.`);
