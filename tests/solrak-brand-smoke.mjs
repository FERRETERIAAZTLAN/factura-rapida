import { readFile } from 'node:fs/promises';

const desktop = process.argv[2] || 'desktop';
const tauri = JSON.parse(await readFile(`${desktop}/src-tauri/tauri.conf.json`, 'utf8'));
const html = await readFile(`${desktop}/dist/index.html`, 'utf8');
const rust = await readFile(`${desktop}/src-tauri/src/main.rs`, 'utf8');

if (tauri.productName !== 'Solrak') throw new Error(`productName incorrecto: ${tauri.productName}`);
if (tauri.identifier !== 'com.facturarapida.desktop') throw new Error(`identifier cambió: ${tauri.identifier}`);
const main = (tauri.app?.windows || []).find((w) => w?.label === 'main');
if (!main) throw new Error('Falta ventana main');
if (main.title !== 'Solrak') throw new Error(`Título de ventana incorrecto: ${main.title}`);
if (!html.includes('Solrak')) throw new Error('La UI no contiene la marca Solrak');
for (const oldName of ['Factura Rápida','Factura Rapida','FACTURA RÁPIDA','FACTURA RAPIDA']) {
  if (html.includes(oldName)) throw new Error(`Quedó marca visible antigua en UI: ${oldName}`);
}
if (!rust.includes('https://github.com/FERRETERIAAZTLAN/factura-rapida/releases/latest/download/latest.json')) {
  throw new Error('Cambió el endpoint técnico del updater');
}
if (!rust.includes('factura-rapida-startup.log')) throw new Error('Cambió el canal técnico de diagnóstico');

console.log('SOLRAK_BRAND_COMPATIBILITY_OK');
