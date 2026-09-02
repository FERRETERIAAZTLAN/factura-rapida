(() => {
  "use strict";

  const VERSION = "0.2.1-startup-safe";
  const WORKSPACE_ID = "solrakSalesSumaV0201Workspace";
  let observer = null;
  let timer = null;

  function salesSurfaceReady() {
    const tab = document.getElementById("tab-pos");
    if (!tab) return false;
    const top = tab.querySelector(":scope > .frPosTop");
    const oldGrid = tab.querySelector(":scope > .frPosGrid");
    const stack = oldGrid?.querySelector(":scope > .stack");
    const searchCard = stack?.querySelector(":scope > article:first-child");
    const cartCard = stack?.querySelector(":scope > .frPosCartCard");
    const summary = oldGrid?.querySelector(":scope > aside.summary");
    return Boolean(
      top && oldGrid && stack && searchCard && cartCard && summary &&
      document.getElementById("posSearch") &&
      document.getElementById("fielFinishSale")
    );
  }

  function safeMount() {
    const base = window.SOLRAKSalesSumaV0201;
    if (!base || !salesSurfaceReady()) return false;
    return Boolean(base.mount());
  }

  function scheduleMount() {
    if (!salesSurfaceReady() || document.getElementById(WORKSPACE_ID)) return;
    clearTimeout(timer);
    timer = setTimeout(safeMount, 24);
  }

  function boot() {
    const base = window.SOLRAKSalesSumaV0201;
    if (!base) return;

    // v0.2.01 original observa todo el documento y reescribe textContent en cada
    // mutación. Eso puede generar un ciclo infinito de MutationObserver durante
    // el arranque real de WebView. Se desconecta ese observador y se conserva el
    // mismo mount, pero sólo cuando la superficie POS completa realmente existe.
    base.destroy?.();

    observer = new MutationObserver(() => {
      if (document.getElementById(WORKSPACE_ID)) return;
      scheduleMount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (salesSurfaceReady()) safeMount();
  }

  function destroy() {
    observer?.disconnect();
    observer = null;
    clearTimeout(timer);
    timer = null;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.SOLRAKSalesSumaV0201StartupFix = {
    version: VERSION,
    boot,
    destroy,
    salesSurfaceReady,
    safeMount
  };
})();
