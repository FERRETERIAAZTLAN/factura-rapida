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
const count = html.split(remote).length - 1;
if (count !== 1) throw new Error(`Se esperaba exactamente una dependencia XLSX remota; encontradas ${count}`);
html = html.replace(remote, local);
if (html.includes(remote)) throw new Error('Persistió la URL remota de XLSX');

const tagRe = /<script\b([^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*)><\/script>/i;
const match = html.match(tagRe);
if (!match) throw new Error('No se encontró el tag local de XLSX después de vendorización');
let attrs = match[1];
if (!/\basync\b/i.test(attrs)) attrs = ` async${attrs}`;
if (!/\bdata-fr-xlsx-nonblocking=/i.test(attrs)) attrs = ` data-fr-xlsx-nonblocking="1"${attrs}`;
const replacement = `<script${attrs}></script>`;
html = html.replace(tagRe, replacement);

const finalTag = html.match(tagRe)?.[0] || '';
if (!/\basync\b/i.test(finalTag)) throw new Error('XLSX local sigue bloqueando el parser: falta async');
if (!finalTag.includes('data-fr-xlsx-nonblocking="1"')) throw new Error('Falta marcador XLSX no bloqueante');
if (/<script\b(?![^>]*\basync\b)[^>]*\bsrc=["']\.\/vendor\/xlsx\.full\.min\.js["'][^>]*><\/script>/i.test(html)) throw new Error('Persistió un XLSX parser-blocking');

await writeFile(htmlPath, html, 'utf8');
console.log(`STATIC ASSETS VENDORED OK: XLSX ${info.size} bytes queda local y ASYNC; no bloquea el parser de WebView2.`);
