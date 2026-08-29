import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(process.argv[2] || 'desktop/dist/index.html','utf8');
const marker = "data-fr-facturar-real=\"8\"";
assert(html.includes(marker), 'Falta bloque FACTURAR real');
assert(html.includes("if(b.textContent!==text)b.textContent=text"), 'Falta guard idempotente de textContent');
assert(html.includes("if(b.disabled!==disabled)b.disabled=disabled"), 'Falta guard idempotente de disabled');
assert(html.includes("if(b.dataset.frHardwired!=='8')b.dataset.frHardwired='8'"), 'Falta guard idempotente de dataset');
assert(html.includes("const mo=new MutationObserver(()=>normalizeButton());mo.observe(document.body,{childList:true,subtree:true});"), 'MutationObserver esperado cambió');
assert(!html.includes("b.textContent=running?'VERIFICANDO Y FACTURANDO…':'FACTURAR';b.classList.remove('secondary')"), 'Sigue presente normalizeButton no idempotente');

const fnMatch = html.match(/function normalizeButton\(\)\{([\s\S]*?)\}\ndocument\.addEventListener\('click'/);
assert(fnMatch, 'No se aisló normalizeButton');
const body = fnMatch[1];
assert.equal((body.match(/b\.textContent=/g)||[]).length, 1, 'normalizeButton debe tener una sola asignación protegida de textContent');
assert(body.includes("if(b.textContent!==text)b.textContent=text"), 'La asignación de textContent debe estar protegida');
console.log('WINDOWS FACTURAR MUTATION V0.1.48 OK: observer sin bucle autoalimentado por textContent.');
