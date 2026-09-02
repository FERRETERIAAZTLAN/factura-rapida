import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const ticketPath = resolve(dist, 'solrak-sumapro-tickets-v0169.js');

const files = [
  'solrak-peripherals-v0191.js',
  'solrak-sumapro-tickets-v0169.js',
];
for (const file of files) {
  await copyFile(resolve(repo, file), resolve(dist, file));
}

// En Windows, el mismo flujo histórico de imprimir/autoimprimir debe usar la
// impresora térmica seleccionada en SOLRAK cuando ya existe configuración nativa.
let ticketSource = await readFile(ticketPath, 'utf8');
const printNeedle = `  function printReceipt(receipt, options = {}) {\n    const currentSettings = loadSettings();\n    if (!receipt) return false;\n    if (!options.force && !currentSettings.printerEnabled) return false;\n    const html = printDocument(receipt, currentSettings);`;
const printPatch = `  function printReceipt(receipt, options = {}) {\n    const currentSettings = loadSettings();\n    if (!receipt) return false;\n    if (!options.force && !currentSettings.printerEnabled) return false;\n    const nativePrinter = window.SOLRAKWindowsNativeV0194;\n    let nativePrinterName = \"\";\n    try { nativePrinterName = localStorage.getItem(\`solrak.windows.v0194.printer:\${businessIdentity()}\`) || \"\"; } catch {}\n    if (nativePrinter?.isNative?.() && nativePrinterName) {\n      Promise.resolve(nativePrinter.printReceipt(receipt, currentSettings)).catch((error) => {\n        if (typeof window.notice === \"function\") window.notice(error?.message || \"No se pudo imprimir el ticket.\", true);\n        else console.error(\"SOLRAK impresión Windows\", error);\n      });\n      return true;\n    }\n    const html = printDocument(receipt, currentSettings);`;
if (!ticketSource.includes('SOLRAKWindowsNativeV0194')) {
  if (!ticketSource.includes(printNeedle)) throw new Error('Tickets v0.1.69: no se encontró printReceipt para integrar autoimpresión nativa');
  ticketSource = ticketSource.replace(printNeedle, printPatch);
  await writeFile(ticketPath, ticketSource, 'utf8');
}

let html = await readFile(indexPath, 'utf8');
const nativeTag = '<script src="solrak-windows-native-v0194.js"></script>';
const peripheralTag = '<script src="solrak-peripherals-v0191.js"></script>';
const ticketTag = '<script src="solrak-sumapro-tickets-v0169.js"></script>';

for (const tag of [ticketTag, nativeTag, peripheralTag]) {
  if (!html.includes(tag)) html = html.replace('</body>', `${tag}\n</body>`);
}

// El adaptador nativo debe cargar antes de la abstracción de periféricos.
html = html.replace(nativeTag, '').replace(peripheralTag, '');
html = html.replace('</body>', `${nativeTag}\n${peripheralTag}\n</body>`);
await writeFile(indexPath, html, 'utf8');

const nativePos = html.indexOf(nativeTag);
const peripheralPos = html.indexOf(peripheralTag);
if (nativePos < 0 || peripheralPos < 0 || nativePos >= peripheralPos) {
  throw new Error('Orden de carga inválido: el puente Windows debe preceder a peripherals v0.1.91');
}
for (const file of files) {
  const source = await readFile(resolve(dist, file), 'utf8');
  if (!source.trim()) throw new Error(`Archivo vacío en paquete Windows: ${file}`);
}
const patchedTickets = await readFile(ticketPath, 'utf8');
if (!patchedTickets.includes('nativePrinter.printReceipt(receipt, currentSettings)')) {
  throw new Error('El paquete Windows no redirige imprimir/autoimprimir a la impresora nativa');
}
console.log('SOLRAK v0.1.94 web periféricos + autoimpresión nativa empaquetados');
