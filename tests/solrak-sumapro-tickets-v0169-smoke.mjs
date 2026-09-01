import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-sumapro-tickets-v0169.js", "utf8");
const posCode = fs.readFileSync("pos-module.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  !/fetch\s*\(|XMLHttpRequest|completeSale|cfdi-api|supabase/i.test(code),
  "La capa de navegación/tickets invadió red, venta, Supabase o CFDI",
);
for (const marker of [
  'new CustomEvent("solrak:pos-sale-complete"',
  "receiptItems",
  "receiptCustomer",
  "payments,",
]) {
  assert(posCode.includes(marker), `El POS no entrega el recibo confirmado: ${marker}`);
}

const dom = new JSDOM(
  `<!doctype html><html data-solrak-simple-ui="1" data-solrak-professional-pos="1"><head></head><body>
  <button id="floatingMail">Correo</button><button id="floatingStamps">Timbres</button>
  <div id="frBrandPill">Negocio flotante</div>
  <div id="frBrandPanel"><div class="frBrandCard"><div class="frBrandHead">Mi negocio</div>
    <div id="profileSection" class="frSection"><img id="frLogoPreview" src="https://example.test/logo.png"><input id="frBusinessName" value="Ferretería Aztlán"><input id="frBusinessPhone" value="3110000000"></div>
    <div id="frGmailSection" class="frSection"><h3>Correo para enviar facturas</h3><input id="frGmailEmail"><button id="frSaveGmail">Guardar Gmail</button></div>
    <div id="frPlatformSection" class="frSection">Administración de plataforma</div>
  </div>
  <nav class="nav"><button data-tab="pos" class="active"><span class="solrakNavText">Ventas</span></button><button data-tab="proveedores"><span class="solrakNavText">Proveedores</span></button><div id="solrakAppBrand"><div id="solrakAppMark"></div><strong>SOLRAK</strong></div><button data-tab="factura"><span class="solrakNavText">Facturación</span></button><button data-tab="clientes"><span class="solrakNavText">Clientes</span></button><button data-tab="inventario"><span class="solrakNavText">Inventario</span></button><button data-tab="historial"><span class="solrakNavText">Reportes</span></button><button data-tab="configuracion"><span class="solrakNavText">Configuración</span></button><button data-tab="usuarios"><span class="solrakNavText">Usuarios</span></button><div id="solrakNavFooter">Pie</div></nav>
  <main class="shell"><header class="top"><h1>SOLRAK</h1><span id="businessName">Ferretería Aztlán</span></header>
    <div id="frReadyPanel"><div>Finkok listo</div></div>
    <section id="tab-pos" class="tab-panel"><div class="frPosTop"></div><div class="frPosGrid"><div class="stack"></div><aside class="summary"><div id="posReceipt"><div class="frPosReceipt">Venta cobrada</div></div></aside></div></section>
    <section id="tab-factura" class="tab-panel hidden"><div id="frAutoSendBar">Envío automático</div></section>
    <section id="tab-configuracion" class="tab-panel hidden"><div class="split"><article id="fiscalCard" class="card"><h2>Datos fiscales</h2><input id="businessRFC" value="AAA010101AAA"></article><article id="advancedCard" class="card" hidden><h2>Preparación para timbrado</h2><p>CSD real y Finkok</p></article></div><div id="solrakSimpleConfigTools">Configuración avanzada</div></section>
  </main></body></html>`,
  {
    url: "https://example.test",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  },
);

const { window } = dom;
window.session = {
  token: "session-test",
  user: { id: "u1", name: "Admin", role: "admin" },
  business: { id: "b1", name: "Ferretería Aztlán" },
};
window.isAdmin = () => true;
window.notice = () => {};
window.switchTab = (tab) => {
  window.document
    .querySelectorAll(".tab-panel")
    .forEach((panel) => panel.classList.add("hidden"));
  window.document
    .querySelectorAll(".nav>button")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.tab === tab),
    );
  window.document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
};
const printJobs = [];
window.__SOLRAK_TEST_PRINT__ = (job) => printJobs.push(job);

window.eval(code);
await new Promise((resolve) => setTimeout(resolve, 90));

const doc = window.document;
assert(
  window.SOLRAKSumaproTicketsV0169?.version === "0.1.69",
  "No montó SOLRAK v0.1.69",
);
assert(
  doc.documentElement.dataset.solrakSumaproTickets === "1",
  "No activó el modo Suma Pro/tickets",
);
for (const tab of ["tickets", "correo", "timbres"]) {
  assert(doc.getElementById(`tab-${tab}`), `Falta panel ${tab}`);
  assert(
    doc.querySelector(`.nav>button[data-tab="${tab}"]`),
    `Falta opción ${tab} en la barra`,
  );
}

const visibleOrder = [...doc.querySelector(".nav").children]
  .filter((node) => node.id === "solrakAppBrand" || node.matches?.("button[data-tab]"))
  .map((node) => node.id === "solrakAppBrand" ? "marca" : node.dataset.tab);
assert(visibleOrder[0] === "marca", `La marca no quedó primero: ${visibleOrder}`);
assert(
  doc.getElementById("solrakNavFooter")?.textContent.includes("v0.1.69"),
  "El menú conserva una versión visual anterior",
);
assert(
  visibleOrder.indexOf("pos") < visibleOrder.indexOf("proveedores") &&
    visibleOrder.indexOf("proveedores") < visibleOrder.indexOf("tickets"),
  `El menú no quedó ordenado: ${visibleOrder}`,
);
assert(
  doc.getElementById("frGmailSection")?.closest("#tab-correo"),
  "Correo no conservó su configuración real",
);
assert(
  doc.getElementById("frAutoSendBar")?.closest("#tab-correo"),
  "El envío automático no quedó en Correo",
);
assert(
  doc.getElementById("advancedCard")?.closest("#tab-timbres") &&
    doc.getElementById("advancedCard").hidden === false,
  "CSD/Finkok no quedó accesible desde Timbres",
);
assert(
  doc.getElementById("frReadyPanel")?.closest("#tab-timbres"),
  "El estado de timbrado no quedó dentro de Timbres",
);
assert(
  doc.getElementById("profileSection")?.closest("#solrakBusinessProfileCard"),
  "El perfil del negocio quedó inaccesible al retirar la burbuja",
);
assert(!doc.getElementById("solrakSimpleConfigTools"), "Quedó el acceso técnico duplicado");
assert(
  doc.getElementById("floatingMail").dataset.solrakFloatingShortcut === "1" &&
    doc.getElementById("floatingStamps").dataset.solrakFloatingShortcut === "1",
  "Correo/Timbres flotantes no se retiraron de la pantalla",
);

doc.querySelector('.nav>button[data-tab="tickets"]').click();
assert(
  !doc.getElementById("tab-tickets").classList.contains("hidden"),
  "No abre Tickets desde la barra",
);
doc.getElementById("solrakTicketPaper").value = "80";
doc.getElementById("solrakTicketAutoPrint").checked = true;
doc.getElementById("solrakTicketBusinessName").value = "FERRETERÍA AZTLÁN";
doc.getElementById("solrakTicketSave").click();
assert(
  window.SOLRAKSumaproTicketsV0169.settings.paperSize === "80" &&
    window.SOLRAKSumaproTicketsV0169.settings.autoPrint === true,
  "No guardó tamaño/impresión automática",
);
assert(
  doc.getElementById("solrakTicketPreview").textContent.includes("FERRETERÍA AZTLÁN"),
  "La vista previa no refleja el diseño",
);

doc.getElementById("solrakTicketTest").click();
assert(printJobs.length === 1, "El ticket de prueba no llegó a impresión");
assert(
  printJobs[0].html.includes("size:80mm auto") &&
    printJobs[0].html.includes("TICKET DE VENTA #000123"),
  "El ticket de prueba no usa el diseño/tamaño configurado",
);

const saleReceipt = {
  saleNumber: 77,
  ticketNumber: 2,
  createdAt: new Date().toISOString(),
  customerName: "Público general",
  items: [
    { code: "A1", name: "Martillo", qty: 1, unitPrice: 100, total: 100 },
  ],
  payments: [{ method: "cash", amount: 100, tendered: 120 }],
  subtotal: 86.21,
  tax: 13.79,
  total: 100,
  change: 20,
};
doc.dispatchEvent(
  new window.CustomEvent("solrak:pos-sale-complete", { detail: saleReceipt }),
);
await new Promise((resolve) => setTimeout(resolve, 230));
assert(printJobs.length === 2, "La impresión automática no funcionó al cobrar");
assert(
  doc.querySelector("#posReceipt .solrakReceiptPrint"),
  "No quedó opción para reimprimir el ticket cobrado",
);
assert(
  window.SOLRAKSumaproTicketsV0169.lastReceipt?.saleNumber === 77,
  "No conservó el último ticket para reimpresión",
);

const css = doc.getElementById("solrakSumaproTicketsV0169Style")?.textContent || "";
for (const marker of [
  "--solrak-simple-side:238px",
  "grid-template-columns:minmax(0,1fr) 292px!important",
  "#tab-timbres #frReadyPanel{display:grid!important",
  ".solrakTicketPaper.paper80",
]) {
  assert(css.includes(marker), `Falta regla visual v0.1.69: ${marker}`);
}

dom.window.close();
console.log(
  "SOLRAK_SUMAPRO_TICKETS_V0169_OK nav=ordered panels=3 ticketPrint=real autoPrint=ok reprint=ok noNetwork=true",
);
