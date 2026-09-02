import fs from "node:fs";
import { JSDOM } from "jsdom";

const js = fs.readFileSync("solrak-hardware-v0191.js", "utf8");
const rust = fs.readFileSync("desktop-native-v0191/main.rs", "utf8");
const cargo = fs.readFileSync("desktop-native-v0191/Cargo.toml", "utf8");
const apply = fs.readFileSync("scripts/apply-hardware-v0191.mjs", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const marker of [
  'const VERSION = "0.1.91"',
  'list_serial_ports',
  'scale_connect',
  'scale_read',
  'scale_disconnect',
  'list_windows_printers',
  'solrak:scale-weight',
  'No se generan lecturas simuladas',
  'Windows utiliza sus drivers instalados',
]) assert(js.includes(marker), `Falta requisito hardware JS: ${marker}`);
for (const marker of [
  'serialport::available_ports()',
  'serialport::new(&port_name, baud_rate)',
  'struct HardwareState',
  'fn parse_weight',
  'fn list_windows_printers',
  'hardware_bridge: true',
  '.manage(HardwareState::default())',
]) assert(rust.includes(marker), `Falta requisito hardware Rust: ${marker}`);
assert(cargo.includes('serialport = { version = "4", default-features = false }'), "No está declarada la dependencia serial real");
assert(apply.includes('desktop-native-v0191'), "El empaquetado Windows no aplica el puente nativo");
assert(!/Math\.random|mock|demo/i.test(js), "El módulo hardware contiene simulación/mock/demo");
assert(!/cfdi|finkok/i.test(js + rust + apply), "Hardware invadió CFDI/Finkok");
assert(!/print_to_printer|silent_print|direct_print/i.test(js + rust), "v0.1.91 no debe prometer impresión directa/silenciosa sin un comando nativo verificado");

const calls = [];
const dom = new JSDOM(`<!doctype html><html><head></head><body><section id="tab-configuracion"></section><div id="solrakScaleStatus"><strong></strong></div></body></html>`, {
  url: "https://example.test",
  runScripts: "dangerously",
  pretendToBeVisual: true,
});
const { window } = dom;
window.notice = () => {};
window.__TAURI__ = { core: { invoke: async (command, args = {}) => {
  calls.push([command, args]);
  if (command === "desktop_info") return { native: true, hardwareBridge: true, platform: "Windows" };
  if (command === "list_serial_ports") return [{ portName: "COM4", portType: "usb", manufacturer: "ScaleCo", product: "USB Scale" }];
  if (command === "scale_connect") return { connected: true, weight: null };
  if (command === "scale_read") return { connected: true, weight: 1.235, unit: "kg", raw: "ST,GS,1.235 kg" };
  if (command === "scale_disconnect") return null;
  if (command === "list_windows_printers") return [{ name: "Thermal 80", driverName: "Windows Thermal", portName: "USB001", isDefault: true }];
  throw new Error(`Comando inesperado ${command}`);
}}};
let scaleEvent = null;
window.document.addEventListener("solrak:scale-weight", (event) => { scaleEvent = event.detail; });
window.eval(js);
await new Promise((resolve) => setTimeout(resolve, 180));
assert(window.SOLRAKHardwareV0191?.version === "0.1.91", "No montó hardware v0.1.91");
assert(window.document.getElementById("solrakHardwareV0191"), "No inyectó configuración de hardware");
assert(window.document.getElementById("solrakHw91Port").value === "COM4" || [...window.document.getElementById("solrakHw91Port").options].some(o => o.value === "COM4"), "No cargó COM real");
assert(window.document.getElementById("solrakHw91Printer").value === "Thermal 80", "No seleccionó impresora predeterminada");
assert(window.SOLRAKPrinter?.directPrint !== true, "La impresora preferida no debe declararse como impresión directa mientras Windows muestra su diálogo");
window.document.getElementById("solrakHw91Port").value = "COM4";
await window.SOLRAKHardwareV0191.connectScale(true);
await new Promise((resolve) => setTimeout(resolve, 300));
assert(scaleEvent?.weight === 1.235 && scaleEvent?.unit === "kg", "No publicó peso real al POS");
assert(window.SOLRAKScale?.weight === 1.235, "No dejó estado de báscula disponible");
assert(calls.some(([c,a]) => c === "scale_connect" && a.portName === "COM4" && a.baudRate === 9600), "No invocó conexión COM con configuración real");
assert(calls.some(([c]) => c === "list_windows_printers"), "No consultó Windows Print Spooler");
await window.SOLRAKHardwareV0191.disconnectScale();
assert(window.SOLRAKScale?.connected === false, "No marca desconexión real");
dom.window.close();
console.log("SOLRAK_HARDWARE_V0191_OK tauri=true serial=COM printer=windows scaleEvent=real directPrint=false noDemo=true");
