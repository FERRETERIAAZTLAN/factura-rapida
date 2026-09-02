import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const desktop = resolve(process.argv[2] || 'desktop');
const dist = resolve(desktop, 'dist');
const indexPath = resolve(dist, 'index.html');
const sourcePath = resolve(root, 'solrak-common-product-v0196.js');
const targetPath = resolve(dist, 'solrak-common-product-v0196.js');

const source = await readFile(sourcePath, 'utf8');
new vm.Script(source, { filename: 'solrak-common-product-v0196.js' });
await copyFile(sourcePath, targetPath);

let index = await readFile(indexPath, 'utf8');
const scriptTag = '<script src="solrak-common-product-v0196.js"></script>';
const salesTag = '<script src="solrak-suma-sales-v0195.js"></script>';

if (!index.includes(scriptTag)) {
  if (index.includes(salesTag)) {
    index = index.replace(salesTag, `${salesTag}\n${scriptTag}`);
  } else if (index.includes('</body>')) {
    index = index.replace('</body>', `${scriptTag}\n</body>`);
  } else {
    throw new Error('dist/index.html: no se encontró punto seguro para integrar Producto Común v0.1.96');
  }
  await writeFile(indexPath, index, 'utf8');
}

const finalIndex = await readFile(indexPath, 'utf8');
if (!finalIndex.includes(scriptTag)) throw new Error('No quedó integrado solrak-common-product-v0196.js');
const packagedSource = await readFile(targetPath, 'utf8');
for (const marker of ['0.1.96', 'fielCommonDialog', 'fielCommonName', 'height:auto!important', 'GUARDAR', 'CERRAR']) {
  if (!packagedSource.includes(marker)) throw new Error(`Producto Común v0.1.96: falta ${marker}`);
}

console.log('APPLY PRODUCTO COMUN v0.1.96 OK: modal compacto con nombre integrado.');
