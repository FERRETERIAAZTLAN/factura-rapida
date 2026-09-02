(() => {
  "use strict";

  const VERSION = "0.1.97";
  const PANEL_ID = "solrakSumaDetailReportV0197";
  const STYLE_ID = "solrakSumaDetailReportV0197Style";
  const ROWS_PER_PAGE = 18;
  const byId = (id) => document.getElementById(id);
  const state = {
    open: false,
    loading: false,
    detail: null,
    summary: null,
    page: 1,
    zoom: 1,
    find: "",
    highlightIndex: -1,
    hooked: false,
  };

  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  })[char]);
  const money = (value) => Number(value || 0).toLocaleString("es-MX", {
    style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const number = (value, digits = 2) => Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 0, maximumFractionDigits: digits,
  });
  const negativeMoney = (value) => {
    const n = Math.abs(Number(value || 0));
    return n > 0 ? `-${money(n)}` : money(0);
  };

  function dateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function shortDate(value) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return date.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function periodDate(value) {
    const raw = String(value || "");
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : raw;
  }

  function nowText() {
    return new Date().toLocaleString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-suma-report97="1"] body{overflow:hidden!important}
html[data-solrak-suma-report97="1"] #solrakFielSidebar,html[data-solrak-suma-report97="1"] main.shell>.top{display:none!important}
html[data-solrak-suma-report97="1"] main.shell{margin-left:0!important;width:100vw!important;height:100vh!important;max-width:none!important;padding:0!important}
#${PANEL_ID}{position:fixed;z-index:9950;inset:0;display:grid;grid-template-rows:32px minmax(0,1fr);background:#fff;color:#4b4b4b;font-family:"Segoe UI",Tahoma,Arial,sans-serif;font-size:11px}
#${PANEL_ID}.hidden{display:none!important}
.s97TitleBar{position:relative;height:32px;display:grid;place-items:center;background:linear-gradient(90deg,#ef4b2a 0%,#f2691e 55%,#ee4a28 100%);color:#fff;font-size:13px;font-weight:500;box-shadow:inset 0 -1px rgba(0,0,0,.08)}
.s97CloseX{position:absolute;right:0;top:0;width:34px;height:32px;border:0;border-left:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:18px;cursor:pointer}.s97CloseX:hover{background:rgba(160,20,10,.22)}
.s97Body{min-height:0;display:grid;grid-template-columns:180px minmax(0,1fr)}
.s97Filters{position:relative;min-height:0;padding:10px 10px 58px;border-right:1px solid #cfcfcf;background:#f7f7f5;overflow:auto}
.s97Preset{width:100%;height:34px;margin:0 0 11px;border:0;border-radius:1px;background:linear-gradient(90deg,#f45c27,#f38b1f);box-shadow:0 1px 3px rgba(0,0,0,.18);color:#fff;font-size:11px;font-weight:500;cursor:pointer}.s97Preset:hover{filter:brightness(.97)}
.s97Group{margin:7px 0 17px}.s97GroupTitle{margin-bottom:8px;color:#444;font-size:11px;font-weight:700}.s97DateRow{display:grid;grid-template-columns:42px 1fr;gap:5px;align-items:center;margin-bottom:7px}.s97DateRow span{color:#666}.s97DateRow input{width:100%;height:25px;box-sizing:border-box;border:1px solid #c4c4c4;background:#fff;padding:0 4px;font:10px "Segoe UI",Arial,sans-serif;color:#505050}
.s97Radio{display:flex;align-items:center;gap:7px;color:#555}.s97Radio input{width:16px;height:16px;accent-color:#f2a500}
.s97SelectLabel{display:grid;gap:5px;margin-top:11px;color:#555;font-weight:600}.s97SelectLabel select{height:29px;border:0;border-bottom:1px solid #cfcfcf;background:transparent;padding:0 4px;color:#666;font:10px "Segoe UI",Arial,sans-serif;outline:none}
.s97SearchBtn,.s97CloseBtn{width:106px;height:31px;display:block;margin:13px auto 0;border:0;background:linear-gradient(#f8c51c,#efb812);box-shadow:0 1px 3px rgba(0,0,0,.14);color:#fff;font-size:10px;font-weight:700;cursor:pointer}.s97SearchBtn:disabled{opacity:.55}.s97CloseBtn{position:absolute;left:10px;right:10px;bottom:10px;width:calc(100% - 20px);margin:0}
.s97Viewer{min-width:0;min-height:0;display:grid;grid-template-rows:30px minmax(0,1fr);background:#f5f5f3;overflow:hidden}
.s97Toolbar{height:30px;display:flex;align-items:center;gap:2px;padding:0 7px;border-bottom:1px solid #c9c9c9;background:#f2f2f0;color:#545454;white-space:nowrap}.s97Tool{height:23px;min-width:24px;padding:0 5px;border:0;background:transparent;color:#555;font-size:11px;cursor:pointer}.s97Tool:hover{background:#e3e3e1}.s97Tool:disabled{opacity:.35}.s97Divider{width:1px;height:18px;margin:0 4px;background:#cacaca}.s97PageLabel{min-width:61px;text-align:center;font-size:10px}.s97Zoom{height:23px;border:0;border-left:1px solid #ccc;border-right:1px solid #ccc;background:#fff;font-size:10px;color:#555}.s97ToolbarSpacer{flex:1}.s97FindInput{width:130px;height:22px;border:0;border-bottom:1px solid #bbb;background:#fff;padding:0 5px;font-size:10px}.s97FindNext{height:23px;border:0;background:transparent;color:#555;font-size:10px;cursor:pointer}
.s97Canvas{min-height:0;overflow:auto;padding:9px 14px 30px;background:#f8f8f6}
.s97Paper{--s97-zoom:1;width:min(950px,calc(100% - 8px));min-width:790px;min-height:720px;box-sizing:border-box;margin:0 auto;padding:12px 22px 30px;background:#fff;box-shadow:0 0 0 1px #ededeb;zoom:var(--s97-zoom);transform-origin:top center}
.s97PaperTop{display:grid;grid-template-columns:170px minmax(0,1fr) 265px;align-items:start;min-height:55px}.s97Brand{display:flex;align-items:center;gap:4px;color:#1f1f1f}.s97BrandCart{font-size:27px;line-height:1}.s97Brand strong{display:block;font:italic 700 25px/1 Georgia,"Times New Roman",serif;letter-spacing:-1px}.s97Brand small{display:block;margin-left:2px;font-size:8px;color:#333}.s97Generated{grid-column:3;text-align:left;padding-top:5px;font-size:9px;color:#555}
.s97ReportTitle{text-align:center;margin:-9px 0 19px;font-size:20px;line-height:1;color:#222;font-weight:700}.s97Subtitle{margin:0 0 13px;font-size:9px;color:#666}.s97SectionTitle{text-align:center;margin:4px 0 7px;font-size:15px;color:#5f5f5f;font-weight:400}.s97Chart{width:600px;max-width:84%;margin:0 auto 7px}.s97Chart svg{display:block;width:100%;height:auto}.s97Chart text{font-family:"Segoe UI",Arial,sans-serif;fill:#616161;font-size:9px}.s97Chart .grid{stroke:#d9d9d9;stroke-width:1}.s97Chart .axis{stroke:#777;stroke-width:1}.s97Chart .bar{fill:#6c6c6c}.s97Chart .barLabel{fill:#353535;font-size:9px}.s97Chart .axisTitle{font-size:9px}.s97TotalsLabel{text-align:center;margin:2px 0 3px;color:#777;font-size:10px}.s97ReportTable{border-collapse:collapse;margin:0 auto;color:#555;font-size:9px}.s97ReportTable th{padding:3px 7px;border-right:1px solid #fff;background:#46515a;color:#fff;font-weight:600;text-align:center;white-space:nowrap}.s97ReportTable td{padding:3px 7px;border:1px solid #d7d7d7;text-align:center;white-space:nowrap}.s97TotalsTable{min-width:485px}.s97PeriodBlock{width:590px;max-width:91%;margin:8px auto 16px}.s97PeriodLabel{margin:0 0 2px;font-size:10px;color:#666}.s97PeriodTable{width:100%}.s97DetailTitle{margin-top:10px}.s97DetailWrap{width:100%;overflow:auto}.s97DetailTable{width:100%;min-width:800px;font-size:8px}.s97DetailTable th{padding:3px 5px}.s97DetailTable td{padding:3px 5px;text-align:left}.s97DetailTable td.num{text-align:right;font-variant-numeric:tabular-nums}.s97DetailTable tr.s97Hit td{background:#fff1a8}.s97Empty{padding:42px 16px;text-align:center;color:#777}.s97Error{color:#9b3636}.s97LoadingLayer{display:grid;place-items:center;min-height:520px;color:#777;font-size:12px}
@media(max-width:980px){.s97Body{grid-template-columns:160px minmax(0,1fr)}.s97Filters{padding-left:8px;padding-right:8px}.s97Paper{min-width:760px}.s97FindInput{width:85px}}
@media print{html[data-solrak-suma-report97="1"] #${PANEL_ID}{position:static;display:block}.s97TitleBar,.s97Filters,.s97Toolbar{display:none!important}.s97Body,.s97Viewer{display:block}.s97Canvas{padding:0;overflow:visible;background:#fff}.s97Paper{width:100%;min-width:0;min-height:0;margin:0;padding:0;box-shadow:none;zoom:1!important}.s97DetailWrap{overflow:visible}}
`;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = byId(PANEL_ID);
    if (panel) return panel;
    injectStyle();
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "hidden";
    const today = dateInputValue(new Date());
    panel.innerHTML = `
      <div class="s97TitleBar"><span>Detalle de Ventas</span><button id="s97CloseX" class="s97CloseX" type="button">×</button></div>
      <div class="s97Body">
        <aside class="s97Filters">
          <button class="s97Preset" data-s97-preset="today" type="button">HOY</button>
          <button class="s97Preset" data-s97-preset="month" type="button">ESTE MES</button>
          <button class="s97Preset" data-s97-preset="year" type="button">ESTE AÑO</button>
          <div class="s97Group"><div class="s97GroupTitle">Fecha</div>
            <label class="s97DateRow"><span>Desde</span><input id="s97From" type="date" value="${today}"></label>
            <label class="s97DateRow"><span>Hasta</span><input id="s97To" type="date" value="${today}"></label>
          </div>
          <div class="s97Group"><div class="s97GroupTitle">Turnos</div><label class="s97Radio"><input type="radio" checked disabled><span>Un Turno</span></label></div>
          <label class="s97SelectLabel">Categoría<select id="s97Category"><option value="">&lt;Todas&gt;</option></select></label>
          <label class="s97SelectLabel">Usuario<select id="s97User"><option value="">&lt;Todos&gt;</option></select></label>
          <button id="s97Search" class="s97SearchBtn" type="button">BUSCAR</button>
          <button id="s97Close" class="s97CloseBtn" type="button">CERRAR</button>
        </aside>
        <div class="s97Viewer">
          <div class="s97Toolbar">
            <button id="s97First" class="s97Tool" type="button" title="Primera página">|◀</button><button id="s97Prev" class="s97Tool" type="button" title="Página anterior">◀</button>
            <span id="s97PageLabel" class="s97PageLabel">1 de 1</span><button id="s97Next" class="s97Tool" type="button" title="Página siguiente">▶</button><button id="s97Last" class="s97Tool" type="button" title="Última página">▶|</button>
            <span class="s97Divider"></span><button id="s97Refresh" class="s97Tool" type="button" title="Actualizar">↻</button><button id="s97Print" class="s97Tool" type="button" title="Imprimir">▣</button><button id="s97Csv" class="s97Tool" type="button" title="Exportar CSV">⇩</button>
            <span class="s97Divider"></span><select id="s97Zoom" class="s97Zoom"><option value="0.75">75%</option><option value="1" selected>100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select>
            <span class="s97ToolbarSpacer"></span><input id="s97Find" class="s97FindInput" type="search" placeholder="Buscar"><button id="s97FindNext" class="s97FindNext" type="button">Siguiente</button>
          </div>
          <div class="s97Canvas"><div id="s97Paper" class="s97Paper"><div class="s97LoadingLayer">Consultando datos reales…</div></div></div>
        </div>
      </div>`;
    document.querySelector("main.shell")?.appendChild(panel);
    bindPanel(panel);
    return panel;
  }

  function bindPanel(panel) {
    byId("s97CloseX").onclick = close;
    byId("s97Close").onclick = close;
    byId("s97Search").onclick = load;
    byId("s97Refresh").onclick = load;
    byId("s97Print").onclick = () => window.print();
    byId("s97Csv").onclick = exportCsv;
    byId("s97Zoom").onchange = (event) => {
      state.zoom = Number(event.target.value) || 1;
      byId("s97Paper")?.style.setProperty("--s97-zoom", state.zoom);
    };
    byId("s97First").onclick = () => setPage(1);
    byId("s97Prev").onclick = () => setPage(state.page - 1);
    byId("s97Next").onclick = () => setPage(state.page + 1);
    byId("s97Last").onclick = () => setPage(pageCount());
    byId("s97FindNext").onclick = findNext;
    byId("s97Find").onkeydown = (event) => { if (event.key === "Enter") { event.preventDefault(); findNext(); } };
    ["s97From", "s97To", "s97User", "s97Category"].forEach((id) => {
      byId(id).onkeydown = (event) => { if (event.key === "Enter") { event.preventDefault(); load(); } };
    });
    panel.querySelectorAll("[data-s97-preset]").forEach((button) => {
      button.onclick = () => setPreset(button.dataset.s97Preset);
    });
  }

  function setPreset(kind) {
    const now = new Date();
    let from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (kind === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (kind === "year") from = new Date(now.getFullYear(), 0, 1);
    byId("s97From").value = dateInputValue(from);
    byId("s97To").value = dateInputValue(now);
    load();
  }

  function payload(kind) {
    const fromValue = byId("s97From")?.value;
    const toValue = byId("s97To")?.value;
    if (!fromValue || !toValue) throw new Error("Selecciona las fechas del reporte.");
    const from = new Date(`${fromValue}T00:00:00`);
    const to = new Date(`${toValue}T00:00:00`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) throw new Error("El rango de fechas no es válido.");
    to.setDate(to.getDate() + 1);
    const out = { kind, from: from.toISOString(), to: to.toISOString(), tzOffset: new Date().getTimezoneOffset() };
    const userId = byId("s97User")?.value || "";
    const category = byId("s97Category")?.value || "";
    if (userId) out.userId = userId;
    if (category) out.category = category;
    return out;
  }

  async function apiReports(kind) {
    const api = window.FacturaRapidaPOS?.api;
    if (typeof api !== "function") throw new Error("El punto de venta todavía no está listo.");
    return api("reports", payload(kind));
  }

  function fillSelect(id, rows, emptyLabel) {
    const select = byId(id);
    if (!select) return;
    const selected = select.value;
    select.innerHTML = `<option value="">&lt;${esc(emptyLabel)}&gt;</option>` + rows.map((row) => `<option value="${esc(row.value)}">${esc(row.label)}</option>`).join("");
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function hydrateCatalogs(catalogs) {
    if (Array.isArray(catalogs.users)) fillSelect("s97User", catalogs.users.map((user) => ({ value: user.id, label: user.name })), "Todos");
    if (Array.isArray(catalogs.categories)) fillSelect("s97Category", catalogs.categories.map((category) => ({ value: category, label: category })), "Todas");
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const button = byId("s97Search");
    if (button) button.disabled = true;
    const paper = byId("s97Paper");
    if (paper) paper.innerHTML = '<div class="s97LoadingLayer">Consultando datos reales…</div>';
    try {
      const [detail, summary] = await Promise.all([apiReports("detail"), apiReports("summary")]);
      state.detail = detail || {};
      state.summary = summary || {};
      state.page = 1;
      state.highlightIndex = -1;
      hydrateCatalogs(detail?.catalogs || summary?.catalogs || {});
      render();
    } catch (error) {
      state.detail = null;
      state.summary = null;
      if (paper) paper.innerHTML = `<div class="s97Empty s97Error">${esc(error?.message || "No se pudo consultar el reporte.")}</div>`;
    } finally {
      state.loading = false;
      if (button) button.disabled = false;
    }
  }

  function niceStep(value) {
    if (!(value > 0)) return 1;
    const rough = value / 4;
    const exponent = Math.floor(Math.log10(rough));
    const fraction = rough / (10 ** exponent);
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return nice * (10 ** exponent);
  }

  function chartSvg(periods) {
    const rows = Array.isArray(periods) ? periods : [];
    const values = rows.map((row) => Math.max(0, Number(row.sales || 0)));
    const maxValue = Math.max(1, ...values);
    const step = niceStep(maxValue);
    const maxY = Math.max(step * 4, Math.ceil(maxValue / step) * step);
    const W = 620, H = 205, left = 72, right = 14, top = 12, bottom = 45;
    const cw = W - left - right, ch = H - top - bottom;
    const parts = [];
    for (let i = 0; i <= 4; i += 1) {
      const y = top + (ch * i / 4);
      const val = maxY * (1 - i / 4);
      parts.push(`<line class="grid" x1="${left}" y1="${y}" x2="${left + cw}" y2="${y}"/><text x="${left - 8}" y="${y + 3}" text-anchor="end">${esc(money(val))}</text>`);
    }
    parts.push(`<line class="axis" x1="${left}" y1="${top}" x2="${left}" y2="${top + ch}"/><line class="axis" x1="${left}" y1="${top + ch}" x2="${left + cw}" y2="${top + ch}"/>`);
    if (rows.length) {
      const slot = cw / rows.length;
      const barW = Math.max(4, Math.min(80, slot * .58));
      const labelEvery = Math.max(1, Math.ceil(rows.length / 9));
      rows.forEach((row, index) => {
        const value = values[index];
        const bh = Math.max(1, ch * (value / maxY));
        const x = left + slot * index + (slot - barW) / 2;
        const y = top + ch - bh;
        parts.push(`<rect class="bar" x="${x}" y="${y}" width="${barW}" height="${bh}"/>`);
        if (rows.length <= 12 || index % labelEvery === 0) parts.push(`<text class="barLabel" x="${x + barW / 2}" y="${Math.max(top + 10, y - 4)}" text-anchor="middle">${esc(money(value))}</text>`);
        if (rows.length <= 12 || index % labelEvery === 0) parts.push(`<text x="${x + barW / 2}" y="${top + ch + 15}" text-anchor="middle">${esc(periodDate(row.period))}</text>`);
      });
    }
    parts.push(`<text x="${left + cw / 2}" y="${H - 7}" text-anchor="middle">Periodo</text><text class="axisTitle" transform="translate(14 ${top + ch / 2}) rotate(-90)" text-anchor="middle">Total Ventas</text>`);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de ventas">${parts.join("")}</svg>`;
  }

  function userLabel() {
    const select = byId("s97User");
    return select?.selectedOptions?.[0]?.textContent?.replace(/[<>]/g, "") || "Todos";
  }

  function summaryMarkup() {
    const summary = state.summary || {};
    const totals = summary.totals || {};
    const periods = Array.isArray(summary.periods) ? summary.periods : [];
    const periodRows = periods.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(periodDate(row.period))}</td><td>${money(row.sales)}</td><td>${negativeMoney(row.returns)}</td><td>${negativeMoney(row.cancellations)}</td><td>${money(row.net)}</td><td>${money(row.profit)}</td></tr>`).join("");
    return `
      <div class="s97PaperTop"><div class="s97Brand"><span class="s97BrandCart">🛒</span><div><strong>SOLRAK</strong><small>Punto de Venta</small></div></div><div></div><div class="s97Generated">${esc(nowText())}</div></div>
      <h1 class="s97ReportTitle">Reporte de Ventas</h1>
      <div class="s97Subtitle">Ventas del ${esc(shortDate(byId("s97From")?.value))} al ${esc(shortDate(byId("s97To")?.value))} 11:59:59 p. m. del usuario: ${esc(userLabel())}</div>
      <h2 class="s97SectionTitle">Resumen</h2>
      <div class="s97Chart">${chartSvg(periods)}</div>
      <div class="s97TotalsLabel">Totales</div>
      <table class="s97ReportTable s97TotalsTable"><thead><tr><th>Total Ventas</th><th>Devoluciones</th><th>Cancelaciones</th><th>Total Ventas Netas</th><th>Total Ganancias</th></tr></thead><tbody><tr><td>${money(totals.sales)}</td><td>${negativeMoney(totals.returns)}</td><td>${negativeMoney(totals.cancellations)}</td><td>${money(totals.net)}</td><td>${money(totals.profit)}</td></tr></tbody></table>
      <div class="s97PeriodBlock"><div class="s97PeriodLabel">Periodo</div><table class="s97ReportTable s97PeriodTable"><thead><tr><th>N°</th><th>Periodo</th><th>Total Ventas</th><th>Devoluciones</th><th>Cancelaciones</th><th>Total Ventas Netas</th><th>Total Ganancias</th></tr></thead><tbody>${periodRows || '<tr><td colspan="7">Sin movimientos en el periodo.</td></tr>'}</tbody></table></div>`;
  }

  function detailRows() {
    return Array.isArray(state.detail?.rows) ? state.detail.rows : [];
  }

  function pageCount() {
    return Math.max(1, Math.ceil(detailRows().length / ROWS_PER_PAGE));
  }

  function detailMarkup() {
    const all = detailRows();
    const pages = pageCount();
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * ROWS_PER_PAGE;
    const slice = all.slice(start, start + ROWS_PER_PAGE);
    const rows = slice.map((row, localIndex) => {
      const globalIndex = start + localIndex;
      const returned = Number(row.returned_quantity || 0);
      const cancelled = row.cancelled === true || /cancel|void/i.test(String(row.status || ""));
      const wholesale = Number(row.wholesale || 0);
      const unitPrice = Number(row.unit_price || 0);
      const wholesaleUsed = wholesale > 0 && unitPrice <= wholesale + 0.005;
      return `<tr data-s97-row="${globalIndex}"${globalIndex === state.highlightIndex ? ' class="s97Hit"' : ""}><td>#${esc(row.ticket)}</td><td>${esc(shortDate(row.date))}</td><td>${esc(row.product)}</td><td>${esc(row.category || "")}</td><td class="num">${returned > 0 ? number(returned, 3) : ""}</td><td>${cancelled ? "Sí" : ""}</td><td>${wholesaleUsed ? "Sí" : "No"}</td><td class="num">${money(row.cost)}</td><td class="num">${money(row.wholesale)}</td><td class="num">${money(row.list_price)}</td><td class="num">${number(row.discount_percent, 2)}%</td><td class="num">${number(row.quantity, 3)}</td><td>${esc(row.unit)}</td><td class="num">${money(row.total)}</td></tr>`;
    }).join("");
    return `<h2 class="s97SectionTitle s97DetailTitle">Detalle de Ventas</h2><div class="s97DetailWrap"><table class="s97ReportTable s97DetailTable"><thead><tr><th>Ticket</th><th>Fecha</th><th>Nombre del Producto</th><th>Categoría</th><th>Dev.</th><th>Canc.</th><th>Mayr.</th><th>Pr. Costo</th><th>Pr. Mayr.</th><th>Pr. Pub.</th><th>% Desc.</th><th>Cant.</th><th>UM</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="14" style="text-align:center">Sin ventas en el periodo.</td></tr>'}</tbody></table></div>`;
  }

  function render() {
    const paper = byId("s97Paper");
    if (!paper) return;
    paper.innerHTML = summaryMarkup() + detailMarkup();
    paper.style.setProperty("--s97-zoom", state.zoom);
    updatePager();
  }

  function updatePager() {
    const count = pageCount();
    const label = byId("s97PageLabel");
    if (label) label.textContent = `${state.page} de ${count}`;
    if (byId("s97First")) byId("s97First").disabled = state.page <= 1;
    if (byId("s97Prev")) byId("s97Prev").disabled = state.page <= 1;
    if (byId("s97Next")) byId("s97Next").disabled = state.page >= count;
    if (byId("s97Last")) byId("s97Last").disabled = state.page >= count;
  }

  function setPage(page) {
    if (!state.detail) return;
    const next = Math.min(Math.max(1, Number(page) || 1), pageCount());
    if (next === state.page) return;
    state.page = next;
    render();
  }

  function rowSearchText(row) {
    return [row.ticket, row.code, row.product, row.category, row.user_name].join(" ").toLocaleLowerCase("es-MX");
  }

  function findNext() {
    const query = String(byId("s97Find")?.value || "").trim().toLocaleLowerCase("es-MX");
    const rows = detailRows();
    if (!query || !rows.length) return;
    let start = state.find === query ? state.highlightIndex + 1 : 0;
    state.find = query;
    let found = -1;
    for (let offset = 0; offset < rows.length; offset += 1) {
      const index = (start + offset) % rows.length;
      if (rowSearchText(rows[index]).includes(query)) { found = index; break; }
    }
    state.highlightIndex = found;
    if (found >= 0) {
      state.page = Math.floor(found / ROWS_PER_PAGE) + 1;
      render();
      setTimeout(() => document.querySelector(`[data-s97-row="${found}"]`)?.scrollIntoView?.({ block: "center" }), 0);
    }
  }

  function csvCell(value) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  }

  function exportCsv() {
    const rows = detailRows();
    if (!rows.length) return;
    const headers = ["Ticket","Fecha","Nombre del Producto","Categoría","Dev.","Canc.","Mayr.","Pr. Costo","Pr. Mayr.","Pr. Pub.","% Desc.","Cant.","UM","Total"];
    const lines = [headers.map(csvCell).join(",")];
    rows.forEach((row) => {
      const returned = Number(row.returned_quantity || 0);
      const cancelled = row.cancelled === true || /cancel|void/i.test(String(row.status || ""));
      const wholesale = Number(row.wholesale || 0), unitPrice = Number(row.unit_price || 0);
      lines.push([
        `#${row.ticket ?? ""}`, shortDate(row.date), row.product, row.category || "", returned || "", cancelled ? "Sí" : "", wholesale > 0 && unitPrice <= wholesale + 0.005 ? "Sí" : "No",
        Number(row.cost || 0).toFixed(2), Number(row.wholesale || 0).toFixed(2), Number(row.list_price || 0).toFixed(2), Number(row.discount_percent || 0).toFixed(2), Number(row.quantity || 0), row.unit || "", Number(row.total || 0).toFixed(2),
      ].map(csvCell).join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOLRAK_Detalle_Ventas_${byId("s97From")?.value || ""}_${byId("s97To")?.value || ""}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function showOnly(panel) {
    document.querySelectorAll("main.shell .tab-panel, main.shell > section").forEach((section) => {
      if (section !== panel && section.id !== PANEL_ID) section.classList.add("hidden");
    });
    panel.classList.remove("hidden");
  }

  function open() {
    const panel = ensurePanel();
    state.open = true;
    document.documentElement.dataset.solrakSumaReport97 = "1";
    showOnly(panel);
    load();
    return true;
  }

  function close() {
    state.open = false;
    const panel = byId(PANEL_ID);
    panel?.classList.add("hidden");
    delete document.documentElement.dataset.solrakSumaReport97;
    if (window.SOLRAKReportsV0172?.openSale) window.SOLRAKReportsV0172.openSale();
    else if (typeof window.switchTab === "function") window.switchTab("pos");
  }

  function hookReports() {
    const reports = window.SOLRAKReportsV0172;
    if (!reports || reports.__solrak97Wrapped) return false;
    const originalOpen = typeof reports.open === "function" ? reports.open.bind(reports) : null;
    reports.open = (kind) => kind === "detail" ? open() : originalOpen?.(kind);
    reports.__solrak97Wrapped = true;
    return true;
  }

  function captureDetailMenu(event) {
    const button = event.target?.closest?.("button");
    if (!button || !button.closest("#solrakFielSidebar")) return;
    if (button.textContent.trim() !== "Detalle de Ventas") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }

  function boot() {
    injectStyle();
    ensurePanel();
    document.addEventListener("click", captureDetailMenu, true);
    hookReports();
    let tries = 0;
    const timer = setInterval(() => { tries += 1; if (hookReports() || tries >= 80) clearInterval(timer); }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKReportDetailV0197 = { version: VERSION, open, close, refresh: load, render, get state() { return state; } };
})();
