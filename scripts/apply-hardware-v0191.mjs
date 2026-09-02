import fs from "node:fs";
import path from "node:path";

const desktop = path.resolve(process.argv[2] || "desktop");
const root = process.cwd();
const srcTauri = path.join(desktop, "src-tauri");
const dist = path.join(desktop, "dist");
const required = [
  path.join(srcTauri, "src", "main.rs"),
  path.join(srcTauri, "Cargo.toml"),
  path.join(dist, "index.html"),
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Falta archivo del paquete Windows: ${file}`);

fs.copyFileSync(path.join(root, "desktop-native-v0191", "main.rs"), path.join(srcTauri, "src", "main.rs"));
fs.copyFileSync(path.join(root, "desktop-native-v0191", "Cargo.toml"), path.join(srcTauri, "Cargo.toml"));
fs.copyFileSync(path.join(root, "solrak-hardware-v0191.js"), path.join(dist, "solrak-hardware-v0191.js"));

const indexPath = path.join(dist, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const tag = '<script src="solrak-hardware-v0191.js"></script>';
if (!html.includes(tag)) {
  if (!html.includes("</body>")) throw new Error("El index del paquete Windows no contiene </body>");
  html = html.replace("</body>", `${tag}\n</body>`);
  fs.writeFileSync(indexPath, html, "utf8");
}

console.log("SOLRAK_HARDWARE_V0191_APPLIED native=tauri serial=real printer=windows-driver");
