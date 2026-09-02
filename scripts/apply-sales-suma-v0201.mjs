import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-suma-v0201.js');
const tuneSourcePath = resolve(root, 'solrak-sales-suma-v0201-tune.js');
const startupFixSourcePath = resolve(root, 'solrak-sales-suma-v0201-startup-fix.js');
const loaderSourcePath = resolve(root, 'solrak-sales-suma-v0201-loader.js');
const targetPath = resolve(dist, 'solrak-sales-suma-v0201.js');
const tuneTargetPath = resolve(dist, 'solrak-sales-suma-v0201-tune.js');
const startupFixTargetPath = resolve(dist, 'solrak-sales-suma-v0201-startup-fix.js');
const loaderTargetPath = resolve(dist, 'solrak-sales-suma-v0201-loader.js');

const source = await readFile(sourcePath, 'utf8');
const tuneSource = await readFile(tuneSourcePath, 'utf8');
const startupFixSource = await readFile(startupFixSourcePath, 'utf8');
const loaderSource = await readFile(loaderSourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-suma-v0201.js' });
new vm.Script(tuneSource, { filename: 'solrak-sales-suma-v0201-tune.js' });
new vm.Script(startupFixSource, { filename: 'solrak-sales-suma-v0201-startup-fix.js' });
new vm.Script(loaderSource, { filename: 'solrak-sales-suma-v0201-loader.js' });
await copyFile(sourcePath, targetPath);
await copyFile(tuneSourcePath, tuneTargetPath);
await copyFile(startupFixSourcePath, startupFixTargetPath);
await copyFile(loaderSourcePath, loaderTargetPath);

let index = await readFile(indexPath, 'utf8');
const directTags = [
  '<script src="solrak-sales-suma-v0201.js"></script>',
  '<script src="solrak-sales-suma-v0201-tune.js"></script>',
  '<script src="solrak-sales-suma-v0201-startup-fix.js"></script>',
  '<script src="solrak-sales-suma-v0201-loader.js"></script>'
];
for (const tag of directTags) index = index.replaceAll(tag, '');
index = index.replace(/<script[^>]+(?:src|data-solrak-deferred-src)=["']solrak-sales-suma-v0201(?:-tune|-startup-fix)?\.js["'][^>]*><\/script>\s*/gi, '');
index = index.replace(/<script[^>]+src=["']solrak-sales-suma-v0201-loader\.js["'][^>]*><\/script>\s*/gi, '');

const v0200Tag = '<script src="solrak-sales-reference-v0200.js"></script>';
if (!index.includes('solrak-sales-reference-v0200.js')) {
  throw new Error('dist/index.html: ventas v0.2.01 requiere la cadena estable hasta v0.2.00');
}
const deferredMain = '<script type="application/solrak-deferred" data-solrak-deferred-src="solrak-sales-suma-v0201.js"></script>';
const deferredTune = '<script type="application/solrak-deferred" data-solrak-deferred-src="solrak-sales-suma-v0201-tune.js"></script>';
const deferredStartupFix = '<script type="application/solrak-deferred" data-solrak-deferred-src="solrak-sales-suma-v0201-startup-fix.js"></script>';
const loaderTag = '<script src="solrak-sales-suma-v0201-loader.js"></script>';
const gatedBlock = `${deferredMain}\n${deferredTune}\n${deferredStartupFix}\n${loaderTag}`;
if (index.includes(v0200Tag)) index = index.replace(v0200Tag, `${v0200Tag}\n${gatedBlock}`);
else if (index.includes('</body>')) index = index.replace('</body>', `${gatedBlock}\n</body>`);
else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.2.01');
await writeFile(indexPath, index, 'utf8');

const finalIndex = await readFile(indexPath, 'utf8');
for (const name of ['solrak-sales-suma-v0201.js','solrak-sales-suma-v0201-tune.js','solrak-sales-suma-v0201-startup-fix.js']) {
  const count = (finalIndex.match(new RegExp(name.replaceAll('.', '\\.'), 'g')) || []).length;
  if (count !== 1) throw new Error(`${name} debe aparecer una sola vez como descriptor diferido; quedó ${count}`);
  if (finalIndex.includes(`<script src="${name}"></script>`)) throw new Error(`${name} quedó ejecutándose antes de window.load`);
}
if ((finalIndex.match(/solrak-sales-suma-v0201-loader\.js/g) || []).length !== 1) throw new Error('Loader v0.2.01 duplicado o ausente');
if (!(finalIndex.indexOf('solrak-sales-reference-v0200.js') < finalIndex.indexOf('data-solrak-deferred-src="solrak-sales-suma-v0201.js"') && finalIndex.indexOf('solrak-sales-suma-v0201-startup-fix.js') < finalIndex.indexOf('solrak-sales-suma-v0201-loader.js'))) {
  throw new Error('Orden de carga diferida v0.2.00 -> descriptores v0.2.01 -> loader incorrecto');
}

const packagedSource = await readFile(targetPath, 'utf8');
const packagedTune = await readFile(tuneTargetPath, 'utf8');
const packagedStartupFix = await readFile(startupFixTargetPath, 'utf8');
const packagedLoader = await readFile(loaderTargetPath, 'utf8');
for (const marker of ['0.2.01','solrakSalesSumaV0201Workspace','solrakSalesReferenceV0200Style','moveWithPlaceholder','disableOldVisualLayers','s201SearchCard','s201CartCard','s201Right','FINALIZAR VENTA']) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.2.01: falta ${marker}`);
}
for (const marker of ['bottom:170px','height:156px','bottom:140px','height:165px','solrakV0195LegacyMenu','mask:url']) {
  if (!packagedTune.includes(marker)) throw new Error(`Tune v0.2.01: falta ${marker}`);
}
for (const marker of ['0.2.1-startup-safe','base.destroy?.()','salesSurfaceReady','MutationObserver','safeMount']) {
  if (!packagedStartupFix.includes(marker)) throw new Error(`Startup fix v0.2.1: falta ${marker}`);
}
for (const marker of ['0.2.1-load-gate','window.addEventListener("load"','setTimeout','loadSales','solrak-sales-suma-v0201-startup-fix.js']) {
  if (!packagedLoader.includes(marker)) throw new Error(`Load gate v0.2.1: falta ${marker}`);
}
console.log('APPLY VENTAS v0.2.01 OK: estructura + calibración empaquetadas y diferidas hasta después de window.load.');
