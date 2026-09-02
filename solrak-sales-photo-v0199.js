(() => {
  "use strict";

  const VERSION = "0.1.99";
  const STYLE_ID = "solrakSalesPhotoV0199Style";
  const REFERENCE = Object.freeze({
    viewportWidth: 1366,
    viewportHeight: 768,
    sidebar: 228,
    topbar: 58,
    rightPanel: 220,
    hamburger: 37,
    menuItem: 46,
    finish: 44,
    posTop: 44,
    searchBand: 66,
    cartHead: 25,
    bottomActions: 148,
    preview: 204,
    totals: 174
  });

  const byId = (id) => document.getElementById(id);
  let observer = null;
  let timer = null;

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{
  --s99-side:228px;
  --s99-top:58px;
  --s99-right:220px;
  --s99-orange:#e66b1b;
  --s99-orange-2:#ed7d22;
  --s99-yellow:#efb716;
  --s99-bg:#f7f7f5;
  --s99-side-bg:#efefed;
  --s99-line:#d5d5d2;
  --s98-side:var(--s99-side);
  --s98-top:var(--s99-top);
  --s98-right:var(--s99-right);
  --s95-side:var(--s99-side);
  --s95-top:var(--s99-top);
  --s95-right:var(--s99-right)
}
html[data-solrak-sales99="1"] body{font-family:"Segoe UI",Arial,sans-serif!important;background:#fff!important;color:#454543!important;overflow:hidden!important}
html[data-solrak-sales99="1"] #solrakFielSidebar{width:var(--s99-side)!important;background:var(--s99-side-bg)!important;border-right:1px solid #c8c8c5!important;box-shadow:none!important}
html[data-solrak-sales99="1"] #solrakFielSidebar .fielBrand{height:var(--s99-top)!important;min-height:var(--s99-top)!important;padding:6px 14px!important;gap:8px!important;background:linear-gradient(90deg,var(--s99-orange),var(--s99-orange-2))!important;box-sizing:border-box!important}
html[data-solrak-sales99="1"] #solrakFielSidebar .fielBrandMark{width:36px!important;height:36px!important;min-width:36px!important}
html[data-solrak-sales99="1"] #solrakFielSidebar .fielBrandMark::before{width:36px!important;height:36px!important}
html[data-solrak-sales99="1"] #solrakFielSidebar .fielBrandText strong{font-size:20px!important;font-weight:650!important;line-height:1!important;color:#fff!important;letter-spacing:-.02em!important}
html[data-solrak-sales99="1"] #solrakFielSidebar .fielBrandText small{margin-top:3px!important;font-size:7px!important;line-height:1!important;color:#ffd35a!important;letter-spacing:.09em!important}
html[data-solrak-sales99="1"] #solrakSalesV0198Menu{padding:0 0 45px!important;overflow:hidden!important;background:var(--s99-side-bg)!important}
html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98Hamburger{height:37px!important;min-height:37px!important;background:#f4f4f2!important;border-bottom:1px solid #d0d0cd!important}
html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98Hamburger svg{width:24px!important;height:24px!important}
html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98MenuItem{height:46px!important;min-height:46px!important;padding:0 13px!important;gap:10px!important;border-left:2px solid transparent!important;background:var(--s99-side-bg)!important;color:#424240!important;font-size:11.5px!important;line-height:1.1!important}
html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98MenuItem:hover,html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98MenuItem.active{background:#e4e4e1!important;border-left-color:#e66b1b!important}
html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98MenuItem svg{width:21px!important;height:21px!important;flex-basis:21px!important;color:#5a5a57!important}
html[data-solrak-sales99="1"] #fielFinishSale{height:44px!important;min-height:44px!important;background:linear-gradient(90deg,#eeaa12,#f4c21b)!important;color:#fff!important;border:0!important;font-size:11px!important;font-weight:650!important;letter-spacing:.01em!important;box-shadow:none!important}

html[data-solrak-sales99="1"] main.shell{margin-left:var(--s99-side)!important;width:auto!important;max-width:none!important;padding:0!important;background:#fff!important}
html[data-solrak-sales99="1"] main.shell>.top{height:var(--s99-top)!important;min-height:var(--s99-top)!important;padding:0!important;margin:0!important;background:linear-gradient(90deg,var(--s99-orange),var(--s99-orange-2))!important;box-shadow:none!important}
html[data-solrak-sales99="1"] main.shell>.top>div:first-child{left:16%!important;right:22%!important;text-align:center!important}
html[data-solrak-sales99="1"] main.shell>.top h1{font-size:18px!important;font-weight:300!important;line-height:58px!important;color:#fff!important;letter-spacing:.015em!important}
html[data-solrak-sales99="1"] main.shell>.top .top-actions{height:58px!important;min-height:58px!important}
html[data-solrak-sales99="1"] main.shell>.top .fielMailTop{width:44px!important;height:58px!important;min-height:58px!important;border-right:1px solid rgba(255,255,255,.3)!important;background:transparent!important}
html[data-solrak-sales99="1"] main.shell>.top .fielMailTop svg{width:20px!important;height:20px!important}
html[data-solrak-sales99="1"] main.shell>.top #currentUser{min-width:194px!important;height:58px!important;min-height:58px!important;padding:5px 15px 5px 52px!important;background:rgba(239,239,237,.96)!important;color:#333!important}
html[data-solrak-sales99="1"] main.shell>.top #currentUser::before{left:10px!important;top:9px!important;width:38px!important;height:38px!important;background:#9d9d98!important}
html[data-solrak-sales99="1"] main.shell>.top #currentUser strong{font-size:12px!important;font-weight:650!important}
html[data-solrak-sales99="1"] main.shell>.top #currentUser small{margin-top:3px!important;font-size:9.5px!important}
html[data-solrak-sales99="1"] main.shell>.top #logoutBtn{width:30px!important;height:58px!important;min-height:58px!important;background:rgba(239,239,237,.96)!important}
html[data-solrak-sales99="1"] main.shell>.top #logoutBtn::after{font-size:17px!important}

html[data-solrak-sales99="1"] #tab-pos{height:calc(100vh - var(--s99-top))!important;grid-template-rows:44px minmax(0,1fr)!important;background:#fff!important}
html[data-solrak-sales99="1"] #tab-pos>.frPosTop{height:44px!important;min-height:44px!important;padding:0 14px!important;gap:34px!important;border-bottom:1px solid #d7d7d4!important;background:#f8f8f6!important}
html[data-solrak-sales99="1"] #tab-pos>.frPosTop>div:first-child{gap:9px!important}
html[data-solrak-sales99="1"] #tab-pos>.frPosTop>div:first-child::before{width:21px!important;height:21px!important}
html[data-solrak-sales99="1"] #tab-pos>.frPosTop h2{font-size:11.5px!important;font-weight:400!important;color:#3f3f3d!important}
html[data-solrak-sales99="1"] #solrakV0195Scale{height:32px!important;padding-left:22px!important}
html[data-solrak-sales99="1"] #solrakV0195Scale svg{width:22px!important;height:22px!important}

html[data-solrak-sales99="1"] #tab-pos>.frPosGrid{grid-template-columns:minmax(0,1fr) var(--s99-right)!important;gap:0!important;height:100%!important}
html[data-solrak-sales99="1"] #tab-pos>.frPosGrid>.stack{grid-template-rows:66px minmax(0,1fr)!important;gap:0!important;background:#fff!important}
html[data-solrak-sales99="1"] #tab-pos>.frPosGrid>.stack>article:first-child{height:66px!important;min-height:66px!important;padding:9px 14px 8px!important;border:0!important;border-bottom:1px solid #d8d8d5!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
html[data-solrak-sales99="1"] #tab-pos .frPosSearch{width:min(520px,calc(100% - 20px))!important;grid-template-columns:minmax(300px,420px) 86px!important;gap:9px!important}
html[data-solrak-sales99="1"] #tab-pos #posSearch{height:36px!important;padding:0 10px!important;border:0!important;border-bottom:2px solid #e97821!important;border-radius:0!important;background:#e9e9e7!important;color:#333!important;font-size:13px!important;box-shadow:none!important}
html[data-solrak-sales99="1"] #solrakV0195SearchBtn{height:32px!important;min-height:32px!important;padding:0 11px!important;border:0!important;border-radius:1px!important;background:#df7729!important;color:#fff!important;font-size:10.5px!important;font-weight:600!important;box-shadow:0 1px 3px rgba(0,0,0,.18)!important}
html[data-solrak-sales99="1"] #tab-pos #posResults{left:14px!important;top:52px!important;width:min(420px,calc(100% - 126px))!important;max-height:300px!important}

html[data-solrak-sales99="1"] #tab-pos .frPosCartCard{height:100%!important;min-height:0!important;padding:0 0 148px!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
html[data-solrak-sales99="1"] #tab-pos .frPosCartHead{height:25px!important;min-height:25px!important;grid-template-columns:106px minmax(240px,1fr) 78px 63px 70px 72px 78px!important;border:0!important;border-bottom:1px solid #d7d7d4!important;background:#e4e4e2!important;color:#4b4b49!important;font-size:9.8px!important;text-align:center!important}
html[data-solrak-sales99="1"] #tab-pos .frPosCartHead span{font-weight:400!important;border-right:0!important}
html[data-solrak-sales99="1"] #tab-pos .frPosCart{min-height:0!important;max-height:none!important;border:0!important;border-radius:0!important;background:#fff!important;overflow:auto!important}
html[data-solrak-sales99="1"] #tab-pos .frPosLine{min-height:40px!important;grid-template-columns:106px minmax(240px,1fr) 78px 63px 70px 72px 78px!important;border-bottom:1px solid #ededeb!important;background:#fff!important;font-size:9.8px!important}
html[data-solrak-sales99="1"] #tab-pos .frPosLine>div,html[data-solrak-sales99="1"] #tab-pos .frPosLine>.s95Cell{padding:5px 6px!important;border-right:0!important;font-size:9.8px!important}

html[data-solrak-sales99="1"] #tab-pos .fielPosActions{position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:148px!important;padding:12px 14px 10px!important;border:0!important;background:#fff!important;box-sizing:border-box!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosStats{height:76px!important;margin:0!important;grid-template-columns:155px 180px!important;grid-template-rows:36px 34px!important;column-gap:12px!important;align-items:center!important;color:#4d4d4b!important;font-size:10px!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosStats>span:first-child{grid-column:1/-1!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosStats strong{margin-left:9px!important;color:#e88a21!important;font-size:18px!important;font-weight:400!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosTools{height:47px!important;grid-template-columns:1.1fr 1.18fr 1fr!important;gap:0!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosTool{height:47px!important;min-height:47px!important;gap:9px!important;padding:0 10px!important;border:0!important;border-right:1px solid #dededb!important;background:#fff!important;color:#555552!important;font-size:10px!important;font-weight:400!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosTool svg{width:21px!important;height:21px!important}
html[data-solrak-sales99="1"] #tab-pos .fielPosTool[data-fiel-pos-tool="common"]{display:none!important}

html[data-solrak-sales99="1"] #tab-pos aside.summary{height:100%!important;padding:15px 12px 174px!important;border:0!important;border-left:1px solid #d6d6d3!important;border-radius:0!important;background:#fafaf8!important;box-shadow:none!important;overflow:hidden!important;box-sizing:border-box!important}
html[data-solrak-sales99="1"] #tab-pos .frPreview{height:204px!important;min-height:204px!important;margin:0 0 9px!important;border:1px solid #cfcfcc!important;border-radius:3px!important;background:#fff!important;box-shadow:0 1px 2px rgba(0,0,0,.08)!important}
html[data-solrak-sales99="1"] #tab-pos .frPreview img{height:158px!important;object-fit:contain!important}
html[data-solrak-sales99="1"] #tab-pos .frPreviewMeta{font-size:8px!important}
html[data-solrak-sales99="1"] #tab-pos .frTicketBar{display:block!important;max-height:190px!important;margin:0!important;padding:0!important;overflow:auto!important}
html[data-solrak-sales99="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr!important;gap:0!important}
html[data-solrak-sales99="1"] #tab-pos .frTicket{width:100%!important;min-height:66px!important;padding:7px 26px!important;gap:5px!important;border:0!important;border-bottom:1px solid #ddd!important;border-radius:0!important;background:transparent!important;color:#444!important;box-shadow:none!important}
html[data-solrak-sales99="1"] #tab-pos .frTicket.active{background:#fff!important}
html[data-solrak-sales99="1"] #tab-pos .frTicket strong{font-size:10px!important;font-weight:400!important}
html[data-solrak-sales99="1"] #tab-pos .s98TicketNumber{min-width:70px!important;height:25px!important;padding:0 8px!important;border-radius:2px!important;background:#dfa127!important;color:#fff!important;font-size:10.5px!important;font-weight:500!important}
html[data-solrak-sales99="1"] #tab-pos .frTicketClose{right:18px!important;top:3px!important;color:#a94747!important;font-size:14px!important}
html[data-solrak-sales99="1"] #tab-pos .frTicketNew{display:none!important}

html[data-solrak-sales99="1"] #tab-pos .frPosTotals{position:absolute!important;left:12px!important;right:0!important;bottom:0!important;height:174px!important;margin:0!important;padding:13px 9px 10px!important;border-top:4px solid #9b9b98!important;background:#fafaf8!important;box-sizing:border-box!important}
html[data-solrak-sales99="1"] #tab-pos .frPosTotals>div:not(.frPosGrand){display:none!important}
html[data-solrak-sales99="1"] #tab-pos .frPosGrand{height:153px!important;margin:0!important;padding:0!important;border:0!important;font-weight:400!important}
html[data-solrak-sales99="1"] #tab-pos .frPosGrand span{display:block!important;font-size:31px!important;line-height:1!important;color:#585856!important;font-weight:300!important}
html[data-solrak-sales99="1"] #tab-pos .frPosGrand strong{display:block!important;margin-top:22px!important;text-align:center!important;font:400 46px/1 Georgia,"Times New Roman",serif!important;color:#3f3f3d!important}
html[data-solrak-sales99="1"] #tab-pos .frPosTotals::after{height:5px!important;background:var(--s99-yellow)!important}
html[data-solrak-sales99="1"] #solrakV0195Footer{right:calc(var(--s99-right) + 47px)!important;bottom:8px!important;color:#575754!important;font-size:9px!important}
html[data-solrak-sales99="1"] #solrakSalesV0198StatusGlyph{right:calc(var(--s99-right) + 16px)!important;bottom:7px!important;width:20px!important;height:18px!important}

@media(max-width:1180px){
  :root{--s99-side:204px;--s99-right:202px}
  html[data-solrak-sales99="1"] #solrakSalesV0198Menu .s98MenuItem{height:43px!important;min-height:43px!important;font-size:10.8px!important}
  html[data-solrak-sales99="1"] #tab-pos .frPosCartHead,html[data-solrak-sales99="1"] #tab-pos .frPosLine{grid-template-columns:92px minmax(165px,1fr) 70px 58px 65px 66px 70px!important}
  html[data-solrak-sales99="1"] #tab-pos .frPosSearch{width:min(470px,calc(100% - 14px))!important;grid-template-columns:minmax(270px,370px) 82px!important}
}
`;
    document.head.appendChild(style);
  }

  function normalizeLabels() {
    const search = byId("solrakV0195SearchBtn");
    if (search && search.textContent.trim() !== "BUSCAR") search.textContent = "BUSCAR";

    const labels = {
      discount: "Aplicar Descuento a la Venta",
      clear: "Eliminar Productos En Venta",
      print: "Imprimir Ticket En Venta"
    };
    for (const [key, label] of Object.entries(labels)) {
      const button = document.querySelector(`[data-fiel-pos-tool="${key}"]`);
      if (button && !button.textContent.includes(label)) {
        const svg = button.querySelector("svg");
        button.textContent = "";
        if (svg) button.appendChild(svg);
        button.appendChild(document.createTextNode(label));
      }
    }
  }

  function mount() {
    window.SOLRAKSalesExactV0198?.mount?.();
    injectStyle();
    document.documentElement.dataset.solrakSales99 = "1";
    normalizeLabels();
    return Boolean(byId("solrakSalesV0198Menu") && byId("fielFinishSale"));
  }

  function scheduleMount() {
    clearTimeout(timer);
    timer = setTimeout(mount, 24);
  }

  function boot() {
    mount();
    observer = new MutationObserver(() => {
      normalizeLabels();
      if (!byId(STYLE_ID) || document.documentElement.dataset.solrakSales99 !== "1") scheduleMount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function destroy() {
    observer?.disconnect();
    clearTimeout(timer);
    delete document.documentElement.dataset.solrakSales99;
    byId(STYLE_ID)?.remove();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSalesPhotoV0199 = { version: VERSION, reference: REFERENCE, mount, destroy };
})();
