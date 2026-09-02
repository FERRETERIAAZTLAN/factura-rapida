import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-price-verifier-v0177.js", "utf8");
assert.match(source, /0\.1\.77/);
assert.match(source, /Agregar al ticket actual/);
assert.match(source, /description/);
assert.doesNotMatch(source, /cfdi-api|finkok|recargas y servicios/i);

const dom = new JSDOM(`<!doctype html><html><body>
<input id="fielPriceQuery">
<button id="fielPriceSearch">Buscar</button>
<div id="fielPriceResult"></div>
<input id="posSearch">
</body></html>`, { runScripts: "dangerously", url: "https://solrak.local/" });

const { window } = dom;
const products = [
  {
    id: "p1",
    code: "ABC-123X",
    name: "Llave de prueba",
    description: "Llave cromada para prueba",
    price: 99.5,
    wholesale: 88,
    stock: 7,
    unit: "Pieza",
    category: "Herramientas",
    image_path: "AZTLAN/ABC-123X.jpg",
    active: true,
  },
  {
    id: "p2",
    code: "SIN-STOCK",
    name: "Producto agotado",
    description: "Sin existencia",
    price: 10,
    wholesale: 0,
    stock: 0,
    unit: "Pieza",
    active: true,
  },
  { id: "p3", code: "INACTIVO", name: "No visible", active: false, stock: 5, price: 20 },
];
window.products = products;
const cart = [];
const notices = [];
window.notice = (message, error = false) => notices.push({ message, error });
window.FacturaRapidaPOS = {
  get cart() { return cart; },
  get state() { return { settings: { allow_negative_stock: false } }; },
  rerender() {},
};

const posSearch = window.document.getElementById("posSearch");
posSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const q = String(posSearch.value || "").trim().toLowerCase();
  const product = products.find((item) => item.active !== false && (String(item.code).toLowerCase() === q || String(item.name).toLowerCase() === q));
  if (!product || Number(product.stock) <= 0) return;
  const line = cart.find((item) => item.id === product.id);
  if (line) line.qty += 1;
  else cart.push({ ...product, qty: 1 });
});

window.eval(source);
assert.equal(window.SOLRAKPriceVerifierV0177.version, "0.1.77");
window.SOLRAKPriceVerifierV0177.bind();

assert.equal(window.SOLRAKPriceVerifierV0177.findProduct("ABC-123X")?.id, "p1");
assert.equal(window.SOLRAKPriceVerifierV0177.findProduct("abc-123x")?.id, "p1");
assert.equal(window.SOLRAKPriceVerifierV0177.findProduct("llave de prueba")?.id, "p1");
assert.equal(window.SOLRAKPriceVerifierV0177.findProduct("cromada")?.id, "p1");
assert.equal(window.SOLRAKPriceVerifierV0177.findProduct("INACTIVO"), null);

const query = window.document.getElementById("fielPriceQuery");
query.value = "ABC-123X";
window.SOLRAKPriceVerifierV0177.render();
const result = window.document.getElementById("fielPriceResult");
assert.match(result.textContent, /Llave de prueba/);
assert.match(result.textContent, /Llave cromada para prueba/);
assert.match(result.textContent, /\$99\.50/);
assert.match(result.textContent, /7 Pieza/);
assert.ok(result.querySelector("img")?.src.includes("product-images/AZTLAN/ABC-123X.jpg"));
const add = window.document.getElementById("solrakPriceAddV0177");
assert.ok(add);
assert.equal(add.disabled, false);
add.click();
assert.equal(cart.length, 1);
assert.equal(cart[0].id, "p1");
assert.equal(cart[0].qty, 1);
assert.ok(notices.some((item) => /agregado al ticket/i.test(item.message)));

query.value = "SIN-STOCK";
window.SOLRAKPriceVerifierV0177.render();
assert.equal(window.document.getElementById("solrakPriceAddV0177").disabled, true);
assert.match(result.textContent, /Sin existencia/);

query.value = "no existe";
window.SOLRAKPriceVerifierV0177.render();
assert.match(result.textContent, /No encontré un producto activo/);

window.close();
console.log("SOLRAK v0.1.77 price verifier smoke OK");