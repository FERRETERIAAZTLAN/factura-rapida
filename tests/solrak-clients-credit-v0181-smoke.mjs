import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const ui=fs.readFileSync('solrak-clients-credit-v0181.js','utf8');
const api=fs.readFileSync('supabase/functions/client-api/index.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/202609020005_client_credit_limits.sql','utf8');

assert.match(ui,/0\.1\.81/);
assert.match(api,/version:2/);
assert.match(api,/softDelete:true/);
assert.match(api,/creditLimits:true/);
assert.match(api,/action==="saveCreditSettings"/);
assert.match(api,/action==="setClientActive"/);
assert.match(sql,/add column if not exists active boolean not null default true/);
assert.match(sql,/credit_enabled boolean not null default false/);
assert.match(sql,/credit_limit numeric\(14,2\) not null default 0/);
assert.match(sql,/solrak_validate_credit_charge/);
assert.match(sql,/El cliente no tiene crédito autorizado/);
assert.match(sql,/Límite de crédito excedido/);
assert.match(sql,/trg_solrak_validate_active_sale_client/);
assert.match(sql,/client\.deactivate/);
assert.ok(!/delete from public\.clients/i.test(sql), 'La baja lógica no debe borrar clientes');
for(const text of [ui,api,sql])assert.ok(!/cfdi-api|finkok|recargas/i.test(text));

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<section id="tab-clientes"><div id="clientList">
  <div class="client-row"><div><strong>Activo</strong></div><button data-ci="invoice" data-id="c1">Facturar</button><button data-ci="edit" data-id="c1">Editar</button></div>
  <div class="client-row"><div><strong>Inactivo</strong></div><button data-ci="invoice" data-id="c2">Facturar</button><button data-ci="edit" data-id="c2">Editar</button></div>
</div></section>
<select id="invoiceClient"><option value="">Selecciona</option><option value="c1">Activo</option><option value="c2">Inactivo</option></select>
</body></html>`,{runScripts:'outside-only',url:'https://solrak.local/'});
const {window}=dom;
window.ANON_KEY='anon';
window.session={token:'token',user:{role:'admin'}};
window.notice=()=>{};
window.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);
  if(body.action==='listClientsManagement')return {ok:true,json:async()=>({ok:true,clients:[
    {id:'c1',name:'Activo',rfc:'AAA010101AAA',active:true,credit_enabled:true,credit_limit:1000,balance:250},
    {id:'c2',name:'Inactivo',rfc:'BBB010101BBB',active:false,credit_enabled:false,credit_limit:0,balance:0},
  ]})};
  throw new Error(`Acción inesperada ${body.action}`);
};
window.eval(ui);
await new Promise((resolve)=>setTimeout(resolve,180));

assert.ok(window.document.getElementById('solrakClientCreditManager'));
assert.equal(window.document.querySelector('#invoiceClient option[value="c2"]'),null);
assert.equal(window.document.querySelector('[data-ci="invoice"][data-id="c2"]').disabled,true);
assert.equal(window.document.querySelector('[data-ci="invoice"][data-id="c1"]').disabled,false);
assert.ok(window.document.querySelector('#clientList [data-id="c2"]').closest('.client-row').querySelector('.solrakClientInactive'));
assert.match(window.document.getElementById('solrakClientCreditManager').textContent,/Clientes y Crédito/);
assert.match(window.document.getElementById('solrakClientCreditManager').textContent,/\$250/);

console.log('SOLRAK v0.1.81 clients credit smoke: OK');
