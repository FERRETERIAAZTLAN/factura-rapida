import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const sales95 = fs.readFileSync('solrak-suma-sales-v0195.js', 'utf8');
const sales98 = fs.readFileSync('solrak-sales-exact-v0198.js', 'utf8');
const sales99 = fs.readFileSync('solrak-sales-photo-v0199.js', 'utf8');
const sales200 = fs.readFileSync('solrak-sales-suma-v0200.js', 'utf8');
for (const [name, source] of [['v0195', sales95], ['v0198', sales98], ['v0199', sales99], ['v0200', sales200]]) {
  new vm.Script(source, { filename: `solrak-sales-${name}.js` });
}

const html = `<!doctype html><html><head></head><body>
<aside id="solrakFielSidebar">
  <div class="fielBrand"><div class="fielBrandMark">S</div><div class="fielBrandText"><strong>SOLRAK</strong><small>PUNTO DE VENTA</small></div></div>
  <div class="fielMenu">
    <button data-fiel-action="new-ticket">Nuevo Ticket</button><button data-fiel-action="price-check">Verificador</button><button data-fiel-action="common-product">Producto Común</button><button data-fiel-action="ticket-search">Consultar Ticket</button><button data-fiel-action="return-sale">Devolución</button>
    <button data-fiel-action="tab" data-tab-target="factura">Facturación</button><button data-fiel-action="tab" data-tab-target="cotizaciones">Cotizaciones</button><button data-fiel-action="tab" data-tab-target="clientes">Clientes</button><button data-fiel-action="tab" data-tab-target="inventario">Inventario</button><button data-fiel-action="tab" data-tab-target="proveedores">Proveedores</button><button data-fiel-action="tab" data-tab-target="usuarios">Usuarios</button>
    <button data-fiel-action="shifts">Turnos</button><button data-fiel-action="cash-in">Entradas</button><button data-fiel-action="cash-out">Salidas</button><button data-fiel-action="cash-cut">Corte de Caja</button><button data-fiel-action="configuration">Configuración</button><button data-fiel-action="sales-report">Reporte</button>
  </div><button id="fielFinishSale">Finalizar venta</button>
</aside>
<main class="shell"><header class="top"><div><p class="eyebrow">SISTEMA</p><h1>Ferretería Aztlán</h1><p id="businessName">AZTLAN</p></div><div class="top-actions"><span class="pill ok">En línea</span><button class="fielMailTop">Correo</button><button id="currentUser">Administrador</button><button id="changePinBtn">PIN</button><button id="logoutBtn">Salir</button></div></header>
<section id="tab-pos">
  <div class="frPosTop"><div><h2>Agregar Inventario</h2></div><div id="solrakV0195Scale"><svg></svg><span>Báscula</span></div></div>
  <div class="frPosGrid"><div class="stack">
    <article id="realSearchCard"><div class="frPosSearch"><input id="posSearch"><button id="solrakV0195SearchBtn">Buscar</button></div><div id="posResults"></div></article>
    <article id="realCartCard" class="frPosCartCard"><div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span><span>Mayoreo</span><span>Descuento</span></div><div class="frPosCart"><div class="frPosLine"><div>ABC</div><div>Producto real</div><div>1</div><div>$10</div><div>$10</div><div>No</div><div>0%</div></div></div>
      <div class="fielPosActions"><div class="fielPosStats"><span>Cantidad de Productos <strong>1</strong></span><span>Tecla Rapida</span><span>Tipo Cambio <b>$0.00</b></span></div><div class="fielPosTools"><button class="fielPosTool" data-fiel-pos-tool="common"><svg></svg>Producto común</button><button class="fielPosTool" data-fiel-pos-tool="discount"><svg></svg>Aplicar descuento</button><button class="fielPosTool" data-fiel-pos-tool="clear"><svg></svg>Eliminar</button><button class="fielPosTool" data-fiel-pos-tool="print"><svg></svg>Imprimir</button></div></div>
    </article>
  </div><aside id="realSummary" class="summary"><div class="frPreview"><img alt="producto"><div class="frPreviewMeta">Producto</div></div><div class="frTicketBar"><div id="posTickets"><div class="frTicket active"><strong>Ticket #769</strong><span class="frTicketClose">×</span></div></div><button class="frTicketNew" id="posNewTicket">Nuevo ticket</button></div><div class="frPosTotals"><div><span>Subtotal</span><strong>$0</strong></div><div><span>IVA</span><strong>$0</strong></div><div class="frPosGrand"><span>Total</span><strong>$10.00</strong></div></div></aside></div>
</section></main><div id="solrakV0195Footer">martes, 1 de septiembre de 2026 04:02:31</div></body></html>`;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const { document } = window;
window.session = { user: { role: 'admin' } };
window.FacturaRapidaPOS = { cart: [], newTicket() {} };
window.SOLRAKSumaproFielV0171 = { openTab() {}, openConfiguration() {} };

const originalSearch = document.getElementById('posSearch');
const originalSearchCard = document.getElementById('realSearchCard');
const originalCartCard = document.getElementById('realCartCard');
const originalSummary = document.getElementById('realSummary');
const originalFinish = document.getElementById('fielFinishSale');
const originalDiscount = document.querySelector('[data-fiel-pos-tool="discount"]');
let finishClicks = 0;
let discountClicks = 0;
originalFinish.addEventListener('click', () => finishClicks++);
originalDiscount.addEventListener('click', () => discountClicks++);

window.eval(sales95);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 80));
window.eval(sales98); await new Promise((resolve) => setTimeout(resolve, 70));
window.eval(sales99); await new Promise((resolve) => setTimeout(resolve, 70));
window.eval(sales200); await new Promise((resolve) => setTimeout(resolve, 90));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const api = window.SOLRAKSalesSumaV0200;
const workspace = document.getElementById('solrakSalesSumaV0200Workspace');
const style = document.getElementById('solrakSalesSumaV0200Style')?.textContent || '';
assert(api?.version === '0.2.00', 'No cargó SOLRAK ventas v0.2.00');
assert(api.reference.width === 1448 && api.reference.height === 1086, 'No usa la dimensión real de la fotografía Suma');
assert(api.reference.sidebar === 260 && api.reference.topbar === 74, 'Referencia geométrica Suma incorrecta');
assert(document.documentElement.dataset.solrakSales200 === '1', 'No activó layout estructural');
assert(workspace, 'No se creó workspace estructural');
assert(workspace.querySelector(':scope > .frPosTop'), 'Agregar Inventario no está en workspace');
assert(workspace.querySelector('.s200Left > #realSearchCard') === originalSearchCard, 'Se clonó/reemplazó búsqueda real');
assert(workspace.querySelector('.s200Left > #realCartCard') === originalCartCard, 'Se clonó/reemplazó carrito real');
assert(workspace.querySelector('.s200Right#realSummary') === originalSummary, 'Se clonó/reemplazó resumen real');
assert(document.getElementById('posSearch') === originalSearch, 'Se reemplazó input real');
assert(document.getElementById('fielFinishSale') === originalFinish, 'Se reemplazó finalizar venta');
assert(document.querySelector('[data-fiel-pos-tool="discount"]') === originalDiscount, 'Se reemplazó descuento real');
originalFinish.click(); originalDiscount.click();
assert(finishClicks === 1, 'Se perdió handler de finalizar venta');
assert(discountClicks === 1, 'Se perdió handler de descuento');
assert(document.querySelector('[data-s200-old-grid="1"]')?.hidden === true, 'Estructura vieja sigue visible');
assert(document.getElementById('solrakSalesPhotoV0199Style')?.media === 'not all', 'v0.1.99 sigue compitiendo');
assert(document.getElementById('solrakSalesExactV0198Style')?.media === 'not all', 'v0.1.98 sigue compitiendo');

const menu = document.getElementById('solrakSalesV0198Menu');
assert(menu, 'Se perdió menú funcional');
const labels = [...menu.querySelectorAll('.s98MenuItem')].map((button) => button.dataset.s98Label);
assert(JSON.stringify(labels) === JSON.stringify(['Verificador Precios','Nuevo Ticket','Producto Común','Consultar Ticket','Devolución','Clientes','Productos','Usuarios','Turnos','Caja','Configuración','Reportes']), 'Menú no coincide con Suma');
assert(!document.body.textContent.includes('Recargas'), 'Apareció Recargas');
assert(document.getElementById('fielFinishSale')?.textContent === 'FINALIZAR VENTA', 'Falta FINALIZAR VENTA exacto');
assert(document.getElementById('solrakV0195SearchBtn')?.textContent === 'BUSCAR', 'Falta BUSCAR exacto');
assert(document.querySelector('.s98TicketNumber')?.textContent === '#769', 'Se perdió ticket activo');
const header = document.querySelector('.frPosCartHead');
assert(header?.children.length === 7, `La tabla no conserva siete columnas directas: ${header?.children.length ?? 0}`);
for (const label of ['Código','Producto','Cantidad','Precio','Importe','Mayoreo','Descuento']) assert(header?.textContent.includes(label), `Falta columna ${label}`);
for (const label of ['Aplicar Descuento a la Venta','Eliminar Productos En Venta','Imprimir Ticket En Venta']) assert(document.body.textContent.includes(label), `Falta acción ${label}`);
for (const marker of ['--s200-side:clamp(232px,17.96vw,260px)','--s200-top:clamp(58px,6.82vh,74px)','grid-template-columns:minmax(0,1fr) var(--s200-right)','.s200SearchCard','.s200CartCard','.s200Right','background:linear-gradient(90deg,var(--s200-orange),var(--s200-orange2))','background:linear-gradient(90deg,#ffad00,#ffc21a)','font:400 clamp(42px,4vw,58px)/1 Georgia']) assert(style.includes(marker), `Falta contrato visual: ${marker}`);

api.destroy();
assert(!document.getElementById('solrakSalesSumaV0200Workspace'), 'destroy no retiró workspace');
assert(document.getElementById('realSearchCard') === originalSearchCard, 'destroy no restauró búsqueda');
assert(document.getElementById('realCartCard') === originalCartCard, 'destroy no restauró carrito');
assert(document.getElementById('realSummary') === originalSummary, 'destroy no restauró resumen');
window.SOLRAKSalesPhotoV0199?.destroy?.(); window.SOLRAKSalesExactV0198?.destroy?.(); window.SOLRAKSumaSalesV0195?.destroy?.();
window.close();
console.log('SOLRAK_SALES_SUMA_V0200_SMOKE_OK');
