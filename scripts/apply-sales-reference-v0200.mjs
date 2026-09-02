import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-reference-v0200.js');
const targetPath = resolve(dist, 'solrak-sales-reference-v0200.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-reference-v0200.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-sales-reference-v0200.js"></script>';
const sales99Tag = '<script src="solrak-sales-photo-v0199.js"></script>';

if (!index.includes('solrak-sales-photo-v0199.js')) {
  throw new Error('dist/index.html: ventas v0.2.00 requiere solrak-sales-photo-v0199.js');
}

if (!index.includes(scriptTag)) {
  if (index.includes(sales99Tag)) index = index.replace(sales99Tag, `${sales99Tag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.2.00');
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if (!finalIndex.includes(scriptTag)) throw new Error('No quedó integrado solrak-sales-reference-v0200.js');
if ((finalIndex.match(/solrak-sales-reference-v0200\.js/g) || []).length !== 1) throw new Error('Ventas v0.2.00 quedó duplicado');
if (finalIndex.indexOf('solrak-sales-reference-v0200.js') < finalIndex.indexOf('solrak-sales-photo-v0199.js')) throw new Error('Ventas v0.2.00 debe cargar después de v0.1.99');

const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of [
  '0.2.00',
  '--s200-side:245px',
  '--s200-top:52px',
  '--s200-right:250px',
  'height:49px',
  'margin:0 5px 17px',
  'grid-template-rows:50px minmax(0,1fr)',
  'grid-template-rows:67px minmax(0,1fr)',
  'border:1.5px solid #ff6b22',
  'grid-template-columns:minmax(250px,489px) 104px',
  'bottom:99px',
  'height:122px',
  'width:192px',
  'height:185px',
  'bottom:106px',
  'height:112px',
  'bottom:28px',
  'Aplicar Descuento a la Venta',
  'Eliminar Productos En Venta',
  'Imprimir Ticket En Venta'
]) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.2.00: falta ${marker}`);
}

console.log('APPLY VENTAS v0.2.00 OK: layout calibrado contra la referencia visual original.');
