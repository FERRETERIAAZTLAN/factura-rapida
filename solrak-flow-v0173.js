(() => {
  "use strict";

  const VERSION = "0.1.73";
  const STYLE_ID = "solrakFlowV0173Style";
  const BOUND = "solrakFlowV0173Bound";
  let ensurePromise = null;
  let syncTimer = null;

  const byId = (id) => document.getElementById(id);

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else if (error && typeof window.alert === "function") window.SOLRAKDialog?.notice?.(message,{error:true});
  }

  function pos() {
    return window.FacturaRapidaPOS || null;
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
/* v0.1.73: el usuario no abre/cierra caja para poder vender. */
#posCashState,#posOpenCash,#posCloseCash,[data-fiel-action="shifts"]{display:none!important}
/* Finalizar venta siempre es un control sólido y visible. */
#fielFinishSale,.fielFinish,.fielFinish.disabled{opacity:1!important;visibility:visible!important;background:#f4c400!important;color:#fff!important;box-shadow:0 -2px 8px rgba(0,0,0,.16)!important;filter:none!important}
#fielFinishSale:hover,.fielFinish:hover{background:#e8b900!important;filter:none!important}
#posConfirmCharge,#posConfirmCharge:disabled{opacity:1!important;background:#e97618!important;border-color:#e97618!important;color:#fff!important}
/* Cualquier ventana funcional se abre a pantalla completa. */
dialog.fielDialog,dialog.fielDialog.small,dialog.fielDialog.wide,dialog.frPosDialog,dialog.frPosDialog.frPayDialog{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-sizing:border-box!important}
dialog.fielDialog::backdrop,dialog.frPosDialog::backdrop{background:rgba(20,23,26,.72)!important}
dialog.fielDialog .fielDialogBody{max-height:calc(100vh - 40px)!important;height:calc(100vh - 40px);overflow:auto!important;box-sizing:border-box!important}
dialog.fielDialog #fielConfigDevices.fielConfigPanel.active,dialog.fielDialog #fielConfigTicket.fielConfigPanel.active,dialog.fielDialog #fielConfigBackups.fielConfigPanel.active,dialog.fielDialog #fielConfigOther.fielConfigPanel.active{height:calc(100vh - 84px)!important;max-height:none!important;overflow:auto!important;box-sizing:border-box!important}
dialog.frPosDialog .frPayBody{height:calc(100vh - 42px)!important;max-height:none!important;overflow:auto!important;box-sizing:border-box!important}
html[data-solrak-fiel="1"] #tab-solrak-reports,html[data-solrak-fiel="1"] .tab-panel:not(#tab-pos){min-height:calc(100vh - var(--fiel-top,58px))!important;max-width:none!important;box-sizing:border-box!important}
`;
    document.head.appendChild(style);
  }

  function adoptOpenSession() {
    const api = pos();
    if (!api?.state) return null;
    if (api.state.openSession) return api.state.openSession;
    const shared = Array.isArray(api.state.openSessions)
      ? api.state.openSessions.find((item) => item?.id && item?.status !== "closed")
      : null;
    if (shared) {
      api.state.openSession = shared;
      api.rerender?.();
      return shared;
    }
    return null;
  }

  async function ensureOperationalSession() {
    const api = pos();
    if (!api?.api) throw new Error("El punto de venta todavía no está listo.");
    const existing = adoptOpenSession();
    if (existing) return existing;
    if (ensurePromise) return ensurePromise;

    ensurePromise = (async () => {
      let current = pos();
      if (!current?.state?.registers?.length) {
        await current?.refresh?.();
        current = pos();
      }

      const adopted = adoptOpenSession();
      if (adopted) return adopted;

      const register = current?.state?.registers?.[0];
      if (!register?.id)
        throw new Error("No hay una caja operativa configurada para registrar la venta.");

      try {
        const result = await current.api("openCash", {
          registerId: register.id,
          openingAmount: 0,
        });
        const session = result?.session || null;
        if (!session?.id)
          throw new Error("No se pudo preparar la operación de caja.");
        current.state.openSession = session;
        if (!Array.isArray(current.state.openSessions)) current.state.openSessions = [];
        if (!current.state.openSessions.some((item) => item?.id === session.id))
          current.state.openSessions.unshift(session);
        current.rerender?.();
        return session;
      } catch (error) {
        await current.refresh?.();
        const shared = adoptOpenSession();
        if (shared) return shared;
        throw error;
      }
    })().finally(() => {
      ensurePromise = null;
    });

    return ensurePromise;
  }

  function bindOpenPayment() {
    const api = pos();
    if (!api || api[BOUND]) return;
    if (typeof api.openPayment !== "function") return;
    const original = api.openPayment.bind(api);
    api.openPayment = async function solrakOpenPaymentV0173() {
      try {
        await ensureOperationalSession();
        return original();
      } catch (error) {
        notify(error?.message || "No se pudo preparar la venta.", true);
      }
    };
    api[BOUND] = true;
  }

  function setMovementCopy(type) {
    const title = byId("fielCashMovementTitle");
    const hiddenType = byId("fielCashMovementType");
    const concept = byId("fielCashConcept");
    const reference = byId("fielCashReference");
    if (hiddenType) hiddenType.value = type;
    if (type === "deposit") {
      if (title) title.textContent = "Entrada · Fondo / depósito";
      if (concept) concept.placeholder = "Ej. Fondo inicial, depósito o efectivo agregado";
    } else {
      if (title) title.textContent = "Salida · Retiro / ganancias";
      if (concept) concept.placeholder = "Ej. Retiro de ganancias, efectivo retirado o pago";
    }
    if (reference) reference.placeholder = "Referencia opcional";
  }

  function bindCashAction(action, type) {
    const button = document.querySelector(`[data-fiel-action="${action}"]`);
    if (!button || button.dataset.solrakFlow173 === "1") return;
    const original = button.onclick;
    if (typeof original !== "function") return;
    button.dataset.solrakFlow173 = "1";
    button.onclick = async function solrakCashActionV0173(event) {
      event?.preventDefault?.();
      try {
        await ensureOperationalSession();
        original.call(this, event);
        setTimeout(() => setMovementCopy(type), 0);
      } catch (error) {
        notify(error?.message || "No se pudo registrar el movimiento.", true);
      }
    };
  }

  function polishFinishButton() {
    const button = byId("fielFinishSale");
    if (!button) return;
    button.style.opacity = "1";
    button.style.visibility = "visible";
    button.setAttribute("aria-disabled", "false");
    const cart = pos()?.cart || [];
    if (cart.length) button.classList.remove("disabled");
  }

  function hideLegacyCashControls() {
    ["posCashState", "posOpenCash", "posCloseCash"].forEach((id) => {
      const element = byId(id);
      if (element) element.setAttribute("aria-hidden", "true");
    });
  }

  function sync() {
    injectStyle();
    bindOpenPayment();
    bindCashAction("cash-in", "deposit");
    bindCashAction("cash-out", "withdrawal");
    polishFinishButton();
    hideLegacyCashControls();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 20);
  }

  function boot() {
    sync();
    new MutationObserver(scheduleSync).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "open"],
    });
    document.addEventListener("solrak:pos-sale-complete", () =>
      setTimeout(sync, 0),
    );
    setInterval(sync, 1000);
    setTimeout(sync, 250);
    setTimeout(sync, 900);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKFlowV0173 = {
    version: VERSION,
    ensureOperationalSession,
    sync,
  };
})();