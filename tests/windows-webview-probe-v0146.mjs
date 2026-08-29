import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
const rustPath = process.argv[3] || 'desktop/src-tauri/src/main.rs';
const html = fs.readFileSync(htmlPath, 'utf8');
const rust = fs.readFileSync(rustPath, 'utf8');

assert.ok(html.includes('data-fr-webview-debug="1"'), 'Debe conservarse el tracer WebView');
assert.ok(!html.includes('const nativeFetch=window.fetch.bind(window)'), 'Persistió nativeFetch');
assert.ok(!html.includes('window.fetch=async function'), 'Persistió monkey-patch global de fetch');
assert.ok(html.includes('data-fr-parser-probe="before-02"'), 'Falta BEFORE script 02');
assert.ok(html.includes('data-fr-parser-probe="after-02"'), 'Falta AFTER script 02');
assert.ok(!html.includes('data-fr-parser-probe="before-01"'), 'El HEAD probe debe seguir siendo el primer script');

const probeCount = [...html.matchAll(/data-fr-parser-probe=/g)].length;
assert.ok(probeCount >= 18, `Muy pocos parser probes: ${probeCount}`);

assert.ok(rust.includes('start_native_title_probe(app.handle().clone());'), 'Falta arrancar sonda nativa');
assert.ok(rust.includes('NATIVE_TITLE_CHANGE'), 'Falta log nativo de cambios de título');
assert.ok(rust.includes('FR_NATIVE_DOM|'), 'Falta señal DOM independiente');
assert.ok(rust.includes('NATIVE_EVAL_SENT'), 'Falta confirmación de eval nativo');
assert.ok(rust.includes('Manager'), 'Falta Manager para obtener WebViewWindow');

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for (let i=0;i<scripts.length;i++) {
  if (/\bsrc=["']/i.test(scripts[i][1])) continue;
  new vm.Script(scripts[i][2], {filename:`v0146-test-inline-${i+1}.js`});
}

console.log(`WINDOWS WEBVIEW PROBE V0.1.46 OK: fetch intacto nativo, ${probeCount} parser probes, señal Rust independiente.`);
