import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath=process.argv[2]||'desktop/dist/index.html';
const rustPath=process.argv[3]||'desktop/src-tauri/src/main.rs';
const confPath=process.argv[4]||'desktop/src-tauri/tauri.conf.json';
const expectedProfile=process.env.FR_WEBVIEW_PROFILE||'webview-profile-v3';
const html=fs.readFileSync(htmlPath,'utf8');
const rust=fs.readFileSync(rustPath,'utf8');
const conf=JSON.parse(fs.readFileSync(confPath,'utf8'));

for(const marker of [
  'id="frWindowsLoginHitCss"',
  'id="frWindowsLoginHitJs"',
  'data-fr-windows-login-hit="1"',
  "IDS=['businessCode','loginUser','loginPin','loginBtn']",
  'document.elementFromPoint',
  'document.elementsFromPoint',
  "invoke('login_ui_ready'",
  '2147483000',
  './vendor/xlsx.full.min.js',
]) assert.ok(html.includes(marker),`HTML Windows sin marcador: ${marker}`);

assert.ok(!html.includes('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'),'Persistió XLSX remoto');
for(const id of ['authLayer','businessCode','loginUser','loginPin','loginBtn','loginForm']) assert.ok(html.includes(`id="${id}"`),`Falta elemento de login ${id}`);
for(const marker of ['fn login_ui_ready(','LOGIN_UI_READY','login_ui_ready']) assert.ok(rust.includes(marker),`Rust sin marcador ${marker}`);
assert.match(rust,/generate_handler!\[[\s\S]*login_ui_ready[\s\S]*\]/,'login_ui_ready no está registrado en generate_handler');
const win=(conf.app?.windows||[]).find(w=>w.label==='main')||conf.app?.windows?.[0];
assert.equal(win?.dataDirectory,expectedProfile,'Perfil WebView2 incorrecto');
assert.equal(conf.app?.withGlobalTauri,true,'window.__TAURI__ no está habilitado');
console.log(`WINDOWS LOGIN CONTRACT OK: perfil=${expectedProfile}, XLSX local y handshake real login_ui_ready presentes.`);
