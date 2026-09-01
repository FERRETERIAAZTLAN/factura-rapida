import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const code=fs.readFileSync('solrak-desktop-v0163.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<main class="shell"><div class="top">Top</div><nav class="nav">
<button data-tab="pos" class="active"><span class="solrakNavText">Ventas</span></button>
<button data-tab="inventario"><span class="solrakNavText">Inventario</span></button>
<button data-tab="clientes"><span class="solrakNavText">Clientes</span></button>
<button data-tab="configuracion"><span class="solrakNavText">Configuración</span></button>
</nav>
<section id="tab-pos" class="tab-panel"></section><section id="tab-inventario" class="tab-panel hidden"></section>
</main></body></html>`,{url:'https://example.test',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.session={business:{id:'b1',name:'Negocio de prueba'},user:{role:'admin'}};
let fetchCalls=0;window.fetch=async()=>{fetchCalls++;throw new Error('No network expected')};
window.eval(code);
await new Promise(r=>setTimeout(r,80));
const d=window.document;
const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(d.documentElement.dataset.solrakDesktopPolish==='1','No activó modo escritorio pulido');
assert(d.querySelectorAll('.nav .solrakNavIcon').length===4,'No agregó iconos a navegación');
assert(d.querySelector('#solrakContextBar h1')?.textContent==='Ventas','Contexto inicial incorrecto');
assert(d.querySelector('#solrakContextBar p')?.textContent.includes('Punto de venta'),'Subtítulo inicial incorrecto');
assert(d.querySelector('#solrakNavFooter strong')?.textContent==='Negocio de prueba','Footer no respeta negocio actual');
assert(d.querySelector('#solrakNavFooter')?.textContent.includes('v0.1.63'),'Footer no muestra versión');
const pos=d.querySelector('[data-tab="pos"]'),inv=d.querySelector('[data-tab="inventario"]');pos.classList.remove('active');inv.classList.add('active');inv.click();
await new Promise(r=>setTimeout(r,20));
assert(d.querySelector('#solrakContextBar h1')?.textContent==='Inventario','Contexto no siguió pestaña activa');
assert(fetchCalls===0,'La capa visual hizo llamadas de red');
assert(!/\b(fetch|XMLHttpRequest|saveProduct|completeSale|cfdi-api|finkok)\b/i.test(code),'La capa visual contiene lógica de datos o CFDI');
assert(!/\.price\s*=|\.stock\s*=|price\s*:\s*|stock\s*:\s*/i.test(code),'La capa visual intenta modificar precio/existencia');
console.log('SOLRAK_DESKTOP_V0163_SMOKE_OK icons=4 context=ok business=dynamic network=0 dataWrites=0');
