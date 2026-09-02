import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-peripherals-v0191.js", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
for (const marker of ['const VERSION = "0.1.91"','CODE128','solrak:scale-weight','printTicket','readScaleOnce','listPorts','fielTicketQuery']) assert(code.includes(marker), `Falta ${marker}`);
assert(!/\b(?:alert|confirm|prompt)\s*\(/.test(code), "Periféricos usa diálogos nativos");
assert(!/cfdi-api|finkok|completeSale/i.test(code), "Periféricos invadió CFDI/Finkok");

const dom = new JSDOM(`<!doctype html><html><body><section id="tab-pos"><input id="posSearch"></section><button data-fiel-action="ticket-search" id="ticketAction"></button><input id="fielTicketQuery"><button id="fielTicketSearch"></button></body></html>`, { url:"https://example.test", runScripts:"dangerously", pretendToBeVisual:true });
const { window } = dom; const doc = window.document;
let printed = null, searched = 0, weight = null;
window.notice = () => {};
window.SOLRAKDesktop = {
  printer:{ async printTicket(job){ printed = job; return { ok:true }; } },
  scale:{ async readWeight(){ return { weight:1.25, unit:"kg" }; } },
  ports:{ async list(){ return [{ name:"COM3" }]; } },
};
doc.getElementById("fielTicketSearch").onclick=()=>searched++;
window.addEventListener("solrak:scale-weight", (e)=>weight=e.detail.weight);
window.eval(code);
await new Promise(r=>setTimeout(r,20));
assert(window.SOLRAKPeripheralsV0191?.version === "0.1.91", "No montó periféricos");
assert(window.SOLRAKPeripheralsV0191.capabilities().printer, "No detecta impresora");
const ports = await window.SOLRAKPeripheralsV0191.listPorts(); assert(ports[0].name === "COM3", "No lista COM");
await window.SOLRAKPeripheralsV0191.readScaleOnce(); assert(weight === 1.25, "No publica peso");
await window.SOLRAKPeripheralsV0191.printTicket({ saleNumber:4321 });
assert(printed.barcode.type === "CODE128" && printed.barcode.value === "4321", "Barcode no contiene folio exacto");
assert(window.SOLRAKPeripheralsV0191.scanTicketFolio("4321"), "No acepta folio escaneado");
await new Promise(r=>setTimeout(r,5)); assert(doc.getElementById("fielTicketQuery").value === "4321" && searched === 1, "No busca ticket escaneado");
window.SOLRAKPeripheralsV0191.stopScalePolling(); dom.window.close();
console.log("SOLRAK_PERIPHERALS_V0191_OK barcode=CODE128 exactFolio=true scale=bridge ports=bridge scanner=keyboard");