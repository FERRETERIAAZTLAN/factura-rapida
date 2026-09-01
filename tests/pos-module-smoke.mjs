import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("pos-module.js", "utf8");
const dom = new JSDOM(
  `<!doctype html><html><head></head><body>
<main class="shell"><nav class="nav"><button data-tab="factura" class="active">Factura</button></nav><div id="notice"><span></span><button></button></div><section id="tab-factura" class="tab-panel"></section></main>
</body></html>`,
  {
    url: "https://example.test",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  },
);
const { window } = dom;
const calls = [];
window.ANON_KEY = "public-test-key";
window.session = {
  token: "session-test",
  user: { id: "u1", name: "Admin", role: "admin" },
  business: { id: "b1", name: "Negocio" },
};
window.products = [
  {
    id: "p1",
    code: "7501234567890",
    name: "Producto prueba",
    description: "",
    price: 13,
    stock: 8,
    iva: 16,
    price_includes_tax: true,
    unit: "Pieza",
    active: true,
    image_path: null,
  },
];
window.clients = [{ id: "c1", name: "Cliente prueba", rfc: "XAXX010101000" }];
window.esc = (s) => String(s ?? "");
window.money = (n) => "$" + Number(n || 0).toFixed(2);
window.busy = () => {};
window.notice = (text, error = false) => {
  window.__lastNotice = { text, error };
};
window.isAdmin = () => window.session?.user?.role === "admin";
window.switchTab = (tab) => {
  window.document
    .querySelectorAll(".tab-panel")
    .forEach((x) => x.classList.add("hidden"));
  window.document.getElementById("tab-" + tab)?.classList.remove("hidden");
};
window.loadAll = async () => {};
window.confirm = () => true;
window.fetch = async (url, opt = {}) => {
  const body = JSON.parse(opt.body || "{}");
  calls.push({ url: String(url), action: body.action, body });
  let data = { ok: true };
  if (String(url).includes("/pos-api")) {
    if (body.action === "bootstrap")
      data = {
        ok: true,
        registers: [{ id: "r1", code: "CAJA1", name: "Caja 1", active: true }],
        openSession: null,
        openSessions: [],
        recentSales: [],
        supplierCount: 0,
      };
    else if (body.action === "completeSale")
      data = {
        ok: true,
        sale_id: "s1",
        sale_number: 1,
        subtotal: 11.21,
        iva: 1.79,
        total: 13,
        currency: "MXN",
        items: 1,
      };
  } else if (String(url).includes("/supplier-api")) {
    if (body.action === "listSuppliers") data = { ok: true, suppliers: [] };
  }
  return { ok: true, status: 200, json: async () => data };
};

window.eval(code);
await new Promise((r) => setTimeout(r, 1100));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
assert(
  window.document.getElementById("posTabBtn"),
  "No se montó pestaña Punto de venta",
);
assert(
  window.document.getElementById("supplierTabBtn"),
  "No se montó pestaña Proveedores",
);
assert(window.document.getElementById("tab-pos"), "No se montó panel POS");
assert(
  window.document.getElementById("tab-proveedores"),
  "No se montó panel Proveedores",
);
const initialSearch = window.document.getElementById("posSearch");
initialSearch.value = "7501";
initialSearch.dispatchEvent(new window.Event("input", { bubbles: true }));
assert(
  window.document.querySelector('[data-pos-product="p1"]'),
  "No se renderizó producto en POS",
);
assert(
  calls.some((x) => x.action === "bootstrap"),
  "POS no hizo bootstrap",
);
assert(
  calls.some((x) => x.action === "listSuppliers"),
  "Proveedores no cargó",
);
assert(
  !calls.some((x) => x.action === "completeSale"),
  "El POS intentó cobrar automáticamente al iniciar",
);

// Simular caja ya abierta sin llamar backend de escritura.
window.FacturaRapidaPOS.state.openSession = {
  id: "cs1",
  opened_at: new Date().toISOString(),
};
const search = window.document.getElementById("posSearch");
search.value = "7501234567890";
search.dispatchEvent(
  new window.KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  }),
);
assert(
  window.FacturaRapidaPOS.cart.length === 1,
  "Escáner/Enter no agregó producto",
);
assert(
  window.FacturaRapidaPOS.cart[0].id === "p1",
  "Se agregó producto equivocado",
);
assert(
  window.FacturaRapidaPOS.cart[0].qty === 1,
  "Cantidad inicial incorrecta",
);

const tendered = window.document.getElementById("posTendered");
window.document.getElementById("posCharge").click();
tendered.value = "20";
tendered.dispatchEvent(new window.Event("input", { bubbles: true }));
window.document.getElementById("posConfirmCharge").click();
await new Promise((r) => setTimeout(r, 80));
const sales = calls.filter((x) => x.action === "completeSale");
assert(
  sales.length === 1,
  `Se esperaban 1 solicitud de cobro y hubo ${sales.length}`,
);
assert(sales[0].body.cashSessionId === "cs1", "Cobro no usó la caja abierta");
assert(
  sales[0].body.items?.length === 1 &&
    sales[0].body.items[0].product_id === "p1",
  "Payload de producto incorrecto",
);
assert(
  sales[0].body.payments?.[0]?.method === "cash",
  "Forma de pago incorrecta",
);
assert(
  Number(sales[0].body.payments?.[0]?.amount) === 13,
  "Total enviado incorrecto",
);
assert(
  Number(sales[0].body.payments?.[0]?.tendered) === 20,
  "Efectivo recibido incorrecto",
);
assert(
  window.FacturaRapidaPOS.cart.length === 0,
  "Carrito no se limpió tras cobro exitoso",
);
assert(
  window.document
    .getElementById("posReceipt")
    .textContent.includes("Venta #000001"),
  "No se mostró confirmación de venta",
);

console.log(
  "POS_UI_SMOKE_OK tabs=2 scan=ok completeSaleCalls=1 noRealBackendWrites=true",
);
