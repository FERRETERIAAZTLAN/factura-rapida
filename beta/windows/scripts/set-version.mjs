import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const version=(process.argv[2]||"").trim();
if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)){
  throw new Error("Versión inválida. Usa SemVer, por ejemplo 0.2.0");
}

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");

const packagePath=resolve(root,"package.json");
const pkg=JSON.parse(await readFile(packagePath,"utf8"));
pkg.version=version;
await writeFile(packagePath,JSON.stringify(pkg,null,2)+"\n","utf8");

const tauriPath=resolve(root,"src-tauri","tauri.conf.json");
const conf=JSON.parse(await readFile(tauriPath,"utf8"));
conf.version=version;
await writeFile(tauriPath,JSON.stringify(conf,null,2)+"\n","utf8");

const cargoPath=resolve(root,"src-tauri","Cargo.toml");
let cargo=await readFile(cargoPath,"utf8");
cargo=cargo.replace(/(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+(")/,`$1${version}$2`);
await writeFile(cargoPath,cargo,"utf8");

console.log("Versión de escritorio actualizada a",version);
