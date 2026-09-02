import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const files = [
  'solrak-suma-sales-v0195.js',
  'solrak-sales-exact-v0198.js',
  'solrak-sales-photo-v0199.js',
  'solrak-sales-reference-v0200.js',
  'solrak-sales-suma-v0201.js'
];
const source = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
for (const [file, code] of Object.entries(source)) new vm.Script(code, { filename: file });

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
    <article id="realCartCard" class="frPosCartCard"><div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div><div class="frPosCart"><div class="frPosLine"><div>ABC</div><div>Producto real</div><div>1</div><div>$10</div><div>$10</div></div></div>
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

const original = {
  search: document.getElementById('posSearch'),
  searchCard: document.getElementById('realSearchCard'),
  cartCard: document.getElementById('realCartCard'),
  summary: document.getElementById('realSummary'),
  finish: document.getElementById('fielFinishSale'),
  discount: document.querySelector('[data-fiel-pos-tool="discount"]')
};
let finishClicks = 0;
let discountClicks = 0;
original.finish.addEventListener('click', () => finishClicks++);
original.discount.addEventListener('click', () => discountClicks++);

window.eval(source['solrak-suma-sales-v0195.js']);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((r) => setTimeout(r, 80));
window.eval(source['solrak-sales-exact-v0198.js']); await new Promise((r) => setTimeout(r, 60));
window.eval(source['solrak-sales-photo-v0199.js']); await new Promise((r) => setTimeout(r, 60));
window.eval(source['solrak-sales-reference-v0200.js']); await new Promise((r) => setTimeout(r, 60));
window.eval(source['solrak-sales-suma-v0201.js']); await new Promise((r) => setTimeout(r, 100));

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const api = window.SOLRAKSalesSumaV0201;
const workspace = document.getElementById('solrakSalesSumaV0201Workspace');
assert(api?.version === '0.2.01', 'No cargó v0.2.01');
assert(api.reference.width === 1448 && api.reference.height === 1086, 'Referencia visual incorrecta');
assert(document.documentElement.dataset.solrakSales201 === '1', 'No activó layout v0.2.01');
assert(workspace, 'No creó workspace estructural');
assert(workspace.querySelector('.s201Left > #realSearchCard') === original.searchCard, 'Reemplazó la búsqueda real');
assert(workspace.querySelector('.s201Left > #realCartCard') === original.cartCard, 'Reemplazó el carrito real');
assert(workspace.querySelector('.s201Right#realSummary') === original.summary, 'Reemplazó el resumen real');
assert(document.getElementById('posSearch') === original.search, 'Reemplazó el input real');
assert(document.getElementById('fielFinishSale') === original.finish, 'Reemplazó FINALIZAR VENTA');
assert(document.querySelector('[data-fiel-pos-tool="discount"]') === original.discount, 'Reemplazó descuento real');
original.finish.click(); original.discount.click();
assert(finishClicks === 1, 'Perdió handler de finalizar venta');
assert(discountClicks === 1, 'Perdió handler de descuento');
assert(document.querySelector('[data-s201-old-grid="1"]')?.hidden === true, 'Estructura vieja sigue visible');
for (const id of ['solrakSumaSalesV0195Style','solrakSalesExactV0198Style','solrakSalesPhotoV0199Style','solrakSalesReferenceV0200Style']) {
  const style = document.getElementById(id);
  if (style) assert(style.media === 'not all', `${id} sigue compitiendo con v0.2.01`);
}
const menu = document.getElementById('solrakSalesV0198Menu');
const labels = [...menu.querySelectorAll('.s98MenuItem')].map((button) => button.dataset.s98Label);
assert(JSON.stringify(labels) === JSON.stringify(['Verificador Precios','Nuevo Ticket','Producto Común','Consultar Ticket','Devolución','Clientes','Productos','Usuarios','Turnos','Caja','Configuración','Reportes']), 'Menú no coincide con Suma');
assert(!document.body.textContent.includes('Recargas'), 'Apareció Recargas');
assert(original.finish.textContent === 'FINALIZAR VENTA', 'Etiqueta FINALIZAR VENTA incorrecta');
assert(document.getElementById('solrakV0195SearchBtn').textContent === 'BUSCAR', 'Etiqueta BUSCAR incorrecta');
const header = document.querySelector('.frPosCartHead');
assert(header.children.length === 7, `Columnas directas incorrectas: ${header.children.length}`);
for (const label of ['Código','Producto','Cantidad','Precio','Importe','Mayoreo','Descuento']) assert(header.textContent.includes(label), `Falta ${label}`);
for (const label of ['Aplicar Descuento a la Venta','Eliminar Productos En Venta','Imprimir Ticket En Venta']) assert(document.body.textContent.includes(label), `Falta ${label}`);

const css = document.getElementById('solrakSalesSumaV0201Style')?.textContent || '';
for (const marker of ['--s201-side:clamp(220px,17.96vw,260px)','--s201-top:clamp(56px,6.82vh,74px)','grid-template-columns:minmax(0,1fr) var(--s201-right)','s201SearchCard','s201CartCard','s201Right','linear-gradient(90deg,#ffad00,#ffc21a)']) assert(css.includes(marker), `Falta contrato visual ${marker}`);

api.destroy();
assert(!document.getElementById('solrakSalesSumaV0201Workspace'), 'destroy no retiró workspace');
assert(document.getElementById('realSearchCard') === original.searchCard, 'destroy no restauró búsqueda');
assert(document.getElementById('realCartCard') === original.cartCard, 'destroy no restauró carrito');
assert(document.getElementById('realSummary') === original.summary, 'destroy no restauró resumen');
window.SOLRAKSalesReferenceV0200?.destroy?.();
window.SOLRAKSalesPhotoV0199?.destroy?.();
window.SOLRAKSalesExactV0198?.destroy?.();
window.SOLRAKSumaSalesV0195?.destroy?.();
window.close();
console.log('SOLRAK_SALES_SUMA_V0201_SMOKE_OK');
