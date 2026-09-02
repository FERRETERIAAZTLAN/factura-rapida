(() => {
  "use strict";

  const VERSION = "0.1.74";
  const MARK = "solrakQtyCodeV0174";

  function byId(id) {
    return document.getElementById(id);
  }

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK", message);
  }

  function currentProducts() {
    try {
      if (Array.isArray(products)) return products;
    } catch {}
    return Array.isArray(window.products) ? window.products : [];
  }

  function parseQuantityCode(raw) {
    const match = String(raw || "").match(/^\s*(\d+(?:[\.,]\d+)?)\s*\*\s*(.+?)\s*$/);
    if (!match) return null;
    const qty = Number(match[1].replace(",", "."));
    const code = String(match[2] || "").trim();
    if (!Number.isFinite(qty) || qty <= 0 || !code) return null;
    return { qty, code };
  }

  function findExactProduct(code) {
    const target = String(code || "").trim().toLocaleLowerCase("es-MX");
    return (
      currentProducts().find(
        (product) =>
          product?.active !== false &&
          String(product?.code || "")
            .trim()
            .toLocaleLowerCase("es-MX") === target,
      ) || null
    );
  }

  function installQuantityCapture() {
    const input = byId("posSearch");
    const pos = window.FacturaRapidaPOS;
    if (!input || !pos || input.dataset[MARK] === "1") return false;

    const originalKeydown = input.onkeydown;
    if (typeof originalKeydown !== "function") return false;

    input.dataset[MARK] = "1";
    input.placeholder = "Escanea código, escribe producto o usa 3*CODIGO…";

    input.onkeydown = function solrakQuantityCodeKeydown(event) {
      if (event?.key !== "Enter") return originalKeydown.call(this, event);

      const parsed = parseQuantityCode(this.value);
      if (!parsed) return originalKeydown.call(this, event);

      event.preventDefault();
      event.stopPropagation?.();

      const product = findExactProduct(parsed.code);
      if (!product) {
        notify(`No se encontró el código ${parsed.code}.`, true);
        return;
      }

      const cart = Array.isArray(pos.cart) ? pos.cart : [];
      const existing = cart.find((line) => line?.id === product.id);
      const beforeQty = Number(existing?.qty || 0);
      const requestedTotal = beforeQty + parsed.qty;
      const stock = Number(product.stock || 0);

      if (stock <= 0) {
        notify("Este producto no tiene existencia disponible.", true);
        return;
      }
      if (requestedTotal > stock) {
        notify(
          `Existencia insuficiente. Disponible ${stock}; solicitado ${requestedTotal}.`,
          true,
        );
        return;
      }

      this.value = String(product.code || parsed.code);
      originalKeydown.call(this, {
        key: "Enter",
        target: this,
        preventDefault() {},
        stopPropagation() {},
      });

      const line = (Array.isArray(pos.cart) ? pos.cart : []).find(
        (candidate) => candidate?.id === product.id,
      );
      if (!line) {
        notify("No se pudo agregar el producto a la venta.", true);
        return;
      }

      line.qty = requestedTotal;
      pos.rerender?.();
      this.value = "";
      this.dispatchEvent(new Event("input", { bubbles: true }));
      this.focus?.();
    };

    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (installQuantityCapture() || attempts > 120) window.clearInterval(timer);
  }, 100);

  window.SOLRAKSalesV0174 = {
    version: VERSION,
    parseQuantityCode,
    installQuantityCapture,
  };
})();
