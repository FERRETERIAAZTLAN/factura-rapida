import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const htmlPath = resolve(process.argv[2] || 'desktop/dist/index.html');
const xlsxPath = resolve(process.argv[3] || 'desktop/dist/vendor/xlsx.full.min.js');
const info = await stat(xlsxPath);
if (!info.isFile() || info.size < 500_000) throw new Error(`XLSX local incompleto: ${info.size} bytes`);
const xlsx = await readFile(xlsxPath, 'utf8');
if (!xlsx.includes('XLSX') || xlsx.length < 500_000) throw new Error('XLSX local no parece ser la librería esperada');

let html = await readFile(htmlPath, 'utf8');
const remoteRe = /<script\b[^>]*\bsrc=["']https:\/\/cdn\.jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js["'][^>]*><\/script>/gi;
const localRe = /<script\b[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*><\/script>/gi;
const countRemote = [...html.matchAll(remoteRe)].length;
const countLocal = [...html.matchAll(localRe)].length;
if (countRemote + countLocal !== 1) throw new Error(`Se esperaba exactamente un tag XLSX de arranque; remoto=${countRemote} local=${countLocal}`);
html = html.replace(remoteRe, '').replace(localRe, '');

const loader = `<script id="frXlsxLazyLoader" data-fr-xlsx-lazy="1">\nlet __frXlsxPromise=null;\nfunction ensureXLSX(){\n  if(window.XLSX)return Promise.resolve(window.XLSX);\n  if(__frXlsxPromise)return __frXlsxPromise;\n  __frXlsxPromise=new Promise((resolve,reject)=>{\n    const s=document.createElement('script');\n    s.src='./vendor/xlsx.full.min.js';\n    s.dataset.frXlsxRuntime='1';\n    s.onload=()=>{if(window.XLSX)resolve(window.XLSX);else{__frXlsxPromise=null;reject(new Error('El lector de Excel no quedó disponible.'));}};\n    s.onerror=()=>{__frXlsxPromise=null;reject(new Error('No se pudo cargar el lector de Excel.'));};\n    document.head.appendChild(s);\n  });\n  return __frXlsxPromise;\n}\n</script>`;
if (!/<\/head>/i.test(html)) throw new Error('HTML sin </head>');
html = html.replace(/<\/head>/i, `${loader}\n</head>`);

const importRe = /if\s*\(\s*typeof\s+XLSX\s*===\s*['"]undefined['"]\s*\)\s*throw\s+new\s+Error\([^;]+;\s*const\s+data\s*=\s*await\s+file\.arrayBuffer\(\)\s*,\s*wb\s*=\s*XLSX\.read\(data,\{type:\s*['"]array['"]\}\)\s*;/;
if (!importRe.test(html)) throw new Error('No se encontró el handler de importar XLSX esperado');
html = html.replace(importRe, "await ensureXLSX();const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array'});");

const exportRe = /const\s+ws\s*=\s*XLSX\.utils\.json_to_sheet\(out\)/;
if (!exportRe.test(html)) throw new Error('No se encontró el handler de exportar XLSX esperado');
html = html.replace(exportRe, "await ensureXLSX();const ws=XLSX.utils.json_to_sheet(out)");

if (html.includes('cdn.jsdelivr.net/npm/xlsx@0.18.5')) throw new Error('Persistió XLSX remoto');
if (/<script\b[^>]*\bsrc=["'][^"']*xlsx\.full\.min\.js["'][^>]*><\/script>/i.test(html)) throw new Error('XLSX sigue siendo recurso estático de arranque');
if (!html.includes('data-fr-xlsx-lazy="1"') || !html.includes('function ensureXLSX()')) throw new Error('Loader lazy XLSX ausente');
if (!html.includes("await ensureXLSX();const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array'});")) throw new Error('Importar no espera XLSX lazy');
if (!html.includes('await ensureXLSX();const ws=XLSX.utils.json_to_sheet(out)')) throw new Error('Exportar no espera XLSX lazy');
if (/requestIdleCallback|addEventListener\(['"]load['"].*ensureXLSX|setTimeout\([^)]*ensureXLSX/s.test(loader)) throw new Error('XLSX lazy no debe precargarse automáticamente');

await writeFile(htmlPath, html, 'utf8');
console.log(`XLSX LAZY V0.1.44 OK: ${info.size} bytes; solo carga por Importar/Exportar.`);
