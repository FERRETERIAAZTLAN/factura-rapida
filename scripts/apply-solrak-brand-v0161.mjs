import { readFile, writeFile } from 'node:fs/promises';

const desktop = process.argv[2] || 'desktop';
const brand = 'Solrak';
const tauriPath = `${desktop}/src-tauri/tauri.conf.json`;
const htmlPath = `${desktop}/dist/index.html`;
const syncPath = `${desktop}/scripts/sync-web.mjs`;

const oldVisibleNames = [
  'Factura Rápida',
  'Factura Rapida',
  'FACTURA RÁPIDA',
  'FACTURA RAPIDA',
];

function replaceVisibleBrand(text) {
  let out = text;
  for (const oldName of oldVisibleNames) out = out.split(oldName).join(brand);
  return out;
}

const tauri = JSON.parse(await readFile(tauriPath, 'utf8'));

// Compatibilidad crítica: el identifier NO cambia. Así una instalación existente
// puede seguir recibiendo actualizaciones firmadas sin convertirse en otra app.
if (tauri.identifier !== 'com.facturarapida.desktop') {
  throw new Error(`Identifier inesperado antes de rebranding: ${tauri.identifier}`);
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

// El puente nativo contiene mensajes visibles del actualizador. Se cambia solo
// el texto de marca; no se toca endpoint, comandos, storage ni identificadores.
try {
  let sync = await readFile(syncPath, 'utf8');
  sync = replaceVisibleBrand(sync);
  await writeFile(syncPath, sync, 'utf8');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

console.log('SOLRAK_BRAND_APPLIED');
