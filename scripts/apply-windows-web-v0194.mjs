import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');

const files = [
  'solrak-peripherals-v0191.js',
  'solrak-sumapro-tickets-v0169.js',
];
for (const file of files) {
  await copyFile(resolve(repo, file), resolve(dist, file));
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
console.log('SOLRAK v0.1.94 web periféricos empaquetados');
