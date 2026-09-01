import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const pos=fs.readFileSync('pos-module.js','utf8');
const workspace=fs.readFileSync('solrak-pos-workspace-v0165.js','utf8');
const dom=new JSDOM('<!doctype html><html><head></head><body><main class="shell"><header class="top">Encabezado</header><nav class="nav"><button data-tab="factura" class="active">Facturación</button></nav><div class="statusgrid">Fiscal</div><section id="tab-factura" class="tab-panel"></section></main></body></html>',{runScripts:'dangerously',url:'https://example.test'});
const {window}=dom;
if(window.HTMLDialogElement){window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}}
window.ANON_KEY='public-test-key';
window.session={token:'session-test',user:{role:'admin'},business:{id:'b1',name:'Negocio'}};
window.products=Array.from({length:30},(_,i)=>({id:`p${i}`,code:`75${i}`,name:`Producto ${i}`,price:10,stock:5,iva:16,price_includes_tax:true,unit:'Pieza',active:true}));
window.clients=[];window.esc=v=>String(v??'');window.money=n=>'$'+Number(n||0).toFixed(2);window.busy=()=>{};window.notice=()=>{};window.isAdmin=()=>true;window.confirm=()=>true;window.loadAll=async()=>{};
window.switchTab=tab=>{window.document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));window.document.getElementById(`tab-${tab}`)?.classList.remove('hidden')};
window.fetch=async(url,opt={})=>{const body=JSON.parse(opt.body||'{}');let data={};if(body.action==='bootstrap')data={registers:[],openSession:null,recentSales:[],supplierCount:0};if(body.action==='listSuppliers')data={suppliers:[]};return{ok:true,status:200,json:async()=>data}};

window.eval(pos);window.eval(workspace);
await new Promise(resolve=>setTimeout(resolve,1100));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const panel=window.document.getElementById('tab-pos');
assert(panel,'Falta el POS');
assert(!window.document.documentElement.dataset.solrakPosWorkspace,'El modo caja se activó fuera de Ventas');
window.switchTab('pos');window.SOLRAKPOSWorkspaceV0165.updateMode();
assert(window.document.documentElement.dataset.solrakPosWorkspace==='1','Ventas no activó el espacio de caja');
assert(window.document.querySelector('#tab-pos aside.summary>.frTicketBar'),'Los tickets no pasaron al panel derecho');
assert(window.document.getElementById('posResults').textContent.includes('Escanea un código'),'La búsqueda vacía sigue llenando la pantalla');
assert(!/fetch\s*\(|XMLHttpRequest|completeSale|cfdi-api|finkok/i.test(workspace),'La capa visual invadió red, ventas o CFDI');
assert(pos.includes('posApi("completeSale"')&&pos.includes('payments,'),'La venta transaccional cambió');
window.switchTab('factura');window.SOLRAKPOSWorkspaceV0165.updateMode();
assert(!window.document.documentElement.dataset.solrakPosWorkspace,'El modo caja afectó otras secciones');

console.log('SOLRAK_POS_WORKSPACE_V0165_OK directPOS=true ticketsRight=true emptySearchCompact=true otherTabsPreserved=true atomicSalePreserved=true');
