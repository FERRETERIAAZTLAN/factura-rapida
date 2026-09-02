import { readFile, writeFile } from 'node:fs/promises';
const path = process.argv[2] || 'solrak-ui-operativa-v0183.js';
let source = await readFile(path, 'utf8');
const oldText = '<img src="${img.src}" alt="${name.replace(/"/g, "&quot;")}">';
const newText = '<img loading="lazy" decoding="async" src="${img.src}" alt="${name.replace(/"/g, "&quot;")}">';
if (!source.includes(newText)) {
  if (!source.includes(oldText)) throw new Error('Miniatura v0.1.83 esperada no encontrada');
  source = source.replace(oldText, newText);
  await writeFile(path, source, 'utf8');
}
console.log('V0183_STARTUP_PATCH_OK');
