import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-pos-clear-footer-v0167.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  !/fetch\s*\(|XMLHttpRequest|cfdi-api|finkok|completeSale/i.test(code),
  "El ajuste visual invadió red, venta o CFDI",
);

const dom = new JSDOM(
  '<!doctype html><html data-solrak-professional-pos="1"><head></head><body><main><section id="tab-pos"><aside class="summary"><div class="frPosTotals">Total</div><button id="posCharge">Finalizar venta</button></aside></section></main><div id="frBrandPill" style="display:flex"><span>Ferretería Aztlán</span></div></body></html>',
  { runScripts: "dangerously", pretendToBeVisual: true },
);

dom.window.eval(code);
await new Promise((resolve) => setTimeout(resolve, 20));

assert(
  dom.window.SOLRAKPOSClearFooterV0167?.version === "0.1.67",
  "No montó la corrección visual v0.1.67",
);
const pill = dom.window.document.getElementById("frBrandPill");
const charge = dom.window.document.getElementById("posCharge");
const css =
  dom.window.document.getElementById("solrakPOSClearFooterV0167Style")
    ?.textContent || "";
assert(pill, "La prueba perdió la burbuja del negocio");
assert(charge, "La prueba perdió el botón de cobro");
assert(
  /#frBrandPill\s*\{[\s\S]*?display\s*:\s*none\s*!important/i.test(css),
  "Falta la regla prioritaria que oculta la burbuja en Ventas",
);
assert(
  pill.isConnected,
  "La corrección eliminó el acceso al perfil en vez de ocultarlo solo en Ventas",
);
assert(
  dom.window.document.getElementById("solrakPOSClearFooterV0167Style"),
  "No se inyectó la regla visual de v0.1.67",
);

console.log(
  "SOLRAK_POS_CLEAR_FOOTER_V0167_OK brandPillHidden=true chargePreserved=true profilePreserved=true noCfdi=true",
);
