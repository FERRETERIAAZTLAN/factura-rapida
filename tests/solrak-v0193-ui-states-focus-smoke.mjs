import fs from "node:fs";
import assert from "node:assert/strict";

const cash=fs.readFileSync("solrak-caja-cortes-v0185.js","utf8");
const clients=fs.readFileSync("solrak-clients-credit-v0181.js","utf8");
const categories=fs.readFileSync("solrak-categorias-v0187.js","utf8");
const ux=fs.readFileSync("solrak-ux-hardening-v0192.js","utf8");
const core=fs.readFileSync("solrak-ux-core-v0190.js","utf8");
const reports=fs.readFileSync("solrak-reports-v0172.js","utf8");
const credits=fs.readFileSync("solrak-credit-accounts-v0182.js","utf8");
const inventory=fs.readFileSync("solrak-inventory-v0175.js","utf8");

for(const legacy of ["posCloseCash","posCountedCash","solrakCash85CloseTurn","function closeTurn"]){
  assert(!cash.includes(legacy),`Caja conserva cierre manual: ${legacy}`);
}
for(const text of ["Corte automático por franja horaria","Error al cargar:","No hay entradas ni salidas en esta franja."]){
  assert(cash.includes(text),`Caja sin estado/contrato automático: ${text}`);
}

for(const text of ["Cargando clientes y crédito…","Error al cargar clientes","No hay registros de clientes.","solrakClientsRetry"]){
  assert(clients.includes(text),`Clientes sin estado explícito: ${text}`);
}
for(const text of ["Cargando categorías…","Error al cargar categorías","No hay registros de categorías.","solrak87Retry"]){
  assert(categories.includes(text),`Categorías sin estado explícito: ${text}`);
}
for(const text of ["Consultando datos reales del negocio…","No hay registros con estos filtros.","No se pudo consultar el reporte."]){
  assert(reports.includes(text),`Reportes perdió estado explícito: ${text}`);
}
for(const text of ["Cargando…","No hay cuentas pendientes con esos filtros.","Cargando historial…"]){
  assert(credits.includes(text),`Créditos perdió estado explícito: ${text}`);
}
for(const text of ["Cargando proveedores…","No hay proveedores activos","No se pudieron cargar proveedores"]){
  assert(inventory.includes(text),`Inventario/proveedores perdió estado explícito: ${text}`);
}

assert(ux.includes('event.key !== "F9"'),"Falta atajo F9 para Caja/Corte");
assert(ux.includes('[data-fiel-action="cash-cut"]'),"F9 no apunta a Caja/Corte");
assert(ux.includes('#posNewTicket,[data-ticket]'),"Nuevo/cambio de ticket no recupera foco");
assert(ux.includes('solrak:pos-sale-complete'),"Venta terminada no recupera foco");
assert(/MAX_TICKETS\s*=\s*8/.test(core),"Multiticket dejó de ser exactamente 8");
for(const key of ["F2","F4","F8","F12"]){
  assert(core.includes(`"${key}"`)||core.includes(`'${key}'`),`Falta hotkey ${key}`);
}
assert(core.includes("[1-8]")||/1-8/.test(core),"Faltan atajos para tickets 1–8");

for(const code of [cash,clients,categories,ux]){
  assert(!/(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(code),"Se reintrodujo diálogo nativo de navegador");
}

console.log("SOLRAK_V0193_UI_STATES_FOCUS_OK cashAutomatic=true explicitStates=true focus=true tickets=8 nativeDialogs=false");
