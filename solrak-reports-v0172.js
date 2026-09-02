(() => {
  "use strict";

  const VERSION = "0.1.72";
  const PANEL_ID = "tab-solrak-reports";
  const STYLE_ID = "solrakReportsV0172Style";
  const REPORTS = {
    summary: { label: "Resumen de Ventas" },
    detail: { label: "Detalle de Ventas" },
    payments: { label: "F.P. en Ventas" },
    inventory: { label: "Inventario" },
    movements: { label: "Historial Movimientos" },
    "best-sellers": { label: "Más Vendidos" },
  };
  const byId = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value ?? "").replace(/[&<>\"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[char]);
  const money = (value) => Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
  const number = (value, digits = 3) => Number(value || 0).toLocaleString("es-MX", {
    maximumFractionDigits: digits,
  });
  const cleanDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString("es-MX") : "—";
  };

  let activeKind = "summary";
  let lastResult = null;
  let loading = false;

  function notice(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else if (error) window.SOLRAKDialog?.notice?.(message,{error:true});
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID}{padding:0!important;background:#f5f6f7!important;min-height:calc(100vh - var(--fiel-top,58px));font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif;color:#303840}
.solrakReportHead{height:52px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;background:#fff;border-bottom:1px solid #d8dde1}.solrakReportHead h2{margin:0;font-size:17px;font-weight:600}.solrakReportActions{display:flex;gap:7px}.solrakReportBtn{min-height:32px;border:1px solid #cfd5da;border-radius:4px;background:#fff;padding:0 12px;font:600 11px/1 inherit;color:#46515b;cursor:pointer}.solrakReportBtn:hover{background:#f2f4f5}.solrakReportBtn.primary{border-color:#de6714;background:#e97618;color:#fff}.solrakReportBtn.primary:hover{background:#d86513}.solrakReportBtn:disabled{opacity:.55;cursor:not-allowed}
.solrakReportBody{padding:14px 16px 28px}.solrakReportFilters{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:9px;padding:12px;background:#fff;border:1px solid #d8dde1;border-radius:5px}.solrakReportField{display:grid;gap:5px;font-size:10px;font-weight:700;color:#616c76}.solrakReportField input,.solrakReportField select{width:100%;height:34px;border:1px solid #cfd5da;border-radius:4px;background:#fff;padding:0 8px;font:500 11px/1 inherit;color:#303840}.solrakReportPresets{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;padding-top:2px}.solrakReportPresets button{height:28px;border:1px solid #d4d9dd;border-radius:4px;background:#fafbfb;padding:0 10px;font:600 10px/1 inherit;cursor:pointer}.solrakReportPresets button:hover{background:#f0f2f3}.solrakReportAdvanced{display:contents}.solrakReportHidden{display:none!important}
.solrakReportCards{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:9px;margin:10px 0}.solrakReportCard{background:#fff;border:1px solid #d8dde1;border-radius:5px;padding:10px 12px}.solrakReportCard span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#77828b}.solrakReportCard strong{display:block;margin-top:5px;font-size:20px;font-weight:600;color:#28313a}.solrakReportMeta{display:flex;justify-content:space-between;gap:12px;margin:7px 1px;color:#78838c;font-size:10px}.solrakReportTableWrap{overflow:auto;background:#fff;border:1px solid #d8dde1;border-radius:5px;max-height:calc(100vh - 310px)}.solrakReportTable{width:100%;border-collapse:collapse;white-space:nowrap;font-size:10px}.solrakReportTable th{position:sticky;top:0;z-index:1;background:#f0f2f3;color:#4a555f;text-align:left;border-bottom:1px solid #d8dde1;padding:8px;font-weight:700}.solrakReportTable td{border-bottom:1px solid #eceff1;padding:7px 8px}.solrakReportTable tbody tr:hover{background:#fff8f2}.solrakReportTable td.num{text-align:right;font-variant-numeric:tabular-nums}.solrakReportEmpty{padding:44px 18px;text-align:center;color:#7c8790}.solrakReportLoading{padding:44px 18px;text-align:center;color:#6b7680}.solrakReportStatusBad{color:#a03c3c;font-weight:700}.solrakReportStatusGood{color:#287048;font-weight:700}
#solrakSaleMenuV0172{border-left-color:#e97618!important;font-weight:750!important}.solrakReportMenuActive{border-left-color:#e97618!important;background:#e2e4e5!important;color:#23282d!important;font-weight:700!important}
@media(max-width:1100px){.solrakReportFilters{grid-template-columns:repeat(3,minmax(120px,1fr))}.solrakReportCards{grid-template-columns:repeat(2,minmax(130px,1fr))}.solrakReportTableWrap{max-height:none}}@media(max-width:720px){.solrakReportHead{height:auto;min-height:52px;align-items:flex-start;flex-direction:column;padding:10px 12px}.solrakReportFilters{grid-template-columns:1fr 1fr}.solrakReportBody{padding:10px}.solrakReportCards{grid-template-columns:1fr 1fr}}
@media print{body>*:not(main.shell){display:none!important}#solrakFielSidebar,main.shell>.top{display:none!important}html[data-solrak-fiel="1"] main.shell{margin-left:0!important}#${PANEL_ID}{display:block!important;padding:0!important;background:#fff!important}.solrakReportHead{height:auto;padding:0 0 10px;border:0}.solrakReportActions,.solrakReportFilters{display:none!important}.solrakReportBody{padding:0}.solrakReportCards{grid-template-columns:repeat(5,1fr)}.solrakReportTableWrap{overflow:visible;max-height:none;border:0}.solrakReportTable{font-size:8px}.solrakReportTable th{position:static}.solrakReportMeta{margin:6px 0}}
`;
    document.head.appendChild(style);
  }

  function dateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function initialRange() {
    const today = new Date();
    return { from: dateInputValue(today), to: dateInputValue(today) };
  }

  function ensurePanel() {
    let panel = byId(PANEL_ID);
    if (panel) return panel;
    injectStyle();
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "tab-panel hidden";
    const range = initialRange();
    panel.innerHTML = `
      <div class="solrakReportHead"><h2 id="solrakReportTitle">Reportes</h2><div class="solrakReportActions"><button id="solrakReportSale" class="solrakReportBtn" type="button">Venta</button><button id="solrakReportPrint" class="solrakReportBtn" type="button">Imprimir</button><button id="solrakReportCsv" class="solrakReportBtn" type="button">Exportar CSV</button><button id="solrakReportRun" class="solrakReportBtn primary" type="button">Consultar</button></div></div>
      <div class="solrakReportBody">
        <div class="solrakReportFilters">
          <label class="solrakReportField" data-report-date><span>Desde</span><input id="solrakReportFrom" type="date" value="${range.from}"></label>
          <label class="solrakReportField" data-report-date><span>Hasta</span><input id="solrakReportTo" type="date" value="${range.to}"></label>
          <label class="solrakReportField"><span>Usuario</span><select id="solrakReportUser"><option value="">Todos</option></select></label>
          <label class="solrakReportField"><span>Categoría</span><select id="solrakReportCategory"><option value="">Todas</option></select></label>
          <label class="solrakReportField solrakReportAdvanced" data-report-filter="payment"><span>Forma de pago</span><select id="solrakReportPayment"><option value="">Todas</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="credit">Crédito</option><option value="platform">Plataforma</option><option value="dollars">Dólares</option><option value="other">Otro</option></select></label>
          <label class="solrakReportField solrakReportAdvanced" data-report-filter="existence"><span>Existencia</span><select id="solrakReportExistence"><option value="">Todas</option><option value="positive">Con existencia</option><option value="zero">En cero</option><option value="negative">Negativa</option><option value="low">Inventario bajo</option></select></label>
          <label class="solrakReportField solrakReportAdvanced" data-report-filter="movement"><span>Movimiento</span><select id="solrakReportMovement"><option value="">Todos</option></select></label>
          <label class="solrakReportField solrakReportAdvanced" data-report-filter="search"><span>Producto / código</span><input id="solrakReportSearch" type="search" maxlength="180" placeholder="Buscar producto"></label>
          <label class="solrakReportField solrakReportAdvanced" data-report-filter="order"><span>Orden</span><select id="solrakReportOrder"><option value="most">Más vendidos</option><option value="least">Menos vendidos</option></select></label>
          <label class="solrakReportField solrakReportAdvanced" data-report-filter="limit"><span>Límite</span><select id="solrakReportLimit"><option value="50">50</option><option value="100" selected>100</option><option value="250">250</option><option value="500">500</option></select></label>
          <div class="solrakReportPresets" data-report-date><button type="button" data-report-preset="today">Hoy</button><button type="button" data-report-preset="yesterday">Ayer</button><button type="button" data-report-preset="7days">7 días</button><button type="button" data-report-preset="month">Este mes</button></div>
        </div>
        <div id="solrakReportCards" class="solrakReportCards"></div>
        <div id="solrakReportMeta" class="solrakReportMeta"></div>
        <div id="solrakReportTable" class="solrakReportTableWrap"><div class="solrakReportEmpty">Selecciona un reporte.</div></div>
      </div>`;
    document.querySelector("main.shell")?.appendChild(panel);
    bindPanel(panel);
    return panel;
  }

  function setPreset(name) {
    const now = new Date();
    let from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let to = new Date(from);
    if (name === "yesterday") {
      from.setDate(from.getDate() - 1);
      to = new Date(from);
    } else if (name === "7days") {
      from.setDate(from.getDate() - 6);
    } else if (name === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    byId("solrakReportFrom").value = dateInputValue(from);
    byId("solrakReportTo").value = dateInputValue(to);
    loadReport();
  }

  function bindPanel(panel) {
    byId("solrakReportRun").onclick = loadReport;
    byId("solrakReportPrint").onclick = () => window.print();
    byId("solrakReportCsv").onclick = exportCsv;
    byId("solrakReportSale").onclick = openSale;
    panel.querySelectorAll("[data-report-preset]").forEach((button) => {
      button.onclick = () => setPreset(button.dataset.reportPreset);
    });
    panel.querySelectorAll("input,select").forEach((field) => {
      field.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          loadReport();
        }
      };
    });
  }

  function toggleFilters(kind) {
    document.querySelectorAll("[data-report-date]").forEach((node) => node.classList.toggle("solrakReportHidden", kind === "inventory"));
    const visible = {
      payment: kind === "payments",
      existence: kind === "inventory",
      movement: kind === "movements",
      search: kind === "inventory" || kind === "movements",
      order: kind === "best-sellers",
      limit: kind === "best-sellers",
    };
    document.querySelectorAll("[data-report-filter]").forEach((node) => {
      node.classList.toggle("solrakReportHidden", !visible[node.dataset.reportFilter]);
    });
  }

  function showOnlyPanel(panel) {
    document.querySelectorAll("main.shell .tab-panel").forEach((section) => section.classList.add("hidden"));
    panel.classList.remove("hidden");
    document.documentElement.dataset.fielActiveTab = "reportes-v0172";
  }

  function openReport(kind) {
    if (!REPORTS[kind]) return;
    activeKind = kind;
    const panel = ensurePanel();
    showOnlyPanel(panel);
    byId("solrakReportTitle").textContent = REPORTS[kind].label;
    toggleFilters(kind);
    markSidebar(kind);
    loadReport();
  }

  function openSale() {
    byId(PANEL_ID)?.classList.add("hidden");
    if (typeof window.switchTab === "function") window.switchTab("pos");
    else document.querySelector('.nav>button[data-tab="pos"]')?.click();
    document.documentElement.dataset.fielActiveTab = "pos";
    document.querySelectorAll("#solrakFielSidebar .fielMenuItem").forEach((button) => button.classList.remove("solrakReportMenuActive"));
    byId("solrakSaleMenuV0172")?.classList.add("active");
    setTimeout(() => byId("posSearch")?.focus(), 30);
  }

  function reportPayload() {
    const payload = { kind: activeKind };
    const fromValue = byId("solrakReportFrom")?.value;
    const toValue = byId("solrakReportTo")?.value;
    if (activeKind !== "inventory") {
      if (!fromValue || !toValue) throw new Error("Selecciona las fechas del reporte.");
      const from = new Date(`${fromValue}T00:00:00`);
      const to = new Date(`${toValue}T00:00:00`);
      to.setDate(to.getDate() + 1);
      payload.from = from.toISOString();
      payload.to = to.toISOString();
      payload.tzOffset = new Date().getTimezoneOffset();
    }
    const userId = byId("solrakReportUser")?.value || "";
    const category = byId("solrakReportCategory")?.value || "";
    if (userId) payload.userId = userId;
    if (category) payload.category = category;
    if (activeKind === "payments") {
      const method = byId("solrakReportPayment")?.value || "";
      if (method) payload.paymentMethod = method;
    }
    if (activeKind === "inventory") {
      const existence = byId("solrakReportExistence")?.value || "";
      const search = byId("solrakReportSearch")?.value.trim() || "";
      if (existence) payload.existence = existence;
      if (search) payload.productSearch = search;
    }
    if (activeKind === "movements") {
      const movementType = byId("solrakReportMovement")?.value || "";
      const search = byId("solrakReportSearch")?.value.trim() || "";
      if (movementType) payload.movementType = movementType;
      if (search) payload.productSearch = search;
    }
    if (activeKind === "best-sellers") {
      payload.order = byId("solrakReportOrder")?.value || "most";
      payload.limit = Number(byId("solrakReportLimit")?.value) || 100;
    }
    return payload;
  }

  async function apiReports(payload) {
    const api = window.FacturaRapidaPOS?.api;
    if (typeof api !== "function") throw new Error("El punto de venta todavía no está listo.");
    return api("reports", payload);
  }

  async function loadReport() {
    if (loading) return;
    loading = true;
    const run = byId("solrakReportRun");
    if (run) run.disabled = true;
    byId("solrakReportTable").innerHTML = '<div class="solrakReportLoading">Consultando datos reales del negocio…</div>';
    try {
      const result = await apiReports(reportPayload());
      lastResult = result;
      hydrateCatalogs(result.catalogs || {});
      renderResult(result);
    } catch (error) {
      lastResult = null;
      byId("solrakReportCards").innerHTML = "";
      byId("solrakReportMeta").innerHTML = "";
      byId("solrakReportTable").innerHTML = `<div class="solrakReportEmpty solrakReportStatusBad">${esc(error?.message || "No se pudo consultar el reporte.")}</div>`;
      notice(error?.message || "No se pudo consultar el reporte.", true);
    } finally {
      loading = false;
      if (run) run.disabled = false;
    }
  }

  function fillSelect(id, rows, emptyLabel) {
    const select = byId(id);
    if (!select) return;
    const selected = select.value;
    select.innerHTML = `<option value="">${esc(emptyLabel)}</option>` + rows.map((row) => `<option value="${esc(row.value)}">${esc(row.label)}</option>`).join("");
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function hydrateCatalogs(catalogs) {
    if (Array.isArray(catalogs.users)) fillSelect("solrakReportUser", catalogs.users.map((user) => ({ value: user.id, label: user.name })), "Todos");
    if (Array.isArray(catalogs.categories)) fillSelect("solrakReportCategory", catalogs.categories.map((category) => ({ value: category, label: category })), "Todas");
    if (Array.isArray(catalogs.movementTypes)) fillSelect("solrakReportMovement", catalogs.movementTypes.map((type) => ({ value: type, label: movementLabel(type) })), "Todos");
  }

  function movementLabel(type) {
    return ({ sale: "Venta", return: "Devolución", void: "Cancelación", adjustment: "Ajuste", import: "Importación", purchase: "Compra" })[type] || String(type || "Movimiento");
  }

  function renderCards(cards) {
    byId("solrakReportCards").innerHTML = cards.map((card) => `<div class="solrakReportCard"><span>${esc(card.label)}</span><strong>${esc(card.value)}</strong></div>`).join("");
  }

  function renderResult(result) {
    const generated = result.generatedAt ? new Date(result.generatedAt).toLocaleString("es-MX") : new Date().toLocaleString("es-MX");
    const rows = result.rows || result.periods || [];
    byId("solrakReportMeta").innerHTML = `<span>${rows.length.toLocaleString("es-MX")} registros visibles</span><span>Actualizado ${esc(generated)}</span>`;
    if (activeKind === "summary") return renderSummary(result);
    if (activeKind === "detail") return renderDetail(result);
    if (activeKind === "payments") return renderPayments(result);
    if (activeKind === "inventory") return renderInventory(result);
    if (activeKind === "movements") return renderMovements(result);
    return renderBestSellers(result);
  }

  function table(headers, rows) {
    const host = byId("solrakReportTable");
    if (!rows.length) {
      host.innerHTML = '<div class="solrakReportEmpty">No hay registros con estos filtros.</div>';
      return;
    }
    host.innerHTML = `<table class="solrakReportTable"><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }

  function renderSummary(result) {
    const t = result.totals || {};
    renderCards([
      { label: "Ventas", value: money(t.sales) },
      { label: "Devoluciones", value: money(t.returns) },
      { label: "Cancelaciones", value: money(t.cancellations) },
      { label: "Venta neta", value: money(t.net) },
      { label: "Utilidad", value: money(t.profit) },
    ]);
    table(["Fecha", "Ventas", "Devoluciones", "Cancelaciones", "Neto", "Utilidad"], (result.periods || []).map((row) => `<tr><td>${esc(row.period)}</td><td class="num">${money(row.sales)}</td><td class="num">${money(row.returns)}</td><td class="num">${money(row.cancellations)}</td><td class="num">${money(row.net)}</td><td class="num">${money(row.profit)}</td></tr>`));
  }

  function renderDetail(result) {
    const t = result.totals || {};
    renderCards([
      { label: "Venta neta", value: money(t.net) },
      { label: "Utilidad", value: money(t.profit) },
      { label: "Tickets", value: number(t.tickets, 0) },
      { label: "Devoluciones", value: money(t.returns) },
      { label: "Cancelaciones", value: money(t.cancellations) },
    ]);
    table(["Ticket", "Fecha", "Código", "Producto", "Categoría", "Costo", "Mayoreo", "Precio lista", "Desc. %", "Precio venta", "Cantidad", "Devuelto", "Unidad", "Total", "Usuario"], (result.rows || []).map((row) => `<tr><td>#${esc(row.ticket)}</td><td>${esc(cleanDate(row.date))}</td><td>${esc(row.code)}</td><td>${esc(row.product)}</td><td>${esc(row.category)}</td><td class="num">${money(row.cost)}</td><td class="num">${money(row.wholesale)}</td><td class="num">${money(row.list_price)}</td><td class="num">${number(row.discount_percent, 2)}%</td><td class="num">${money(row.unit_price)}</td><td class="num">${number(row.quantity)}</td><td class="num">${number(row.returned_quantity)}</td><td>${esc(row.unit)}</td><td class="num">${money(row.total)}</td><td>${esc(row.user_name)}</td></tr>`));
  }

  function renderPayments(result) {
    const t = result.totals || {};
    renderCards([
      { label: "Efectivo", value: money(t.cash) },
      { label: "Tarjeta", value: money(t.card) },
      { label: "Transferencia", value: money(t.transfer) },
      { label: "Crédito", value: money(t.credit) },
      { label: "Total", value: money(t.total) },
    ]);
    table(["Ticket", "Fecha", "Usuario", "Efectivo", "Tarjeta", "Transferencia", "Crédito", "Plataforma", "Dólares", "Otro", "Total"], (result.rows || []).map((row) => `<tr><td>#${esc(row.ticket)}</td><td>${esc(cleanDate(row.date))}</td><td>${esc(row.user_name)}</td><td class="num">${money(row.cash)}</td><td class="num">${money(row.card)}</td><td class="num">${money(row.transfer)}</td><td class="num">${money(row.credit)}</td><td class="num">${money(row.platform)}</td><td class="num">${money(row.dollars)}</td><td class="num">${money(row.other)}</td><td class="num">${money(row.total)}</td></tr>`));
  }

  function renderInventory(result) {
    const t = result.totals || {};
    renderCards([
      { label: "Unidades", value: number(t.units) },
      { label: "Valor costo", value: money(t.cost) },
      { label: "Valor mayoreo", value: money(t.wholesale) },
      { label: "Valor público", value: money(t.public) },
      { label: "Productos", value: number((result.rows || []).length, 0) },
    ]);
    table(["Código", "Producto", "Categoría", "Costo", "Mayoreo", "Público", "Existencia", "Mínimo", "Unidad", "Estado"], (result.rows || []).map((row) => `<tr><td>${esc(row.code)}</td><td>${esc(row.name)}</td><td>${esc(row.category || "Sin categoría")}</td><td class="num">${money(row.cost)}</td><td class="num">${money(row.wholesale)}</td><td class="num">${money(row.price)}</td><td class="num">${number(row.stock)}</td><td class="num">${number(row.min_stock)}</td><td>${esc(row.unit)}</td><td class="${row.active === false ? "solrakReportStatusBad" : "solrakReportStatusGood"}">${row.active === false ? "Inactivo" : "Activo"}</td></tr>`));
  }

  function renderMovements(result) {
    const t = result.totals || {};
    renderCards([
      { label: "Movimientos", value: number(t.movements, 0) },
      { label: "Entradas", value: number(t.entries) },
      { label: "Salidas", value: number(t.exits) },
      { label: "Periodo", value: `${byId("solrakReportFrom")?.value || "—"} → ${byId("solrakReportTo")?.value || "—"}` },
      { label: "Productos", value: number(new Set((result.rows || []).map((row) => row.product_id)).size, 0) },
    ]);
    table(["Fecha", "Código", "Producto", "Categoría", "Movimiento", "Cantidad", "Antes", "Después", "Usuario", "Descripción"], (result.rows || []).map((row) => `<tr><td>${esc(cleanDate(row.created_at))}</td><td>${esc(row.product_code)}</td><td>${esc(row.product_name)}</td><td>${esc(row.category)}</td><td>${esc(movementLabel(row.movement_type))}</td><td class="num">${number(row.quantity_delta)}</td><td class="num">${number(row.stock_before)}</td><td class="num">${number(row.stock_after)}</td><td>${esc(row.user_name)}</td><td>${esc(row.description)}</td></tr>`));
  }

  function renderBestSellers(result) {
    const t = result.totals || {};
    renderCards([
      { label: "Productos", value: number(t.products, 0) },
      { label: "Cantidad", value: number(t.quantity) },
      { label: "Ventas", value: money(t.sales) },
      { label: "Orden", value: byId("solrakReportOrder")?.value === "least" ? "Menos vendidos" : "Más vendidos" },
      { label: "Límite", value: byId("solrakReportLimit")?.value || "100" },
    ]);
    table(["Código", "Producto", "Categoría", "Cantidad", "Ventas", "Estado"], (result.rows || []).map((row) => `<tr><td>${esc(row.code)}</td><td>${esc(row.product)}</td><td>${esc(row.category)}</td><td class="num">${number(row.quantity)}</td><td class="num">${money(row.sales)}</td><td class="${row.active === false ? "solrakReportStatusBad" : "solrakReportStatusGood"}">${row.active === false ? "Inactivo" : "Activo"}</td></tr>`));
  }

  function csvValue(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function csvMatrix(result) {
    if (activeKind === "summary") return [["Fecha", "Ventas", "Devoluciones", "Cancelaciones", "Neto", "Utilidad"], ...(result.periods || []).map((r) => [r.period, r.sales, r.returns, r.cancellations, r.net, r.profit])];
    if (activeKind === "detail") return [["Ticket", "Fecha", "Código", "Producto", "Categoría", "Costo", "Mayoreo", "Precio lista", "Descuento %", "Precio venta", "Cantidad", "Devuelto", "Unidad", "Total", "Usuario"], ...(result.rows || []).map((r) => [r.ticket, r.date, r.code, r.product, r.category, r.cost, r.wholesale, r.list_price, r.discount_percent, r.unit_price, r.quantity, r.returned_quantity, r.unit, r.total, r.user_name])];
    if (activeKind === "payments") return [["Ticket", "Fecha", "Usuario", "Efectivo", "Tarjeta", "Transferencia", "Crédito", "Plataforma", "Dólares", "Otro", "Total"], ...(result.rows || []).map((r) => [r.ticket, r.date, r.user_name, r.cash, r.card, r.transfer, r.credit, r.platform, r.dollars, r.other, r.total])];
    if (activeKind === "inventory") return [["Código", "Producto", "Categoría", "Costo", "Mayoreo", "Público", "Existencia", "Mínimo", "Unidad", "Activo"], ...(result.rows || []).map((r) => [r.code, r.name, r.category, r.cost, r.wholesale, r.price, r.stock, r.min_stock, r.unit, r.active !== false])];
    if (activeKind === "movements") return [["Fecha", "Código", "Producto", "Categoría", "Movimiento", "Cantidad", "Antes", "Después", "Usuario", "Descripción"], ...(result.rows || []).map((r) => [r.created_at, r.product_code, r.product_name, r.category, r.movement_type, r.quantity_delta, r.stock_before, r.stock_after, r.user_name, r.description])];
    return [["Código", "Producto", "Categoría", "Cantidad", "Ventas", "Activo"], ...(result.rows || []).map((r) => [r.code, r.product, r.category, r.quantity, r.sales, r.active !== false])];
  }

  function exportCsv() {
    if (!lastResult) {
      notice("Consulta el reporte antes de exportar.", true);
      return;
    }
    const csv = "\ufeff" + csvMatrix(lastResult).map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SOLRAK_${activeKind}_${dateInputValue(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reportButtonByLabel(label) {
    return [...document.querySelectorAll('#solrakFielSidebar [data-fiel-submenu="reports"] .fielMenuItem')].find((button) => button.textContent.trim() === label);
  }

  function markSidebar(kind) {
    document.querySelectorAll("#solrakFielSidebar .fielMenuItem").forEach((button) => {
      button.classList.remove("solrakReportMenuActive", "active");
    });
    reportButtonByLabel(REPORTS[kind].label)?.classList.add("solrakReportMenuActive");
    const group = document.querySelector('#solrakFielSidebar [data-fiel-group="reports"]');
    const submenu = document.querySelector('#solrakFielSidebar [data-fiel-submenu="reports"]');
    group?.setAttribute("aria-expanded", "true");
    submenu?.classList.add("open");
  }

  function installSidebar() {
    const sidebar = byId("solrakFielSidebar");
    if (!sidebar) return false;
    const menu = sidebar.querySelector(".fielMenu");
    if (!menu) return false;
    if (!byId("solrakSaleMenuV0172")) {
      const sale = document.createElement("button");
      sale.id = "solrakSaleMenuV0172";
      sale.className = "fielMenuItem";
      sale.type = "button";
      sale.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4zM7 9h10M7 13h7"/></svg><span>Venta</span>';
      sale.onclick = openSale;
      menu.insertBefore(sale, menu.firstElementChild);
    }
    Object.entries(REPORTS).forEach(([kind, config]) => {
      const button = reportButtonByLabel(config.label);
      if (!button) return;
      button.dataset.solrakReportKind = kind;
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openReport(kind);
      };
    });
    return true;
  }

  function boot() {
    ensurePanel();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installSidebar() || attempts > 30) clearInterval(timer);
    }, 250);
    setTimeout(installSidebar, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKReportsV0172 = {
    version: VERSION,
    open: openReport,
    openSale,
    refresh: loadReport,
    get activeKind() { return activeKind; },
    get lastResult() { return lastResult; },
  };
})();