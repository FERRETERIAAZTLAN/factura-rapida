import fs from "node:fs";
import assert from "node:assert/strict";

const tickets=fs.readFileSync("solrak-sumapro-tickets-v0169.js","utf8");
const peripherals=fs.readFileSync("solrak-peripherals-v0191.js","utf8");
const rust=fs.readFileSync("native/windows-printer-v0194.rs","utf8");
const patch=fs.readFileSync("scripts/apply-windows-printer-v0194.mjs","utf8");

assert.match(tickets,/SOLRAK_NATIVE_PRINTER_V0194/,"El módulo de tickets no usa la impresión nativa v0.1.94");
assert.doesNotMatch(tickets,/frame\.contentWindow\?\.print\(\)|contentWindow\.print\(\)/,"Quedó impresión web por iframe");
assert.match(tickets,/printerName:\s*"system"/,"Falta impresora predeterminada persistible");
assert.match(tickets,/printerName:\s*byId\("solrakTicketPrinter"\)/,"El formulario no guarda la impresora elegida");
assert.match(tickets,/padStart\(6,\s*["']0["']\)/,"El folio dejó de normalizarse como 000123");
assert.match(tickets,/No abre ventanas de impresión del navegador/,"La UI todavía describe impresión web");
assert.match(tickets,/SOLRAKPeripheralsV0191/,"Tickets no delega al puente de periféricos");

assert.match(peripherals,/__TAURI__\?\.core\?\.invoke/,"El puente no usa Tauri real");
assert.match(peripherals,/invoke\("list_printers"\)/,"Falta comando nativo para impresoras instaladas");
assert.match(peripherals,/invoke\("print_thermal_ticket"/,"Falta comando nativo de impresión térmica");
assert.match(peripherals,/if \(!\/\^\\d\+\$\/\.test\(exactFolio\)\)/,"No valida folio exclusivamente numérico");
assert.match(peripherals,/listPrinters/,"No expone impresoras instaladas");
assert.match(peripherals,/populatePrinterSelect/,"No carga la lista real en Configuración");

for(const marker of ["OpenPrinterW","StartDocPrinterW","WritePrinter","Winspool","RAW","print_thermal_ticket","list_printers"]){
  assert.ok(rust.includes(marker),`Puente Rust incompleto: ${marker}`);
}
assert.match(rust,/barcode != &job\.sale_number/,"El código de barras no está obligado a igualar el folio");
assert.match(rust,/0x1d, 0x6b, 0x04/,"No genera CODE39 ESC\/POS");
assert.match(rust,/Windows no tiene una impresora predeterminada configurada/,"No falla de forma explícita sin impresora predeterminada");
assert.match(rust,/La impresora '\{requested\}' no está instalada en Windows/,"No valida la impresora solicitada contra Windows");
assert.doesNotMatch(rust,/mock|demo|fake|simulad/i,"El puente nativo contiene una ruta simulada");

assert.match(patch,/apply-windows-printer-v0194/,"Falta parche reproducible");
assert.match(patch,/windows_printer_v0194/,"El parche no integra el módulo Rust");
assert.match(patch,/list_printers, print_thermal_ticket, desktop_info/,"El parche no registra los comandos Tauri");

for(const source of [tickets,peripherals,rust,patch]){
  assert.doesNotMatch(source,/cfdi-api|finkok/i,"v0.1.94 invadió CFDI\/Finkok");
}

console.log("SOLRAK_WINDOWS_PRINTER_V0194_OK tauri=true winspool=true raw=true escpos=true exactFolio=true browserPrint=false");
