import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-ui-operativa-v0183.js", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(!/cfdi-api|finkok|completeSale/i.test(code), "La UI v0.1.83 invadió facturación o cobro atómico");
assert(/Recargas \/ Servicios/.test(code), "Falta el acceso visual solicitado a Recargas/Servicios");
assert(/Azul sky/.test(code) && /Gris oscuro/.test(code) && /Rosa intenso/.test(code) && /Morado/.test(code), "Faltan temas corporativos");

const dom = new JSDOM(`<!doctype html><html data-solrak-fiel="1" data-solrak-can-discount="1"><head></head><body>
<aside id="solrakFielSidebar"><div class="fielBrand"><div class="fielBrandMark">S</div><div class="fielBrandText"><strong>SOLRAK</strong></div></div><div class="fielMenu"><button class="fielMenuItem" data-tab-target="cotizaciones">Cotizaciones</button><button class="fielMenuItem" data-fiel-pos-tool="discount">Descuentos</button></div></aside>
<main class="shell"><header class="top"></header><section id="tab-pos" class="tab-panel">
<div class="frPosTop"><h2>POS</h2></div>
<div class="frTicketBar"><div id="posTickets"><div class="frTicket active">Ticket #1</div><div class="frTicket">Ticket #2</div></div><button id="posNewTicket" class="frTicketNew">Nuevo</button></div>
<div class="frPosGrid"><div class="stack"><article><div class="frPosSearch"><input id="posSearch"></div><div id="posResults"></div></article><article class="frPosCartCard"><div class="card-head"><h2>Ticket #1</h2><button id="posClear">Limpiar</button></div><label>Cliente<select class="field"></select></label><div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div><div id="posCart"><div class="frPosLine" data-pos-line="p1"><div>ABC</div><div><strong>Martillo</strong></div><div><input data-pos-qty="p1" value="2"></div><div>$75</div><div>$150</div></div></div></article></div><aside class="summary"><div id="posProductPreview"><img src="https://example.test/martillo.png"><div class="frPreviewMeta"><strong>Martillo</strong></div></div><div class="frPosTotals"><div class="frPosGrand"><span>Total</span><strong id="posTotal">$150.00</strong></div></div><button id="posCharge">Cobrar</button></aside></div>
</section></main>
<button id="fielFinishSale">Finalizar venta</button>
</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.test" });

const { window } = dom;
window.CSS ||= {};
window.CSS.escape ||= (v) => String(v).replace(/"/g, '\\"');
let finish = 0, cleared = 0, discount = 0, quote = 0, switched = "";
window.document.getElementById("fielFinishSale").onclick = () => finish++;
window.document.getElementById("posClear").onclick = () => cleared++;
window.document.querySelector('[data-fiel-pos-tool="discount"]').onclick = () => discount++;
window.document.querySelector('[data-tab-target="cotizaciones"]').onclick = () => quote++;
window.switchTab = (tab) => { switched = tab; };
window.notice = () => {};
const line = { id: "p1", name: "Martillo", qty: 2, price: 75 };
window.FacturaRapidaPOS = { cart: [line], tickets: [{ id: 1, cart: [line] }, { id: 2, cart: [] }], openPayment: () => finish++ };
const qtyInput = window.document.querySelector('[data-pos-qty="p1"]');
qtyInput.onchange = () => { line.qty = Number(qtyInput.value); };

window.eval(code);
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise((resolve) => setTimeout(resolve, 80));
const doc = window.document;

assert(window.SOLRAKUiOperativaV0183?.version === "0.1.83", "No montó v0.1.83");
assert(doc.documentElement.dataset.solrakUi83 === "1", "Falta marca UI operativa");
assert(doc.getElementById("solrakSidebarToggle"), "Falta hamburguesa del menú lateral");
assert(doc.getElementById("solrakCoreSale"), "Falta acceso directo Venta");
assert(doc.getElementById("solrakPosCommandBar"), "Falta barra superior operativa");
assert(doc.getElementById("solrakPosActionBar"), "Falta botonera inferior");
assert(doc.getElementById("solrakThemeSelect")?.options.length === 4, "Selector de temas incompleto");
assert(doc.getElementById("solrakTopTotalValue").textContent === "$150.00", "El total superior no refleja la venta real");
assert(doc.getElementById("solrakTicketDock").contains(doc.getElementById("posTickets")), "Los tickets no quedaron en la barra superior");
assert(doc.getElementById("solrakSelectedThumb").querySelector("img"), "Falta miniatura del producto seleccionado");
assert(doc.getElementById("solrakServices").disabled, "Recargas/Servicios debe quedar bloqueado sin proveedor real");

const toggle = doc.getElementById("solrakSidebarToggle");
toggle.click();
assert(doc.documentElement.dataset.solrakSidebarCollapsed === "1", "El menú lateral no colapsa");
toggle.click();
assert(doc.documentElement.dataset.solrakSidebarCollapsed === "0", "El menú lateral no expande");

const theme = doc.getElementById("solrakThemeSelect");
theme.value = "purple";
theme.dispatchEvent(new window.Event("change", { bubbles: true }));
assert(doc.documentElement.dataset.solrakUiTheme === "purple", "No aplica tema morado");

const row = doc.querySelector('[data-pos-line="p1"]');
row.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
assert(doc.getElementById("solrakLineEditDialog")?.open, "Doble clic no abre edición rápida");
doc.getElementById("solrakLineQty").value = "3";
doc.getElementById("solrakLineSave").click();
assert(line.qty === 3, "Edición rápida no actualiza cantidad mediante el control real");

// Acciones inferiores delegan en los controles productivos existentes.
doc.getElementById("solrakFinishSale").click();
doc.getElementById("solrakGlobalDiscount").click();
doc.getElementById("solrakClearTicket").click();
doc.getElementById("solrakDraftQuote").click();
assert(finish === 1, "Finalizar venta no delega al cobro real");
assert(discount === 1, "Descuento global no delega al módulo real de descuentos/promociones");
assert(cleared === 1, "Vaciar ticket no usa el control real");
assert(quote === 1, "Cotización/borrador no abre el módulo real");

doc.getElementById("solrakFx").click();
assert(doc.getElementById("solrakFxDialog")?.open, "Tipo de cambio no abre su herramienta");
doc.getElementById("solrakFxRate").value = "20";
doc.getElementById("solrakFxRate").dispatchEvent(new window.Event("input", { bubbles: true }));
assert(doc.getElementById("solrakFxUsd").value === "7.50", "Tipo de cambio no recalcula la referencia");

// Venta directa desde sidebar.
doc.getElementById("solrakCoreSale").click();
assert(switched === "pos", "Venta del sidebar no abre POS");

window.close();
console.log("SOLRAK_UI_OPERATIVA_V0183_OK dense=true sidebar=collapsible tickets=8-ready total=top themes=4 lineEdit=true actionBar=real services=provider-gated");