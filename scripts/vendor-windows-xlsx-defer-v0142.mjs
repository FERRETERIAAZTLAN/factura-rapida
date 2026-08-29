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

let attrs = matches[0][1].replace(/\s(?:async|defer)(?=\s|$)/gi, '').replace(remote, local);
if (!/\bdata-fr-xlsx-nonblocking=/i.test(attrs)) attrs = ` data-fr-xlsx-nonblocking="1"${attrs}`;
attrs = ` defer${attrs}`;
const replacement = `<script${attrs}></script>`;
html = html.replace(tagRe, replacement);

if (html.includes(remote)) throw new Error('Persistió la URL remota de XLSX');
const localTagRe = /<script\b([^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*)><\/script>/i;
const localTag = html.match(localTagRe)?.[0] || '';
if (!localTag) throw new Error('No se encontró XLSX local después de vendorización');
if (!/\bdefer\b/i.test(localTag)) throw new Error('XLSX local sigue bloqueando el parser: falta defer');
if (/\basync\b/i.test(localTag)) throw new Error('XLSX v0.1.42 debe usar defer, no async, para conservar orden');
if (!localTag.includes('data-fr-xlsx-nonblocking="1"')) throw new Error('Falta marcador XLSX no bloqueante');

await writeFile(htmlPath, html, 'utf8');
console.log(`XLSX V0.1.42 LOCAL+DEFER OK: ${info.size} bytes; sin dependencia de jsDelivr durante login.`);
