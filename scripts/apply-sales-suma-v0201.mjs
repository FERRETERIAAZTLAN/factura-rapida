import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-suma-v0201.js');
const tuneSourcePath = resolve(root, 'solrak-sales-suma-v0201-tune.js');
const targetPath = resolve(dist, 'solrak-sales-suma-v0201.js');
const tuneTargetPath = resolve(dist, 'solrak-sales-suma-v0201-tune.js');

const source = await readFile(sourcePath, 'utf8');
const tuneSource = await readFile(tuneSourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-suma-v0201.js' });
new vm.Script(tuneSource, { filename: 'solrak-sales-suma-v0201-tune.js' });
await copyFile(sourcePath, targetPath);
await copyFile(tuneSourcePath, tuneTargetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-sales-suma-v0201.js"></script>';
const tuneTag = '<script src="solrak-sales-suma-v0201-tune.js"></script>';
const v0200Tag = '<script src="solrak-sales-reference-v0200.js"></script>';
if (!index.includes('solrak-sales-reference-v0200.js')) {
  throw new Error('dist/index.html: ventas v0.2.01 requiere la cadena estable hasta v0.2.00');
}
if (!index.includes(scriptTag)) {
  if (index.includes(v0200Tag)) index = index.replace(v0200Tag, `${v0200Tag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.2.01');
}
if (!index.includes(tuneTag)) {
  index = index.replace(scriptTag, `${scriptTag}\n${tuneTag}`);
}
await writeFile(indexPath, index, 'utf8');

const finalIndex = await readFile(indexPath, 'utf8');
for (const name of ['solrak-sales-suma-v0201.js','solrak-sales-suma-v0201-tune.js']) {
  if ((finalIndex.match(new RegExp(name.replaceAll('.', '\\.'), 'g')) || []).length !== 1) throw new Error(`${name} quedó duplicado o ausente`);
}
if (!(finalIndex.indexOf('solrak-sales-reference-v0200.js') < finalIndex.indexOf('solrak-sales-suma-v0201.js') && finalIndex.indexOf('solrak-sales-suma-v0201.js') < finalIndex.indexOf('solrak-sales-suma-v0201-tune.js'))) {
  throw new Error('Orden de carga v0.2.00 -> v0.2.01 -> tune incorrecto');
}

const packagedSource = await readFile(targetPath, 'utf8');
const packagedTune = await readFile(tuneTargetPath, 'utf8');
for (const marker of ['0.2.01','solrakSalesSumaV0201Workspace','solrakSalesReferenceV0200Style','moveWithPlaceholder','disableOldVisualLayers','s201SearchCard','s201CartCard','s201Right','FINALIZAR VENTA']) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.2.01: falta ${marker}`);
}
for (const marker of ['bottom:170px','height:156px','bottom:140px','height:165px','solrakV0195LegacyMenu','mask:url']) {
  if (!packagedTune.includes(marker)) throw new Error(`Tune v0.2.01: falta ${marker}`);
}
console.log('APPLY VENTAS v0.2.01 OK: estructura real + calibración visual Suma empaquetadas.');
