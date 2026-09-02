import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-report-detail-v0197.js');
const targetPath = resolve(dist, 'solrak-report-detail-v0197.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-report-detail-v0197.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-report-detail-v0197.js"></script>';
const commonTag = '<script src="solrak-common-product-v0196.js"></script>';
const salesTag = '<script src="solrak-suma-sales-v0195.js"></script>';
const reportsTag = '<script src="solrak-reports-v0172.js"></script>';

if (!index.includes(scriptTag)) {
  if (index.includes(commonTag)) index = index.replace(commonTag, `${commonTag}\n${scriptTag}`);
  else if (index.includes(salesTag)) index = index.replace(salesTag, `${salesTag}\n${scriptTag}`);
  else if (index.includes(reportsTag)) index = index.replace(reportsTag, `${reportsTag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar reporte v0.1.97');
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if (!finalIndex.includes(scriptTag)) throw new Error('No quedó integrado solrak-report-detail-v0197.js');
const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of ['0.1.97', 'Detalle de Ventas', 'Reporte de Ventas', 'HOY', 'ESTE MES', 'ESTE AÑO', 'Total Ventas Netas', 'Total Ganancias', 'Nombre del Producto', 'Pr. Costo', 'Pr. Mayr.', 'Pr. Pub.']) {
  if (!packagedSource.includes(marker)) throw new Error(`Reporte v0.1.97: falta ${marker}`);
}

console.log('APPLY REPORTE VENTAS v0.1.97 OK: Detalle de Ventas estilo Suma integrado.');
