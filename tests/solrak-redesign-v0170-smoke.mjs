import fs from "node:fs";
import { JSDOM } from "jsdom";

const code = fs.readFileSync("solrak-redesign-v0170.js", "utf8");
const executableCode = code
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  !/fetch\s*\(|XMLHttpRequest|completeSale|cfdi-api|finkok|supabase/i.test(
    executableCode,
  ),
  "La capa de rediseño invadió red, venta, Supabase o CFDI",
);

const dom = new JSDOM(
  `<!doctype html><html data-solrak-simple-ui="1" data-solrak-desktop-polish="1" data-solrak-professional-pos="1"><head></head><body>
  <nav class="nav">
    <div id="solrakAppBrand"><strong>SOLRAK</strong></div>
    <button data-tab="pos" class="active"><span class="solrakNavIcon"></span><span class="solrakNavText">Punto de venta</span></button>
    <button data-tab="factura"><span class="solrakNavIcon"></span>Nueva factura</button>
    <div id="solrakNavFooter"><strong>Negocio</strong><span>Escritorio SOLRAK · v0.1.69</span></div>
  </nav>
  <main class="shell">
    <section id="tab-pos" class="tab-panel">
      <div class="frPosGrid"><div class="stack"></div><aside class="card summary">
        <div id="posProductPreview"></div><div id="posReceipt"></div><button id="posCharge">Cobrar</button>
      </aside></div>
    </section>
  </main>
  </body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true },
);

const { window } = dom;
let invoiceClicks = 0;
window.document.querySelector('[data-tab="factura"]').onclick = () => {
  invoiceClicks += 1;
};
window.eval(code);
await new Promise((resolve) => setTimeout(resolve, 80));

const doc = window.document;
assert(
  window.SOLRAKRedesignV0170?.version === "0.1.70",
  "No montó la capa v0.1.70",
);
assert(
  doc.documentElement.dataset.solrakRedesign === "1",
  "No marcó el rediseño activo",
);

const css = doc.getElementById("solrakRedesignV0170Style")?.textContent || "";
for (const marker of [
  "--solrak-simple-accent:#e97618!important",
  "--solrak-pos-blue:#e97618!important",
  "background:#fff1e6!important",
  "position:sticky!important",
]) {
  assert(css.includes(marker), `Falta regla visual v0.1.70: ${marker}`);
}

const invoice = doc.querySelector('.nav>button[data-tab="factura"]');
assert(
  invoice.textContent.trim() === "Facturación",
  `La etiqueta quedó duplicada o incorrecta: "${invoice.textContent.trim()}"`,
);
assert(invoice.querySelector(".solrakNavIcon"), "Se perdió el ícono");
assert(invoice.dataset.tab === "factura", "Se alteró data-tab");
doc.documentElement.scrollTop = 120;
doc.querySelector(".nav").scrollTop = 80;
invoice.click();
await new Promise((resolve) => setTimeout(resolve, 30));
assert(invoiceClicks === 1, "Se alteró el manejador de Facturación");
assert(
  doc.documentElement.scrollTop === 0 &&
    doc.querySelector(".nav").scrollTop === 0,
  "La nueva sección conservó el desplazamiento anterior",
);

const pos = doc.querySelector('.nav>button[data-tab="pos"]');
assert(
  pos.querySelector(".solrakNavText")?.textContent === "Punto de venta",
  "Se alteró una etiqueta ajena",
);
for (const id of ["posProductPreview", "posReceipt", "posCharge"])
  assert(doc.getElementById(id)?.isConnected, `Se eliminó ${id}`);

const version = doc.querySelector("#solrakNavFooter span");
assert(version.textContent.endsWith("v0.1.70"), "El pie no muestra v0.1.70");
version.textContent = "Escritorio SOLRAK · v0.1.69";
await new Promise((resolve) => setTimeout(resolve, 60));
assert(
  version.textContent.endsWith("v0.1.70"),
  "No protegió la versión frente al montaje anterior",
);

window.close();
console.log(
  "SOLRAK_REDESIGN_V0170_OK accent=orange label=clean charge=preserved handlers=preserved noNetwork=true",
);
