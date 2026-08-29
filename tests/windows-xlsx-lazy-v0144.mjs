import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const remote = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const local = './vendor/xlsx.full.min.js';

assert.ok(html.includes('id="frXlsxLazyLoader"'), 'Falta loader XLSX lazy');
assert.ok(html.includes('data-fr-xlsx-lazy="1"'), 'Falta marcador XLSX lazy estricto');
assert.ok(html.includes('function ensureXLSX()'), 'Falta ensureXLSX');
assert.ok(html.includes(local), 'XLSX local no está referenciado por el loader');
assert.ok(!html.includes(remote), 'Persistió XLSX remoto');
assert.equal([...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*xlsx\.full\.min\.js["'][^>]*>/gi)].length, 0, 'XLSX no debe existir como recurso estático de arranque');
assert.ok(html.includes("await ensureXLSX();const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array'});"), 'Importar debe cargar XLSX solo bajo demanda');
assert.ok(html.includes('await ensureXLSX();const ws=XLSX.utils.json_to_sheet(out)'), 'Exportar debe cargar XLSX solo bajo demanda');
assert.doesNotMatch(html, /requestIdleCallback|addEventListener\(['"]load['"].*ensureXLSX|setTimeout\([^)]*ensureXLSX/s, 'XLSX no debe precargarse en load/idle');
console.log('WINDOWS XLSX LAZY V0.1.44 OK: local y solo por acción de Importar/Exportar; fuera del arranque.');
