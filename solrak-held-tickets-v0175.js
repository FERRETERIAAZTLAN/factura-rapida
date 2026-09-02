(() => {
  "use strict";

  const VERSION = "0.1.75";
  const MAX_TICKETS = 8;
  const STORAGE_PREFIX = "solrak:held-tickets:v0175";
  const INSTALL_MARK = "solrakHeldV0175";

  function byId(id) {
    return document.getElementById(id);
  }

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else if (error && typeof window.alert === "function") window.alert(message);
  }

  function pos() {
    return window.FacturaRapidaPOS || null;
  }

  function currentProducts() {
    try {
      if (Array.isArray(products)) return products;
    } catch {}
    return Array.isArray(window.products) ? window.products : [];
  }

  function identity() {
    let s = null;
    try {
      if (typeof session !== "undefined") s = session;
    } catch {}
    s = s || window.session || null;
    const business =
      s?.business?.code || s?.businessCode || s?.business?.id || "business";
    const user = s?.user?.id || s?.user?.username || "user";
    return `${String(business).slice(0, 80)}:${String(user).slice(0, 80)}`;
  }

  function storageKey() {
    return `${STORAGE_PREFIX}:${identity()}`;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function lineSnapshot(line) {
    if (line?.custom) {
      return {
        custom: true,
        id: String(line.id || `common-${Date.now()}`),
        name: String(line.name || "Producto común").slice(0, 180),
        code: String(line.code || "").slice(0, 120),
        description: String(line.description || "Producto común").slice(0, 300),
        unit: String(line.unit || "Pieza").slice(0, 80),
        qty: Math.max(0.001, safeNumber(line.qty, 1)),
        cost: Math.max(0, safeNumber(line.cost, 0)),
        price: Math.max(0, safeNumber(line.price, 0)),
        wholesale: Math.max(0, safeNumber(line.wholesale, 0)),
        iva: Math.max(0, safeNumber(line.iva, 16)),
        price_includes_tax: line.price_includes_tax !== false,
      };
    }
    return {
      custom: false,
      productId: String(line?.id || line?.product_id || ""),
      qty: Math.max(0.001, safeNumber(line?.qty, 1)),
      snapshot: {
        id: String(line?.id || line?.product_id || ""),
        code: String(line?.code || "").slice(0, 120),
        name: String(line?.name || "Producto").slice(0, 180),
        description: String(line?.description || "").slice(0, 300),
        unit: String(line?.unit || "Pieza").slice(0, 80),
        cost: Math.max(0, safeNumber(line?.cost, 0)),
        price: Math.max(0, safeNumber(line?.price, 0)),
        wholesale: Math.max(0, safeNumber(line?.wholesale, 0)),
        stock: Math.max(0, safeNumber(line?.stock, 0)),
        iva: Math.max(0, safeNumber(line?.iva, 16)),
        price_includes_tax: line?.price_includes_tax !== false,
        active: line?.active !== false,
        image_path: line?.image_path || null,
      },
    };
  }

  function snapshotState() {
    const api = pos();
    if (!api || !Array.isArray(api.tickets)) return null;
    const tickets = api.tickets.slice(0, MAX_TICKETS).map((ticket) => ({
      id: Math.max(1, Math.trunc(safeNumber(ticket?.id, 1))),
      clientId: String(ticket?.clientId || "").slice(0, 80),
      cart: Array.isArray(ticket?.cart)
        ? ticket.cart.map(lineSnapshot).slice(0, 500)
        : [],
    }));
    return {
      version: VERSION,
      savedAt: new Date().toISOString(),
      activeTicketId: Math.max(1, Math.trunc(safeNumber(api.activeTicketId, 1))),
      tickets,
    };
  }

  function persist() {
    const data = snapshotState();
    if (!data) return false;
    try {
      localStorage.setItem(storageKey(), JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn("SOLRAK tickets en espera", error);
      return false;
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tickets)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function restoreLine(saved, productMap, missing) {
    const qty = Math.max(0.001, safeNumber(saved?.qty, 1));
    if (saved?.custom) {
      return {
        ...saved,
        custom: true,
        qty,
        stock: Number.MAX_SAFE_INTEGER,
      };
    }
    const productId = String(saved?.productId || saved?.snapshot?.id || "");
    if (!productId) return null;
    const current = productMap.get(productId);
    if (current?.active !== false) return { ...current, qty };
    if (saved?.snapshot?.id) {
      missing.count += 1;
      return { ...saved.snapshot, id: productId, qty, unavailable: true };
    }
    return null;
  }

  function restore() {
    const api = pos();
    const saved = readSaved();
    if (!api || !Array.isArray(api.tickets) || !saved?.tickets?.length) return false;

    const productMap = new Map(
      currentProducts().map((product) => [String(product?.id || ""), product]),
    );
    const missing = { count: 0 };
    const restored = saved.tickets.slice(0, MAX_TICKETS).map((ticket, index) => ({
      id: Math.max(1, Math.trunc(safeNumber(ticket?.id, index + 1))),
      clientId: String(ticket?.clientId || "").slice(0, 80),
      cart: Array.isArray(ticket?.cart)
        ? ticket.cart
            .map((line) => restoreLine(line, productMap, missing))
            .filter(Boolean)
        : [],
    }));

    if (!restored.length) return false;
    const unique = [];
    const used = new Set();
    for (const ticket of restored) {
      let id = ticket.id;
      while (used.has(id)) id += 1;
      used.add(id);
      unique.push({ ...ticket, id });
    }

    api.tickets.splice(0, api.tickets.length, ...unique);
    const wanted = unique.some((t) => t.id === Number(saved.activeTicketId))
      ? Number(saved.activeTicketId)
      : unique[0].id;
    api.switchTicket?.(wanted);
    api.rerender?.();
    Promise.resolve(api.refresh?.()).catch(() => {});
    updateNewTicketControl();
    persist();

    if (missing.count) {
      notify(
        `${missing.count} producto(s) de tickets en espera ya no están activos; revísalos antes de cobrar.`,
        true,
      );
    }
    return true;
  }

  function nextTicketId(tickets) {
    const max = tickets.reduce(
      (value, ticket) => Math.max(value, Math.trunc(safeNumber(ticket?.id, 0))),
      0,
    );
    return max + 1;
  }

  function newTicket() {
    const api = pos();
    if (!api || !Array.isArray(api.tickets)) return false;
    if (api.tickets.length >= MAX_TICKETS) {
      notify(`Puedes mantener hasta ${MAX_TICKETS} tickets en espera.`, true);
      updateNewTicketControl();
      return false;
    }
    const ticket = { id: nextTicketId(api.tickets), cart: [], clientId: "" };
    api.tickets.push(ticket);
    api.switchTicket?.(ticket.id);
    api.rerender?.();
    updateNewTicketControl();
    persist();
    return true;
  }

  function updateNewTicketControl() {
    const api = pos();
    const button = byId("posNewTicket");
    if (!api || !button) return;
    button.disabled = Array.isArray(api.tickets) && api.tickets.length >= MAX_TICKETS;
    button.title = `Hasta ${MAX_TICKETS} ventas simultáneas`;
  }

  function installNewTicketControl() {
    const api = pos();
    const button = byId("posNewTicket");
    if (!api || !button) return false;
    api.newTicket = newTicket;
    button.onclick = newTicket;
    updateNewTicketControl();
    return true;
  }

  function installPersistenceWatcher() {
    if (document.documentElement.dataset[INSTALL_MARK] === "1") return;
    document.documentElement.dataset[INSTALL_MARK] = "1";
    let last = "";
    window.setInterval(() => {
      const state = snapshotState();
      if (!state) return;
      const serialized = JSON.stringify({
        activeTicketId: state.activeTicketId,
        tickets: state.tickets,
      });
      if (serialized !== last) {
        last = serialized;
        persist();
      }
      updateNewTicketControl();
    }, 350);
    window.addEventListener("beforeunload", persist);
    document.addEventListener("solrak:pos-sale-complete", () =>
      window.setTimeout(persist, 0),
    );
  }

  function install() {
    const api = pos();
    if (!api || !Array.isArray(api.tickets)) return false;
    installNewTicketControl();
    installPersistenceWatcher();
    restore();
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (install() || attempts > 160) window.clearInterval(timer);
  }, 100);

  window.SOLRAKHeldTicketsV0175 = {
    version: VERSION,
    maxTickets: MAX_TICKETS,
    install,
    newTicket,
    persist,
    restore,
    snapshotState,
    storageKey,
  };
})();