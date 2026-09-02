import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-sumapro-fiel-v0171.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(!/>\s*Suma\s*</i.test(code), "La interfaz nueva copió la marca Suma");
assert(!/Recargas y Servicios/i.test(code), "La interfaz agregó la opción excluida");
assert(
  !/cfdi-api|finkok|completeSale/i.test(code),
  "La capa visual invadió el timbrado o el cobro atómico",
);

const dom = new JSDOM(
  `<!doctype html><html data-solrak-simple-ui="1" data-solrak-professional-pos="1"><head></head><body>
  <nav class="nav"><button data-tab="pos">POS</button><button data-tab="factura">Factura</button><button data-tab="clientes">Clientes</button><button data-tab="inventario">Productos</button><button data-tab="usuarios">Usuarios</button></nav>
  <main class="shell"><header class="top"><div><p class="eyebrow">X</p><h1>Factura Rápida</h1><p id="businessName"></p></div><div class="top-actions"><span class="pill ok">En línea</span><span id="currentUser">Admin</span><button id="changePinBtn"></button><button id="logoutBtn">Salir</button></div></header>
  <section id="tab-pos" class="tab-panel"><div class="frPosTop"><div><h2>Punto de venta</h2></div></div><div class="frTicketBar"><div id="posTickets"></div><button class="frTicketNew" id="posNewTicket"></button></div><div class="frPosGrid"><div class="stack"><article><div class="frPosSearch"><input id="posSearch"><div class="frPosHint"></div></div><div id="posResults"></div></article><article class="frPosCartCard"><div class="card-head"><h2></h2><button id="posClear"></button></div><label><select id="posClient"></select></label><div class="frPosCartHead"></div><div id="posCart"></div></article></div><aside class="summary"><div id="posProductPreview"></div><div class="frPosTotals"><div class="frPosGrand"><span>Total</span><strong id="posTotal">$0</strong></div></div><button id="posCharge"></button><div id="posReceipt"></div></aside></div></section>
  <section id="tab-factura" class="tab-panel hidden"></section><section id="tab-clientes" class="tab-panel hidden"></section><section id="tab-inventario" class="tab-panel hidden"></section><section id="tab-usuarios" class="tab-panel hidden"></section></main>
  <input id="frBusinessName"><input id="frBusinessPhone"><button id="frSaveBasics"></button><input id="frLogoFile" type="file"><button id="frUploadLogo"></button><img id="frLogoPreview">
  <button id="frExportOpen"></button>
  <section id="tab-tickets"><input id="solrakTicketPrinterEnabled" type="checkbox"><input id="solrakTicketAutoPrint" type="checkbox"><select id="solrakTicketPaper"><option value="58">58</option><option value="80">80</option></select><input id="solrakTicketBusinessName"><input id="solrakTicketAddress"><input id="solrakTicketRfc"><input id="solrakTicketPhone"><input id="solrakTicketFooter"><input id="solrakTicketShowLogo" type="checkbox"><input id="solrakTicketShowTax" type="checkbox"><input id="solrakTicketShowBarcode" type="checkbox"><input id="solrakTicketShowAddress" type="checkbox"><button id="solrakTicketSave"></button></section>
  </body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.test" },
);

const { window } = dom;
window.products = [
  {
    id: "p1",
    code: "7501",
    name: "Martillo",
    price: 120,
    wholesale: 100,
    stock: 5,
    min_stock: 2,
    unit: "Pieza",
    category: "Herramientas",
    active: true,
  },
];
window.clients = [{ id: "c1", name: "Cliente" }];
window.session = {
  user: { role: "admin", name: "Administrador" },
  business: { id: "b1", name: "FERRETERÍA AZTLÁN" },
};
window.isAdmin = () => true;
window.notice = () => {};
let activeTab = "pos";
window.switchTab = (tab) => {
  activeTab = tab;
  window.document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
  window.document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
};
let commonAdded = null;
let newTicketCount = 0;
let paymentOpened = 0;
window.FacturaRapidaPOS = {
  cart: [],
  state: { openSession: null, recentSales: [] },
  newTicket: () => newTicketCount++,
  openPayment: () => paymentOpened++,
  addCommonProduct: (value) => {
    commonAdded = value;
    return true;
  },
  api: async (action) => {
    if (action === "recentSales") return { sales: [] };
    if (action === "creditSummary") return { accounts: [] };
    if (action === "listPromotions") return { promotions: [] };
    throw new Error(`stub ${action}`);
  },
};
window.SOLRAKSumaproTicketsV0169 = {
  settings: {
    printerEnabled: true,
    autoPrint: true,
    paperSize: "58",
    businessName: "FERRETERÍA AZTLÁN",
    showLogo: true,
    showTax: true,
    showBarcode: true,
    showAddress: true,
  },
  mount() {},
  printTest() {},
  openTab(tab) {
    activeTab = tab;
  },
};

window.eval(code);
await new Promise((resolve) => setTimeout(resolve, 100));

const doc = window.document;
assert(window.SOLRAKSumaproFielV0171?.version === "0.1.71", "No montó v0.1.71");
assert(doc.documentElement.dataset.solrakFiel === "1", "No marcó el diseño fiel");
assert(doc.getElementById("solrakFielSidebar"), "Falta la barra lateral nueva");
assert(doc.getElementById("fielPriceDialog"), "Falta Verificador de Precios");
assert(doc.getElementById("fielCommonDialog"), "Falta Producto Común");
assert(doc.getElementById("fielTicketDialog"), "Falta Consultar Ticket");
assert(doc.getElementById("fielReturnDialog"), "Falta Devoluciones");
assert(doc.getElementById("fielConfigDialog"), "Falta Configuración");
assert(doc.getElementById("fielPromotionForm"), "Falta gestión de promociones");
assert(doc.getElementById("fielCreditPaymentForm"), "Falta registro de pagos a crédito");
assert(
  doc.querySelector('[data-fiel-payment="credit"]'),
  "Falta Crédito al modificar la forma de pago",
);
assert(!doc.getElementById("fielMailTop"), "Correo quedó duplicado fuera de la barra lateral");
assert(
  doc.querySelector("#tab-pos aside.summary .frTicketBar"),
  "Los tickets abiertos no quedaron junto al total",
);
assert(doc.getElementById("fielPosActions"), "Falta la barra inferior del POS");

const labels = [...doc.querySelectorAll("#solrakFielSidebar button")].map((button) =>
  button.textContent.trim(),
);
for (const label of [
  "Verificador Precios",
  "Nuevo Ticket",
  "Producto Común",
  "Consultar Ticket",
  "Devolución",
  "Facturación",
  "Cotizaciones",
  "Clientes",
  "Productos",
  "Proveedores",
  "Usuarios",
  "Turnos",
  "Caja",
  "Configuración",
  "Correo",
  "Timbres",
  "Reportes",
]) {
  assert(labels.some((value) => value === label), `Falta opción: ${label}`);
}

doc.querySelector('[data-fiel-action="new-ticket"]').click();
assert(activeTab === "pos" && newTicketCount === 1, "Nuevo Ticket perdió su función");
doc.querySelector('[data-tab-target="factura"]').click();
assert(activeTab === "factura", "Facturación no abre su panel real");
doc.querySelector('[data-fiel-action="common-product"]').click();
doc.getElementById("fielCommonName").value = "Corte de cable";
doc.getElementById("fielCommonPrice").value = "33.50";
doc.getElementById("fielCommonForm").dispatchEvent(
  new window.Event("submit", { bubbles: true, cancelable: true }),
);
assert(commonAdded?.price === "33.50", "Producto Común no conserva el precio capturado");
assert(
  commonAdded?.name === "Corte de cable" &&
    doc.getElementById("fielCommonName").required,
  "Producto Común requiere y conserva el nombre capturado",
);
doc.getElementById("fielFinishSale").click();
assert(paymentOpened === 1, "Finalizar venta no abre el cobro real");
doc.querySelector('[data-fiel-pos-tool="discount"]').click();
await new Promise((resolve) => setTimeout(resolve, 20));
assert(
  doc.getElementById("fielPromotionsDialog").open,
  "Aplicar descuento no abre promociones registradas",
);

window.SOLRAKSumaproFielV0171.openConfiguration("ticket");
assert(doc.getElementById("fielConfigDialog").open, "Configuración no abre como ventana");
assert(doc.getElementById("fielConfigTicket").classList.contains("active"), "No abrió la pestaña Ticket");

const css = doc.getElementById("solrakSumaproFielV0171Style")?.textContent || "";
for (const marker of [
  "--fiel-orange:#e97618",
  "--fiel-side:246px",
  "grid-template-columns:minmax(0,1fr) 300px",
  ".fielFinish",
])
  assert(css.includes(marker), `Falta contrato visual: ${marker}`);

window.close();
console.log(
  "SOLRAK_SUMAPRO_FIEL_V0171_OK sidebar=complete pos=large tickets=real promotions=real credits=real ticketConfig=true handlers=preserved excludedOption=absent",
);
