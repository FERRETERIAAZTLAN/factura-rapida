import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const sales95 = fs.readFileSync('solrak-suma-sales-v0195.js', 'utf8');
const sales98 = fs.readFileSync('solrak-sales-exact-v0198.js', 'utf8');
new vm.Script(sales95, { filename: 'solrak-suma-sales-v0195.js' });
new vm.Script(sales98, { filename: 'solrak-sales-exact-v0198.js' });

const html = `<!doctype html><html><head></head><body>
<aside id="solrakFielSidebar">
  <div class="fielBrand"><div class="fielBrandMark">S</div><div class="fielBrandText"><strong>SOLRAK</strong><small>PUNTO DE VENTA</small></div></div>
  <div class="fielMenu">
    <button data-fiel-action="new-ticket">Nuevo Ticket</button>
    <button data-fiel-action="price-check">Verificador</button>
    <button data-fiel-action="common-product">Producto Común</button>
    <button data-fiel-action="ticket-search">Consultar Ticket</button>
    <button data-fiel-action="return-sale">Devolución</button>
    <button data-fiel-action="tab" data-tab-target="factura">Facturación</button>
    <button data-fiel-action="tab" data-tab-target="cotizaciones">Cotizaciones</button>
    <button data-fiel-action="tab" data-tab-target="clientes">Clientes</button>
    <button data-fiel-action="tab" data-tab-target="inventario">Inventario</button>
    <button data-fiel-action="tab" data-tab-target="proveedores">Proveedores</button>
    <button data-fiel-action="tab" data-tab-target="usuarios">Usuarios</button>
    <button data-fiel-action="shifts">Turnos</button>
    <button data-fiel-action="cash-in">Entradas</button>
    <button data-fiel-action="cash-out">Salidas</button>
    <button data-fiel-action="cash-cut">Corte de Caja</button>
    <button data-fiel-action="configuration">Configuración</button>
    <button data-fiel-action="sales-report">Reporte</button>
  </div>
  <button id="fielFinishSale">Finalizar venta</button>
</aside>
<main class="shell"><header class="top"><div><h1>Ferretería Aztlán</h1></div><div class="top-actions"><button class="fielMailTop">Correo</button><button id="currentUser">Administrador</button><button id="logoutBtn">Salir</button></div></header>
<section id="tab-pos">
  <div class="frPosTop"><div><h2>Punto de venta</h2></div></div>
  <div class="frPosGrid"><div class="stack">
    <article><div class="frPosSearch"><input id="posSearch"></div><div id="posResults"></div></article>
    <article class="frPosCartCard"><div class="card-head"></div><label><select id="posClient"></select></label>
      <div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div>
      <div id="posCart"><div class="frPosLine" data-pos-line="p1"><div class="frPosCode">ABC</div><div class="frPosProduct"><strong>Martillo</strong><small>Pieza</small></div><div class="frPosQty"><button>-</button><input value="2"><button>+</button></div><div class="frPosUnitPrice">$100</div><div class="frPosLineTotal"><strong>$180</strong><button class="trash">×</button></div></div></div>
      <div class="fielPosActions"><div class="fielPosStats"><span>Cantidad de Productos <strong>2</strong></span><span>Tecla Rápida · F2</span><span>Tipo Cambio <b>$0.00</b></span></div><div class="fielPosTools"><button data-fiel-pos-tool="common">Producto común</button><button data-fiel-pos-tool="discount">Aplicar descuento</button><button data-fiel-pos-tool="clear">Eliminar</button><button data-fiel-pos-tool="print">Imprimir</button></div></div>
    </article>
  </div><aside class="summary"><div class="card-head"></div><div class="frPreview"></div><div class="frTicketBar"><div id="posTickets"><div class="frTicket active"><strong>Ticket #769</strong><span class="frTicketClose">×</span></div></div><button class="frTicketNew" id="posNewTicket">Nuevo ticket</button></div><div class="frPosTotals"><div><span>Subtotal</span><strong>$0</strong></div><div><span>IVA</span><strong>$0</strong></div><div class="frPosGrand"><span>Total</span><strong>$180.00</strong></div></div></aside></div>
</section></main>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const { document } = window;
window.session = { user: { role: 'admin' } };
window.FacturaRapidaPOS = { cart: [{ id: 'p1', price: 90, list_price: 100, wholesale: 82, qty: 2 }], newTicket() {} };
window.SOLRAKSumaproFielV0171 = { openTab() {}, openConfiguration() {} };

const calls = new Map();
document.querySelectorAll('[data-fiel-action]').forEach((button) => button.addEventListener('click', () => {
  const key = `${button.dataset.fielAction}:${button.dataset.tabTarget || ''}`;
  calls.set(key, (calls.get(key) || 0) + 1);
}));

window.eval(sales95);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 90));
window.eval(sales98);
await new Promise((resolve) => setTimeout(resolve, 80));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const style = document.getElementById('solrakSalesExactV0198Style')?.textContent || '';
const menu = document.getElementById('solrakSalesV0198Menu');
const labels = [...menu.querySelectorAll('.s98MenuItem')].map((button) => button.dataset.s98Label);
const expected = ['Verificador Precios','Nuevo Ticket','Producto Común','Consultar Ticket','Devolución','Clientes','Productos','Usuarios','Turnos','Caja','Configuración','Reportes'];

assert(window.SOLRAKSalesExactV0198?.version === '0.1.98', 'No cargó v0.1.98');
assert(document.documentElement.dataset.solrakSales98 === '1', 'No activó layout v0.1.98');
assert(menu, 'No creó menú principal v0.1.98');
assert(JSON.stringify(labels) === JSON.stringify(expected), `Orden lateral incorrecto: ${labels.join('|')}`);
assert(menu.querySelector('.s98Hamburger'), 'Falta botón hamburguesa');
assert(!menu.textContent.includes('Ventas Principales'), 'No debe aparecer Ventas Principales');
assert(!menu.textContent.includes('Recargas'), 'No deben aparecer Recargas');
assert(document.querySelector('#solrakFielSidebar .fielBrandText strong')?.textContent === 'SOLRAK', 'Marca visible incorrecta');
assert(document.querySelector('main.shell>.top h1')?.textContent === 'FERRETERÍA AZTLÁN', 'Nombre del negocio no quedó centrado/mayúsculas');
assert(document.getElementById('fielFinishSale')?.textContent === 'FINALIZAR VENTA', 'FINALIZAR VENTA incorrecto');
assert(document.querySelector('.s98TicketNumber')?.textContent === '#769', 'Ticket derecho no quedó como referencia');
assert(document.querySelector('#currentUser strong')?.textContent === 'Administrador', 'Usuario superior incorrecto');
assert(document.querySelector('#currentUser small')?.textContent === 'Administrador', 'Rol superior incorrecto');
assert(document.getElementById('solrakSalesV0198StatusGlyph'), 'Falta indicador inferior derecho');

for (const marker of ['--s98-side:184px','--s98-top:48px','--s98-right:190px','#solrakV0195Menu','height:39px','grid-template-rows:38px minmax(0,1fr)','grid-template-rows:62px minmax(0,1fr)','grid-template-columns:minmax(250px,365px) 78px','height:26px','height:116px','height:166px','height:150px','frTicketNew{display:none']) {
  assert(style.includes(marker), `Contrato visual incompleto: ${marker}`);
}

menu.querySelector('[data-s98-label="Nuevo Ticket"]').click();
assert(calls.get('new-ticket:') === 1, 'Nuevo Ticket perdió acción real');
menu.querySelector('[data-s98-label="Clientes"]').click();
assert(calls.get('tab:clientes') === 1, 'Clientes perdió acción real');

menu.querySelector('[data-s98-label="Caja"]').click();
let flyout = document.getElementById('solrakSalesV0198Flyout');
assert(flyout?.textContent.includes('Entradas') && flyout.textContent.includes('Salidas') && flyout.textContent.includes('Corte de Caja'), 'Caja no conserva opciones');
[...flyout.querySelectorAll('.s98FlyoutItem')].find((b) => b.textContent === 'Salidas').click();
assert(calls.get('cash-out:') === 1, 'Salidas perdió acción real');

menu.querySelector('[data-s98-label="Reportes"]').click();
flyout = document.getElementById('solrakSalesV0198Flyout');
for (const label of ['Resumen de Ventas','Detalle de Ventas','F.P. en Ventas','Inventario','Historial Movimientos','Más Vendidos']) assert(flyout?.textContent.includes(label), `Falta reporte ${label}`);

menu.querySelector('.s98Hamburger').click();
flyout = document.getElementById('solrakSalesV0198Flyout');
for (const label of ['Facturación','Cotizaciones','Proveedores']) assert(flyout?.textContent.includes(label), `Hamburguesa no conserva ${label}`);

window.SOLRAKSalesExactV0198.destroy();
window.SOLRAKSumaSalesV0195.destroy();
window.close();
console.log('SOLRAK_SALES_EXACT_V0198_SMOKE_OK');
