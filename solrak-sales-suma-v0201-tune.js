(() => {
  "use strict";
  const VERSION = "0.2.01";
  const STYLE_ID = "solrakSalesSumaV0201TuneStyle";
  let observer = null;

  function mount() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
html[data-solrak-sales201="1"]{--s201-right:265px!important}
html[data-solrak-sales201="1"] #solrakFielSidebar>.fielMenu,
html[data-solrak-sales201="1"] #solrakV0195LegacyMenu,
html[data-solrak-sales201="1"] #solrakSalesV0195LegacyMenu,
html[data-solrak-sales201="1"] #solrakV0195Menu{display:none!important}
html[data-solrak-sales201="1"] #solrakFielSidebar .fielBrandMark{font-size:0!important}
html[data-solrak-sales201="1"] #solrakFielSidebar .fielBrandMark::before{content:""!important;display:block!important;width:43px!important;height:43px!important;background:#fff!important;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M3 4h2l2 11h10l2-8H6l.5 2H16l-1 4H8L6 2H3v2zm6 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'/%3E%3C/svg%3E") center/contain no-repeat!important}
html[data-solrak-sales201="1"] #fielFinishSale{flex:0 0 66px!important;width:calc(100% - 10px)!important;height:66px!important;min-height:66px!important;margin:0 5px 54px!important;border-radius:4px!important}
html[data-solrak-sales201="1"] #solrakSalesSumaV0201Workspace{grid-template-rows:62px minmax(0,1fr)!important}
html[data-solrak-sales201="1"] .s201Left{grid-template-rows:105px minmax(0,1fr)!important}
html[data-solrak-sales201="1"] .s201SearchCard{padding:17px 16px!important}
html[data-solrak-sales201="1"] #posSearch{height:42px!important}
html[data-solrak-sales201="1"] #solrakV0195SearchBtn{height:40px!important;min-height:40px!important}
html[data-solrak-sales201="1"] .s201CartCard .frPosCartHead{height:27px!important;min-height:27px!important}
html[data-solrak-sales201="1"] .s201CartCard{padding-bottom:305px!important}
html[data-solrak-sales201="1"] .s201CartCard .fielPosActions{bottom:140px!important;height:165px!important}
html[data-solrak-sales201="1"] .s201Right.summary{padding:77px 0 326px!important}
html[data-solrak-sales201="1"] .s201Right .frPreview{width:199px!important;height:256px!important;min-height:256px!important;margin:0 auto 10px!important}
html[data-solrak-sales201="1"] .s201Right .frPreview img:not([src]),
html[data-solrak-sales201="1"] .s201Right .frPreview img[src=""]{display:none!important}
html[data-solrak-sales201="1"] .s201Right .frTicketBar{max-height:190px!important}
html[data-solrak-sales201="1"] .s201Right .frPosTotals{left:0!important;right:12px!important;bottom:170px!important;height:156px!important;padding:16px 10px 10px!important}
html[data-solrak-sales201="1"] .s201Right .frPosGrand span{font-size:31px!important}
html[data-solrak-sales201="1"] .s201Right .frPosGrand strong{margin-top:25px!important;font-size:48px!important}
html[data-solrak-sales201="1"] #solrakV0195Footer{right:calc(var(--s201-right) + 55px)!important;bottom:70px!important;font-size:10px!important}
html[data-solrak-sales201="1"] #solrakSalesV0198StatusGlyph{right:calc(var(--s201-right) + 18px)!important;bottom:67px!important}
`;
      document.head.appendChild(style);
    }
    return Boolean(document.getElementById("solrakSalesSumaV0201Workspace"));
  }

  function boot() {
    mount();
    observer = new MutationObserver(() => {
      if (!document.getElementById(STYLE_ID)) mount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function destroy() {
    observer?.disconnect();
    document.getElementById(STYLE_ID)?.remove();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  window.SOLRAKSalesSumaV0201Tune = { version: VERSION, mount, destroy };
})();
