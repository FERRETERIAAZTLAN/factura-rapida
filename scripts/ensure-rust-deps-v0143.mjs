import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/src-tauri/Cargo.toml';
let cargo = await readFile(path, 'utf8');

if (!/^\[dependencies\]\s*$/m.test(cargo)) throw new Error('Cargo.toml no contiene [dependencies]');

if (!/^serde_json\s*=\s*/m.test(cargo)) {
  cargo = cargo.replace(/^\[dependencies\]\s*$/m, '[dependencies]\nserde_json = "1"');
}

if (!/^serde\s*=\s*/m.test(cargo)) throw new Error('Falta dependencia serde requerida por el binario');
if (!/^serde_json\s*=\s*"1"\s*$/m.test(cargo)) throw new Error('serde_json no quedó fijado correctamente');
if (!/^tauri\s*=\s*/m.test(cargo)) throw new Error('Falta dependencia tauri');
if (!/^tauri-plugin-updater\s*=\s*/m.test(cargo)) throw new Error('Falta tauri-plugin-updater');

await writeFile(path, cargo, 'utf8');
console.log('RUST DEPS V0.1.43 OK: serde_json=1 presente antes de generar Cargo.lock.');
