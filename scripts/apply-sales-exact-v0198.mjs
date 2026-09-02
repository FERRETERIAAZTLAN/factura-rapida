import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-sales-exact-v0198.js');
const targetPath = resolve(dist, 'solrak-sales-exact-v0198.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-sales-exact-v0198.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-sales-exact-v0198.js"></script>';
const reportTag = '<script src="solrak-report-detail-v0197.js"></script>';
const commonTag = '<script src="solrak-common-product-v0196.js"></script>';
const salesTag = '<script src="solrak-suma-sales-v0195.js"></script>';

if (!index.includes(scriptTag)) {
  if (index.includes(reportTag)) index = index.replace(reportTag, `${reportTag}\n${scriptTag}`);
  else if (index.includes(commonTag)) index = index.replace(commonTag, `${commonTag}\n${scriptTag}`);
  else if (index.includes(salesTag)) index = index.replace(salesTag, `${salesTag}\n${scriptTag}`);
  else if (index.includes('</body>')) index = index.replace('</body>', `${scriptTag}\n</body>`);
  else throw new Error('dist/index.html: no se encontró punto seguro para integrar ventas v0.1.98');
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if (!finalIndex.includes(scriptTag)) throw new Error('No quedó integrado solrak-sales-exact-v0198.js');
if ((finalIndex.match(/solrak-sales-exact-v0198\.js/g) || []).length !== 1) throw new Error('Ventas v0.1.98 quedó duplicado');

const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of ['0.1.98', 'Verificador Precios', 'Nuevo Ticket', 'Producto Común', 'Consultar Ticket', 'Devolución', 'Clientes', 'Productos', 'Usuarios', 'Turnos', 'Caja', 'Configuración', 'Reportes', '--s98-side:184px', '--s98-top:48px', '--s98-right:190px', 'FINALIZAR VENTA']) {
  if (!packagedSource.includes(marker)) throw new Error(`Ventas v0.1.98: falta ${marker}`);
}

console.log('APPLY VENTAS v0.1.98 OK: pantalla principal alineada a referencia Suma.');
