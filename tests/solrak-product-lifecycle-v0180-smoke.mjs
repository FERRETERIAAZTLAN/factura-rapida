import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const source=fs.readFileSync('solrak-product-lifecycle-v0180.js','utf8');
const sql=fs.readFileSync('supabase/migrations/202609020004_product_retirement_guard.sql','utf8');
const api=fs.readFileSync('supabase/functions/product-lifecycle-api/index.ts','utf8');

assert.match(source,/0\.1\.80/);
assert.match(source,/retireProduct/);
assert.match(source,/Producto desactivado/);
assert.match(sql,/solrak_retire_product/);
assert.match(sql,/product\.deactivate/);
assert.match(sql,/product\.delete_unused/);
assert.match(sql,/trg_solrak_guard_product_delete/);
assert.match(sql,/sale_items/);
assert.match(sql,/inventory_movements/);
assert.match(api,/action==="retireProduct"/);
assert.match(api,/softDeleteHistory:true/);
for(const text of [source,sql,api]) assert.ok(!/cfdi-api|finkok|recargas/i.test(text));

const dom=new JSDOM(`<!doctype html><html><body>
<table><tbody id="inventoryBody"><tr><td class="productname"><strong>Producto historial</strong></td><td><button data-editp="p1">Editar</button></td></tr></tbody></table>
<dialog id="productDialog"></dialog><button id="deleteProduct">Eliminar</button>
</body></html>`,{runScripts:'outside-only',url:'https://solrak.local/'});
const {window}=dom;
window.ANON_KEY='anon';
window.session={token:'token',user:{role:'admin'}};
window.products=[{id:'p1',name:'Producto historial',active:false}];
window.editingProductId='p1';
window.loadAll=async()=>{};
window.confirm=()=>true;
window.notice=()=>{};
window.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);
  assert.equal(body.action,'retireProduct');
  assert.equal(body.productId,'p1');
  return {ok:true,json:async()=>({ok:true,mode:'deactivated',product_id:'p1'})};
};
window.eval(source);
await new Promise((resolve)=>setTimeout(resolve,30));
assert.equal(window.document.getElementById('deleteProduct').textContent,'Dar de baja');
assert.equal(window.document.querySelector('#inventoryBody tr').dataset.solrakProductActive,'0');
assert.ok(window.document.querySelector('.solrakInactiveBadge'));
await window.SOLRAKProductLifecycleV0180.retireProduct();

console.log('SOLRAK v0.1.80 product lifecycle smoke: OK');
