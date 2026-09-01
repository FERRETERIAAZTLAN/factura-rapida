import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-simple-ui-v0168.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  !/fetch\s*\(|XMLHttpRequest|completeSale|cfdi-api|finkok|supabase/i.test(
    code,
  ),
  "La capa simple invadió red, venta, Supabase o CFDI",
);

const dom = new JSDOM(
  `<!doctype html><html data-solrak-professional-pos="1"><head></head><body>
  <div id="frBrandPill">Negocio</div>
  <nav class="nav"><div id="solrakAppBrand"><div id="solrakAppMark"></div><div><strong>SOLRAK</strong><small>PUNTO DE VENTA</small></div></div><button data-tab="pos" class="active"><span class="solrakNavText">Ventas</span></button><button data-tab="configuracion"><span class="solrakNavText">Configuración</span></button><div class="solrakNavSection">SISTEMA</div></nav>
  <main class="shell"><header class="top"><div><p class="eyebrow">SISTEMA</p><h1>SOLRAK</h1><p id="businessName">Negocio</p></div><div class="top-actions"><span class="pill">En línea</span><button class="secondary">Salir</button></div></header><div id="frReadyPanel">Estado técnico</div><div class="statusgrid">Indicadores</div><div id="solrakContextBar">Contexto</div>
  <section id="tab-pos" class="tab-panel"><div class="frPosTop"><div><p class="eyebrow">VENTA</p><h2>Punto de venta</h2><div class="frPosHint">Ayuda</div></div><div class="actions"><span class="frPosState">Caja abierta</span></div></div><div class="frPosGrid"><div class="stack"><article class="card"><div class="frPosSearch"><input id="posSearch"><div class="frPosHint">Buscar</div></div><div class="frPosResults"></div></article><article class="card frPosCartCard"><div class="card-head"><h2>Ticket</h2><button id="posClear">Limpiar</button></div><label>Cliente<select id="posClient" class="field"></select></label><div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div><div id="posCart" class="frPosCart"></div></article><article class="card">Ventas recientes</article></div><aside class="card summary"><div id="posProductPreview" class="frPreview"></div><div class="frTicketBar"><div id="posTickets"></div><button id="posNewTicket" class="frTicketNew">Nuevo ticket</button></div><div class="frPosTotals"><div class="frPosGrand"><span>Total</span><strong id="posTotal">$0.00</strong></div></div><button id="posCharge" class="primary">Finalizar venta</button></aside></div></section>
  <section id="tab-configuracion" class="tab-panel hidden"><div class="split"><article id="businessCard" class="card"><h2>Datos del negocio</h2></article><article id="advancedCard" class="card"><h2>Preparación para timbrado</h2><p>CSD y PAC</p></article></div></section>
  <footer>Estado técnico</footer></main></body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true },
);

dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.eval(code);
await new Promise((resolve) => setTimeout(resolve, 40));

const doc = dom.window.document;
const css = doc.getElementById("solrakSimpleUIV0168Style")?.textContent || "";
const advanced = doc.getElementById("advancedCard");
const toggle = doc.getElementById("solrakSimpleAdvancedToggle");

assert(
  dom.window.SOLRAKSimpleUIV0168?.version === "0.1.68",
  "No montó la interfaz simple v0.1.68",
);
assert(
  doc.documentElement.dataset.solrakSimpleUi === "1",
  "No activó el modo simple",
);
for (const marker of [
  "--solrak-simple-side:210px",
  "#frBrandPill{display:none!important",
  "grid-template-columns:minmax(0,1fr) 270px!important",
  "padding-bottom:max(10px,env(safe-area-inset-bottom))",
]) {
  assert(css.includes(marker), `Falta regla visual simple: ${marker}`);
}
assert(advanced?.hidden === true, "La configuración técnica inició expuesta");
assert(toggle, "Falta acceso a la configuración avanzada");
toggle.click();
assert(advanced.hidden === false, "No se puede abrir la configuración avanzada");
assert(
  toggle.getAttribute("aria-expanded") === "true",
  "El control avanzado no informa su estado",
);
for (const id of [
  "posSearch",
  "posClient",
  "posCart",
  "posTickets",
  "posNewTicket",
  "posCharge",
  "businessCard",
]) {
  assert(doc.getElementById(id)?.isConnected, `La capa simple eliminó ${id}`);
}

console.log(
  "SOLRAK_SIMPLE_UI_V0168_OK sidebar=light pos=clean charge=preserved advanced=available noNetwork=true",
);
