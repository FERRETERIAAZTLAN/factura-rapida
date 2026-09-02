import fs from 'node:fs';
import assert from 'node:assert/strict';

const ux=fs.readFileSync('solrak-keyboard-ticket-ux-v0190.js','utf8');
const pos=fs.readFileSync('pos-module.js','utf8');
const tickets=fs.readFileSync('solrak-sumapro-tickets-v0169.js','utf8');
const fiel=fs.readFileSync('solrak-sumapro-fiel-v0171.js','utf8');
const sql=fs.readFileSync('supabase/migrations/202609020010_keyboard_ticket_ux.sql','utf8');
const api=fs.readFileSync('supabase/functions/ticket-ux-api/index.ts','utf8');

assert.match(ux,/const VERSION="0\.1\.90"/);
assert.match(ux,/e\.key==="F2"/);
assert.match(ux,/e\.key==="F4"/);
assert.match(ux,/e\.key==="F8"/);
assert.match(ux,/e\.key==="F9"/);
assert.match(ux,/e\.key==="F12"/);
assert.match(ux,/\^\[1-8\]\$/);
assert.match(ux,/focusSaleSearch/);
assert.match(ux,/solrak:pos-sale-complete/);
assert.match(ux,/No hay registros/);
assert.match(ux,/confirmSaleVoid/);
assert.match(ux,/confirmReturnImpact/);
assert.match(ux,/inventory_applied/);
assert.match(ux,/findSale/);
assert.match(ux,/openReturns/);
assert.match(ux,/ticketBarcodeEnabled/);
assert.match(ux,/window\.alert=.*toast/);
assert.match(ux,/window\.confirm=.*return false/);
assert.doesNotMatch(ux,/cfdi-api|finkok/i);

assert.match(pos,/const MAX_TICKETS = 8;/);
assert.doesNotMatch(pos,/\bconfirm\s*\(/);
assert.match(pos,/SOLRAKDialog/);
assert.match(fiel,/confirmSaleVoid/);
assert.match(fiel,/confirmReturnImpact/);
assert.doesNotMatch(fiel,/\bprompt\s*\(/);
assert.doesNotMatch(fiel,/\bconfirm\s*\(/);

assert.match(tickets,/const barcodeValue = String\(receipt\?\.saleNumber \|\| 0\);/);
assert.match(tickets,/replace\(\/\[\^0-9\]\/g, ""\)/);
assert.doesNotMatch(tickets,/const barcodeValue = `V\$\{number\}`/);
assert.match(tickets,/SOLRAKUXV0190\?\.ticketBarcodeEnabled/);

assert.match(sql,/ticket_barcode_enabled boolean not null default true/);
assert.match(sql,/solrak_set_ticket_barcode/);
assert.match(api,/exactFolioBarcode:true/);
assert.match(api,/setBarcode/);
assert.doesNotMatch(sql,/cfdi|finkok/i);
assert.doesNotMatch(api,/cfdi-api|finkok/i);

console.log('SOLRAK v0.1.90 smoke OK');
