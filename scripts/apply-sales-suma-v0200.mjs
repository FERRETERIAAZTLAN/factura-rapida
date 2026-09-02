import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-suma-v0200.js');
const targetPath = resolve(dist, 'solrak-sales-suma-v0200.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-suma-v0200.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-sales-suma-v0200.js"></script>';
const sales99Tag = '<script src="solrak-sales-photo-v0199.js"></script>';
const sales98Tag = '<script src="solrak-sales-exact-v0198.js"></script>';

if (!index.includes('solrak-sales-photo-v0199.js')) {
  throw new Error('dist/index.html: ventas v0.2.00 requiere la cadena estable hasta v0.1.99');
}
if (!index.includes(scriptTag)) {
  if (index.includes(sales99Tag)) index = index.replace(sales99Tag, `${sales99Tag}\n${scriptTag}`);
  else if (index.includes(sales98Tag)) index = index.replace(sales98Tag, `${sales98Tag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.2.00');
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if (!finalIndex.includes(scriptTag)) throw new Error('No quedó integrado solrak-sales-suma-v0200.js');
if ((finalIndex.match(/solrak-sales-suma-v0200\.js/g) || []).length !== 1) throw new Error('Ventas v0.2.00 quedó duplicado');
if (finalIndex.indexOf('solrak-sales-suma-v0200.js') < finalIndex.indexOf('solrak-sales-photo-v0199.js')) {
  throw new Error('Ventas v0.2.00 debe cargar después de v0.1.99');
}

const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of [
  '0.2.00',
  'solrakSalesSumaV0200Workspace',
  'moveWithPlaceholder',
  'disableOldVisualLayers',
  '--s200-side:clamp(232px,17.96vw,260px)',
  '--s200-top:clamp(58px,6.82vh,74px)',
  's200SearchCard',
  's200CartCard',
  's200Right',
  'FINALIZAR VENTA',
  'Aplicar Descuento a la Venta',
  'Eliminar Productos En Venta',
  'Imprimir Ticket En Venta'
]) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.2.00: falta ${marker}`);
}

console.log('APPLY VENTAS v0.2.00 OK: pantalla reconstruida estructuralmente con los nodos reales del POS y referencia Suma 1448x1086.');
