(() => {
  "use strict";

  const VERSION = "0.1.70";
  const STYLE_ID = "solrakRedesignV0170Style";
  const byId = (id) => document.getElementById(id);
  let navObserver = null;
  let mountTimer = null;

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{
  --solrak-simple-accent:#e97618!important;
  --solrak-simple-accent-dark:#b8520d!important;
  --solrak-pos-blue:#e97618!important;
  --solrak-pos-blue-dark:#b8520d!important;
}
html[data-solrak-redesign="1"][data-solrak-desktop-polish="1"]{--solrak-blue:#e97618!important}

html[data-solrak-redesign="1"][data-solrak-simple-ui="1"] .nav>button.active,
html[data-solrak-redesign="1"][data-solrak-simple-ui="1"] .nav>button[aria-current="page"]{
  background:#fff1e6!important;
  color:#9f4109!important;
  box-shadow:inset 3px 0 0 var(--solrak-simple-accent)!important;
}
html[data-solrak-redesign="1"][data-solrak-simple-ui="1"] .nav>button.active .solrakNavIcon,
html[data-solrak-redesign="1"][data-solrak-simple-ui="1"] .nav>button[aria-current="page"] .solrakNavIcon{
  color:var(--solrak-simple-accent)!important;
}
html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frTicket.active{
  border-color:var(--solrak-simple-accent)!important;
  background:#fff1e6!important;
  color:#9f4109!important;
}

@media(min-width:1050px){
  html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPosGrid{
    align-items:start!important;
  }
  html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos aside.summary{
    position:sticky!important;
    top:calc(var(--solrak-simple-top,56px) + 10px)!important;
    max-height:calc(100vh - var(--solrak-native-top,0px) - var(--solrak-simple-top,56px) - 20px)!important;
    overflow:hidden!important;
  }
  html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos aside.summary #posProductPreview{
    flex:0 0 auto!important;
  }
  html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos aside.summary #posReceipt{
    min-height:0!important;
    overflow-y:auto!important;
  }
  html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos #posCharge{
    flex:0 0 auto!important;
  }
  html[data-solrak-redesign="1"][data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPosSearch input{
    font-weight:600!important;
  }
}
`;
    document.head.appendChild(style);
  }

  function fixInvoiceLabel() {
    const button = document.querySelector('.nav>button[data-tab="factura"]');
    if (!button) return;
    let label = button.querySelector(".solrakNavText");
    if (!label) {
      [...button.childNodes]
        .filter((node) => node.nodeType === 3)
        .forEach((node) => node.remove());
      label = document.createElement("span");
      label.className = "solrakNavText";
      const count = button.querySelector(".count");
      button.insertBefore(label, count || null);
    }
    if (label.textContent !== "Facturación")
      label.textContent = "Facturación";
    button.dataset.solrakLabelFixed = "1";
  }

  function fixFooterVersion() {
    const footer = byId("solrakNavFooter");
    const version = footer?.querySelector("span");
    if (!version) return;
    const expected = `Escritorio SOLRAK · v${VERSION}`;
    if (version.textContent !== expected) version.textContent = expected;
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset.solrakRedesign = "1";
    fixInvoiceLabel();
    fixFooterVersion();
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 20);
  }

  function resetNavigationScroll() {
    const scroller = document.scrollingElement || document.documentElement;
    if (scroller) scroller.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const nav = document.querySelector(".nav");
    if (nav) nav.scrollTop = 0;
  }

  function onNavigationClick(event) {
    if (!event.target?.closest?.('.nav>button[data-tab]')) return;
    setTimeout(resetNavigationScroll, 0);
  }

  function observeNavigation() {
    const nav = document.querySelector(".nav");
    if (!nav || navObserver) return;
    navObserver = new MutationObserver(scheduleMount);
    navObserver.observe(nav, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function boot() {
    mount();
    observeNavigation();
    document.addEventListener("click", onNavigationClick, true);
    setTimeout(mount, 250);
    setTimeout(mount, 1100);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKRedesignV0170 = { version: VERSION, mount };
})();
