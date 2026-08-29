import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');

const styleRe = /<style id="frWindowsLoginHitCss"[\s\S]*?<\/style>/i;
const scriptRe = /<script id="frWindowsLoginHitJs"[\s\S]*?<\/script>/i;
const style = html.match(styleRe)?.[0];
const script = html.match(scriptRe)?.[0];
if (!style || !script) throw new Error('No se encontro el guardia existente de login');

html = html.replace(styleRe, '').replace(scriptRe, '');
const storageStart = html.indexOf('id="frStorageMigration"');
if (storageStart < 0) throw new Error('No se encontro bootstrap de storage');
const storageEnd = html.indexOf('</script>', storageStart);
if (storageEnd < 0) throw new Error('Bootstrap de storage sin cierre');
const insertAt = storageEnd + '</script>'.length;
html = html.slice(0, insertAt) + '\n' + style + '\n' + script + '\n' + html.slice(insertAt);

const firstScript = html.search(/<script(?:\s[^>]*)?>/i);
const storagePos = html.indexOf('id="frStorageMigration"');
const guardPos = html.indexOf('id="frWindowsLoginHitJs"');
const debugPos = html.indexOf('data-fr-webview-debug="1"');
if (firstScript < 0 || storagePos < 0 || guardPos < 0) throw new Error('Orden temprano incompleto');
if (storagePos > firstScript + 300) throw new Error('Bootstrap aislado no es el primer script');
if (guardPos <= storagePos || (debugPos >= 0 && guardPos >= debugPos)) throw new Error('Guardia de login no quedo antes del script productivo de debug');

const bootEnd = html.indexOf('</script>', storagePos);
const boot = html.slice(storagePos, bootEnd);
for (const forbidden of ['localStorage','sessionStorage','indexedDB','caches.']) {
  if (boot.includes(forbidden)) throw new Error(`Primer script toca almacenamiento: ${forbidden}`);
}
for (const marker of ['HEAD_SCRIPT_STARTED','DOM_CONTENT_LOADED','LOGIN_HIT_FOCUS_OK',"invoke('webview_milestone'", "invoke('login_ui_ready'"]) {
  if (!script.includes(marker)) throw new Error(`Guardia temprano perdio marcador ${marker}`);
}

await writeFile(path, html, 'utf8');
console.log('WINDOWS LOGIN GUARD V0.1.37 REORDER OK: bootstrap aislado primero; guardia hit/focus segundo y antes de scripts productivos.');
