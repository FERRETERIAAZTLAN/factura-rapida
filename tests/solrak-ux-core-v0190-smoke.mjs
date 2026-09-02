import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-ux-core-v0190.js", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const marker of [
  'const VERSION = "0.1.90"',
  'const MAX_TICKETS = 8',
  'event.key === "F2"',
  'event.key === "F3"',
  'event.key === "F4"',
  'event.key === "F6"',
  'event.key === "F7"',
  'event.key === "F8"',
  'event.key === "F12"',
  'solrak:pos-sale-complete',
  'data-close-ticket',
  'inventory_applied',
  '"voidSale"',
  '"returnSale"',
  '"saleDetail"',
  '"findSale"',
  'No hay registros',
]) assert(code.includes(marker), `Falta requisito v0.1.90: ${marker}`);
assert(!/\b(?:alert|confirm|prompt)\s*\(/.test(code), "v0.1.90 usa diálogo nativo del navegador");
assert(!/cfdi-api|finkok|completeSale/i.test(code), "v0.1.90 invadió CFDI/Finkok/completeSale");

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<nav><button id="posNav" data-tab="pos">Venta</button></nav>
<section id="tab-pos"><input id="posSearch"><button id="posNewTicket">Nuevo</button><button id="posClear">Limpiar</button><div class="frPosHint">Escanea y mantén hasta 7 tickets abiertos.</div><div id="posTickets"></div></section>
<button data-fiel-action="price-check" id="priceAction"></button>
<button data-fiel-action="common-product" id="commonAction"></button>
<button data-fiel-action="ticket-search" id="ticketAction"></button>
<button data-fiel-action="return-sale" id="returnAction"></button>
<button id="fielFinishSale">Cobrar</button>
<input id="fielTicketQuery"><input id="fielReturnQuery">
<table><tbody id="inventoryBody"></tbody></table><div id="clientList"></div><div id="fielCreditsContent"></div>
<button id="fielCancelSale" disabled></button><button id="fielConfirmReturn" disabled></button>
</body></html>`, { url: "https://example.test", runScripts: "dangerously", pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
if (!window.HTMLDialogElement.prototype.showModal) window.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute("open", ""); };
else window.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute("open", ""); };
window.HTMLDialogElement.prototype.close = function(){ this.removeAttribute("open"); this.dispatchEvent(new window.Event("close", { bubbles: false })); };
window.notice = () => {};
window.getComputedStyle = () => ({ display: "block" });
let finished = 0, price = 0, common = 0, ticketSearch = 0, returnSearch = 0, newTickets = 0, switched = null;
doc.getElementById("fielFinishSale").onclick = () => finished++;
doc.getElementById("priceAction").onclick = () => price++;
doc.getElementById("commonAction").onclick = () => common++;
doc.getElementById("ticketAction").onclick = () => ticketSearch++;
doc.getElementById("returnAction").onclick = () => returnSearch++;
doc.getElementById("posNav").onclick = () => doc.getElementById("tab-pos").classList.remove("hidden");
window.FacturaRapidaPOS = {
  cart: [],
  tickets: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, cart: [], clientId: "" })),
  switchTicket(id){ switched = id; },
  newTicket(){ newTickets++; },
  rerender(){},
  api: async () => ({}),
  state: { openSession: { id: "c1" } },
};
window.SOLRAKHeldTicketsV0176 = { newTicket(){ newTickets++; return true; }, persist(){} };

window.eval(code);
await new Promise((resolve) => setTimeout(resolve, 40));
assert(window.SOLRAKUXV0190?.version === "0.1.90", "No montó SOLRAK UX v0.1.90");
assert(window.SOLRAKUXV0190?.maxTickets === 8, "El máximo no es 8");
assert(doc.documentElement.dataset.solrakUx90 === "1", "No activó UX 90");
assert(doc.getElementById("posNewTicket").disabled === true, "No bloquea el noveno ticket");
assert(doc.querySelector("#inventoryBody [data-solrak-empty='1']"), "Inventario no muestra estado vacío");
assert(doc.querySelector("#clientList [data-solrak-empty='1']"), "Clientes no muestra estado vacío");
assert(doc.querySelector("#fielCreditsContent [data-solrak-empty='1']"), "Créditos no muestra estado vacío");
assert(doc.querySelector("#tab-pos .frPosHint").textContent.includes("8 tickets"), "La UI todavía muestra 7 tickets");

function key(key, extra = {}) { doc.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra })); }
key("F2");
await new Promise((resolve) => setTimeout(resolve, 0));
assert(doc.activeElement === doc.getElementById("posSearch"), "F2 no devuelve foco a búsqueda");
key("F3"); key("F4"); key("F6"); key("F7"); key("F12");
assert(price === 1 && common === 1 && ticketSearch === 1 && returnSearch === 1 && finished === 1, "Hotkeys de operación no delegan correctamente");
key("1", { ctrlKey: true }); assert(switched === 1, "Ctrl+1 no cambia ticket");
key("8", { altKey: true }); assert(switched === 8, "Alt+8 no cambia ticket");
key("F8"); assert(newTickets === 1, "F8 no crea ticket mediante la capa de 8 tickets");

doc.dispatchEvent(new window.CustomEvent("solrak:pos-sale-complete", { detail: { saleNumber: 12 } }));
await new Promise((resolve) => setTimeout(resolve, 40));
assert(doc.activeElement === doc.getElementById("posSearch"), "Después de cobrar no regresa foco al escáner");

const css = doc.getElementById("solrakUxCoreV0190Style")?.textContent || "";
for (const marker of ['height:31px', 'font-size:10px', 'backdrop-filter:blur(2px)', 'animation-duration:0s']) assert(css.includes(marker), `Falta densidad/microinteracción: ${marker}`);

dom.window.close();
console.log("SOLRAK_UX_CORE_V0190_OK density=compact hotkeys=keyboard focus=scanner tickets=8 modal=custom emptyStates=ok noNativeDialogs=true");
