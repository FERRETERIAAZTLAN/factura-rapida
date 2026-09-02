(() => {
  "use strict";

  const VERSION = "0.1.83";
  const STYLE_ID = "solrakUiOperativaV0183Style";
  const THEME_KEY = "solrak:ui-theme:v0183";
  const SIDEBAR_KEY = "solrak:sidebar-collapsed:v0183";
  const FX_KEY = "solrak:fx-mxn-usd:v0183";
  const THEMES = {
    sky: { label: "Azul sky", accent: "#2588d8", accentDark: "#1765a5", soft: "#eaf5fd", surface: "#ffffff", text: "#273540" },
    graphite: { label: "Gris oscuro", accent: "#3f4a54", accentDark: "#242c33", soft: "#eef0f2", surface: "#ffffff", text: "#242b31" },
    magenta: { label: "Rosa intenso", accent: "#d72d79", accentDark: "#a91857", soft: "#fff0f7", surface: "#ffffff", text: "#342833" },
    purple: { label: "Morado", accent: "#7651c9", accentDark: "#52359d", soft: "#f3efff", surface: "#ffffff", text: "#302b3b" },
  };
  const byId = (id) => document.getElementById(id);
  const money = (value) => Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  let syncQueued = false;

  function pos() { return window.FacturaRapidaPOS || null; }
  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK", message);
  }
  function safeStoreGet(key, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
  function safeStoreSet(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{--solrak83-accent:#2588d8;--solrak83-accent-dark:#1765a5;--solrak83-soft:#eaf5fd;--solrak83-surface:#fff;--solrak83-text:#273540;--solrak83-side:236px;--solrak83-top:64px}
html[data-solrak-ui83="1"]{--fiel-orange:var(--solrak83-accent)!important;--fiel-orange-dark:var(--solrak83-accent-dark)!important;--fiel-side:var(--solrak83-side)!important}
html[data-solrak-ui83="1"] #solrakFielSidebar{width:var(--solrak83-side)!important;background:#f5f7f8!important;transition:width .16s ease}
html[data-solrak-ui83="1"] #solrakFielSidebar .fielBrand,html[data-solrak-ui83="1"] main.shell>.top{background:var(--solrak83-accent)!important;background-image:none!important}
html[data-solrak-ui83="1"] main.shell{margin-left:var(--solrak83-side)!important;transition:margin-left .16s ease}
html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"]{--solrak83-side:62px}
html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielBrandText,html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuItem>span:not(.fielBadge),html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuGroup>span,html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielChevron,html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielBadge{display:none!important}
html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuItem,html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuGroup{justify-content:center!important;padding:0!important;border-left-width:0!important}
html[data-solrak-ui83="1"][data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielSubmenu{display:none!important}
#solrakSidebarToggle{margin-left:auto;width:32px;height:32px;border:1px solid rgba(255,255,255,.45);border-radius:5px;background:rgba(255,255,255,.12);color:#fff;font-size:19px;line-height:1;cursor:pointer}
#solrakCoreSale{border-left-color:var(--solrak83-accent)!important;font-weight:800!important}
html[data-solrak-ui83="1"] #tab-pos{height:calc(100vh - var(--fiel-top))!important;display:grid!important;grid-template-rows:var(--solrak83-top) minmax(0,1fr) 56px!important;overflow:hidden!important;padding:0!important;background:#eef1f3!important}
html[data-solrak-ui83="1"] #tab-pos.hidden{display:none!important}
html[data-solrak-ui83="1"] #tab-pos>.frPosTop,html[data-solrak-ui83="1"] #tab-pos>.frTicketBar.solrakLegacyTicketBar{display:none!important}
#solrakPosCommandBar{min-width:0;height:var(--solrak83-top);display:grid;grid-template-columns:152px 58px minmax(240px,1fr) 154px 185px;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #cfd5da;background:var(--solrak83-surface);box-sizing:border-box;color:var(--solrak83-text)}
.solrakScaleStatus{height:46px;display:flex;flex-direction:column;justify-content:center;padding:0 10px;border:1px solid #d5dbe0;border-radius:5px;background:#f7f9fa}.solrakScaleStatus span{font-size:9px;text-transform:uppercase;color:#697580;font-weight:800}.solrakScaleStatus strong{font-size:14px;margin-top:2px}.solrakScaleStatus.connected strong{color:#16804b}
#solrakSelectedThumb{width:48px;height:48px;display:grid;place-items:center;border:1px solid #d7dce1;border-radius:5px;background:#fff;overflow:hidden;color:#8a949d;font-size:8px;text-align:center}#solrakSelectedThumb img{width:100%;height:100%;object-fit:contain}
.solrakTicketDock{min-width:0;height:50px;display:flex;align-items:stretch;gap:5px;overflow-x:auto}.solrakTicketDock #posTickets{display:flex!important;gap:5px!important;min-width:0}.solrakTicketDock .frTicket{min-width:104px!important;border-radius:4px!important;padding:5px 7px!important}.solrakTicketDock .frTicketNew{min-width:42px;border-radius:4px!important;padding:0 9px!important;font-size:0}.solrakTicketDock .frTicketNew::after{content:"+";font-size:22px}
.solrakThemeBox{display:grid;gap:3px}.solrakThemeBox label{font-size:9px;font-weight:800;text-transform:uppercase;color:#68747e}.solrakThemeBox select{height:29px;border:1px solid #cfd6dc;border-radius:4px;background:#fff;padding:0 7px;font:600 11px "Segoe UI",sans-serif}
.solrakTopTotal{text-align:right;border-left:1px solid #d7dce0;padding-left:10px}.solrakTopTotal span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;color:#68747e}.solrakTopTotal strong{display:block;font-size:32px;line-height:1.05;color:var(--solrak83-accent);font-variant-numeric:tabular-nums}
html[data-solrak-ui83="1"] #tab-pos>.frPosGrid{min-height:0!important;grid-template-columns:minmax(0,1fr) 244px!important;gap:1px!important;background:#d8dde1!important}
html[data-solrak-ui83="1"] #tab-pos>.frPosGrid>.stack{grid-template-rows:60px minmax(0,1fr)!important;background:#fff!important}
html[data-solrak-ui83="1"] #tab-pos>.frPosGrid>.stack>article:first-child{padding:7px 9px!important;background:#fff!important}
html[data-solrak-ui83="1"] #tab-pos .frPosSearch input{height:42px!important;padding:7px 12px!important;border-radius:4px!important;font-size:15px!important}
html[data-solrak-ui83="1"] #tab-pos .frPosResults{position:absolute;z-index:30;left:9px;right:9px;top:51px;max-height:310px;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,.18)}
html[data-solrak-ui83="1"] #tab-pos .frPosCartCard{border:0!important;border-radius:0!important;padding:6px 8px!important;box-shadow:none!important;overflow:hidden!important}
html[data-solrak-ui83="1"] #tab-pos .frPosCartCard>.card-head{min-height:31px!important;margin:0!important}html[data-solrak-ui83="1"] #tab-pos .frPosCartCard>label{display:flex!important;align-items:center!important;gap:8px!important;font-size:10px!important;margin-bottom:5px!important}html[data-solrak-ui83="1"] #tab-pos .frPosCartCard>label .field{height:29px!important;padding:3px 7px!important}
html[data-solrak-ui83="1"] #tab-pos .frPosCartHead,html[data-solrak-ui83="1"] #tab-pos .frPosLine{grid-template-columns:120px minmax(250px,1fr) 112px 112px 130px!important;gap:5px!important}html[data-solrak-ui83="1"] #tab-pos .frPosCartHead{font-size:9px!important;text-transform:uppercase;font-weight:900;color:#66737e;background:#f0f3f5;border:1px solid #dde2e6;border-bottom:0;padding:5px 7px!important}html[data-solrak-ui83="1"] #tab-pos .frPosCart{height:calc(100% - 68px)!important;max-height:none!important;border-radius:0!important}html[data-solrak-ui83="1"] #tab-pos .frPosLine{min-height:38px!important;padding:4px 7px!important;font-size:11px!important;cursor:default}html[data-solrak-ui83="1"] #tab-pos .frPosLine strong{font-size:11px!important}html[data-solrak-ui83="1"] #tab-pos .frPosQty input{height:24px!important}
html[data-solrak-ui83="1"] #tab-pos aside.summary{border:0!important;border-radius:0!important;box-shadow:none!important;padding:8px!important;background:#f9fafb!important}html[data-solrak-ui83="1"] #tab-pos aside.summary #posProductPreview{display:none!important}html[data-solrak-ui83="1"] #tab-pos aside.summary #posCharge{display:none!important}html[data-solrak-ui83="1"] #tab-pos aside.summary .frPosGrand{font-size:17px!important}html[data-solrak-ui83="1"] #tab-pos aside.summary #posTotal{font-size:22px!important;color:var(--solrak83-accent)!important}
#solrakPosActionBar{height:56px;display:grid;grid-template-columns:minmax(180px,1.4fr) repeat(5,minmax(105px,1fr));gap:1px;background:#c9ced2;border-top:1px solid #c2c8cd}#solrakPosActionBar button{border:0;border-radius:0;background:#f7f8f9;color:#34404a;font:800 10px/1.15 "Segoe UI",sans-serif;text-transform:uppercase;cursor:pointer}#solrakPosActionBar button:hover:not(:disabled){background:var(--solrak83-soft);color:var(--solrak83-accent-dark)}#solrakPosActionBar .primaryAction{background:var(--solrak83-accent)!important;color:#fff!important;font-size:13px!important}#solrakPosActionBar button:disabled{opacity:.48;cursor:not-allowed}
#solrakLineEditDialog,#solrakFxDialog{border:0;border-radius:7px;padding:0;width:min(520px,calc(100% - 24px));box-shadow:0 20px 70px rgba(0,0,0,.28)}#solrakLineEditDialog::backdrop,#solrakFxDialog::backdrop{background:rgba(20,25,30,.58)}.solrak83DialogHead{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:var(--solrak83-accent);color:#fff}.solrak83DialogHead button{border:0;background:transparent;color:#fff;font-size:22px}.solrak83DialogBody{padding:14px}.solrak83Grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.solrak83Grid label{font-size:10px;font-weight:800;color:#56636e}.solrak83Grid input{display:block;width:100%;box-sizing:border-box;margin-top:4px;height:38px;border:1px solid #cfd6dc;border-radius:4px;padding:6px 8px;font-size:17px}.solrak83DialogActions{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}.solrak83DialogActions button{min-height:34px;border:1px solid #ccd3d9;border-radius:4px;background:#fff;padding:0 13px;font-weight:800}.solrak83DialogActions .save{background:var(--solrak83-accent);border-color:var(--solrak83-accent);color:#fff}
@media(max-width:1050px){#solrakPosCommandBar{grid-template-columns:130px 52px minmax(180px,1fr) 120px 160px}html[data-solrak-ui83="1"] #tab-pos>.frPosGrid{grid-template-columns:minmax(0,1fr) 220px!important}#solrakPosActionBar{grid-template-columns:1.25fr repeat(5,1fr)}}
`;
    document.head.appendChild(style);
  }

  function applyTheme(name) {
    const key = THEMES[name] ? name : "sky";
    const theme = THEMES[key];
    const root = document.documentElement;
    root.dataset.solrakUiTheme = key;
    root.style.setProperty("--solrak83-accent", theme.accent);
    root.style.setProperty("--solrak83-accent-dark", theme.accentDark);
    root.style.setProperty("--solrak83-soft", theme.soft);
    root.style.setProperty("--solrak83-surface", theme.surface);
    root.style.setProperty("--solrak83-text", theme.text);
    safeStoreSet(THEME_KEY, key);
    const select = byId("solrakThemeSelect");
    if (select && select.value !== key) select.value = key;
  }

  function toggleSidebar(force) {
    const root = document.documentElement;
    const current = root.dataset.solrakSidebarCollapsed === "1";
    const next = typeof force === "boolean" ? force : !current;
    root.dataset.solrakSidebarCollapsed = next ? "1" : "0";
    safeStoreSet(SIDEBAR_KEY, next ? "1" : "0");
    const button = byId("solrakSidebarToggle");
    if (button) button.title = next ? "Expandir menú" : "Contraer menú";
  }

  function ensureSidebar() {
    const sidebar = byId("solrakFielSidebar");
    if (!sidebar) return false;
    const brand = sidebar.querySelector(".fielBrand");
    if (brand && !byId("solrakSidebarToggle")) {
      const button = document.createElement("button");
      button.id = "solrakSidebarToggle";
      button.type = "button";
      button.textContent = "☰";
      button.setAttribute("aria-label", "Contraer o expandir menú");
      button.onclick = () => toggleSidebar();
      brand.appendChild(button);
    }
    const menu = sidebar.querySelector(".fielMenu");
    if (menu && !byId("solrakCoreSale")) {
      const button = document.createElement("button");
      button.id = "solrakCoreSale";
      button.type = "button";
      button.className = "fielMenuItem";
      button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4zM7 9h10M7 13h6"/></svg><span>Venta</span>';
      button.onclick = () => {
        if (typeof window.switchTab === "function") window.switchTab("pos");
        else document.querySelector('[data-tab="pos"]')?.click();
        setTimeout(() => byId("posSearch")?.focus(), 20);
      };
      menu.prepend(button);
    }
    return true;
  }

  function scaleText(detail) {
    const value = Number(detail?.weight ?? window.SOLRAKScale?.weight);
    const unit = String(detail?.unit ?? window.SOLRAKScale?.unit ?? "kg");
    return Number.isFinite(value) ? { text: `${value.toFixed(3)} ${unit}`, connected: true } : { text: "Desconectada", connected: false };
  }
  function renderScale(detail) {
    const box = byId("solrakScaleStatus");
    if (!box) return;
    const status = scaleText(detail);
    const strong = box.querySelector("strong");
    if (strong && strong.textContent !== status.text) strong.textContent = status.text;
    box.classList.toggle("connected", status.connected);
  }

  function syncTotal() {
    const source = byId("posTotal");
    const target = byId("solrakTopTotalValue");
    if (source && target && target.textContent !== source.textContent) target.textContent = source.textContent || "$0.00";
  }
  function syncThumb() {
    const source = byId("posProductPreview");
    const target = byId("solrakSelectedThumb");
    if (!source || !target) return;
    const img = source.querySelector("img");
    const name = source.querySelector(".frPreviewMeta strong")?.textContent?.trim() || "Producto";
    const signature = img?.src ? `img:${img.src}` : `empty:${name}`;
    if (target.dataset.signature === signature) return;
    target.dataset.signature = signature;
    target.innerHTML = img?.src ? `<img src="${img.src}" alt="${name.replace(/"/g, "&quot;")}">` : `<span>${name === "Producto" ? "SIN FOTO" : name.slice(0, 18)}</span>`;
  }

  function ensureCommandBar() {
    const tab = byId("tab-pos");
    if (!tab) return false;
    let bar = byId("solrakPosCommandBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "solrakPosCommandBar";
      bar.innerHTML = `<div id="solrakScaleStatus" class="solrakScaleStatus"><span>Báscula</span><strong>Desconectada</strong></div><div id="solrakSelectedThumb"><span>SIN FOTO</span></div><div class="solrakTicketDock" id="solrakTicketDock"></div><div class="solrakThemeBox"><label for="solrakThemeSelect">Tema</label><select id="solrakThemeSelect">${Object.entries(THEMES).map(([key, theme]) => `<option value="${key}">${theme.label}</option>`).join("")}</select></div><div class="solrakTopTotal"><span>Total venta</span><strong id="solrakTopTotalValue">$0.00</strong></div>`;
      const top = tab.querySelector(":scope>.frPosTop");
      top?.insertAdjacentElement("afterend", bar);
      byId("solrakThemeSelect").onchange = (event) => applyTheme(event.target.value);
    }
    const dock = byId("solrakTicketDock");
    const tickets = byId("posTickets");
    const add = byId("posNewTicket");
    const legacy = tickets?.closest(".frTicketBar");
    if (legacy) legacy.classList.add("solrakLegacyTicketBar");
    if (dock && tickets && tickets.parentElement !== dock) dock.appendChild(tickets);
    if (dock && add && add.parentElement !== dock) dock.appendChild(add);
    syncTotal();
    syncThumb();
    renderScale();
    return true;
  }

  function clickExisting(selector) {
    const target = document.querySelector(selector);
    if (!target) return false;
    target.click();
    return true;
  }

  function ensureFxDialog() {
    if (byId("solrakFxDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "solrakFxDialog";
    dialog.innerHTML = `<div class="solrak83DialogHead"><strong>Tipo de cambio · referencia</strong><button type="button" data-close>×</button></div><div class="solrak83DialogBody"><p style="font-size:11px;color:#66737e;margin-top:0">La venta se registra en MXN. Esta herramienta calcula una referencia en USD sin alterar el cobro ni la contabilidad.</p><div class="solrak83Grid"><label>MXN por USD<input id="solrakFxRate" type="number" min="0.01" step="0.01"></label><label>Total aproximado USD<input id="solrakFxUsd" readonly></label></div><div class="solrak83DialogActions"><button type="button" data-close>Cerrar</button><button id="solrakFxSave" type="button" class="save">Guardar referencia</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => dialog.close?.());
    const recalc = () => {
      const rate = Number(byId("solrakFxRate")?.value) || 0;
      const total = Number(String(byId("posTotal")?.textContent || "0").replace(/[^0-9.-]/g, "")) || 0;
      if (byId("solrakFxUsd")) byId("solrakFxUsd").value = rate > 0 ? (total / rate).toFixed(2) : "0.00";
    };
    byId("solrakFxRate").oninput = recalc;
    byId("solrakFxSave").onclick = () => { const rate = Number(byId("solrakFxRate").value); if (!(rate > 0)) return notify("Escribe un tipo de cambio válido.", true); safeStoreSet(FX_KEY, rate.toFixed(4)); recalc(); notify("Tipo de cambio de referencia guardado."); };
  }
  function openFx() {
    ensureFxDialog();
    byId("solrakFxRate").value = safeStoreGet(FX_KEY, "18.00");
    byId("solrakFxRate").dispatchEvent(new Event("input", { bubbles: true }));
    byId("solrakFxDialog").showModal?.();
  }

  function ensureActionBar() {
    const tab = byId("tab-pos");
    if (!tab || byId("solrakPosActionBar")) return Boolean(tab);
    const bar = document.createElement("div");
    bar.id = "solrakPosActionBar";
    bar.innerHTML = `<button id="solrakFinishSale" class="primaryAction" type="button">Finalizar venta</button><button id="solrakServices" type="button">Recargas / Servicios</button><button id="solrakFx" type="button">Tipo de cambio</button><button id="solrakGlobalDiscount" data-fiel-pos-tool="discount" type="button">Descuento global</button><button id="solrakClearTicket" type="button">Vaciar ticket</button><button id="solrakDraftQuote" type="button">Cotización / borrador</button>`;
    tab.appendChild(bar);
    byId("solrakFinishSale").onclick = () => {
      if (!clickExisting("#fielFinishSale")) pos()?.openPayment?.();
    };
    const services = byId("solrakServices");
    const servicesApi = window.SOLRAKServices;
    if (typeof servicesApi?.open === "function") services.onclick = () => servicesApi.open();
    else { services.disabled = true; services.title = "Requiere configurar un proveedor externo de recargas y servicios."; }
    byId("solrakFx").onclick = openFx;
    byId("solrakGlobalDiscount").onclick = () => {
      const existing = [...document.querySelectorAll('[data-fiel-pos-tool="discount"]')].find((el) => el.id !== "solrakGlobalDiscount");
      if (existing) existing.click(); else notify("No hay descuentos configurados para esta venta.", true);
    };
    byId("solrakClearTicket").onclick = () => clickExisting("#posClear");
    byId("solrakDraftQuote").onclick = () => {
      const quote = document.querySelector('[data-tab-target="cotizaciones"]');
      if (quote) quote.click(); else if (typeof window.switchTab === "function") window.switchTab("cotizaciones");
    };
    return true;
  }

  function ensureLineDialog() {
    if (byId("solrakLineEditDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "solrakLineEditDialog";
    dialog.innerHTML = `<div class="solrak83DialogHead"><strong id="solrakLineTitle">Editar concepto</strong><button type="button" data-close>×</button></div><div class="solrak83DialogBody"><div class="solrak83Grid"><label>Cantidad<input id="solrakLineQty" type="number" min="0.001" step="0.001"></label><label>Precio actual<input id="solrakLinePrice" readonly></label></div><div class="solrak83DialogActions"><button id="solrakLineDiscount" type="button">Descuento del producto</button><button type="button" data-close>Cancelar</button><button id="solrakLineSave" class="save" type="button">Aplicar cantidad</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => dialog.close?.());
    byId("solrakLineSave").onclick = () => {
      const id = dialog.dataset.lineId;
      const qty = Number(byId("solrakLineQty").value);
      const input = id ? document.querySelector(`[data-pos-qty="${CSS.escape(id)}"]`) : null;
      if (!input || !(qty > 0)) return notify("Escribe una cantidad válida.", true);
      input.value = String(qty);
      input.dispatchEvent(new Event("change", { bubbles: true }));
      dialog.close?.();
    };
    byId("solrakLineDiscount").onclick = () => {
      dialog.close?.();
      const existing = [...document.querySelectorAll('[data-fiel-pos-tool="discount"]')].find((el) => el.id !== "solrakGlobalDiscount");
      if (existing) existing.click(); else notify("No hay descuentos/promociones configurados para este producto.", true);
    };
  }

  function bindLineDoubleClick() {
    const cart = byId("posCart");
    if (!cart || cart.dataset.solrakUi83Dbl === "1") return;
    cart.dataset.solrakUi83Dbl = "1";
    cart.addEventListener("dblclick", (event) => {
      const row = event.target.closest?.("[data-pos-line]");
      if (!row) return;
      const id = row.dataset.posLine;
      const line = (pos()?.cart || []).find((item) => String(item.id) === String(id));
      if (!line) return;
      ensureLineDialog();
      const dialog = byId("solrakLineEditDialog");
      dialog.dataset.lineId = id;
      byId("solrakLineTitle").textContent = line.name || "Editar concepto";
      byId("solrakLineQty").value = Number(line.qty || 1);
      byId("solrakLinePrice").value = money(line.price || 0);
      const discount = byId("solrakLineDiscount");
      const allowed = document.documentElement.dataset.solrakCanDiscount !== "0";
      discount.disabled = !allowed;
      discount.title = allowed ? "" : "Este usuario no tiene permiso para aplicar descuentos.";
      dialog.showModal?.();
    });
  }

  function sync() {
    ensureStyle();
    document.documentElement.dataset.solrakUi83 = "1";
    ensureSidebar();
    ensureCommandBar();
    ensureActionBar();
    bindLineDoubleClick();
    applyTheme(safeStoreGet(THEME_KEY, document.documentElement.dataset.solrakUiTheme || "sky"));
    syncTotal();
    syncThumb();
  }
  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    setTimeout(() => { syncQueued = false; sync(); }, 15);
  }
  function boot() {
    ensureStyle();
    document.documentElement.dataset.solrakUi83 = "1";
    toggleSidebar(safeStoreGet(SIDEBAR_KEY, "0") === "1");
    sync();
    new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("solrak:pos-sale-complete", scheduleSync);
    document.addEventListener("solrak:permissions-updated", scheduleSync);
    document.addEventListener("solrak:scale-weight", (event) => renderScale(event.detail));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKUiOperativaV0183 = { version: VERSION, themes: THEMES, applyTheme, toggleSidebar, sync, openFx };
})();