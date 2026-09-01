import fs from "node:fs";
import { JSDOM } from "jsdom";

const visual = fs.readFileSync("solrak-professional-pos-v0166.js", "utf8");
const pos = fs.readFileSync("pos-module.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  visual.includes("#frReadyPanel"),
  "La Venta no oculta el panel fiscal que aparece en la foto de v0.1.65",
);
assert(
  /grid-template-columns:\s*90px\s+minmax\(190px,\s*1fr\)\s+126px\s+92px\s+112px/.test(
    visual,
  ),
  "La tabla compacta de cinco columnas perdió su distribución",
);
assert(
  visual.includes("data-solrak-professional-pos"),
  "No existe el modo de trabajo exclusivo para Venta",
);
assert(
  !/fetch\s*\(|XMLHttpRequest|cfdi-api|finkok|completeSale/i.test(visual),
  "La capa visual invadió red, cobro o CFDI",
);
assert(
  pos.includes('class="frPosCartHead"'),
  "Falta encabezado Código/Producto/Cantidad/Precio/Importe",
);
assert(
  pos.includes('data-pay-amount="cash"') &&
    pos.includes('data-pay-amount="card"') &&
    pos.includes('data-pay-amount="transfer"') &&
    pos.includes('data-pay-amount="other"'),
  "La pantalla de cobro no contiene los cuatro métodos reales",
);
assert(
  pos.includes("payments,") && pos.includes("paymentDraft()"),
  "El pago combinado no llega a la única venta atómica",
);
assert(
  !/cfdi-api|finkok/i.test(pos),
  "El rediseño de Venta invadió CFDI/Finkok",
);

const dom = new JSDOM(
  '<!doctype html><html><head></head><body><main class="shell"><div id="frReadyPanel">FISCAL</div><section id="tab-pos"><div class="frPosTop"></div><div class="frTicketBar"></div><div class="frPosGrid"><div class="stack"></div><aside class="summary"><div id="posProductPreview"></div></aside></div></section></main></body></html>',
  { runScripts: "dangerously", pretendToBeVisual: true },
);
dom.window.eval(visual);
await new Promise((resolve) => setTimeout(resolve, 20));
assert(
  dom.window.SOLRAKProfessionalPOSV0166?.version === "0.1.66",
  "No montó la capa profesional v0.1.66",
);
assert(
  dom.window.document.documentElement.dataset.solrakProfessionalPos === "1",
  "Venta no activó el modo profesional",
);
assert(
  dom.window.document.querySelector("#posProductPreview + .frTicketBar"),
  "Los tickets no quedaron junto a imagen y total",
);
const css =
  dom.window.document.getElementById("solrakProfessionalPOSV0166Style")
    ?.textContent || "";
assert(
  css.includes("#frReadyPanel") && /display:\s*none\s*!important/.test(css),
  "La regla que elimina los paneles fiscales no quedó activa",
);

console.log(
  "SOLRAK_PROFESSIONAL_POS_V0166_OK readyPanelHidden=true table=5cols payment=4real split=true noCfdi=true",
);
