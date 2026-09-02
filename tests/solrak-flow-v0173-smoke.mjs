import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-flow-v0173.js", "utf8");
assert.match(source, /0\.1\.73/);
assert.doesNotMatch(source, /Recargas y Servicios/i);
assert.doesNotMatch(source, /cfdi-api|finkok/i);

const dom = new JSDOM(`<!doctype html><html data-solrak-fiel="1"><head></head><body>
  <button id="fielFinishSale" class="fielFinish disabled">Finalizar venta</button>
  <span id="posCashState">Caja cerrada</span>
  <button id="posOpenCash">Abrir caja</button>
  <button id="posCloseCash">Cerrar caja</button>
  <button id="cashIn" data-fiel-action="cash-in">Entrada</button>
  <button id="cashOut" data-fiel-action="cash-out">Salida</button>
  <button data-fiel-action="shifts">Turnos</button>
  <button data-fiel-action="cash-cut">Corte</button>
  <input id="fielCashConcept"><input id="fielCashReference">
  <dialog id="fielCashMovementDialog" class="fielDialog small"><div class="fielDialogHead"></div><div class="fielDialogBody"></div></dialog>
  <dialog id="posPayDialog" class="frPosDialog frPayDialog"><div class="frPayHead"></div><div class="frPayBody"></div></dialog>
</body></html>`, {
  runScripts: "dangerously",
  url: "https://solrak.local/",
});

const { window } = dom;
let openCashCalls = 0;
let originalPaymentCalls = 0;
let cashInCalls = 0;
let cashOutCalls = 0;
let rerenders = 0;
const state = {
  registers: [{ id: "register-1", name: "Caja 1" }],
  openSession: null,
  openSessions: [],
};

window.notice = (message, error) => {
  if (error) throw new Error(message);
};
window.FacturaRapidaPOS = {
  state,
  cart: [{ id: "p1", qty: 1 }],
  async api(action, payload) {
    assert.equal(action, "openCash");
    assert.equal(payload.registerId, "register-1");
    assert.equal(payload.openingAmount, 0);
    openCashCalls += 1;
    return {
      ok: true,
      session: {
        id: "session-auto",
        register_id: "register-1",
        status: "open",
      },
    };
  },
  async refresh() {},
  rerender() {
    rerenders += 1;
  },
  openPayment() {
    assert.ok(state.openSession?.id, "La venta debe tener sesión operativa interna antes de cobrar");
    originalPaymentCalls += 1;
  },
};

window.document.querySelector('[data-fiel-action="cash-in"]').onclick = () => {
  assert.ok(state.openSession?.id);
  cashInCalls += 1;
};
window.document.querySelector('[data-fiel-action="cash-out"]').onclick = () => {
  assert.ok(state.openSession?.id);
  cashOutCalls += 1;
};

window.eval(source);
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise((resolve) => setTimeout(resolve, 60));

assert.equal(window.SOLRAKFlowV0173.version, "0.1.73");
const style = window.document.getElementById("solrakFlowV0173Style")?.textContent || "";
assert.match(style, /height:100vh!important/);
assert.match(style, /#posCashState,#posOpenCash,#posCloseCash/);
assert.match(style, /background:#f4c400!important/);
assert.equal(window.document.getElementById("fielFinishSale").style.opacity, "1");

await window.FacturaRapidaPOS.openPayment();
assert.equal(openCashCalls, 1, "La sesión operativa interna debe prepararse una sola vez");
assert.equal(originalPaymentCalls, 1, "Debe abrir el cobro sin pedir Abrir caja");
assert.equal(state.openSession.id, "session-auto");
assert.ok(rerenders >= 1);

state.openSession = null;
state.openSessions = [{ id: "shared-session", register_id: "register-1", status: "open" }];
window.document.getElementById("cashIn").click();
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(cashInCalls, 1);
assert.equal(openCashCalls, 1, "Entrada debe adoptar una sesión existente sin abrir otra");
assert.match(window.document.getElementById("fielCashConcept").placeholder, /Fondo inicial/);

state.openSession = null;
window.document.getElementById("cashOut").click();
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(cashOutCalls, 1);
assert.match(window.document.getElementById("fielCashConcept").placeholder, /Retiro de ganancia/);

window.close();
console.log("SOLRAK_V0173_FLOW_SMOKE_OK");
