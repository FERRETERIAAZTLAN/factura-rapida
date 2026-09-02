import fs from 'node:fs';
import vm from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { JSDOM } from 'jsdom';

const js = fs.readFileSync('solrak-hardware-v0194.js', 'utf8');
const rust = fs.readFileSync('desktop-native-v0194/solrak_hardware_v0194.rs', 'utf8');
const helper = fs.readFileSync('desktop-native-v0194/solrak_raw_print_helper_v0194.cs', 'utf8');
const apply = fs.readFileSync('scripts/apply-hardware-v0194.mjs', 'utf8');

for (const marker of [
  'print_raw_ticket_v0194', 'list_windows_printers_v0194', 'list_serial_ports_v0194',
  'scale_connect_v0194', 'scale_read_v0194', 'scale_disconnect_v0194',
  'directPrintEnabled', 'buildEscPos', 'routeScan', 'padStart(6, "0")',
]) {
  if (!js.includes(marker) && !rust.includes(marker)) throw new Error(`Falta contrato hardware: ${marker}`);
}
for (const marker of ['OpenPrinter', 'StartDocPrinter', 'WritePrinter', 'ClosePrinter']) {
  if (!helper.includes(marker)) throw new Error(`Helper WinSpool incompleto: ${marker}`);
}
for (const marker of ['solrak-hardware-v0194.js', 'solrak_hardware_v0194.rs', 'nativeHardware?.directPrintEnabled?.()']) {
  if (!apply.includes(marker)) throw new Error(`apply-hardware incompleto: ${marker}`);
}
if (/\b(?:demo|mock|simulad[oa])\b/i.test(js + rust)) throw new Error('Hardware v0.1.94 contiene simulación o mock');
if (/cfdi|finkok/i.test(js + rust + helper)) throw new Error('Hardware v0.1.94 invadió CFDI/Finkok');
if (js.includes('__SOLRAK_TEST_PRINT__')) throw new Error('Hardware no debe depender del hook de pruebas de impresión');

const dom = new JSDOM('<!doctype html><html><head></head><body><section id="tab-configuracion"></section><input id="posSearch"></body></html>', { url: 'https://solrak.local', runScripts: 'outside-only' });
const { window } = dom;
window.TextEncoder = TextEncoder;
window.TextDecoder = TextDecoder;
window.notice = () => {};
window.__TAURI__ = undefined;
const context = dom.getInternalVMContext();
vm.runInContext(js, context, { filename: 'solrak-hardware-v0194.js' });
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise((resolve) => setTimeout(resolve, 25));

const hw = window.SOLRAKHardwareV0194;
if (!hw || hw.version !== '0.1.94') throw new Error('No se publicó SOLRAKHardwareV0194');
if (!window.document.getElementById('solrakHardwareV0194')) throw new Error('No se montó panel de hardware');
if (hw.directPrintEnabled()) throw new Error('La impresión directa no debe activarse sin Tauri real');

const receipt = {
  saleNumber: 123,
  createdAt: '2026-09-02T12:00:00-07:00',
  customerName: 'Público general',
  items: [{ code: '7501234567890', name: 'Producto de prueba', qty: 2, unitPrice: 25, total: 50 }],
  subtotal: 43.10,
  tax: 6.90,
  total: 50,
  payments: [{ method: 'cash', amount: 50 }],
};
const raw = Array.from(hw.buildEscPos(receipt, { businessName: 'SOLRAK', paperSize: '58', showTax: true, showBarcode: true, footer: 'Gracias' }));
const printable = String.fromCharCode(...raw.filter((n) => n >= 32 && n <= 126));
if (!printable.includes('000123')) throw new Error('El ticket RAW no contiene folio exacto 000123');
if (!raw.some((v, i) => v === 29 && raw[i + 1] === 107 && raw[i + 2] === 73)) throw new Error('Falta comando CODE128 ESC/POS');
if (!raw.some((v, i) => v === 29 && raw[i + 1] === 86 && raw[i + 2] === 66)) throw new Error('Falta comando de corte ESC/POS');
if (!printable.includes('TOTAL')) throw new Error('Ticket RAW no contiene total');

let routed = '';
const search = window.document.getElementById('posSearch');
search.addEventListener('keydown', (event) => { if (event.key === 'Enter') routed = search.value; });
if (!hw.routeScan('2*ABC123')) throw new Error('routeScan no pudo dirigir lectura');
if (routed !== '2*ABC123') throw new Error(`Scanner no conservó cantidad*código: ${routed}`);

console.log(`SOLRAK HARDWARE v0.1.94 SMOKE OK bytes=${raw.length} barcode=000123 scanner=${routed}`);
