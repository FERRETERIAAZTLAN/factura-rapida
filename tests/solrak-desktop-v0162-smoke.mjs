import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const code=fs.readFileSync('solrak-desktop-v0162.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body><main class="shell"><div class="top"><div></div></div><nav class="nav"><button data-tab="factura" class="active">Factura</button><button data-tab="inventario">Productos <span class="count">1</span></button><button data-tab="clientes">Clientes</button><button data-tab="historial">Historial</button><button data-tab="configuracion">Configuración</button></nav><section id="tab-inventario" class="tab-panel"></section></main></body></html>`,{url:'https://example.test',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
if(window.HTMLDialogElement){window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}}
const calls=[];
window.ANON_KEY='anon-test';
window.session={token:'session-test',user:{id:'u1',role:'admin'},business:{id:'b1',name:'Negocio'}};
window.products=[{id:'p1',code:'ABC-1',category:'TRUPER',name:'Producto real',description:'Descripción real',stock:17.5,cost:21.75,wholesale:31.5,price:39.9,min_stock:3,max_stock:25,iva:16,unit:'Pieza',sat_key:'27111700',unit_key:'H87',active:true,price_includes_tax:true,source:'Suma Pro',image_path:'b1/p1/existing.webp'}];
window.openProduct=()=>{throw new Error('Se abrió el editor legacy')};
window.busy=()=>{};
window.notice=(text,error=false)=>{window.__notice={text,error}};
window.loadAll=async()=>{};
window.FacturaRapidaProductImages={refresh:async()=>{}};
window.api=async(action,payload)=>{calls.push({action,payload});if(action==='saveProduct')return {ok:true,product:{...payload.product,id:payload.product.id||'new-id'}};throw new Error('acción inesperada '+action)};
window.fetch=async()=>{throw new Error('No debía llamar image API sin archivo')};

window.eval(code);
await new Promise(r=>setTimeout(r,40));
function assert(cond,msg){if(!cond)throw new Error(msg)}

assert(window.SolrakDesktopV0162?.version==='0.1.62','No arrancó SOLRAK desktop v0.1.62');
assert(window.document.documentElement.dataset.solrakDesktop==='1','No se activó el shell de escritorio');
assert(window.document.getElementById('solrakAppBrand')?.textContent.includes('SOLRAK'),'No aparece SOLRAK en el lateral');
assert(window.document.querySelector('[data-tab="inventario"] .solrakNavText')?.textContent==='Inventario','Inventario no se renombró correctamente');
assert(window.document.querySelector('.solrakNavSection')?.textContent,'No se montaron secciones del menú');

window.openProduct(window.products[0]);
assert(window.document.getElementById('solrakProductDialog')?.hasAttribute('open'),'No abrió el editor SOLRAK');
assert(window.document.getElementById('spCode').value==='ABC-1','Código no se preservó');
assert(window.document.getElementById('spCategory').value==='TRUPER','Categoría no se preservó');
assert(Number(window.document.getElementById('spStock').value)===17.5,'Existencia fue modificada al abrir');
assert(Number(window.document.getElementById('spCost').value)===21.75,'Costo fue modificado al abrir');
assert(Number(window.document.getElementById('spWholesale').value)===31.5,'Mayoreo fue modificado al abrir');
assert(Number(window.document.getElementById('spPrice').value)===39.9,'Precio público fue modificado al abrir');
assert(Number(window.document.getElementById('spMinStock').value)===3,'Mínimo fue modificado al abrir');
assert(Number(window.document.getElementById('spMaxStock').value)===25,'Máximo fue modificado al abrir');
assert(calls.length===0,'Abrir el editor hizo una escritura');

window.document.getElementById('solrakProductForm').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
await new Promise(r=>setTimeout(r,50));
assert(calls.length===1&&calls[0].action==='saveProduct','Guardar no hizo exactamente un saveProduct');
const p=calls[0].payload.product;
assert(p.id==='p1','Guardar perdió el id');
assert(p.stock===17.5&&p.cost===21.75&&p.wholesale===31.5&&p.price===39.9,'Guardar alteró precios/existencia sin edición');
assert(p.min_stock===3&&p.max_stock===25,'Guardar alteró mínimos/máximos');
assert(p.sat_key==='27111700'&&p.unit_key==='H87','Guardar alteró claves SAT');
assert(p.active===true&&p.price_includes_tax===true,'Guardar alteró flags');
assert(!code.includes('1.65')&&!code.includes('*65')&&!code.includes('65%'),'El editor contiene una regla automática de margen');
assert(!code.includes('cfdi-api')&&!code.includes('finkok'),'El rediseño tocó CFDI/Finkok');

window.close();
console.log('SOLRAK_DESKTOP_V0162_SMOKE_OK sidebar=ok productValuesPreserved=true noWriteBeforeSave=true noCfdi=true');
