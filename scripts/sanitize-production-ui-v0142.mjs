import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');

for (const marker of [
  'data-fr-production-clean="1"', 'data-fr-webview-debug="1"',
  'data-fr-facturar-real="8"', 'data-fr-login-clean="1"',
  'data-fr-usage-ui="1"', 'data-fr-business-mail-ui="1"', 'data-fr-issue-delivery="2"'
]) if (!html.includes(marker)) throw new Error(`UI productiva incompleta antes de sanear: ${marker}`);

// Probe mínimo como primer script real. No toca storage, red ni DOM de login.
const headProbe = `<script id="frFix1HeadProbe">\n(function(){\n  try{\n    const invoke=window.__TAURI__?.core?.invoke;\n    if(invoke)invoke('webview_milestone',{step:'HEAD_SCRIPT_STARTED',detail:JSON.stringify({readyState:document.readyState,href:location.href})}).catch(()=>{});\n  }catch{}\n})();\n</script>`;
if (!html.includes('id="frFix1HeadProbe"')) {
  const head = html.match(/<head(?:\s[^>]*)?>/i)?.[0];
  if (!head) throw new Error('No se encontró <head>');
  html = html.replace(head, `${head}\n${headProbe}`);
}

// El diagnóstico WebView2 queda en memoria durante todo el parser.
const debugStore = "try{localStorage.setItem('fr_debug_log',JSON.stringify(logs))}catch{}";
if (!html.includes(debugStore)) throw new Error('No se encontró persistencia temprana de debug revisada');
html = html.replace(debugStore, "window.__FR_DEBUG_LOG__=logs.slice(-200);");

// Sesión: preservar restauración, pero leer storage solo después de DOMContentLoaded.
const earlySession = "let session=JSON.parse(localStorage.getItem(LS)||'null');";
if (!html.includes(earlySession)) throw new Error('No se encontró inicialización temprana de sesión revisada');
html = html.replace(earlySession, "let session=null;window.__FR_SESSION_BOOT_DEFERRED__=true;");

const restoreCall = 'restore();';
const restoreCount = html.split(restoreCall).length - 1;
if (restoreCount !== 1) throw new Error(`Se esperaba un único restore() de arranque; encontrados ${restoreCount}`);
const deferredRestore = `const __frBootRestore=()=>{\n  try{session=JSON.parse(localStorage.getItem(LS)||'null')}catch{session=null}\n  restore();\n};\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',__frBootRestore,{once:true});\nelse queueMicrotask(__frBootRestore);`;
html = html.replace(restoreCall, deferredRestore);

// Watchdogs de loadAll pasan de abortar a solo diagnosticar lentitud.
const loginRace = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('loadAll tardó más de 15000 ms')),15000))]);";
const loginPassive = "const __frLoadSlow=setTimeout(()=>window.__frTrace?.('LOGIN_LOADALL_SLOW',{ms:15000}),15000);try{await loadAll()}finally{clearTimeout(__frLoadSlow)}";
if (!html.includes(loginRace)) throw new Error('No se encontró watchdog intrusivo de login revisado');
html = html.replace(loginRace, loginPassive);
const restoreRace = "await Promise.race([loadAll(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('restore loadAll tardó más de 15000 ms')),15000))]);";
const restorePassive = "const __frRestoreSlow=setTimeout(()=>window.__frTrace?.('RESTORE_LOADALL_SLOW',{ms:15000}),15000);try{await loadAll()}finally{clearTimeout(__frRestoreSlow)}";
if (!html.includes(restoreRace)) throw new Error('No se encontró watchdog intrusivo de restore revisado');
html = html.replace(restoreRace, restorePassive);

// Sonda real de foco/hit-test. No corrige estilos: solo certifica que el HTML resultante es interactivo.
const loginProbe = `<script id="frFix1LoginProbe">\n(function(){\n  const invoke=(cmd,args)=>{try{return window.__TAURI__?.core?.invoke?.(cmd,args)}catch{return null}};\n  function send(step,detail){try{invoke('webview_milestone',{step,detail:JSON.stringify(detail||{})})?.catch?.(()=>{})}catch{}}\n  function center(el){const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}\n  function ownsHit(el){const p=center(el);const hits=document.elementsFromPoint?document.elementsFromPoint(p.x,p.y):[document.elementFromPoint(p.x,p.y)].filter(Boolean);return hits.some(h=>h===el||el.contains(h))}\n  function run(){\n    send('DOM_CONTENT_LOADED',{readyState:document.readyState});\n    requestAnimationFrame(()=>requestAnimationFrame(()=>{\n      const business=document.getElementById('businessCode');\n      const user=document.getElementById('loginUser');\n      const pin=document.getElementById('loginPin');\n      const submit=document.querySelector('#loginForm button[type="submit"]');\n      const inputs=[business,user,pin];\n      const focus={};\n      for(const el of inputs){if(!el)continue;try{el.focus({preventScroll:true})}catch{try{el.focus()}catch{}}focus[el.id]=document.activeElement===el}\n      const hit={businessCode:!!business&&ownsHit(business),loginUser:!!user&&ownsHit(user),loginPin:!!pin&&ownsHit(pin),loginSubmit:!!submit&&ownsHit(submit)};\n      const focusOk=inputs.every(el=>!!el&&focus[el.id]===true);\n      const hitOk=Object.values(hit).every(Boolean);\n      const report={ok:focusOk&&hitOk,focusOk,hitOk,focus,hit,readyState:document.readyState};\n      send('LOGIN_HIT_FOCUS_OK',report);\n      try{invoke('login_ui_ready',{report:JSON.stringify(report)})?.catch?.(()=>{})}catch{}\n    }));\n  }\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();\n})();\n</script>`;
if (!html.includes('id="frFix1LoginProbe"')) html = html.replace('</body>', `${loginProbe}\n</body>`);

// Contratos: no permitir que reaparezcan los bloqueos conocidos.
for (const forbidden of [
  debugStore, earlySession,
  "new Error('loadAll tardó más de 15000 ms')",
  "new Error('restore loadAll tardó más de 15000 ms')"
]) if (html.includes(forbidden)) throw new Error(`Persistió patrón de arranque prohibido: ${forbidden}`);

// El head probe debe ser el primer script del documento.
const firstScript = html.search(/<script\b/i);
const probePos = html.indexOf('id="frFix1HeadProbe"');
if (firstScript < 0 || probePos < firstScript || probePos - firstScript > 80) throw new Error('frFix1HeadProbe no quedó como primer script');

// Revisión sintáctica de cada script inline transformado.
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for (let i=0;i<scripts.length;i++) {
  const src=(scripts[i][1].match(/\bsrc=["']([^"']+)/i)||[])[1];
  if(src) continue;
  try { new vm.Script(scripts[i][2], {filename:`v0142-inline-${i+1}.js`}); }
  catch(error) { throw new Error(`Script inline ${i+1} inválido: ${error.message}`); }
}

await writeFile(path, html, 'utf8');
console.log(`PRODUCTION UI SANITIZED V0.1.42 OK: scripts=${scripts.length}; restore preservado post-DOM; debug parser in-memory.`);
