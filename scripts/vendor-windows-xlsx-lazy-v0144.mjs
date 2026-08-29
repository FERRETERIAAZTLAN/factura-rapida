import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const htmlPath = resolve(process.argv[2] || 'desktop/dist/index.html');
const xlsxPath = resolve(process.argv[3] || 'desktop/dist/vendor/xlsx.full.min.js');
const remote = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const local = './vendor/xlsx.full.min.js';

const info = await stat(xlsxPath);
if (!info.isFile() || info.size < 500_000) throw new Error(`XLSX local incompleto: ${info.size} bytes`);
const xlsx = await readFile(xlsxPath, 'utf8');
if (!xlsx.includes('XLSX') || xlsx.length < 500_000) throw new Error('XLSX local no parece ser la librería esperada');

let html = await readFile(htmlPath, 'utf8');
const tagRe = /<script\b([^>]*\bsrc=["']https:\/\/cdn\.jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js["'][^>]*)><\/script>/i;
const matches = [...html.matchAll(new RegExp(tagRe.source, 'gi'))];
if (matches.length !== 1) throw new Error(`Se esperaba exactamente un tag XLSX remoto; encontrados ${matches.length}`);

const lazy = `<script id="frXlsxLazyLoader" data-fr-xlsx-local-lazy="1">\n(function(){\n  let promise=null;\n  window.__frEnsureXLSX=function(){\n    if(window.XLSX)return Promise.resolve(window.XLSX);\n    if(promise)return promise;\n    promise=new Promise((resolve,reject)=>{\n      const s=document.createElement('script');\n      s.src='${local}';\n      s.async=true;\n      s.dataset.frXlsxRuntime='1';\n      s.onload=()=>resolve(window.XLSX);\n      s.onerror=()=>{promise=null;reject(new Error('No se pudo cargar XLSX local'))};\n      document.head.appendChild(s);\n    });\n    return promise;\n  };\n  const warm=()=>{const run=()=>window.__frEnsureXLSX().catch(()=>{}); if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:3000}); else setTimeout(run,0)};\n  if(document.readyState==='complete')warm(); else window.addEventListener('load',warm,{once:true});\n})();\n</script>`;
html = html.replace(tagRe, lazy);

if (html.includes(remote)) throw new Error('Persistió la URL remota de XLSX');
if (!html.includes(local)) throw new Error('XLSX local no quedó referenciado por el loader');
if (/<script\b[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*>/i.test(html)) throw new Error('XLSX volvió a quedar como script parser/defer; debe cargarse dinámicamente después de load');

await writeFile(htmlPath, html, 'utf8');
console.log(`XLSX V0.1.44 LOCAL+LAZY OK: ${info.size} bytes; no participa en parser ni DOMContentLoaded.`);
