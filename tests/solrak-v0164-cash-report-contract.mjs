import fs from 'node:fs';

const code=fs.readFileSync('pos-module.js','utf8');
const flow=fs.readFileSync('solrak-flow-v0173.js','utf8');
const shifts=fs.readFileSync('solrak-shifts-v0189.js','utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

for(const field of ['cash_sales','card_sales','transfer_sales','credit_sales','other_sales','refunds_total','cancellations_total','expected_cash','counted_cash','difference']){
  assert(code.includes(field),`Corte de caja incompleto: ${field}`);
}
for(const label of ['Ventas en efectivo','Ventas con tarjeta','Ventas por transferencia','Ventas a crédito','Devoluciones','Cancelaciones','Efectivo esperado','Efectivo contado','Diferencia']){
  assert(code.includes(label),`Falta etiqueta real de corte: ${label}`);
}
assert(!/posApi\(["'](?:openCash|closeCash)["']/.test(code),'El POS visible no debe abrir/cerrar caja manualmente');
assert(!/posOpenCash|posCloseCash|posOpenDialog|posCloseDialog/.test(code),'Regresaron controles manuales de caja al POS');
assert(/ensureOperationalSession/.test(code),'El cobro debe preparar la sesión técnica automáticamente');
assert(/ensureOperationalSession/.test(flow),'Falta la sesión técnica automática de caja');
assert(/Turnos automáticos/.test(shifts),'Falta la capa de turnos automáticos');
assert(/posApi\(["']completeSale["']/.test(code),'La venta atómica dejó de estar conectada');
assert(/\bpayments\s*,/.test(code),'Cambió el contrato productivo de pagos combinados');
assert(!/cfdi-api|finkok/i.test(code),'El POS invadió CFDI/Finkok');

console.log('SOLRAK_V0164_CASH_REPORT_CONTRACT_OK realFields=true automaticTechnicalSession=true manualCashControls=false atomicSale=true paymentContract=true cfdiUntouched=true');
