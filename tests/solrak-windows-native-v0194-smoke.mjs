import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [js, rust, apply, peripherals] = await Promise.all([
  readFile('solrak-windows-native-v0194.js', 'utf8'),
  readFile('desktop-native-v0194/hardware.rs.inc', 'utf8'),
  readFile('scripts/apply-windows-hardware-v0194.mjs', 'utf8'),
  readFile('solrak-peripherals-v0191.js', 'utf8'),
]);

for (const command of [
  'list_serial_ports_v0194',
  'scale_connect_v0194',
  'scale_read_v0194',
  'scale_disconnect_v0194',
  'list_windows_printers_v0194',
  'print_windows_raw_v0194',
]) {
  assert.ok(rust.includes(command), `Rust debe exponer ${command}`);
  assert.ok(apply.includes(command), `El overlay debe registrar ${command}`);
}
assert.ok(rust.includes('serialport::available_ports()'), 'debe enumerar puertos COM reales');
assert.ok(rust.includes('serialport::new(&port_name, baud_rate)'), 'debe abrir un puerto serial real');
assert.ok(rust.includes('Get-CimInstance Win32_Printer'), 'debe consultar impresoras instaladas de Windows');
assert.ok(rust.includes('OpenPrinterW'), 'debe abrir la impresora seleccionada en Winspool');
assert.ok(rust.includes('WritePrinter'), 'debe enviar bytes RAW al spooler');
assert.ok(rust.includes('pDataType="RAW"'), 'el trabajo debe usar datatype RAW');
assert.ok(!/Math\.random|peso\s*(falso|fake)|simulat/i.test(js + rust), 'producción no puede inventar lecturas');
assert.ok(!/Finkok|CFDI/i.test(js + rust), 'hardware no debe tocar CFDI/Finkok');
assert.ok(js.includes('/^\\d+$/'), 'folio directo debe ser estrictamente numérico');
assert.ok(js.includes('`{B${exactFolio}`'), 'Code128 debe usar el folio numérico exacto');
assert.ok(!js.includes('padStart('), 'hardware no debe rellenar el folio con ceros');
assert.ok(peripherals.includes('keyboard'), 'se preserva el lector como teclado USB');

const store = new Map();
const localStorage = {
  getItem(k) { return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
};
const events = [];
const window = {
  session: { business: { id: 'aztlan', name: 'Ferretería Aztlán' } },
  addEventListener() {},
  dispatchEvent(event) { events.push(event); return true; },
};
window.window = window;
const context = vm.createContext({
  window,
  localStorage,
  console,
  TextEncoder,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  setInterval,
  clearInterval,
  Date,
  Number,
  String,
  Array,
  Math,
});
vm.runInContext(js, context, { filename: 'solrak-windows-native-v0194.js' });
const api = window.SOLRAKWindowsNativeV0194;
assert.equal(api.version, '0.1.94');

const receipt = {
  saleNumber: 123,
  createdAt: '2026-09-02T12:00:00Z',
  customerName: 'Público general',
  items: [{ code: '7501234567890', name: 'Llave DICA', qty: 2, unitPrice: 65, total: 130 }],
  subtotal: 112.07,
  tax: 17.93,
  total: 130,
  payments: [{ method: 'cash', amount: 150 }],
  change: 20,
};
const settings = { businessName: 'Ferretería Aztlán', paperSize: '58', copies: 1, showBarcode: true, footer: 'Gracias por su compra' };
const bytes = api.receiptBytes(receipt, settings);
assert.ok(Array.isArray(bytes) && bytes.length > 100, 'ESC/POS debe generar bytes reales');
const printable = Buffer.from(bytes).toString('latin1');
assert.ok(printable.includes('FOLIO 123'), 'ticket debe imprimir folio 123 exacto');
assert.ok(printable.includes('{B123'), 'código Code128 debe contener 123 exacto');
assert.ok(!printable.includes('000123'), 'no debe transformar el folio a 000123');
assert.ok(!printable.includes('V123'), 'no debe agregar prefijo V');

let calls = [];
window.__TAURI__ = { core: { invoke: async (command, args) => {
  calls.push({ command, args });
  if (command === 'list_windows_printers_v0194') return [{ name: 'POS-80', driverName: 'Thermal', portName: 'USB001', isDefault: true }];
  if (command === 'list_serial_ports_v0194') return [{ portName: 'COM3', portType: 'usb' }];
  if (command === 'print_windows_raw_v0194') return { ok: true, printerName: args.printerName, bytesWritten: args.data.length };
  return null;
} } };
localStorage.setItem('solrak.windows.v0194.printer:aztlan', 'POS-80');

const printers = await api.listPrinters();
assert.equal(printers[0].name, 'POS-80');
const ports = await api.listPorts();
assert.equal(ports[0].portName, 'COM3');
const result = await api.printReceipt(receipt, settings);
assert.equal(result.ok, true);
const printCall = calls.find((row) => row.command === 'print_windows_raw_v0194');
assert.equal(printCall.args.printerName, 'POS-80');
assert.ok(printCall.args.data.length > 100);
assert.ok(events.some((event) => event.type === 'solrak:windows-print-complete'));

assert.throws(() => api.receiptBytes({ ...receipt, saleNumber: 'V123' }, settings), /folio numérico exacto/i);
console.log('SOLRAK v0.1.94 Windows native smoke: OK');
