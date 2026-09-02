(() => {
  "use strict";

  const VERSION = "0.1.90";
  const STYLE_ID = "solrakUxCoreV0190Style";
  const ROOT_FLAG = "solrakUx90";
  const MAX_TICKETS = 8;
  const byId = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = (value) => Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  const pos = () => window.FacturaRapidaPOS || null;
  const notify = (message, error = false) => {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK", message);
  };

  let modalResolve = null;
  let scannerBuffer = "";
  let scannerLast = 0;
  let mountTimer = null;

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-ux90="1"] body{font-family:"Segoe UI",Tahoma,sans-serif;background:#edf0f2!important}
html[data-solrak-ux90="1"] main.shell{max-width:none!important;padding:7px 8px 28px!important}
html[data-solrak-ux90="1"] .card{border-radius:4px!important;padding:8px 9px!important;box-shadow:0 1px 3px rgba(0,0,0,.08)!important}
html[data-solrak-ux90="1"] .card-head{margin-bottom:6px!important;min-height:28px!important}html[data-solrak-ux90="1"] .card h2{font-size:14px!important}
html[data-solrak-ux90="1"] .stack{gap:7px!important}html[data-solrak-ux90="1"] .grid2,html[data-solrak-ux90="1"] .split{gap:7px!important}
html[data-solrak-ux90="1"] .field,html[data-solrak-ux90="1"] .fielField{height:31px!important;min-height:31px!important;border-radius:3px!important;padding:4px 7px!important;font-size:12px!important}
html[data-solrak-ux90="1"] textarea.field,html[data-solrak-ux90="1"] textarea.fielField{height:auto!important;min-height:62px!important}
html[data-solrak-ux90="1"] label,html[data-solrak-ux90="1"] .fielLabel{gap:3px!important;font-size:10px!important}
html[data-solrak-ux90="1"] .form-grid,html[data-solrak-ux90="1"] .fielFormGrid{gap:6px!important}
html[data-solrak-ux90="1"] .table-wrap,html[data-solrak-ux90="1"] .fielTableWrap{border-radius:3px!important;margin-top:5px!important}
html[data-solrak-ux90="1"] table,html[data-solrak-ux90="1"] .fielTable{font-size:10px!important}html[data-solrak-ux90="1"] th,html[data-solrak-ux90="1"] td,html[data-solrak-ux90="1"] .fielTable th,html[data-solrak-ux90="1"] .fielTable td{padding:5px 6px!important;line-height:1.2!important}
html[data-solrak-ux90="1"] th,html[data-solrak-ux90="1"] .fielTable th{font-size:9px!important}
html[data-solrak-ux90="1"] .primary,html[data-solrak-ux90="1"] .secondary,html[data-solrak-ux90="1"] .danger,html[data-solrak-ux90="1"] .ghost,html[data-solrak-ux90="1"] .fielBtn{border-radius:3px!important;min-height:30px!important;padding:5px 9px!important;font-size:10px!important}
html[data-solrak-ux90="1"] .modal,html[data-solrak-ux90="1"] .fielDialog{border-radius:5px!important;box-shadow:0 16px 55px rgba(0,0,0,.34)!important}html[data-solrak-ux90="1"] .modal::backdrop,html[data-solrak-ux90="1"] .fielDialog::backdrop{background:rgba(18,24,29,.60)!important;backdrop-filter:blur(2px)!important}
html[data-solrak-ux90="1"] .fielDialogBody{padding:9px!important}html[data-solrak-ux90="1"] .fielDialogHead{height:38px!important;min-height:38px!important;padding:0 10px!important;font-size:12px!important}
html[data-solrak-ux90="1"] #tab-pos .frPosLine{transition:none!important}html[data-solrak-ux90="1"] #posTickets,html[data-solrak-ux90="1"] .frTicketBar{scroll-behavior:auto!important}
html[data-solrak-ux90="1"] .frTicket{transition:none!important;animation:none!important}html[data-solrak-ux90="1"] #tab-pos *{animation-duration:0s!important}
#solrakUx90Modal{border:0;border-radius:5px;padding:0;width:min(640px,calc(100vw - 24px));box-shadow:0 20px 70px rgba(0,0,0,.38);background:#fff;color:#26313a}#solrakUx90Modal::backdrop{background:rgba(13,18,22,.66);backdrop-filter:blur(2px)}
.solrakUx90Head{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:var(--solrak83-accent,#2588d8);color:#fff;font:800 13px "Segoe UI",sans-serif}.solrakUx90Head.danger{background:#b43d3d}.solrakUx90Head button{border:0;background:transparent;color:#fff;font-size:21px;cursor:pointer}
.solrakUx90Body{padding:11px 12px;font:11px/1.35 "Segoe UI",sans-serif}.solrakUx90Lead{margin:0 0 8px;font-size:12px;font-weight:700}.solrakUx90Impact{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:8px 0}.solrakUx90Impact>div{border:1px solid #d8dde1;background:#f7f9fa;padding:7px}.solrakUx90Impact span{display:block;color:#697680;font-size:8px;text-transform:uppercase;font-weight:900}.solrakUx90Impact strong{display:block;margin-top:2px;font-size:14px}.solrakUx90Lines{max-height:190px;overflow:auto;border:1px solid #d8dde1;margin-top:7px}.solrakUx90Lines table{width:100%;border-collapse:collapse;font-size:10px}.solrakUx90Lines th,.solrakUx90Lines td{padding:5px 6px;border-bottom:1px solid #edf0f2;text-align:left}.solrakUx90Lines th{position:sticky;top:0;background:#eef1f3;font-size:8px;text-transform:uppercase}.solrakUx90Reason{display:grid;gap:3px;margin-top:9px;font-weight:800;color:#55616a}.solrakUx90Reason input{height:32px;border:1px solid #cbd3d9;border-radius:3px;padding:4px 7px;font:12px "Segoe UI",sans-serif}.solrakUx90Foot{display:flex;justify-content:flex-end;gap:6px;padding:8px 12px;border-top:1px solid #dce1e5;background:#f5f7f8}.solrakUx90Foot button{height:31px;border:1px solid #c8d0d6;border-radius:3px;background:#fff;padding:0 12px;font:800 10px "Segoe UI",sans-serif}.solrakUx90Foot .confirm{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrakUx90Foot .confirm.danger{background:#b43d3d;border-color:#b43d3d}
.solrakUx90Empty{display:grid;place-items:center;gap:3px;min-height:58px;padding:12px;color:#73808a;text-align:center}.solrakUx90Empty b{font-size:18px;color:#9aa4ac}.solrakUx90Empty strong{font-size:11px;color:#59656f}.solrakUx90Empty small{font-size:9px}.solrakUx90Loading{display:flex;align-items:center;justify-content:center;gap:7px;min-height:48px;color:#68757f;font-size:10px}.solrakUx90Loading::before{content:"";width:12px;height:12px;border:2px solid #cfd6dc;border-top-color:var(--solrak83-accent,#2588d8);border-radius:50%;animation:solrakUx90Spin .7s linear infinite}@keyframes solrakUx90Spin{to{transform:rotate(360deg)}}
#solrakUx90Hotkeys{position:fixed;right:8px;bottom:7px;z-index:38;display:flex;gap:3px;pointer-events:none;opacity:.72}#solrakUx90Hotkeys span{border:1px solid #c7cdd2;background:rgba(255,255,255,.94);padding:3px 5px;border-radius:3px;font:800 8px "Segoe UI",sans-serif;color:#56616a;box-shadow:0 1px 2px rgba(0,0,0,.06)}
@media(max-width:980px){#solrakUx90Hotkeys{display:none}.solrakUx90Impact{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let dialog = byId("solrakUx90Modal");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "solrakUx90Modal";
    dialog.innerHTML = `<div id="solrakUx90Head" class="solrakUx90Head"><span id="solrakUx90Title">Confirmar</span><button id="solrakUx90X" type="button">×</button></div><div id="solrakUx90Body" class="solrakUx90Body"></div><div class="solrakUx90Foot"><button id="solrakUx90Cancel" type="button">Cancelar · Esc</button><button id="solrakUx90Confirm" class="confirm" type="button">Confirmar · Enter</button></div>`;
    document.body.appendChild(dialog);
    const finish = (value) => {
      if (!dialog.open) return;
      dialog.close();
      const resolve = modalResolve;
      modalResolve = null;
      resolve?.(value);
      setTimeout(focusSearch, 0);
    };
    byId("solrakUx90X").onclick = () => finish(null);
    byId("solrakUx90Cancel").onclick = () => finish(null);
    byId("solrakUx90Confirm").onclick = () => {
      const reason = byId("solrakUx90Reason")?.value?.trim();
      if (dialog.dataset.requireReason === "1" && !reason) {
        byId("solrakUx90Reason")?.focus();
        notify("Escribe el motivo antes de continuar.", true);
        return;
      }
      finish({ confirmed: true, reason: reason || "" });
    };
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(null); });
    return dialog;
  }

  function modal(options = {}) {
    const dialog = ensureModal();
    if (dialog.open) return Promise.resolve(null);
    const title = String(options.title || "Confirmar");
    const danger = options.danger === true;
    byId("solrakUx90Title").textContent = title;
    byId("solrakUx90Head").className = `solrakUx90Head${danger ? " danger" : ""}`;
    byId("solrakUx90Confirm").className = `confirm${danger ? " danger" : ""}`;
    byId("solrakUx90Confirm").textContent = options.confirmText || "Confirmar · Enter";
    byId("solrakUx90Body").innerHTML = `${options.html || ""}${options.requireReason ? `<label class="solrakUx90Reason">Motivo<input id="solrakUx90Reason" maxlength="240" autocomplete="off" placeholder="Escribe el motivo..."></label>` : ""}`;
    dialog.dataset.requireReason = options.requireReason ? "1" : "0";
    dialog.showModal();
    setTimeout(() => (options.requireReason ? byId("solrakUx90Reason") : byId("solrakUx90Confirm"))?.focus(), 0);
    return new Promise((resolve) => { modalResolve = resolve; });
  }

  function posVisible() {
    const panel = byId("tab-pos");
    return !!panel && !panel.classList.contains("hidden") && getComputedStyle(panel).display !== "none";
  }

  function dialogOpen() {
    return !!document.querySelector("dialog[open]");
  }

  function focusSearch(select = false) {
    if (!posVisible() || dialogOpen()) return false;
    const input = byId("posSearch");
    if (!input || input.disabled) return false;
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    if (select) input.select?.();
    return true;
  }

  function clickAction(action) {
    const button = document.querySelector(`[data-fiel-action="${action}"]`);
    if (!button) return false;
    button.click();
    return true;
  }

  function activateTicketByPosition(position) {
    const api = pos();
    const tickets = Array.isArray(api?.tickets) ? api.tickets : [];
    const ticket = tickets[position - 1];
    if (!ticket) return notify(`El Ticket ${position} no está abierto.`, true);
    api.switchTicket?.(ticket.id);
    setTimeout(focusSearch, 0);
  }

  function hotkeys(event) {
    if (event.defaultPrevented) return;
    const target = event.target;
    const editing = target?.matches?.("input,textarea,select,[contenteditable=true]");
    if (event.key === "F2") { event.preventDefault(); document.querySelector('[data-tab="pos"]')?.click(); setTimeout(() => focusSearch(true), 0); return; }
    if (event.key === "F3") { event.preventDefault(); clickAction("price-check"); return; }
    if (event.key === "F4") { event.preventDefault(); clickAction("common-product"); return; }
    if (event.key === "F6") { event.preventDefault(); clickAction("ticket-search"); setTimeout(() => byId("fielTicketQuery")?.focus(), 0); return; }
    if (event.key === "F7") { event.preventDefault(); clickAction("return-sale"); setTimeout(() => byId("fielReturnQuery")?.focus(), 0); return; }
    if (event.key === "F8") { event.preventDefault(); window.SOLRAKHeldTicketsV0176?.newTicket ? window.SOLRAKHeldTicketsV0176.newTicket() : pos()?.newTicket?.(); return; }
    if (event.key === "F12") { event.preventDefault(); (byId("fielFinishSale") || byId("posCharge"))?.click(); return; }
    if ((event.ctrlKey || event.altKey) && /^[1-8]$/.test(event.key)) { event.preventDefault(); activateTicketByPosition(Number(event.key)); return; }
    if (event.key === "Escape" && !editing) setTimeout(focusSearch, 0);
  }

  function scannerFallback(event) {
    if (!posVisible() || dialogOpen()) return;
    const target = event.target;
    if (target?.matches?.("input,textarea,select,[contenteditable=true]")) return;
    const now = performance.now();
    if (now - scannerLast > 120) scannerBuffer = "";
    scannerLast = now;
    if (event.key === "Enter") {
      if (scannerBuffer.length >= 2) {
        const input = byId("posSearch");
        if (input) {
          event.preventDefault();
          input.value = scannerBuffer;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        }
      }
      scannerBuffer = "";
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) scannerBuffer += event.key;
  }

  function emptyState(icon, title, detail) {
    return `<div class="solrakUx90Empty"><b>${esc(icon)}</b><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`;
  }

  function applyEmptyStates() {
    const inventory = byId("inventoryBody");
    if (inventory && !inventory.children.length) inventory.innerHTML = `<tr data-solrak-empty="1"><td colspan="8">${emptyState("□", "No hay registros", "No hay productos que coincidan con la búsqueda.")}</td></tr>`;
    const clients = byId("clientList");
    if (clients && !clients.children.length) clients.innerHTML = `<div data-solrak-empty="1">${emptyState("♙", "No hay registros", "No hay clientes para mostrar.")}</div>`;
    const credits = byId("fielCreditsContent");
    if (credits && !credits.children.length) credits.innerHTML = `<div data-solrak-empty="1">${emptyState("$", "No hay registros", "No existen créditos o abonos para mostrar.")}</div>`;
  }

  function ensureHotkeyLegend() {
    if (byId("solrakUx90Hotkeys")) return;
    const legend = document.createElement("div");
    legend.id = "solrakUx90Hotkeys";
    legend.innerHTML = "<span>F2 Buscar</span><span>F3 Precio</span><span>F4 Común</span><span>F6 Ticket</span><span>F7 Devolución</span><span>F8 Nuevo</span><span>F12 Cobrar</span><span>Ctrl 1–8 Tickets</span>";
    document.body.appendChild(legend);
  }

  function enforceEightTickets() {
    const hint = document.querySelector("#tab-pos .frPosHint");
    if (hint && /hasta\s+7\s+tickets/i.test(hint.textContent || "")) hint.textContent = hint.textContent.replace(/hasta\s+7\s+tickets/i, "hasta 8 tickets");
    const button = byId("posNewTicket");
    const count = pos()?.tickets?.length || 0;
    if (button) {
      button.disabled = count >= MAX_TICKETS;
      button.title = `Hasta ${MAX_TICKETS} ventas simultáneas`;
      if (!button.dataset.solrakUx90) {
        button.dataset.solrakUx90 = "1";
        button.onclick = (event) => { event.preventDefault(); window.SOLRAKHeldTicketsV0176?.newTicket ? window.SOLRAKHeldTicketsV0176.newTicket() : pos()?.newTicket?.(); };
      }
    }
  }

  async function clearCurrentTicket() {
    const api = pos();
    if (!api?.cart?.length) return;
    const total = api.cart.reduce((sum, line) => sum + Number(line.price || 0) * Number(line.qty || 0), 0);
    const response = await modal({ title: "Vaciar ticket", danger: true, confirmText: "Vaciar ticket · Enter", html: `<p class="solrakUx90Lead">Se quitarán todos los productos del ticket actual. No se modificará inventario porque la venta todavía no está finalizada.</p><div class="solrakUx90Impact"><div><span>Renglones</span><strong>${api.cart.length}</strong></div><div><span>Importe visible</span><strong>${money(total)}</strong></div><div><span>Inventario</span><strong>Sin cambios</strong></div></div>` });
    if (!response?.confirmed) return;
    api.cart.splice(0, api.cart.length);
    api.rerender?.();
    window.SOLRAKHeldTicketsV0176?.persist?.();
    notify("Ticket vacío.");
    focusSearch();
  }

  async function closeHeldTicket(id) {
    const api = pos();
    const tickets = api?.tickets;
    if (!Array.isArray(tickets)) return;
    const index = tickets.findIndex((ticket) => Number(ticket.id) === Number(id));
    if (index < 0) return;
    const ticket = tickets[index];
    if (ticket.cart?.length) {
      const total = ticket.cart.reduce((sum, line) => sum + Number(line.price || 0) * Number(line.qty || 0), 0);
      const response = await modal({ title: `Cerrar Ticket #${ticket.id}`, danger: true, confirmText: "Cerrar ticket · Enter", html: `<p class="solrakUx90Lead">El ticket se retirará de la lista de ventas en espera. Como todavía no se ha cobrado, inventario, caja y crédito permanecen intactos.</p><div class="solrakUx90Impact"><div><span>Productos</span><strong>${ticket.cart.length}</strong></div><div><span>Importe visible</span><strong>${money(total)}</strong></div><div><span>Impacto contable</span><strong>Ninguno</strong></div></div>` });
      if (!response?.confirmed) return;
    }
    if (tickets.length === 1) {
      ticket.cart.splice(0, ticket.cart.length);
      ticket.clientId = "";
      api.rerender?.();
    } else {
      tickets.splice(index, 1);
      const next = tickets[Math.min(index, tickets.length - 1)];
      api.switchTicket?.(next.id);
    }
    window.SOLRAKHeldTicketsV0176?.persist?.();
    enforceEightTickets();
    focusSearch();
  }

  async function selectedSaleDetail() {
    const row = document.querySelector("#fielTicketRows tr.selected[data-fiel-sale]") || document.querySelector("#fielTicketRows tr[data-fiel-sale]");
    if (!row?.dataset?.fielSale) return null;
    return pos()?.api?.("saleDetail", { saleId: row.dataset.fielSale });
  }

  function paymentAmount(detail, method) {
    return (detail?.payments || []).filter((p) => p.method === method).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  async function cancelSelectedSale() {
    const button = byId("fielCancelSale");
    if (button?.disabled) return;
    try {
      const detail = await selectedSaleDetail();
      if (!detail?.sale) return notify("Selecciona un ticket para cancelar.", true);
      const stockLines = (detail.items || []).filter((item) => item.product_id && item.inventory_applied !== false);
      const stockQty = stockLines.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const credit = paymentAmount(detail, "credit");
      const cash = paymentAmount(detail, "cash");
      const other = Number(detail.sale.total || 0) - credit - cash;
      const lines = stockLines.length ? `<div class="solrakUx90Lines"><table><thead><tr><th>Producto</th><th>Stock que regresa</th></tr></thead><tbody>${stockLines.map((item) => `<tr><td>${esc(item.name_snapshot)}</td><td>+${Number(item.quantity || 0)}</td></tr>`).join("")}</tbody></table></div>` : "";
      const response = await modal({ title: `Cancelar Ticket #${detail.sale.sale_number}`, danger: true, requireReason: true, confirmText: "Cancelar venta · Enter", html: `<p class="solrakUx90Lead">Esta acción conserva el ticket en el historial como cancelado. El servidor validará nuevamente todos los efectos antes de confirmar.</p><div class="solrakUx90Impact"><div><span>Inventario</span><strong>${stockQty ? `+${stockQty} unidad(es)` : "Sin cambios"}</strong></div><div><span>Crédito que se revierte</span><strong>${money(credit)}</strong></div><div><span>Efectivo que deja el corte</span><strong>${money(cash)}</strong></div></div>${other > 0 ? `<p>Pagos no efectivo/crédito afectados: <b>${money(other)}</b>.</p>` : ""}${lines}` });
      if (!response?.confirmed) return;
      const result = await pos().api("voidSale", { saleId: detail.sale.id, reason: response.reason });
      notify(`Ticket #${result.sale_number || detail.sale.sale_number} cancelado correctamente.`);
      await pos()?.refresh?.();
      const query = byId("fielTicketQuery");
      if (query) query.value = String(detail.sale.sale_number);
      byId("fielTicketSearch")?.click();
    } catch (error) { notify(error.message || "No se pudo cancelar el ticket.", true); }
  }

  async function returnImpact() {
    const query = String(byId("fielReturnQuery")?.value || "").trim().replace(/^#/, "");
    if (!query) return null;
    const found = await pos()?.api?.("findSale", { saleNumber: query });
    const sale = found?.sales?.[0];
    if (!sale) return null;
    const detail = await pos().api("saleDetail", { saleId: sale.id });
    const draft = [...document.querySelectorAll("[data-return-item]")].map((input) => ({ sale_item_id: input.dataset.returnItem, qty: Number(input.value) || 0, preview: (Number(input.value) || 0) * Number(input.dataset.returnPrice || 0) })).filter((item) => item.qty > 0);
    if (!draft.length) return { detail, draft: [], total: 0, stock: [] };
    const map = new Map((detail.items || []).map((item) => [String(item.id), item]));
    const stock = draft.map((line) => ({ ...line, source: map.get(String(line.sale_item_id)) })).filter((line) => line.source?.product_id && line.source?.inventory_applied !== false);
    return { detail, draft, total: draft.reduce((sum, item) => sum + item.preview, 0), stock };
  }

  async function confirmReturnWithImpact() {
    const button = byId("fielConfirmReturn");
    if (button?.disabled) return;
    try {
      const impact = await returnImpact();
      if (!impact?.detail?.sale) return notify("Busca un ticket finalizado.", true);
      if (!impact.draft.length) return notify("Selecciona al menos una cantidad para devolver.", true);
      const reason = String(byId("fielReturnReason")?.value || "").trim();
      if (!reason) { byId("fielReturnReason")?.focus(); return notify("Escribe el motivo de la devolución.", true); }
      const method = byId("fielRefundMethod")?.value || "cash";
      const methodText = { cash: "Salida de efectivo", card: "Reembolso a tarjeta", transfer: "Reembolso por transferencia", credit: "Reducción de deuda / saldo a crédito", other: "Otra devolución" }[method] || method;
      const stockQty = impact.stock.reduce((sum, line) => sum + line.qty, 0);
      const lines = impact.stock.length ? `<div class="solrakUx90Lines"><table><thead><tr><th>Producto</th><th>Stock que regresa</th></tr></thead><tbody>${impact.stock.map((line) => `<tr><td>${esc(line.source.name_snapshot)}</td><td>+${line.qty}</td></tr>`).join("")}</tbody></table></div>` : "";
      const response = await modal({ title: `Devolver Ticket #${impact.detail.sale.sale_number}`, danger: true, confirmText: "Registrar devolución · Enter", html: `<p class="solrakUx90Lead">Revisa el impacto antes de registrar la devolución. El historial original no se elimina.</p><div class="solrakUx90Impact"><div><span>Total a devolver</span><strong>${money(impact.total)}</strong></div><div><span>Inventario</span><strong>${stockQty ? `+${stockQty} unidad(es)` : "Sin cambios"}</strong></div><div><span>Forma</span><strong>${esc(methodText)}</strong></div></div>${method === "credit" ? `<p>El importe de <b>${money(impact.total)}</b> se aplicará contra el saldo del cliente.</p>` : method === "cash" ? `<p>La caja registrará una salida real de <b>${money(impact.total)}</b> y validará saldo suficiente.</p>` : ""}${lines}<p><b>Motivo:</b> ${esc(reason)}</p>` });
      if (!response?.confirmed) return;
      const result = await pos().api("returnSale", { saleId: impact.detail.sale.id, cashSessionId: pos()?.state?.openSession?.id || null, items: impact.draft.map(({ sale_item_id, qty }) => ({ sale_item_id, qty })), refundMethod: method, reason });
      notify(`Devolución registrada por ${money(result.total)}.`);
      byId("fielReturnSearch")?.click();
      await pos()?.refresh?.();
    } catch (error) { notify(error.message || "No se pudo registrar la devolución.", true); }
  }

  function bindCriticalActions() {
    const cancel = byId("fielCancelSale");
    if (cancel && cancel.dataset.solrakUx90 !== "1") { cancel.dataset.solrakUx90 = "1"; cancel.onclick = cancelSelectedSale; }
    const ret = byId("fielConfirmReturn");
    if (ret && ret.dataset.solrakUx90 !== "1") { ret.dataset.solrakUx90 = "1"; ret.onclick = confirmReturnWithImpact; }
  }

  function captureCriticalClicks(event) {
    const clear = event.target.closest?.("#posClear");
    if (clear) { event.preventDefault(); event.stopImmediatePropagation(); clearCurrentTicket(); return; }
    const close = event.target.closest?.("[data-close-ticket]");
    if (close) { event.preventDefault(); event.stopImmediatePropagation(); closeHeldTicket(close.dataset.closeTicket); }
  }

  function bindFocusRecovery() {
    document.addEventListener("solrak:pos-sale-complete", () => setTimeout(() => focusSearch(true), 30));
    document.addEventListener("close", (event) => { if (event.target?.tagName === "DIALOG") setTimeout(focusSearch, 0); }, true);
    document.addEventListener("click", (event) => {
      if (event.target.closest?.("[data-pos-product]")) setTimeout(focusSearch, 0);
      if (event.target.closest?.("[data-ticket]")) setTimeout(focusSearch, 0);
    }, true);
  }

  function mount() {
    document.documentElement.dataset[ROOT_FLAG] = "1";
    ensureStyle();
    ensureModal();
    ensureHotkeyLegend();
    enforceEightTickets();
    bindCriticalActions();
    applyEmptyStates();
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 20);
  }

  document.addEventListener("keydown", hotkeys, true);
  document.addEventListener("keydown", scannerFallback, true);
  document.addEventListener("click", captureCriticalClicks, true);
  bindFocusRecovery();
  new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
  mount();
  setInterval(() => { enforceEightTickets(); bindCriticalActions(); }, 250);

  window.SOLRAKUXV0190 = { version: VERSION, maxTickets: MAX_TICKETS, modal, focusSearch, mount, cancelSelectedSale, confirmReturnWithImpact };
})();