import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const path=process.argv[2]||'desktop/dist/index.html';
const html=fs.readFileSync(path,'utf8');

for(const marker of [
  'data-fr-production-clean="1"',
  'data-fr-login-clean="1"',
  'data-fr-webview-debug="1"',
  'id="frNativeBar"',
  'id="frNativeDesktopJs"',
  "invoke('desktop_info')",
  "invoke('check_for_updates')",
  "invoke('install_update')",
  'GLOBAL_ERROR',
  'UNHANDLED_REJECTION',
  'LOGIN_LOADALL_START',
  'LOGIN_LOADALL_OK',
  'LOGIN_LOADALL_SLOW',
  'RESTORE_LOADALL_START',
  'RESTORE_LOADALL_OK',
  'RESTORE_LOADALL_SLOW',
  'fr_debug_log'
]) assert.ok(html.includes(marker),`Falta integración requerida: ${marker}`);

assert.ok(!html.includes("Promise.race([loadAll()"),'El diagnóstico no debe interrumpir loadAll con Promise.race');
assert.ok(!html.includes('loadAll tardó más de 15000 ms'),'Persistió timeout intrusivo de login');
assert.ok(!html.includes('restore loadAll tardó más de 15000 ms'),'Persistió timeout intrusivo de restore');
assert.ok(!html.includes("if(step!=='HEARTBEAT'||"),'Persistió escritura periódica de HEARTBEAT a localStorage');
assert.ok(html.includes("if(step!=='HEARTBEAT')localStorage.setItem('fr_debug_log'"),'El log persistente debe excluir HEARTBEAT');

const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
assert.ok(inline.length>=10,'Cantidad inesperada de scripts inline');
inline.forEach((src,i)=>new vm.Script(src,{filename:`inline-${i+1}.js`}));

const nativeCount=(html.match(/id="frNativeDesktopJs"/g)||[]).length;
assert.equal(nativeCount,1,'Debe existir una sola integración nativa de Windows');
console.log(`DESKTOP PACKAGE OK: ${inline.length} scripts válidos, updater nativo presente y diagnóstico pasivo.`);
