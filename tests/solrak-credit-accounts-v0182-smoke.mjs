import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const ui=fs.readFileSync('solrak-credit-accounts-v0182.js','utf8');
const api=fs.readFileSync('supabase/functions/credit-api/index.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/202609020006_credit_payment_reversals.sql','utf8');

assert.match(ui,/0\.1\.82/);
assert.match(ui,/Días sin pago|días sin pago|Días sin pago/i);
assert.match(ui,/Mayor deuda/);
assert.match(ui,/Imprimir último comprobante/);
assert.match(ui,/movimiento compensatorio/);
assert.match(ui,/ensureOperationalSession/);
assert.match(api,/safePaymentVoids:true/);
assert.match(api,/action==="summary"/);
assert.match(api,/action==="history"/);
assert.match(api,/action==="recordPayment"/);
assert.match(api,/action==="voidPayment"/);
assert.match(sql,/reversed_movement_id/);
assert.match(sql,/customer_credit_one_reversal_idx/);
assert.match(sql,/solrak_void_credit_payment/);
assert.match(sql,/'withdrawal'/);
assert.match(sql,/El turno del abono ya está cerrado/);
assert.ok(!/delete from public\.customer_credit_movements/i.test(sql),'No debe borrar abonos');
for(const text of [ui,api,sql])assert.ok(!/cfdi-api|finkok|recargas/i.test(text));

const dom=new JSDOM('<!doctype html><html><head></head><body><button id="credits" data-fiel-action="credits">Créditos</button></body></html>',{runScripts:'outside-only',url:'https://solrak.local/'});
const {window}=dom;
window.ANON_KEY='anon';window.session={token:'token',user:{role:'admin'}};window.notice=()=>{};
window.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);
  if(body.action==='summary')return {ok:true,json:async()=>({ok:true,totals:{clients:1,debt:750},accounts:[{id:'c1',name:'Cliente Crédito',rfc:'AAA010101AAA',active:true,credit_enabled:true,credit_limit:1000,balance:750,available_credit:250,days_without_payment:12}]})};
  throw new Error(`Acción inesperada ${body.action}`);
};
window.eval(ui);
await window.SOLRAKCreditAccountsV0182.open();
assert.ok(window.document.getElementById('solrakCreditAccountsDialog'));
assert.match(window.document.getElementById('solrakCreditTotals').textContent,/\$750/);
assert.match(window.document.getElementById('solrakCreditAccountsRows').textContent,/Cliente Crédito/);
assert.match(window.document.getElementById('solrakCreditAccountsRows').textContent,/12 día/);

console.log('SOLRAK v0.1.82 credit accounts smoke: OK');
