import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const path = process.argv[2] || 'desktop/dist/index.html';
const html = await readFile(path, 'utf8');

for (const marker of [
  '<meta name="fr-zero-storage-parser" content="1">',
  'window.__FR_SESSION_BOOT_DEFERRED__=true',
  'window.__FR_NATIVE_PREFS_DEFERRED__=true',
  'window.__FR_DEBUG_LOG__=logs.slice(-200)',
  'data-fr-storage-mode="isolated-profile"',
  'data-fr-xlsx-nonblocking="1"',
]) {
  if (!html.includes(marker)) throw new Error(`Falta marcador: ${marker}`);
}

for (const forbidden of [
  "let session=JSON.parse(localStorage.getItem(LS)||'null');",
  "const saved=localStorage.getItem('frDesktopAutoCheck');",
  "localStorage.setItem('fr_debug_log'",
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
]) {
  if (html.includes(forbidden)) throw new Error(`Persistio patron prohibido: ${forbidden}`);
}

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
if (scripts.length < 10) throw new Error(`Scripts inesperados: ${scripts.length}`);
for (let i = 0; i < scripts.length; i++) {
  const src = (scripts[i][1].match(/\bsrc=["']([^"']+)/i) || [])[1];
  if (src) continue;
  try { new vm.Script(scripts[i][2], { filename: `inline-${i + 1}.js` }); }
  catch (e) { throw new Error(`Script inline ${i + 1} no compila: ${e.message}`); }
}

console.log(`ZERO STORAGE PARSER V0.1.40 OK scripts=${scripts.length}`);
