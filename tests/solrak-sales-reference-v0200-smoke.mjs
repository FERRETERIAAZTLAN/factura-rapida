import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const sales95 = fs.readFileSync('solrak-suma-sales-v0195.js', 'utf8');
const sales98 = fs.readFileSync('solrak-sales-exact-v0198.js', 'utf8');
const sales99 = fs.readFileSync('solrak-sales-photo-v0199.js', 'utf8');
const sales200 = fs.readFileSync('solrak-sales-reference-v0200.js', 'utf8');
for (const [name, source] of [
  ['solrak-suma-sales-v0195.js', sales95],
  ['solrak-sales-exact-v0198.js', sales98],
  ['solrak-sales-photo-v0199.js', sales99],
  ['solrak-sales-reference-v0200.js', sales200]
]) new vm.Script(source, { filename: name });

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
<main class="shell"><header class="top"><div><h1>Ferretería Aztlán</h1></div><div class="top-actions"><button class="fielMailTop">Correo</button><button id="currentUser"><strong>Administrador</strong><small>Administrador</small></button><button id="logoutBtn">Salir</button></div></header>
<section id="tab-pos">
  <div class="frPosTop"><div><h2>Agregar Inventario</h2></div><div id="solrakV0195Scale"><svg></svg><span>Báscula</span></div></div>
  <div class="frPosGrid"><div class="stack">
    <article><div class="frPosSearch"><input id="posSearch" placeholder="Buscar producto"><button id="solrakV0195SearchBtn">Buscar</button></div><div id="posResults"></div></article>
    <article class="frPosCartCard"><div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span><span>Mayoreo</span><span>Descuento</span></div><div class="frPosCart"></div>
      <div class="fielPosActions"><div class="fielPosStats"><span>Cantidad de Productos <strong>0</strong></span><span>Tecla Rapida</span><span>Tipo Cambio <b>$0.00</b></span></div><div class="fielPosTools"><button class="fielPosTool" data-fiel-pos-tool="common"><svg></svg>Producto común</button><button class="fielPosTool" data-fiel-pos-tool="discount"><svg></svg>Aplicar descuento</button><button class="fielPosTool" data-fiel-pos-tool="clear"><svg></svg>Eliminar</button><button class="fielPosTool" data-fiel-pos-tool="print"><svg></svg>Imprimir</button></div></div>
    </article>
  </div><aside class="summary"><div class="frPreview"></div><div class="frTicketBar"><div id="posTickets"><div class="frTicket active"><strong>Ticket #769</strong><span class="frTicketClose">×</span></div></div><button class="frTicketNew" id="posNewTicket">Nuevo ticket</button></div><div class="frPosTotals"><div><span>Subtotal</span><strong>$0</strong></div><div><span>IVA</span><strong>$0</strong></div><div class="frPosGrand"><span>Total</span><strong>$0.00</strong></div></div></aside></div>
</section></main>
<div id="solrakV0195Footer">martes, 1 de septiembre de 2026 04:02:31</div>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const { document } = window;
window.session = { user: { role: 'admin' } };
window.FacturaRapidaPOS = { cart: [], newTicket() {} };
window.SOLRAKSumaproFielV0171 = { openTab() {}, openConfiguration() {} };

window.eval(sales95);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 80));
window.eval(sales98);
await new Promise((resolve) => setTimeout(resolve, 70));
window.eval(sales99);
await new Promise((resolve) => setTimeout(resolve, 70));
window.eval(sales200);
await new Promise((resolve) => setTimeout(resolve, 70));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const api = window.SOLRAKSalesReferenceV0200;
const style = document.getElementById('solrakSalesReferenceV0200Style')?.textContent || '';
const menu = document.getElementById('solrakSalesV0198Menu');

assert(api?.version === '0.2.00', 'No cargó ventas v0.2.00');
assert(document.documentElement.dataset.solrakSales200 === '1', 'No activó layout v0.2.00');
assert(document.documentElement.dataset.solrakSales99 === '1', 'Se perdió la capa v0.1.99');
assert(menu, 'Se perdió menú real v0.1.98');
assert(document.getElementById('fielFinishSale')?.textContent === 'FINALIZAR VENTA', 'Se perdió FINALIZAR VENTA');
assert(document.querySelector('.s98TicketNumber')?.textContent === '#769', 'Se perdió ticket activo');
assert(document.getElementById('posSearch')?.placeholder === '', 'El buscador no quedó limpio como referencia');
assert(document.getElementById('solrakV0195SearchBtn')?.textContent === 'BUSCAR', 'BUSCAR no quedó exacto');

const ref = api.reference;
assert(ref.sourceWidth === 1448 && ref.sourceHeight === 1086, 'Referencia original incorrecta');
assert(ref.viewportWidth === 1366 && ref.viewportHeight === 768, 'Viewport objetivo incorrecto');
assert(ref.sidebar === 245 && ref.topbar === 52 && ref.rightPanel === 250, 'Proporciones principales incorrectas');
assert(ref.hamburger === 43 && ref.menuItem === 49 && ref.finish === 49 && ref.finishBottomGap === 17, 'Sidebar no coincide con referencia');
assert(ref.posTop === 50 && ref.searchBand === 67 && ref.searchInput === 31 && ref.searchButton === 31, 'Zona superior no coincide');
assert(ref.bottomActions === 122 && ref.bottomGap === 99, 'Acciones inferiores no coinciden');
assert(ref.previewTop === 54 && ref.previewWidth === 192 && ref.previewHeight === 185, 'Vista previa no coincide');
assert(ref.totalsHeight === 112 && ref.totalsBottom === 106 && ref.footerBottom === 28, 'Total/footer no coinciden');

for (const marker of [
  '--s200-side:245px',
  '--s200-top:52px',
  '--s200-right:250px',
  'height:49px',
  'margin:0 5px 17px',
  'grid-template-rows:50px minmax(0,1fr)',
  'grid-template-rows:67px minmax(0,1fr)',
  'border:1.5px solid #ff6b22',
  'grid-template-columns:minmax(250px,489px) 104px',
  'bottom:99px',
  'height:122px',
  'width:192px',
  'height:185px',
  'bottom:106px',
  'height:112px',
  'right:118px',
  'bottom:28px',
  'font:400 45px/1 Georgia'
]) assert(style.includes(marker), `Contrato visual incompleto: ${marker}`);

const labels = [...menu.querySelectorAll('.s98MenuItem')].map((button) => button.dataset.s98Label);
assert(JSON.stringify(labels) === JSON.stringify(['Verificador Precios','Nuevo Ticket','Producto Común','Consultar Ticket','Devolución','Clientes','Productos','Usuarios','Turnos','Caja','Configuración','Reportes']), 'Cambió el menú lateral');
assert(!menu.textContent.includes('Recargas'), 'Apareció Recargas');
assert(document.querySelector('#solrakFielSidebar .fielBrandText strong')?.textContent === 'SOLRAK', 'Cambió marca SOLRAK');
assert(document.querySelector('[data-fiel-pos-tool="discount"]')?.textContent.includes('Aplicar Descuento a la Venta'), 'Falta texto exacto de descuento');
assert(document.querySelector('[data-fiel-pos-tool="clear"]')?.textContent.includes('Eliminar Productos En Venta'), 'Falta texto exacto de eliminar');
assert(document.querySelector('[data-fiel-pos-tool="print"]')?.textContent.includes('Imprimir Ticket En Venta'), 'Falta texto exacto de imprimir');

api.destroy();
window.SOLRAKSalesPhotoV0199?.destroy?.();
window.SOLRAKSalesExactV0198?.destroy?.();
window.SOLRAKSumaSalesV0195?.destroy?.();
await new Promise((resolve) => setTimeout(resolve, 30));
window.close();
console.log('SOLRAK_SALES_REFERENCE_V0200_SMOKE_OK');
