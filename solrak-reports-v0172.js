(() => {
  "use strict";

  const VERSION = "0.1.72";
  const STYLE_ID = "solrakReportsV0172Style";
  const PANEL_ID = "solrakReportsV0172Panel";
  const REPORTS = {
    "Resumen de Ventas": { kind: "summary", title: "Resumen de Ventas" },
    "Detalle de Ventas": { kind: "detail", title: "Detalle de Ventas" },
    "F.P. en Ventas": { kind: "payments", title: "Formas de Pago en Ventas" },
    Inventario: { kind: "inventory", title: "Inventario" },
    "Historial Movimientos": { kind: "movements", title: "Historial de Movimientos" },
    "Más Vendidos": { kind: "best-sellers", title: "Productos Más Vendidos" },
  };

  const byId = (id) => document.getElementById(id);
  const clean = (value) => String(value ?? "").trim();
  const esc = (value) =>
    String(value ?? "").replace(/[&<>\"]/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[char],
    );
  const money = (value) =>
    Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const number = (value, digits = 2) =>
    Number(value || 0).toLocaleString("es-MX", {
      maximumFractionDigits: digits,
    });
  const dateTime = (value) => {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleString("es-MX") : "—";
  };
  const dateOnly = (value) => {
    const d = new Date(`${value}T12:00:00`);
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" })
      : clean(value) || "—";
  };

  let activeKind = "summary";
  let lastResult = null;
  let patchedSidebar = null;

  function notify(message, error = false) {
    if (typeof window.notice === "function") return window.notice(message, error);
    if (error) console.error(message);
    else console.log(message);
  }

  function icon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID}{position:fixed;z-index:7600;left:246px;top:58px;right:0;bottom:0;display:none;overflow:auto;background:#f6f7f8;color:#30373d;font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif}
#${PANEL_ID}.open{display:block}.sr72Head{position:sticky;z-index:3;top:0;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;border-bottom:1px solid #d9dde1;background:#fff}.sr72Head h2{margin:0;font-size:18px;font-weight:600}.sr72HeadActions{display:flex;gap:7px;flex-wrap:wrap}.sr72Btn{min-height:34px;padding:0 12px;border:1px solid #cdd3d8;border-radius:5px;background:#fff;color:#414950;font-weight:650;cursor:pointer}.sr72Btn:hover{background:#f1f3f4}.sr72Btn.primary{border-color:#d45f0f;background:#e97618;color:#fff}.sr72Btn.primary:hover{background:#cf6014}.sr72Btn:disabled{opacity:.55;cursor:not-allowed}.sr72Body{padding:14px 18px 28px}.sr72Filters{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:8px;align-items:end;padding:12px;border:1px solid #d9dde1;background:#fff}.sr72Filter{display:grid;gap:4px;font-size:10px;font-weight:700;text-transform:uppercase;color:#66717a}.sr72Filter input,.sr72Filter select{height:34px;min-width:0;border:1px solid #cfd5da;border-radius:4px;background:#fff;padding:0 8px;color:#30373d;font:500 12px/1 inherit;text-transform:none}.sr72Filter.wide{grid-column:span 2}.sr72ActionCell{display:flex;gap:7px}.sr72Status{min-height:24px;padding:8px 0 3px;color:#69747d;font-size:12px}.sr72Status.error{color:#b13b35}.sr72Cards{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:8px;margin:10px 0}.sr72Card{min-height:72px;padding:10px 12px;border:1px solid #d9dde1;border-radius:5px;background:#fff}.sr72Card small{display:block;color:#7a858e;font-size:10px;text-transform:uppercase}.sr72Card strong{display:block;margin-top:7px;color:#26313a;font-size:20px;font-weight:700}.sr72TableWrap{overflow:auto;border:1px solid #d9dde1;background:#fff}.sr72Table{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}.sr72Table th{position:sticky;top:0;z-index:1;padding:8px 9px;border-bottom:1px solid #cfd5da;background:#eef0f2;color:#56616a;text-align:left;font-size:10px;text-transform:uppercase}.sr72Table td{padding:7px 9px;border-bottom:1px solid #eceff1}.sr72Table tbody tr:hover{background:#fff8ef}.sr72Table td.num,.sr72Table th.num{text-align:right}.sr72Empty{padding:28px;text-align:center;color:#7b868f}.sr72SummaryTitle{margin:12px 0 7px;font-size:12px;font-weight:750}.sr72SaleMenu{font-weight:800!important}.sr72Loading{opacity:.65;pointer-events:none}
@media(max-width:1100px){#${PANEL_ID}{left:0}.sr72Filters{grid-template-columns:repeat(3,minmax(120px,1fr))}.sr72Cards{grid-template-columns:repeat(3,minmax(120px,1fr))}}
@media(max-width:700px){.sr72Filters{grid-template-columns:1fr 1fr}.sr72Filter.wide{grid-column:1/-1}.sr72Cards{grid-template-columns:1fr 1fr}.sr72Head{align-items:flex-start;padding:9px 12px;flex-direction:column}.sr72HeadActions{width:100%}}
@media print{#solrakFielSidebar,main.shell>.top,.sr72HeadActions,.sr72Filters,.sr72Status{display:none!important}#${PANEL_ID}{position:static!important;display:block!important;overflow:visible!important;background:#fff!important}.sr72Body{padding:0!important}.sr72TableWrap{overflow:visible!important}.sr72Table th{position:static!important}}
`;
    document.head.appendChild(style);
  }

  function isoDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function defaultRange() {
    const now = new Date();
    return {
      from: isoDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: isoDateInput(now),
    };
  }

  function ensurePanel() {
    injectStyle();
    let panel = byId(PANEL_ID);
    if (panel) return panel;
    const range = defaultRange();
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <div class="sr72Head">
        <h2 id="sr72Title">Resumen de Ventas</h2>
        <div class="sr72HeadActions">
          <button id="sr72Export" class="sr72Btn" type="button">Exportar CSV</button>
          <button id="sr72Print" class="sr72Btn" type="button">Imprimir</button>
          <button id="sr72Close" class="sr72Btn" type="button">Cerrar</button>
        </div>
      </div>
      <div class="sr72Body">
        <div class="sr72Filters">
          <label class="sr72Filter" data-filter="dates">Desde<input id="sr72From" type="date" value="${range.from}"></label>
          <label class="sr72Filter" data-filter="dates">Hasta<input id="sr72To" type="date" value="${range.to}"></label>
          <label class="sr72Filter">Categoría<select id="sr72Category"><option value="">Todas</option></select></label>
          <label class="sr72Filter" data-filter="user">Usuario<select id="sr72User"><option value="">Todos</option></select></label>
          <label class="sr72Filter" data-filter="payment">Forma de pago<select id="sr72Payment"><option value="">Todas</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="credit">Crédito</option><option value="platform">Plataforma</option><option value="dollars">Dólares</option><option value="other">Otro</option></select></label>
          <label class="sr72Filter" data-filter="movement">Movimiento<select id="sr72Movement"><option value="">Todos</option></select></label>
          <label class="sr72Filter wide" data-filter="search">Producto / código<input id="sr72Search" maxlength="180" placeholder="Buscar producto"></label>
          <label class="sr72Filter" data-filter="existence">Existencia<select id="sr72Existence"><option value="">Todas</option><option value="positive">Con existencia</option><option value="zero">En cero</option><option value="negative">Negativa</option><option value="low">Inventario bajo</option></select></label>
          <label class="sr72Filter" data-filter="order">Orden<select id="sr72Order"><option value="most">Más vendidos</option><option value="least">Menos vendidos</option></select></label>
          <label class="sr72Filter" data-filter="limit">Límite<select id="sr72Limit"><option>50</option><option selected>100</option><option>250</option><option>500</option></select></label>
          <div class="sr72ActionCell"><button id="sr72Run" class="sr72Btn primary" type="button">Consultar</button></div>
        </div>
        <div id="sr72Status" class="sr72Status"></div>
        <div id="sr72Content"></div>
      </div>`;
    document.body.appendChild(panel);
    byId("sr72Close").onclick = closeReport;
    byId("sr72Run").onclick = runReport;
    byId("sr72Print").onclick = () => window.print();
    byId("sr72Export").onclick = exportCsv;
    return panel;
  }

  function setFilterVisibility(kind) {
    const visible = new Set(["category"]);
    if (kind !== "inventory") visible.add("dates");
    if (["summary", "detail", "payments", "movements", "best-sellers"].includes(kind)) visible.add("user");
    if (kind === "payments") visible.add("payment");
    if (kind === "movements") visible.add("movement");
    if (["detail", "inventory", "movements", "best-sellers"].includes(kind)) visible.add("search");
    if (kind === "inventory") visible.add("existence");
    if (kind === "best-sellers") {
      visible.add("order");
      visible.add("limit");
    }
    document.querySelectorAll(`#${PANEL_ID} [data-filter]`).forEach((node) => {
      node.style.display = visible.has(node.dataset.filter) ? "grid" : "none";
    });
  }

  function payloadFor(kind) {
    const fromText = byId("sr72From")?.value;
    const toText = byId("sr72To")?.value;
    const payload = {
      kind,
      category: byId("sr72Category")?.value || "",
      userId: byId("sr72User")?.value || "",
      productSearch: byId("sr72Search")?.value.trim() || "",
      tzOffset: new Date().getTimezoneOffset(),
    };
    if (kind !== "inventory") {
      if (!fromText || !toText) throw new Error("Selecciona las fechas del reporte.");
      const from = new Date(`${fromText}T00:00:00`);
      const to = new Date(`${toText}T00:00:00`);
      to.setDate(to.getDate() + 1);
      if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()))
        throw new Error("Selecciona un intervalo de fechas válido.");
      payload.from = from.toISOString();
      payload.to = to.toISOString();
    }
    if (kind === "payments") payload.paymentMethod = byId("sr72Payment")?.value || "";
    if (kind === "movements") payload.movementType = byId("sr72Movement")?.value || "";
    if (kind === "inventory") payload.existence = byId("sr72Existence")?.value || "";
    if (kind === "best-sellers") {
      payload.order = byId("sr72Order")?.value || "most";
      payload.limit = Number(byId("sr72Limit")?.value) || 100;
    }
    return payload;
  }

  function fillSelect(id, rows, valueKey = "id", labelKey = "name") {
    const select = byId(id);
    if (!select) return;
    const current = select.value;
    const first = select.options[0]?.outerHTML || '<option value="">Todos</option>';
    select.innerHTML = first + (rows || []).map((row) => `<option value="${esc(row[valueKey])}">${esc(row[labelKey])}</option>`).join("");
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function applyCatalogs(result) {
    fillSelect("sr72User", result?.catalogs?.users || []);
    fillSelect(
      "sr72Category",
      (result?.catalogs?.categories || []).map((name) => ({ id: name, name })),
    );
    fillSelect(
      "sr72Movement",
      (result?.catalogs?.movementTypes || []).map((name) => ({ id: name, name })),
    );
  }

  function card(label, value) {
    return `<div class="sr72Card"><small>${esc(label)}</small><strong>${value}</strong></div>`;
  }

  function table(headers, rows) {
    if (!rows?.length) return '<div class="sr72TableWrap"><div class="sr72Empty">No hay registros para los filtros seleccionados.</div></div>';
    return `<div class="sr72TableWrap"><table class="sr72Table"><thead><tr>${headers.map((header) => `<th class="${header.num ? "num" : ""}">${esc(header.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td class="${header.num ? "num" : ""}">${header.render ? header.render(row) : esc(row[header.key] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function renderSummary(result) {
    const totals = result.totals || {};
    return `<div class="sr72Cards">${card("Ventas", money(totals.sales))}${card("Devoluciones", money(totals.returns))}${card("Cancelaciones", money(totals.cancellations))}${card("Venta neta", money(totals.net))}${card("Utilidad", money(totals.profit))}</div><div class="sr72SummaryTitle">${number(totals.tickets, 0)} tickets</div>${table(
      [
        { label: "Fecha", key: "period", render: (r) => esc(dateOnly(r.period)) },
        { label: "Ventas", num: true, render: (r) => money(r.sales) },
        { label: "Devoluciones", num: true, render: (r) => money(r.returns) },
        { label: "Cancelaciones", num: true, render: (r) => money(r.cancellations) },
        { label: "Neto", num: true, render: (r) => money(r.net) },
        { label: "Utilidad", num: true, render: (r) => money(r.profit) },
      ],
      result.periods || [],
    )}`;
  }

  function renderDetail(result) {
    return `<div class="sr72Cards">${card("Venta neta", money(result.totals?.net))}${card("Utilidad", money(result.totals?.profit))}${card("Tickets", number(result.totals?.tickets, 0))}</div>${table(
      [
        { label: "Ticket", render: (r) => `#${esc(r.ticket)}` },
        { label: "Fecha", render: (r) => esc(dateTime(r.date)) },
        { label: "Código", key: "code" },
        { label: "Producto", key: "product" },
        { label: "Categoría", key: "category" },
        { label: "Cant.", num: true, render: (r) => number(r.quantity, 3) },
        { label: "Devuelto", num: true, render: (r) => number(r.returned_quantity, 3) },
        { label: "Costo", num: true, render: (r) => money(r.cost) },
        { label: "P. lista", num: true, render: (r) => money(r.list_price) },
        { label: "P. venta", num: true, render: (r) => money(r.unit_price) },
        { label: "Descuento", num: true, render: (r) => money(r.discount) },
        { label: "Total", num: true, render: (r) => money(r.total) },
        { label: "Usuario", key: "user_name" },
      ],
      result.rows || [],
    )}`;
  }

  function renderPayments(result) {
    const t = result.totals || {};
    return `<div class="sr72Cards">${card("Efectivo", money(t.cash))}${card("Tarjeta", money(t.card))}${card("Transferencia", money(t.transfer))}${card("Crédito", money(t.credit))}${card("Total", money(t.total))}</div>${table(
      [
        { label: "Ticket", render: (r) => `#${esc(r.ticket)}` },
        { label: "Fecha", render: (r) => esc(dateTime(r.date)) },
        { label: "Efectivo", num: true, render: (r) => money(r.cash) },
        { label: "Tarjeta", num: true, render: (r) => money(r.card) },
        { label: "Transferencia", num: true, render: (r) => money(r.transfer) },
        { label: "Crédito", num: true, render: (r) => money(r.credit) },
        { label: "Plataforma", num: true, render: (r) => money(r.platform) },
        { label: "Dólares", num: true, render: (r) => money(r.dollars) },
        { label: "Otro", num: true, render: (r) => money(r.other) },
        { label: "Total", num: true, render: (r) => money(r.total) },
        { label: "Usuario", key: "user_name" },
      ],
      result.rows || [],
    )}`;
  }

  function renderInventory(result) {
    const t = result.totals || {};
    return `<div class="sr72Cards">${card("Unidades", number(t.units, 3))}${card("Costo inventario", money(t.cost))}${card("Mayoreo", money(t.wholesale))}${card("Público", money(t.public))}</div>${table(
      [
        { label: "Código", key: "code" },
        { label: "Producto", key: "name" },
        { label: "Categoría", key: "category" },
        { label: "Existencia", num: true, render: (r) => number(r.stock, 3) },
        { label: "Mínimo", num: true, render: (r) => number(r.min_stock, 3) },
        { label: "Unidad", key: "unit" },
        { label: "Costo", num: true, render: (r) => money(r.cost) },
        { label: "Mayoreo", num: true, render: (r) => money(r.wholesale) },
        { label: "Público", num: true, render: (r) => money(r.price) },
        { label: "Estado", render: (r) => (r.active === false ? "Inactivo" : "Activo") },
      ],
      result.rows || [],
    )}`;
  }

  function renderMovements(result) {
    const t = result.totals || {};
    return `<div class="sr72Cards">${card("Movimientos", number(t.movements, 0))}${card("Entradas", number(t.entries, 3))}${card("Salidas", number(t.exits, 3))}</div>${table(
      [
        { label: "Fecha", render: (r) => esc(dateTime(r.created_at)) },
        { label: "Código", key: "product_code" },
        { label: "Producto", key: "product_name" },
        { label: "Categoría", key: "category" },
        { label: "Movimiento", key: "movement_type" },
        { label: "Cantidad", num: true, render: (r) => number(r.quantity_delta, 3) },
        { label: "Antes", num: true, render: (r) => number(r.stock_before, 3) },
        { label: "Después", num: true, render: (r) => number(r.stock_after, 3) },
        { label: "Descripción", key: "description" },
        { label: "Usuario", key: "user_name" },
      ],
      result.rows || [],
    )}`;
  }

  function renderBestSellers(result) {
    const t = result.totals || {};
    return `<div class="sr72Cards">${card("Productos", number(t.products, 0))}${card("Unidades", number(t.quantity, 3))}${card("Ventas", money(t.sales))}</div>${table(
      [
        { label: "Código", key: "code" },
        { label: "Producto", key: "product" },
        { label: "Categoría", key: "category" },
        { label: "Cantidad", num: true, render: (r) => number(r.quantity, 3) },
        { label: "Ventas", num: true, render: (r) => money(r.sales) },
        { label: "Estado", render: (r) => (r.active === false ? "Inactivo" : "Activo") },
      ],
      result.rows || [],
    )}`;
  }

  function renderResult(result) {
    const content = byId("sr72Content");
    if (!content) return;
    if (activeKind === "summary") content.innerHTML = renderSummary(result);
    else if (activeKind === "detail") content.innerHTML = renderDetail(result);
    else if (activeKind === "payments") content.innerHTML = renderPayments(result);
    else if (activeKind === "inventory") content.innerHTML = renderInventory(result);
    else if (activeKind === "movements") content.innerHTML = renderMovements(result);
    else content.innerHTML = renderBestSellers(result);
  }

  async function runReport() {
    const panel = ensurePanel();
    const status = byId("sr72Status");
    const run = byId("sr72Run");
    const api = window.FacturaRapidaPOS?.api;
    if (typeof api !== "function") {
      notify("El servicio del punto de venta todavía no está listo.", true);
      return;
    }
    panel.classList.add("sr72Loading");
    if (run) run.disabled = true;
    if (status) {
      status.className = "sr72Status";
      status.textContent = "Consultando datos reales…";
    }
    try {
      const result = await api("reports", payloadFor(activeKind));
      lastResult = result;
      applyCatalogs(result);
      renderResult(result);
      if (status) status.textContent = `Actualizado ${new Date().toLocaleTimeString("es-MX")} · ${result.rows?.length ?? result.periods?.length ?? 0} registros`;
    } catch (error) {
      lastResult = null;
      if (byId("sr72Content")) byId("sr72Content").innerHTML = "";
      if (status) {
        status.className = "sr72Status error";
        status.textContent = error?.message || "No se pudo generar el reporte.";
      }
      notify(error?.message || "No se pudo generar el reporte.", true);
    } finally {
      panel.classList.remove("sr72Loading");
      if (run) run.disabled = false;
    }
  }

  function openReport(kind, title) {
    activeKind = kind;
    const panel = ensurePanel();
    panel.classList.add("open");
    byId("sr72Title").textContent = title;
    setFilterVisibility(kind);
    document.querySelectorAll("#solrakFielSidebar .fielMenuItem").forEach((button) => button.classList.remove("active"));
    document.querySelector(`#solrakFielSidebar [data-sr72-report="${kind}"]`)?.classList.add("active");
    const reports = document.querySelector('[data-fiel-group="reports"]');
    reports?.setAttribute("aria-expanded", "true");
    document.querySelector('[data-fiel-submenu="reports"]')?.classList.add("open");
    runReport();
  }

  function closeReport() {
    byId(PANEL_ID)?.classList.remove("open");
  }

  function openSale() {
    closeReport();
    if (typeof window.switchTab === "function") window.switchTab("pos");
    else document.querySelector('.nav>button[data-tab="pos"]')?.click();
    document.documentElement.dataset.fielActiveTab = "pos";
    document.querySelectorAll("#solrakFielSidebar .fielMenuItem").forEach((button) => button.classList.toggle("active", button.classList.contains("sr72SaleMenu")));
    setTimeout(() => byId("posSearch")?.focus(), 20);
  }

  function patchSidebar() {
    const sidebar = byId("solrakFielSidebar");
    if (!sidebar) return false;
    if (patchedSidebar !== sidebar) patchedSidebar = sidebar;
    const menu = sidebar.querySelector(".fielMenu");
    if (!menu) return false;

    if (!sidebar.querySelector(".sr72SaleMenu")) {
      const sale = document.createElement("button");
      sale.className = "fielMenuItem sr72SaleMenu";
      sale.type = "button";
      sale.dataset.tabTarget = "pos";
      sale.innerHTML = `${icon('<path d="M3 6h2l2 10h10l3-7H7M9 20h.01M17 20h.01"/>')}<span>Venta</span>`;
      sale.onclick = openSale;
      menu.insertBefore(sale, menu.firstElementChild);
    }

    const submenu = sidebar.querySelector('[data-fiel-submenu="reports"]');
    if (submenu) {
      submenu.querySelectorAll(".fielMenuItem").forEach((button) => {
        const label = clean(button.textContent);
        const config = REPORTS[label];
        if (!config) return;
        button.dataset.sr72Report = config.kind;
        button.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          submenu.querySelectorAll(".fielMenuItem").forEach((node) => node.classList.remove("active"));
          button.classList.add("active");
          openReport(config.kind, config.title);
        };
      });
    }
    return true;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportRows() {
    const result = lastResult;
    if (!result) return null;
    if (activeKind === "summary") return {
      headers: ["Fecha", "Ventas", "Devoluciones", "Cancelaciones", "Neto", "Utilidad"],
      rows: (result.periods || []).map((r) => [r.period, r.sales, r.returns, r.cancellations, r.net, r.profit]),
    };
    if (activeKind === "detail") return {
      headers: ["Ticket", "Fecha", "Código", "Producto", "Categoría", "Cantidad", "Devuelto", "Costo", "Precio lista", "Precio venta", "Descuento", "Total", "Usuario"],
      rows: (result.rows || []).map((r) => [r.ticket, r.date, r.code, r.product, r.category, r.quantity, r.returned_quantity, r.cost, r.list_price, r.unit_price, r.discount, r.total, r.user_name]),
    };
    if (activeKind === "payments") return {
      headers: ["Ticket", "Fecha", "Efectivo", "Tarjeta", "Transferencia", "Crédito", "Plataforma", "Dólares", "Otro", "Total", "Usuario"],
      rows: (result.rows || []).map((r) => [r.ticket, r.date, r.cash, r.card, r.transfer, r.credit, r.platform, r.dollars, r.other, r.total, r.user_name]),
    };
    if (activeKind === "inventory") return {
      headers: ["Código", "Producto", "Categoría", "Existencia", "Mínimo", "Unidad", "Costo", "Mayoreo", "Público", "Activo"],
      rows: (result.rows || []).map((r) => [r.code, r.name, r.category, r.stock, r.min_stock, r.unit, r.cost, r.wholesale, r.price, r.active !== false]),
    };
    if (activeKind === "movements") return {
      headers: ["Fecha", "Código", "Producto", "Categoría", "Movimiento", "Cantidad", "Antes", "Después", "Descripción", "Usuario"],
      rows: (result.rows || []).map((r) => [r.created_at, r.product_code, r.product_name, r.category, r.movement_type, r.quantity_delta, r.stock_before, r.stock_after, r.description, r.user_name]),
    };
    return {
      headers: ["Código", "Producto", "Categoría", "Cantidad", "Ventas", "Activo"],
      rows: (result.rows || []).map((r) => [r.code, r.product, r.category, r.quantity, r.sales, r.active !== false]),
    };
  }

  function exportCsv() {
    const data = exportRows();
    if (!data) {
      notify("Genera el reporte antes de exportarlo.", true);
      return;
    }
    const csv = "\ufeff" + [data.headers, ...data.rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOLRAK-${activeKind}-${isoDateInput(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  injectStyle();
  patchSidebar();
  setTimeout(patchSidebar, 250);
  setTimeout(patchSidebar, 1000);
  const observer = new MutationObserver(() => patchSidebar());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.SOLRAKReportsV0172 = {
    version: VERSION,
    openReport,
    close: closeReport,
    refresh: runReport,
    patchSidebar,
  };
})();
