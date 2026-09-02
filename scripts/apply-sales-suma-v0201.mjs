import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-suma-v0201.js');
const targetPath = resolve(dist, 'solrak-sales-suma-v0201.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-suma-v0201.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-sales-suma-v0201.js"></script>';
const v0200Tag = '<script src="solrak-sales-reference-v0200.js"></script>';
if (!index.includes('solrak-sales-reference-v0200.js')) {
  throw new Error('dist/index.html: ventas v0.2.01 requiere la cadena estable hasta v0.2.00');
}
if (!index.includes(scriptTag)) {
  if (index.includes(v0200Tag)) index = index.replace(v0200Tag, `${v0200Tag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.2.01');
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if ((finalIndex.match(/solrak-sales-suma-v0201\.js/g) || []).length !== 1) throw new Error('Ventas v0.2.01 quedó duplicado');
if (finalIndex.indexOf('solrak-sales-suma-v0201.js') < finalIndex.indexOf('solrak-sales-reference-v0200.js')) {
  throw new Error('Ventas v0.2.01 debe cargar después de v0.2.00');
}

const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of [
  '0.2.01',
  'solrakSalesSumaV0201Workspace',
  'solrakSalesReferenceV0200Style',
  'moveWithPlaceholder',
  'disableOldVisualLayers',
  's201SearchCard',
  's201CartCard',
  's201Right',
  'FINALIZAR VENTA',
  'Aplicar Descuento a la Venta',
  'Eliminar Productos En Venta',
  'Imprimir Ticket En Venta'
]) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.2.01: falta ${marker}`);
}
console.log('APPLY VENTAS v0.2.01 OK: estructura Suma aplicada sobre los controles reales del POS.');
