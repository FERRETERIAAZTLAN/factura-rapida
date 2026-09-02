import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('solrak-sales-suma-v0201-loader.js', 'utf8');
new vm.Script(source, { filename: 'solrak-sales-suma-v0201-loader.js' });

const dom = new JSDOM('<!doctype html><html><head></head><body><main id="login"><input id="pin"><button id="loginBtn">Entrar</button></main></body></html>', {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://tauri.localhost/'
});
const { window } = dom;
const { document } = window;
const loaded = [];

const originalAppend = window.Element.prototype.appendChild;
window.Element.prototype.appendChild = function appendChild(node) {
  const result = originalAppend.call(this, node);
  if (node?.tagName === 'SCRIPT' && node.dataset?.solrakLoadedSrc) {
    loaded.push(node.dataset.solrakLoadedSrc);
    queueMicrotask(() => node.dispatchEvent(new window.Event('load')));
  }
  return result;
};

window.eval(source);
const assert = (ok, message) => { if (!ok) throw new Error(message); };
assert(window.SOLRAKSalesSumaV0201Loader?.version === '0.2.1-load-gate', 'No cargó load gate');
assert(loaded.length === 0, 'Ventas intentó cargar módulos antes del evento load');

await new Promise((resolve) => setTimeout(resolve, 40));
assert(loaded.length === 0, 'Ventas se activó durante DOMContentLoaded/login');

window.dispatchEvent(new window.Event('load'));
await new Promise((resolve) => setTimeout(resolve, 220));
assert(JSON.stringify(loaded) === JSON.stringify([
  'solrak-sales-suma-v0201.js',
  'solrak-sales-suma-v0201-tune.js',
  'solrak-sales-suma-v0201-startup-fix.js'
]), `Orden diferido incorrecto: ${JSON.stringify(loaded)}`);
assert(document.documentElement.dataset.solrakSales201Loaded === '1', 'No marcó carga completa de ventas');

window.SOLRAKSalesSumaV0201Loader.destroy();
window.Element.prototype.appendChild = originalAppend;
window.close();
console.log('SOLRAK_SALES_SUMA_V0201_LOAD_GATE_OK');
