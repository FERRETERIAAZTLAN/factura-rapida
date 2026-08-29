import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const remote = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const local = './vendor/xlsx.full.min.js';

assert.ok(html.includes('id="frXlsxLazyLoader"'), 'Falta loader XLSX lazy');
assert.ok(html.includes('data-fr-xlsx-local-lazy="1"'), 'Falta marcador XLSX local lazy');
assert.ok(html.includes('window.__frEnsureXLSX'), 'Falta API lazy XLSX');
assert.ok(html.includes(local), 'XLSX local no está referenciado');
assert.ok(!html.includes(remote), 'Persistió XLSX remoto');
assert.equal([...html.matchAll(/<script\b[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*>/gi)].length, 0, 'XLSX no debe ser script parser/defer');
assert.match(html, /window\.addEventListener\('load',warm,\{once:true\}\)/, 'XLSX debe calentarse después de load');
console.log('WINDOWS XLSX LAZY V0.1.44 OK: local, dinámico y fuera de DOMContentLoaded.');
