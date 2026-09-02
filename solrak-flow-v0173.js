(() => {
  "use strict";

  const VERSION = "0.1.73";
  const STYLE_ID = "solrakFlowV0173Style";
  const byId = (id) => document.getElementById(id);
  let openingPromise = null;
  let retryTimer = null;

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else if (error) console.error(message);
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-fiel="1"] #posCashState,
html[data-solrak-fiel="1"] #posOpenCash,
html[data-solrak-fiel="1"] #posCloseCash{display:none!important}

html[data-solrak-fiel="1"] .fielFinish,
html[data-solrak-fiel="1"] .fielFinish.disabled{
  opacity:1!important;
  background:#f4c400!important;
  color:#fff!important;
  border:0!important;
  box-shadow:0 -1px 0 rgba(0,0,0,.10)!important;
}
html[data-solrak-fiel="1"] .fielFinish:hover{background:#e8b900!important;filter:none!important}
html[data-solrak-fiel="1"] #posConfirmCharge,
html[data-solrak-fiel="1"] #posConfirmCharge:disabled{
  opacity:1!important;
  background:#e97618!important;
  border-color:#e97618!important;
  color:#fff!important;
}

@media(min-width:700px){
  html[data-solrak-fiel="1"] dialog.fielDialog,
  html[data-solrak-fiel="1"] #posPayDialog.frPosDialog{
    position:fixed!important;
    left:var(--fiel-side,246px)!important;
    top:var(--fiel-top,58px)!important;
    right:0!important;
    bottom:0!important;
    width:calc(100vw - var(--fiel-side,246px))!important;
    max-width:none!important;
    height:calc(100vh - var(--fiel-top,58px))!important;
    max-height:none!important;
    margin:0!important;
    border-radius:0!important;
    box-shadow:none!important;
  }
  html[data-solrak-fiel="1"] dialog.fielDialog[open],
  html[data-solrak-fiel="1"] #posPayDialog.frPosDialog[open]{
    display:flex!important;
    flex-direction:column!important;
  }
  html[data-solrak-fiel="1"] dialog.fielDialog .fielDialogBody{
    flex:1!important;
    min-height:0!important;
    max-height:none!important;
    overflow:auto!important;
  }
  html[data-solrak-fiel="1"] #fielConfigDialog .fielConfigPanel.active{
    flex:1!important;
    min-height:0!important;
    overflow:auto!important;
  }
  html[data-solrak-fiel="1"] #posPayDialog .frPayBody{
    flex:1!important;
    min-height:0!important;
    overflow:auto!important;
  }
}

@media(max-width:699px){
  dialog.fielDialog,
  #posPayDialog.frPosDialog{
    position:fixed!important;
    inset:0!important;
    width:100vw!important;
    max-width:none!important;
    height:100dvh!important;
    max-height:none!important;
    margin:0!important;
    border-radius:0!important;
  }
  dialog.fielDialog[open],#posPayDialog.frPosDialog[open]{display:flex!important;flex-direction:column!important}
  dialog.fielDialog .fielDialogBody,#posPayDialog .frPayBody{flex:1!important;min-height:0!important;max-height:none!important;overflow:auto!important}
}

#fielCashMovementDialog .fielDialogBody{align-content:start}
#fielCashMovementDialog .fielFormGrid{max-width:760px;width:100%;margin:18px auto 0}
#fielCashMovementDialog .fielDialogFoot{max-width:760px;width:100%;margin:22px auto 0}
`;
    document.head.appendChild(style);
  }

  async function ensureAutomaticCashSession(options = {}) {
    const pos = window.FacturaRapidaPOS;
    if (!pos?.api) return null;
    const state = pos.state || {};
    if (state.openSession) return state.openSession;
    if (!Array.isArray(state.registers) || !state.registers.length) return null;
    if (openingPromise) return openingPromise;

    openingPromise = (async () => {
      const registerId = state.registers[0]?.id || null;
      const result = await pos.api("openCash", {
        registerId,
        openingAmount: 0,
      });
      if (typeof pos.refresh === "function") await pos.refresh();
      return result?.session || pos.state?.openSession || null;
    })();

    try {
      return await openingPromise;
    } catch (error) {
      if (!options.silent) notify(error?.message || "No se pudo preparar la operación de caja.", true);
      return null;
    } finally {
      openingPromise = null;
    }
  }

  function configureCashMovement(action) {
    const title = byId("fielCashMovementTitle");
    const type = byId("fielCashMovementType");
    const concept = byId("fielCashConcept");
    const amount = byId("fielCashAmount");
    if (!type) return;

    if (action === "cash-in") {
      type.value = "deposit";
      if (title) title.textContent = "Entrada · Fondo / depósito";
      if (concept) concept.placeholder = "Ej. Fondo inicial, efectivo agregado";
    } else if (action === "cash-out") {
      type.value = "withdrawal";
      if (title) title.textContent = "Salida · Retiro / ganancias";
      if (concept) concept.placeholder = "Ej. Retiro de ganancias, efectivo retirado";
    }
    if (amount) amount.placeholder = "0.00";
  }

  async function interceptAction(event) {
    const button = event.target?.closest?.("[data-fiel-action],#fielFinishSale");
    if (!button) return;

    if (button.id === "fielFinishSale") {
      const cart = window.FacturaRapidaPOS?.cart || [];
      if (!cart.length) return;
      if (window.FacturaRapidaPOS?.state?.openSession) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const open = await ensureAutomaticCashSession();
      if (open) {
        window.SOLRAKSumaproFielV0171?.openTab?.("pos");
        window.FacturaRapidaPOS?.openPayment?.();
      }
      return;
    }

    const action = button.dataset.fielAction;
    if (action !== "cash-in" && action !== "cash-out") return;

    if (button.dataset.solrakAutoSessionReady === "1") {
      setTimeout(() => configureCashMovement(action), 0);
      return;
    }

    if (!window.FacturaRapidaPOS?.state?.openSession) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const open = await ensureAutomaticCashSession();
      if (!open) return;
      button.dataset.solrakAutoSessionReady = "1";
      button.click();
      delete button.dataset.solrakAutoSessionReady;
      setTimeout(() => configureCashMovement(action), 0);
      return;
    }

    setTimeout(() => configureCashMovement(action), 0);
  }

  function keepFinishSolid() {
    const finish = byId("fielFinishSale");
    if (!finish) return;
    finish.style.opacity = "1";
  }

  async function prepareContinuousOperation() {
    injectStyle();
    keepFinishSolid();
    const pos = window.FacturaRapidaPOS;
    const state = pos?.state || {};
    if (pos?.api && Array.isArray(state.registers) && state.registers.length && !state.openSession)
      await ensureAutomaticCashSession({ silent: true });
  }

  function schedulePrepare() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => prepareContinuousOperation(), 80);
  }

  function boot() {
    injectStyle();
    document.addEventListener("click", interceptAction, true);
    document.addEventListener("solrak:pos-sale-complete", schedulePrepare);
    new MutationObserver(schedulePrepare).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    setInterval(() => prepareContinuousOperation(), 1600);
    setTimeout(prepareContinuousOperation, 250);
    setTimeout(prepareContinuousOperation, 1000);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKFlowV0173 = {
    version: VERSION,
    ensureAutomaticCashSession,
    configureCashMovement,
    prepareContinuousOperation,
  };
})();
