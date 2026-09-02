import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", "tests", ".github", "desktop-native-v0191"]);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    if (entry.name === "index.html" || entry.name.endsWith(".js")) files.push(path.join(dir, entry.name));
  }
}
walk(root);

const findings = [];
const nativeDialog = /\b(?:window\.)?(alert|confirm|prompt)\s*\(/g;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    nativeDialog.lastIndex = 0;
    let match;
    while ((match = nativeDialog.exec(lines[i]))) {
      findings.push(`${rel}:${i + 1}: diálogo nativo ${match[1]}()`);
    }
  }
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const marker of [
  ["posOpenCash", "control legado de apertura manual de caja"],
  ["posCloseCash", "control legado de cierre manual de caja"],
]) {
  if (index.includes(marker[0])) findings.push(`index.html: control visible detectado: ${marker[1]} (${marker[0]})`);
}

const pos = fs.readFileSync(path.join(root, "pos-module.js"), "utf8");
if (!pos.includes("const MAX_TICKETS = 8;")) findings.push("pos-module.js: MAX_TICKETS no está fijado en 8");

console.log(`SOLRAK UX audit v0.1.92 scanned ${files.length} production files`);
if (findings.length) {
  console.error("SOLRAK_UX_AUDIT_FINDINGS_BEGIN");
  for (const finding of findings) console.error(finding);
  console.error("SOLRAK_UX_AUDIT_FINDINGS_END");
  process.exit(1);
}
console.log("SOLRAK_UX_AUDIT_V0192_OK nativeDialogs=0 manualShiftControls=0 maxTickets=8");
