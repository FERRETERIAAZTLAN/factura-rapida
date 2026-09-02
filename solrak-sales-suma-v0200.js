(() => {
  "use strict";

  const VERSION = "0.2.00";
  const STYLE_ID = "solrakSalesSumaV0200Style";
  const WORKSPACE_ID = "solrakSalesSumaV0200Workspace";
  const OLD_STYLE_IDS = ["solrakSalesPhotoV0199Style", "solrakSalesExactV0198Style", "solrakSumaSalesV0195Style"];
  const oldMedia = new Map();
  let observer = null;
  let mountTimer = null;

  const byId = (id) => document.getElementById(id);

  function disableOldVisualLayers() {
    for (const id of OLD_STYLE_IDS) {
      const style = byId(id);
      if (!style) continue;
      if (!oldMedia.has(style)) oldMedia.set(style, style.media || "");
      style.media = "not all";
    }
  }

  function restoreOldVisualLayers() {
    for (const [style, media] of oldMedia.entries()) {
      if (style?.isConnected) style.media = media;
    }
    oldMedia.clear();
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{
  --s200-side:clamp(232px,17.96vw,260px);
  --s200-top:clamp(58px,6.82vh,74px);
  --s200-right:clamp(220px,17vw,246px);
  --s200-orange:#f04a0b;
  --s200-orange2:#ff5a0a;
  --s200-yellow:#ffbe00;
  --s200-side-bg:#f1f1ef;
  --s200-line:#d4d4d1;
  --s200-text:#41413f;
}
html[data-solrak-sales200="1"],html[data-solrak-sales200="1"] body{width:100%;height:100%;margin:0!important;overflow:hidden!important;background:#fff!important;color:var(--s200-text)!important;font-family:"Segoe UI",Arial,sans-serif!important}
html[data-solrak-sales200="1"] body{min-width:900px!important}

/* Barra y menú: una sola pieza, como la referencia Suma */
html[data-solrak-sales200="1"] #solrakFielSidebar{position:fixed!important;z-index:9000!important;left:0!important;top:0!important;bottom:0!important;width:var(--s200-side)!important;display:flex!important;flex-direction:column!important;background:var(--s200-side-bg)!important;border-right:1px solid #c7c7c4!important;box-shadow:none!important;overflow:hidden!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrand{height:var(--s200-top)!important;min-height:var(--s200-top)!important;padding:7px 14px!important;display:flex!important;align-items:center!important;gap:9px!important;background:linear-gradient(90deg,var(--s200-orange),var(--s200-orange2))!important;border:0!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandMark{width:43px!important;height:43px!important;min-width:43px!important;border:0!important;background:transparent!important;color:#fff!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandText strong{display:block!important;color:#fff!important;font-size:25px!important;font-weight:400!important;line-height:1!important;letter-spacing:-.03em!important}
html[data-solrak-sales200="1"] #solrakFielSidebar .fielBrandText small{display:block!important;margin-top:3px!important;color:#ffe18b!important;font-size:8px!important;font-weight:600!important;letter-spacing:.18em!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu{flex:1 1 auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;padding:0!important;margin:0!important;background:var(--s200-side-bg)!important;overflow:hidden!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98Hamburger{height:clamp(38px,4.8vh,52px)!important;min-height:38px!important;display:grid!important;place-items:center!important;border:0!important;border-bottom:1px solid #d6d6d2!important;background:#f6f6f4!important;color:#161616!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98Hamburger svg{width:28px!important;height:28px!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem{flex:1 1 0!important;min-height:42px!important;max-height:clamp(48px,6.2vh,67px)!important;width:100%!important;display:flex!important;align-items:center!important;gap:13px!important;padding:0 17px!important;border:0!important;border-left:3px solid transparent!important;border-radius:0!important;background:var(--s200-side-bg)!important;color:#3e3e3c!important;font-size:clamp(12px,1.03vw,15px)!important;font-weight:400!important;text-align:left!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem:hover,html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem.active{background:#e8e8e5!important;border-left-color:var(--s200-orange)!important}
html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem svg{width:24px!important;height:24px!important;min-width:24px!important;color:#656560!important}
html[data-solrak-sales200="1"] #fielFinishSale{position:static!important;flex:0 0 clamp(52px,6.6vh,72px)!important;width:100%!important;margin:0!important;border:0!important;border-radius:0!important;background:linear-gradient(90deg,#ffad00,#ffc21a)!important;color:#fff!important;font-size:clamp(13px,1.1vw,16px)!important;font-weight:600!important;letter-spacing:.01em!important;box-shadow:none!important}

/* Encabezado naranja completo */
html[data-solrak-sales200="1"] main.shell{position:fixed!important;z-index:1!important;left:var(--s200-side)!important;right:0!important;top:0!important;bottom:0!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;background:#fff!important;overflow:hidden!important}
html[data-solrak-sales200="1"] main.shell>.top{height:var(--s200-top)!important;min-height:var(--s200-top)!important;margin:0!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;background:linear-gradient(90deg,var(--s200-orange),var(--s200-orange2))!important;border:0!important;box-shadow:none!important;overflow:visible!important}
html[data-solrak-sales200="1"] main.shell>.top>div:first-child{position:absolute!important;left:0!important;right:245px!important;top:0!important;height:100%!important;display:grid!important;place-items:center!important;text-align:center!important;pointer-events:none!important}
html[data-solrak-sales200="1"] main.shell>.top .eyebrow,html[data-solrak-sales200="1"] main.shell>.top #businessName{display:none!important}
html[data-solrak-sales200="1"] main.shell>.top h1{margin:0!important;color:#fff!important;font-size:clamp(19px,2vw,29px)!important;font-weight:300!important;line-height:1!important;letter-spacing:.01em!important;text-transform:uppercase!important}
html[data-solrak-sales200="1"] main.shell>.top .top-actions{position:absolute!important;z-index:3!important;right:0!important;top:0!important;height:var(--s200-top)!important;display:flex!important;align-items:stretch!important;gap:0!important;flex-wrap:nowrap!important;background:#f4f4f2!important}
html[data-solrak-sales200="1"] main.shell>.top .top-actions>.pill.ok,html[data-solrak-sales200="1"] main.shell>.top #changePinBtn{display:none!important}
html[data-solrak-sales200="1"] main.shell>.top .fielMailTop{width:58px!important;height:100%!important;border:0!important;border-right:1px solid rgba(255,255,255,.35)!important;border-radius:0!important;background:var(--s200-orange2)!important;color:#fff!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser{position:relative!important;min-width:188px!important;height:100%!important;margin:0!important;padding:10px 33px 8px 56px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;border:0!important;border-radius:0!important;background:#f4f4f2!important;color:#222!important;font-size:13px!important;font-weight:600!important;box-shadow:none!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser::before{content:""!important;position:absolute!important;left:12px!important;top:50%!important;width:35px!important;height:35px!important;transform:translateY(-50%)!important;border-radius:50%!important;background:#aaa!important;box-shadow:inset 0 -8px 0 #8f8f8f!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser strong{font-size:14px!important;font-weight:650!important}
html[data-solrak-sales200="1"] main.shell>.top #currentUser small{font-size:10px!important;font-weight:600!important;margin-top:3px!important}
html[data-solrak-sales200="1"] main.shell>.top #logoutBtn{width:34px!important;height:100%!important;padding:0!important;border:0!important;border-radius:0!important;background:#f4f4f2!important;color:#555!important;font-size:0!important}
html[data-solrak-sales200="1"] main.shell>.top #logoutBtn::after{content:"⌄";font-size:20px!important}

/* Estructura nueva: los nodos reales del POS se mueven aquí, no se clonan */
html[data-solrak-sales200="1"] #tab-pos{position:absolute!important;left:0!important;right:0!important;top:var(--s200-top)!important;bottom:0!important;height:auto!important;margin:0!important;padding:0!important;display:block!important;background:#fff!important;overflow:hidden!important}
html[data-solrak-sales200="1"] #solrakSalesSumaV0200Workspace{position:absolute!important;inset:0!important;display:grid!important;grid-template-rows:clamp(46px,6.2vh,68px) minmax(0,1fr)!important;background:#fff!important}
html[data-solrak-sales200="1"] #solrakSalesSumaV0200Workspace>.frPosTop{height:auto!important;min-height:0!important;margin:0!important;padding:0 18px!important;display:flex!important;align-items:center!important;gap:45px!important;border:0!important;border-bottom:1px solid #d5d5d2!important;background:#fafaf8!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #solrakSalesSumaV0200Workspace>.frPosTop>div:first-child{display:flex!important;align-items:center!important;gap:11px!important}
html[data-solrak-sales200="1"] #solrakSalesSumaV0200Workspace>.frPosTop>div:first-child::before{content:"🛒"!important;font-size:24px!important;filter:grayscale(1)!important}
html[data-solrak-sales200="1"] #solrakSalesSumaV0200Workspace>.frPosTop h2{margin:0!important;color:#333!important;font-size:clamp(13px,1.05vw,16px)!important;font-weight:400!important}
html[data-solrak-sales200="1"] #solrakV0195Scale{height:100%!important;display:flex!important;align-items:center!important;gap:8px!important;color:#555!important}
html[data-solrak-sales200="1"] #solrakV0195Scale svg{width:25px!important;height:25px!important}
html[data-solrak-sales200="1"] #solrakV0195Scale span{font-size:0!important}

html[data-solrak-sales200="1"] .s200Body{min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) var(--s200-right)!important;background:#fff!important}
html[data-solrak-sales200="1"] .s200Left{position:relative!important;min-width:0!important;min-height:0!important;display:grid!important;grid-template-rows:clamp(66px,8.7vh,94px) minmax(0,1fr)!important;background:#fff!important}
html[data-solrak-sales200="1"] .s200SearchCard{position:relative!important;height:auto!important;min-height:0!important;margin:0!important;padding:clamp(12px,1.6vh,17px) 16px!important;border:0!important;border-bottom:1px solid #ddd!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:visible!important}
html[data-solrak-sales200="1"] .s200SearchCard .frPosSearch{width:min(630px,72%)!important;height:100%!important;display:grid!important;grid-template-columns:minmax(330px,1fr) 110px!important;align-items:center!important;gap:12px!important}
html[data-solrak-sales200="1"] #posSearch{height:clamp(38px,4.8vh,52px)!important;width:100%!important;padding:0 12px!important;border:1px solid var(--s200-orange)!important;border-radius:2px!important;background:#fff!important;color:#333!important;font-size:14px!important;outline:none!important;box-shadow:none!important}
html[data-solrak-sales200="1"] #posSearch:focus{box-shadow:0 0 0 2px rgba(240,74,11,.12)!important}
html[data-solrak-sales200="1"] #solrakV0195SearchBtn{height:clamp(36px,4.5vh,48px)!important;padding:0 16px!important;border:0!important;border-radius:3px!important;background:linear-gradient(180deg,#f36a1c,#e9500a)!important;color:#fff!important;font-size:12px!important;font-weight:650!important;box-shadow:0 2px 4px rgba(0,0,0,.17)!important}
html[data-solrak-sales200="1"] #posResults{position:absolute!important;z-index:25!important;left:16px!important;top:calc(50% + 24px)!important;width:min(510px,65%)!important;max-height:310px!important;overflow:auto!important;background:#fff!important}

html[data-solrak-sales200="1"] .s200CartCard{position:relative!important;height:auto!important;min-height:0!important;margin:0!important;padding:0 0 clamp(128px,15.2vh,165px)!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
html[data-solrak-sales200="1"] .s200CartCard .frPosCartHead{height:clamp(25px,3.2vh,35px)!important;min-height:25px!important;display:grid!important;grid-template-columns:118px minmax(240px,1fr) 92px 82px 92px 82px 94px!important;align-items:center!important;border:0!important;border-bottom:1px solid #d1d1ce!important;background:#e8e8e6!important;color:#454543!important;font-size:clamp(10px,.86vw,12px)!important;text-align:center!important}
html[data-solrak-sales200="1"] .s200CartCard .frPosCartHead span{font-weight:400!important}
html[data-solrak-sales200="1"] .s200CartCard .frPosCart{height:calc(100% - clamp(25px,3.2vh,35px))!important;min-height:0!important;max-height:none!important;overflow:auto!important;border:0!important;border-radius:0!important;background:#fff!important}
html[data-solrak-sales200="1"] .s200CartCard .frPosLine{min-height:42px!important;display:grid!important;grid-template-columns:118px minmax(240px,1fr) 92px 82px 92px 82px 94px!important;align-items:center!important;border:0!important;border-bottom:1px solid #ececea!important;background:#fff!important;font-size:11px!important}
html[data-solrak-sales200="1"] .s200CartCard .frPosLine>div,html[data-solrak-sales200="1"] .s200CartCard .frPosLine>.s95Cell{padding:6px 8px!important;border:0!important}

html[data-solrak-sales200="1"] .s200CartCard .fielPosActions{position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:clamp(128px,15.2vh,165px)!important;margin:0!important;padding:10px 16px 9px!important;display:grid!important;grid-template-rows:54px minmax(0,1fr)!important;border:0!important;border-top:1px solid #f0f0ee!important;background:#fff!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] .s200CartCard .fielPosStats{display:grid!important;grid-template-columns:190px 180px 210px!important;align-items:center!important;gap:14px!important;margin:0!important;color:#4a4a48!important;font-size:11px!important}
html[data-solrak-sales200="1"] .s200CartCard .fielPosStats strong{margin-left:12px!important;color:#f28a17!important;font-size:19px!important;font-weight:400!important}
html[data-solrak-sales200="1"] .s200CartCard .fielPosTools{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;align-items:stretch!important}
html[data-solrak-sales200="1"] .s200CartCard .fielPosTool{height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:0 12px!important;border:0!important;border-right:1px solid #dededb!important;border-radius:0!important;background:#fff!important;color:#555552!important;font-size:clamp(10px,.9vw,12px)!important;font-weight:400!important;box-shadow:none!important}
html[data-solrak-sales200="1"] .s200CartCard .fielPosTool svg{width:23px!important;height:23px!important}
html[data-solrak-sales200="1"] .s200CartCard .fielPosTool[data-fiel-pos-tool="common"]{display:none!important}

/* Columna derecha: preview, ticket activo y total */
html[data-solrak-sales200="1"] .s200Right{position:relative!important;min-height:0!important;border-left:1px solid #d5d5d2!important;background:#fbfbf9!important;overflow:hidden!important}
html[data-solrak-sales200="1"] .s200Right.summary{height:100%!important;margin:0!important;padding:clamp(18px,2.2vh,24px) 12px clamp(176px,20vh,216px)!important;border-radius:0!important;box-shadow:none!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] .s200Right .frPreview{height:clamp(185px,25vh,270px)!important;min-height:185px!important;margin:0 0 12px!important;border:1px solid #c9c9c6!important;border-radius:4px!important;background:#fff!important;box-shadow:0 1px 2px rgba(0,0,0,.08)!important;overflow:hidden!important}
html[data-solrak-sales200="1"] .s200Right .frPreview img{max-width:100%!important;height:calc(100% - 38px)!important;object-fit:contain!important}
html[data-solrak-sales200="1"] .s200Right .frPreviewMeta{font-size:9px!important}
html[data-solrak-sales200="1"] .s200Right .frTicketBar{display:block!important;max-height:clamp(120px,20vh,210px)!important;margin:0!important;padding:0!important;overflow:auto!important;background:transparent!important}
html[data-solrak-sales200="1"] .s200Right #posTickets{display:grid!important;grid-template-columns:1fr!important;gap:0!important}
html[data-solrak-sales200="1"] .s200Right .frTicket{position:relative!important;width:100%!important;min-height:68px!important;margin:0!important;padding:10px 30px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:7px!important;border:0!important;border-bottom:1px solid #ddd!important;border-radius:0!important;background:transparent!important;color:#444!important;box-shadow:none!important}
html[data-solrak-sales200="1"] .s200Right .frTicket strong{font-size:12px!important;font-weight:400!important}
html[data-solrak-sales200="1"] .s200Right .s98TicketNumber{display:grid!important;place-items:center!important;min-width:88px!important;height:32px!important;padding:0 10px!important;border-radius:3px!important;background:#e9aa14!important;color:#fff!important;font-size:12px!important;font-weight:500!important}
html[data-solrak-sales200="1"] .s200Right .frTicketClose{position:absolute!important;right:16px!important;top:5px!important;color:#d00000!important;font-size:18px!important}
html[data-solrak-sales200="1"] .s200Right .frTicketNew{display:none!important}
html[data-solrak-sales200="1"] .s200Right .frPosTotals{position:absolute!important;left:12px!important;right:0!important;bottom:0!important;height:clamp(176px,20vh,216px)!important;margin:0!important;padding:17px 10px 12px!important;border:0!important;border-top:5px solid #999!important;background:#fbfbf9!important;box-sizing:border-box!important}
html[data-solrak-sales200="1"] .s200Right .frPosTotals>div:not(.frPosGrand){display:none!important}
html[data-solrak-sales200="1"] .s200Right .frPosGrand{height:100%!important;display:block!important;margin:0!important;padding:0!important;border:0!important;font-weight:400!important}
html[data-solrak-sales200="1"] .s200Right .frPosGrand span{display:block!important;color:#555!important;font-size:clamp(28px,2.4vw,36px)!important;font-weight:300!important;line-height:1!important}
html[data-solrak-sales200="1"] .s200Right .frPosGrand strong{display:block!important;margin-top:clamp(22px,3vh,34px)!important;color:#3f3f3d!important;font:400 clamp(42px,4vw,58px)/1 Georgia,"Times New Roman",serif!important;text-align:center!important}
html[data-solrak-sales200="1"] .s200Right .frPosTotals::after{content:""!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:6px!important;background:var(--s200-yellow)!important}

html[data-solrak-sales200="1"] #solrakV0195Footer{position:fixed!important;z-index:9500!important;right:calc(var(--s200-right) + 55px)!important;bottom:10px!important;color:#5a5a57!important;font-size:10px!important;pointer-events:none!important}
html[data-solrak-sales200="1"] #solrakSalesV0198StatusGlyph{position:fixed!important;z-index:9500!important;right:calc(var(--s200-right) + 18px)!important;bottom:8px!important}
html[data-solrak-sales200="1"] #solrakSalesV0195LegacyMenu,html[data-solrak-sales200="1"] #solrakV0195Menu{display:none!important}
html[data-solrak-sales200="1"] .s98Flyout{z-index:12000!important}

@media(max-width:1080px){
  :root{--s200-side:220px;--s200-right:205px}
  html[data-solrak-sales200="1"] #solrakSalesV0198Menu .s98MenuItem{padding:0 12px!important;gap:9px!important;font-size:11px!important}
  html[data-solrak-sales200="1"] .s200CartCard .frPosCartHead,html[data-solrak-sales200="1"] .s200CartCard .frPosLine{grid-template-columns:88px minmax(170px,1fr) 70px 62px 68px 65px 70px!important}
  html[data-solrak-sales200="1"] .s200SearchCard .frPosSearch{width:74%!important;grid-template-columns:minmax(240px,1fr) 88px!important}
  html[data-solrak-sales200="1"] .s200CartCard .fielPosStats{grid-template-columns:150px 145px 165px!important}
}
`;
    document.head.appendChild(style);
  }

  function normalizeLabels() {
    const search = byId("solrakV0195SearchBtn");
    if (search) search.textContent = "BUSCAR";
    const finish = byId("fielFinishSale");
    if (finish) finish.textContent = "FINALIZAR VENTA";
    const labels = {
      discount: "Aplicar Descuento a la Venta",
      clear: "Eliminar Productos En Venta",
      print: "Imprimir Ticket En Venta"
    };
    for (const [key, label] of Object.entries(labels)) {
      const button = document.querySelector(`[data-fiel-pos-tool="${key}"]`);
      if (!button) continue;
      const svg = button.querySelector("svg");
      if (button.textContent.trim() === label) continue;
      button.textContent = "";
      if (svg) button.appendChild(svg);
      button.appendChild(document.createTextNode(label));
    }
  }

  function moveWithPlaceholder(node, key) {
    if (!node || node.dataset.s200Moved === "1") return null;
    const marker = document.createComment(`SOLRAK_V0200_${key}`);
    node.parentNode?.insertBefore(marker, node);
    node.dataset.s200Moved = "1";
    node.__s200Marker = marker;
    return node;
  }

  function buildWorkspace() {
    if (byId(WORKSPACE_ID)) return true;
    const tab = byId("tab-pos");
    if (!tab) return false;
    const top = tab.querySelector(":scope > .frPosTop");
    const oldGrid = tab.querySelector(":scope > .frPosGrid");
    const stack = oldGrid?.querySelector(":scope > .stack");
    const searchCard = stack?.querySelector(":scope > article:first-child");
    const cartCard = stack?.querySelector(":scope > .frPosCartCard");
    const summary = oldGrid?.querySelector(":scope > aside.summary");
    if (!top || !oldGrid || !searchCard || !cartCard || !summary) return false;

    moveWithPlaceholder(top, "TOP");
    moveWithPlaceholder(searchCard, "SEARCH");
    moveWithPlaceholder(cartCard, "CART");
    moveWithPlaceholder(summary, "SUMMARY");

    const workspace = document.createElement("div");
    workspace.id = WORKSPACE_ID;
    const body = document.createElement("div");
    body.className = "s200Body";
    const left = document.createElement("div");
    left.className = "s200Left";
    searchCard.classList.add("s200SearchCard");
    cartCard.classList.add("s200CartCard");
    summary.classList.add("s200Right");
    left.append(searchCard, cartCard);
    body.append(left, summary);
    workspace.append(top, body);
    tab.insertBefore(workspace, oldGrid);
    oldGrid.hidden = true;
    oldGrid.dataset.s200OldGrid = "1";
    return true;
  }

  function restoreNode(node) {
    const marker = node?.__s200Marker;
    if (node && marker?.parentNode) {
      marker.parentNode.insertBefore(node, marker);
      marker.remove();
      delete node.dataset.s200Moved;
      delete node.__s200Marker;
    }
  }

  function mount() {
    window.SOLRAKSalesExactV0198?.mount?.();
    window.SOLRAKSalesPhotoV0199?.mount?.();
    disableOldVisualLayers();
    injectStyle();
    document.documentElement.dataset.solrakSales200 = "1";
    normalizeLabels();
    if (!buildWorkspace()) return false;
    normalizeLabels();
    return true;
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 30);
  }

  function boot() {
    mount();
    observer = new MutationObserver(() => {
      normalizeLabels();
      disableOldVisualLayers();
      if (!byId(WORKSPACE_ID)) scheduleMount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function destroy() {
    observer?.disconnect();
    clearTimeout(mountTimer);
    const workspace = byId(WORKSPACE_ID);
    if (workspace) {
      const top = workspace.querySelector(":scope > .frPosTop");
      const searchCard = workspace.querySelector(".s200SearchCard");
      const cartCard = workspace.querySelector(".s200CartCard");
      const summary = workspace.querySelector(".s200Right.summary");
      restoreNode(top);
      restoreNode(searchCard);
      restoreNode(cartCard);
      restoreNode(summary);
      workspace.remove();
    }
    const oldGrid = document.querySelector('[data-s200-old-grid="1"]');
    if (oldGrid) {
      oldGrid.hidden = false;
      delete oldGrid.dataset.s200OldGrid;
    }
    delete document.documentElement.dataset.solrakSales200;
    byId(STYLE_ID)?.remove();
    restoreOldVisualLayers();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSalesSumaV0200 = {
    version: VERSION,
    mount,
    destroy,
    buildWorkspace,
    reference: Object.freeze({ width: 1448, height: 1086, sidebar: 260, topbar: 74 })
  };
})();
