import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(process.argv[2] || 'desktop/dist/index.html','utf8');
const rust = fs.readFileSync(process.argv[3] || 'desktop/src-tauri/src/main.rs','utf8');

assert.doesNotMatch(html,/data-fr-webview-debug=["']1["']/i,'Persistió data-fr-webview-debug');
assert.ok(!html.includes('window.fetch=async function'),'Persistió override fetch');
assert.ok(!html.includes('const nativeFetch=window.fetch.bind(window)'),'Persistió nativeFetch');
assert.ok(html.includes('id="frFix1HeadProbe"'),'Debe conservarse head probe en v0.1.47');
assert.ok(html.includes('data-fr-parser-probe="before-02"'),'Falta probe before-02');
assert.ok(html.includes('data-fr-parser-probe="after-02"'),'Falta probe after-02');
assert.ok(html.includes("document.title='FR47|B|02'"),'Falta señal título before-02');
assert.ok(rust.includes('start_native_v0147_probe(app.handle().clone());'),'Falta iniciar sonda nativa v0.1.47');
assert.ok(rust.includes('FR47DOM|'),'Falta señal DOM independiente');

const first = html.match(/<script\b([^>]*)>/i);
assert.ok(first && /id=["']frFix1HeadProbe["']/i.test(first[1]),'Head probe no es primer script');
const probeCount=[...html.matchAll(/data-fr-parser-probe=/g)].length;
assert.ok(probeCount>=18,`Muy pocos parser probes: ${probeCount}`);

for (const [i,m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries()) {
  if (/\bsrc=["']/i.test(m[1])) continue;
  new vm.Script(m[2],{filename:`v0147-test-${i+1}.js`});
}
console.log(`WINDOWS REMOVE DEBUG V0.1.47 OK: debug completo fuera del arranque; ${probeCount} probes independientes.`);
