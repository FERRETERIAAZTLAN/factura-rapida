import { readFile, writeFile } from 'node:fs/promises';

const input = process.argv[2] || 'desktop-native-v0194/hardware.rs.inc';
const output = process.argv[3] || 'winspool-v0194.cs';
const source = await readFile(input, 'utf8');
const match = source.match(/\$code=@'\r?\n([\s\S]*?)\r?\n'@/);
if (!match) throw new Error('No se encontró el helper C# Winspool dentro del puente Rust');
await writeFile(output, match[1], 'utf8');
console.log(`Winspool C# extraído: ${output}`);
