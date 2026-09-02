(() => {
  "use strict";

  const VERSION = "0.2.1-load-gate";
  const MODULES = Object.freeze([
    "solrak-sales-suma-v0201.js",
    "solrak-sales-suma-v0201-tune.js",
    "solrak-sales-suma-v0201-startup-fix.js"
  ]);
  let started = false;
  let timer = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-solrak-loaded-src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.solrakLoadedSrc = src;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
      (document.body || document.documentElement).appendChild(script);
    });
  }

  async function loadSales() {
    if (started) return;
    started = true;
    try {
      for (const src of MODULES) await loadScript(src);
      document.documentElement.dataset.solrakSales201Loaded = "1";
      document.dispatchEvent(new CustomEvent("solrak:sales-v0201-loaded"));
    } catch (error) {
      started = false;
      console.error("SOLRAK ventas v0.2.01 no pudo cargarse después del arranque", error);
    }
  }

  function scheduleAfterLoad() {
    if (started || timer) return;
    // Se deja terminar por completo el evento load y los inicializadores de login.
    // La capa visual de VENTAS no participa en DOMContentLoaded ni puede bloquear
    // PAGE_LOAD Finished / LOGIN_UI_READY del WebView real.
    timer = setTimeout(() => {
      timer = null;
      loadSales();
    }, 75);
  }

  function boot() {
    if (document.readyState === "complete") scheduleAfterLoad();
    else window.addEventListener("load", scheduleAfterLoad, { once: true });
  }

  function destroy() {
    clearTimeout(timer);
    timer = null;
  }

  boot();

  window.SOLRAKSalesSumaV0201Loader = {
    version: VERSION,
    modules: MODULES,
    loadSales,
    scheduleAfterLoad,
    destroy
  };
})();
