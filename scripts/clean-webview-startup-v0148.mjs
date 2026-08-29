import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(htmlPath, 'utf8');

const fetchOverride = /const nativeFetch=window\.fetch\.bind\(window\);window\.fetch=async function\(input,init\)\{[\s\S]*?\};let hb=0;/;
if (!fetchOverride.test(html)) throw new Error('No se encontró override global de fetch esperado');
html = html.replace(fetchOverride, 'let hb=0;');

const headProbeRe = /<script id="frFix1HeadProbe">[\s\S]*?<\/script>\s*/i;
if (!headProbeRe.test(html)) throw new Error('No se encontró frFix1HeadProbe');
html = html.replace(headProbeRe, '');

if (html.includes('const nativeFetch=window.fetch.bind(window)') || html.includes('window.fetch=async function')) throw new Error('Persistió override global de fetch');
if (html.includes('HEAD_SCRIPT_STARTED') || html.includes('id="frFix1HeadProbe"')) throw new Error('Persistió head probe parser-time');

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
for (const [i,m] of [...html.matchAll(scriptRe)].entries()) {
  if (/\bsrc=["']/i.test(m[1])) continue;
  new vm.Script(m[2], { filename: `v0148-clean-inline-${i+1}.js` });
}

await writeFile(htmlPath, html, 'utf8');
console.log('WEBVIEW STARTUP CLEAN V0.1.48 OK: fetch nativo; sin invoke HEAD parser-time; scripts válidos.');
