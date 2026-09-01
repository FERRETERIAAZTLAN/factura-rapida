(function(){
'use strict';

const IMAGE_API_URL='https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/product-image-api';
const QUOTE_API_URL='https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/quote-api';
const imageMap=new Map();
let loading=false,lastBusinessId=null,observer=null,decorateQueued=false;
const byId=id=>document.getElementById(id);

function injectStyles(){
  if(document.getElementById('frProductImageStyles'))return;
  const s=document.createElement('style');
  s.id='frProductImageStyles';
  s.textContent=`
    .fr-product-thumb{width:54px;height:54px;flex:0 0 54px;object-fit:contain;border:1px solid var(--line);border-radius:9px;background:#fff;padding:3px;display:block}
    .fr-product-thumb.sm{width:40px;height:40px;flex-basis:40px;border-radius:8px;padding:2px}
    .fr-product-thumb.table{width:46px;height:46px;border-radius:8px;margin:auto}
    .result.fr-has-product-image{align-items:center}
    .cart-item.fr-has-product-image{grid-template-columns:auto minmax(0,1fr) auto auto}
    .fr-inventory-image-cell{width:62px;text-align:center;padding:5px!important}
    @media(max-width:640px){.fr-product-thumb{width:48px;height:48px;flex-basis:48px}.fr-product-thumb.sm{width:36px;height:36px;flex-basis:36px}.fr-inventory-image-cell{width:52px}}
  `;
  document.head.appendChild(s);
}

async function imageApi(action,payload={}){
  const headers={'Authorization':'Bearer '+ANON_KEY,'apikey':ANON_KEY,'Content-Type':'application/json'};
  if(session?.token)headers['x-session-token']=session.token;
  const r=await fetch(IMAGE_API_URL,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data.error||data.detail||'No se pudieron cargar las imágenes');
  return data;
}

async function quotePrintApi(){
  const headers={'Authorization':'Bearer '+ANON_KEY,'apikey':ANON_KEY,'Content-Type':'application/json'};
  if(session?.token)headers['x-session-token']=session.token;
  const r=await fetch(QUOTE_API_URL,{method:'POST',headers,body:JSON.stringify({action:'listQuotes'})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data.error||data.detail||'No se pudo cargar la cotización');
  return data;
}

function imageFor(id){return imageMap.get(String(id||''))||null}
function makeImg(id,variant=''){
  const item=imageFor(id);if(!item?.url)return null;
  const img=document.createElement('img');
  img.className='fr-product-thumb'+(variant?' '+variant:'');
  img.src=item.url;img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.dataset.frProductImage=String(id);
  img.onerror=()=>{img.remove()};
  return img;
}

function decorateResultContainer(containerId,attr){
  const box=byId(containerId);if(!box)return;
  box.querySelectorAll(`[${attr}]`).forEach(row=>{
    const id=row.getAttribute(attr);if(!id||row.querySelector(':scope > .fr-product-thumb'))return;
    const img=makeImg(id);if(!img)return;
    row.insertBefore(img,row.firstChild);row.classList.add('fr-has-product-image');
  });
}

function decorateCart(containerId){
  const box=byId(containerId);if(!box)return;
  box.querySelectorAll('.cart-item').forEach(row=>{
    if(row.querySelector(':scope > .fr-product-thumb'))return;
    const marker=row.querySelector('[data-id],[data-qqty]');
    const id=marker?.dataset?.id||marker?.dataset?.qqty;if(!id)return;
    const img=makeImg(id,'sm');if(!img)return;
    row.insertBefore(img,row.firstChild);row.classList.add('fr-has-product-image');
  });
}

function currentInventoryRows(){
  const input=byId('inventorySearch');if(!input||typeof products==='undefined')return [];
  const query=input.value.trim().toLowerCase();
  const matches=products.filter(p=>typeof pMatch==='function'?pMatch(p,query):(!query||`${p.code||''} ${p.name||''} ${p.description||''} ${p.sat_key||''}`.toLowerCase().includes(query)));
  return matches.slice(0,query?500:250);
}

function decorateInventory(){
  const body=byId('inventoryBody');if(!body)return;
  const rows=[...body.querySelectorAll('tr')],items=currentInventoryRows();
  rows.forEach((tr,index)=>{
    const p=items[index];if(!p)return;
    let td=tr.querySelector('.fr-inventory-image-cell');
    if(!td){td=document.createElement('td');td.className='fr-inventory-image-cell';tr.insertBefore(td,tr.firstChild)}
    const current=td.querySelector('.fr-product-thumb');
    const item=imageFor(p.id);
    if(item?.url){
      if(!current||current.dataset.frProductImage!==String(p.id)||current.src!==item.url){td.replaceChildren(makeImg(p.id,'table'))}
    }else if(!td.querySelector('.muted')){td.innerHTML='<span class="muted small">—</span>'}
  });
  const table=body.closest('table');const head=table?.querySelector('thead tr');
  if(head&&!head.querySelector('.fr-inventory-image-head')){
    const th=document.createElement('th');th.className='fr-inventory-image-head';th.textContent='Foto';head.insertBefore(th,head.firstChild);
  }
}

function decorateAll(){
  decorateQueued=false;
  decorateResultContainer('productResults','data-id');
  decorateResultContainer('quoteProductResults','data-qpid');
  decorateCart('cartList');
  decorateCart('quoteCartList');
  decorateInventory();
}
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;requestAnimationFrame(decorateAll)}

function mergeIntoProducts(){
  if(typeof products==='undefined'||!Array.isArray(products))return;
  products.forEach(p=>{const x=imageFor(p.id);p.image_url=x?.url||null;p.image_path=x?.path||null});
}

async function refreshImages(force=false){
  if(loading||!session?.token||typeof products==='undefined'||!Array.isArray(products)||!products.length)return;
  const businessId=session?.business?.id||session?.user?.business_id||'';
  if(!force&&lastBusinessId===businessId&&imageMap.size)return queueDecorate();
  loading=true;
  try{
    const r=await imageApi('listImages');
    imageMap.clear();
    (r.images||[]).forEach(x=>{if(x?.id&&x?.url)imageMap.set(String(x.id),x)});
    lastBusinessId=businessId;mergeIntoProducts();queueDecorate();
  }catch(err){console.warn('Product images:',err?.message||err)}finally{loading=false}
}

function h(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function currentProduct(item){return typeof products!=='undefined'&&Array.isArray(products)?products.find(p=>String(p.id)===String(item?.id)):null}
function printableProduct(item){
  const p=currentProduct(item)||{};
  const name=String(p.name||item.name||item.description||'Producto').trim();
  const detail=String(p.description||item.description||'').trim();
  const barcode=String(p.code||item.code||'').trim();
  let secondary='';
  if(detail&&detail.toLowerCase()!==name.toLowerCase())secondary=detail;
  else if(barcode&&barcode.toLowerCase()!==name.toLowerCase())secondary=barcode;
  return{name,secondary,barcode,image:imageFor(item.id)?.url||p.image_url||null,unit:String(p.unit||item.unit||'Pieza')};
}
function quoteMoney(v){try{return typeof money==='function'?money(v):new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v)||0)}catch{return '$'+Number(v||0).toFixed(2)}}
function quoteDate(v){try{return new Date(v).toLocaleDateString('es-MX')}catch{return String(v||'—')}}

async function printQuoteWithImages(id,w){
  w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparando cotización…</title></head><body style="font-family:Arial,sans-serif;padding:30px;color:#333">Preparando cotización con imágenes…</body></html>');w.document.close();
  await refreshImages(true);
  const r=await quotePrintApi(),item=(r.quotes||[]).find(x=>String(x.id)===String(id));if(!item)throw new Error('Cotización no encontrada.');
  const business=r.business||session?.business||{},folio='COT-'+String(Number(item.quote_number)||0).padStart(6,'0');
  const logo=document.querySelector('.frBrandBadge img')?.src||'';
  const rows=(item.items||[]).map(i=>{const p=printableProduct(i),img=p.image?`<img src="${h(p.image)}" alt="${h(p.name)}">`:'<span class="noimg">Sin foto</span>';const secondary=p.secondary?`<div class="code">Código: ${h(p.secondary)}</div>`:'';const barcode=p.barcode&&p.barcode!==p.secondary?`<div class="barcode">Cód. barras: ${h(p.barcode)}</div>`:'';return `<tr><td class="photo">${img}</td><td class="product"><strong>${h(p.name)}</strong>${secondary}${barcode}<div class="unit">Unidad: ${h(p.unit)}</div></td><td class="num qty">${Number(i.qty)||0}</td><td class="num">${h(quoteMoney(i.price))}</td><td class="num totalcell">${h(quoteMoney(i.line_total))}</td></tr>`}).join('');
  w.document.open();w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${h(folio)}</title><style>
  @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1b2026;margin:0;font-size:12px}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-top:7px solid #e97618;border-bottom:1.5px solid #e97618;padding:20px 4px 17px;margin-bottom:18px}.brand{display:flex;gap:13px;align-items:center;max-width:60%}.brand img{width:78px;height:78px;object-fit:contain}.brand h1{font-size:21px;margin:0 0 4px}.muted{color:#6c7580;line-height:1.5}.folio{text-align:right}.folio .label{font-size:10px;font-weight:800;color:#e97618;letter-spacing:.08em}.folio h2{font-size:23px;margin:4px 0 5px}.client{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:2px 4px 14px}.client h3{font-size:10px;color:#e97618;margin:0 0 7px;text-transform:uppercase}.client p{margin:2px 0}.tablewrap{margin-top:8px}table{border-collapse:collapse;width:100%;table-layout:fixed}thead th{background:#1b2026;color:#fff;text-align:left;padding:8px 7px;font-size:9px;text-transform:uppercase}thead th:nth-child(1){width:70px}thead th:nth-child(3){width:52px;text-align:center}thead th:nth-child(4),thead th:nth-child(5){width:88px;text-align:right}td{padding:8px 7px;border-bottom:1px solid #e0e4e8;vertical-align:middle}.photo{text-align:center}.photo img{width:55px;height:55px;object-fit:contain;border:1px solid #e1e5e8;border-radius:6px;background:#fff;padding:2px}.noimg{display:inline-grid;place-items:center;width:55px;height:55px;background:#f3f4f5;color:#9299a1;font-size:8px;border-radius:6px}.product strong{display:block;font-size:11px;line-height:1.35}.code,.barcode,.unit{font-size:8.5px;color:#69737e;margin-top:3px;line-height:1.25}.num{text-align:right;white-space:nowrap}.qty{text-align:center}.totalcell{font-weight:800}.totals{width:285px;margin-left:auto;margin-top:17px}.totals div{display:flex;justify-content:space-between;padding:5px 8px}.totals .grand{font-size:17px;font-weight:800;background:#f5f5f5;border-top:2px solid #1b2026;padding:9px 8px}.totals .grand strong{color:#e97618}.notes{margin-top:18px;padding:11px 13px;background:#f7f8f9;border-radius:8px;line-height:1.45}.foot{margin-top:25px;padding-top:9px;border-top:1px solid #ddd;text-align:center;color:#747d86;font-size:9px}tr{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><header><div class="brand">${logo?`<img src="${h(logo)}" alt="Logo">`:''}<div><h1>${h(business.name||'Factura Rápida')}</h1><div class="muted">${h(business.fiscal_name||'')}${business.rfc?'<br>RFC: '+h(business.rfc):''}${business.phone?'<br>Tel: '+h(business.phone):''}</div></div></div><div class="folio"><div class="label">COTIZACIÓN</div><h2>${h(folio)}</h2><div class="muted">Fecha: ${h(quoteDate(item.created_at))}<br>Vigencia: ${h(item.valid_until||'—')}</div></div></header><section class="client"><div><h3>Negocio</h3><p><strong>${h(business.name||'')}</strong></p><p class="muted">${h(business.contact_email||'')}</p></div><div><h3>Cliente</h3><p><strong>${h(item.customer_name||'Público general')}</strong></p><p class="muted">${item.customer_phone?h(item.customer_phone):''}${item.customer_email?(item.customer_phone?' · ':'')+h(item.customer_email):''}</p></div></section><div class="tablewrap"><table><thead><tr><th>Foto</th><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table></div><div class="totals"><div><span>Subtotal</span><strong>${h(quoteMoney(item.subtotal))}</strong></div><div><span>IVA</span><strong>${h(quoteMoney(item.iva))}</strong></div><div class="grand"><span>TOTAL</span><strong>${h(quoteMoney(item.total))}</strong></div></div>${item.notes?`<div class="notes"><strong>Notas</strong><br>${h(item.notes)}</div>`:''}<div class="foot">Esta cotización no es un CFDI. Precios sujetos a vigencia y disponibilidad.</div><script>(function(){const imgs=[...document.images];const waits=imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;setTimeout(r,3500)}));Promise.all(waits).finally(()=>setTimeout(()=>{window.focus();window.print()},250))})()<\/script></body></html>`);w.document.close();
}

function installQuotePrintOverride(){
  if(document.documentElement.dataset.frQuotePrintImages==='1')return;document.documentElement.dataset.frQuotePrintImages='1';
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-qact="print"]');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const w=window.open('','_blank','width=950,height=820');if(!w){if(typeof notice==='function')notice('El navegador bloqueó la ventana de impresión.',true);return}
    if(typeof busy==='function')busy(true);
    printQuoteWithImages(b.dataset.id,w).catch(err=>{try{w.close()}catch{}if(typeof notice==='function')notice(err.message||'No se pudo preparar la cotización.',true)}).finally(()=>{if(typeof busy==='function')busy(false)});
  },true);
}

function hookLoadAll(){
  try{
    if(typeof loadAll!=='function'||loadAll.__frProductImagesHooked)return;
    const original=loadAll;
    const wrapped=async function(...args){const out=await original.apply(this,args);await refreshImages(true);return out};
    wrapped.__frProductImagesHooked=true;loadAll=wrapped;
  }catch(err){console.warn('Product images load hook:',err)}
}

function startObserver(){
  if(observer)return;
  observer=new MutationObserver(mutations=>{
    for(const m of mutations){
      const el=m.target instanceof Element?m.target:m.target?.parentElement;
      if(el?.closest?.('#productResults,#quoteProductResults,#cartList,#quoteCartList,#inventoryBody')){queueDecorate();break}
    }
  });
  observer.observe(document.body,{subtree:true,childList:true});
}

function boot(){
  injectStyles();hookLoadAll();startObserver();installQuotePrintOverride();queueDecorate();
  let tries=0;const timer=setInterval(()=>{
    tries++;hookLoadAll();
    if(session?.token&&typeof products!=='undefined'&&Array.isArray(products)&&products.length)refreshImages(false);
    if((lastBusinessId&&imageMap.size)||tries>=40)clearInterval(timer);
  },500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.FacturaRapidaProductImages={refresh:()=>refreshImages(true),count:()=>imageMap.size,printQuote:(id)=>{const w=window.open('','_blank','width=950,height=820');if(w)return printQuoteWithImages(id,w)}};
})();
