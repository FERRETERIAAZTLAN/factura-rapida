import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const remote = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const local = './vendor/xlsx.full.min.js';

assert.ok(html.includes(local), 'XLSX local no está referenciado');
assert.ok(!html.includes(remote), 'Persistió XLSX remoto');
const tags = [...html.matchAll(/<script\b[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*><\/script>/gi)].map(m => m[0]);
assert.equal(tags.length, 1, `Se esperaba un solo tag XLSX local; encontrados ${tags.length}`);
assert.match(tags[0], /\bdefer\b/i, 'XLSX local debe usar defer');
assert.doesNotMatch(tags[0], /\basync\b/i, 'XLSX v0.1.42 no debe usar async');
assert.match(tags[0], /data-fr-xlsx-nonblocking=["']1["']/i, 'Falta marcador XLSX no bloqueante');

console.log('WINDOWS XLSX DEFER V0.1.42 OK: XLSX local, defer, sin jsDelivr en el HTML empaquetado.');
