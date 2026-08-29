import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
const appVersion = String(process.env.FR_VERSION || '').trim();
const storageMode = String(process.env.FR_STORAGE_BOOT_MODE || 'clear-first').trim();
if (!/^\d+\.\d+\.\d+$/.test(appVersion)) throw new Error('FR_VERSION es obligatorio para preparar el arranque limpio');
if (!['clear-first','isolated-profile'].includes(storageMode)) throw new Error('FR_STORAGE_BOOT_MODE invalido');

let html = await readFile(path, 'utf8');

const storageBoot = storageMode === 'isolated-profile'
  ? `<script id="frStorageMigration" data-fr-storage-version="${appVersion}" data-fr-storage-mode="isolated-profile">\n(function(){\n  const APP_VERSION=${JSON.stringify(appVersion)};\n  window.__FR_STORAGE_RESET__={reset:false,isolatedProfile:true,to:APP_VERSION};\n  window.__FR_STARTUP_STORAGE_BLOCKING__=false;\n})();\n</script>`
  : `<script id="frStorageMigration" data-fr-storage-version="${appVersion}" data-fr-storage-mode="clear-first">\n(function(){\n  const APP_VERSION=${JSON.stringify(appVersion)};\n  const VERSION_KEY='fr_webview_storage_version';\n  let previous=null;\n  try{\n    previous=localStorage.getItem(VERSION_KEY);\n    if(previous!==APP_VERSION){\n      localStorage.clear();\n      try{sessionStorage.clear()}catch{}\n      localStorage.setItem(VERSION_KEY,APP_VERSION);\n      window.__FR_STORAGE_RESET__={reset:true,from:previous,to:APP_VERSION};\n    }else{\n      window.__FR_STORAGE_RESET__={reset:false,from:previous,to:APP_VERSION};\n    }\n  }catch(error){\n    try{sessionStorage.clear()}catch{}\n    try{localStorage.removeItem('fr_session')}catch{}\n    try{localStorage.removeItem('factura_rapida_session')}catch{}\n    try{localStorage.removeItem('factura_rapida_session_v1')}catch{}\n    window.__FR_STORAGE_RESET__={reset:false,from:previous,to:APP_VERSION,error:String(error?.message||error)};\n  }\n})();\n</script>`;

if (!html.includes('id="frStorageMigration"')) {
  const head = html.match(/<head(?:\s[^>]*)?>/i)?.[0];
  if (!head) throw new Error('No se encontro <head> para inyectar preparacion de almacenamiento');
  html = html.replace(head, `${head}\n${storageBoot}`);
}

const migrationPos = html.indexOf('id="frStorageMigration"');
const firstAppScriptPos = html.search(/<script(?:\s[^>]*)?>/i);
if (migrationPos < 0 || firstAppScriptPos < 0 || migrationPos > firstAppScriptPos + 300) {
  throw new Error('La preparacion de almacenamiento no quedo al inicio del documento');
}

const loginRace = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('loadAll tardo mas de 15000 ms')),15000))]);";
const loginRaceAccent = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('loadAll tardó más de 15000 ms')),15000))]);";
const loginPassive = "const __frSlowTimer=setTimeout(()=>window.__frTrace?.('LOGIN_LOADALL_SLOW',{ms:15000}),15000);try{await loadAll()}finally{clearTimeout(__frSlowTimer)}";
if (html.includes(loginRaceAccent)) html = html.replace(loginRaceAccent, loginPassive);
else if (html.includes(loginRace)) html = html.replace(loginRace, loginPassive);
else if (!html.includes("LOGIN_LOADALL_SLOW")) throw new Error('No se encontro watchdog de login esperado');

const restoreRace = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('restore loadAll tardo mas de 15000 ms')),15000))]);";
const restoreRaceAccent = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('restore loadAll tardó más de 15000 ms')),15000))]);";
const restorePassive = "const __frRestoreSlowTimer=setTimeout(()=>window.__frTrace?.('RESTORE_LOADALL_SLOW',{ms:15000}),15000);try{await loadAll()}finally{clearTimeout(__frRestoreSlowTimer)}";
if (html.includes(restoreRaceAccent)) html = html.replace(restoreRaceAccent, restorePassive);
else if (html.includes(restoreRace)) html = html.replace(restoreRace, restorePassive);
else if (!html.includes("RESTORE_LOADALL_SLOW")) throw new Error('No se encontro watchdog de restore esperado');

const eagerStore = "try{localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}";
const throttledStore = "try{if(row.step!=='HEARTBEAT'||logs.length%6===0)localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}";
if (html.includes(eagerStore)) html = html.replace(eagerStore, throttledStore);
else if (!html.includes("row.step!=='HEARTBEAT'")) throw new Error('No se encontro persistencia de trazas esperada');

for (const marker of [
  'data-fr-production-clean="1"',
  'data-fr-webview-debug="1"',
  'id="frNativeBar"',
  'id="frNativeDesktopJs"',
  'window.__TAURI__',
  'id="frStorageMigration"',
  `data-fr-storage-version="${appVersion}"`,
  `data-fr-storage-mode="${storageMode}"`,
  'LOGIN_LOADALL_SLOW',
  'RESTORE_LOADALL_SLOW',
]) {
  if (!html.includes(marker)) throw new Error(`HTML final sin marcador requerido: ${marker}`);
}

if (storageMode === 'clear-first') {
  for (const marker of ["fr_webview_storage_version",'localStorage.clear()','sessionStorage.clear()']) {
    if (!html.includes(marker)) throw new Error(`HTML final sin limpieza requerida: ${marker}`);
  }
} else {
  const start = html.indexOf('id="frStorageMigration"');
  const end = html.indexOf('</script>', start);
  const boot = start >= 0 && end >= 0 ? html.slice(start, end) : '';
  for (const forbidden of ['localStorage','sessionStorage','indexedDB','caches.']) {
    if (boot.includes(forbidden)) throw new Error(`Arranque aislado toca almacenamiento sincronico: ${forbidden}`);
  }
  if (!boot.includes('window.__FR_STARTUP_STORAGE_BLOCKING__=false')) throw new Error('Falta marcador de arranque no bloqueante');
}

if (html.includes(loginRaceAccent) || html.includes(restoreRaceAccent) || html.includes(loginRace) || html.includes(restoreRace)) throw new Error('Persistio watchdog intrusivo Promise.race sobre loadAll');

await writeFile(path, html, 'utf8');
console.log(`FINALIZE WINDOWS HTML OK ${appVersion}: storageMode=${storageMode}; puentes nativos preservados.`);
