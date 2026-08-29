import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const remote = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const local = './vendor/xlsx.full.min.js';

assert.ok(html.includes('id="frXlsxLazyLoader"'), 'Falta loader XLSX lazy');
assert.ok(html.includes('data-fr-xlsx-lazy="1"'), 'Falta marcador XLSX lazy estricto');
assert.ok(html.includes('window.ensureXLSX=function()'), 'Falta window.ensureXLSX');
assert.ok(html.includes(local), 'XLSX local no está referenciado por el loader');
assert.ok(!html.includes(remote), 'Persistió XLSX remoto');
assert.equal([...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*xlsx\.full\.min\.js["'][^>]*>/gi)].length, 0, 'XLSX no debe existir como recurso estático de arranque');
assert.equal([...html.matchAll(/await\s+ensureXLSX\(\);/g)].length, 3, 'Deben existir exactamente 3 cargas bajo demanda: 2 importaciones y 1 exportación');
const loader = html.match(/<script id="frXlsxLazyLoader"[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '';
assert.ok(loader, 'No se pudo aislar el loader XLSX');
assert.doesNotMatch(loader, /requestIdleCallback|setTimeout\([^)]*ensureXLSX|addEventListener\([^)]*ensureXLSX|ensureXLSX\(\)\s*;/s, 'El loader no debe invocar XLSX automáticamente');
console.log('WINDOWS XLSX LAZY REVIEWED OK: 2 importaciones + 1 exportación; cero carga XLSX en arranque.');
