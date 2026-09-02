(() => {
  "use strict";

  const VERSION = "0.1.83";
  const STYLE_ID = "solrakDesktopDensityV0183Style";
  const MAX_TICKETS = 8;
  const THEMES = Object.freeze({
    sky: { label: "Azul sky", accent: "#2387d9", strong: "#1768ad", soft: "#eaf4fd" },
    graphite: { label: "Gris oscuro", accent: "#46515c", strong: "#303842", soft: "#eef0f2" },
    pink: { label: "Rosa intenso", accent: "#d32675", strong: "#a91a5b", soft: "#fdeaf3" },
    purple: { label: "Morado", accent: "#7651c8", strong: "#5d3da7", soft: "#f0ebfb" },
  });
  const byId = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let syncTimer = null;
  let observersInstalled = false;

  function pos() { return window.FacturaRapidaPOS || null; }
  function notify(message, error = false) {
    try { if (typeof window.notice === "function") return window.notice(message, error); } catch {}
    if (error) window.alert?.(message);
  }
  function currentSession() {
    try { return session || window.session || null; } catch { return window.session || null; }
  }
  function identity() {
    const s = currentSession();
    return `${s?.business?.code || s?.business?.id || "business"}:${s?.user?.id || s?.user?.username || "user"}`;
  }
  function themeKey() { return `solrak:desktop-theme:v0183:${identity()}`; }
  function sideKey() { return `solrak:sidebar:v0183:${identity()}`; }
  function money(value) {
    try { if (typeof window.money === "function") return window.money(value); } catch {}
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{--solrak-accent:#2387d9;--solrak-accent-strong:#1768ad;--solrak-accent-soft:#eaf4fd;--solrak-side-expanded:246px;--solrak-side-collapsed:62px;--solrak-side-current:var(--solrak-side-expanded);--solrak-ops-height:76px;--solrak-action-height:52px;--fiel-orange:var(--solrak-accent)!important;--fiel-orange-dark:var(--solrak-accent-strong)!important}
html[data-solrak-sidebar-collapsed="1"]{--solrak-side-current:var(--solrak-side-collapsed);--fiel-side:var(--solrak-side-collapsed)!important}
html[data-solrak-sidebar-collapsed="0"]{--solrak-side-current:var(--solrak-side-expanded);--fiel-side:var(--solrak-side-expanded)!important}
#solrakFielSidebar{width:var(--solrak-side-current)!important;transition:width .16s ease!important;overflow:hidden!important}
html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielBrandText,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuItem>span,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuGroup>span,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielBadge,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielChevron,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielFinish{display:none!important}
html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielBrand{padding:7px 8px!important;justify-content:center!important}
html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielBrandMark{display:none!important}
html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuItem,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuGroup{width:62px!important;min-width:62px!important;padding:0!important;justify-content:center!important;border-left-width:0!important}
html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuItem>svg,html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielMenuGroup>svg{width:21px!important;height:21px!important;flex-basis:21px!important}
html[data-solrak-sidebar-collapsed="1"] #solrakFielSidebar .fielSubmenu{display:none!important}
.solrakHamburger{margin-left:auto;width:36px;height:36px;border:0;border-radius:5px;background:rgba(255,255,255,.13);color:#fff;display:grid;place-items:center;font-size:20px;line-height:1;cursor:pointer}.solrakHamburger:hover{background:rgba(255,255,255,.22)}
html[data-solrak-sidebar-collapsed="1"] .solrakHamburger{margin:0!important;width:38px;height:38px}
html[data-solrak-fiel="1"] main.shell{margin-left:var(--solrak-side-current)!important;transition:margin-left .16s ease!important}
#solrakFielSidebar .fielBrand,html[data-solrak-fiel="1"] main.shell>.top,.fielDialogHead,.fielConfigTabs{background:linear-gradient(90deg,var(--solrak-accent-strong),var(--solrak-accent))!important}
#solrakFielSidebar .fielMenuItem.active{border-left-color:var(--solrak-accent)!important;background:var(--solrak-accent-soft)!important}.fielField{border-bottom-color:var(--solrak-accent)!important}.fielSearchIcon,.fielBtn.orange{background:var(--solrak-accent)!important;border-color:var(--solrak-accent)!important}.fielFinish,.fielBtn.primary{background:var(--solrak-accent)!important;border-color:var(--solrak-accent)!important}.fielColor.active{border-color:var(--solrak-accent-strong)!important}
html[data-solrak-fiel="1"][data-solrak-professional-pos="1"] #tab-pos{height:calc(100vh - var(--fiel-top))!important;display:grid!important;grid-template-rows:var(--solrak-ops-height) minmax(0,1fr) var(--solrak-action-height)!important;padding:0!important;overflow:hidden!important;background:#f3f5f7!important}
html[data-solrak-fiel="1"] #tab-pos>.frPosTop{display:none!important}
#solrakOpsBar{grid-row:1;display:grid;grid-template-columns:150px 62px minmax(310px,1fr) 205px 42px;gap:8px;align-items:center;height:var(--solrak-ops-height);padding:8px 10px;border-bottom:1px solid #d7dde2;background:#fff;box-sizing:border-box;min-width:0}
.solrakOpsMetric{height:58px;display:flex;align-items:center;gap:9px;padding:7px 10px;border:1px solid #dfe4e8;background:#fafbfc;box-sizing:border-box;min-width:0}.solrakOpsMetric .solrakOpsIcon{font-size:18px;color:var(--solrak-accent)}.solrakOpsMetric span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#74808a}.solrakOpsMetric strong{display:block;margin-top:2px;font-size:18px;color:#27313a;white-space:nowrap}.solrakScaleMeta{font-size:8px!important;text-transform:none!important;letter-spacing:0!important}
#solrakSelectedThumb{width:58px;height:58px;border:1px solid #dfe4e8;background:#fff;display:grid;place-items:center;overflow:hidden}#solrakSelectedThumb img{width:100%;height:100%;object-fit:contain}.solrakThumbEmpty{font-size:8px;color:#89949d;text-align:center;line-height:1.2;padding:4px}
#solrakTicketSlot{min-width:0;height:58px;overflow:hidden}#solrakTicketSlot .frTicketBar{display:flex!important;align-items:stretch!important;gap:5px!important;height:58px!important;margin:0!important;padding:0!important;overflow-x:auto!important;overflow-y:hidden!important;max-height:none!important;scrollbar-width:thin}#solrakTicketSlot #posTickets{display:flex!important;flex-direction:row!important;gap:5px!important;min-width:max-content!important}#solrakTicketSlot .frTicket{width:122px!important;min-width:122px!important;min-height:54px!important;height:54px!important;border-radius:4px!important;padding:6px 7px!important}#solrakTicketSlot .frTicket.active{border-color:var(--solrak-accent)!important;background:var(--solrak-accent-soft)!important;color:var(--solrak-accent-strong)!important;box-shadow:inset 0 -3px 0 var(--solrak-accent)!important}#solrakTicketSlot .frTicketNew{min-width:98px!important;width:98px!important;min-height:54px!important;height:54px!important;margin:0!important;border-radius:4px!important}
.solrakTopTotal{height:58px;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:5px 12px;background:#232a31;color:#fff;box-sizing:border-box}.solrakTopTotal span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;opacity:.75}.solrakTopTotal strong{font-size:31px;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap}
#solrakThemeButton{width:42px;height:58px;border:1px solid #dfe4e8;background:#fff;color:var(--solrak-accent);font-size:18px;cursor:pointer}
html[data-solrak-fiel="1"] #tab-pos>.frPosGrid{grid-row:2;height:100%!important;min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:0!important;background:#fff!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack{height:100%!important;display:grid!important;grid-template-rows:52px minmax(0,1fr)!important;gap:0!important;min-height:0!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:first-child{position:relative!important;height:52px!important;min-height:52px!important;padding:7px 10px!important;overflow:visible!important;border-bottom:1px solid #dfe4e8!important;z-index:12!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:first-child .frPosSearch{height:38px!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:first-child #posSearch{height:38px!important;font-size:15px!important;padding:6px 12px!important}html[data-solrak-fiel="1"] #tab-pos #posResults{display:none!important;position:absolute!important;left:10px!important;right:10px!important;top:48px!important;z-index:50!important;max-height:340px!important;padding:6px!important;border:1px solid #cad2d9!important;background:#fff!important;box-shadow:0 14px 38px rgba(25,32,40,.2)!important}html[data-solrak-fiel="1"] #tab-pos.solrak-searching #posResults{display:grid!important}html[data-solrak-fiel="1"] #tab-pos>.frPosGrid>.stack>article:nth-child(3){display:none!important}
html[data-solrak-fiel="1"] #tab-pos .frPosCartCard{height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartCard>label{height:38px!important;min-height:38px!important;margin:0!important;padding:3px 10px!important;display:grid!important;grid-template-columns:135px minmax(0,460px)!important;align-items:center!important;gap:8px!important;border-bottom:1px solid #e0e4e7!important;font-size:10px!important;background:#fafbfc!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartCard>label select{height:30px!important;padding:3px 7px!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartHead,html[data-solrak-fiel="1"] #tab-pos .frPosLine{grid-template-columns:92px minmax(220px,1fr) 116px 112px 124px!important;gap:7px!important}html[data-solrak-fiel="1"] #tab-pos .frPosCartHead{min-height:29px!important;padding:6px 9px!important;background:#e7ebee!important;color:#4b5660!important;font-size:10px!important;text-transform:uppercase!important;font-weight:800!important}html[data-solrak-fiel="1"] #tab-pos .frPosCart{flex:1!important;min-height:0!important;max-height:none!important;overflow:auto!important;border:0!important;border-radius:0!important}html[data-solrak-fiel="1"] #tab-pos .frPosLine{min-height:43px!important;padding:5px 9px!important;border-bottom:1px solid #edf0f2!important;font-size:11px!important}html[data-solrak-fiel="1"] #tab-pos .frPosLine:hover{background:var(--solrak-accent-soft)!important}html[data-solrak-fiel="1"] #tab-pos .frPosLine strong{font-size:11px!important}html[data-solrak-fiel="1"] #tab-pos .frPosQty{height:28px!important;border-radius:3px!important}html[data-solrak-fiel="1"] #tab-pos .frPosQty button{width:27px!important}html[data-solrak-fiel="1"] #tab-pos .frPosQty input{width:54px!important;height:28px!important;padding:2px!important}html[data-solrak-fiel="1"] #tab-pos aside.summary{display:none!important}
#solrakActionBar{grid-row:3;height:var(--solrak-action-height);display:grid;grid-template-columns:1.4fr repeat(5,minmax(105px,1fr));gap:1px;background:#cfd5da;border-top:1px solid #cbd2d7}.solrakAction{border:0;background:#fff;color:#3f4a53;font:700 10px/1.15 "Segoe UI Variable","Segoe UI",Arial,sans-serif;text-transform:uppercase;letter-spacing:.02em;cursor:pointer;padding:6px 8px}.solrakAction:hover:not(:disabled){background:var(--solrak-accent-soft);color:var(--solrak-accent-strong)}.solrakAction.primary{background:var(--solrak-accent)!important;color:#fff!important;font-size:12px!important}.solrakAction.danger{color:#a83e3e}.solrakAction:disabled{opacity:.42;cursor:not-allowed;background:#f1f2f3}.solrakAction small{display:block;margin-top:2px;font-size:8px;font-weight:500;text-transform:none;letter-spacing:0}
#solrakLineEditor,#solrakThemeDialog{border:0!important;border-radius:5px!important;padding:0!important;box-shadow:0 24px 70px rgba(0,0,0,.3)!important;background:#fff!important}#solrakLineEditor{width:min(520px,calc(100vw - 32px))}#solrakThemeDialog{width:min(430px,calc(100vw - 32px))}#solrakLineEditor::backdrop,#solrakThemeDialog::backdrop{background:rgba(20,25,30,.55)}.solrakQuickHead{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:var(--solrak-accent);color:#fff;font-weight:800;font-size:12px}.solrakQuickHead button{width:32px;height:32px;border:0;background:transparent;color:#fff;font-size:20px}.solrakQuickBody{padding:14px 16px}.solrakQuickGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.solrakQuickGrid label{display:grid;gap:5px;font-size:10px;font-weight:700;color:#52606b}.solrakQuickGrid input,.solrakQuickGrid select{height:42px;padding:6px 9px;border:1px solid #ccd4da;background:#fff;font-size:17px;font-variant-numeric:tabular-nums}.solrakQuickGrid .wide{grid-column:1/-1}.solrakQuickHelp{margin-top:7px;font-size:9px;line-height:1.4;color:#74818b}.solrakQuickFoot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}.solrakQuickFoot button{height:36px;padding:0 14px;border:1px solid #cfd6dc;background:#fff;font-weight:800}.solrakQuickFoot button.primary{border-color:var(--solrak-accent);background:var(--solrak-accent);color:#fff}
.solrakThemeOptions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.solrakThemeOption{height:48px;display:flex;align-items:center;gap:9px;padding:7px 9px;border:1px solid #d9dfe4;background:#fff;text-align:left;font-weight:800}.solrakThemeSwatch{width:25px;height:25px;border-radius:4px;background:var(--swatch)}.solrakThemeOption.active{border-color:var(--solrak-accent);box-shadow:inset 3px 0 0 var(--solrak-accent)}.solrakCustomTheme{display:grid;grid-template-columns:1fr 58px;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #e2e6e9}.solrakCustomTheme input[type=color]{width:58px;height:38px;padding:2px;border:1px solid #ccd4da;background:#fff}
.fielFormGrid input[type=number],.fielFormGrid input[inputmode=decimal],.frSupplierForm input[type=number],#tab-inventario input[type=number],#tab-clientes input[type=number]{min-height:40px!important;font-size:15px!important;font-variant-numeric:tabular-nums!important}.fielToggle input[type=checkbox],#tab-inventario input[type=checkbox],#tab-clientes input[type=checkbox]{accent-color:var(--solrak-accent)!important}
#posCutDialog .frCutGrid,.fielCutGrid{background:#fff;border:1px solid #dfe4e8;padding:10px 14px}.frCutRow{min-height:31px;align-items:center!important}.frCutRow strong{font-variant-numeric:tabular-nums}.frCutRow:nth-last-child(-n+3){font-size:13px;background:#fafbfc}
@media(max-width:1050px){#solrakOpsBar{grid-template-columns:125px 54px minmax(260px,1fr) 170px 38px}.solrakTopTotal strong{font-size:26px}#solrakActionBar{grid-template-columns:1.25fr repeat(5,minmax(90px,1fr))}.solrakAction{font-size:9px}}
`;
    document.head.appendChild(style);
  }

  function setCollapsed(collapsed) {
    document.documentElement.dataset.solrakSidebarCollapsed = collapsed ? "1" : "0";
    try { localStorage.setItem(sideKey(), collapsed ? "1" : "0"); } catch {}
    byId("solrakSidebarToggle")?.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function ensureSidebar() {
    const sidebar = byId("solrakFielSidebar");
    if (!sidebar) return false;
    if (!byId("solrakSidebarToggle")) {
      const button = document.createElement("button");
      button.id = "solrakSidebarToggle";
      button.className = "solrakHamburger";
      button.type = "button";
      button.title = "Contraer / expandir menú";
      button.setAttribute("aria-label", "Contraer o expandir menú lateral");
      button.innerHTML = "☰";
      button.onclick = () => setCollapsed(document.documentElement.dataset.solrakSidebarCollapsed !== "1");
      sidebar.querySelector(".fielBrand")?.appendChild(button);
    }
    if (!document.documentElement.dataset.solrakSidebarCollapsed) {
      let saved = "0";
      try { saved = localStorage.getItem(sideKey()) || "0"; } catch {}
      setCollapsed(saved === "1");
    }
    if (!sidebar.dataset.solrakDensityBound) {
      sidebar.dataset.solrakDensityBound = "1";
      sidebar.addEventListener("click", (event) => {
        if (document.documentElement.dataset.solrakSidebarCollapsed !== "1") return;
        if (event.target.closest("[data-fiel-group]")) setCollapsed(false);
      }, true);
    }
    return true;
  }

  function themeState() {
    try {
      const raw = localStorage.getItem(themeKey());
      if (raw) return JSON.parse(raw);
    } catch {}
    return { name: "sky", custom: "#2387d9" };
  }
  function colorText(hex) {
    const clean = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(clean)) return "#2387d9";
    return `#${clean.toLowerCase()}`;
  }
  function darken(hex, factor = 0.78) {
    const clean = colorText(hex).slice(1);
    const parts = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(i, i + 2), 16) * factor))));
    return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  function soften(hex) {
    const clean = colorText(hex).slice(1);
    const rgb = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
    const parts = rgb.map((n) => Math.round(n + (255 - n) * 0.9));
    return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  function applyTheme(name, custom) {
    const preset = THEMES[name];
    const accent = preset?.accent || colorText(custom || "#2387d9");
    const strong = preset?.strong || darken(accent);
    const soft = preset?.soft || soften(accent);
    document.documentElement.style.setProperty("--solrak-accent", accent);
    document.documentElement.style.setProperty("--solrak-accent-strong", strong);
    document.documentElement.style.setProperty("--solrak-accent-soft", soft);
    document.documentElement.dataset.solrakTheme = preset ? name : "custom";
    try { localStorage.setItem(themeKey(), JSON.stringify({ name: preset ? name : "custom", custom: accent })); } catch {}
    renderThemeOptions();
    return { name: preset ? name : "custom", accent, strong, soft };
  }

  function ensureThemeDialog() {
    if (byId("solrakThemeDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "solrakThemeDialog";
    dialog.innerHTML = `<div class="solrakQuickHead"><span>Tema de color</span><button type="button" data-solrak-close="solrakThemeDialog">×</button></div><div class="solrakQuickBody"><div id="solrakThemeOptions" class="solrakThemeOptions"></div><div class="solrakCustomTheme"><label>Color personalizado<div class="solrakQuickHelp">Se guarda para este usuario y negocio.</div></label><input id="solrakCustomColor" type="color" value="#2387d9"></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("[data-solrak-close]").onclick = () => dialog.close?.();
    byId("solrakCustomColor").oninput = (event) => applyTheme("custom", event.target.value);
    renderThemeOptions();
  }
  function renderThemeOptions() {
    const host = byId("solrakThemeOptions");
    if (!host) return;
    const active = document.documentElement.dataset.solrakTheme || "sky";
    host.innerHTML = Object.entries(THEMES).map(([name, theme]) => `<button type="button" class="solrakThemeOption ${active === name ? "active" : ""}" data-solrak-theme="${name}"><span class="solrakThemeSwatch" style="--swatch:${theme.accent}"></span><span>${esc(theme.label)}</span></button>`).join("");
    host.querySelectorAll("[data-solrak-theme]").forEach((button) => button.onclick = () => applyTheme(button.dataset.solrakTheme));
    const state = themeState();
    if (byId("solrakCustomColor")) byId("solrakCustomColor").value = colorText(state.custom || "#2387d9");
  }

  function selectedImageSnapshot() {
    const preview = byId("posProductPreview");
    const img = preview?.querySelector("img");
    const meta = preview?.querySelector(".frPreviewMeta strong")?.textContent?.trim() || "";
    return { src: img?.src || "", name: meta };
  }
  function syncProductThumb() {
    const host = byId("solrakSelectedThumb");
    if (!host) return;
    const selected = selectedImageSnapshot();
    host.innerHTML = selected.src ? `<img src="${esc(selected.src)}" alt="${esc(selected.name || "Producto seleccionado")}">` : '<span class="solrakThumbEmpty">SIN<br>IMAGEN</span>';
    host.title = selected.name || "Producto seleccionado";
  }
  function syncTopTotal() {
    const target = byId("solrakTopTotal");
    if (target) target.textContent = byId("posTotal")?.textContent || "$0.00";
  }
  function setScaleReading(detail) {
    const weight = byId("solrakScaleWeight"), meta = byId("solrakScaleMeta");
    if (!weight || !meta) return false;
    const source = String(detail?.source || "").toLowerCase();
    const trustedDevice = detail?.connected === true && ["device", "serial", "usb", "bluetooth"].includes(source);
    const value = Number(detail?.weight);
    if (!trustedDevice || !Number.isFinite(value)) {
      weight.textContent = "— kg";
      meta.textContent = "Sin lectura real";
      return false;
    }
    const unit = String(detail?.unit || "kg").slice(0, 6);
    weight.textContent = `${value.toFixed(3)} ${unit}`;
    meta.textContent = "Báscula conectada";
    return true;
  }
  function pollScaleBridge() {
    const bridge = window.SOLRAKScaleBridge;
    if (!bridge || typeof bridge.getSnapshot !== "function") return;
    try {
      const value = bridge.getSnapshot();
      if (value?.then) value.then(setScaleReading).catch(() => setScaleReading(null));
      else setScaleReading(value);
    } catch { setScaleReading(null); }
  }

  function ensureOpsBar() {
    const tab = byId("tab-pos");
    const grid = tab?.querySelector(":scope > .frPosGrid");
    if (!tab || !grid) return false;
    let bar = byId("solrakOpsBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "solrakOpsBar";
      bar.innerHTML = `<div class="solrakOpsMetric"><span class="solrakOpsIcon">⚖</span><div><span>Peso</span><strong id="solrakScaleWeight">— kg</strong><span id="solrakScaleMeta" class="solrakScaleMeta">Sin lectura real</span></div></div><div id="solrakSelectedThumb"><span class="solrakThumbEmpty">SIN<br>IMAGEN</span></div><div id="solrakTicketSlot"></div><div class="solrakTopTotal"><span>Total</span><strong id="solrakTopTotal">$0.00</strong></div><button id="solrakThemeButton" type="button" title="Cambiar tema" aria-label="Cambiar tema">◐</button>`;
      tab.insertBefore(bar, grid);
      byId("solrakThemeButton").onclick = () => { ensureThemeDialog(); byId("solrakThemeDialog")?.showModal?.(); };
    }
    const ticketBar = tab.querySelector(".frTicketBar");
    const slot = byId("solrakTicketSlot");
    if (ticketBar && slot && ticketBar.parentElement !== slot) slot.appendChild(ticketBar);
    syncProductThumb();
    syncTopTotal();
    return true;
  }

  function discountBridge() {
    const bridge = window.SOLRAKDiscounts;
    return bridge && typeof bridge.applyLineDiscount === "function" ? bridge : null;
  }
  function globalDiscountBridge() {
    const bridge = window.SOLRAKDiscounts;
    return bridge && typeof bridge.openSaleDiscount === "function" ? bridge : null;
  }
  function servicesBridge() {
    const bridge = window.SOLRAKServices;
    return bridge && typeof bridge.open === "function" ? bridge : null;
  }
  function mayDiscount() {
    try { return window.SOLRAKPermissionsV0179?.can?.("allow_discounts") === true || currentSession()?.user?.role === "admin"; } catch { return false; }
  }

  function ensureLineEditor() {
    if (byId("solrakLineEditor")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "solrakLineEditor";
    dialog.innerHTML = `<div class="solrakQuickHead"><span id="solrakLineTitle">Editar concepto</span><button type="button" data-solrak-close="solrakLineEditor">×</button></div><div class="solrakQuickBody"><div class="solrakQuickGrid"><label class="wide">Cantidad<input id="solrakLineQty" type="number" min="0.001" step="0.001"></label><label>Descuento<input id="solrakLineDiscountValue" type="number" min="0" step="0.01" disabled></label><label>Tipo<select id="solrakLineDiscountType" disabled><option value="percent">Porcentaje %</option><option value="fixed">Importe $</option></select></label></div><div id="solrakLineDiscountHelp" class="solrakQuickHelp">El descuento manual permanecerá bloqueado hasta que el servicio productivo de descuentos valide y audite la operación.</div><div class="solrakQuickFoot"><button type="button" data-solrak-close="solrakLineEditor">Cancelar</button><button id="solrakApplyLineEdit" class="primary" type="button">Aplicar cantidad</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-solrak-close="solrakLineEditor"]').forEach((button) => button.onclick = () => dialog.close?.());
    byId("solrakApplyLineEdit").onclick = applyLineEdit;
  }
  function openLineEditor(lineId) {
    const api = pos();
    const line = api?.cart?.find?.((item) => String(item.id) === String(lineId));
    if (!line) return;
    ensureLineEditor();
    const dialog = byId("solrakLineEditor");
    dialog.dataset.lineId = String(line.id);
    byId("solrakLineTitle").textContent = line.name || "Editar concepto";
    byId("solrakLineQty").value = Number(line.qty || 1);
    byId("solrakLineDiscountValue").value = "0";
    const bridge = discountBridge();
    const enabled = Boolean(bridge && mayDiscount());
    byId("solrakLineDiscountValue").disabled = !enabled;
    byId("solrakLineDiscountType").disabled = !enabled;
    byId("solrakLineDiscountHelp").textContent = enabled ? "El descuento será validado y auditado por el servicio productivo." : "Descuento manual no habilitado en el servicio productivo; SOLRAK no simula descuentos.";
    byId("solrakApplyLineEdit").textContent = enabled ? "Aplicar cambios" : "Aplicar cantidad";
    dialog.showModal?.();
  }
  async function applyLineEdit() {
    const api = pos(), dialog = byId("solrakLineEditor");
    const line = api?.cart?.find?.((item) => String(item.id) === String(dialog?.dataset.lineId));
    if (!line) return;
    const qty = Number(byId("solrakLineQty")?.value);
    if (!Number.isFinite(qty) || qty <= 0) return notify("Cantidad inválida.", true);
    const max = line.custom ? Number.MAX_SAFE_INTEGER : Number(line.stock || 0);
    if (!line.custom && qty > max) return notify(`Existencia insuficiente. Disponible ${max}.`, true);
    line.qty = qty;
    const bridge = discountBridge();
    const discountValue = Number(byId("solrakLineDiscountValue")?.value || 0);
    if (bridge && mayDiscount() && discountValue > 0) {
      try {
        await bridge.applyLineDiscount({ lineId: line.id, value: discountValue, type: byId("solrakLineDiscountType")?.value || "percent" });
      } catch (error) { return notify(error?.message || "No se pudo aplicar el descuento.", true); }
    }
    api.rerender?.();
    dialog.close?.();
    byId("posSearch")?.focus?.();
  }

  function openExchangeConfig() {
    const button = document.querySelector('[data-fiel-action="configuration"]');
    if (!button) return notify("Configuración todavía no está disponible.", true);
    button.click();
    setTimeout(() => document.querySelector('[data-fiel-config="other"]')?.click(), 40);
  }
  function printDraftQuote() {
    const api = pos();
    const cart = Array.isArray(api?.cart) ? api.cart : [];
    if (!cart.length) return notify("Agrega productos antes de imprimir el borrador.", true);
    const lineTotal = (line) => {
      const gross = Number(line.price || 0) * Number(line.qty || 0), rate = Number(line.iva ?? 16) / 100;
      if (line.price_includes_tax !== false) { const base = rate ? gross / (1 + rate) : gross; return { base, tax: gross - base, total: gross }; }
      const tax = gross * rate; return { base: gross, tax, total: gross + tax };
    };
    const totals = cart.reduce((sum, line) => { const row = lineTotal(line); sum.base += row.base; sum.tax += row.tax; sum.total += row.total; return sum; }, { base: 0, tax: 0, total: 0 });
    const rows = cart.map((line) => `<tr><td>${esc(line.code || "—")}</td><td>${esc(line.name || "Producto")}</td><td class="num">${Number(line.qty || 0)}</td><td class="num">${money(line.price)}</td><td class="num">${money(lineTotal(line).total)}</td></tr>`).join("");
    const w = window.open?.("", "_blank", "width=900,height=760");
    if (!w) return notify("No se pudo abrir la ventana de impresión.", true);
    const ticket = api?.activeTicketId || 1;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Borrador Ticket ${ticket}</title><style>body{font-family:Segoe UI,Arial,sans-serif;margin:28px;color:#252c33}h1{margin:0;font-size:24px}.badge{display:inline-block;margin-top:8px;padding:5px 8px;background:#eee;font-size:11px;font-weight:800}.meta{margin-top:7px;color:#69747e;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:12px}th,td{padding:8px;border-bottom:1px solid #dfe3e6;text-align:left}.num{text-align:right}.totals{width:320px;margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:5px 0}.grand{border-top:2px solid #252c33;font-size:18px;font-weight:800}.foot{margin-top:28px;padding-top:12px;border-top:1px solid #ddd;color:#68737c;font-size:11px}@media print{body{margin:14mm}}</style></head><body><h1>SOLRAK · Cotización borrador</h1><span class="badge">BORRADOR · NO ES CFDI</span><div class="meta">Ticket ${ticket} · ${new Date().toLocaleString("es-MX")}</div><table><thead><tr><th>Código</th><th>Descripción</th><th class="num">Cantidad</th><th class="num">P. unitario</th><th class="num">Subtotal</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${money(totals.base)}</strong></div><div><span>IVA</span><strong>${money(totals.tax)}</strong></div><div class="grand"><span>Total</span><strong>${money(totals.total)}</strong></div></div><div class="foot">Este documento es un borrador de cotización. No timbra CFDI y no modifica existencias.</div><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
    w.document.close();
  }

  function ensureActionBar() {
    const tab = byId("tab-pos"), grid = tab?.querySelector(":scope > .frPosGrid");
    if (!tab || !grid) return false;
    let bar = byId("solrakActionBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "solrakActionBar";
      bar.innerHTML = `<button class="solrakAction primary" data-solrak-action="finish" type="button">Finalizar venta<small>Cobrar ticket actual</small></button><button class="solrakAction" data-solrak-action="services" type="button">Recargas / Servicios<small id="solrakServicesState">No configurado</small></button><button class="solrakAction" data-solrak-action="exchange" type="button">Tipo de cambio<small>Recalcular / configurar</small></button><button class="solrakAction" data-solrak-action="discount" type="button">Descuento venta<small id="solrakDiscountState">No habilitado</small></button><button class="solrakAction danger" data-solrak-action="clear" type="button">Vaciar ticket<small>Sin afectar inventario</small></button><button class="solrakAction" data-solrak-action="quote" type="button">Cotización borrador<small>Imprimir sin guardar</small></button>`;
      tab.appendChild(bar);
      bar.querySelector('[data-solrak-action="finish"]').onclick = () => pos()?.openPayment?.();
      bar.querySelector('[data-solrak-action="exchange"]').onclick = openExchangeConfig;
      bar.querySelector('[data-solrak-action="clear"]').onclick = () => byId("posClear")?.click();
      bar.querySelector('[data-solrak-action="quote"]').onclick = printDraftQuote;
      bar.querySelector('[data-solrak-action="services"]').onclick = () => servicesBridge()?.open?.();
      bar.querySelector('[data-solrak-action="discount"]').onclick = () => globalDiscountBridge()?.openSaleDiscount?.();
    }
    const serviceButton = bar.querySelector('[data-solrak-action="services"]');
    const serviceReady = Boolean(servicesBridge());
    serviceButton.disabled = !serviceReady;
    serviceButton.title = serviceReady ? "" : "Recargas/Servicios requiere un proveedor productivo configurado; no se simulan operaciones.";
    byId("solrakServicesState").textContent = serviceReady ? "Disponible" : "No configurado";
    const discountButton = bar.querySelector('[data-solrak-action="discount"]');
    const discountReady = Boolean(globalDiscountBridge() && mayDiscount());
    discountButton.disabled = !discountReady;
    discountButton.title = discountReady ? "" : "Descuento global bloqueado hasta que exista validación productiva y permiso de usuario.";
    byId("solrakDiscountState").textContent = discountReady ? "Disponible" : "No habilitado";
    return true;
  }

  function bindCartDoubleClick() {
    const cart = byId("posCart");
    if (!cart || cart.dataset.solrakDblBound === "1") return;
    cart.dataset.solrakDblBound = "1";
    cart.addEventListener("dblclick", (event) => {
      if (event.target.closest("button,input")) return;
      const row = event.target.closest("[data-pos-line]");
      if (row) openLineEditor(row.dataset.posLine);
    });
  }
  function bindSearchState() {
    const input = byId("posSearch"), tab = byId("tab-pos");
    if (!input || !tab || input.dataset.solrakDensityBound === "1") return;
    input.dataset.solrakDensityBound = "1";
    const update = () => tab.classList.toggle("solrak-searching", Boolean(input.value.trim()));
    input.addEventListener("input", update);
    input.addEventListener("blur", () => setTimeout(update, 120));
    input.addEventListener("focus", update);
    update();
  }

  function installObservers() {
    if (observersInstalled) return;
    const total = byId("posTotal"), preview = byId("posProductPreview");
    if (!total || !preview) return;
    observersInstalled = true;
    new MutationObserver(syncTopTotal).observe(total, { childList: true, subtree: true, characterData: true });
    new MutationObserver(syncProductThumb).observe(preview, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    document.addEventListener("solrak:scale-reading", (event) => setScaleReading(event.detail));
    document.addEventListener("solrak:permissions-updated", ensureActionBar);
    document.addEventListener("solrak:pos-sale-complete", () => setTimeout(sync, 0));
  }

  function sync() {
    injectStyle();
    ensureSidebar();
    ensureThemeDialog();
    const saved = themeState();
    applyTheme(saved.name, saved.custom);
    if (!ensureOpsBar()) return false;
    ensureActionBar();
    bindCartDoubleClick();
    bindSearchState();
    installObservers();
    syncTopTotal();
    syncProductThumb();
    pollScaleBridge();
    const tickets = pos()?.tickets;
    if (Array.isArray(tickets) && tickets.length > MAX_TICKETS) notify(`SOLRAK admite hasta ${MAX_TICKETS} tickets simultáneos.`, true);
    document.documentElement.dataset.solrakDesktopDensity = "1";
    return true;
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 30);
  }
  function boot() {
    sync();
    new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
    setInterval(() => { syncTopTotal(); pollScaleBridge(); ensureActionBar(); }, 1200);
    setTimeout(sync, 250);
    setTimeout(sync, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKDesktopDensityV0183 = {
    version: VERSION,
    maxTickets: MAX_TICKETS,
    themes: THEMES,
    sync,
    setCollapsed,
    applyTheme,
    setScaleReading,
    openLineEditor,
    printDraftQuote,
  };
})();
