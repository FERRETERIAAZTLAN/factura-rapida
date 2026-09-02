(() => {
  "use strict";

  const VERSION = "0.1.91";
  const byId = (id) => document.getElementById(id);
  const pos = () => window.FacturaRapidaPOS || null;
  let scaleTimer = null;
  let lastWeight = null;

  function notice(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK", message);
  }

  function focusSearch() {
    if (window.SOLRAKUXV0190?.focusSearch) return window.SOLRAKUXV0190.focusSearch();
    const input = byId("posSearch");
    if (!input || document.querySelector("dialog[open]")) return false;
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    return true;
  }

  function bridge() {
    const candidates = [window.SOLRAKDesktop, window.solrakDesktop, window.chrome?.webview?.hostObjects?.solrak];
    return candidates.find(Boolean) || null;
  }

  function capabilities() {
    const b = bridge();
    return {
      desktop: !!b,
      printer: !!(b?.printTicket || b?.printer?.printTicket || b?.printRaw),
      scale: !!(b?.scale?.readWeight || b?.readWeight || b?.scale?.connect),
      ports: !!(b?.ports?.list || b?.listPorts),
    };
  }

  async function invoke(path, ...args) {
    const b = bridge();
    if (!b) throw new Error("El puente nativo de SOLRAK no está disponible en este equipo.");
    const parts = path.split(".");
    let owner = b;
    for (let i = 0; i < parts.length - 1; i++) owner = owner?.[parts[i]];
    const fn = owner?.[parts.at(-1)];
    if (typeof fn !== "function") throw new Error(`El instalador de Windows no expone ${path}.`);
    return await fn.apply(owner, args);
  }

  async function listPorts() {
    const caps = capabilities();
    if (!caps.ports) return [];
    try {
      const b = bridge();
      const result = b?.ports?.list ? await invoke("ports.list") : await invoke("listPorts");
      return Array.isArray(result) ? result : [];
    } catch (error) {
      notice(error.message, true);
      return [];
    }
  }

  function normalizeWeight(value) {
    const n = Number(typeof value === "object" ? value?.weight ?? value?.value : value);
    return Number.isFinite(n) ? n : null;
  }

  function publishWeight(weight, unit = "kg") {
    const n = normalizeWeight(weight);
    if (n === null) return false;
    lastWeight = n;
    window.dispatchEvent(new CustomEvent("solrak:scale-weight", { detail: { weight: n, unit, connected: true } }));
    return true;
  }

  async function readScaleOnce() {
    const b = bridge();
    if (!b) return null;
    try {
      const raw = b?.scale?.readWeight ? await invoke("scale.readWeight") : b?.readWeight ? await invoke("readWeight") : null;
      if (raw === null) return null;
      const weight = normalizeWeight(raw);
      if (weight !== null) publishWeight(weight, raw?.unit || "kg");
      return weight;
    } catch {
      return null;
    }
  }

  function startScalePolling(interval = 250) {
    stopScalePolling();
    if (!capabilities().scale) return false;
    scaleTimer = setInterval(readScaleOnce, Math.max(100, Number(interval) || 250));
    readScaleOnce();
    return true;
  }

  function stopScalePolling() {
    if (scaleTimer) clearInterval(scaleTimer);
    scaleTimer = null;
  }

  async function printTicket(payload = {}) {
    const caps = capabilities();
    if (!caps.printer) throw new Error("La impresora térmica requiere el puente nativo del instalador Windows.");
    const exactFolio = String(payload.saleNumber ?? payload.folio ?? "").trim();
    if (!exactFolio) throw new Error("No se puede imprimir un ticket sin folio exacto.");
    const job = {
      ...payload,
      saleNumber: exactFolio,
      barcode: payload.barcode === false ? null : { type: "CODE128", value: exactFolio, humanReadable: true },
    };
    const b = bridge();
    if (b?.printer?.printTicket) return invoke("printer.printTicket", job);
    if (b?.printTicket) return invoke("printTicket", job);
    return invoke("printRaw", job);
  }

  function scanTicketFolio(raw) {
    const value = String(raw || "").trim().replace(/^#/, "");
    if (!/^\d+$/.test(value)) return false;
    const query = byId("fielTicketQuery");
    const action = document.querySelector('[data-fiel-action="ticket-search"]');
    if (!query || !action) return false;
    action.click();
    setTimeout(() => {
      query.value = value;
      query.dispatchEvent(new Event("input", { bubbles: true }));
      byId("fielTicketSearch")?.click();
    }, 0);
    return true;
  }

  function installScannerContract() {
    const input = byId("posSearch");
    if (!input || input.dataset.solrakPeripheral91 === "1") return;
    input.dataset.solrakPeripheral91 = "1";
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const value = String(input.value || "").trim();
      if (!value) return;
      setTimeout(focusSearch, 0);
    });
  }

  function mount() {
    installScannerContract();
    if (capabilities().scale && !scaleTimer) startScalePolling();
  }

  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("beforeunload", stopScalePolling);
  mount();

  window.SOLRAKPeripheralsV0191 = {
    version: VERSION,
    bridge,
    capabilities,
    listPorts,
    printTicket,
    readScaleOnce,
    startScalePolling,
    stopScalePolling,
    publishWeight,
    scanTicketFolio,
    focusSearch,
    get lastWeight() { return lastWeight; },
  };
})();