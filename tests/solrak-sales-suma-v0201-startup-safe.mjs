import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const salesSource = fs.readFileSync('solrak-sales-suma-v0201.js', 'utf8');
const fixSource = fs.readFileSync('solrak-sales-suma-v0201-startup-fix.js', 'utf8');
new vm.Script(salesSource, { filename: 'solrak-sales-suma-v0201.js' });
new vm.Script(fixSource, { filename: 'solrak-sales-suma-v0201-startup-fix.js' });

const dom = new JSDOM('<!doctype html><html><head></head><body><main id="login"><input id="pin"><button id="loginBtn">Entrar</button></main></body></html>', {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://tauri.localhost/'
});
const { window } = dom;
const { document } = window;
let referenceMounts = 0;
window.SOLRAKSalesReferenceV0200 = { mount() { referenceMounts += 1; return false; } };

window.eval(salesSource);
window.eval(fixSource);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 100));

const assert = (ok, message) => { if (!ok) throw new Error(message); };
assert(window.SOLRAKSalesSumaV0201StartupFix?.version === '0.2.1-startup-safe', 'No cargó startup fix');
assert(!document.documentElement.dataset.solrakSales201, 'Ventas v0.2.01 alteró la pantalla de login');
assert(!document.getElementById('solrakSalesSumaV0201Style'), 'Quedó CSS de ventas activo durante login');
assert(referenceMounts === 1, `El observador original siguió montando durante login: ${referenceMounts}`);

for (let i = 0; i < 12; i++) {
  document.getElementById('login').appendChild(document.createElement('span'));
}
await new Promise((resolve) => setTimeout(resolve, 80));
assert(referenceMounts === 1, `Mutaciones de login reactivaron ventas: ${referenceMounts}`);

const sidebarFinish = document.createElement('button');
sidebarFinish.id = 'fielFinishSale';
sidebarFinish.textContent = 'Finalizar venta';
document.body.appendChild(sidebarFinish);

const tab = document.createElement('section');
tab.id = 'tab-pos';
tab.innerHTML = `
  <div class="frPosTop"><h2>Ventas</h2></div>
  <div class="frPosGrid">
    <div class="stack">
      <article><div class="frPosSearch"><input id="posSearch"><button id="solrakV0195SearchBtn">Buscar</button></div></article>
      <article class="frPosCartCard"><div class="frPosCartHead"></div><div class="frPosCart"></div></article>
    </div>
    <aside class="summary"><div class="frPosTotals"><div class="frPosGrand"><span>Total</span><strong>$0</strong></div></div></aside>
  </div>`;
document.body.appendChild(tab);

await new Promise((resolve) => setTimeout(resolve, 140));
assert(document.getElementById('solrakSalesSumaV0201Workspace'), 'No montó ventas al aparecer la superficie POS completa');
assert(document.documentElement.dataset.solrakSales201 === '1', 'No activó layout al entrar a ventas');
assert(document.getElementById('solrakV0195SearchBtn').textContent === 'BUSCAR', 'No normalizó BUSCAR');
assert(document.getElementById('fielFinishSale').textContent === 'FINALIZAR VENTA', 'No normalizó FINALIZAR VENTA');
assert(referenceMounts === 2, `Montaje POS inesperado: ${referenceMounts}`);

const marker = document.createElement('div');
document.body.appendChild(marker);
for (let i = 0; i < 20; i++) marker.appendChild(document.createElement('i'));
await new Promise((resolve) => setTimeout(resolve, 100));
assert(referenceMounts === 2, `El observador volvió a entrar en ciclo con el POS montado: ${referenceMounts}`);

window.SOLRAKSalesSumaV0201StartupFix.destroy();
window.SOLRAKSalesSumaV0201.destroy();
window.close();
console.log('SOLRAK_SALES_SUMA_V0201_STARTUP_SAFE_OK');
