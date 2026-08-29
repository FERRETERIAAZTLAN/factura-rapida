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

const loader = `<script id="frXlsxLazyLoader" data-fr-xlsx-lazy="1">\n(function(){\n  var p=null;\n  window.ensureXLSX=function(){\n    if(window.XLSX)return Promise.resolve(window.XLSX);\n    if(p)return p;\n    p=new Promise(function(resolve,reject){\n      var s=document.createElement('script');\n      s.src='./vendor/xlsx.full.min.js';\n      s.onload=function(){if(window.XLSX)resolve(window.XLSX);else{p=null;reject(new Error('El lector de Excel no quedó disponible.'))}};\n      s.onerror=function(){p=null;reject(new Error('No se pudo cargar el lector de Excel.'))};\n      document.head.appendChild(s);\n    });\n    return p;\n  };\n})();\n</script>`;
if (!/<\/head>/i.test(html)) throw new Error('HTML sin </head>');
html = html.replace(/<\/head>/i, `${loader}\n</head>`);

const xlsxGuardRe = /if\s*\(\s*typeof\s+XLSX\s*===\s*['"]undefined['"]\s*\)\s*throw\s+new\s+Error\([^;]+;?/gi;
const guards = [...html.matchAll(xlsxGuardRe)].length;
if (guards !== 2) throw new Error(`Se esperaban exactamente 2 guards XLSX de importación; encontrados ${guards}`);
html = html.replace(xlsxGuardRe, 'await ensureXLSX();');

const exportNeedle = "b.disabled=true;try{const d=await post(EXPORT,type)";
const exportMatches = html.split(exportNeedle).length - 1;
if (exportMatches !== 1) throw new Error(`Se esperaba un handler de Exportar; encontrados ${exportMatches}`);
html = html.replace(exportNeedle, "b.disabled=true;try{await ensureXLSX();const d=await post(EXPORT,type)");

if (html.includes('cdn.jsdelivr.net/npm/xlsx@0.18.5')) throw new Error('Persistió XLSX remoto');
if (/<script\b[^>]*\bsrc=["'][^"']*xlsx\.full\.min\.js["'][^>]*><\/script>/i.test(html)) throw new Error('XLSX sigue siendo recurso estático de arranque');
if (!html.includes('data-fr-xlsx-lazy="1"') || !html.includes('window.ensureXLSX=function()')) throw new Error('Loader lazy XLSX ausente');
const ensureCalls = [...html.matchAll(/await\s+ensureXLSX\(\);/g)].length;
if (ensureCalls !== 3) throw new Error(`Se esperaban 3 usos bajo demanda de ensureXLSX; encontrados ${ensureCalls}`);
if (/requestIdleCallback|setTimeout\([^)]*ensureXLSX|addEventListener\([^)]*ensureXLSX/s.test(loader)) throw new Error('XLSX lazy no debe precargarse automáticamente');

await writeFile(htmlPath, html, 'utf8');
console.log(`XLSX LAZY REVIEWED OK: ${info.size} bytes; 2 importaciones + 1 exportación bajo demanda; cero carga al arranque.`);
