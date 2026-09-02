import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-inventory-v0175.js", "utf8");
assert.match(source, /0\.1\.75/);
assert.match(source, /inventory-api/);
assert.match(source, /Entrada de Mercancía/);
assert.match(source, /Mermas \/ Ajustes/);
assert.match(source, /promedio ponderado/i);
assert.doesNotMatch(source, /cfdi-api|Finkok|Recargas y Servicios/i);

const dom = new JSDOM(`<!doctype html><html><body><div data-fiel-submenu="products"><button data-fiel-action="low-stock">Inventario Bajo</button></div></body></html>`, {
  runScripts: "dangerously",
  url: "https://solrak.local/",
});
const { window } = dom;
window.ANON_KEY = "test-anon";
window.session = { token: "test-session" };
window.products = [
  { id: "p1", code: "ABC1", name: "Producto Uno", stock: 10, cost: 20, active: true },
  { id: "p2", code: "XYZ2", name: "Producto Dos", stock: 4, cost: 8.5, active: true },
];
window.notice = () => {};
window.FacturaRapidaPOS = { refresh: async () => {} };
const calls = [];
window.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  calls.push({ url, body, headers: options.headers });
  let payload = { ok: true };
  if (body.action === "listSuppliers") payload = { ok: true, suppliers: [{ id: "s1", name: "Proveedor Uno" }] };
  if (body.action === "receivePurchase") payload = { ok: true, order_number: 7, subtotal: 20, iva: 3.2, total: 23.2 };
  if (body.action === "adjustStock") payload = { ok: true, stock_before: 10, stock_after: 9, quantity_delta: -1 };
  return { ok: true, async json() { return payload; } };
};

window.eval(source);
await new Promise((resolve) => setTimeout(resolve, 140));
assert.equal(window.SOLRAKInventoryV0175.version, "0.1.75");
assert.ok(window.document.querySelector('[data-solrak-inventory="purchase"]'));
assert.ok(window.document.querySelector('[data-solrak-inventory="adjustment"]'));
assert.ok(window.document.getElementById("solrakPurchaseDialog"));
assert.ok(window.document.getElementById("solrakAdjustDialog"));

window.SOLRAKInventoryV0175.openPurchaseEntry();
await new Promise((resolve) => setTimeout(resolve, 0));
const supplier = window.document.getElementById("solrakPurchaseSupplier");
supplier.value = "s1";
const product = window.document.getElementById("solrakPurchaseProduct");
product.value = "p1";
window.document.getElementById("solrakPurchaseQty").value = "2";
window.document.getElementById("solrakPurchaseCost").value = "10";
window.document.getElementById("solrakPurchaseIva").value = "16";
window.document.getElementById("solrakPurchaseAdd").click();
assert.match(window.document.getElementById("solrakPurchaseTotals").textContent, /23\.20|23,20/);
window.document.getElementById("solrakPurchaseSave").click();
await new Promise((resolve) => setTimeout(resolve, 10));
const purchaseCall = calls.find((call) => call.body.action === "receivePurchase");
assert.ok(purchaseCall);
assert.equal(purchaseCall.body.supplierId, "s1");
assert.equal(purchaseCall.body.items.length, 1);
assert.equal(purchaseCall.body.items[0].productId, "p1");
assert.equal(purchaseCall.body.items[0].qty, 2);
assert.equal(purchaseCall.body.items[0].unitCost, 10);

window.SOLRAKInventoryV0175.openAdjustment(-1);
const adjustmentProduct = window.document.getElementById("solrakAdjustProduct");
adjustmentProduct.value = "p1";
window.document.getElementById("solrakAdjustQty").value = "1";
window.document.getElementById("solrakAdjustReason").value = "Producto dañado";
window.document.getElementById("solrakAdjustSave").click();
await new Promise((resolve) => setTimeout(resolve, 10));
const adjustmentCall = calls.find((call) => call.body.action === "adjustStock");
assert.ok(adjustmentCall);
assert.equal(adjustmentCall.body.productId, "p1");
assert.equal(adjustmentCall.body.quantityDelta, -1);
assert.equal(adjustmentCall.body.reason, "Producto dañado");

assert.ok(calls.every((call) => call.headers["x-session-token"] === "test-session"));
console.log("SOLRAK v0.1.75 inventory warehouse smoke OK");
