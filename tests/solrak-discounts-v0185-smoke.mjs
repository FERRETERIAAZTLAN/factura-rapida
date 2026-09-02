import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const source=fs.readFileSync('solrak-discounts-v0185.js','utf8');
const sql=fs.readFileSync('supabase/migrations/202609020007_manual_sale_discounts.sql','utf8');
assert.match(source,/0\.1\.85/);
assert.match(source,/manual_discount_amount/);
assert.match(source,/openSaleDiscount/);
assert.match(source,/applyLineDiscount/);
assert.match(sql,/allow_discounts/);
assert.match(sql,/manual_discount_amount/);
assert.match(sql,/manual_discount_total/);
assert.match(sql,/Este usuario no tiene permiso para aplicar descuentos/);
for(const text of [source,sql]) assert.ok(!/cfdi-api|finkok|recargas/i.test(text));

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="posCart"><div class="frPosLine" data-pos-line="p1"><div class="frPosProduct"><strong>Producto A</strong></div></div><div class="frPosLine" data-pos-line="p2"><div class="frPosProduct"><strong>Producto B</strong></div></div></div>
<button id="solrakGlobalDiscount"></button><button id="solrakLineDiscount"></button>
</body></html>`,{runScripts:'outside-only',url:'https://solrak.local/'});
const {window}=dom;
window.session={user:{role:'admin'}};
window.notice=()=>{};
window.money=(v)=>`$${Number(v).toFixed(2)}`;
let rerenders=0;
const lines=[
  {id:'p1',name:'Producto A',qty:1,price:100,stock:10,iva:16,price_includes_tax:true},
  {id:'p2',name:'Producto B',qty:2,price:50,stock:10,iva:16,price_includes_tax:true},
];
window.FacturaRapidaPOS={cart:lines,rerender(){rerenders++}};
let captured=null;
window.fetch=async(_url,init)=>{captured=JSON.parse(init.body);return {ok:true,json:async()=>({ok:true})}};
window.eval(source);
await new Promise(r=>setTimeout(r,60));
assert.ok(window.SOLRAKDiscounts);
assert.equal(window.SOLRAKDiscounts.canDiscount(),true);
assert.equal(window.SOLRAKDiscounts.applyLineDiscount({lineId:'p1',type:'percent',value:10}),true);
assert.equal(lines[0].price,90);
assert.equal(window.SOLRAKDiscounts.manualDiscountAmount(lines[0]),10);
await new Promise(r=>setTimeout(r,10));
assert.ok(window.document.querySelector('[data-pos-line="p1"] .solrakManualDiscountBadge'));

await window.fetch('https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/pos-api',{method:'POST',body:JSON.stringify({action:'completeSale',items:[{product_id:'p1',qty:1},{product_id:'p2',qty:2}],payments:[{method:'cash',amount:190}]})});
assert.equal(captured.items[0].manual_discount_amount,10);
assert.equal(captured.items[1].manual_discount_amount,0);

window.SOLRAKDiscounts.clearAllDiscounts();
assert.equal(lines[0].price,100);
assert.equal(window.SOLRAKDiscounts.manualDiscountAmount(lines[0]),0);

window.session.user.role='seller';
window.SOLRAKPermissionsV0179={can:()=>false};
assert.equal(window.SOLRAKDiscounts.applyLineDiscount({lineId:'p1',type:'fixed',value:5}),false);
assert.equal(lines[0].price,100);

window.session.user.role='admin';
window.SOLRAKDiscounts.applyLineDiscount({lineId:'p2',type:'fixed',value:15});
assert.equal(window.SOLRAKDiscounts.manualDiscountAmount(lines[1]),15);
assert.equal(lines[1].price,42.5);

console.log('SOLRAK v0.1.85 descuentos reales smoke: OK');
window.close();
