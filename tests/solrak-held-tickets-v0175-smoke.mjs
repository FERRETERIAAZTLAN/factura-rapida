import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-held-tickets-v0175.js", "utf8");
assert.match(source, /0\.1\.75/);
assert.match(source, /MAX_TICKETS = 8/);
assert.doesNotMatch(source, /cfdi-api|Finkok|Recargas y Servicios/i);

const dom = new JSDOM(
  `<!doctype html><html><body><button id="posNewTicket">Nuevo ticket</button></body></html>`,
  { runScripts: "dangerously", url: "https://solrak.local/" },
);
const { window } = dom;
window.session = {
  business: { code: "AZTLAN" },
  user: { id: "user-1", username: "admin" },
};
window.products = [
  { id: "p1", code: "ABC", name: "Producto A", stock: 20, active: true, price: 10, unit: "Pieza", iva: 16 },
];
const tickets = [{ id: 1, cart: [], clientId: "" }];
let active = 1;
let rerenders = 0;
let refreshes = 0;
const notices = [];
window.notice = (message, error) => notices.push({ message, error });
window.FacturaRapidaPOS = {
  get tickets() { return tickets; },
  get activeTicketId() { return active; },
  switchTicket(id) { active = id; },
  rerender() { rerenders += 1; },
  refresh() { refreshes += 1; return Promise.resolve(); },
  newTicket() { throw new Error("La función base de 7 tickets no debe ejecutarse"); },
};

window.eval(source);
window.clearInterval(1);
assert.equal(window.SOLRAKHeldTicketsV0175.version, "0.1.75");
assert.equal(window.SOLRAKHeldTicketsV0175.maxTickets, 8);
assert.match(window.SOLRAKHeldTicketsV0175.storageKey(), /AZTLAN:user-1/);
window.SOLRAKHeldTicketsV0175.install();

for (let i = 0; i < 7; i += 1) {
  assert.equal(window.SOLRAKHeldTicketsV0175.newTicket(), true);
}
assert.equal(tickets.length, 8);
assert.deepEqual(tickets.map((t) => t.id), [1, 2, 3, 4, 5, 6, 7, 8]);
assert.equal(active, 8);
assert.equal(window.document.getElementById("posNewTicket").disabled, true);
assert.equal(window.SOLRAKHeldTicketsV0175.newTicket(), false);
assert.ok(notices.some((item) => /hasta 8 tickets/i.test(item.message)));

const activeTicket = tickets.find((ticket) => ticket.id === 8);
activeTicket.clientId = "cliente-7";
activeTicket.cart.push({ ...window.products[0], qty: 3 });
activeTicket.cart.push({
  id: "common-1",
  custom: true,
  name: "Bolsa",
  code: "",
  unit: "Pieza",
  qty: 2,
  cost: 0,
  price: 1.5,
  wholesale: 0,
  stock: Number.MAX_SAFE_INTEGER,
  iva: 16,
  price_includes_tax: true,
});
assert.equal(window.SOLRAKHeldTicketsV0175.persist(), true);
const savedRaw = window.localStorage.getItem(window.SOLRAKHeldTicketsV0175.storageKey());
assert.ok(savedRaw);
assert.doesNotMatch(savedRaw, /token|pin|password/i);
const saved = JSON.parse(savedRaw);
assert.equal(saved.tickets.length, 8);
assert.equal(saved.activeTicketId, 8);
assert.equal(saved.tickets[7].clientId, "cliente-7");
assert.equal(saved.tickets[7].cart[0].productId, "p1");
assert.equal(saved.tickets[7].cart[1].custom, true);

// Simula reinicio: el POS vuelve a su ticket vacío inicial y el módulo recupera lo guardado.
tickets.splice(0, tickets.length, { id: 1, cart: [], clientId: "" });
active = 1;
assert.equal(window.SOLRAKHeldTicketsV0175.restore(), true);
assert.equal(tickets.length, 8);
assert.equal(active, 8);
const restored = tickets.find((ticket) => ticket.id === 8);
assert.equal(restored.clientId, "cliente-7");
assert.equal(restored.cart.length, 2);
assert.equal(restored.cart[0].id, "p1");
assert.equal(restored.cart[0].qty, 3);
assert.equal(restored.cart[0].price, 10);
assert.equal(restored.cart[1].custom, true);
assert.equal(restored.cart[1].name, "Bolsa");
assert.ok(rerenders > 0);
assert.ok(refreshes > 0);

console.log("SOLRAK v0.1.75 held tickets / 8 tickets smoke OK");