import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath=process.argv[2]||'desktop/dist/index.html';
const confPath=process.argv[3]||'desktop/src-tauri/tauri.conf.json';
const version=String(process.env.FR_VERSION||'').trim();
const profile=String(process.env.FR_WEBVIEW_PROFILE||'').trim();
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('FR_VERSION requerido');
if(!profile)throw new Error('FR_WEBVIEW_PROFILE requerido');
const html=await readFile(htmlPath,'utf8');
const conf=JSON.parse(await readFile(confPath,'utf8'));

const w=(conf.app?.windows||[]).find(x=>x.label==='main');
if(!w)throw new Error('Ventana main ausente');
if(String(w.dataDirectory)!==profile)throw new Error(`Perfil inesperado ${w.dataDirectory}`);
if(conf.app?.withGlobalTauri!==true)throw new Error('window.__TAURI__ no habilitado');

for(const marker of [
  'data-fr-storage-mode="isolated-profile"',
  `data-fr-storage-version="${version}"`,
  'window.__FR_STARTUP_STORAGE_BLOCKING__=false',
  'id="frWindowsLoginHitJs"',
  'HEAD_SCRIPT_STARTED',
  'DOM_CONTENT_LOADED',
  'LOGIN_HIT_FOCUS_OK',
  'LOGIN_UI_READY',
  'data-fr-xlsx-nonblocking="1"',
]) if(!html.includes(marker))throw new Error(`Falta marcador ${marker}`);

const storagePos=html.indexOf('id="frStorageMigration"');
const storageEnd=html.indexOf('</script>',storagePos);
const guardPos=html.indexOf('id="frWindowsLoginHitJs"');
const debugPos=html.indexOf('data-fr-webview-debug="1"');
if(storagePos<0||storageEnd<0||guardPos<0)throw new Error('Orden temprano incompleto');
const boot=html.slice(storagePos,storageEnd);
for(const forbidden of ['localStorage','sessionStorage','indexedDB','caches.'])if(boot.includes(forbidden))throw new Error(`Primer script bloqueante: ${forbidden}`);
if(!(storagePos<guardPos&&(debugPos<0||guardPos<debugPos)))throw new Error('Guardia no corre antes de scripts productivos');

const scriptRe=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m,n=0;
while((m=scriptRe.exec(html))){n++;new vm.Script(m[1],{filename:`inline-${n}.js`});}
if(n<10)throw new Error(`Se esperaban multiples scripts inline; hay ${n}`);
console.log(`WINDOWS ISOLATED STARTUP OK ${version}: perfil=${profile}, primer script sin storage, guardia temprano y ${n} scripts inline validos.`);
