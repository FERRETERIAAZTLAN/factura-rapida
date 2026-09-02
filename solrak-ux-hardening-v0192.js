(() => {
  "use strict";

  const VERSION = "0.1.92";
  const STYLE_ID = "solrakUx92Style";
  const DIALOG_ID = "solrakUx92Dialog";
  const byId = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  let resolver = null;

  function posVisible() {
    const panel = byId("tab-pos");
    return !!panel && !panel.classList.contains("hidden") && getComputedStyle(panel).display !== "none";
  }

  function focusSearch(select = false) {
    if (!posVisible() || document.querySelector("dialog[open]")) return false;
    const input = byId("posSearch");
    if (!input || input.disabled) return false;
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    if (select) input.select?.();
    return true;
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-ux92="1"] #tab-pos .frPosTop{margin-bottom:6px!important;gap:7px!important}
html[data-solrak-ux92="1"] #tab-pos .frTicketBar{margin-bottom:6px!important;gap:4px!important}
html[data-solrak-ux92="1"] #tab-pos .frPosGrid{gap:6px!important;grid-template-columns:minmax(0,1.65fr) minmax(330px,.62fr)!important}
html[data-solrak-ux92="1"] #tab-pos .frPosResults{gap:3px!important;margin-top:5px!important;max-height:min(36vh,330px)!important}
html[data-solrak-ux92="1"] #tab-pos .frPosResult{border-radius:3px!important;padding:5px 6px!important;gap:7px!important}
html[data-solrak-ux92="1"] #tab-pos .frPosCart{border-radius:3px!important;max-height:min(34vh,320px)!important}
html[data-solrak-ux92="1"] #tab-pos .frPosLine{padding:5px 6px!important;gap:5px!important}
html[data-solrak-ux92="1"] #tab-pos .frPreview{min-height:132px!important;border-radius:3px!important;margin-bottom:6px!important}
html[data-solrak-ux92="1"] #tab-pos .frPreview img{height:130px!important}
html[data-solrak-ux92="1"] #tab-pos .frPosGrand{font-size:24px!important;padding-top:5px!important}
html[data-solrak-ux92="1"] #tab-pos .frRecent{gap:3px!important}
html[data-solrak-ux92="1"] #tab-pos .frRecentRow{border-radius:3px!important;padding:5px 7px!important}
#${DIALOG_ID}{border:0;border-radius:5px;padding:0;width:min(560px,calc(100vw - 24px));max-width:560px;background:#fff;color:#26313a;box-shadow:0 20px 70px rgba(0,0,0,.38)}
#${DIALOG_ID}::backdrop{background:rgba(13,18,22,.66);backdrop-filter:blur(2px)}
.solrakUx92Head{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:var(--solrak83-accent,#2588d8);color:#fff;font:800 13px "Segoe UI",Tahoma,sans-serif}.solrakUx92Head.danger{background:#b43d3d}.solrakUx92Head button{border:0;background:transparent;color:#fff;font-size:21px;cursor:pointer}
.solrakUx92Body{padding:12px;font:11px/1.4 "Segoe UI",Tahoma,sans-serif}.solrakUx92Body p{margin:0}.solrakUx92Detail{margin-top:7px!important;color:#66727c}.solrakUx92Field{display:grid;gap:4px;margin-top:10px;font-weight:800;color:#4e5a64}.solrakUx92Field input{height:32px;border:1px solid #cbd3d9;border-radius:3px;padding:4px 7px;font:12px "Segoe UI",Tahoma,sans-serif}
.solrakUx92Foot{display:flex;justify-content:flex-end;gap:6px;padding:8px 12px;border-top:1px solid #dce1e5;background:#f5f7f8}.solrakUx92Foot button{height:31px;border:1px solid #c8d0d6;border-radius:3px;background:#fff;padding:0 12px;font:800 10px "Segoe UI",Tahoma,sans-serif}.solrakUx92Foot .confirm{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrakUx92Foot .confirm.danger{background:#b43d3d;border-color:#b43d3d}
@media(max-width:980px){html[data-solrak-ux92="1"] #tab-pos .frPosGrid{grid-template-columns:1fr!important}html[data-solrak-ux92="1"] #tab-pos .frPosResults,html[data-solrak-ux92="1"] #tab-pos .frPosCart{max-height:none!important}}
`;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let dialog = byId(DIALOG_ID);
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = DIALOG_ID;
    dialog.innerHTML = `<div id="solrakUx92Head" class="solrakUx92Head"><span id="solrakUx92Title">Confirmar</span><button id="solrakUx92X" type="button" aria-label="Cerrar">×</button></div><div id="solrakUx92Body" class="solrakUx92Body"></div><div class="solrakUx92Foot"><button id="solrakUx92Cancel" type="button">Cancelar · Esc</button><button id="solrakUx92Confirm" class="confirm" type="button">Confirmar · Enter</button></div>`;
    document.body.appendChild(dialog);

    const finish = (value) => {
      if (!dialog.open && !dialog.hasAttribute("open")) return;
      try { dialog.close(); } catch { dialog.removeAttribute("open"); }
      const resolve = resolver;
      resolver = null;
      resolve?.(value);
      setTimeout(() => focusSearch(false), 0);
    };

    byId("solrakUx92X").onclick = () => finish(null);
    byId("solrakUx92Cancel").onclick = () => finish(null);
    byId("solrakUx92Confirm").onclick = () => {
      const input = byId("solrakUx92Input");
      if (dialog.dataset.required === "1" && input && !String(input.value || "").trim()) {
        input.focus();
        if (typeof window.notice === "function") window.notice("Completa el dato solicitado antes de continuar.", true);
        return;
      }
      finish(input ? String(input.value || "").trim() : true);
    };
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(null); });
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target?.tagName === "TEXTAREA") return;
      event.preventDefault();
      byId("solrakUx92Confirm")?.click();
    });
    return dialog;
  }

  function ask(options = {}) {
    const dialog = ensureDialog();
    if (dialog.open || dialog.hasAttribute("open")) return Promise.resolve(null);
    const danger = options.danger === true;
    const input = options.input === true;
    byId("solrakUx92Title").textContent = String(options.title || "Confirmar");
    byId("solrakUx92Head").className = `solrakUx92Head${danger ? " danger" : ""}`;
    byId("solrakUx92Confirm").className = `confirm${danger ? " danger" : ""}`;
    byId("solrakUx92Confirm").textContent = String(options.confirmText || "Confirmar · Enter");
    byId("solrakUx92Body").innerHTML = `<p>${esc(options.message || "¿Deseas continuar?")}</p>${options.detail ? `<p class="solrakUx92Detail">${esc(options.detail)}</p>` : ""}${input ? `<label class="solrakUx92Field">${esc(options.label || "Dato")}<input id="solrakUx92Input" type="${esc(options.type || "text")}" maxlength="${Number(options.maxlength) || 240}" autocomplete="off" value="${esc(options.value || "")}" placeholder="${esc(options.placeholder || "")}"></label>` : ""}`;
    dialog.dataset.required = options.required ? "1" : "0";
    try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    setTimeout(() => (input ? byId("solrakUx92Input") : byId("solrakUx92Confirm"))?.focus(), 0);
    return new Promise((resolve) => { resolver = resolve; });
  }

  async function confirmAction(options = {}) {
    return (await ask({ ...options, input: false })) === true;
  }

  async function promptValue(options = {}) {
    const result = await ask({ ...options, input: true });
    return typeof result === "string" ? result : null;
  }

  function mount() {
    document.documentElement.dataset.solrakUx92 = "1";
    ensureStyle();
    ensureDialog();
  }

  function installFocusRecovery() {
    document.addEventListener("solrak:pos-sale-complete", () => setTimeout(() => focusSearch(true), 25));
    document.addEventListener("solrak:price-verifier-added", () => setTimeout(() => focusSearch(false), 0));
    document.addEventListener("close", (event) => {
      if (event.target?.tagName === "DIALOG") setTimeout(() => focusSearch(false), 0);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { mount(); installFocusRecovery(); }, { once: true });
  else { mount(); installFocusRecovery(); }

  window.SOLRAKUXV0192 = {
    version: VERSION,
    confirm: confirmAction,
    prompt: promptValue,
    ask,
    focusSearch,
    mount,
  };
})();
