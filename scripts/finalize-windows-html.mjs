import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');

const loginRace = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('loadAll tardó más de 15000 ms')),15000))]);";
const loginPassive = "const __frSlowTimer=setTimeout(()=>window.__frTrace?.('LOGIN_LOADALL_SLOW',{ms:15000}),15000);try{await loadAll()}finally{clearTimeout(__frSlowTimer)}";
if (html.includes(loginRace)) html = html.replace(loginRace, loginPassive);
else if (!html.includes("LOGIN_LOADALL_SLOW")) throw new Error('No se encontró watchdog de login esperado');

const restoreRace = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('restore loadAll tardó más de 15000 ms')),15000))]);";
const restorePassive = "const __frRestoreSlowTimer=setTimeout(()=>window.__frTrace?.('RESTORE_LOADALL_SLOW',{ms:15000}),15000);try{await loadAll()}finally{clearTimeout(__frRestoreSlowTimer)}";
if (html.includes(restoreRace)) html = html.replace(restoreRace, restorePassive);
else if (!html.includes("RESTORE_LOADALL_SLOW")) throw new Error('No se encontró watchdog de restore esperado');

const eagerStore = "try{localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}";
const throttledStore = "try{if(row.step!=='HEARTBEAT'||logs.length%6===0)localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}";
if (html.includes(eagerStore)) html = html.replace(eagerStore, throttledStore);
else if (!html.includes("row.step!=='HEARTBEAT'")) throw new Error('No se encontró persistencia de trazas esperada');

for (const marker of [
  'data-fr-production-clean="1"',
  'data-fr-webview-debug="1"',
  'id="frNativeBar"',
  'id="frNativeDesktopJs"',
  'window.__TAURI__',
  'LOGIN_LOADALL_SLOW',
  'RESTORE_LOADALL_SLOW',
]) {
  if (!html.includes(marker)) throw new Error(`HTML final sin marcador requerido: ${marker}`);
}

if (html.includes(loginRace) || html.includes(restoreRace)) throw new Error('Persistió watchdog intrusivo Promise.race sobre loadAll');

await writeFile(path, html, 'utf8');
console.log('FINALIZE WINDOWS HTML OK: puentes nativos preservados y watchdogs pasivos.');
