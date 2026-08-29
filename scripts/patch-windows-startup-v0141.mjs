import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');
let changes = 0;

function replaceRequired(from, to, label) {
  if (!html.includes(from)) throw new Error(`No se encontro patron requerido: ${label}`);
  html = html.replace(from, to);
  changes++;
}

// Diagnostico temprano: memoria solamente y SINTAXIS valida.
for (const candidate of [
  "try{if(row.step!=='HEARTBEAT'||logs.length%6===0)localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}",
  "try{localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}",
]) {
  if (html.includes(candidate)) {
    html = html.replace(candidate, ";window.__FR_DEBUG_LOG__=logs.slice(-200);");
    changes++;
    break;
  }
}

// Corrige especificamente el HTML roto que genero v0.1.40 si apareciera.
html = html.replace(
  "window.__frDebugLog=logs;window.__FR_DEBUG_LOG__=logs.slice(-200)try{console.log",
  "window.__frDebugLog=logs;window.__FR_DEBUG_LOG__=logs.slice(-200);try{console.log"
);

replaceRequired(
  "let session=JSON.parse(localStorage.getItem(LS)||'null');",
  "let session=null;window.__FR_SESSION_BOOT_DEFERRED__=true;",
  'lectura temprana de sesion'
);

replaceRequired(
  "const saved=localStorage.getItem('frDesktopAutoCheck');",
  "const saved=null;window.__FR_NATIVE_PREFS_DEFERRED__=true;window.addEventListener('DOMContentLoaded',()=>{try{const v=localStorage.getItem('frDesktopAutoCheck');if(v!==null)auto.checked=v==='1'}catch{}},{once:true});",
  'lectura temprana de preferencia nativa'
);

html = html.replace(
  "auto.addEventListener('change',()=>localStorage.setItem('frDesktopAutoCheck',auto.checked?'1':'0'));",
  "auto.addEventListener('change',()=>{try{localStorage.setItem('frDesktopAutoCheck',auto.checked?'1':'0')}catch{}});"
);

for (const forbidden of [
  "let session=JSON.parse(localStorage.getItem(LS)||'null');",
  "const saved=localStorage.getItem('frDesktopAutoCheck');",
  "localStorage.setItem('fr_debug_log'",
]) {
  if (html.includes(forbidden)) throw new Error(`Persistio acceso parser-time prohibido: ${forbidden}`);
}

for (const marker of [
  'window.__FR_SESSION_BOOT_DEFERRED__=true',
  'window.__FR_NATIVE_PREFS_DEFERRED__=true',
  'window.__FR_DEBUG_LOG__=logs.slice(-200)',
  'id="frNativeDesktopJs"',
  'window.__TAURI__',
  'data-fr-facturar-real="8"',
]) if (!html.includes(marker)) throw new Error(`Falta marcador requerido: ${marker}`);

const meta = '<meta name="fr-zero-storage-parser" content="2">';
html = html.replace(/<meta name="fr-zero-storage-parser" content="1">/i, meta);
if (!html.includes(meta)) html = html.replace(/<head(?:\s[^>]*)?>/i, m => `${m}\n${meta}`);

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for (let i = 0; i < scripts.length; i++) {
  const src = (scripts[i][1].match(/\bsrc=["']([^"']+)/i) || [])[1];
  if (src) continue;
  try { new vm.Script(scripts[i][2], { filename: `inline-${i + 1}.js` }); }
  catch (e) { throw new Error(`Script inline ${i + 1} invalido despues del parche: ${e.message}`); }
}

await writeFile(path, html, 'utf8');
console.log(`WINDOWS STARTUP V0.1.41 OK: ${changes} parches; JS valido; storage parser-time eliminado.`);
