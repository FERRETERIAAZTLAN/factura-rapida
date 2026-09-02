import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const source=fs.readFileSync('solrak-desktop-density-v0183.js','utf8');
assert.match(source,/0\.1\.83/);
assert.match(source,/MAX_TICKETS = 8/);
assert.match(source,/Azul sky/);
assert.match(source,/Gris oscuro/);
assert.match(source,/Rosa intenso/);
assert.match(source,/Morado/);
assert.match(source,/Recargas \/ Servicios/);
assert.match(source,/Cotización borrador/);
assert.match(source,/solrak:scale-reading/);
assert.ok(!/cfdi-api|finkok/i.test(source));

const dom=new JSDOM(`<!doctype html><html data-solrak-fiel="1" data-solrak-professional-pos="1"><head></head><body>
<aside id="solrakFielSidebar"><div class="fielBrand"><div class="fielBrandMark">S</div><div class="fielBrandText">SOLRAK</div></div><div class="fielMenu"><button class="fielMenuGroup" data-fiel-group="products"><svg></svg><span>Productos</span></button><div class="fielSubmenu"></div><button class="fielMenuItem" data-fiel-action="configuration"><svg></svg><span>Configuración</span></button></div><button class="fielFinish"></button></aside>
<main class="shell"><div class="top"><h1>SOLRAK</h1></div><section id="tab-pos"><div class="frPosTop"></div><div class="frTicketBar"><div id="posTickets"><div class="frTicket active" data-ticket="1"><strong>Ticket #1</strong><small>1 prod.</small></div></div><button id="posNewTicket" class="frTicketNew">Nuevo</button></div><div class="frPosGrid"><div class="stack"><article class="card"><div class="frPosSearch"><input id="posSearch"></div><div id="posResults"></div></article><article class="card frPosCartCard"><div class="card-head"><h2 id="posCartTitle">Ticket #1</h2><button id="posClear">Limpiar</button></div><label>Cliente<select id="posClient"><option>Público general</option></select></label><div class="frPosCartHead"><span>Código</span><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div><div id="posCart"><div class="frPosLine" data-pos-line="p1"><div>ABC</div><div><strong>Producto prueba</strong></div><div></div><div>$10</div><div>$10</div></div></div></article><article class="card"><div id="posRecent"></div></article></div><aside class="card summary"><div id="posProductPreview"><img src="https://example.test/product.png"><div class="frPreviewMeta"><strong>Producto prueba</strong></div></div><div id="posTotal">$10.00</div></aside></div></section></main>
</body></html>`,{runScripts:'outside-only',url:'https://solrak.local/'});
const {window}=dom;
window.session={token:'token',business:{code:'AZTLAN'},user:{id:'u1',role:'admin'}};
window.notice=()=>{};
window.money=(v)=>`$${Number(v).toFixed(2)}`;
window.switchTab=()=>{};
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
let paymentOpened=0,rerenders=0,cleared=0;
window.document.getElementById('posClear').onclick=()=>{cleared++};
window.FacturaRapidaPOS={
  cart:[{id:'p1',code:'ABC',name:'Producto prueba',qty:1,stock:5,price:10,iva:16,price_includes_tax:true}],
  tickets:[{id:1,cart:[]}],
  activeTicketId:1,
  openPayment(){paymentOpened++},
  rerender(){rerenders++},
};
window.eval(source);
await new Promise((resolve)=>setTimeout(resolve,80));

assert.ok(window.SOLRAKDesktopDensityV0183);
assert.equal(window.SOLRAKDesktopDensityV0183.maxTickets,8);
assert.ok(window.document.getElementById('solrakSidebarToggle'));
assert.ok(window.document.getElementById('solrakOpsBar'));
assert.ok(window.document.getElementById('solrakActionBar'));
assert.equal(window.document.querySelector('.frTicketBar').parentElement.id,'solrakTicketSlot');
assert.equal(window.document.getElementById('solrakTopTotal').textContent,'$10.00');
assert.ok(window.document.querySelector('#solrakSelectedThumb img'));
assert.equal(window.document.getElementById('solrakScaleWeight').textContent,'— kg');
assert.equal(window.document.getElementById('solrakScaleMeta').textContent,'Sin lectura real');

const services=window.document.querySelector('[data-solrak-action="services"]');
const discount=window.document.querySelector('[data-solrak-action="discount"]');
assert.equal(services.disabled,true,'Recargas no debe simularse sin proveedor productivo');
assert.equal(discount.disabled,true,'Descuento global no debe fingirse sin backend productivo');

window.document.querySelector('[data-solrak-action="finish"]').click();
assert.equal(paymentOpened,1);
window.document.querySelector('[data-solrak-action="clear"]').click();
assert.equal(cleared,1);

const row=window.document.querySelector('[data-pos-line="p1"]');
row.dispatchEvent(new window.MouseEvent('dblclick',{bubbles:true}));
assert.equal(window.document.getElementById('solrakLineEditor').hasAttribute('open'),true);
assert.equal(window.document.getElementById('solrakLineDiscountValue').disabled,true);
window.document.getElementById('solrakLineQty').value='2';
window.document.getElementById('solrakApplyLineEdit').click();
await new Promise((resolve)=>setTimeout(resolve,10));
assert.equal(window.FacturaRapidaPOS.cart[0].qty,2);
assert.equal(rerenders,1);

window.SOLRAKDesktopDensityV0183.setCollapsed(true);
assert.equal(window.document.documentElement.dataset.solrakSidebarCollapsed,'1');
window.SOLRAKDesktopDensityV0183.setCollapsed(false);
assert.equal(window.document.documentElement.dataset.solrakSidebarCollapsed,'0');

window.SOLRAKDesktopDensityV0183.applyTheme('pink');
assert.equal(window.document.documentElement.dataset.solrakTheme,'pink');
assert.equal(window.document.documentElement.style.getPropertyValue('--solrak-accent'),'#d32675');
window.SOLRAKDesktopDensityV0183.applyTheme('custom','#123456');
assert.equal(window.document.documentElement.dataset.solrakTheme,'custom');
assert.equal(window.document.documentElement.style.getPropertyValue('--solrak-accent'),'#123456');

assert.equal(window.SOLRAKDesktopDensityV0183.setScaleReading({weight:1.25,unit:'kg',connected:true,source:'device'}),true);
assert.equal(window.document.getElementById('solrakScaleWeight').textContent,'1.250 kg');
assert.equal(window.SOLRAKDesktopDensityV0183.setScaleReading({weight:99,connected:true,source:'fake'}),false);
assert.equal(window.document.getElementById('solrakScaleWeight').textContent,'— kg');

window.document.getElementById('posTotal').textContent='$25.50';
await new Promise((resolve)=>setTimeout(resolve,10));
assert.equal(window.document.getElementById('solrakTopTotal').textContent,'$25.50');

console.log('SOLRAK v0.1.83 desktop density UI smoke: OK');
