import { readFile, writeFile } from 'node:fs/promises';

const desktop = process.argv[2] || 'desktop';
const brand = 'SOLRAK';
const tauriPath = `${desktop}/src-tauri/tauri.conf.json`;
const htmlPath = `${desktop}/dist/index.html`;
const syncPath = `${desktop}/scripts/sync-web.mjs`;
const rustPath = `${desktop}/src-tauri/src/main.rs`;

const updaterEndpoint = 'https://github.com/FERRETERIAAZTLAN/factura-rapida/releases/latest/download/latest.json';
const technicalIdentifier = 'com.facturarapida.desktop';
const technicalLogName = 'factura-rapida-startup.log';

// Solo nombres heredados que son texto visible. No sustituir "solrak" de forma
// global: forma parte de filenames y namespaces técnicos de v0.1.62.
const oldVisibleNames = [
  'Factura Rápida',
  'Factura Rapida',
  'FACTURA RÁPIDA',
  'FACTURA RAPIDA',
];

function replaceVisibleBrand(text) {
  let out = text;
  for (const oldName of oldVisibleNames) out = out.split(oldName).join(brand);
  // Variantes de v0.1.61 solo cuando son literales/texto HTML, no identificadores.
  out = out.replace(/([>"'])Solrak(?=([<"']|\s))/g, `$1${brand}`);
  return out;
}

async function replaceOptional(path) {
  try {
    const original = await readFile(path, 'utf8');
    const updated = replaceVisibleBrand(original);
    if (updated !== original) await writeFile(path, updated, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const tauri = JSON.parse(await readFile(tauriPath, 'utf8'));
if (tauri.identifier !== technicalIdentifier) {
  throw new Error(`Identifier técnico inesperado: ${tauri.identifier}`);
}

tauri.productName = brand;
const windows = Array.isArray(tauri.app?.windows) ? tauri.app.windows : [];
const mainWindow = windows.find((w) => w?.label === 'main');
if (!mainWindow) throw new Error('No se encontró la ventana main');
mainWindow.title = brand;
await writeFile(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`, 'utf8');

let html = await readFile(htmlPath, 'utf8');
html = replaceVisibleBrand(html);
if (/<title>\s*<\/title>/i.test(html)) html = html.replace(/<title>\s*<\/title>/i, `<title>${brand}</title>`);
await writeFile(htmlPath, html, 'utf8');

for (const file of [
  'quotes-module.js',
  'quotes-email-module.js',
  'product-images-module.js',
  'pos-module.js',
  'solrak-desktop-v0162.js',
]) await replaceOptional(`${desktop}/dist/${file}`);

await replaceOptional(syncPath);

// Guardas técnicas: el rebranding jamás puede renombrar estos contratos.
const finalHtml = await readFile(htmlPath, 'utf8');
if (!finalHtml.includes('solrak-desktop-v0162.js?v=1')) throw new Error('Se alteró el filename técnico del shell SOLRAK');
const rust = await readFile(rustPath, 'utf8');
if (!rust.includes(updaterEndpoint)) throw new Error('Cambió el endpoint técnico del updater');
if (!rust.includes(technicalLogName)) throw new Error('Cambió el canal técnico de diagnóstico');

console.log('SOLRAK_UPPERCASE_BRAND_APPLIED');
