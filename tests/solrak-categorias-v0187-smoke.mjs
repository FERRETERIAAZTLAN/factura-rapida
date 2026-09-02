import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const migration=fs.readFileSync('supabase/migrations/202609020007_categories_integrity_guards.sql','utf8');
const api=fs.readFileSync('supabase/functions/catalog-integrity-api/index.ts','utf8');
const ui=fs.readFileSync('solrak-categorias-v0187.js','utf8');

assert.match(migration,/id integer not null/);
assert.match(migration,/Producto Común/);
assert.match(migration,/primary key \(business_id,id\)/);
assert.match(migration,/products_business_category_fk/);
assert.match(migration,/solrak_guard_client_delete/);
assert.match(migration,/solrak_guard_user_delete/);
assert.match(migration,/Las categorías no se eliminan físicamente/);
assert.match(migration,/No puedes desactivar una categoría que todavía tiene productos activos/);
assert.match(migration,/grant execute on function public\.solrak_create_category/);
assert.match(api,/numericCategories:true/);
assert.match(api,/reservedCommonCategory:true/);
assert.match(api,/softDeleteGuards:true/);
assert.doesNotMatch(api,/cfdi-api|finkok/i);
assert.match(ui,/const VERSION="0\.1\.87"/);
assert.match(ui,/ID siguiente/);
assert.match(ui,/RESERVADA/);
assert.doesNotMatch(ui,/Eliminar categoría/i);

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<section id="tab-inventario"><article class="card"></article></section>
<form id="productForm"><label>Categoría<input id="pCategory" class="field" value="TRUPER"></label></form>
</body></html>`,{runScripts:'outside-only',url:'https://solrak.test'});
const {window}=dom;
window.session={token:'test',user:{role:'admin'}};
window.ANON_KEY='anon';
window.products=[{id:'p1',category_id:3,category:'TRUPER',active:true}];
window.fetch=async()=>({ok:true,json:async()=>({ok:true,categories:[
  {id:1,name:'Producto Común',active:true},
  {id:2,name:'Producto en General',active:true},
  {id:3,name:'TRUPER',active:true}
]})});
window.eval(ui);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,80));
assert.equal(window.SOLRAKCategoriesV0187.version,'0.1.87');
assert.equal(window.document.querySelector('#pCategory')?.tagName,'SELECT');
assert.equal(window.document.querySelector('#pCategory')?.value,'TRUPER');
assert.ok(window.document.querySelector('#solrakCategoryManager'));
assert.match(window.document.querySelector('#solrakCategoryManager').textContent,/Producto Común/);
assert.equal(window.document.querySelector('[data-solrak-category-active="1"]')?.disabled,true);

console.log('SOLRAK v0.1.87 categorías e integridad smoke: OK');