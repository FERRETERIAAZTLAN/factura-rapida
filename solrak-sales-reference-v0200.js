(() => {
  "use strict";

  const VERSION = "0.2.00";
  const STYLE_ID = "solrakSalesReferenceV0200Style";
  const doc = document;
  const byId = (id) => doc?.getElementById?.(id) || null;
  let observer = null;
  let timer = null;

  // Medidas calibradas contra la referencia visual suministrada (1448x1086)
  // y normalizadas al escritorio objetivo 1366x768.
  const REFERENCE = Object.freeze({
    sourceWidth: 1448,
    sourceHeight: 1086,
    viewportWidth: 1366,
    viewportHeight: 768,
    sidebar: 245,
    topbar: 52,
    rightPanel: 250,
    hamburger: 43,
    menuItem: 49,
    finish: 49,
    finishBottomGap: 17,
    posTop: 50,
    searchBand: 67,
    searchInput: 31,
    searchButton: 31,
    cartHead: 26,
    bottomActions: 122,
    bottomGap: 99,
    previewTop: 54,
    previewWidth: 192,
    previewHeight: 185,
    totalsHeight: 112,
    totalsBottom: 106,
    footerBottom: 28
  });

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{
  --s200-side:245px;
  --s200-top:52px;
  --s200-right:250px;
  --s200-orange:#f05b18;
  --s200-orange2:#ff6519;
  --s200-yellow:#f6b900;
  --s200-sidebar:#f4f4f2;
  --s200-line:#d4d4d2;
  --s200-footer-gap:99px;
  --s99-side:var(--s200-side);
  --s99-top:var(--s200-top);
  --s99-right:var(--s200-right);
  --s98-side:var(--s200-side);
  --s98-top:var(--s200-top);
  --s98-right:var(--s200-right);
  --s95-side:var(--s200-side);
  --s95-top:var(--s200-top);
  --s95-right:var(--s200-right)
}
html[data-solrak-sales200="1"] body{font-family:"Segoe UI",Arial,sans-serif!important;background:#fff!important;color:#424240!important;overflow:hidden!important}

/* Barra lateral: proporción, aire y ritmo vertical de la referencia */
html[data-solrak-sales200="1"] #solrakFielSidebar{width:var(--s200-side)!important;background:var(--s200-sidebar)!important;border-right:1px solid #c9c9c7!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrand{height:var(--s200-top)!important;min-height:var(--s200-top)!important;padding:5px 14px!important;gap:8px!important;background:linear-gradient(90deg,var(--s200-orange),var(--s200-orange2))!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandMark{width:36px!important;height:36px!important;min-width:36px!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandMark::before{width:36px!important;height:36px!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandText strong{font-size:20px!important;font-weight:650!important;line-height:1!important;color:#fff!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandText small{margin-top:2px!important;font-size:7px!important;line-height:1!important;color:#ffd15a!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu{padding:0!important;background:var(--s200-sidebar)!important;scrollbar-width:thin!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98Hamburger{height:43px!important;min-height:43px!important;border:0!important;background:#f7f7f5!important;color:#20201f!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98Hamburger svg{width:26px!important;height:26px!important;stroke-width:2.2!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem{height:49px!important;min-height:49px!important;padding:0 12px!important;gap:11px!important;border:0!important;background:var(--s200-sidebar)!important;color:#343432!important;font-size:12.2px!important;line-height:1.1!important;font-weight:400!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem:hover{background:#e9e9e7!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem.active{background:#eeeeec!important;border:0!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem svg{width:22px!important;height:22px!important;flex-basis:22px!important;color:#6c6c69!important;stroke-width:1.6!important}
html[data-solrak-sales200="1"] #fielFinishSale{height:49px!important;min-height:49px!important;margin:0 5px 17px!important;border-radius:4px!important;background:linear-gradient(90deg,#f7ae00,#ffc313)!important;color:#fff!important;border:0!important;font-size:12px!important;font-weight:650!important;box-shadow:0 1px 2px rgba(0,0,0,.12)!important}

/* Encabezado superior */
html[data-solrak-sales200="1"] main.shell{margin-left:var(--s200-side)!important;width:auto!important;max-width:none!important;padding:0!important;background:#fff!important}
html[data-solrak-sales200="1"] main.shell>.top{height:var(--s200-top)!important;min-height:var(--s200-top)!important;padding:0!important;margin:0!important;background:linear-gradient(90deg,var(--s200-orange),var(--s200-orange2))!important;box-shadow:none!important}
html[data-solrak-sales200="1"] main.shell>.top>div:first-child{left:0!important;right:var(--s200-right)!important;text-align:center!important}
html[data-solrak-sales200="1"] main.shell>.top h1{font-size:19px!important;font-weight:300!important;line-height:52px!important;color:#fff!important;letter-spacing:.01em!important;text-transform:uppercase!important}
html[data-solrak-sales200="1"] main.shell>.top .top-actions{height:52px!important;min-height:52px!important;margin-left:auto!important;gap:0!important}
html[data-solrak-sales200="1"] main.shell>.top .fielMailTop{width:42px!important;height:52px!important;min-height:52px!important;border:0!important;border-right:1px solid rgba(255,255,255,.28)!important;background:transparent!important}
html[data-solrak-sales200="1"] main.shell>.top .fielMailTop svg{width:20px!important;height:20px!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser{min-width:180px!important;width:180px!important;height:52px!important;min-height:52px!important;padding:4px 10px 4px 47px!important;background:#f0f0ee!important;color:#2e2e2c!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser::before{left:8px!important;top:8px!important;width:36px!important;height:36px!important;background:#aaa9a5!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser strong{font-size:11.5px!important;font-weight:650!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser small{margin-top:2px!important;font-size:9.5px!important}
html[data-solrak-sales200="1"] main.shell>.top #logoutBtn{width:28px!important;height:52px!important;min-height:52px!important;background:#f0f0ee!important}

/* Banda superior de venta */
html[data-solrak-sales200="1"] #tab-pos{height:calc(100vh - var(--s200-top))!important;grid-template-rows:50px minmax(0,1fr)!important;background:#fff!important}
html[data-solrak-sales200="1"] #tab-pos>.frPosTop{height:50px!important;min-height:50px!important;padding:0 15px!important;gap:90px!important;border:0!important;background:#fff!important}
html[data-solrak-sales200="1"] #tab-pos>.frPosTop>div:first-child{gap:10px!important}
html[data-solrak-sales200="1"] #tab-pos>.frPosTop>div:first-child::before{width:24px!important;height:24px!important;color:#4f4f4d!important}
html[data-solrak-sales200="1"] #tab-pos>.frPosTop h2{font-size:12.5px!important;font-weight:400!important;color:#323230!important}
html[data-solrak-sales200="1"] #solrakV0195Scale{height:34px!important;padding-left:0!important;border:0!important;color:#555553!important}
html[data-solrak-sales200="1"] #solrakV0195Scale svg{width:23px!important;height:23px!important}
html[data-solrak-sales200="1"] #solrakV0195Scale span{display:none!important}

/* Área central y panel derecho */
html[data-solrak-sales200="1"] #tab-pos>.frPosGrid{grid-template-columns:minmax(0,1fr) var(--s200-right)!important;gap:0!important;height:100%!important;min-height:0!important}
html[data-solrak-sales200="1"] #tab-pos>.frPosGrid>.stack{grid-template-rows:67px minmax(0,1fr)!important;gap:0!important;min-height:0!important;background:#fff!important}
html[data-solrak-sales200="1"] #tab-pos>.frPosGrid>.stack>article:first-child{height:67px!important;min-height:67px!important;padding:10px 8px 8px 15px!important;border:0!important;background:#fff!important;box-shadow:none!important;overflow:visible!important}
html[data-solrak-sales200="1"] #tab-pos .frPosSearch{width:603px!important;max-width:calc(100% - 12px)!important;grid-template-columns:minmax(250px,489px) 104px!important;gap:10px!important;align-items:center!important}
html[data-solrak-sales200="1"] #tab-pos #posSearch{height:31px!important;padding:0 10px!important;border:1.5px solid #ff6b22!important;border-radius:3px!important;background:#fff!important;color:#333!important;font-size:12px!important;box-shadow:none!important;outline:none!important}
html[data-solrak-sales200="1"] #tab-pos #posSearch:focus{border-color:#f05b18!important;box-shadow:0 0 0 1px rgba(240,91,24,.08)!important}
html[data-solrak-sales200="1"] #solrakV0195SearchBtn{height:31px!important;min-height:31px!important;padding:0 13px!important;border:0!important;border-radius:3px!important;background:linear-gradient(#ff6b20,#f05b15)!important;color:#fff!important;font-size:11px!important;font-weight:650!important;box-shadow:0 2px 4px rgba(0,0,0,.22)!important}
html[data-solrak-sales200="1"] #tab-pos #posResults{left:15px!important;top:48px!important;width:min(489px,calc(100% - 130px))!important;max-height:300px!important}

/* Tabla de la venta */
html[data-solrak-sales200="1"] #tab-pos .frPosCartCard{height:100%!important;min-height:0!important;padding:0 0 221px!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
html[data-solrak-sales200="1"] #tab-pos .frPosCartHead{height:26px!important;min-height:26px!important;margin:0 8px 0 15px!important;grid-template-columns:105px minmax(240px,1fr) 82px 67px 74px 80px 83px!important;border:0!important;border-bottom:1px solid #d8d8d6!important;background:linear-gradient(#f2f2f1,#e6e6e4)!important;color:#30302e!important;font-size:10px!important;text-align:center!important}
html[data-solrak-sales200="1"] #tab-pos .frPosCartHead span{font-weight:400!important;border-right:0!important}
html[data-solrak-sales200="1"] #tab-pos .frPosCart{min-height:0!important;max-height:none!important;margin:0 8px 0 15px!important;border:0!important;border-radius:0!important;background:#fff!important;overflow:auto!important}
html[data-solrak-sales200="1"] #tab-pos .frPosLine{min-height:38px!important;grid-template-columns:105px minmax(240px,1fr) 82px 67px 74px 80px 83px!important;border-bottom:1px solid #ededeb!important;background:#fff!important;font-size:10px!important}
html[data-solrak-sales200="1"] #tab-pos .frPosLine>div,html[data-solrak-sales200="1"] #tab-pos .frPosLine>.s95Cell{padding:5px 6px!important;border-right:0!important;font-size:10px!important}

/* Acciones inferiores: dejan la franja de estado libre como en la captura */
html[data-solrak-sales200="1"] #tab-pos .fielPosActions{position:absolute!important;left:15px!important;right:8px!important;bottom:99px!important;height:122px!important;padding:0!important;border:0!important;background:#fff!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosStats{height:68px!important;margin:0!important;grid-template-columns:175px 200px!important;grid-template-rows:34px 34px!important;column-gap:10px!important;row-gap:0!important;align-items:center!important;color:#41413f!important;font-size:10.8px!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosStats>span:first-child{grid-column:1/-1!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosStats strong{margin-left:12px!important;color:#ff710d!important;font-size:18px!important;font-weight:400!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosTools{height:54px!important;grid-template-columns:1.08fr 1.22fr 1fr!important;gap:0!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosTool{height:54px!important;min-height:54px!important;justify-content:flex-start!important;gap:11px!important;padding:0 16px!important;border:0!important;background:#fff!important;color:#484846!important;font-size:10.7px!important;font-weight:400!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosTool svg{width:22px!important;height:22px!important;color:#5d5d5a!important}
html[data-solrak-sales200="1"] #tab-pos .fielPosTool[data-fiel-pos-tool="common"]{display:none!important}

/* Vista del producto y tickets */
html[data-solrak-sales200="1"] #tab-pos aside.summary{height:100%!important;padding:54px 0 0!important;border:0!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] #tab-pos .frPreview{width:192px!important;height:185px!important;min-height:185px!important;margin:0 18px 10px 40px!important;border:1px solid #c9c9c7!important;border-radius:4px!important;background:#fff!important;box-shadow:0 1px 2px rgba(0,0,0,.08)!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] #tab-pos .frPreview img{height:145px!important;object-fit:contain!important}
html[data-solrak-sales200="1"] #tab-pos .frPreviewMeta{font-size:8px!important}
html[data-solrak-sales200="1"] #tab-pos .frTicketBar{display:block!important;width:192px!important;max-height:158px!important;margin:0 18px 0 40px!important;padding:0!important;overflow:auto!important}
html[data-solrak-sales200="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr!important;gap:0!important}
html[data-solrak-sales200="1"] #tab-pos .frTicket{width:192px!important;min-height:67px!important;padding:4px 24px!important;gap:6px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#333!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #tab-pos .frTicket.active{background:#fff!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #tab-pos .frTicket strong{font-size:10px!important;font-weight:400!important;color:#333!important}
html[data-solrak-sales200="1"] #tab-pos .s98TicketNumber{min-width:85px!important;height:27px!important;padding:0 10px!important;border-radius:3px!important;background:#f5b600!important;color:#fff!important;font-size:11px!important;font-weight:500!important}
html[data-solrak-sales200="1"] #tab-pos .frTicketClose{right:30px!important;top:4px!important;color:#e00000!important;font-size:15px!important;font-weight:400!important}
html[data-solrak-sales200="1"] #tab-pos .frTicketNew{display:none!important}

/* Total: línea gris y amarilla elevadas, no pegadas al borde inferior */
html[data-solrak-sales200="1"] #tab-pos .frPosTotals{position:absolute!important;left:20px!important;right:8px!important;bottom:106px!important;height:112px!important;margin:0!important;padding:11px 7px 5px!important;border-top:4px solid #aaa9a6!important;background:#fff!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] #tab-pos .frPosTotals>div:not(.frPosGrand){display:none!important}
html[data-solrak-sales200="1"] #tab-pos .frPosGrand{height:96px!important;margin:0!important;padding:0!important;border:0!important;font-weight:400!important}
html[data-solrak-sales200="1"] #tab-pos .frPosGrand span{display:block!important;font-size:31px!important;line-height:1!important;color:#555552!important;font-weight:300!important}
html[data-solrak-sales200="1"] #tab-pos .frPosGrand strong{display:block!important;margin-top:18px!important;text-align:center!important;font:400 45px/1 Georgia,"Times New Roman",serif!important;color:#383836!important}
html[data-solrak-sales200="1"] #tab-pos .frPosTotals::after{left:0!important;right:0!important;bottom:0!important;height:5px!important;background:var(--s200-yellow)!important}

/* Barra de estado inferior */
html[data-solrak-sales200="1"] #solrakV0195Footer{right:118px!important;bottom:28px!important;color:#565653!important;font-size:12px!important;font-weight:400!important}
html[data-solrak-sales200="1"] #solrakSalesV0198StatusGlyph{right:74px!important;bottom:27px!important;width:22px!important;height:20px!important;gap:3px!important}

@media(max-width:1180px){
  :root{--s200-side:220px;--s200-right:224px;--s99-side:220px;--s99-right:224px;--s98-side:220px;--s98-right:224px;--s95-side:220px;--s95-right:224px}
  html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem{height:46px!important;min-height:46px!important;font-size:11px!important}
  html[data-solrak-sales200="1"] #tab-pos .frPosSearch{width:min(560px,calc(100% - 10px))!important;grid-template-columns:minmax(270px,446px) 94px!important}
  html[data-solrak-sales200="1"] #tab-pos .frPosCartHead,html[data-solrak-sales200="1"] #tab-pos .frPosLine{grid-template-columns:92px minmax(160px,1fr) 70px 58px 66px 68px 72px!important}
  html[data-solrak-sales200="1"] #tab-pos .frPreview,html[data-solrak-sales200="1"] #tab-pos .frTicketBar{width:180px!important;margin-left:26px!important}
  html[data-solrak-sales200="1"] #tab-pos .frTicket{width:180px!important}
}
`;
    doc.head.appendChild(style);
  }

  function normalizeReferenceUi() {
    const search = byId("posSearch");
    if (search) search.placeholder = "";

    const searchButton = byId("solrakV0195SearchBtn");
    if (searchButton && searchButton.textContent.trim() !== "BUSCAR") searchButton.textContent = "BUSCAR";

    const finish = byId("fielFinishSale");
    if (finish && finish.textContent.trim() !== "FINALIZAR VENTA") finish.textContent = "FINALIZAR VENTA";

    const labels = {
      discount: "Aplicar Descuento a la Venta",
      clear: "Eliminar Productos En Venta",
      print: "Imprimir Ticket En Venta"
    };
    for (const [key, label] of Object.entries(labels)) {
      const button = doc.querySelector?.(`[data-fiel-pos-tool="${key}"]`);
      if (!button || button.textContent.includes(label)) continue;
      const icon = button.querySelector("svg");
      button.textContent = "";
      if (icon) button.appendChild(icon);
      button.appendChild(doc.createTextNode(label));
    }
  }

  function mount() {
    window.SOLRAKSalesPhotoV0199?.mount?.();
    injectStyle();
    if (doc.documentElement) doc.documentElement.dataset.solrakSales200 = "1";
    normalizeReferenceUi();
    return Boolean(byId("solrakSalesV0198Menu") && byId("fielFinishSale") && byId("posSearch"));
  }

  function scheduleMount() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!doc.documentElement) return;
      mount();
    }, 24);
  }

  function boot() {
    mount();
    observer = new MutationObserver(() => {
      if (!doc.documentElement) return;
      normalizeReferenceUi();
      if (!byId(STYLE_ID) || doc.documentElement.dataset.solrakSales200 !== "1") scheduleMount();
    });
    if (doc.documentElement) observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  function destroy() {
    observer?.disconnect();
    observer = null;
    clearTimeout(timer);
    timer = null;
    if (doc.documentElement) delete doc.documentElement.dataset.solrakSales200;
    byId(STYLE_ID)?.remove();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSalesReferenceV0200 = { version: VERSION, reference: REFERENCE, mount, destroy };
})();
