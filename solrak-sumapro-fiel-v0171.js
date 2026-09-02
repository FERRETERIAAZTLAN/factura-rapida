(() => {
  "use strict";

  const VERSION = "0.1.71";
  const STYLE_ID = "solrakSumaproFielV0171Style";
  const SIDEBAR_ID = "solrakFielSidebar";
  const byId = (id) => document.getElementById(id);
  const clean = (value) => String(value ?? "").trim();
  const escHtml = (value) =>
    String(value ?? "").replace(
      /[&<>\"]/g,
      (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[
          char
        ],
    );
  const moneyMx = (value) =>
    typeof window.money === "function"
      ? window.money(value)
      : Number(value || 0).toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        });
  let activeSaleDetail = null;
  let sidebarTimer = null;

  const ICONS = {
    price:
      '<path d="M4 6h16v12H4zM7 9h6M7 13h4M17 9v6"/>',
    ticket:
      '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>',
    common:
      '<path d="m4 8 8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8"/>',
    search:
      '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    return:
      '<path d="M9 7H4v-5M4 7c2-3 5-4 8-4a8 8 0 1 1-7 12"/>',
    invoice:
      '<path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6"/>',
    quote:
      '<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
    clients:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11a3 3 0 1 0 0-6"/>',
    products:
      '<path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/>',
    suppliers:
      '<path d="M3 21v-8l5-3v11M8 21V6l6-3v18M14 21v-6l7-3v9M2 21h20"/>',
    users:
      '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0"/>',
    shifts:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cash:
      '<path d="M3 8h18v11H3zM7 8V5h10v3M7 13h4"/>',
    config:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-2.8 2.8a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6h-4a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-2.8-2.8a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14v-4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l2.8-2.8a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l2.8 2.8a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1v4a1.7 1.7 0 0 0-1.6 1Z"/>',
    report:
      '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    mail:
      '<path d="M3 5h18v14H3zM3 7l9 6 9-6"/>',
    stamp:
      '<path d="M8 15h8l2 3H6zM9 15v-3a3 3 0 0 1 6 0v3M7 21h10"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
  };

  function svg(name, extra = "") {
    return `<svg ${extra} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.ticket}</svg>`;
  }

  function currentProducts() {
    try {
      return Array.isArray(products) ? products : [];
    } catch {
      return [];
    }
  }

  function currentClients() {
    try {
      return Array.isArray(clients) ? clients : [];
    } catch {
      return [];
    }
  }

  function currentSession() {
    try {
      return session || null;
    } catch {
      return null;
    }
  }

  function isAdministrator() {
    try {
      return typeof isAdmin === "function"
        ? isAdmin()
        : currentSession()?.user?.role === "admin";
    } catch {
      return false;
    }
  }

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else if (error) window.alert(message);
  }

  async function posApi(action, payload = {}) {
    const api = window.FacturaRapidaPOS?.api;
    if (typeof api !== "function")
      throw new Error("El servicio del punto de venta todavía no está listo.");
    return api(action, payload);
  }

  function showDialog(id) {
    const dialog = byId(id);
    if (!dialog) return;
    if (dialog.showModal && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(id) {
    const dialog = byId(id);
    if (!dialog) return;
    if (dialog.close && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{--fiel-side:246px;--fiel-top:58px;--fiel-orange:#e97618;--fiel-orange-dark:#b8520d;--fiel-yellow:#f4c400;--fiel-line:#d9dde1;--fiel-text:#343b42}
html[data-solrak-fiel="1"] .nav{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#${SIDEBAR_ID}{position:fixed;z-index:7900;inset:0 auto 0 0;width:var(--fiel-side);display:flex;flex-direction:column;border-right:1px solid #d5d9dd;background:#f5f6f6;color:#3d454c;font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif}
.fielBrand{height:var(--fiel-top);min-height:var(--fiel-top);display:flex;align-items:center;gap:10px;padding:7px 15px;background:linear-gradient(90deg,#e85e1a,#ed7b20);color:#fff}
.fielBrandMark{width:38px;height:38px;display:grid;place-items:center;border:2px solid rgba(255,255,255,.9);border-radius:9px;font-weight:950;font-size:18px}.fielBrandText strong{display:block;font-size:19px;line-height:1;letter-spacing:.04em}.fielBrandText small{display:block;margin-top:4px;font-size:8px;letter-spacing:.14em;opacity:.9}
.fielMenu{flex:1;min-height:0;overflow-y:auto;padding:8px 0 70px;scrollbar-width:thin}.fielMenuItem,.fielMenuGroup{width:100%;min-height:39px;display:flex;align-items:center;gap:10px;padding:0 14px;border:0;border-left:3px solid transparent;background:transparent;color:#414950;text-align:left;font:500 12px/1.2 inherit;cursor:pointer}.fielMenuItem:hover,.fielMenuGroup:hover{background:#e9ebec}.fielMenuItem.active{border-left-color:var(--fiel-orange);background:#e2e4e5;color:#23282d;font-weight:700}.fielMenuItem>svg,.fielMenuGroup>svg{width:19px;height:19px;flex:0 0 19px;color:#657078}.fielMenuGroup .fielChevron{width:13px;height:13px;margin-left:auto;transition:transform .16s}.fielMenuGroup[aria-expanded="true"] .fielChevron{transform:rotate(90deg)}.fielSubmenu{display:none;padding:0 0 3px}.fielSubmenu.open{display:block}.fielSubmenu .fielMenuItem{min-height:32px;padding-left:48px;font-size:11px}.fielBadge{margin-left:auto;min-width:18px;padding:2px 5px;border-radius:3px;background:#e4e6e7;color:#6c747b;font-size:9px;text-align:center}
.fielFinish{position:absolute;z-index:2;left:0;right:0;bottom:0;height:48px;border:0;background:linear-gradient(90deg,#f0b800,#f6ca00);color:#fff;font-size:12px;font-weight:900;text-transform:uppercase;box-shadow:0 -1px 0 rgba(0,0,0,.08)}.fielFinish:hover{filter:brightness(.96)}.fielFinish.disabled{opacity:.62}
html[data-solrak-fiel="1"] main.shell{margin-left:var(--fiel-side)!important;width:auto!important;max-width:none!important;padding:0!important;background:#fff!important}
html[data-solrak-fiel="1"] main.shell>.top{height:var(--fiel-top)!important;min-height:var(--fiel-top)!important;margin:0!important;padding:7px 15px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;background:linear-gradient(90deg,#e85e1a,#ed7b20)!important;color:#fff!important}
html[data-solrak-fiel="1"] main.shell>.top>div:first-child{position:absolute;left:20%;right:20%;text-align:center;pointer-events:none}html[data-solrak-fiel="1"] main.shell>.top h1{color:#fff!important;font-size:18px!important;font-weight:500!important;letter-spacing:.02em!important;text-transform:uppercase}html[data-solrak-fiel="1"] main.shell>.top .eyebrow,html[data-solrak-fiel="1"] main.shell>.top #businessName,html[data-solrak-fiel="1"] main.shell>.top .frDesktopHint,html[data-solrak-fiel="1"] main.shell>.top .frBrandBadge,html[data-solrak-fiel="1"] main.shell>.top .pill.ok,html[data-solrak-fiel="1"] main.shell>.top #changePinBtn,html[data-solrak-fiel="1"] main.shell>.top #frShortcutOpen,html[data-solrak-fiel="1"] main.shell>#solrakContextBar{display:none!important}
html[data-solrak-fiel="1"] main.shell>.top .top-actions{margin-left:auto;gap:0!important}.fielMailTop{width:44px;height:44px;display:grid;place-items:center;border:0!important;border-right:1px solid rgba(255,255,255,.28)!important;background:transparent!important;color:#fff!important}.fielMailTop svg{width:21px;height:21px}html[data-solrak-fiel="1"] main.shell>.top #currentUser{min-width:166px;min-height:44px!important;display:flex;align-items:center;border:0!important;background:rgba(255,255,255,.13)!important;font-weight:700!important}html[data-solrak-fiel="1"] main.shell>.top #logoutBtn{width:36px;min-height:44px!important;padding:0!important;border:0!important;background:rgba(255,255,255,.13)!important;font-size:0!important}html[data-solrak-fiel="1"] main.shell>.top #logoutBtn::after{content:"×";font-size:19px}
html[data-solrak-fiel="1"] .tab-panel:not(#tab-pos){padding:16px 18px 30px!important}
html[data-solrak-fiel="1"][data-solrak-professional-pos="1"] #tab-pos{height:calc(100vh - var(--fiel-top))!important;display:grid!important;grid-template-rows:43px minmax(0,1fr)!important;padding:0!important;overflow:hidden!important}
html[data-solrak-fiel="1"] #tab-pos.hidden{display:none!important}html[data-solrak-fiel="1"] #tab-pos>.frPosTop{height:43px!important;min-height:43px!important;padding:0 14px!important;border-bottom:1px solid var(--fiel-line)!important;background:#fff!important}html[data-solrak-fiel="1"] #tab-pos>.frPosTop h2{font-size:12px!important}html[data-solrak-fiel="1"] #tab-pos>.frPosTop .frPosHint,html[data-solrak-fiel="1"] #tab-pos>.frPosTop .eyebrow{display:none!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid{height:100%!important;min-height:0!important;grid-template-columns:minmax(0,1fr) 300px!important;gap:0!important}
html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack{display:grid!important;min-height:0!important;grid-template-rows:68px minmax(0,1fr)!important;gap:0!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:first-child{padding:8px 12px!important;border:0!important;border-radius:0!important;border-bottom:1px solid var(--fiel-line)!important;box-shadow:none!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:first-child .card-head,html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:first-child .frPosHint{display:none!important}html[data-solrak-fiel="1"] #tab-pos .fielPosRecentHidden{display:none!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartCard{height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartCard>.card-head{display:none!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartCard>label{height:34px!important;min-height:34px!important;padding:0 10px!important}html[data-solrak-fiel="1"] #tab-pos .frPosCart{min-height:0!important;flex:1!important;max-height:none!important;border-radius:0!important;border-width:1px 0 0!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartHead,html[data-solrak-fiel="1"] #tab-pos .frPosLine{grid-template-columns:84px minmax(180px,1fr) 116px 86px 105px!important}
html[data-solrak-fiel="1"] #tab-pos aside.summary{position:relative!important;height:100%!important;max-height:none!important;padding:10px 12px!important;overflow:hidden!important;border:0!important;border-left:1px solid var(--fiel-line)!important;border-radius:0!important;box-shadow:none!important;background:#fafafa!important;display:flex!important;flex-direction:column!important}html[data-solrak-fiel="1"] #tab-pos .frPreview{height:198px!important;min-height:198px!important;margin:0 0 9px!important;background:#fff!important}html[data-solrak-fiel="1"] #tab-pos .frPreview img{height:155px!important}html[data-solrak-fiel="1"] #tab-pos .frTicketBar{display:block!important;margin:0!important;padding:0!important;overflow:auto!important;max-height:205px}html[data-solrak-fiel="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr!important;gap:5px!important}html[data-solrak-fiel="1"] #tab-pos .frTicket{width:100%!important;min-height:46px!important}html[data-solrak-fiel="1"] #tab-pos .frTicketNew{width:100%!important;min-height:38px!important;margin-top:5px!important}html[data-solrak-fiel="1"] #tab-pos .frPosTotals{margin-top:auto!important}html[data-solrak-fiel="1"] #tab-pos .frPosGrand{font-size:34px!important}html[data-solrak-fiel="1"] #tab-pos .frPosGrand strong{color:#333!important}html[data-solrak-fiel="1"] #tab-pos #posCharge{position:absolute!important;width:1px!important;height:1px!important;min-height:1px!important;margin:0!important;padding:0!important;opacity:0!important;pointer-events:none!important}html[data-solrak-fiel="1"] #tab-pos #posReceipt{max-height:110px;overflow:auto}
.fielPosActions{margin-top:auto;padding:7px 10px 9px;border-top:1px solid #e0e3e5;background:#fff}.fielPosStats{display:flex;align-items:center;gap:34px;margin-bottom:7px;color:#657078;font-size:10px}.fielPosStats strong{color:var(--fiel-orange);font-size:17px;font-weight:500}.fielPosTools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.fielPosTool{min-height:30px;padding:5px 9px;border:0;background:transparent;color:#5c666f;font-size:10px}.fielPosTool:hover{background:#f0f1f2}.fielPosTool.danger{color:#a53e3e}
.fielDialog{border:0!important;border-radius:0!important;padding:0!important;width:min(1000px,calc(100vw - 44px));max-height:calc(100vh - 44px);overflow:hidden;background:#fff;box-shadow:0 20px 70px rgba(0,0,0,.33);font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif}.fielDialog::backdrop{background:rgba(20,23,26,.65)}.fielDialog.small{width:min(440px,calc(100vw - 36px))}.fielDialog.wide{width:min(1180px,calc(100vw - 38px))}.fielDialogHead{height:40px;display:flex;align-items:center;justify-content:center;position:relative;padding:0 44px;background:linear-gradient(90deg,#e85e1a,#ed7b20);color:#fff;font-size:13px;font-weight:700}.fielDialogClose{position:absolute;right:5px;top:3px;width:34px;height:34px;border:0;background:transparent;color:#fff;font-size:22px}.fielDialogBody{padding:15px 18px 18px;max-height:calc(100vh - 84px);overflow:auto}.fielDialogFoot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.fielBtn{min-height:35px;padding:7px 15px;border:1px solid #d0d4d8;background:#fff;color:#424a51;font-size:11px;font-weight:700}.fielBtn.primary{border-color:#edb900!important;background:linear-gradient(90deg,#efb900,#f5ca00)!important;color:#fff!important}.fielBtn.orange{border-color:var(--fiel-orange)!important;background:var(--fiel-orange)!important;color:#fff!important}.fielBtn.danger{border-color:#c84c4c!important;background:#c84c4c!important;color:#fff!important}.fielField{width:100%;height:36px;padding:7px 9px;border:0;border-bottom:2px solid var(--fiel-orange);border-radius:0;background:#f1f2f3;outline:none}.fielField:focus{background:#fff2e9}.fielFormGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 16px}.fielFormGrid .wide{grid-column:1/-1}.fielLabel{display:grid;gap:5px;color:#555e66;font-size:11px}.fielTableWrap{max-height:310px;overflow:auto;border:1px solid #e0e3e5}.fielTable{width:100%;border-collapse:collapse;font-size:11px}.fielTable th{position:sticky;top:0;z-index:1;padding:7px 9px;background:#e7e8e9;color:#545d65;text-align:left}.fielTable td{padding:7px 9px;border-bottom:1px solid #eceeef}.fielTable tbody tr{cursor:pointer}.fielTable tbody tr:hover,.fielTable tbody tr.selected{background:#fff1cf}.fielEmpty{padding:34px 12px;color:#7b848c;text-align:center;font-size:12px}.fielSearchRow{display:grid;grid-template-columns:130px minmax(0,1fr) 44px;gap:9px;align-items:center;margin-bottom:13px}.fielSearchIcon{height:36px;border:0;background:var(--fiel-orange);color:#fff}.fielSearchIcon svg{width:18px;height:18px}.fielProductResult{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:16px;min-height:260px}.fielProductImage{display:grid;place-items:center;border:1px solid #e0e3e5;background:#fff}.fielProductImage img{max-width:100%;max-height:250px;object-fit:contain}.fielProductFacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.fielFact{padding:10px;border-bottom:1px solid #e1e4e6}.fielFact span{display:block;color:#7b858e;font-size:9px;text-transform:uppercase}.fielFact strong{display:block;margin-top:4px;font-size:14px}.fielStatus{display:inline-flex;padding:3px 7px;border-radius:3px;background:#eceff1;font-size:9px}.fielStatus.ok{background:#e9f7ee;color:#237047}.fielStatus.bad{background:#fff0f0;color:#a63737}
.fielTicketDetail{margin-top:14px}.fielTicketTotals{display:flex;align-items:baseline;gap:10px;margin-top:13px;font-size:15px}.fielTicketTotals strong{font-size:30px;color:#e6ad00}.fielTicketButtons{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:14px}.fielPaymentGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.fielPaymentGrid label{padding:10px;border:1px solid #dce0e3}.fielPaymentGrid input{margin-top:6px}.fielReturnSummary{display:flex;gap:42px;align-items:baseline;margin-top:14px}.fielReturnSummary span{font-size:12px}.fielReturnSummary strong{margin-left:8px;color:#e7ad00;font-size:28px;font-weight:500}.fielManager{display:grid;grid-template-columns:minmax(290px,.72fr) minmax(0,1.28fr);gap:16px}.fielManagerForm{padding:14px;border:1px solid #dde1e4;background:#fafafa}.fielManagerForm h3{margin:0 0 12px;font-size:13px}
.fielConfigTabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:linear-gradient(90deg,#e85e1a,#ed7b20)}.fielConfigTab{height:45px;border:0;background:transparent;color:rgba(255,255,255,.9);font-size:10px;text-transform:uppercase}.fielConfigTab.active{background:rgba(255,255,255,.13);font-weight:800}.fielConfigPanel{display:none;min-height:430px;padding:21px 28px}.fielConfigPanel.active{display:block}.fielToggle{display:flex!important;grid-template-columns:none!important;flex-direction:row!important;align-items:center;gap:9px!important;color:#495159!important;font-size:11px!important}.fielToggle input{width:17px;height:17px;accent-color:#f0bb00}.fielConfigSection{padding:0 0 18px;margin-bottom:18px;border-bottom:1px solid #e2e5e7}.fielConfigSection h3{margin:0 0 13px;font-size:13px}.fielConfigRow{display:grid;grid-template-columns:180px minmax(0,1fr);gap:22px;align-items:start}.fielConfigActions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.fielLogoBox{display:grid;grid-template-columns:150px 1fr auto;gap:18px;align-items:center}.fielLogoBox img{width:140px;height:82px;object-fit:contain;border:1px solid #e0e3e5}.fielColorRow{display:flex;gap:4px;flex-wrap:wrap}.fielColor{width:24px;height:34px;border:2px solid transparent}.fielColor.active{border-color:#232a30}.fielSoon{padding:16px;border:1px dashed #cfd5da;background:#fafbfb;color:#65717b;font-size:11px;line-height:1.45}
@media(max-width:1023px){#${SIDEBAR_ID}{width:210px;transform:translateX(-100%)}html[data-solrak-fiel="1"] main.shell{margin-left:0!important}.fielDialog{width:calc(100vw - 20px)}.fielProductResult,.fielFormGrid,.fielConfigRow,.fielLogoBox,.fielManager{grid-template-columns:1fr}.fielPaymentGrid{grid-template-columns:1fr 1fr}}
`;
    document.head.appendChild(style);
  }

  function item(action, label, icon, options = {}) {
    const attr = options.tab ? ` data-tab-target="${options.tab}"` : "";
    const badge = options.badgeId
      ? `<span class="fielBadge" id="${options.badgeId}">0</span>`
      : "";
    return `<button class="fielMenuItem" type="button" data-fiel-action="${action}"${attr}>${svg(icon)}<span>${escHtml(label)}</span>${badge}</button>`;
  }

  function group(name, label, icon, children) {
    return `<button class="fielMenuGroup" type="button" data-fiel-group="${name}" aria-expanded="false">${svg(icon)}<span>${escHtml(label)}</span>${svg("chevron", 'class="fielChevron"')}</button><div class="fielSubmenu" data-fiel-submenu="${name}">${children.join("")}</div>`;
  }

  function sidebarMarkup() {
    return `<div class="fielBrand"><div class="fielBrandMark">S</div><div class="fielBrandText"><strong>SOLRAK</strong><small>PUNTO DE VENTA</small></div></div><div class="fielMenu">
      ${item("price-check", "Verificador Precios", "price")}
      ${item("new-ticket", "Nuevo Ticket", "ticket")}
      ${item("common-product", "Producto Común", "common")}
      ${item("ticket-search", "Consultar Ticket", "search")}
      ${item("return-sale", "Devolución", "return")}
      ${item("tab", "Facturación", "invoice", { tab: "factura" })}
      ${item("tab", "Cotizaciones", "quote", { tab: "cotizaciones" })}
      ${group("clients", "Clientes", "clients", [
        item("tab", "Clientes", "clients", { tab: "clientes" }),
        item("credits", "Créditos", "cash"),
        item("credits", "Reporte de Créditos", "report"),
        item("credits", "Reporte de Pagos", "report"),
      ])}
      ${group("products", "Productos", "products", [
        item("tab", "Productos", "products", { tab: "inventario" }),
        item("categories", "Categorías", "products"),
        item("promotions", "Promociones", "products"),
        item("low-stock", "Inventario Bajo", "report"),
      ])}
      ${item("tab", "Proveedores", "suppliers", { tab: "proveedores" })}
      ${item("tab", "Usuarios", "users", { tab: "usuarios" })}
      ${item("shifts", "Turnos", "shifts")}
      ${group("cash", "Caja", "cash", [
        item("cash-in", "Entradas", "cash"),
        item("cash-out", "Salidas", "cash"),
        item("cash-cut", "Corte de Caja", "report"),
      ])}
      ${item("configuration", "Configuración", "config")}
      ${item("email", "Correo", "mail")}
      ${item("stamps", "Timbres", "stamp")}
      ${group("reports", "Reportes", "report", [
        item("sales-report", "Resumen de Ventas", "report"),
        item("sales-report", "Detalle de Ventas", "report"),
        item("sales-report", "F.P. en Ventas", "report"),
        item("tab", "Inventario", "products", { tab: "inventario" }),
        item("sales-report", "Historial Movimientos", "report"),
        item("sales-report", "Más Vendidos", "report"),
      ])}
    </div><button id="fielFinishSale" class="fielFinish disabled" type="button">Finalizar venta</button>`;
  }

  function ensureSidebar() {
    let sidebar = byId(SIDEBAR_ID);
    if (!sidebar) {
      sidebar = document.createElement("aside");
      sidebar.id = SIDEBAR_ID;
      sidebar.innerHTML = sidebarMarkup();
      document.body.appendChild(sidebar);
      bindSidebar(sidebar);
    }
    return sidebar;
  }

  function originalTab(tab) {
    if (!tab) return;
    if ((tab === "usuarios" || tab === "configuracion") && !isAdministrator()) {
      notify("Solo el administrador puede abrir esta opción.", true);
      return;
    }
    if (typeof window.switchTab === "function") window.switchTab(tab);
    else document.querySelector(`.nav>button[data-tab="${tab}"]`)?.click();
    document.documentElement.dataset.fielActiveTab = tab;
    syncActiveMenu(tab);
    if (tab === "pos") setTimeout(() => byId("posSearch")?.focus(), 20);
  }

  function syncActiveMenu(tab) {
    document
      .querySelectorAll("#solrakFielSidebar .fielMenuItem")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.tabTarget === tab),
      );
  }

  function bindSidebar(sidebar) {
    sidebar.querySelectorAll("[data-fiel-group]").forEach((button) => {
      button.onclick = () => {
        const name = button.dataset.fielGroup;
        const open = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", open ? "true" : "false");
        sidebar
          .querySelector(`[data-fiel-submenu="${name}"]`)
          ?.classList.toggle("open", open);
      };
    });
    sidebar.querySelectorAll("[data-fiel-action]").forEach((button) => {
      button.onclick = () => runAction(button.dataset.fielAction, button);
    });
    byId("fielFinishSale").onclick = () => {
      originalTab("pos");
      window.FacturaRapidaPOS?.openPayment?.();
    };
  }

  async function runAction(action, button) {
    const tab = button?.dataset?.tabTarget;
    if (action === "tab") return originalTab(tab);
    if (action === "price-check") return openPriceVerifier();
    if (action === "new-ticket") {
      originalTab("pos");
      window.FacturaRapidaPOS?.newTicket?.();
      return;
    }
    if (action === "common-product") {
      originalTab("pos");
      byId("fielCommonForm")?.reset();
      showDialog("fielCommonDialog");
      setTimeout(() => byId("fielCommonName")?.focus(), 20);
      return;
    }
    if (action === "ticket-search") return openTicketSearch();
    if (action === "return-sale") return openReturns();
    if (action === "configuration") return openConfiguration("devices");
    if (action === "email") {
      window.SOLRAKSumaproTicketsV0169?.openTab?.("correo");
      syncActiveMenu("correo");
      return;
    }
    if (action === "stamps") {
      window.SOLRAKSumaproTicketsV0169?.openTab?.("timbres");
      syncActiveMenu("timbres");
      return;
    }
    if (action === "sales-report") return originalTab("reportes-ventas");
    if (action === "categories") return showCatalogView("categories");
    if (action === "low-stock") return showCatalogView("low-stock");
    if (action === "promotions") {
      resetPromotionForm();
      return openPromotions();
    }
    if (action === "credits") return openCredits();
    if (action === "shifts") return openShifts();
    if (action === "cash-in") return openCashMovement("income");
    if (action === "cash-out") return openCashMovement("expense");
    if (action === "cash-cut") return openCashCut();
  }

  function dialogsMarkup() {
    return `
    <dialog id="fielPriceDialog" class="fielDialog wide"><div class="fielDialogHead">Verificador de Precios<button class="fielDialogClose" data-fiel-close="fielPriceDialog" type="button">×</button></div><div class="fielDialogBody"><div class="fielSearchRow"><span>Producto/Código</span><input id="fielPriceQuery" class="fielField" autocomplete="off"><button id="fielPriceSearch" class="fielSearchIcon" type="button">${svg("search")}</button></div><div id="fielPriceResult" class="fielProductResult"><div class="fielEmpty">Escanea un código o escribe un producto.</div><div class="fielProductImage"></div></div><div class="fielDialogFoot"><button class="fielBtn" data-fiel-close="fielPriceDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielCommonDialog" class="fielDialog small"><div class="fielDialogHead">Producto Común<button class="fielDialogClose" data-fiel-close="fielCommonDialog" type="button">×</button></div><form id="fielCommonForm" class="fielDialogBody"><div class="fielFormGrid"><label class="fielLabel wide">Nombre del producto<input id="fielCommonName" class="fielField" maxlength="180" placeholder="Ej. corte de cable" required></label><label class="fielLabel wide">Cantidad<input id="fielCommonQty" class="fielField" type="number" min="0.001" step="0.001" value="1" required></label><label class="fielLabel">Costo<input id="fielCommonCost" class="fielField" type="number" min="0" step="0.01" value="0.00"></label><label class="fielLabel">Precio Público<input id="fielCommonPrice" class="fielField" type="number" min="0.01" step="0.01" value="0.00" required></label></div><div class="fielDialogFoot"><button class="fielBtn primary" type="submit">Guardar</button><button class="fielBtn" data-fiel-close="fielCommonDialog" type="button">Cerrar</button></div></form></dialog>
    <dialog id="fielTicketDialog" class="fielDialog wide"><div class="fielDialogHead">Consultar Ticket<button class="fielDialogClose" data-fiel-close="fielTicketDialog" type="button">×</button></div><div class="fielDialogBody"><div class="fielSearchRow"><span># Ticket</span><input id="fielTicketQuery" class="fielField" inputmode="numeric"><button id="fielTicketSearch" class="fielSearchIcon" type="button">${svg("search")}</button></div><div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Ticket</th><th>Importe</th><th>Atendió</th><th>Fecha</th><th>Venta</th><th>Nota</th></tr></thead><tbody id="fielTicketRows"></tbody></table></div><div id="fielTicketDetail" class="fielTicketDetail"></div><div class="fielTicketButtons"><button id="fielModifyPayment" class="fielBtn orange" type="button" disabled>Modificar forma de pago</button><button id="fielCancelSale" class="fielBtn danger" type="button" disabled>Cancelar ticket</button><button id="fielOpenDrawer" class="fielBtn primary" type="button">Abrir cajón de dinero</button><button id="fielPrintSale" class="fielBtn primary" type="button" disabled>Imprimir ticket</button><button class="fielBtn" data-fiel-close="fielTicketDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielPaymentDialog" class="fielDialog"><div class="fielDialogHead">Modificar forma de pago<button class="fielDialogClose" data-fiel-close="fielPaymentDialog" type="button">×</button></div><div class="fielDialogBody"><p>La suma debe coincidir exactamente con el total del ticket. Crédito requiere un cliente ligado a la venta.</p><div class="fielPaymentGrid"><label>Efectivo<input class="fielField" data-fiel-payment="cash" type="number" min="0" step="0.01"></label><label>Tarjeta<input class="fielField" data-fiel-payment="card" type="number" min="0" step="0.01"></label><label>Transferencia<input class="fielField" data-fiel-payment="transfer" type="number" min="0" step="0.01"></label><label>Crédito<input class="fielField" data-fiel-payment="credit" type="number" min="0" step="0.01"></label><label>Otro<input class="fielField" data-fiel-payment="other" type="number" min="0" step="0.01"></label></div><label class="fielLabel" style="margin-top:12px">Motivo del cambio<input id="fielPaymentReason" class="fielField" maxlength="240"></label><div class="fielDialogFoot"><button id="fielSavePayment" class="fielBtn primary" type="button">Guardar cambio</button><button class="fielBtn" data-fiel-close="fielPaymentDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielReturnDialog" class="fielDialog wide"><div class="fielDialogHead">Devoluciones<button class="fielDialogClose" data-fiel-close="fielReturnDialog" type="button">×</button></div><div class="fielDialogBody"><div class="fielSearchRow"><span># Ticket</span><input id="fielReturnQuery" class="fielField" inputmode="numeric"><button id="fielReturnSearch" class="fielSearchIcon" type="button">${svg("search")}</button></div><div id="fielReturnLines" class="fielTableWrap"><div class="fielEmpty">Busca un ticket finalizado.</div></div><div class="fielReturnSummary"><span>Total a devolver <strong id="fielReturnTotal">$0.00</strong></span><span>Total devuelto <strong id="fielReturnedTotal">$0.00</strong></span></div><div class="fielFormGrid" style="margin-top:12px"><label class="fielLabel">Forma de devolución<select id="fielRefundMethod" class="fielField"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="credit">Saldo a crédito</option><option value="other">Otro</option></select></label><label class="fielLabel">Motivo<input id="fielReturnReason" class="fielField" maxlength="240"></label></div><div class="fielDialogFoot"><button id="fielConfirmReturn" class="fielBtn primary" type="button" disabled>Devolver</button><button class="fielBtn" data-fiel-close="fielReturnDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielConfigDialog" class="fielDialog"><div class="fielDialogHead" style="background:#fff;color:#252b30;border-bottom:1px solid #e1e4e6">Configuración<button class="fielDialogClose" style="color:#252b30" data-fiel-close="fielConfigDialog" type="button">×</button></div><div class="fielConfigTabs"><button class="fielConfigTab active" data-fiel-config="devices" type="button">Dispositivos</button><button class="fielConfigTab" data-fiel-config="ticket" type="button">Ticket</button><button class="fielConfigTab" data-fiel-config="backups" type="button">Respaldos</button><button class="fielConfigTab" data-fiel-config="other" type="button">Otros</button></div>
      <div id="fielConfigDevices" class="fielConfigPanel active"><div class="fielConfigSection"><h3>Impresora</h3><div class="fielConfigRow"><label class="fielToggle"><input id="fielPrinterEnabled" type="checkbox"> Usar impresora</label><div class="fielFormGrid"><label class="fielLabel wide">Impresora<select id="fielPrinter" class="fielField"><option value="system">Predeterminada de Windows</option></select></label><label class="fielLabel">Tipo de rollo<select id="fielPaper" class="fielField"><option value="58">58mm</option><option value="80">80mm</option></select></label><label class="fielToggle"><input id="fielAutoPrint" type="checkbox"> Imprimir automáticamente después de una venta</label></div></div><div class="fielConfigActions"><button id="fielTestTicket" class="fielBtn primary" type="button">Imprimir ticket prueba</button></div></div><div class="fielConfigSection"><h3>Báscula</h3><div class="fielConfigRow"><label class="fielToggle"><input id="fielScaleEnabled" type="checkbox" disabled> Usar báscula</label><div class="fielSoon">La conexión serial se habilitará cuando SOLRAK detecte un controlador compatible; no se simulan lecturas de peso.</div></div></div><div class="fielConfigActions"><button class="fielBtn primary" data-fiel-save-config type="button">Guardar</button><button class="fielBtn" data-fiel-close="fielConfigDialog" type="button">Cerrar</button></div></div>
      <div id="fielConfigTicket" class="fielConfigPanel"><div class="fielLogoBox"><img id="fielTicketLogo" alt="Logotipo"><div><strong>Logotipo del ticket</strong><div class="fielSoon" style="margin-top:8px">Usa el logotipo guardado para el negocio actual.</div></div><button id="fielChooseLogo" class="fielBtn" type="button">Cargar logotipo</button></div><div class="fielFormGrid" style="margin-top:18px"><label class="fielLabel wide">Nombre negocio<input id="fielTicketBusiness" class="fielField" maxlength="160"></label><label class="fielLabel wide">Calle y número / dirección<input id="fielTicketAddress" class="fielField" maxlength="260"></label><label class="fielLabel">RFC<input id="fielTicketRfc" class="fielField" maxlength="20"></label><label class="fielLabel">Teléfono<input id="fielTicketPhone" class="fielField" maxlength="60"></label><label class="fielLabel wide">Eslogan / mensaje<input id="fielTicketFooter" class="fielField" maxlength="220"></label><label class="fielToggle"><input id="fielTicketLogoEnabled" type="checkbox"> Usar logotipo</label><label class="fielToggle"><input id="fielTicketTax" type="checkbox"> Mostrar IVA</label><label class="fielToggle"><input id="fielTicketBarcode" type="checkbox"> Ticket con código de barras</label><label class="fielToggle"><input id="fielTicketAddressEnabled" type="checkbox"> Mostrar datos del negocio</label></div><div class="fielConfigActions"><button id="fielTestDesignedTicket" class="fielBtn primary" type="button">Imprimir ticket prueba</button><button class="fielBtn primary" data-fiel-save-config type="button">Guardar</button><button class="fielBtn" data-fiel-close="fielConfigDialog" type="button">Cerrar</button></div></div>
      <div id="fielConfigBackups" class="fielConfigPanel"><div class="fielConfigSection"><h3>Respaldos y exportación</h3><p class="fielSoon">Las ventas y catálogos permanecen en la nube por negocio. Puedes descargar copias de productos, clientes y facturas sin alterar la operación.</p><div class="fielConfigActions"><button id="fielOpenExport" class="fielBtn primary" type="button">Exportar datos</button></div></div><div class="fielConfigActions"><button class="fielBtn" data-fiel-close="fielConfigDialog" type="button">Cerrar</button></div></div>
      <div id="fielConfigOther" class="fielConfigPanel"><div class="fielConfigSection"><h3>Color del sistema</h3><div class="fielColorRow"><button class="fielColor active" style="background:#e97618" type="button" aria-label="Naranja"></button><button class="fielColor" style="background:#176fd1" type="button" aria-label="Azul"></button><button class="fielColor" style="background:#14845c" type="button" aria-label="Verde"></button><button class="fielColor" style="background:#812f9f" type="button" aria-label="Morado"></button></div></div><div class="fielFormGrid"><label class="fielLabel">Tipo de cambio<input id="fielExchangeRate" class="fielField" type="number" min="0" step="0.0001" value="0.00"></label></div><div class="fielConfigActions"><button class="fielBtn primary" data-fiel-save-config type="button">Guardar</button><button class="fielBtn" data-fiel-close="fielConfigDialog" type="button">Cerrar</button></div></div>
    </dialog>
    <dialog id="fielCatalogDialog" class="fielDialog wide"><div class="fielDialogHead"><span id="fielCatalogTitle">Catálogo</span><button class="fielDialogClose" data-fiel-close="fielCatalogDialog" type="button">×</button></div><div class="fielDialogBody"><div id="fielCatalogContent"></div><div class="fielDialogFoot"><button class="fielBtn" data-fiel-close="fielCatalogDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielCashMovementDialog" class="fielDialog small"><div class="fielDialogHead"><span id="fielCashMovementTitle">Movimiento de caja</span><button class="fielDialogClose" data-fiel-close="fielCashMovementDialog" type="button">×</button></div><form id="fielCashMovementForm" class="fielDialogBody"><input id="fielCashMovementType" type="hidden"><div class="fielFormGrid"><label class="fielLabel wide">Concepto<input id="fielCashConcept" class="fielField" maxlength="240" required></label><label class="fielLabel">Importe<input id="fielCashAmount" class="fielField" type="number" min="0.01" step="0.01" required></label><label class="fielLabel">Referencia<input id="fielCashReference" class="fielField" maxlength="160"></label></div><div class="fielDialogFoot"><button class="fielBtn primary" type="submit">Guardar movimiento</button><button class="fielBtn" data-fiel-close="fielCashMovementDialog" type="button">Cerrar</button></div></form></dialog>
    <dialog id="fielCreditsDialog" class="fielDialog wide"><div class="fielDialogHead">Créditos y pagos<button class="fielDialogClose" data-fiel-close="fielCreditsDialog" type="button">×</button></div><div class="fielDialogBody"><div class="fielManager"><form id="fielCreditPaymentForm" class="fielManagerForm"><h3>Registrar pago</h3><div class="fielFormGrid"><label class="fielLabel wide">Cliente<select id="fielCreditClient" class="fielField" required></select></label><label class="fielLabel">Importe<input id="fielCreditAmount" class="fielField" type="number" min="0.01" step="0.01" required></label><label class="fielLabel">Forma de pago<select id="fielCreditMethod" class="fielField"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label><label class="fielLabel wide">Concepto o referencia<input id="fielCreditReason" class="fielField" maxlength="240" required></label></div><div class="fielDialogFoot"><button class="fielBtn primary" type="submit">Registrar pago</button></div></form><div id="fielCreditsContent"><div class="fielEmpty">Cargando cuentas…</div></div></div><div class="fielDialogFoot"><button class="fielBtn" data-fiel-close="fielCreditsDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielPromotionsDialog" class="fielDialog wide"><div class="fielDialogHead">Promociones<button class="fielDialogClose" data-fiel-close="fielPromotionsDialog" type="button">×</button></div><div class="fielDialogBody"><div class="fielManager"><form id="fielPromotionForm" class="fielManagerForm"><input id="fielPromotionId" type="hidden"><h3 id="fielPromotionFormTitle">Nueva promoción</h3><div class="fielFormGrid"><label class="fielLabel wide">Producto<select id="fielPromotionProduct" class="fielField" required></select></label><label class="fielLabel wide">Nombre<input id="fielPromotionName" class="fielField" maxlength="180" required></label><label class="fielLabel">Tipo<select id="fielPromotionType" class="fielField"><option value="percent">Descuento %</option><option value="fixed_price">Precio promocional</option></select></label><label class="fielLabel">Valor<input id="fielPromotionValue" class="fielField" type="number" min="0.01" step="0.01" required></label><label class="fielLabel">Inicia<input id="fielPromotionStarts" class="fielField" type="datetime-local"></label><label class="fielLabel">Termina<input id="fielPromotionEnds" class="fielField" type="datetime-local"></label><label class="fielToggle wide"><input id="fielPromotionActive" type="checkbox" checked> Activa</label></div><div class="fielDialogFoot"><button class="fielBtn primary" type="submit">Guardar promoción</button><button id="fielPromotionNew" class="fielBtn" type="button">Nueva</button></div></form><div id="fielPromotionsContent"><div class="fielEmpty">Cargando promociones…</div></div></div><div class="fielDialogFoot"><button class="fielBtn" data-fiel-close="fielPromotionsDialog" type="button">Cerrar</button></div></div></dialog>
    <dialog id="fielShiftsDialog" class="fielDialog"><div class="fielDialogHead">Turnos<button class="fielDialogClose" data-fiel-close="fielShiftsDialog" type="button">×</button></div><div class="fielDialogBody"><div id="fielShiftsContent"></div><div class="fielDialogFoot"><button class="fielBtn" data-fiel-close="fielShiftsDialog" type="button">Cerrar</button></div></div></dialog>`;
  }

  function ensureDialogs() {
    if (byId("fielPriceDialog")) return;
    const host = document.createElement("div");
    host.id = "solrakFielDialogs";
    host.innerHTML = dialogsMarkup();
    document.body.appendChild(host);
    bindDialogs();
  }

  function bindDialogs() {
    document.querySelectorAll("[data-fiel-close]").forEach((button) => {
      button.onclick = () => closeDialog(button.dataset.fielClose);
    });
    byId("fielPriceSearch").onclick = renderPriceResult;
    byId("fielPriceQuery").onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderPriceResult();
      }
    };
    byId("fielCommonForm").onsubmit = (event) => {
      event.preventDefault();
      const ok = window.FacturaRapidaPOS?.addCommonProduct?.({
        name: byId("fielCommonName").value,
        qty: byId("fielCommonQty").value,
        cost: byId("fielCommonCost").value,
        price: byId("fielCommonPrice").value,
      });
      if (ok) {
        closeDialog("fielCommonDialog");
        notify("Producto común agregado al ticket.");
      }
    };
    byId("fielTicketSearch").onclick = loadTicketList;
    byId("fielTicketQuery").onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadTicketList();
      }
    };
    byId("fielModifyPayment").onclick = openPaymentEditor;
    byId("fielSavePayment").onclick = savePaymentChange;
    byId("fielCancelSale").onclick = cancelActiveSale;
    byId("fielPrintSale").onclick = printActiveSale;
    byId("fielOpenDrawer").onclick = openCashDrawer;
    byId("fielReturnSearch").onclick = loadReturnTicket;
    byId("fielReturnQuery").onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadReturnTicket();
      }
    };
    byId("fielConfirmReturn").onclick = confirmReturn;
    document.querySelectorAll("[data-fiel-config]").forEach((button) => {
      button.onclick = () => switchConfigPanel(button.dataset.fielConfig);
    });
    document.querySelectorAll("[data-fiel-save-config]").forEach((button) => {
      button.onclick = saveConfiguration;
    });
    byId("fielTestTicket").onclick = () =>
      window.SOLRAKSumaproTicketsV0169?.printTest?.();
    byId("fielTestDesignedTicket").onclick = () => {
      saveConfiguration();
      window.SOLRAKSumaproTicketsV0169?.printTest?.();
    };
    byId("fielChooseLogo").onclick = chooseBusinessLogo;
    byId("fielOpenExport").onclick = () => {
      closeDialog("fielConfigDialog");
      byId("frExportOpen")?.click();
    };
    byId("fielCashMovementForm").onsubmit = saveCashMovement;
    byId("fielPromotionForm").onsubmit = savePromotion;
    byId("fielPromotionNew").onclick = resetPromotionForm;
    byId("fielCreditPaymentForm").onsubmit = saveCreditPayment;
  }

  function openPriceVerifier() {
    byId("fielPriceQuery").value = "";
    byId("fielPriceResult").innerHTML =
      '<div class="fielEmpty">Escanea un código o escribe un producto.</div><div class="fielProductImage"></div>';
    showDialog("fielPriceDialog");
    setTimeout(() => byId("fielPriceQuery")?.focus(), 20);
  }

  function productImageUrl(product) {
    if (product?.image_url) return product.image_url;
    if (!product?.image_path) return "";
    return `https://jojzhohqrshsjmlirkqz.supabase.co/storage/v1/object/public/product-images/${String(product.image_path)
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  function findProduct(query) {
    const q = clean(query).toLocaleLowerCase("es-MX");
    if (!q) return null;
    const rows = currentProducts().filter((product) => product.active !== false);
    return (
      rows.find((product) => clean(product.code).toLocaleLowerCase("es-MX") === q) ||
      rows.find((product) =>
        `${product.code || ""} ${product.name || ""} ${product.description || ""}`
          .toLocaleLowerCase("es-MX")
          .includes(q),
      ) ||
      null
    );
  }

  function renderPriceResult() {
    const product = findProduct(byId("fielPriceQuery").value);
    const host = byId("fielPriceResult");
    if (!product) {
      host.innerHTML =
        '<div class="fielEmpty">No encontré un producto con ese código o nombre.</div><div class="fielProductImage"></div>';
      return;
    }
    const image = productImageUrl(product);
    host.innerHTML = `<div><h2 style="margin:0">${escHtml(product.name)}</h2><div class="fielProductFacts"><div class="fielFact"><span>Código</span><strong>${escHtml(product.code || "—")}</strong></div><div class="fielFact"><span>Precio público</span><strong>${moneyMx(product.price)}</strong></div><div class="fielFact"><span>Mayoreo</span><strong>${moneyMx(product.wholesale)}</strong></div><div class="fielFact"><span>Existencia</span><strong>${Number(product.stock || 0)} ${escHtml(product.unit || "Pieza")}</strong></div><div class="fielFact"><span>Categoría</span><strong>${escHtml(product.category || "General")}</strong></div><div class="fielFact"><span>Estado</span><strong><span class="fielStatus ${Number(product.stock || 0) > 0 ? "ok" : "bad"}">${Number(product.stock || 0) > 0 ? "Disponible" : "Sin existencia"}</span></strong></div></div></div><div class="fielProductImage">${image ? `<img src="${escHtml(image)}" alt="${escHtml(product.name)}">` : '<span class="fielEmpty">Sin imagen</span>'}</div>`;
  }

  async function openTicketSearch() {
    activeSaleDetail = null;
    byId("fielTicketQuery").value = "";
    byId("fielTicketDetail").innerHTML = "";
    setTicketActions(false);
    showDialog("fielTicketDialog");
    await loadTicketList();
  }

  function saleStatus(status, returnStatus = "none") {
    if (status === "voided") return "Cancelada";
    if (returnStatus === "full") return "Devuelta";
    if (returnStatus === "partial") return "Devolución parcial";
    return "Finalizada";
  }

  async function loadTicketList() {
    const tbody = byId("fielTicketRows");
    tbody.innerHTML = '<tr><td colspan="6" class="fielEmpty">Cargando…</td></tr>';
    try {
      const data = await posApi("recentSales", { limit: 100 });
      const query = clean(byId("fielTicketQuery").value).replace(/^#/, "");
      const rows = (data.sales || []).filter(
        (sale) => !query || String(sale.sale_number).includes(query),
      );
      tbody.innerHTML = rows.length
        ? rows
            .map(
              (sale) =>
                `<tr data-fiel-sale="${sale.id}"><td>Ticket #${sale.sale_number}</td><td>${moneyMx(sale.total)}</td><td>${escHtml(sale.created_by_name || "Usuario")}</td><td>${escHtml(new Date(sale.created_at).toLocaleString("es-MX"))}</td><td>${saleStatus(sale.status, sale.return_status)}</td><td>${escHtml(sale.notes || "")}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="6" class="fielEmpty">No hay tickets con ese número.</td></tr>';
      tbody.querySelectorAll("[data-fiel-sale]").forEach((row) => {
        row.onclick = () => selectSale(row.dataset.fielSale, row);
      });
      if (rows[0]) await selectSale(rows[0].id, tbody.firstElementChild);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="6" class="fielEmpty">${escHtml(error.message)}</td></tr>`;
    }
  }

  async function selectSale(saleId, row) {
    document
      .querySelectorAll("#fielTicketRows tr")
      .forEach((item) => item.classList.toggle("selected", item === row));
    const host = byId("fielTicketDetail");
    host.innerHTML = '<div class="fielEmpty">Cargando detalle…</div>';
    try {
      activeSaleDetail = await posApi("saleDetail", { saleId });
      renderSaleDetail();
    } catch (error) {
      activeSaleDetail = null;
      host.innerHTML = `<div class="fielEmpty">${escHtml(error.message)}</div>`;
      setTicketActions(false);
    }
  }

  function renderSaleDetail() {
    const data = activeSaleDetail;
    if (!data?.sale) return;
    byId("fielTicketDetail").innerHTML = `<h3 style="text-align:center;margin:0 0 8px">Detalle del Ticket</h3><div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Cantidad</th><th>Código</th><th>Producto</th><th>Promoción</th><th>Descuento</th><th>Importe</th></tr></thead><tbody>${(data.items || [])
      .map(
        (item) =>
          `<tr><td>${Number(item.quantity)}</td><td>${escHtml(item.code_snapshot || "—")}</td><td>${escHtml(item.name_snapshot)}</td><td>${escHtml(item.promotion_name || "—")}</td><td>${moneyMx(item.discount_amount || 0)}</td><td><strong>${moneyMx(item.total)}</strong></td></tr>`,
      )
      .join("")}</tbody></table></div><div class="fielTicketTotals"><span>Importe pagado</span><strong>${moneyMx(data.sale.total)}</strong><span style="margin-left:auto">${(data.payments || []).map((payment) => `${paymentLabel(payment.method)} ${moneyMx(payment.amount)}`).join(" · ")}</span></div>`;
    setTicketActions(true, data.sale.status);
  }

  function setTicketActions(enabled, status = "") {
    const final = enabled && status === "completed";
    const canAdminister = final && isAdministrator();
    byId("fielModifyPayment").disabled = !canAdminister;
    byId("fielCancelSale").disabled = !canAdminister;
    byId("fielPrintSale").disabled = !enabled;
  }

  function paymentLabel(method) {
    return (
      {
        cash: "Efectivo",
        card: "Tarjeta",
        transfer: "Transferencia",
        credit: "Crédito",
        other: "Otro",
      }[method] || method
    );
  }

  function openPaymentEditor() {
    if (!activeSaleDetail?.sale) return;
    document.querySelectorAll("[data-fiel-payment]").forEach((input) => {
      input.value = "0.00";
    });
    (activeSaleDetail.payments || []).forEach((payment) => {
      const input = document.querySelector(
        `[data-fiel-payment="${payment.method}"]`,
      );
      if (input) input.value = Number(payment.amount || 0).toFixed(2);
    });
    byId("fielPaymentReason").value = "";
    showDialog("fielPaymentDialog");
  }

  async function savePaymentChange() {
    if (!activeSaleDetail?.sale) return;
    const payments = [...document.querySelectorAll("[data-fiel-payment]")]
      .map((input) => ({
        method: input.dataset.fielPayment,
        amount: Number(input.value) || 0,
      }))
      .filter((payment) => payment.amount > 0);
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (Math.abs(total - Number(activeSaleDetail.sale.total)) > 0.01) {
      notify("La suma de pagos no coincide con el total del ticket.", true);
      return;
    }
    try {
      await posApi("updateSalePayments", {
        saleId: activeSaleDetail.sale.id,
        payments,
        reason: byId("fielPaymentReason").value,
      });
      closeDialog("fielPaymentDialog");
      activeSaleDetail = await posApi("saleDetail", {
        saleId: activeSaleDetail.sale.id,
      });
      renderSaleDetail();
      notify("Forma de pago actualizada.");
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function cancelActiveSale() {
    const sale = activeSaleDetail?.sale;
    if (!sale) return;
    const ux = window.SOLRAKUXV0190;
    if (!ux?.confirmSaleVoid) return notify("El diálogo seguro todavía no está listo.", true);
    const reason = await ux.confirmSaleVoid(activeSaleDetail);
    if (!clean(reason)) return;
    try {
      await posApi("voidSale", { saleId: sale.id, reason: clean(reason) });
      notify(`Ticket #${sale.sale_number} cancelado.`);
      activeSaleDetail = await posApi("saleDetail", { saleId: sale.id });
      renderSaleDetail();
      await window.FacturaRapidaPOS?.refresh?.();
      await loadTicketList();
    } catch (error) {
      notify(error.message, true);
    }
  }

  function receiptFromDetail(data) {
    const sale = data.sale;
    return {
      saleId: sale.id,
      saleNumber: sale.sale_number,
      createdAt: sale.created_at,
      customerName: sale.customer_name || "Público general",
      items: (data.items || []).map((item) => ({
        productId: item.product_id,
        code: item.code_snapshot || "",
        name: item.name_snapshot,
        qty: Number(item.quantity),
        unit: item.unit_snapshot,
        unitPrice: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        tax: Number(item.iva),
        total: Number(item.total),
      })),
      payments: (data.payments || []).map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount),
        tendered: payment.tendered_amount,
      })),
      subtotal: Number(sale.subtotal),
      tax: Number(sale.iva),
      total: Number(sale.total),
      note: sale.notes || "",
    };
  }

  function printActiveSale() {
    if (!activeSaleDetail?.sale) return;
    window.SOLRAKSumaproTicketsV0169?.printReceipt?.(
      receiptFromDetail(activeSaleDetail),
      { force: true },
    );
  }

  async function openCashDrawer() {
    try {
      const invoke = window.__TAURI__?.core?.invoke;
      if (typeof invoke === "function") {
        await invoke("open_cash_drawer");
        notify("Cajón de dinero abierto.");
        return;
      }
    } catch (error) {
      console.warn("cash drawer", error);
    }
    notify(
      "El cajón requiere una impresora ESC/POS configurada con apertura automática. SOLRAK no enviará un pulso simulado.",
      true,
    );
  }

  async function openReturns() {
    activeSaleDetail = null;
    byId("fielReturnQuery").value = "";
    byId("fielReturnLines").innerHTML =
      '<div class="fielEmpty">Busca un ticket finalizado.</div>';
    byId("fielReturnTotal").textContent = moneyMx(0);
    byId("fielReturnedTotal").textContent = moneyMx(0);
    byId("fielConfirmReturn").disabled = true;
    showDialog("fielReturnDialog");
  }

  async function loadReturnTicket() {
    const query = clean(byId("fielReturnQuery").value).replace(/^#/, "");
    if (!query) return notify("Escribe el número de ticket.", true);
    const host = byId("fielReturnLines");
    host.innerHTML = '<div class="fielEmpty">Cargando…</div>';
    try {
      const found = await posApi("findSale", { saleNumber: query });
      activeSaleDetail = await posApi("saleDetail", { saleId: found.sale.id });
      const returned = activeSaleDetail.returnedItems || {};
      host.innerHTML = `<table class="fielTable"><thead><tr><th>Devolver</th><th>Vendida</th><th>Disponible</th><th>Código</th><th>Producto</th><th>Precio</th><th>Importe</th></tr></thead><tbody>${(activeSaleDetail.items || [])
        .map((item) => {
          const available = Math.max(
            0,
            Number(item.quantity) - Number(returned[item.id] || 0),
          );
          return `<tr><td><input class="fielField" data-return-item="${item.id}" data-return-price="${Number(item.total) / Number(item.quantity || 1)}" type="number" min="0" max="${available}" step="0.001" value="0"></td><td>${Number(item.quantity)}</td><td>${available}</td><td>${escHtml(item.code_snapshot || "—")}</td><td>${escHtml(item.name_snapshot)}</td><td>${moneyMx(item.unit_price)}</td><td>${moneyMx(item.total)}</td></tr>`;
        })
        .join("")}</tbody></table>`;
      host.querySelectorAll("[data-return-item]").forEach((input) => {
        input.oninput = updateReturnTotal;
      });
      byId("fielReturnedTotal").textContent = moneyMx(
        activeSaleDetail.returnedTotal || 0,
      );
      byId("fielConfirmReturn").disabled = false;
      updateReturnTotal();
    } catch (error) {
      activeSaleDetail = null;
      host.innerHTML = `<div class="fielEmpty">${escHtml(error.message)}</div>`;
      byId("fielConfirmReturn").disabled = true;
    }
  }

  function returnDraft() {
    return [...document.querySelectorAll("[data-return-item]")]
      .map((input) => ({
        sale_item_id: input.dataset.returnItem,
        qty: Number(input.value) || 0,
        preview_total:
          (Number(input.value) || 0) * Number(input.dataset.returnPrice || 0),
      }))
      .filter((line) => line.qty > 0);
  }

  function updateReturnTotal() {
    const total = returnDraft().reduce(
      (sum, line) => sum + line.preview_total,
      0,
    );
    byId("fielReturnTotal").textContent = moneyMx(total);
  }

  async function confirmReturn() {
    if (!activeSaleDetail?.sale) return;
    const items = returnDraft().map(({ sale_item_id, qty }) => ({ sale_item_id, qty }));
    if (!items.length) return notify("Indica qué cantidad devolver.", true);
    const reason = clean(byId("fielReturnReason").value);
    if (!reason) return notify("Escribe el motivo de la devolución.", true);
    const refundMethod = byId("fielRefundMethod").value;
    const ux = window.SOLRAKUXV0190;
    if (!ux?.confirmReturnImpact) return notify("El diálogo seguro todavía no está listo.", true);
    if (!(await ux.confirmReturnImpact(activeSaleDetail, items, refundMethod, reason))) return;
    try {
      const result = await posApi("returnSale", {
        saleId: activeSaleDetail.sale.id,
        cashSessionId: window.FacturaRapidaPOS?.state?.openSession?.id || null,
        items,
        refundMethod,
        reason,
      });
      notify(`Devolución registrada por ${moneyMx(result.total)}.`);
      await loadReturnTicket();
      await window.FacturaRapidaPOS?.refresh?.();
    } catch (error) {
      notify(error.message, true);
    }
  }

  function ticketSettings() {
    return window.SOLRAKSumaproTicketsV0169?.settings || {};
  }

  function setControl(id, value, checked = false) {
    const control = byId(id);
    if (!control) return;
    if (checked) control.checked = !!value;
    else control.value = value ?? "";
  }

  function openConfiguration(panel = "devices") {
    if (!isAdministrator()) {
      notify("Solo el administrador puede cambiar la configuración.", true);
      return;
    }
    window.SOLRAKSumaproTicketsV0169?.mount?.();
    const settings = ticketSettings();
    setControl("fielPrinterEnabled", settings.printerEnabled, true);
    setControl("fielAutoPrint", settings.autoPrint, true);
    setControl("fielPaper", settings.paperSize || "58");
    setControl("fielTicketBusiness", settings.businessName || currentSession()?.business?.name || "SOLRAK");
    setControl("fielTicketAddress", settings.address || "");
    setControl("fielTicketRfc", settings.rfc || "");
    setControl("fielTicketPhone", settings.phone || "");
    setControl("fielTicketFooter", settings.footer || "");
    setControl("fielTicketLogoEnabled", settings.showLogo, true);
    setControl("fielTicketTax", settings.showTax, true);
    setControl("fielTicketBarcode", settings.showBarcode, true);
    setControl("fielTicketAddressEnabled", settings.showAddress, true);
    const logo = byId("frLogoPreview");
    const preview = byId("fielTicketLogo");
    if (logo?.getAttribute("src")) {
      preview.src = logo.src;
      preview.style.display = "block";
    } else {
      preview.removeAttribute("src");
      preview.style.display = "none";
    }
    switchConfigPanel(panel);
    showDialog("fielConfigDialog");
  }

  function switchConfigPanel(panel) {
    document.querySelectorAll("[data-fiel-config]").forEach((button) => {
      button.classList.toggle("active", button.dataset.fielConfig === panel);
    });
    document.querySelectorAll(".fielConfigPanel").forEach((section) => {
      section.classList.toggle(
        "active",
        section.id ===
          `fielConfig${panel[0].toUpperCase()}${panel.slice(1)}`,
      );
    });
  }

  function copyConfigToOriginal() {
    const mappings = [
      ["solrakTicketPrinterEnabled", "fielPrinterEnabled", true],
      ["solrakTicketAutoPrint", "fielAutoPrint", true],
      ["solrakTicketPaper", "fielPaper", false],
      ["solrakTicketBusinessName", "fielTicketBusiness", false],
      ["solrakTicketAddress", "fielTicketAddress", false],
      ["solrakTicketRfc", "fielTicketRfc", false],
      ["solrakTicketPhone", "fielTicketPhone", false],
      ["solrakTicketFooter", "fielTicketFooter", false],
      ["solrakTicketShowLogo", "fielTicketLogoEnabled", true],
      ["solrakTicketShowTax", "fielTicketTax", true],
      ["solrakTicketShowBarcode", "fielTicketBarcode", true],
      ["solrakTicketShowAddress", "fielTicketAddressEnabled", true],
    ];
    mappings.forEach(([targetId, sourceId, checked]) => {
      const target = byId(targetId);
      const source = byId(sourceId);
      if (!target || !source) return;
      if (checked) target.checked = source.checked;
      else target.value = source.value;
      target.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function saveConfiguration() {
    copyConfigToOriginal();
    byId("solrakTicketSave")?.click();
    if (byId("frBusinessName"))
      byId("frBusinessName").value = byId("fielTicketBusiness").value;
    if (byId("frBusinessPhone"))
      byId("frBusinessPhone").value = byId("fielTicketPhone").value;
    byId("frSaveBasics")?.click();
    notify("Configuración guardada.");
  }

  function chooseBusinessLogo() {
    const input = byId("frLogoFile");
    if (!input) return notify("No se encontró el cargador de logotipo.", true);
    input.addEventListener(
      "change",
      () => {
        if (!input.files?.[0]) return;
        byId("frUploadLogo")?.click();
        setTimeout(() => openConfiguration("ticket"), 900);
      },
      { once: true },
    );
    input.click();
  }

  function showCatalogView(mode) {
    const rows = currentProducts();
    if (mode === "categories") {
      const counts = new Map();
      rows.forEach((product) => {
        const category = clean(product.category) || "Producto en General";
        counts.set(category, (counts.get(category) || 0) + 1);
      });
      byId("fielCatalogTitle").textContent = "Categorías";
      byId("fielCatalogContent").innerHTML = `<div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Categoría</th><th>Productos</th></tr></thead><tbody>${[...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "es"))
        .map(
          ([name, count]) =>
            `<tr><td>${escHtml(name)}</td><td>${count}</td></tr>`,
        )
        .join("")}</tbody></table></div>`;
    } else {
      const low = rows.filter(
        (product) =>
          product.active !== false &&
          Number(product.stock || 0) <= Number(product.min_stock || 0),
      );
      byId("fielCatalogTitle").textContent = "Inventario Bajo";
      byId("fielCatalogContent").innerHTML = low.length
        ? `<div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Código</th><th>Producto</th><th>Existencia</th><th>Mínimo</th></tr></thead><tbody>${low
            .map(
              (product) =>
                `<tr><td>${escHtml(product.code || "—")}</td><td>${escHtml(product.name)}</td><td>${Number(product.stock || 0)}</td><td>${Number(product.min_stock || 0)}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : '<div class="fielEmpty">No hay productos debajo de su inventario mínimo.</div>';
    }
    showDialog("fielCatalogDialog");
  }

  async function openPromotions() {
    showDialog("fielPromotionsDialog");
    const form = byId("fielPromotionForm");
    form.classList.toggle("hidden", !isAdministrator());
    byId("fielPromotionProduct").innerHTML =
      '<option value="">Selecciona un producto…</option>' +
      currentProducts()
        .filter((product) => product.active !== false)
        .sort((a, b) => clean(a.name).localeCompare(clean(b.name), "es"))
        .map(
          (product) =>
            `<option value="${product.id}">${escHtml(product.code || "S/C")} · ${escHtml(product.name)}</option>`,
        )
        .join("");
    const host = byId("fielPromotionsContent");
    host.innerHTML = '<div class="fielEmpty">Cargando promociones…</div>';
    try {
      const data = await posApi("listPromotions");
      const rows = data.promotions || [];
      host.innerHTML = `<div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Producto</th><th>Promoción</th><th>Valor</th><th>Vigencia</th><th>Estado</th></tr></thead><tbody>${rows.length ? rows.map((promotion) => `<tr data-fiel-promotion="${promotion.id}"><td>${escHtml(promotion.product_name || "—")}</td><td>${escHtml(promotion.name)}</td><td>${promotion.discount_type === "percent" ? `${Number(promotion.value)}%` : moneyMx(promotion.value)}</td><td>${escHtml(promotion.starts_at ? new Date(promotion.starts_at).toLocaleDateString("es-MX") : "Ahora")} – ${escHtml(promotion.ends_at ? new Date(promotion.ends_at).toLocaleDateString("es-MX") : "Sin fin")}</td><td><span class="fielStatus ${promotion.active ? "ok" : ""}">${promotion.active ? "Activa" : "Inactiva"}</span></td></tr>`).join("") : '<tr><td colspan="5" class="fielEmpty">No hay promociones registradas.</td></tr>'}</tbody></table></div><p class="fielSoon" style="margin-top:12px">Las promociones activas se calculan en el servidor al cobrar; el precio base del producto no se modifica. Selecciona una fila para editarla.</p>`;
      host.querySelectorAll("[data-fiel-promotion]").forEach((row) => {
        row.onclick = () =>
          editPromotion(
            rows.find(
              (promotion) => promotion.id === row.dataset.fielPromotion,
            ),
          );
      });
    } catch (error) {
      host.innerHTML = `<div class="fielEmpty">${escHtml(error.message)}</div>`;
    }
  }

  function localDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
  }

  function resetPromotionForm() {
    byId("fielPromotionForm").reset();
    byId("fielPromotionId").value = "";
    byId("fielPromotionFormTitle").textContent = "Nueva promoción";
    byId("fielPromotionActive").checked = true;
  }

  function editPromotion(promotion) {
    if (!promotion || !isAdministrator()) return;
    byId("fielPromotionId").value = promotion.id;
    byId("fielPromotionProduct").value = promotion.product_id;
    byId("fielPromotionName").value = promotion.name || "";
    byId("fielPromotionType").value = promotion.discount_type;
    byId("fielPromotionValue").value = Number(promotion.value || 0);
    byId("fielPromotionStarts").value = localDateTime(promotion.starts_at);
    byId("fielPromotionEnds").value = localDateTime(promotion.ends_at);
    byId("fielPromotionActive").checked = promotion.active !== false;
    byId("fielPromotionFormTitle").textContent = "Editar promoción";
  }

  async function savePromotion(event) {
    event.preventDefault();
    if (!isAdministrator())
      return notify("Solo el administrador puede guardar promociones.", true);
    const starts = byId("fielPromotionStarts").value;
    const ends = byId("fielPromotionEnds").value;
    try {
      await posApi("savePromotion", {
        id: byId("fielPromotionId").value || null,
        productId: byId("fielPromotionProduct").value,
        name: byId("fielPromotionName").value,
        discountType: byId("fielPromotionType").value,
        value: Number(byId("fielPromotionValue").value),
        startsAt: starts ? new Date(starts).toISOString() : null,
        endsAt: ends ? new Date(ends).toISOString() : null,
        active: byId("fielPromotionActive").checked,
      });
      resetPromotionForm();
      await window.FacturaRapidaPOS?.refresh?.();
      await openPromotions();
      notify("Promoción guardada. El precio base del producto no cambió.");
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function openCredits() {
    showDialog("fielCreditsDialog");
    byId("fielCreditPaymentForm").classList.toggle(
      "hidden",
      !isAdministrator(),
    );
    const host = byId("fielCreditsContent");
    host.innerHTML = '<div class="fielEmpty">Cargando cuentas…</div>';
    try {
      const data = await posApi("creditSummary");
      const rows = data.accounts || [];
      byId("fielCreditClient").innerHTML =
        '<option value="">Selecciona una cuenta…</option>' +
        rows
          .filter((account) => Number(account.balance) > 0.009)
          .map(
            (account) =>
              `<option value="${account.client_id}" data-balance="${Number(account.balance)}">${escHtml(account.client_name)} · ${moneyMx(account.balance)}</option>`,
          )
          .join("");
      host.innerHTML = `<div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Cliente</th><th>Cargos</th><th>Abonos</th><th>Saldo</th><th>Último movimiento</th></tr></thead><tbody>${rows.length ? rows.map((account) => `<tr><td>${escHtml(account.client_name)}</td><td>${moneyMx(account.charges)}</td><td>${moneyMx(account.payments)}</td><td><strong>${moneyMx(account.balance)}</strong></td><td>${account.last_movement_at ? escHtml(new Date(account.last_movement_at).toLocaleString("es-MX")) : "—"}</td></tr>`).join("") : '<tr><td colspan="5" class="fielEmpty">No hay créditos pendientes.</td></tr>'}</tbody></table></div><p class="fielSoon" style="margin-top:12px">Los saldos se forman únicamente con ventas a crédito, devoluciones y abonos registrados; no se generan cifras estimadas.</p>`;
    } catch (error) {
      host.innerHTML = `<div class="fielEmpty">${escHtml(error.message)}</div>`;
    }
  }

  async function saveCreditPayment(event) {
    event.preventDefault();
    if (!isAdministrator())
      return notify("Solo el administrador puede registrar pagos.", true);
    const method = byId("fielCreditMethod").value;
    if (method === "cash" && !window.FacturaRapidaPOS?.state?.openSession)
      return notify("Abre una caja para recibir un pago en efectivo.", true);
    try {
      await posApi("recordCreditPayment", {
        clientId: byId("fielCreditClient").value,
        cashSessionId: window.FacturaRapidaPOS?.state?.openSession?.id || null,
        amount: Number(byId("fielCreditAmount").value),
        paymentMethod: method,
        reason: byId("fielCreditReason").value,
      });
      byId("fielCreditPaymentForm").reset();
      await openCredits();
      notify("Pago registrado en el saldo del cliente.");
    } catch (error) {
      notify(error.message, true);
    }
  }

  function openShifts() {
    const state = window.FacturaRapidaPOS?.state || {};
    const open = state.openSession;
    byId("fielShiftsContent").innerHTML = open
      ? `<div class="fielProductFacts"><div class="fielFact"><span>Estado</span><strong><span class="fielStatus ok">Turno abierto</span></strong></div><div class="fielFact"><span>Apertura</span><strong>${escHtml(new Date(open.opened_at).toLocaleString("es-MX"))}</strong></div><div class="fielFact"><span>Fondo inicial</span><strong>${moneyMx(open.opening_amount)}</strong></div><div class="fielFact"><span>Usuario</span><strong>${escHtml(currentSession()?.user?.name || "Usuario")}</strong></div></div><div class="fielDialogFoot"><button id="fielShiftCloseCash" class="fielBtn primary" type="button">Cerrar turno y hacer corte</button></div>`
      : '<div class="fielEmpty">No hay un turno abierto para este usuario.</div><div class="fielDialogFoot"><button id="fielShiftOpenCash" class="fielBtn primary" type="button">Abrir turno</button></div>';
    byId("fielShiftOpenCash")?.addEventListener("click", () => {
      closeDialog("fielShiftsDialog");
      byId("posOpenCash")?.click();
    });
    byId("fielShiftCloseCash")?.addEventListener("click", () => {
      closeDialog("fielShiftsDialog");
      byId("posCloseCash")?.click();
    });
    showDialog("fielShiftsDialog");
  }

  function openCashMovement(type) {
    if (!isAdministrator()) {
      notify("Solo el administrador puede registrar movimientos de caja.", true);
      return;
    }
    if (!window.FacturaRapidaPOS?.state?.openSession) {
      notify("Primero abre un turno de caja.", true);
      return;
    }
    byId("fielCashMovementForm").reset();
    byId("fielCashMovementType").value = type;
    byId("fielCashMovementTitle").textContent =
      type === "income" ? "Entrada de caja" : "Salida de caja";
    showDialog("fielCashMovementDialog");
  }

  async function saveCashMovement(event) {
    event.preventDefault();
    try {
      await posApi("addCashMovement", {
        cashSessionId: window.FacturaRapidaPOS?.state?.openSession?.id,
        movementType: byId("fielCashMovementType").value,
        amount: Number(byId("fielCashAmount").value),
        concept: byId("fielCashConcept").value,
        reference: byId("fielCashReference").value,
      });
      closeDialog("fielCashMovementDialog");
      notify("Movimiento de caja registrado.");
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function openCashCut() {
    const open = window.FacturaRapidaPOS?.state?.openSession;
    if (!open) return notify("No hay una caja abierta para hacer el corte.", true);
    originalTab("pos");
    byId("posCloseCash")?.click();
  }

  function preparePosLayout() {
    const pos = byId("tab-pos");
    const title = pos?.querySelector(".frPosTop h2");
    if (title) title.textContent = "Agregar inventario";
    byId("posRecent")?.closest("article")?.classList.add("fielPosRecentHidden");
    const summary = pos?.querySelector("aside.summary");
    const ticketBar = pos?.querySelector(".frTicketBar");
    const preview = byId("posProductPreview");
    if (summary && ticketBar && ticketBar.parentElement !== summary)
      summary.insertBefore(ticketBar, preview?.nextSibling || summary.firstChild);

    const cart = byId("posCart");
    const cartCard = cart?.closest(".frPosCartCard");
    if (cartCard && !byId("fielPosActions")) {
      const actions = document.createElement("div");
      actions.id = "fielPosActions";
      actions.className = "fielPosActions";
      actions.innerHTML = `<div class="fielPosStats"><span>Cantidad de Productos <strong id="fielProductCount">0</strong></span><span>Tecla Rápida · F2</span><span>Tipo Cambio <b id="fielExchangeLabel">$0.00</b></span></div><div class="fielPosTools"><button class="fielPosTool" data-fiel-pos-tool="common" type="button">Producto común</button><button class="fielPosTool" data-fiel-pos-tool="discount" type="button">Aplicar descuento a la venta</button><button class="fielPosTool danger" data-fiel-pos-tool="clear" type="button">Eliminar productos en venta</button><button class="fielPosTool" data-fiel-pos-tool="print" type="button">Imprimir ticket en venta</button></div>`;
      cartCard.appendChild(actions);
      actions.querySelector('[data-fiel-pos-tool="common"]').onclick = () =>
        runAction("common-product");
      actions.querySelector('[data-fiel-pos-tool="clear"]').onclick = () =>
        byId("posClear")?.click();
      actions.querySelector('[data-fiel-pos-tool="print"]').onclick = () => {
        const last = window.SOLRAKSumaproTicketsV0169?.lastReceipt;
        if (!last)
          return notify("Todavía no hay un ticket finalizado para imprimir.", true);
        window.SOLRAKSumaproTicketsV0169.printReceipt(last, { force: true });
      };
      actions.querySelector('[data-fiel-pos-tool="discount"]').onclick = () => {
        resetPromotionForm();
        openPromotions();
      };
    }
  }

  function syncHeader() {
    const top = document.querySelector("main.shell>.top");
    const title = top?.querySelector("h1");
    const business = currentSession()?.business;
    if (title && business?.name && title.textContent !== business.name)
      title.textContent = business.name;
    byId("fielMailTop")?.remove();
  }

  function syncDynamicState() {
    syncHeader();
    preparePosLayout();
    const cart = window.FacturaRapidaPOS?.cart || [];
    const count = cart.reduce((sum, line) => sum + Number(line.qty || 0), 0);
    if (byId("fielProductCount")) byId("fielProductCount").textContent = count;
    const finish = byId("fielFinishSale");
    if (finish)
      finish.classList.toggle(
        "disabled",
        !window.FacturaRapidaPOS?.state?.openSession || !cart.length,
      );
    const clientsBadge = byId("fielClientCount");
    if (clientsBadge) clientsBadge.textContent = currentClients().length;
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset.solrakFiel = "1";
    ensureSidebar();
    ensureDialogs();
    preparePosLayout();
    syncDynamicState();
    const visible = [...document.querySelectorAll(".tab-panel")].find(
      (panel) => !panel.classList.contains("hidden"),
    );
    if (visible?.id?.startsWith("tab-"))
      syncActiveMenu(visible.id.slice("tab-".length));
  }

  function scheduleMount() {
    clearTimeout(sidebarTimer);
    sidebarTimer = setTimeout(mount, 25);
  }

  function boot() {
    mount();
    document.addEventListener("solrak:pos-sale-complete", () =>
      setTimeout(syncDynamicState, 0),
    );
    document.addEventListener("click", (event) => {
      const original = event.target?.closest?.(".nav>button[data-tab]");
      if (original) setTimeout(() => syncActiveMenu(original.dataset.tab), 0);
      if (event.target?.closest?.("#tab-pos"))
        setTimeout(syncDynamicState, 0);
    });
    new MutationObserver(scheduleMount).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    setInterval(syncDynamicState, 1200);
    setTimeout(mount, 300);
    setTimeout(mount, 1100);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSumaproFielV0171 = {
    version: VERSION,
    mount,
    openPriceVerifier,
    openTicketSearch,
    openReturns,
    openConfiguration,
    openTab: originalTab,
  };
})();
