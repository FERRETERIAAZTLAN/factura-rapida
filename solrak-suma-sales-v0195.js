(() => {
  "use strict";

  const VERSION = "0.1.95";
  const STYLE_ID = "solrakSumaSalesV0195Style";
  const ROOT_FLAG = "solrakSumaSales95";
  const LEGACY_MENU_ID = "solrakV0195LegacyMenu";
  const MENU_ID = "solrakV0195Menu";
  const byId = (id) => document.getElementById(id);
  let posObserver = null;
  let mountObserver = null;
  let mountTimer = null;
  let clockTimer = null;

  const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICON = {
    sale: svg('<path d="M3 5h2l2 10h10l2-7H6"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    cash: svg('<path d="M3 9h18v10H3zM6 9V5h12v4M7 14h4"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3a8 8 0 0 0-1.8 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1a8 8 0 0 0 1.8 1l.4 3h4.8l.4-3a8 8 0 0 0 1.8-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>'),
    report: svg('<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>'),
    chevron: svg('<path d="m9 6 6 6-6 6"/>'),
    scale: svg('<path d="M7 20h10M9 20l1-7h4l1 7M8 5h8l2 6H6z"/><path d="M12 7v3"/>'),
    search: svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'),
    tag: svg('<path d="M3 12 12 3h7v7l-9 9z"/><circle cx="16" cy="7" r="1"/>'),
    x: svg('<path d="M5 5l14 14M19 5 5 19"/>'),
    printer: svg('<path d="M7 9V3h10v6M6 18H4V9h16v9h-2M7 14h10v7H7z"/>'),
  };

  function money(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{--s95-side:250px;--s95-top:60px;--s95-right:270px;--s95-orange:#ef6c16;--s95-red:#f04424;--s95-yellow:#ffc400;--s95-line:#d7d7d7;--s95-soft:#f4f4f4;--s95-text:#454545}
html[data-${ROOT_FLAG.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}="1"],html[data-solrak-suma-sales95="1"]{background:#f2f2f2}
html[data-solrak-suma-sales95="1"] body{font-family:"Segoe UI",Arial,sans-serif;background:#f2f2f2;color:var(--s95-text);overflow:hidden}
html[data-solrak-suma-sales95="1"] #solrakFielSidebar{width:var(--s95-side)!important;background:#f4f4f4!important;border-right:1px solid #d4d4d4!important}
html[data-solrak-suma-sales95="1"] #solrakFielSidebar .fielBrand{height:var(--s95-top)!important;min-height:var(--s95-top)!important;padding:6px 16px!important;background:linear-gradient(90deg,#f13f22 0%,#f36d19 100%)!important}
html[data-solrak-suma-sales95="1"] #solrakFielSidebar .fielBrandMark{width:40px!important;height:40px!important;border:0!important;border-radius:0!important;font-size:0!important}
html[data-solrak-suma-sales95="1"] #solrakFielSidebar .fielBrandMark::before{content:"S";font-size:34px;font-weight:800;font-style:italic;color:#fff}
html[data-solrak-suma-sales95="1"] #solrakFielSidebar .fielBrandText strong{font-size:22px!important;font-style:italic;font-weight:650!important;letter-spacing:0!important}
html[data-solrak-suma-sales95="1"] #solrakFielSidebar .fielBrandText small{font-size:8px!important;letter-spacing:.06em!important;color:#ffd43b!important;opacity:1!important}
#${LEGACY_MENU_ID}{display:none!important}
#${MENU_ID}{flex:1;min-height:0;overflow:auto;padding:0 0 58px;background:#f6f6f6;scrollbar-width:thin}
.s95MenuButton{width:100%;min-height:58px;display:flex;align-items:center;gap:13px;padding:0 16px;border:0;border-bottom:1px solid #ececec;background:#f5f5f5;color:#3f4346;text-align:left;font:500 15px/1.15 "Segoe UI",Arial,sans-serif;cursor:pointer}
.s95MenuButton:hover,.s95MenuButton.active{background:#ebebeb}.s95MenuButton>svg{width:26px;height:26px;flex:0 0 26px;color:#555b5f}.s95MenuButton .s95Chevron{width:15px;height:15px;margin-left:auto;transition:transform .15s}.s95MenuButton[aria-expanded="true"] .s95Chevron{transform:rotate(90deg)}
.s95Sub{display:none;background:#fafafa}.s95Sub.open{display:block}.s95Sub .s95MenuButton{min-height:42px;padding-left:54px;border-bottom:0;background:#fafafa;font-size:13px}.s95Sub .s95MenuButton:hover{background:#eeeeee}.s95Sub .s95MenuButton>svg{width:14px;height:14px;flex-basis:14px}
html[data-solrak-suma-sales95="1"] #fielFinishSale{height:57px!important;background:linear-gradient(90deg,#ffb600,#ffd000)!important;color:#fff!important;font-size:14px!important;font-weight:750!important;border:0!important;box-shadow:inset 0 1px rgba(255,255,255,.25)!important}
html[data-solrak-suma-sales95="1"] main.shell{margin-left:var(--s95-side)!important;background:#fff!important}
html[data-solrak-suma-sales95="1"] main.shell>.top{height:var(--s95-top)!important;min-height:var(--s95-top)!important;padding:0 13px!important;background:linear-gradient(90deg,#f13f22 0%,#f36d19 100%)!important}
html[data-solrak-suma-sales95="1"] main.shell>.top h1{font-size:19px!important;font-weight:450!important}
html[data-solrak-suma-sales95="1"] #tab-pos{position:relative!important;height:calc(100vh - var(--s95-top))!important;grid-template-rows:56px minmax(0,1fr)!important;background:#fff!important}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosTop{height:56px!important;min-height:56px!important;padding:0 14px 0 20px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:30px!important;border-bottom:1px solid #dedede!important;background:#fff!important}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosTop>div:first-child{display:flex;align-items:center;gap:10px}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosTop>div:first-child::before{content:"";width:25px;height:25px;display:block;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M3 4h2l2 11h10l2-8H6l.4 2H16l-1 4H8L6 2H3v2zm6 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'/%3E%3C/svg%3E") center/contain no-repeat;color:#555}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosTop h2{font-size:14px!important;font-weight:500!important;color:#414141!important}
#solrakV0195Scale{height:34px;display:flex;align-items:center;gap:9px;padding-left:26px;border-left:1px solid #d9d9d9;color:#575757;font-size:13px}#solrakV0195Scale svg{width:24px;height:24px}.s95ScaleValue{color:#858585}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosGrid{grid-template-columns:minmax(0,1fr) var(--s95-right)!important;height:100%!important;min-height:0!important}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosGrid>.stack{grid-template-rows:78px minmax(0,1fr)!important;min-height:0!important;background:#fff}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosGrid>.stack>article:first-child{position:relative!important;height:78px!important;padding:13px 18px 8px!important;border:0!important;border-bottom:1px solid #dedede!important;background:#fff!important;overflow:visible!important}
html[data-solrak-suma-sales95="1"] #tab-pos>.frPosGrid>.stack>article:first-child .card-head,html[data-solrak-suma-sales95="1"] #tab-pos>.frPosGrid>.stack>article:first-child .frPosHint{display:none!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosSearch{position:relative;display:grid!important;grid-template-columns:minmax(0,1fr) 105px!important;gap:12px!important;align-items:center!important}
html[data-solrak-suma-sales95="1"] #tab-pos #posSearch{height:45px!important;padding:0 12px!important;border:1px solid #c9c9c9!important;border-bottom:2px solid var(--s95-orange)!important;border-radius:0!important;background:#fff!important;font-size:16px!important;box-shadow:none!important}
#solrakV0195SearchBtn{height:45px;border:0;border-radius:2px;background:linear-gradient(#f88723,#ed6813);color:#fff;font-size:13px;font-weight:700;cursor:pointer}#solrakV0195SearchBtn:hover{filter:brightness(.97)}
html[data-solrak-suma-sales95="1"] #tab-pos #posResults{position:absolute;z-index:9500;left:18px;right:135px;top:62px;max-height:360px;margin:0!important;padding:5px;background:#fff;border:1px solid #d6d6d6;box-shadow:0 10px 28px rgba(0,0,0,.18);display:none!important}
html[data-solrak-suma-sales95="1"] #tab-pos.v0195-searching #posResults{display:grid!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosResult{border-radius:0!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosCartCard{position:relative!important;display:flex!important;flex-direction:column!important;height:100%!important;min-height:0!important;padding:0 0 112px!important;border:0!important;background:#fff!important;overflow:hidden!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosCartCard>.card-head,html[data-solrak-suma-sales95="1"] #tab-pos .frPosCartCard>label{display:none!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosCartHead{display:grid!important;grid-template-columns:108px minmax(220px,1fr) 105px 90px 105px 90px 100px!important;height:42px;min-height:42px;align-items:center;border:1px solid #d8d8d8;border-width:1px 0;background:#ededed;color:#555;font-size:12px;text-align:center}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosCartHead span{height:100%;display:grid;place-items:center;border-right:1px solid #d8d8d8}.frPosCartHead .s95HeadWholesale,.frPosCartHead .s95HeadDiscount{display:grid!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosCart{flex:1!important;min-height:0!important;max-height:none!important;border:0!important;border-radius:0!important;overflow:auto!important;background:#fff}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosEmpty{padding-top:56px!important;color:#a0a0a0!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine{position:relative;display:grid!important;grid-template-columns:108px minmax(220px,1fr) 105px 90px 105px 90px 100px!important;gap:0!important;min-height:44px;padding:0!important;border-bottom:1px solid #ececec!important;background:#fff!important;align-items:stretch!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine>div,html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine>.s95Cell{min-width:0;display:flex;align-items:center;justify-content:center;padding:6px 8px;border-right:1px solid #efefef;box-sizing:border-box;font-size:11px}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine>.frPosProduct{align-items:flex-start;justify-content:center;flex-direction:column;text-align:left}html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine>.frPosProduct strong{font-size:11px}html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine>.frPosProduct small{display:none}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosQty{border:0!important;border-radius:0!important;padding:0!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPosQty input{width:48px!important;font-size:11px!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPosQty button{width:22px!important;background:transparent!important;color:#777}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosLineTotal{position:relative}.frPosLineTotal .trash{position:absolute!important;right:2px;top:50%;transform:translateY(-50%);width:17px!important;height:17px!important;padding:0!important;opacity:0;border:0;background:#fff;color:#b63333}.frPosLine:hover .frPosLineTotal .trash{opacity:1}
html[data-solrak-suma-sales95="1"] #tab-pos .fielPosActions{position:absolute!important;left:0;right:0;bottom:0;height:112px;margin:0!important;padding:10px 18px 11px!important;border-top:1px solid #ddd!important;background:#fff!important;box-sizing:border-box}
html[data-solrak-suma-sales95="1"] #tab-pos .fielPosStats{height:32px;margin:0 0 9px!important;gap:38px!important;color:#4f4f4f!important;font-size:11px!important}html[data-solrak-suma-sales95="1"] #tab-pos .fielPosStats strong{font-size:18px!important;color:var(--s95-orange)!important}
html[data-solrak-suma-sales95="1"] #tab-pos .fielPosTools{height:42px;display:grid!important;grid-template-columns:1fr 1.15fr 1.05fr!important;gap:0!important;border-top:0}
html[data-solrak-suma-sales95="1"] #tab-pos .fielPosTool{height:42px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:0 12px!important;border:0!important;border-right:1px solid #ddd!important;background:#fff!important;color:#505050!important;font-size:10.5px!important}html[data-solrak-suma-sales95="1"] #tab-pos .fielPosTool:last-child{border-right:0!important}html[data-solrak-suma-sales95="1"] #tab-pos .fielPosTool[data-fiel-pos-tool="common"]{display:none!important}html[data-solrak-suma-sales95="1"] #tab-pos .fielPosTool svg{width:24px;height:24px;color:#555}
html[data-solrak-suma-sales95="1"] #tab-pos aside.summary{width:auto!important;height:100%!important;padding:12px 10px 74px!important;border-left:1px solid #d6d6d6!important;background:#fafafa!important;box-sizing:border-box;overflow:hidden!important}
html[data-solrak-suma-sales95="1"] #tab-pos aside.summary>.card-head{display:none!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPreview{height:235px!important;min-height:235px!important;margin:0 0 10px!important;border:1px solid #cfcfcf!important;border-radius:4px!important;background:#fff!important;box-shadow:0 2px 4px rgba(0,0,0,.08)}html[data-solrak-suma-sales95="1"] #tab-pos .frPreview img{height:185px!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPreviewMeta{font-size:9px!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frTicketBar{display:block!important;max-height:190px!important;margin:0!important;padding:0!important;overflow:auto!important}html[data-solrak-suma-sales95="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr!important;gap:4px!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frTicket{position:relative;width:100%!important;min-height:45px!important;padding:7px 32px 7px 10px!important;border:0!important;border-bottom:1px solid #ddd!important;border-radius:0!important;background:#fafafa!important;color:#333!important;box-shadow:none!important}html[data-solrak-suma-sales95="1"] #tab-pos .frTicket.active{background:#fff!important;box-shadow:inset 0 -3px 0 var(--s95-orange)!important}html[data-solrak-suma-sales95="1"] #tab-pos .frTicket strong{font-size:12px!important}html[data-solrak-suma-sales95="1"] #tab-pos .frTicket small{font-size:9px!important}html[data-solrak-suma-sales95="1"] #tab-pos .frTicketClose{position:absolute;right:7px;top:8px;color:#d22!important;font-size:18px!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frTicketNew{width:100%!important;height:34px!important;margin-top:6px!important;border:1px solid var(--s95-orange)!important;border-radius:2px!important;background:#fff!important;color:var(--s95-orange)!important;font-size:10px!important}
html[data-solrak-suma-sales95="1"] #tab-pos .frPosTotals{position:absolute!important;left:10px;right:0;bottom:0;height:164px;margin:0!important;padding:18px 12px 11px!important;border-top:5px solid #aaa!important;background:#fafafa!important;box-sizing:border-box}html[data-solrak-suma-sales95="1"] #tab-pos .frPosTotals>div:not(.frPosGrand){display:none!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPosGrand{height:135px!important;display:block!important;margin:0!important;padding:0!important;border:0!important;font-weight:400!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPosGrand span{display:block;font-size:31px!important;line-height:1.05;color:#666!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPosGrand strong{display:block;margin-top:24px;text-align:center;font:400 48px/1 Georgia,"Times New Roman",serif!important;color:#444!important}html[data-solrak-suma-sales95="1"] #tab-pos .frPosTotals::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--s95-yellow)}
html[data-solrak-suma-sales95="1"] #tab-pos #posReceipt{display:none!important}
#solrakV0195Footer{position:fixed;z-index:8000;right:calc(var(--s95-right) + 28px);bottom:7px;color:#555;font-size:10px;pointer-events:none}
@media(max-width:1050px){:root{--s95-side:210px;--s95-right:240px}html[data-solrak-suma-sales95="1"] #tab-pos .frPosCartHead,html[data-solrak-suma-sales95="1"] #tab-pos .frPosLine{grid-template-columns:82px minmax(150px,1fr) 88px 75px 88px 75px 82px!important}.s95MenuButton{font-size:13px}.s95Sub .s95MenuButton{padding-left:44px;font-size:11px}}
`;
    document.head.appendChild(style);
  }

  function legacyButton(action, tab) {
    const legacy = byId(LEGACY_MENU_ID);
    if (!legacy) return null;
    const buttons = [...legacy.querySelectorAll("[data-fiel-action]")];
    return buttons.find((button) => button.dataset.fielAction === action && (!tab || button.dataset.tabTarget === tab)) || null;
  }

  function runLegacy(action, tab) {
    const button = legacyButton(action, tab);
    if (button) return button.click();
    if (action === "tab") return window.SOLRAKSumaproFielV0171?.openTab?.(tab);
    if (action === "new-ticket") return window.FacturaRapidaPOS?.newTicket?.();
    if (action === "configuration") return window.SOLRAKSumaproFielV0171?.openConfiguration?.();
  }

  function menuButton(label, icon, action, tab = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "s95MenuButton";
    button.innerHTML = `${icon}<span>${label}</span>`;
    button.onclick = () => runLegacy(action, tab);
    return button;
  }

  function group(label, icon, entries, open = false) {
    const wrap = document.createElement("div");
    const head = document.createElement("button");
    head.type = "button";
    head.className = "s95MenuButton";
    head.setAttribute("aria-expanded", open ? "true" : "false");
    head.innerHTML = `${icon}<span>${label}</span><span class="s95Chevron">${ICON.chevron}</span>`;
    const sub = document.createElement("div");
    sub.className = `s95Sub${open ? " open" : ""}`;
    entries.forEach((entry) => sub.appendChild(menuButton(entry[0], ICON.chevron, entry[1], entry[2] || "")));
    head.onclick = () => {
      const next = head.getAttribute("aria-expanded") !== "true";
      head.setAttribute("aria-expanded", next ? "true" : "false");
      sub.classList.toggle("open", next);
    };
    wrap.append(head, sub);
    return wrap;
  }

  function buildMenu() {
    const sidebar = byId("solrakFielSidebar");
    if (!sidebar) return false;
    let legacy = byId(LEGACY_MENU_ID);
    let current = sidebar.querySelector(":scope > .fielMenu");
    if (!legacy && current) {
      legacy = document.createElement("div");
      legacy.id = LEGACY_MENU_ID;
      while (current.firstChild) legacy.appendChild(current.firstChild);
      current.replaceWith(legacy);
    }
    if (byId(MENU_ID)) return true;
    const menu = document.createElement("nav");
    menu.id = MENU_ID;
    menu.setAttribute("aria-label", "Menú principal de SOLRAK");
    menu.appendChild(group("Ventas Principales", ICON.sale, [
      ["Pantalla principal de cobro", "tab", "pos"],
      ["Verificador de Precios", "price-check"],
      ["Nuevo Ticket", "new-ticket"],
      ["Producto Común", "common-product"],
      ["Consultar Ticket", "ticket-search"],
      ["Devolución", "return-sale"],
      ["Facturación", "tab", "factura"],
      ["Cotizaciones", "tab", "cotizaciones"],
      ["Clientes", "tab", "clientes"],
      ["Productos", "tab", "inventario"],
      ["Proveedores", "tab", "proveedores"],
      ["Usuarios", "tab", "usuarios"],
    ], false));
    menu.appendChild(menuButton("Turnos", ICON.clock, "shifts"));
    menu.appendChild(group("Caja", ICON.cash, [
      ["Entradas", "cash-in"],
      ["Salidas", "cash-out"],
      ["Corte de Caja", "cash-cut"],
    ], true));
    menu.appendChild(menuButton("Configuración", ICON.gear, "configuration"));
    menu.appendChild(group("Reportes", ICON.report, [
      ["Resumen de Ventas", "sales-report"],
      ["Detalle de Ventas", "sales-report"],
      ["F.P. en Ventas", "sales-report"],
      ["Inventario", "tab", "inventario"],
      ["Historial Movimientos", "sales-report"],
      ["Más Vendidos", "sales-report"],
    ], true));
    sidebar.insertBefore(menu, byId("fielFinishSale"));
    return true;
  }

  function updateScale(detail) {
    const host = byId("solrakV0195Scale");
    if (!host) return;
    const weight = Number(detail?.weight ?? window.SOLRAKScale?.weight);
    const unit = String(detail?.unit || window.SOLRAKScale?.unit || "kg");
    const connected = Number.isFinite(weight) && (detail?.weight !== undefined || window.SOLRAKScale?.connected === true);
    const text = connected ? `${weight.toFixed(unit === "g" ? 0 : 3)} ${unit}` : "0.000 kg";
    const value = host.querySelector(".s95ScaleValue");
    if (value && value.textContent !== text) value.textContent = text;
  }

  function ensureTopBar() {
    const top = document.querySelector("#tab-pos>.frPosTop");
    if (!top) return false;
    const h2 = top.querySelector("h2");
    if (h2 && h2.textContent !== "Agregar Inventario") h2.textContent = "Agregar Inventario";
    if (!byId("solrakV0195Scale")) {
      const scale = document.createElement("div");
      scale.id = "solrakV0195Scale";
      scale.innerHTML = `${ICON.scale}<span>Báscula: <b class="s95ScaleValue">0.000 kg</b></span>`;
      top.appendChild(scale);
    }
    updateScale();
    return true;
  }

  function triggerSearch() {
    const input = byId("posSearch");
    if (!input) return;
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  }

  function ensureSearchButton() {
    const search = document.querySelector("#tab-pos .frPosSearch");
    const input = byId("posSearch");
    if (!search || !input) return false;
    if (!byId("solrakV0195SearchBtn")) {
      const button = document.createElement("button");
      button.id = "solrakV0195SearchBtn";
      button.type = "button";
      button.textContent = "BUSCAR";
      button.onclick = triggerSearch;
      search.appendChild(button);
    }
    if (input.dataset.s95Bound !== "1") {
      input.dataset.s95Bound = "1";
      input.addEventListener("input", () => {
        byId("tab-pos")?.classList.toggle("v0195-searching", !!input.value.trim());
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (event.key === "Enter") setTimeout(() => byId("tab-pos")?.classList.remove("v0195-searching"), 0);
      });
    }
    return true;
  }

  function ensureHeaders() {
    const head = document.querySelector("#tab-pos .frPosCartHead");
    if (!head) return false;
    const spans = [...head.children];
    const labels = ["Código", "Nombre del Producto", "Cantidad", "Precio", "Importe"];
    labels.forEach((label, i) => { if (spans[i] && spans[i].textContent !== label) spans[i].textContent = label; });
    if (!head.querySelector(".s95HeadWholesale")) {
      const wholesale = document.createElement("span");
      wholesale.className = "s95HeadWholesale";
      wholesale.textContent = "Mayoreo";
      const discount = document.createElement("span");
      discount.className = "s95HeadDiscount";
      discount.textContent = "Descuento";
      head.append(wholesale, discount);
    }
    return true;
  }

  function lineData(id) {
    return (window.FacturaRapidaPOS?.cart || []).find((item) => String(item.id) === String(id));
  }

  function decorateRows() {
    const cart = byId("posCart");
    if (!cart) return false;
    if (posObserver) posObserver.disconnect();
    try {
      cart.querySelectorAll("[data-pos-line]").forEach((row) => {
        const item = lineData(row.dataset.posLine);
        if (!row.querySelector(".s95Wholesale")) {
          const wholesale = document.createElement("span");
          wholesale.className = "s95Cell s95Wholesale";
          const discount = document.createElement("span");
          discount.className = "s95Cell s95Discount";
          row.append(wholesale, discount);
        }
        const wholesale = row.querySelector(".s95Wholesale");
        const discount = row.querySelector(".s95Discount");
        const wholesaleText = item && Number(item.wholesale) > 0 ? money(item.wholesale) : "—";
        const list = Number(item?.list_price ?? item?.price ?? 0);
        const price = Number(item?.price ?? 0);
        const qty = Number(item?.qty || 0);
        const discountAmount = Math.max(0, list - price) * qty;
        const discountText = discountAmount > 0 ? money(discountAmount) : "—";
        if (wholesale && wholesale.textContent !== wholesaleText) wholesale.textContent = wholesaleText;
        if (discount && discount.textContent !== discountText) discount.textContent = discountText;
      });
    } finally {
      if (posObserver && cart.isConnected) posObserver.observe(cart, { childList: true, subtree: true });
    }
    return true;
  }

  function bindCartObserver() {
    const cart = byId("posCart");
    if (!cart) return false;
    if (posObserver) posObserver.disconnect();
    let queued = false;
    posObserver = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      setTimeout(() => { queued = false; decorateRows(); }, 0);
    });
    posObserver.observe(cart, { childList: true, subtree: true });
    decorateRows();
    return true;
  }

  function decorateBottomActions() {
    const discount = document.querySelector('[data-fiel-pos-tool="discount"]');
    const clear = document.querySelector('[data-fiel-pos-tool="clear"]');
    const print = document.querySelector('[data-fiel-pos-tool="print"]');
    if (discount && discount.dataset.s95Icon !== "1") { discount.dataset.s95Icon = "1"; discount.innerHTML = `${ICON.tag}<span>Aplicar Descuento a la Venta</span>`; }
    if (clear && clear.dataset.s95Icon !== "1") { clear.dataset.s95Icon = "1"; clear.innerHTML = `${ICON.x}<span>Eliminar Productos En Venta</span>`; }
    if (print && print.dataset.s95Icon !== "1") { print.dataset.s95Icon = "1"; print.innerHTML = `${ICON.printer}<span>Imprimir Ticket En Venta</span>`; }
  }

  function ensureFooter() {
    if (byId("solrakV0195Footer")) return;
    const footer = document.createElement("div");
    footer.id = "solrakV0195Footer";
    document.body.appendChild(footer);
    const tick = () => {
      if (!footer.isConnected) return;
      const now = new Date();
      footer.textContent = now.toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };
    tick();
    clockTimer = setInterval(tick, 1000);
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset.solrakSumaSales95 = "1";
    if (!buildMenu()) return false;
    if (!ensureTopBar()) return false;
    if (!ensureSearchButton()) return false;
    ensureHeaders();
    decorateBottomActions();
    ensureFooter();
    bindCartObserver();
    return true;
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(() => mount(), 25);
  }

  function boot() {
    if (!mount()) {
      mountObserver = new MutationObserver(scheduleMount);
      mountObserver.observe(document.documentElement, { childList: true, subtree: true });
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (mount() || tries >= 80) {
          clearInterval(timer);
          if (mountObserver) { mountObserver.disconnect(); mountObserver = null; }
        }
      }, 100);
    }
    document.addEventListener("solrak:scale-weight", (event) => updateScale(event.detail));
    document.addEventListener("solrak:pos-sale-complete", () => setTimeout(() => { decorateRows(); ensureSearchButton(); }, 0));
  }

  function destroy() {
    if (posObserver) posObserver.disconnect();
    if (mountObserver) mountObserver.disconnect();
    clearTimeout(mountTimer);
    clearInterval(clockTimer);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSumaSalesV0195 = { version: VERSION, mount, destroy, decorateRows, updateScale };
})();