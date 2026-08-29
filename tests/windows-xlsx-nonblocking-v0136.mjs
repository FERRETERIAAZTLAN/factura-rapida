import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const local = './vendor/xlsx.full.min.js';

assert.ok(html.includes(local), 'XLSX local no está referenciado');
assert.ok(!html.includes('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'), 'Persistió XLSX remoto');
const tags = [...html.matchAll(/<script\b[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*><\/script>/gi)].map(m => m[0]);
assert.equal(tags.length, 1, `Se esperaba un solo tag XLSX local; encontrados ${tags.length}`);
assert.match(tags[0], /\basync\b/i, 'XLSX local sigue siendo parser-blocking: falta async');
assert.match(tags[0], /data-fr-xlsx-nonblocking=["']1["']/i, 'Falta marcador XLSX no bloqueante');
assert.doesNotMatch(html, /<script\b(?![^>]*\basync\b)[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*><\/script>/i, 'Existe un tag XLSX síncrono');

console.log('WINDOWS XLSX NONBLOCKING OK: XLSX permanece local pero ya no bloquea el parser ni DOMContentLoaded.');
