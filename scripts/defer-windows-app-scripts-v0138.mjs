import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const outDir = process.argv[3] || 'desktop/dist/vendor/fr-app';
let html = await readFile(htmlPath, 'utf8');
await mkdir(outDir, { recursive: true });

const protectedIds = new Set(['frStorageMigration','frWindowsLoginHitJs','frNativeDesktopJs','frDeferredAppLoader']);
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let index = 0;
const parts = [];
html = html.replace(scriptRe, (whole, attrs, body) => {
  if (/\bsrc\s*=/.test(attrs)) return whole;
  const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1] || '';
  if (protectedIds.has(id)) return whole;
  if (!body.trim()) return whole;
  index += 1;
  const name = `part-${String(index).padStart(2,'0')}.js`;
  parts.push({ name, body });
  return `<script type="application/x-fr-deferred" data-fr-deferred-app="1" data-src="./vendor/fr-app/${name}"></script>`;
});

if (!parts.length) throw new Error('No se encontraron scripts productivos inline para diferir');
for (const part of parts) await writeFile(join(outDir, part.name), part.body, 'utf8');

const loader = `<script id="frDeferredAppLoader" data-fr-deferred-loader="1">\n(function(){\n  const load=async()=>{\n    if(window.__FR_APP_DEFERRED_LOADING__)return;\n    window.__FR_APP_DEFERRED_LOADING__=true;\n    const nodes=[...document.querySelectorAll('script[data-fr-deferred-app="1"]')];\n    for(const node of nodes){\n      const src=node.getAttribute('data-src');\n      if(!src)continue;\n      await new Promise((resolve,reject)=>{\n        const s=document.createElement('script');\n        s.src=src; s.async=false; s.dataset.frDeferredRuntime='1';\n        s.onload=resolve; s.onerror=()=>reject(new Error('No se pudo cargar '+src));\n        document.head.appendChild(s);\n      });\n    }\n    window.__FR_APP_DEFERRED_READY__=true;\n    try{window.__TAURI__?.core?.invoke?.('webview_milestone',{step:'APP_SCRIPTS_LOADED',detail:JSON.stringify({count:nodes.length,readyState:document.readyState})})}catch{}\n  };\n  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>load().catch(e=>console.error('[FR-DEFERRED]',e)),0)},{once:true});\n})();\n</script>`;

const guardEnd = html.indexOf('</script>', html.indexOf('id="frWindowsLoginHitJs"'));
if (guardEnd < 0) throw new Error('No se encontro guardia de login para insertar loader');
const insertAt = guardEnd + '</script>'.length;
html = html.slice(0, insertAt) + '\n' + loader + '\n' + html.slice(insertAt);

const firstProductive = html.indexOf('data-fr-deferred-app="1"');
const loaderPos = html.indexOf('id="frDeferredAppLoader"');
const guardPos = html.indexOf('id="frWindowsLoginHitJs"');
if (guardPos < 0 || loaderPos <= guardPos || firstProductive <= loaderPos) throw new Error('Orden diferido invalido');
for (const forbidden of ['<script data-fr-production-clean','<script data-fr-webview-debug']) {
  if (html.includes(forbidden)) throw new Error('Persistio script productivo inline bloqueante: '+forbidden);
}

await writeFile(htmlPath, html, 'utf8');
console.log(`DEFER WINDOWS APP V0.1.38 OK: ${parts.length} scripts productivos externos locales se cargan solo después de DOMContentLoaded.`);
