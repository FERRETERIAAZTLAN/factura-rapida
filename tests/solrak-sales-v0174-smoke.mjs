import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-sales-v0174.js", "utf8");
assert.match(source, /0\.1\.74/);
assert.doesNotMatch(source, /cfdi-api|Finkok|Recargas y Servicios/i);

const dom = new JSDOM(`<!doctype html><html><body><input id="posSearch"></body></html>`, {
  runScripts: "dangerously",
  url: "https://solrak.local/",
});
const { window } = dom;
const input = window.document.getElementById("posSearch");
const notices = [];
window.notice = (message, error) => notices.push({ message, error });
window.products = [
  { id: "p1", code: "ABC-123X", name: "Producto A", stock: 10, active: true, price: 25 },
  { id: "p2", code: "00077", name: "Producto B", stock: 2, active: true, price: 40 },
];
const cart = [];
let rerenders = 0;
input.oninput = () => {};
input.onkeydown = (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const q = event.target.value.trim().toLowerCase();
  const product = window.products.find((p) => String(p.code).toLowerCase() === q);
  if (!product) return;
  const line = cart.find((x) => x.id === product.id);
  if (line) line.qty += 1;
  else cart.push({ ...product, qty: 1 });
  event.target.value = "";
};
window.FacturaRapidaPOS = {
  get cart() { return cart; },
  rerender() { rerenders += 1; },
};

window.eval(source);
assert.equal(window.SOLRAKSalesV0174.version, "0.1.74");
assert.deepEqual(window.SOLRAKSalesV0174.parseQuantityCode("3*ABC-123X"), { qty: 3, code: "ABC-123X" });
assert.deepEqual(window.SOLRAKSalesV0174.parseQuantityCode("2,5 * 00077"), { qty: 2.5, code: "00077" });
assert.equal(window.SOLRAKSalesV0174.parseQuantityCode("ABC-123X"), null);

window.SOLRAKSalesV0174.installQuantityCapture();
input.value = "3*ABC-123X";
input.onkeydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
assert.equal(cart.length, 1);
assert.equal(cart[0].id, "p1");
assert.equal(cart[0].qty, 3);
assert.equal(rerenders, 1);

input.value = "2*abc-123x";
input.onkeydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
assert.equal(cart[0].qty, 5);

input.value = "7*ABC-123X";
input.onkeydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
assert.equal(cart[0].qty, 5);
assert.ok(notices.some((item) => /Existencia insuficiente/.test(item.message)));

input.value = "2*NO-EXISTE";
input.onkeydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
assert.ok(notices.some((item) => /No se encontró el código/.test(item.message)));

console.log("SOLRAK v0.1.74 quantity*code smoke OK");
