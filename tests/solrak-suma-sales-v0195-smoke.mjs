import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('solrak-suma-sales-v0195.js', 'utf8');
new vm.Script(source, { filename: 'solrak-suma-sales-v0195.js' });

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
<main class="shell"><header class="top"><div><h1>FERRETERÍA AZTLÁN</h1></div></header>
<section id="tab-pos">
  <div class="frPosTop"><div><h2>Punto de venta</h2></div></div>
  <div class="frPosGrid"><div class="stack">
    <article><div class="frPosSearch"><input id="posSearch"></div><div id="posResults"></div></article>
    <article class="frPosCartCard"><div class="card-head"></div><label><select id="posClient"></select></label>
      <div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div>
      <div id="posCart"><div class="frPosLine" data-pos-line="p1"><div class="frPosCode">ABC</div><div class="frPosProduct"><strong>Martillo</strong><small>Pieza</small></div><div class="frPosQty"><button>-</button><input value="2"><button>+</button></div><div class="frPosUnitPrice">$100</div><div class="frPosLineTotal"><strong>$180</strong><button class="trash">×</button></div></div></div>
      <div class="fielPosActions"><div class="fielPosStats"><span>Cantidad de Productos <strong>2</strong></span><span>Tecla Rápida · F2</span><span>Tipo Cambio <b>$0.00</b></span></div><div class="fielPosTools"><button data-fiel-pos-tool="common">Producto común</button><button data-fiel-pos-tool="discount">Aplicar descuento</button><button data-fiel-pos-tool="clear">Eliminar</button><button data-fiel-pos-tool="print">Imprimir</button></div></div>
    </article>
  </div><aside class="summary"><div class="card-head"></div><div class="frPreview"></div><div class="frTicketBar"><div id="posTickets"><div class="frTicket active"><strong>Ticket #1</strong><span class="frTicketClose">×</span></div></div><button class="frTicketNew" id="posNewTicket">Nuevo ticket</button></div><div class="frPosTotals"><div><span>Subtotal</span><strong>$0</strong></div><div><span>IVA</span><strong>$0</strong></div><div class="frPosGrand"><span>Total</span><strong>$180.00</strong></div></div></aside></div>
</section></main>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.FacturaRapidaPOS = { cart: [{ id: 'p1', price: 90, list_price: 100, wholesale: 82, qty: 2 }], newTicket() {} };
window.SOLRAKSumaproFielV0171 = { openTab() {}, openConfiguration() {} };
window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 80));

const document = window.document;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(document.documentElement.dataset.solrakSumaSales95 === '1', 'No activó layout v0.1.95');
assert(document.querySelector('#solrakV0195Menu'), 'No creó menú lateral v0.1.95');
assert(document.querySelector('#solrakV0195LegacyMenu'), 'No conservó menú funcional legado');
assert(document.querySelector('#solrakV0195Menu').textContent.includes('Ventas Principales'), 'Falta Ventas Principales');
assert(document.querySelector('#solrakV0195Menu').textContent.includes('Turnos'), 'Falta Turnos');
assert(document.querySelector('#solrakV0195Menu').textContent.includes('Caja'), 'Falta Caja');
assert(document.querySelector('#solrakV0195Menu').textContent.includes('Configuración'), 'Falta Configuración');
assert(document.querySelector('#solrakV0195Menu').textContent.includes('Reportes'), 'Falta Reportes');
for (const label of ['Resumen de Ventas','Detalle de Ventas','F.P. en Ventas','Inventario','Historial Movimientos','Más Vendidos']) assert(document.querySelector('#solrakV0195Menu').textContent.includes(label), `Falta reporte ${label}`);
assert(!document.querySelector('#solrakV0195Menu').textContent.includes('Recargas'), 'No deben aparecer Recargas');
assert(document.querySelector('#solrakV0195Scale'), 'Falta indicador de báscula');
assert(document.querySelector('#solrakV0195SearchBtn')?.textContent === 'BUSCAR', 'Falta botón BUSCAR');
const headers = [...document.querySelectorAll('.frPosCartHead > span')].map((x) => x.textContent.trim());
assert(headers.join('|') === 'Código|Nombre del Producto|Cantidad|Precio|Importe|Mayoreo|Descuento', `Columnas incorrectas: ${headers.join('|')}`);
assert(document.querySelector('.s95Wholesale')?.textContent.includes('$82'), 'No pintó precio mayoreo');
assert(document.querySelector('.s95Discount')?.textContent.includes('$20'), 'No calculó descuento visible');
assert(document.querySelector('[data-fiel-pos-tool="discount"] svg'), 'Falta icono de descuento');
assert(document.querySelector('[data-fiel-pos-tool="clear"] svg'), 'Falta icono de eliminar');
assert(document.querySelector('[data-fiel-pos-tool="print"] svg'), 'Falta icono de impresión');

document.dispatchEvent(new window.CustomEvent('solrak:scale-weight', { detail: { weight: 1.25, unit: 'kg' } }));
assert(document.querySelector('.s95ScaleValue')?.textContent === '1.250 kg', 'No actualizó peso real');

window.SOLRAKSumaSalesV0195.destroy();
window.close();
console.log('SOLRAK_SUMA_SALES_V0195_SMOKE_OK');