import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const htmlPath = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(htmlPath, 'utf8');

const oldFn = "function normalizeButton(){const b=document.getElementById('stampBtn');if(!b)return;b.disabled=running;b.textContent=running?'VERIFICANDO Y FACTURANDO…':'FACTURAR';b.classList.remove('secondary');b.classList.add('primary');b.dataset.frHardwired='8'}";
const newFn = "function normalizeButton(){const b=document.getElementById('stampBtn');if(!b)return;const disabled=!!running;if(b.disabled!==disabled)b.disabled=disabled;const text=running?'VERIFICANDO Y FACTURANDO…':'FACTURAR';if(b.textContent!==text)b.textContent=text;if(b.classList.contains('secondary'))b.classList.remove('secondary');if(!b.classList.contains('primary'))b.classList.add('primary');if(b.dataset.frHardwired!=='8')b.dataset.frHardwired='8'}";

const count = html.split(oldFn).length - 1;
if (count !== 1) throw new Error(`normalizeButton esperado exactamente una vez; encontrados ${count}`);
html = html.replace(oldFn, newFn);

if (!html.includes("const mo=new MutationObserver(()=>normalizeButton());mo.observe(document.body,{childList:true,subtree:true});")) {
  throw new Error('No se encontró el MutationObserver de FACTURAR esperado');
}
if (!html.includes("if(b.textContent!==text)b.textContent=text")) throw new Error('No quedó el guard idempotente de textContent');

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
for (const [i,m] of [...html.matchAll(scriptRe)].entries()) {
  if (/\bsrc=["']/i.test(m[1])) continue;
  new vm.Script(m[2], { filename: `v0148-inline-${i+1}.js` });
}

await writeFile(htmlPath, html, 'utf8');
console.log('FACTURAR MUTATION V0.1.48 OK: normalizeButton idempotente; MutationObserver ya no puede autoalimentarse por textContent.');
