import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const htmlPath=process.argv[2]||'desktop/dist/index.html';
const rustPath=process.argv[3]||'desktop/src-tauri/src/main.rs';
const tauriPath=process.argv[4]||'desktop/src-tauri/tauri.conf.json';
const profile=String(process.env.FR_WEBVIEW_PROFILE||'').trim();

const html=fs.readFileSync(htmlPath,'utf8');
const rust=fs.readFileSync(rustPath,'utf8');
const tauri=JSON.parse(fs.readFileSync(tauriPath,'utf8'));

for(const marker of [
  'data-fr-windows-login-hit="2"',
  'HEAD_SCRIPT_STARTED',
  'DOM_CONTENT_LOADED',
  'WINDOW_LOAD',
  'LOGIN_HIT_FOCUS_OK',
  "invoke('webview_milestone'",
  'document.elementFromPoint',
  'document.elementsFromPoint',
  "IDS=['businessCode','loginUser','loginPin','loginBtn']",
  "INPUT_IDS=['businessCode','loginUser','loginPin']",
  'document.activeElement===el',
  'focusOk',
  'LOGIN_HIT_READY',
  'LOGIN_HIT_RETRY',
  "invoke('login_ui_ready'",
  'window.__frLoginHitTest=run',
  'data-fr-login-blocked',
]) assert.ok(html.includes(marker),`Falta marcador de hit/foco: ${marker}`);

for(const marker of [
  'fn webview_milestone(step: String, detail: String)',
  'WEBVIEW_MILESTONE {} {}',
  'fn login_ui_ready(report: String)',
  'LOGIN_UI_READY {}',
  'tauri::generate_handler!',
  'login_ui_ready',
  'PAGE_LOAD {:?} {}',
  'CARGO_PKG_VERSION',
]) assert.ok(rust.includes(marker),`Falta handshake Rust: ${marker}`);

assert.equal(tauri.app?.withGlobalTauri,true,'Tauri global debe estar habilitado');
const main=(tauri.app?.windows||[]).find(w=>w.label==='main')||(tauri.app?.windows||[])[0];
assert.ok(main?.dataDirectory,'La ventana debe usar perfil WebView2 explícito');
if(profile)assert.equal(main.dataDirectory,profile,'El perfil WebView2 no coincide con FR_WEBVIEW_PROFILE');
assert.equal(main?.incognito,false,'El perfil WebView2 debe ser persistente');

const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i],{filename:`inline-${i+1}.js`});

assert.ok(!html.includes("loadAll tardó más de 15000 ms"),'Persistió timeout intrusivo de login');
assert.ok(!html.includes("restore loadAll tardó más de 15000 ms"),'Persistió timeout intrusivo de restore');

console.log(`WINDOWS LOGIN HIT+FOCUS STATIC V0.1.35 OK: ${scripts.length} scripts compilan; los 4 controles requieren hit-test y los 3 inputs requieren foco antes del handshake nativo.`);
