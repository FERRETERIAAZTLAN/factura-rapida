(function(){
'use strict';

const IMAGE_API_URL='https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/product-image-api';
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
    const p=items[index];if(!p||tr.querySelector('.fr-inventory-image-cell'))return;
    const img=makeImg(p.id,'table');
    const td=document.createElement('td');td.className='fr-inventory-image-cell';
    if(img)td.appendChild(img);else td.innerHTML='<span class="muted small">—</span>';
    tr.insertBefore(td,tr.firstChild);
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
  injectStyles();hookLoadAll();startObserver();queueDecorate();
  let tries=0;const timer=setInterval(()=>{
    tries++;hookLoadAll();
    if(session?.token&&typeof products!=='undefined'&&Array.isArray(products)&&products.length)refreshImages(false);
    if((lastBusinessId&&imageMap.size)||tries>=40)clearInterval(timer);
  },500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.FacturaRapidaProductImages={refresh:()=>refreshImages(true),count:()=>imageMap.size};
})();
