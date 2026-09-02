import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('solrak-common-product-v0196.js', 'utf8');
new vm.Script(source, { filename: 'solrak-common-product-v0196.js' });

const html = `<!doctype html><html><head>
<style>.fielDialog{width:100vw!important;height:100vh!important;max-width:none!important}</style>
</head><body>
<dialog id="fielCommonDialog" class="fielDialog small">
  <div class="fielDialogHead">Producto Común<button class="fielDialogClose" data-fiel-close="fielCommonDialog" type="button">×</button></div>
  <form id="fielCommonForm" class="fielDialogBody">
    <div class="fielFormGrid">
      <label class="fielLabel wide">Cantidad<input id="fielCommonQty" class="fielField" type="number" value="1" required></label>
      <label class="fielLabel">Costo<input id="fielCommonCost" class="fielField" type="number" value="0.00"></label>
      <label class="fielLabel">Precio Público<input id="fielCommonPrice" class="fielField" type="number" value="0.00" required></label>
    </div>
    <div class="fielDialogFoot"><button class="fielBtn primary" type="submit">Guardar</button><button class="fielBtn" data-fiel-close="fielCommonDialog" type="button">Cerrar</button></div>
  </form>
</dialog>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const { document } = window;
const form = document.getElementById('fielCommonForm');
const originalSubmit = () => {};
form.onsubmit = originalSubmit;

window.eval(source);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 30));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const dialog = document.getElementById('fielCommonDialog');
const name = document.getElementById('fielCommonName');
const grid = form.querySelector('.fielFormGrid');
const style = document.getElementById('solrakCommonProductV0196Style')?.textContent || '';

assert(window.SOLRAKCommonProductV0196?.version === '0.1.96', 'No cargó módulo v0.1.96');
assert(document.documentElement.dataset.solrakCommon96 === '1', 'No activó estilos v0.1.96');
assert(dialog?.tagName === 'DIALOG', 'Producto Común dejó de ser un diálogo');
assert(dialog.classList.contains('s96CommonCompact'), 'No marcó el diálogo compacto');
assert(name, 'No agregó el campo Nombre del producto');
assert(name.required, 'El nombre debe ser obligatorio');
assert(name.maxLength === 180, 'Longitud de nombre incorrecta');
assert(grid.firstElementChild?.contains(name), 'Nombre del producto debe ser el primer campo');
assert(form.onsubmit === originalSubmit, 'Se reemplazó el submit funcional existente');
assert(form.querySelector('button[type="submit"]')?.textContent === 'GUARDAR', 'Botón GUARDAR incorrecto');
assert(form.querySelector('[data-fiel-close="fielCommonDialog"]')?.textContent === 'CERRAR', 'Botón CERRAR incorrecto');
assert(style.includes('#fielCommonDialog'), 'Falta selector aislado del modal');
assert(style.includes('width:min(390px,calc(100vw - 36px))!important'), 'No limita el ancho del modal');
assert(style.includes('height:auto!important'), 'No fuerza altura automática');
assert(style.includes('max-width:390px!important'), 'No limita ancho máximo');
assert(!style.includes('#fielCommonDialog{width:100vw'), 'El parche no debe hacer el diálogo de pantalla completa');

window.SOLRAKCommonProductV0196.mount();
assert(document.querySelectorAll('#fielCommonName').length === 1, 'Duplicó el campo nombre al remontar');

dialog.setAttribute('open', '');
await new Promise((resolve) => setTimeout(resolve, 20));
assert(document.activeElement === name, 'No enfoca Nombre del producto al abrir');

dialog.removeAttribute('open');
window.SOLRAKCommonProductV0196.destroy();
window.close();
console.log('SOLRAK_COMMON_PRODUCT_V0196_SMOKE_OK');
