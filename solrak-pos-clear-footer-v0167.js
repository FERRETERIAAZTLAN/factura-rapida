(() => {
  "use strict";

  const VERSION = "0.1.67";
  const STYLE_ID = "solrakPOSClearFooterV0167Style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-professional-pos="1"] #frBrandPill{
  display:none!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
@media(min-width:1050px){
  html[data-solrak-professional-pos="1"] #tab-pos aside.summary{
    padding-bottom:max(12px,env(safe-area-inset-bottom))!important;
  }
  html[data-solrak-professional-pos="1"] #tab-pos #posCharge{
    position:relative;
    z-index:1;
  }
}
`;
    document.head.appendChild(style);
  }

  function mount() {
    injectStyle();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();

  window.SOLRAKPOSClearFooterV0167 = { version: VERSION, mount };
})();
