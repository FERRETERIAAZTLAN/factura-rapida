(() => {
  "use strict";

  const VERSION = "0.1.85";
  const STYLE_ID = "solrakDiscountsV0185Style";
  const POS_API_FRAGMENT = "/functions/v1/pos-api";
  const FETCH_BOUND = Symbol.for("solrak.discounts.fetch.v0185");
  let cartObserver = null;
  let repairQueued = false;

  const byId = (id) => document.getElementById(id);
  const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const round4 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
  const money = (value) => {
    try { if (typeof window.money === "function") return window.money(value); } catch {}
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  };

  function api() { return window.FacturaRapidaPOS || null; }
  function cart() { return Array.isArray(api()?.cart) ? api().cart : []; }
  function sessionNow() {
    try { return session || window.session || null; } catch { return window.session || null; }
  }
  function notify(message, error = false) {
    try { if (typeof window.notice === "function") return window.notice(message, error); } catch {}
    if (error) window.alert?.(message);
  }
  function canDiscount() {
    if (sessionNow()?.user?.role === "admin") return true;
    try { return window.SOLRAKPermissionsV0179?.can?.("allow_discounts") === true; } catch { return false; }
  }
  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function rawUnitPrice(line) {
    if (!line) return 0;
    const current = Number(line.price || 0);
    const priorDiscounted = Number(line._solrakDiscountedPrice);
    if (!Number.isFinite(Number(line._solrakBasePrice))) line._solrakBasePrice = current;
    else if (Number.isFinite(priorDiscounted) && Math.abs(current - priorDiscounted) > 0.005) {
      line._solrakBasePrice = current;
    }
    return Math.max(0, Number(line._solrakBasePrice || 0));
  }
  function rawLineTotal(line) {
    const qty = Math.max(0, Number(line?.qty || 0));
    const unit = rawUnitPrice(line);
    const rate = Math.max(0, Number(line?.iva ?? 16)) / 100;
    const subtotal = unit * qty;
    return round2(line?.price_includes_tax === false ? subtotal * (1 + rate) : subtotal);
  }
  function requestedDiscount(line) {
    const type = String(line?.solrak_manual_discount_type || "");
    const value = Math.max(0, Number(line?.solrak_manual_discount_value || 0));
    const raw = rawLineTotal(line);
    if (!raw || !value || !["percent", "fixed"].includes(type)) return 0;
    if (type === "percent") return round2(raw * Math.min(value, 99.99) / 100);
    return round2(Math.min(value, Math.max(0, raw - 0.01)));
  }
  function discountPricing(line) {
    const qty = Math.max(0.001, Number(line?.qty || 1));
    const raw = rawLineTotal(line);
    const requested = requestedDiscount(line);
    const rate = Math.max(0, Number(line?.iva ?? 16)) / 100;
    if (!(requested > 0) || !(raw > requested)) {
      const basePrice = rawUnitPrice(line);
      return { unitPrice: basePrice, discount: 0, rawTotal: raw, finalTotal: raw };
    }
    const target = round2(raw - requested);
    const unit = line?.price_includes_tax === false
      ? round4(target / (1 + rate) / qty)
      : round4(target / qty);
    const actual = round2(line?.price_includes_tax === false ? unit * qty * (1 + rate) : unit * qty);
    return {
      unitPrice: unit,
      discount: round2(Math.max(0, raw - actual)),
      rawTotal: raw,
      finalTotal: actual,
    };
  }
  function manualDiscountAmount(line) { return discountPricing(line).discount; }
  function repriceLine(line) {
    if (!line) return false;
    const pricing = discountPricing(line);
    const current = Number(line.price || 0);
    if (Math.abs(current - pricing.unitPrice) <= 0.00005) {
      line._solrakDiscountedPrice = pricing.unitPrice;
      return false;
    }
    line.price = pricing.unitPrice;
    line._solrakDiscountedPrice = pricing.unitPrice;
    return true;
  }
  function repriceCart() {
    let changed = false;
    for (const line of cart()) if (repriceLine(line)) changed = true;
    return changed;
  }
  function rerender() {
    repriceCart();
    api()?.rerender?.();
    setTimeout(annotateCart, 0);
  }
  function clearLineDiscount(line) {
    if (!line) return;
    const base = rawUnitPrice(line);
    delete line.solrak_manual_discount_type;
    delete line.solrak_manual_discount_value;
    line.price = base;
    line._solrakDiscountedPrice = base;
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.solrakManualDiscountBadge{display:inline-flex;margin-left:6px;padding:2px 5px;border-radius:3px;background:#fff0d5;color:#8a5900;font-size:9px;font-weight:800;vertical-align:middle}.solrakDiscountDialog{border:0!important;border-radius:7px!important;padding:0!important;width:min(470px,calc(100vw - 28px))!important;box-shadow:0 24px 70px rgba(0,0,0,.30)!important}.solrakDiscountDialog::backdrop{background:rgba(20,25,30,.58)}.solrakDiscountHead{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 13px;background:var(--solrak83-accent,var(--fiel-orange,#2588d8));color:#fff;font-weight:800}.solrakDiscountHead button{border:0;background:transparent;color:#fff;font-size:21px}.solrakDiscountBody{padding:14px 16px}.solrakDiscountGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.solrakDiscountGrid label{font-size:10px;font-weight:800;color:#586570}.solrakDiscountGrid select,.solrakDiscountGrid input{display:block;width:100%;box-sizing:border-box;margin-top:5px;height:42px;border:1px solid #ccd4da;border-radius:4px;padding:6px 8px;background:#fff;font-size:17px;font-variant-numeric:tabular-nums}.solrakDiscountSummary{margin-top:11px;padding:10px;border:1px solid #dfe4e8;background:#f8fafb;font-size:11px;line-height:1.45;color:#56636e}.solrakDiscountActions{display:flex;justify-content:flex-end;gap:7px;margin-top:13px}.solrakDiscountActions button{height:36px;padding:0 13px;border:1px solid #cbd3d9;background:#fff;border-radius:4px;font-weight:800}.solrakDiscountActions .primary{background:var(--solrak83-accent,var(--fiel-orange,#2588d8));border-color:var(--solrak83-accent,var(--fiel-orange,#2588d8));color:#fff}.solrakDiscountActions .danger{color:#a73c3c}
`;
    document.head.appendChild(style);
  }

  function ensureLineDialog() {
    if (byId("solrakManualDiscountDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "solrakManualDiscountDialog";
    dialog.className = "solrakDiscountDialog";
    dialog.innerHTML = `<div class="solrakDiscountHead"><span id="solrakManualDiscountTitle">Descuento del producto</span><button type="button" data-close>×</button></div><div class="solrakDiscountBody"><div class="solrakDiscountGrid"><label>Tipo<select id="solrakManualDiscountType"><option value="percent">Porcentaje %</option><option value="fixed">Importe $</option></select></label><label>Valor<input id="solrakManualDiscountValue" type="number" min="0" step="0.01"></label></div><div id="solrakManualDiscountSummary" class="solrakDiscountSummary"></div><div class="solrakDiscountActions"><button id="solrakManualDiscountClear" class="danger" type="button">Quitar descuento</button><button type="button" data-close>Cancelar</button><button id="solrakManualDiscountSave" class="primary" type="button">Aplicar</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-close]").forEach((button) => button.onclick = () => closeDialog(dialog));
    byId("solrakManualDiscountType").onchange = refreshLineDialog;
    byId("solrakManualDiscountValue").oninput = refreshLineDialog;
    byId("solrakManualDiscountClear").onclick = () => {
      const line = cart().find((item) => String(item.id) === String(dialog.dataset.lineId));
      if (line) clearLineDiscount(line);
      closeDialog(dialog); rerender(); notify("Descuento individual retirado.");
    };
    byId("solrakManualDiscountSave").onclick = () => {
      const line = cart().find((item) => String(item.id) === String(dialog.dataset.lineId));
      if (!line) return;
      const type = byId("solrakManualDiscountType").value;
      const value = Number(byId("solrakManualDiscountValue").value || 0);
      applyLineDiscount({ lineId: line.id, type, value, closeAfter: true });
    };
  }
  function refreshLineDialog() {
    const dialog = byId("solrakManualDiscountDialog");
    const line = cart().find((item) => String(item.id) === String(dialog?.dataset.lineId));
    if (!line) return;
    const oldType = line.solrak_manual_discount_type, oldValue = line.solrak_manual_discount_value;
    line.solrak_manual_discount_type = byId("solrakManualDiscountType").value;
    line.solrak_manual_discount_value = Number(byId("solrakManualDiscountValue").value || 0);
    const pricing = discountPricing(line);
    line.solrak_manual_discount_type = oldType;
    line.solrak_manual_discount_value = oldValue;
    byId("solrakManualDiscountSummary").innerHTML = `Precio actual de la línea: <strong>${money(pricing.rawTotal)}</strong><br>Descuento: <strong>${money(pricing.discount)}</strong><br>Total después del descuento: <strong>${money(pricing.finalTotal)}</strong>`;
  }
  function openLineDiscount(lineId) {
    if (!canDiscount()) return notify("Este usuario no tiene permiso para aplicar descuentos.", true);
    const line = cart().find((item) => String(item.id) === String(lineId));
    if (!line) return notify("No encontré el producto de la venta.", true);
    ensureLineDialog();
    const dialog = byId("solrakManualDiscountDialog");
    dialog.dataset.lineId = String(line.id);
    byId("solrakManualDiscountTitle").textContent = `Descuento · ${line.name || "Producto"}`;
    byId("solrakManualDiscountType").value = line.solrak_manual_discount_type || "percent";
    byId("solrakManualDiscountValue").value = Number(line.solrak_manual_discount_value || 0) || "";
    refreshLineDialog();
    openDialog(dialog);
  }

  function applyLineDiscount(input = {}) {
    if (!canDiscount()) { notify("Este usuario no tiene permiso para aplicar descuentos.", true); return false; }
    const line = cart().find((item) => String(item.id) === String(input.lineId));
    if (!line) { notify("No encontré el producto de la venta.", true); return false; }
    if (input.value === undefined || input.value === null || input.type === undefined) {
      openLineDiscount(line.id); return true;
    }
    const type = String(input.type || "percent");
    const value = Number(input.value || 0);
    if (!["percent", "fixed"].includes(type) || !Number.isFinite(value) || value < 0) {
      notify("Descuento inválido.", true); return false;
    }
    const raw = rawLineTotal(line);
    if (type === "percent" && value >= 100) { notify("El descuento porcentual debe ser menor a 100%.", true); return false; }
    if (type === "fixed" && value >= raw) { notify("El descuento no puede ser igual o mayor al total del producto.", true); return false; }
    if (value <= 0) clearLineDiscount(line);
    else {
      rawUnitPrice(line);
      line.solrak_manual_discount_type = type;
      line.solrak_manual_discount_value = round2(value);
      repriceLine(line);
    }
    if (input.closeAfter) closeDialog(byId("solrakManualDiscountDialog"));
    rerender();
    notify(value > 0 ? "Descuento individual aplicado." : "Descuento individual retirado.");
    return true;
  }

  function ensureSaleDialog() {
    if (byId("solrakSaleDiscountDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "solrakSaleDiscountDialog";
    dialog.className = "solrakDiscountDialog";
    dialog.innerHTML = `<div class="solrakDiscountHead"><span>Descuento global de la venta</span><button type="button" data-close>×</button></div><div class="solrakDiscountBody"><div class="solrakDiscountGrid"><label>Tipo<select id="solrakSaleDiscountType"><option value="percent">Porcentaje %</option><option value="fixed">Importe $</option></select></label><label>Valor<input id="solrakSaleDiscountValue" type="number" min="0" step="0.01"></label></div><div id="solrakSaleDiscountSummary" class="solrakDiscountSummary"></div><div class="solrakDiscountActions"><button id="solrakSaleDiscountClear" class="danger" type="button">Quitar descuentos</button><button type="button" data-close>Cancelar</button><button id="solrakSaleDiscountSave" class="primary" type="button">Aplicar a venta</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-close]").forEach((button) => button.onclick = () => closeDialog(dialog));
    byId("solrakSaleDiscountType").onchange = refreshSaleDialog;
    byId("solrakSaleDiscountValue").oninput = refreshSaleDialog;
    byId("solrakSaleDiscountClear").onclick = () => { clearAllDiscounts(); closeDialog(dialog); };
    byId("solrakSaleDiscountSave").onclick = applySaleDiscountFromDialog;
  }
  function rawCartTotal() { return round2(cart().reduce((sum, line) => sum + rawLineTotal(line), 0)); }
  function refreshSaleDialog() {
    const raw = rawCartTotal();
    const type = byId("solrakSaleDiscountType")?.value || "percent";
    const value = Math.max(0, Number(byId("solrakSaleDiscountValue")?.value || 0));
    const requested = type === "percent" ? round2(raw * Math.min(value, 99.99) / 100) : round2(Math.min(value, Math.max(0, raw - 0.01)));
    const target = round2(raw - requested);
    if (byId("solrakSaleDiscountSummary")) byId("solrakSaleDiscountSummary").innerHTML = `Total antes de descuento: <strong>${money(raw)}</strong><br>Descuento estimado: <strong>${money(requested)}</strong><br>Total estimado: <strong>${money(target)}</strong><br><small>El descuento global reemplaza los descuentos manuales por producto del ticket actual.</small>`;
  }
  function openSaleDiscount() {
    if (!canDiscount()) return notify("Este usuario no tiene permiso para aplicar descuentos.", true);
    if (!cart().length) return notify("Agrega productos antes de aplicar un descuento.", true);
    ensureSaleDialog();
    byId("solrakSaleDiscountType").value = "percent";
    byId("solrakSaleDiscountValue").value = "";
    refreshSaleDialog();
    openDialog(byId("solrakSaleDiscountDialog"));
  }
  function applySaleDiscountFromDialog() {
    const type = byId("solrakSaleDiscountType").value;
    const value = Number(byId("solrakSaleDiscountValue").value || 0);
    if (!["percent", "fixed"].includes(type) || !Number.isFinite(value) || value < 0) return notify("Descuento inválido.", true);
    const lines = cart();
    const rawTotal = rawCartTotal();
    if (type === "percent" && value >= 100) return notify("El descuento porcentual debe ser menor a 100%.", true);
    if (type === "fixed" && value >= rawTotal) return notify("El descuento no puede ser igual o mayor al total de la venta.", true);
    lines.forEach(clearLineDiscount);
    if (value > 0 && type === "percent") {
      for (const line of lines) { line.solrak_manual_discount_type = "percent"; line.solrak_manual_discount_value = round2(value); repriceLine(line); }
    } else if (value > 0) {
      let remaining = round2(value);
      const rawByLine = lines.map((line) => rawLineTotal(line));
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const raw = rawByLine[index];
        let allocation = index === lines.length - 1 ? remaining : round2(value * (raw / rawTotal));
        allocation = Math.min(allocation, Math.max(0, raw - 0.01));
        remaining = round2(remaining - allocation);
        if (allocation > 0) { line.solrak_manual_discount_type = "fixed"; line.solrak_manual_discount_value = allocation; repriceLine(line); }
      }
    }
    closeDialog(byId("solrakSaleDiscountDialog"));
    rerender(); notify(value > 0 ? "Descuento global aplicado." : "Descuentos retirados.");
  }
  function clearAllDiscounts() {
    for (const line of cart()) clearLineDiscount(line);
    rerender(); notify("Descuentos manuales retirados del ticket actual.");
  }

  function annotateCart() {
    const host = byId("posCart");
    if (!host) return;
    host.querySelectorAll("[data-pos-line]").forEach((row) => {
      const line = cart().find((item) => String(item.id) === String(row.dataset.posLine));
      const product = row.querySelector(".frPosProduct");
      if (!line || !product) return;
      const amount = manualDiscountAmount(line);
      let badge = row.querySelector(".solrakManualDiscountBadge");
      if (!(amount > 0)) { badge?.remove(); return; }
      if (!badge) { badge = document.createElement("span"); badge.className = "solrakManualDiscountBadge"; product.querySelector("strong")?.insertAdjacentElement("afterend", badge); }
      badge.textContent = `Desc. -${money(amount)}`;
    });
  }

  function installFetchBridge() {
    if (window.fetch?.[FETCH_BOUND]) return;
    const original = window.fetch.bind(window);
    const wrapped = async function solrakDiscountFetch(input, init = {}) {
      const url = typeof input === "string" ? input : String(input?.url || "");
      if (url.includes(POS_API_FRAGMENT) && typeof init?.body === "string") {
        try {
          const payload = JSON.parse(init.body);
          if (payload?.action === "completeSale" && Array.isArray(payload.items)) {
            repriceCart();
            const lines = cart();
            const usedCustom = new Set();
            payload.items = payload.items.map((item, index) => {
              let line = null;
              if (item?.product_id) line = lines.find((candidate) => String(candidate.id) === String(item.product_id));
              else {
                line = lines.find((candidate, candidateIndex) => candidate.custom && !usedCustom.has(candidateIndex) && candidateIndex >= Math.min(index, lines.length - 1)) || lines.find((candidate, candidateIndex) => candidate.custom && !usedCustom.has(candidateIndex));
                const lineIndex = lines.indexOf(line); if (lineIndex >= 0) usedCustom.add(lineIndex);
              }
              if (!line) return item;
              const next = { ...item, manual_discount_amount: manualDiscountAmount(line) };
              if (item?.custom === true || !item?.product_id) next.unit_price = rawUnitPrice(line);
              return next;
            });
            init = { ...init, body: JSON.stringify(payload) };
          }
        } catch {}
      }
      return original(input, init);
    };
    Object.defineProperty(wrapped, FETCH_BOUND, { value: true });
    window.fetch = wrapped;
  }

  function installCartObserver() {
    const host = byId("posCart");
    if (!host || host.dataset.solrakDiscountObserver === "1") return;
    host.dataset.solrakDiscountObserver = "1";
    cartObserver?.disconnect?.();
    cartObserver = new MutationObserver(() => {
      if (repairQueued) return;
      repairQueued = true;
      setTimeout(() => {
        repairQueued = false;
        const changed = repriceCart();
        annotateCart();
        if (changed) api()?.rerender?.();
      }, 0);
    });
    cartObserver.observe(host, { childList: true, subtree: true });
  }

  function sync() {
    injectStyle(); installFetchBridge(); installCartObserver();
    const changed = repriceCart();
    if (changed) api()?.rerender?.();
    annotateCart();
    document.documentElement.dataset.solrakDiscounts = "1";
  }
  function boot() {
    sync();
    document.addEventListener("solrak:permissions-updated", () => setTimeout(sync, 0));
    document.addEventListener("solrak:pos-sale-complete", () => setTimeout(sync, 0));
    setInterval(sync, 1000);
    setTimeout(sync, 250); setTimeout(sync, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  window.SOLRAKDiscounts = { version: VERSION, canDiscount, openSaleDiscount, openLineDiscount, applyLineDiscount, clearAllDiscounts, manualDiscountAmount, repriceCart };
})();
