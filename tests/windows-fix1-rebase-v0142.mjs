import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath=process.argv[2]||'desktop/dist/index.html';
const tauriPath=process.argv[3]||'desktop/src-tauri/tauri.conf.json';
const rustPath=process.argv[4]||'desktop/src-tauri/src/main.rs';
const syncPath=process.argv[5]||'desktop/scripts/sync-web.mjs';
const html=await readFile(htmlPath,'utf8');
const tauri=JSON.parse(await readFile(tauriPath,'utf8'));
const rust=await readFile(rustPath,'utf8');
const sync=await readFile(syncPath,'utf8');

if(tauri.identifier!=='com.facturarapida.desktop')throw new Error('identifier distinto de FIX1');
if(tauri.app?.withGlobalTauri!==true)throw new Error('window.__TAURI__ no expuesto');
const win=(tauri.app?.windows||[]).find(w=>w.label==='main');
if(!win)throw new Error('sin ventana main');
for(const [k,v] of Object.entries({width:1440,height:900,minWidth:1050,minHeight:680,center:true,resizable:true,maximizable:true,minimizable:true,fullscreen:false}))if(win[k]!==v)throw new Error(`ventana FIX1 cambió ${k}`);
if('dataDirectory' in win||'incognito' in win)throw new Error('No se permite dataDirectory/incognito: se conserva perfil de FIX1');

for(const m of ['CARGO_PKG_VERSION','desktop_info','check_for_updates','install_update','webview_milestone','login_ui_ready','PAGE_LOAD'])if(!rust.includes(m))throw new Error(`Rust sin ${m}`);
const setupBlock=(rust.match(/\.setup\(\|_\| \{[\s\S]*?\}\)\n\s*\.invoke_handler/)||[])[0]||'';
if(!setupBlock)throw new Error('No se pudo aislar setup Rust');
if(/updater|plugin|check_for_updates|install_update/i.test(setupBlock))throw new Error('Updater/red invadió setup de FIX1');
if(!rust.includes('fn ensure_updater_plugin'))throw new Error('Updater lazy ausente');

for(const m of ['process.env.FR_WEB_SOURCE','id="frNativeDesktopJs"','check_for_updates','install_update'])if(!sync.includes(m))throw new Error(`sync-web FIX1 sin ${m}`);
if(/localStorage|sessionStorage|indexedDB|caches\./.test(sync))throw new Error('Puente nativo toca almacenamiento');

for(const m of [
 'data-fr-production-clean="1"','data-fr-webview-debug="1"','data-fr-facturar-real="8"','data-fr-login-clean="1"',
 'data-fr-usage-ui="1"','data-fr-business-mail-ui="1"','data-fr-issue-delivery="2"',
 'id="frFix1HeadProbe"','id="frFix1LoginProbe"','window.__FR_SESSION_BOOT_DEFERRED__=true',
 'LOGIN_LOADALL_SLOW','RESTORE_LOADALL_SLOW','data-fr-xlsx-nonblocking="1"','./vendor/xlsx.full.min.js'
])if(!html.includes(m))throw new Error(`HTML v0.1.42 sin ${m}`);

for(const forbidden of [
 "let session=JSON.parse(localStorage.getItem(LS)||'null');",
 "localStorage.setItem('fr_debug_log'",
 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
 "new Error('loadAll tardó más de 15000 ms')",
 "new Error('restore loadAll tardó más de 15000 ms')"
])if(html.includes(forbidden))throw new Error(`HTML conserva bloqueo conocido: ${forbidden}`);

const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
if(scripts.length<15)throw new Error(`scripts inesperados ${scripts.length}`);
for(let i=0;i<scripts.length;i++){
 const src=(scripts[i][1].match(/\bsrc=["']([^"']+)/i)||[])[1]; if(src)continue;
 new vm.Script(scripts[i][2],{filename:`accepted-inline-${i+1}.js`});
}
console.log(`FIX1 REBASE CONTRACT V0.1.42 OK scripts=${scripts.length}; perfil FIX1 preservado; fiscal+updater preservados.`);
