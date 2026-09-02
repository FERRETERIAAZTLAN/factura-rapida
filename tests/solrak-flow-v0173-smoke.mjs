import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-flow-v0173.js", "utf8");
assert.match(source, /0\.1\.73/);
assert.doesNotMatch(source, /Recargas y Servicios/i);
assert.doesNotMatch(source, /cfdi-api|finkok/i);
assert.match(source, /bindCashAction\("cash-in", "deposit"\)/);
assert.match(source, /bindCashAction\("cash-out", "withdrawal"\)/);

const dom = new JSDOM(`<!doctype html><html data-solrak-fiel="1"><head></head><body>
  <button id="fielFinishSale" class="fielFinish disabled">Finalizar venta</button>
  <span id="posCashState">Caja cerrada</span>
  <button id="posOpenCash">Abrir caja</button><button id="posCloseCash">Cerrar caja</button>
  <button id="cashIn" data-fiel-action="cash-in">Entrada</button><button id="cashOut" data-fiel-action="cash-out">Salida</button>
  <button data-fiel-action="shifts">Turnos</button><button id="cashCut" data-fiel-action="cash-cut">Corte</button>
  <span id="fielCashMovementTitle"></span><input id="fielCashMovementType"><input id="fielCashConcept"><input id="fielCashReference">
  <dialog id="fielCashMovementDialog" class="fielDialog small"><div class="fielDialogHead"></div><div class="fielDialogBody"></div></dialog>
  <dialog id="posPayDialog" class="frPosDialog frPayDialog"><div class="frPayHead"></div><div class="frPayBody"></div></dialog>
</body></html>`, { runScripts: "dangerously", url: "https://solrak.local/" });

const { window } = dom;
let openCashCalls = 0, originalPaymentCalls = 0, cashInCalls = 0, cashOutCalls = 0;
const state = { registers: [{ id: "register-1", name: "Caja 1" }], openSession: null, openSessions: [] };
window.notice = (message, error) => { if (error) throw new Error(message); };
window.FacturaRapidaPOS = {
  state, cart: [{ id: "p1", qty: 1 }],
  async api(action, payload) { assert.equal(action, "openCash"); assert.equal(payload.registerId, "register-1"); assert.equal(payload.openingAmount, 0); openCashCalls += 1; return { ok: true, session: { id: "session-auto", register_id: "register-1", status: "open" } }; },
  async refresh() {}, rerender() {}, openPayment() { assert.ok(state.openSession?.id); originalPaymentCalls += 1; },
};
window.document.querySelector('[data-fiel-action="cash-in"]').onclick = () => { assert.ok(state.openSession?.id); cashInCalls += 1; };
window.document.querySelector('[data-fiel-action="cash-out"]').onclick = () => { assert.ok(state.openSession?.id); cashOutCalls += 1; };

window.eval(source); window.document.dispatchEvent(new window.Event("DOMContentLoaded")); await new Promise((resolve) => setTimeout(resolve, 60));
const style = window.document.getElementById("solrakFlowV0173Style")?.textContent || "";
assert.match(style, /height:100vh!important/); assert.match(style, /background:#f4c400!important/);
assert.doesNotMatch(style, /\[data-fiel-action="cash-cut"\]\{display:none/);
assert.equal(window.document.getElementById("fielFinishSale").style.opacity, "1");

await window.FacturaRapidaPOS.openPayment(); assert.equal(openCashCalls, 1); assert.equal(originalPaymentCalls, 1);
state.openSession = null; state.openSessions = [{ id: "shared-session", register_id: "register-1", status: "open" }];
window.document.getElementById("cashIn").click(); await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(cashInCalls, 1); assert.equal(window.document.getElementById("fielCashMovementType").value, "deposit"); assert.match(window.document.getElementById("fielCashMovementTitle").textContent, /Fondo/);
state.openSession = null; window.document.getElementById("cashOut").click(); await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(cashOutCalls, 1); assert.equal(window.document.getElementById("fielCashMovementType").value, "withdrawal"); assert.match(window.document.getElementById("fielCashMovementTitle").textContent, /ganancias/);
assert.ok(window.document.getElementById("cashCut"), "Corte de Caja debe seguir disponible");
window.close(); console.log("SOLRAK_V0173_FLOW_SMOKE_OK");