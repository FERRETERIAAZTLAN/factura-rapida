(() => {
  "use strict";

  const VERSION = "0.1.98";
  const STYLE_ID = "solrakSalesExactV0198Style";
  const MENU_ID = "solrakSalesV0198Menu";
  const FLYOUT_ID = "solrakSalesV0198Flyout";
  const STATUS_ID = "solrakSalesV0198StatusGlyph";
  const byId = (id) => document.getElementById(id);
  let observer = null;
  let mountTimer = null;

  const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICON = {
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    price: svg('<path d="M5 5h14v14H5zM8 9h8M8 13h5"/>'),
    ticket: svg('<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>'),
    common: svg('<path d="m4 8 8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8"/>'),
    search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'),
    back: svg('<path d="M9 7H4v-5M4 7c2-3 5-4 8-4a8 8 0 1 1-7 12"/>'),
    clients: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11a3 3 0 1 0 0-6"/>'),
    products: svg('<path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/>'),
    users: svg('<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0"/>'),
    shifts: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    cash: svg('<path d="M3 8h18v11H3zM7 8V5h10v3M7 13h4"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-2.8 2.8a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6h-4a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-2.8-2.8a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14v-4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l2.8-2.8a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l2.8 2.8a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1v4a1.7 1.7 0 0 0-1.6 1Z"/>'),
    report: svg('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
  };

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{--s98-side:184px;--s98-top:48px;--s98-right:190px;--s98-orange:#e96f1b;--s98-orange-dark:#d85d0d;--s98-yellow:#f2b900;--s98-line:#d8d8d8;--s98-soft:#f3f3f3;--s95-side:184px;--s95-top:48px;--s95-right:190px}
html[data-solrak-sales98="1"] body{font-family:"Segoe UI",Arial,sans-serif!important;background:#fff!important;color:#444!important;overflow:hidden!important}
html[data-solrak-sales98="1"] #solrakFielSidebar{width:var(--s98-side)!important;background:#f1f1ef!important;border-right:1px solid #cfcfcd!important;box-shadow:none!important}
html[data-solrak-sales98="1"] #solrakFielSidebar .fielBrand{height:var(--s98-top)!important;min-height:var(--s98-top)!important;padding:4px 10px!important;gap:7px!important;background:linear-gradient(90deg,#e86619,#ed7a20)!important}
html[data-solrak-sales98="1"] #solrakFielSidebar .fielBrandMark{width:29px!important;height:29px!important;min-width:29px!important;border:0!important;border-radius:0!important;font-size:0!important;background:transparent!important}
html[data-solrak-sales98="1"] #solrakFielSidebar .fielBrandMark::before{content:""!important;display:block!important;width:29px!important;height:29px!important;background:#fff!important;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M3 4h2l2 11h10l2-8H6l.5 2H16l-1 4H8L6 2H3v2zm6 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'/%3E%3C/svg%3E") center/contain no-repeat!important}
html[data-solrak-sales98="1"] #solrakFielSidebar .fielBrandText strong{font-size:17px!important;line-height:1!important;font-style:italic!important;font-weight:650!important;letter-spacing:-.02em!important;color:#fff!important}
html[data-solrak-sales98="1"] #solrakFielSidebar .fielBrandText small{margin-top:2px!important;font-size:6.5px!important;line-height:1!important;letter-spacing:.08em!important;color:#ffd35a!important;opacity:1!important}
html[data-solrak-sales98="1"] #solrakV0195Menu,html[data-solrak-sales98="1"] #solrakV0195LegacyMenu{display:none!important}
#${MENU_ID}{flex:1;min-height:0;overflow:auto;background:#f1f1ef;padding:0 0 41px;scrollbar-width:thin}
.s98Hamburger{width:100%;height:35px;display:grid;place-items:center;border:0;border-bottom:1px solid #d4d4d2;background:#f4f4f2;color:#333;cursor:pointer}.s98Hamburger svg{width:22px;height:22px}.s98Hamburger:hover{background:#e9e9e7}
.s98MenuItem{width:100%;height:39px;min-height:39px;display:flex;align-items:center;gap:9px;padding:0 11px;border:0;border-left:2px solid transparent;background:#f1f1ef;color:#454545;text-align:left;font:400 11px/1.1 "Segoe UI",Arial,sans-serif;cursor:pointer;white-space:nowrap}.s98MenuItem:hover,.s98MenuItem.active{background:#e4e4e2;border-left-color:#e56d1a}.s98MenuItem svg{width:20px;height:20px;flex:0 0 20px;color:#5a5a58}.s98MenuItem span{overflow:hidden;text-overflow:ellipsis}
html[data-solrak-sales98="1"] #fielFinishSale{height:39px!important;min-height:39px!important;background:linear-gradient(90deg,#efad16,#f4c01a)!important;color:#fff!important;border:0!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.01em!important;text-transform:uppercase!important;box-shadow:inset 0 1px rgba(255,255,255,.2)!important}
#${FLYOUT_ID}{position:fixed;z-index:12000;width:205px;padding:5px;background:#fff;border:1px solid #cfcfcf;box-shadow:0 8px 24px rgba(0,0,0,.2);font-family:"Segoe UI",Arial,sans-serif}.s98FlyoutItem{width:100%;min-height:34px;display:flex;align-items:center;padding:6px 10px;border:0;background:#fff;color:#444;text-align:left;font-size:11px;cursor:pointer}.s98FlyoutItem:hover{background:#f0f0f0}.s98FlyoutTitle{padding:5px 10px 7px;color:#888;font-size:9px;text-transform:uppercase;border-bottom:1px solid #eee}
html[data-solrak-sales98="1"] main.shell{margin-left:var(--s98-side)!important;background:#fff!important;width:auto!important;max-width:none!important;padding:0!important}
html[data-solrak-sales98="1"] main.shell>.top{height:var(--s98-top)!important;min-height:var(--s98-top)!important;margin:0!important;padding:0!important;background:linear-gradient(90deg,#e76519,#ed7b20)!important;color:#fff!important}
html[data-solrak-sales98="1"] main.shell>.top>div:first-child{position:absolute!important;left:20%!important;right:20%!important;text-align:center!important;pointer-events:none!important}
html[data-solrak-sales98="1"] main.shell>.top h1{margin:0!important;color:#fff!important;font-size:16px!important;font-weight:400!important;line-height:48px!important;letter-spacing:.01em!important;text-transform:uppercase!important}
html[data-solrak-sales98="1"] main.shell>.top .top-actions{height:48px!important;margin-left:auto!important;display:flex!important;align-items:stretch!important;gap:0!important}
html[data-solrak-sales98="1"] main.shell>.top .fielMailTop{width:40px!important;height:48px!important;border:0!important;border-right:1px solid rgba(255,255,255,.24)!important;background:transparent!important;color:#fff!important}.fielMailTop svg{width:18px!important;height:18px!important}
html[data-solrak-sales98="1"] main.shell>.top #currentUser{position:relative!important;min-width:176px!important;height:48px!important;min-height:48px!important;padding:4px 14px 4px 47px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;border:0!important;background:rgba(238,238,238,.93)!important;color:#2f2f2f!important;font-size:10px!important;font-weight:400!important;text-align:left!important;line-height:1.15!important;box-sizing:border-box!important}
html[data-solrak-sales98="1"] main.shell>.top #currentUser::before{content:"";position:absolute;left:9px;top:8px;width:31px;height:31px;border-radius:50%;background:#9b9b96;box-shadow:inset 0 0 0 2px rgba(255,255,255,.45)}
html[data-solrak-sales98="1"] main.shell>.top #currentUser strong{font-size:11px!important;font-weight:650!important;color:#333!important}html[data-solrak-sales98="1"] main.shell>.top #currentUser small{margin-top:2px!important;font-size:9px!important;color:#555!important;font-weight:400!important}
html[data-solrak-sales98="1"] main.shell>.top #logoutBtn{width:30px!important;height:48px!important;min-height:48px!important;padding:0!important;border:0!important;background:rgba(238,238,238,.93)!important;color:#555!important;font-size:0!important}html[data-solrak-sales98="1"] main.shell>.top #logoutBtn::after{content:"×"!important;font-size:16px!important;font-weight:400!important}
html[data-solrak-sales98="1"] #tab-pos{height:calc(100vh - var(--s98-top))!important;display:grid!important;grid-template-rows:38px minmax(0,1fr)!important;padding:0!important;overflow:hidden!important;background:#fff!important}
html[data-solrak-sales98="1"] #tab-pos>.frPosTop{height:38px!important;min-height:38px!important;padding:0 13px!important;display:flex!important;align-items:center!important;gap:24px!important;border:0!important;border-bottom:1px solid #d8d8d6!important;background:#f8f8f7!important}
html[data-solrak-sales98="1"] #tab-pos>.frPosTop>div:first-child{display:flex!important;align-items:center!important;gap:8px!important}html[data-solrak-sales98="1"] #tab-pos>.frPosTop>div:first-child::before{width:20px!important;height:20px!important;color:#50504d!important}
html[data-solrak-sales98="1"] #tab-pos>.frPosTop h2{font-size:10.5px!important;font-weight:400!important;color:#3e3e3c!important}
html[data-solrak-sales98="1"] #solrakV0195Scale{height:28px!important;padding-left:18px!important;border-left:0!important;gap:0!important;color:#555!important}html[data-solrak-sales98="1"] #solrakV0195Scale svg{width:20px!important;height:20px!important}html[data-solrak-sales98="1"] #solrakV0195Scale span{display:none!important}
html[data-solrak-sales98="1"] #tab-pos>.frPosGrid{height:100%!important;min-height:0!important;grid-template-columns:minmax(0,1fr) var(--s98-right)!important;gap:0!important}
html[data-solrak-sales98="1"] #tab-pos>.frPosGrid>.stack{display:grid!important;grid-template-rows:62px minmax(0,1fr)!important;min-height:0!important;gap:0!important;background:#fff!important}
html[data-solrak-sales98="1"] #tab-pos>.frPosGrid>.stack>article:first-child{height:62px!important;min-height:62px!important;padding:8px 13px 7px!important;border:0!important;border-bottom:1px solid #d8d8d8!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:visible!important;box-sizing:border-box!important}
html[data-solrak-sales98="1"] #tab-pos .frPosSearch{width:min(470px,calc(100% - 18px))!important;display:grid!important;grid-template-columns:minmax(250px,365px) 78px!important;gap:8px!important;align-items:center!important}
html[data-solrak-sales98="1"] #tab-pos #posSearch{height:34px!important;padding:0 9px!important;border:0!important;border-bottom:2px solid #e9751e!important;border-radius:0!important;background:#e9e9e8!important;color:#333!important;font-size:13px!important;box-shadow:none!important;outline:none!important}
html[data-solrak-sales98="1"] #solrakV0195SearchBtn{height:31px!important;min-height:31px!important;border:0!important;border-radius:2px!important;background:linear-gradient(#ee852d,#e56c17)!important;color:#fff!important;font-size:10px!important;font-weight:600!important;padding:0 11px!important;box-shadow:0 1px 2px rgba(0,0,0,.12)!important}
html[data-solrak-sales98="1"] #tab-pos #posResults{left:13px!important;right:auto!important;top:49px!important;width:min(365px,calc(100% - 115px))!important;max-height:300px!important}
html[data-solrak-sales98="1"] #tab-pos .frPosCartCard{height:100%!important;min-height:0!important;padding:0 0 116px!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
html[data-solrak-sales98="1"] #tab-pos .frPosCartHead{height:26px!important;min-height:26px!important;grid-template-columns:112px minmax(200px,1fr) 76px 62px 70px 72px 76px!important;border:0!important;border-bottom:1px solid #d6d6d5!important;background:#e4e4e2!important;color:#4d4d4b!important;font-size:9.5px!important;text-align:center!important}
html[data-solrak-sales98="1"] #tab-pos .frPosCartHead span{border-right:0!important;font-weight:400!important}
html[data-solrak-sales98="1"] #tab-pos .frPosCart{flex:1!important;min-height:0!important;max-height:none!important;border:0!important;border-radius:0!important;background:#fff!important;overflow:auto!important}
html[data-solrak-sales98="1"] #tab-pos .frPosEmpty{padding-top:46px!important;color:#a0a09e!important;font-size:10px!important}
html[data-solrak-sales98="1"] #tab-pos .frPosLine{min-height:39px!important;grid-template-columns:112px minmax(200px,1fr) 76px 62px 70px 72px 76px!important;border-bottom:1px solid #efefee!important;background:#fff!important;font-size:9.5px!important}
html[data-solrak-sales98="1"] #tab-pos .frPosLine>div,html[data-solrak-sales98="1"] #tab-pos .frPosLine>.s95Cell{padding:5px 6px!important;border-right:0!important;font-size:9.5px!important}
html[data-solrak-sales98="1"] #tab-pos .fielPosActions{position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:116px!important;padding:7px 13px 9px!important;border-top:0!important;background:#fff!important;box-sizing:border-box!important}
html[data-solrak-sales98="1"] #tab-pos .fielPosStats{height:55px!important;margin:0!important;display:grid!important;grid-template-columns:135px 165px!important;grid-template-rows:27px 28px!important;column-gap:7px!important;row-gap:0!important;align-items:center!important;color:#4e4e4c!important;font-size:9.5px!important}
html[data-solrak-sales98="1"] #tab-pos .fielPosStats>span:first-child{grid-column:1/-1!important}html[data-solrak-sales98="1"] #tab-pos .fielPosStats strong{margin-left:7px!important;color:#e98a22!important;font-size:17px!important;font-weight:400!important}
html[data-solrak-sales98="1"] #tab-pos .fielPosTools{height:42px!important;display:grid!important;grid-template-columns:1.08fr 1.17fr 1fr!important;gap:0!important;align-items:stretch!important}
html[data-solrak-sales98="1"] #tab-pos .fielPosTool{height:42px!important;min-height:42px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:0 9px!important;border:0!important;border-right:1px solid #ddd!important;background:#fff!important;color:#555!important;font-size:9.5px!important;font-weight:400!important}html[data-solrak-sales98="1"] #tab-pos .fielPosTool:last-child{border-right:0!important}html[data-solrak-sales98="1"] #tab-pos .fielPosTool svg{width:20px!important;height:20px!important;color:#5b5b59!important}
html[data-solrak-sales98="1"] #tab-pos aside.summary{position:relative!important;height:100%!important;padding:12px 10px 54px!important;border:0!important;border-left:1px solid #d6d6d5!important;border-radius:0!important;background:#fafafa!important;box-shadow:none!important;overflow:hidden!important;box-sizing:border-box!important}
html[data-solrak-sales98="1"] #tab-pos .frPreview{height:166px!important;min-height:166px!important;margin:0 0 7px!important;border:1px solid #d0d0ce!important;border-radius:3px!important;background:#fff!important;box-shadow:0 1px 2px rgba(0,0,0,.09)!important}html[data-solrak-sales98="1"] #tab-pos .frPreview img{height:127px!important;object-fit:contain!important}html[data-solrak-sales98="1"] #tab-pos .frPreviewMeta{font-size:8px!important}
html[data-solrak-sales98="1"] #tab-pos .frTicketBar{display:block!important;max-height:150px!important;margin:0!important;padding:0!important;overflow:auto!important}html[data-solrak-sales98="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr!important;gap:0!important}
html[data-solrak-sales98="1"] #tab-pos .frTicket{position:relative!important;width:100%!important;min-height:57px!important;padding:6px 24px!important;display:grid!important;place-items:center!important;gap:3px!important;border:0!important;border-bottom:1px solid #ddd!important;border-radius:0!important;background:transparent!important;color:#444!important;box-shadow:none!important}html[data-solrak-sales98="1"] #tab-pos .frTicket.active{background:#fff!important;box-shadow:none!important}html[data-solrak-sales98="1"] #tab-pos .frTicket strong{font-size:9.5px!important;font-weight:400!important;color:#444!important}html[data-solrak-sales98="1"] #tab-pos .s98TicketNumber{min-width:68px;height:24px;display:grid;place-items:center;padding:0 8px;border-radius:2px;background:#e1a22a;color:#fff;font-size:10px;font-weight:500}.frTicketClose{right:17px!important;top:2px!important;color:#a54b4b!important;font-size:13px!important}
html[data-solrak-sales98="1"] #tab-pos .frTicketNew{display:none!important}
html[data-solrak-sales98="1"] #tab-pos .frPosTotals{position:absolute!important;left:10px!important;right:0!important;bottom:0!important;height:150px!important;margin:0!important;padding:12px 8px 10px!important;border-top:4px solid #9e9e9b!important;background:#fafafa!important;box-sizing:border-box!important}html[data-solrak-sales98="1"] #tab-pos .frPosTotals>div:not(.frPosGrand){display:none!important}html[data-solrak-sales98="1"] #tab-pos .frPosGrand{height:132px!important;display:block!important;margin:0!important;padding:0!important;border:0!important;font-weight:400!important}html[data-solrak-sales98="1"] #tab-pos .frPosGrand span{display:block!important;font-size:28px!important;line-height:1!important;color:#5a5a58!important}html[data-solrak-sales98="1"] #tab-pos .frPosGrand strong{display:block!important;margin-top:18px!important;text-align:center!important;font:400 43px/1 Georgia,"Times New Roman",serif!important;color:#41413f!important}html[data-solrak-sales98="1"] #tab-pos .frPosTotals::after{content:""!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:5px!important;background:#efbd22!important}
html[data-solrak-sales98="1"] #solrakV0195Footer{right:calc(var(--s98-right) + 44px)!important;bottom:8px!important;color:#575755!important;font-size:8.7px!important}
#${STATUS_ID}{position:fixed;z-index:8100;right:calc(var(--s98-right) + 14px);bottom:7px;width:19px;height:17px;display:flex;gap:3px;align-items:flex-end;pointer-events:none}#${STATUS_ID}::before,#${STATUS_ID}::after{content:"";display:block;width:7px;height:14px;border:1px solid #777;background:transparent}#${STATUS_ID}::after{height:17px}
html[data-solrak-sales98-collapsed="1"]{--s98-side:48px;--s95-side:48px}html[data-solrak-sales98-collapsed="1"] #${MENU_ID} .s98MenuItem span,html[data-solrak-sales98-collapsed="1"] #solrakFielSidebar .fielBrandText{display:none!important}html[data-solrak-sales98-collapsed="1"] #${MENU_ID} .s98MenuItem{justify-content:center;padding:0}html[data-solrak-sales98-collapsed="1"] #fielFinishSale{font-size:0!important}html[data-solrak-sales98-collapsed="1"] #fielFinishSale::after{content:"✓";font-size:16px}
@media(max-width:1100px){:root{--s98-side:172px;--s98-right:176px;--s95-side:172px;--s95-right:176px}html[data-solrak-sales98="1"] #tab-pos .frPosCartHead,html[data-solrak-sales98="1"] #tab-pos .frPosLine{grid-template-columns:90px minmax(145px,1fr) 65px 56px 64px 62px 68px!important}html[data-solrak-sales98="1"] #tab-pos .frPosSearch{width:min(430px,calc(100% - 12px))!important;grid-template-columns:minmax(225px,335px) 76px!important}.s98MenuItem{font-size:10.4px!important;padding-left:9px!important}}
`;
    document.head.appendChild(style);
  }

  function legacyButton(action, tab = "") {
    const roots = [byId("solrakV0195LegacyMenu"), document.querySelector("#solrakFielSidebar .fielMenu")].filter(Boolean);
    for (const root of roots) {
      const button = [...root.querySelectorAll("[data-fiel-action]")].find((candidate) => candidate.dataset.fielAction === action && (!tab || candidate.dataset.tabTarget === tab));
      if (button) return button;
    }
    return null;
  }

  function runLegacy(action, tab = "") {
    closeFlyout();
    const button = legacyButton(action, tab);
    if (button) return button.click();
    if (action === "tab") return window.SOLRAKSumaproFielV0171?.openTab?.(tab);
    if (action === "new-ticket") return window.FacturaRapidaPOS?.newTicket?.();
    if (action === "configuration") return window.SOLRAKSumaproFielV0171?.openConfiguration?.();
  }

  const REPORTS = [
    ["Resumen de Ventas", "sales-report", ""],
    ["Detalle de Ventas", "sales-report", ""],
    ["F.P. en Ventas", "sales-report", ""],
    ["Inventario", "tab", "inventario"],
    ["Historial Movimientos", "sales-report", ""],
    ["Más Vendidos", "sales-report", ""],
  ];

  const CASH = [
    ["Entradas", "cash-in", ""],
    ["Salidas", "cash-out", ""],
    ["Corte de Caja", "cash-cut", ""],
  ];

  const MORE = [
    ["Facturación", "tab", "factura"],
    ["Cotizaciones", "tab", "cotizaciones"],
    ["Proveedores", "tab", "proveedores"],
  ];

  function closeFlyout() {
    byId(FLYOUT_ID)?.remove();
  }

  function openFlyout(anchor, title, entries) {
    closeFlyout();
    const flyout = document.createElement("div");
    flyout.id = FLYOUT_ID;
    flyout.innerHTML = `<div class="s98FlyoutTitle">${title}</div>`;
    entries.forEach(([label, action, tab]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "s98FlyoutItem";
      button.textContent = label;
      button.onclick = () => runLegacy(action, tab);
      flyout.appendChild(button);
    });
    document.body.appendChild(flyout);
    const rect = anchor.getBoundingClientRect();
    const top = Math.max(52, Math.min(window.innerHeight - flyout.offsetHeight - 8, rect.top));
    flyout.style.left = `${Math.max(48, rect.right - 1)}px`;
    flyout.style.top = `${top}px`;
  }

  function menuButton(label, icon, action, tab = "", entries = null) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "s98MenuItem";
    button.innerHTML = `${icon}<span>${label}</span>`;
    button.dataset.s98Label = label;
    button.onclick = () => entries ? openFlyout(button, label, entries) : runLegacy(action, tab);
    return button;
  }

  function buildMenu() {
    const sidebar = byId("solrakFielSidebar");
    if (!sidebar) return false;
    if (byId(MENU_ID)) return true;
    const menu = document.createElement("nav");
    menu.id = MENU_ID;
    menu.setAttribute("aria-label", "Ventas SOLRAK");

    const hamburger = document.createElement("button");
    hamburger.type = "button";
    hamburger.className = "s98Hamburger";
    hamburger.setAttribute("aria-label", "Más opciones");
    hamburger.innerHTML = ICON.menu;
    hamburger.onclick = () => openFlyout(hamburger, "Más opciones", MORE);
    menu.appendChild(hamburger);

    const rows = [
      ["Verificador Precios", ICON.price, "price-check", ""],
      ["Nuevo Ticket", ICON.ticket, "new-ticket", ""],
      ["Producto Común", ICON.common, "common-product", ""],
      ["Consultar Ticket", ICON.search, "ticket-search", ""],
      ["Devolución", ICON.back, "return-sale", ""],
      ["Clientes", ICON.clients, "tab", "clientes"],
      ["Productos", ICON.products, "tab", "inventario"],
      ["Usuarios", ICON.users, "tab", "usuarios"],
      ["Turnos", ICON.shifts, "shifts", ""],
      ["Caja", ICON.cash, "", "", CASH],
      ["Configuración", ICON.gear, "configuration", ""],
      ["Reportes", ICON.report, "", "", REPORTS],
    ];
    rows.forEach(([label, icon, action, tab, entries]) => menu.appendChild(menuButton(label, icon, action, tab, entries || null)));

    const before = byId("solrakV0195LegacyMenu") || byId("solrakV0195Menu") || byId("fielFinishSale");
    sidebar.insertBefore(menu, before);
    return true;
  }

  function decorateUser() {
    const user = byId("currentUser");
    if (!user || user.dataset.s98User === "1") return;
    user.dataset.s98User = "1";
    const text = String(user.textContent || "Usuario").trim() || "Usuario";
    const role = String(window.session?.user?.role || window.SOLRAKSession?.user?.role || text).trim();
    user.textContent = "";
    const strong = document.createElement("strong");
    strong.textContent = text;
    const small = document.createElement("small");
    small.textContent = /^admin/i.test(role) ? "Administrador" : role;
    user.append(strong, small);
  }

  function decorateHeader() {
    const brandStrong = document.querySelector("#solrakFielSidebar .fielBrandText strong");
    const brandSmall = document.querySelector("#solrakFielSidebar .fielBrandText small");
    if (brandStrong && brandStrong.textContent !== "SOLRAK") brandStrong.textContent = "SOLRAK";
    if (brandSmall && brandSmall.textContent !== "PUNTO DE VENTA") brandSmall.textContent = "PUNTO DE VENTA";
    const h1 = document.querySelector("main.shell>.top h1");
    if (h1) h1.textContent = h1.textContent.trim().toUpperCase();
    decorateUser();
  }

  function decorateTickets() {
    document.querySelectorAll("#posTickets .frTicket").forEach((ticket) => {
      const strong = ticket.querySelector("strong");
      if (!strong || ticket.querySelector(".s98TicketNumber")) return;
      const raw = String(strong.textContent || "Ticket").trim();
      const number = raw.match(/#\s*([^\s]+)/)?.[1] || raw.match(/(\d+)/)?.[1] || "";
      strong.textContent = "Ticket";
      const badge = document.createElement("span");
      badge.className = "s98TicketNumber";
      badge.textContent = number ? `#${number}` : "#";
      const close = ticket.querySelector(".frTicketClose");
      if (close) ticket.insertBefore(badge, close);
      else ticket.appendChild(badge);
    });
  }

  function ensureStatusGlyph() {
    if (byId(STATUS_ID)) return;
    const glyph = document.createElement("div");
    glyph.id = STATUS_ID;
    document.body.appendChild(glyph);
  }

  function ensureFinishLabel() {
    const finish = byId("fielFinishSale");
    if (finish && finish.textContent.trim() !== "FINALIZAR VENTA") finish.textContent = "FINALIZAR VENTA";
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset.solrakSales98 = "1";
    if (!buildMenu()) return false;
    decorateHeader();
    decorateTickets();
    ensureFinishLabel();
    ensureStatusGlyph();
    return true;
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(() => mount(), 20);
  }

  function boot() {
    mount();
    observer = new MutationObserver(() => {
      decorateTickets();
      decorateUser();
      ensureFinishLabel();
      if (!byId(MENU_ID)) scheduleMount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("click", (event) => {
      const flyout = byId(FLYOUT_ID);
      if (!flyout) return;
      if (flyout.contains(event.target) || event.target.closest?.(".s98MenuItem,.s98Hamburger")) return;
      closeFlyout();
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeFlyout(); });
  }

  function destroy() {
    observer?.disconnect();
    clearTimeout(mountTimer);
    closeFlyout();
    byId(STATUS_ID)?.remove();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSalesExactV0198 = { version: VERSION, mount, destroy, decorateTickets, closeFlyout };
})();
