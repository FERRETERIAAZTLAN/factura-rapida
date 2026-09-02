import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const migration=fs.readFileSync('supabase/migrations/202609020008_inventory_tracking_mode.sql','utf8');
const api=fs.readFileSync('supabase/functions/inventory-mode-api/index.ts','utf8');
const ui=fs.readFileSync('solrak-inventory-mode-v0188.js','utf8');

assert.match(migration,/inventory_tracking_enabled boolean not null default true/);
assert.match(migration,/inventory_applied boolean not null default true/);
assert.match(migration,/solrak_guard_sale_item_inventory_applied/);
assert.match(migration,/v_inventory_tracking and not v_settings\.allow_negative_stock/);
assert.match(migration,/and coalesce\(\(r\.line->>'inventory_applied'\)::boolean,false\)/);
assert.match(migration,/and coalesce\(\(raw_item->>'inventory_applied'\)::boolean,false\)/);
assert.match(migration,/line\.product_id is not null and line\.inventory_applied/);
assert.match(migration,/Producto Común requiere nombre/);
assert.match(migration,/pos\.inventory_tracking\.change/);
assert.doesNotMatch(migration,/cfdi|finkok/i);
assert.match(api,/historicalLineFlag:true/);
assert.match(api,/returnsAware:true/);
assert.match(api,/voidsAware:true/);
assert.match(api,/solrak_set_inventory_tracking/);
assert.doesNotMatch(api,/cfdi-api|finkok/i);
assert.match(ui,/const VERSION="0\.1\.88"/);
assert.match(ui,/MODO SIN INVENTARIO ACTIVO/);
assert.match(ui,/Descontar inventario al vender/);
assert.match(ui,/Protección histórica/);

const dom=new JSDOM(`<!doctype html><html><head></head><body><section id="tab-pos"><div>POS</div></section><section id="tab-inventario"></section></body></html>`,{runScripts:'outside-only',url:'https://solrak.test'});
const {window}=dom;
window.session={token:'test',user:{role:'admin'}};
window.ANON_KEY='anon';
let enabled=false;
window.fetch=async(_url,opts)=>{
  const body=JSON.parse(opts.body);
  if(body.action==='getMode')return{ok:true,json:async()=>({ok:true,inventoryTrackingEnabled:enabled})};
  if(body.action==='setMode'){enabled=body.enabled;return{ok:true,json:async()=>({ok:true,inventoryTrackingEnabled:enabled})}}
  return{ok:false,json:async()=>({error:'acción inesperada'})};
};
window.confirm=()=>true;
window.eval(ui);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,80));
assert.equal(window.SOLRAKInventoryModeV0188.version,'0.1.88');
assert.equal(window.SOLRAKInventoryModeV0188.state.enabled,false);
assert.ok(window.document.querySelector('#solrak88InventoryBanner'));
assert.ok(window.document.querySelector('#solrakInventoryModeCard'));
const toggle=window.document.querySelector('#solrak88ModeToggle');
assert.equal(toggle.checked,false);
toggle.checked=true;toggle.dispatchEvent(new window.Event('change'));
await new Promise(r=>setTimeout(r,60));
assert.equal(window.SOLRAKInventoryModeV0188.state.enabled,true);
assert.equal(window.document.querySelector('#solrak88InventoryBanner'),null);

console.log('SOLRAK v0.1.88 modo sin inventario smoke: OK');