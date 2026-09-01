import fs from 'node:fs';

const code=fs.readFileSync('pos-module.js','utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

for(const field of ['cash_sales','card_sales','transfer_sales','credit_sales','other_sales','refunds_total','cancellations_total','expected_cash','counted_cash','difference']){
  assert(code.includes(field),`Corte de caja incompleto: ${field}`);
}
for(const label of ['Ventas en efectivo','Ventas con tarjeta','Ventas por transferencia','Ventas a crédito','Devoluciones','Cancelaciones','Efectivo esperado','Efectivo contado','Diferencia']){
  assert(code.includes(label),`Falta etiqueta real de corte: ${label}`);
}
assert(/posApi\(["']closeCash["']/.test(code),'El cierre dejó de usar la operación productiva');
assert(/posApi\(["']completeSale["']/.test(code),'La venta atómica dejó de estar conectada');
assert(/\bpayments\s*,/.test(code),'Cambió el contrato productivo de pagos combinados');
assert(!/cfdi-api|finkok/i.test(code),'El POS invadió CFDI/Finkok');

console.log('SOLRAK_V0164_CASH_REPORT_CONTRACT_OK realFields=true atomicSale=true paymentContract=true cfdiUntouched=true');
