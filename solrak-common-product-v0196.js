(() => {
  "use strict";

  const VERSION = "0.1.96";
  const STYLE_ID = "solrakCommonProductV0196Style";
  const ROOT_FLAG = "solrakCommon96";
  const DIALOG_ID = "fielCommonDialog";
  const FORM_ID = "fielCommonForm";
  const NAME_ID = "fielCommonName";
  const byId = (id) => document.getElementById(id);

  let hostObserver = null;
  let dialogObserver = null;

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-common96="1"] #${DIALOG_ID}{
  position:fixed!important;
  inset:0!important;
  width:min(390px,calc(100vw - 36px))!important;
  max-width:390px!important;
  min-width:0!important;
  height:auto!important;
  min-height:0!important;
  max-height:calc(100vh - 36px)!important;
  margin:auto!important;
  padding:0!important;
  border:0!important;
  border-radius:0!important;
  overflow:hidden!important;
  box-sizing:border-box!important;
  background:#fff!important;
  box-shadow:0 16px 48px rgba(0,0,0,.34)!important;
  font-family:"Segoe UI",Arial,sans-serif!important;
}
html[data-solrak-common96="1"] #${DIALOG_ID}:not([open]){display:none!important}
html[data-solrak-common96="1"] #${DIALOG_ID}[open]{display:block!important}
html[data-solrak-common96="1"] #${DIALOG_ID}::backdrop{background:rgba(25,25,25,.52)!important;backdrop-filter:none!important}
html[data-solrak-common96="1"] #${DIALOG_ID} .fielDialogHead{
  height:36px!important;
  min-height:36px!important;
  padding:0 42px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  background:linear-gradient(90deg,#f7951d,#f47a16)!important;
  color:#fff!important;
  font-size:13px!important;
  font-weight:600!important;
  border:0!important;
}
html[data-solrak-common96="1"] #${DIALOG_ID} .fielDialogClose{
  position:absolute!important;
  top:1px!important;
  right:4px!important;
  width:34px!important;
  height:34px!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  color:#fff!important;
  font-size:21px!important;
  font-weight:400!important;
}
html[data-solrak-common96="1"] #${FORM_ID}.fielDialogBody{
  width:100%!important;
  max-height:none!important;
  padding:21px 19px 15px!important;
  overflow:visible!important;
  box-sizing:border-box!important;
  background:#fff!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielFormGrid{
  display:grid!important;
  grid-template-columns:1fr!important;
  gap:11px!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielLabel{
  grid-column:1/-1!important;
  display:grid!important;
  grid-template-columns:132px minmax(0,1fr)!important;
  gap:10px!important;
  align-items:center!important;
  min-width:0!important;
  color:#626262!important;
  font-size:12px!important;
  line-height:1.2!important;
  text-transform:none!important;
  letter-spacing:0!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielField{
  width:100%!important;
  height:33px!important;
  min-height:33px!important;
  padding:5px 8px!important;
  border:0!important;
  border-bottom:2px solid #f28b19!important;
  border-radius:0!important;
  background:#f7f7f7!important;
  box-shadow:none!important;
  box-sizing:border-box!important;
  color:#4d4d4d!important;
  font-size:12px!important;
  outline:none!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielField:focus{background:#fff!important;border-bottom-color:#ef7410!important}
html[data-solrak-common96="1"] #${FORM_ID} .fielDialogFoot{
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  gap:9px!important;
  margin:18px 0 0!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielDialogFoot .fielBtn{
  width:100%!important;
  min-width:0!important;
  min-height:35px!important;
  height:35px!important;
  padding:0 10px!important;
  border-radius:0!important;
  font-size:10px!important;
  font-weight:700!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielDialogFoot .fielBtn.primary{
  border-color:#f1bc00!important;
  background:linear-gradient(90deg,#f4b900,#f6c900)!important;
  color:#fff!important;
}
html[data-solrak-common96="1"] #${FORM_ID} .fielDialogFoot .fielBtn:not(.primary){border:1px solid #d6d6d6!important;background:#fff!important;color:#7a7a7a!important}
@media(max-width:460px){
  html[data-solrak-common96="1"] #${DIALOG_ID}{width:calc(100vw - 24px)!important;max-width:390px!important}
  html[data-solrak-common96="1"] #${FORM_ID} .fielLabel{grid-template-columns:116px minmax(0,1fr)!important}
}
`;
    document.head.appendChild(style);
  }

  function ensureNameField(dialog) {
    const form = dialog?.querySelector(`#${FORM_ID}`) || byId(FORM_ID);
    const grid = form?.querySelector(".fielFormGrid");
    if (!form || !grid) return null;

    let input = byId(NAME_ID);
    let label = input?.closest("label") || null;

    if (!input) {
      label = document.createElement("label");
      label.className = "fielLabel wide s96CommonName";
      label.appendChild(document.createTextNode("Nombre del producto"));
      input = document.createElement("input");
      input.id = NAME_ID;
      input.className = "fielField";
      input.type = "text";
      input.maxLength = 180;
      input.placeholder = "Ej. corte de cable";
      input.required = true;
      input.autocomplete = "off";
      label.appendChild(input);
      grid.prepend(label);
    } else {
      input.required = true;
      input.maxLength = 180;
      input.autocomplete = "off";
      if (!input.placeholder) input.placeholder = "Ej. corte de cable";
      if (label && label.parentElement === grid && label !== grid.firstElementChild) grid.prepend(label);
    }

    return input;
  }

  function normalizeDialog(dialog = byId(DIALOG_ID)) {
    if (!dialog) return false;
    dialog.classList.add("s96CommonCompact");
    dialog.dataset.solrakCommon96 = "1";

    const name = ensureNameField(dialog);
    const save = dialog.querySelector(`#${FORM_ID} button[type="submit"]`);
    const close = dialog.querySelector(`#${FORM_ID} [data-fiel-close="${DIALOG_ID}"]`);
    if (save) save.textContent = "GUARDAR";
    if (close) close.textContent = "CERRAR";

    if (dialog.hasAttribute("open")) {
      setTimeout(() => name?.focus(), 0);
    }
    return true;
  }

  function watchDialog(dialog) {
    dialogObserver?.disconnect();
    dialogObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === "attributes" && mutation.attributeName === "open")) {
        normalizeDialog(dialog);
      }
    });
    dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset[ROOT_FLAG] = "1";

    const dialog = byId(DIALOG_ID);
    if (dialog) {
      normalizeDialog(dialog);
      watchDialog(dialog);
      hostObserver?.disconnect();
      hostObserver = null;
      return true;
    }

    if (!hostObserver && document.documentElement) {
      hostObserver = new MutationObserver(() => {
        const current = byId(DIALOG_ID);
        if (!current) return;
        normalizeDialog(current);
        watchDialog(current);
        hostObserver?.disconnect();
        hostObserver = null;
      });
      hostObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    return false;
  }

  function destroy() {
    hostObserver?.disconnect();
    dialogObserver?.disconnect();
    hostObserver = null;
    dialogObserver = null;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();

  window.SOLRAKCommonProductV0196 = { version: VERSION, mount, normalizeDialog, destroy };
})();
