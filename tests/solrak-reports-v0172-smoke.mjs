import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-reports-v0172.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(code.includes('const VERSION = "0.1.72"'), "Falta versión v0.1.72");
assert(!/Recargas y Servicios/i.test(code), "Apareció la opción excluida de recargas");
for (const label of [
  "Resumen de Ventas",
  "Detalle de Ventas",
  "F.P. en Ventas",
  "Inventario",
  "Historial Movimientos",
  "Más Vendidos",
]) assert(code.includes(label), `Falta reporte: ${label}`);

const reportButtons = [
  "Resumen de Ventas",
  "Detalle de Ventas",
  "F.P. en Ventas",
  "Inventario",
  "Historial Movimientos",
  "Más Vendidos",
].map((label) => `<button class="fielMenuItem">${label}</button>`).join("");

const dom = new JSDOM(`<!doctype html><html data-solrak-fiel="1"><head></head><body>
<aside id="solrakFielSidebar"><div class="fielMenu">
<button class="fielMenuItem">Verificador Precios</button>
<button class="fielMenuGroup" data-fiel-group="reports" aria-expanded="false">Reportes</button>
<div class="fielSubmenu" data-fiel-submenu="reports">${reportButtons}</div>
</div></aside>
<main class="shell"><header class="top"></header><section id="tab-pos" class="tab-panel"><input id="posSearch"></section><section id="tab-factura" class="tab-panel hidden"></section></main>
</body></html>`, { runScripts: "outside-only", url: "https://solrak.test/" });

const { window } = dom;
const calls = [];
window.switchTab = (tab) => {
  window.document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
  window.document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
};
window.notice = () => {};
window.print = () => {};
window.FacturaRapidaPOS = {
  api: async (action, payload) => {
    calls.push({ action, payload });
    assert(action === "reports", "El módulo llamó una acción distinta a reports");
    const base = {
      ok: true,
      kind: payload.kind,
      generatedAt: "2026-09-02T03:00:00.000Z",
      catalogs: {
        users: [{ id: "u1", name: "Admin" }],
        categories: ["TRUPER", "PRODUCTO GENERAL"],
        movementTypes: ["sale", "return"],
      },
    };
    if (payload.kind === "summary") return { ...base, totals: { sales: 100, returns: 0, cancellations: 0, net: 100, profit: 40, tickets: 1 }, periods: [{ period: "2026-09-01", sales: 100, returns: 0, cancellations: 0, net: 100, profit: 40 }] };
    if (payload.kind === "detail") return { ...base, totals: { net: 100, profit: 40, tickets: 1, returns: 0, cancellations: 0 }, rows: [{ ticket: 1, date: "2026-09-01T18:00:00Z", code: "X1", product: "Producto", category: "TRUPER", cost: 60, wholesale: 0, list_price: 100, discount_percent: 0, unit_price: 100, quantity: 1, returned_quantity: 0, unit: "Pieza", total: 100, user_name: "Admin" }] };
    if (payload.kind === "payments") return { ...base, totals: { cash: 100, card: 0, transfer: 0, credit: 0, total: 100 }, rows: [{ ticket: 1, date: "2026-09-01T18:00:00Z", user_name: "Admin", cash: 100, card: 0, transfer: 0, credit: 0, platform: 0, dollars: 0, other: 0, total: 100 }] };
    if (payload.kind === "inventory") return { ...base, totals: { units: 5, cost: 100, wholesale: 120, public: 165 }, rows: [{ code: "X1", name: "Producto", category: "TRUPER", cost: 20, wholesale: 24, price: 33, stock: 5, min_stock: 1, unit: "Pieza", active: true }] };
    if (payload.kind === "movements") return { ...base, totals: { movements: 1, entries: 0, exits: 1 }, rows: [{ product_id: "p1", created_at: "2026-09-01T18:00:00Z", product_code: "X1", product_name: "Producto", category: "TRUPER", movement_type: "sale", quantity_delta: -1, stock_before: 6, stock_after: 5, user_name: "Admin", description: "Venta Ticket #1" }] };
    return { ...base, totals: { products: 1, quantity: 1, sales: 100 }, rows: [{ code: "X1", product: "Producto", category: "TRUPER", quantity: 1, sales: 100, active: true }] };
  },
};

window.eval(code);
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise((resolve) => setTimeout(resolve, 350));

const saleButton = window.document.getElementById("solrakSaleMenuV0172");
assert(saleButton, "No se restauró el acceso Venta");
assert(saleButton.textContent.trim() === "Venta", "El acceso principal no dice Venta");
assert(window.document.querySelector(".fielMenu").firstElementChild === saleButton, "Venta no quedó como primer acceso");

const mapped = [...window.document.querySelectorAll('[data-solrak-report-kind]')];
assert(mapped.length === 6, `Solo se conectaron ${mapped.length} reportes`);

for (const kind of ["summary", "detail", "payments", "inventory", "movements", "best-sellers"]) {
  const button = window.document.querySelector(`[data-solrak-report-kind="${kind}"]`);
  assert(button, `Falta botón conectado para ${kind}`);
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert(calls.at(-1)?.payload?.kind === kind, `El reporte ${kind} no llamó su endpoint real`);
  assert(!window.document.getElementById("tab-solrak-reports").classList.contains("hidden"), `El panel ${kind} no se mostró`);
}

window.SOLRAKReportsV0172.open("inventory");
await new Promise((resolve) => setTimeout(resolve, 10));
const inventoryCall = calls.at(-1);
assert(inventoryCall.payload.kind === "inventory", "Inventario no usa kind inventory");
assert(!("from" in inventoryCall.payload), "Inventario envió fechas innecesarias");
assert(window.document.getElementById("solrakReportTable").textContent.includes("Producto"), "Inventario no renderizó datos");

saleButton.click();
assert(!window.document.getElementById("tab-pos").classList.contains("hidden"), "Venta no regresó al POS");

console.log("SOLRAK_V0172_REPORTS_SMOKE_OK");