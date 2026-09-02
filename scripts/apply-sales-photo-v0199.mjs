import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-photo-v0199.js');
const targetPath = resolve(dist, 'solrak-sales-photo-v0199.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-photo-v0199.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-sales-photo-v0199.js"></script>';
const sales98Tag = '<script src="solrak-sales-exact-v0198.js"></script>';
const report97Tag = '<script src="solrak-report-detail-v0197.js"></script>';

if (!index.includes('solrak-sales-exact-v0198.js')) {
  throw new Error('dist/index.html: ventas v0.1.99 requiere solrak-sales-exact-v0198.js');
}

if (!index.includes(scriptTag)) {
  if (index.includes(sales98Tag)) index = index.replace(sales98Tag, `${sales98Tag}\n${scriptTag}`);
  else if (index.includes(report97Tag)) index = index.replace(report97Tag, `${report97Tag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.1.99');
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if (!finalIndex.includes(scriptTag)) throw new Error('No quedó integrado solrak-sales-photo-v0199.js');
if ((finalIndex.match(/solrak-sales-photo-v0199\.js/g) || []).length !== 1) throw new Error('Ventas v0.1.99 quedó duplicado');
if (finalIndex.indexOf('solrak-sales-photo-v0199.js') < finalIndex.indexOf('solrak-sales-exact-v0198.js')) throw new Error('Ventas v0.1.99 debe cargar después de v0.1.98');

const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of [
  '0.1.99',
  '--s99-side:228px',
  '--s99-top:58px',
  '--s99-right:220px',
  'height:46px',
  'grid-template-rows:44px minmax(0,1fr)',
  'grid-template-rows:66px minmax(0,1fr)',
  'height:148px',
  'height:204px',
  'height:174px',
  'Aplicar Descuento a la Venta',
  'Eliminar Productos En Venta',
  'Imprimir Ticket En Venta'
]) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.1.99: falta ${marker}`);
}

console.log('APPLY VENTAS v0.1.99 OK: geometría alineada a la fotografía de referencia.');
