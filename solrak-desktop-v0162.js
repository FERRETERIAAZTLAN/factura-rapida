(()=>{
'use strict';
const VERSION='0.1.62';
const IMAGE_API='https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/product-image-api';
const IMAGE_BASE='https://jojzhohqrshsjmlirkqz.supabase.co/storage/v1/object/public/product-images/';
let editing=null,booted=false,navTimer=null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const val=id=>$(id)?.value??'';

function injectStyle(){
 if($('solrakDesktopV0162Style'))return;
 const s=document.createElement('style');s.id='solrakDesktopV0162Style';s.textContent=`
 :root{--solrak-sidebar:232px;--solrak-native-top:0px;--solrak-bg:#f4f6f8;--solrak-side:#16202a;--solrak-side2:#1e2b37;--solrak-blue:#2474f0;--solrak-border:#dfe4e9;--solrak-text:#18212b;--solrak-muted:#6d7885}
 html[data-solrak-desktop="1"],html[data-solrak-desktop="1"] body{background:var(--solrak-bg)!important;color:var(--solrak-text)}
 #solrakAppBrand{display:flex;align-items:center;gap:11px;padding:17px 15px 15px;margin:0 0 11px;border-bottom:1px solid rgba(255,255,255,.09);user-select:none}
 #solrakAppMark{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(145deg,#2e82ff,#1659bb);color:#fff;font:900 21px/1 "Segoe UI",Arial,sans-serif;letter-spacing:-1px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
 #solrakAppBrand strong{display:block;color:#fff;font:800 18px/1.05 "Segoe UI",Arial,sans-serif;letter-spacing:.055em}#solrakAppBrand small{display:block;color:#9eb0c1;font-size:10px;margin-top:4px;letter-spacing:.04em}
 .solrakNavSection{padding:13px 15px 5px;color:#71879a;font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;pointer-events:none}
 @media(min-width:1050px){
  html[data-solrak-desktop="1"] .nav{position:fixed!important;z-index:7200;left:0;top:var(--solrak-native-top);bottom:0;width:var(--solrak-sidebar);height:auto!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:3px!important;overflow-y:auto;background:linear-gradient(180deg,var(--solrak-side),#111a22)!important;padding:0 8px 14px!important;border:0!important;border-radius:0!important;box-shadow:7px 0 24px rgba(17,27,36,.08)}
  html[data-solrak-desktop="1"] .nav>button{position:relative!important;display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:39px!important;width:100%!important;margin:0!important;border:0!important;border-radius:8px!important;padding:0 11px!important;background:transparent!important;color:#cbd6df!important;text-align:left!important;font:650 12px/1 "Segoe UI",Arial,sans-serif!important;box-shadow:none!important}
  html[data-solrak-desktop="1"] .nav>button:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}
  html[data-solrak-desktop="1"] .nav>button.active,html[data-solrak-desktop="1"] .nav>button[aria-current="page"]{background:var(--solrak-side2)!important;color:#fff!important;box-shadow:inset 3px 0 0 var(--solrak-blue)!important}
  html[data-solrak-desktop="1"] .nav>button .count{font-size:9px!important;min-width:20px!important;text-align:center!important;background:rgba(255,255,255,.1)!important;color:#dce5ed!important;border-radius:999px!important;padding:3px 5px!important}
  html[data-solrak-desktop="1"] main.shell{max-width:none!important;width:auto!important;margin-left:var(--solrak-sidebar)!important;padding:18px 24px 30px!important;min-height:100vh}
  html[data-solrak-desktop="1"] .top{position:sticky;top:var(--solrak-native-top);z-index:6500;background:rgba(244,246,248,.96)!important;backdrop-filter:blur(12px);margin:-18px -24px 18px!important;padding:15px 24px 13px!important;border-bottom:1px solid var(--solrak-border)!important;border-radius:0!important}
  html[data-solrak-desktop="1"] .card{border:1px solid var(--solrak-border)!important;border-radius:10px!important;box-shadow:0 1px 2px rgba(23,33,43,.035)!important;background:#fff!important}
  html[data-solrak-desktop="1"] .grid2{gap:14px!important}html[data-solrak-desktop="1"] .stack{gap:14px!important}
  html[data-solrak-desktop="1"] .table-wrap{border:1px solid var(--solrak-border)!important;border-radius:9px!important;background:#fff!important}
  html[data-solrak-desktop="1"] table thead{position:sticky;top:0;z-index:2}html[data-solrak-desktop="1"] table th{background:#f1f4f6!important;color:#485563!important;font-size:10px!important;text-transform:uppercase!important;letter-spacing:.045em!important}
  html[data-solrak-desktop="1"] .frPosGrid{grid-template-columns:minmax(0,1.55fr) minmax(370px,.7fr)!important;gap:14px!important}
  html[data-solrak-desktop="1"] .frPosResult{border-radius:8px!important}html[data-solrak-desktop="1"] .frPosResult:hover{border-color:#a9c7f7!important;background:#f7fbff!important}
  html[data-solrak-desktop="1"] .frPosResult .rp{color:#155bc0!important}html[data-solrak-desktop="1"] .frPosState{border-radius:6px!important}html[data-solrak-desktop="1"] .frPayBox{border-radius:8px!important}
  html[data-solrak-desktop="1"] .frSupplierRow{border-radius:8px!important}
 }
 @media(max-width:1049px){#solrakAppBrand,.solrakNavSection{display:none!important}}
 #solrakProductDialog{border:0;padding:0;width:min(1050px,calc(100vw - 34px));max-height:94vh;border-radius:13px;box-shadow:0 28px 90px rgba(8,20,32,.32);background:#fff;color:var(--solrak-text)}#solrakProductDialog::backdrop{background:rgba(12,21,30,.52);backdrop-filter:blur(3px)}
 .sp-shell{display:grid;grid-template-rows:auto 1fr auto;max-height:94vh}.sp-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 19px;border-bottom:1px solid var(--solrak-border);background:#f8fafb}.sp-head h2{margin:0;font:750 18px/1.2 "Segoe UI",Arial,sans-serif}.sp-head p{margin:4px 0 0;color:var(--solrak-muted);font-size:11px}.sp-x{border:1px solid #d7dde3;background:#fff;width:34px;height:34px;border-radius:7px;font-size:19px;cursor:pointer}
 .sp-body{overflow:auto;padding:18px}.sp-layout{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:20px}.sp-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 13px}.sp-fields label{display:block;font-size:10px;font-weight:800;color:#566371;text-transform:uppercase;letter-spacing:.035em}.sp-fields .span2{grid-column:span 2}.sp-fields .span3{grid-column:1/-1}.sp-field{box-sizing:border-box;width:100%;margin-top:5px;border:1px solid #cfd6dd;background:#fff;color:#17212b;border-radius:7px;padding:9px 10px;font:500 13px/1.3 "Segoe UI",Arial,sans-serif;outline:none;min-height:37px}.sp-field:focus{border-color:#70a7fb;box-shadow:0 0 0 3px rgba(36,116,240,.12)}textarea.sp-field{resize:vertical;min-height:70px}.sp-check{display:flex!important;align-items:center;gap:8px;margin-top:20px;text-transform:none!important;font-size:12px!important;letter-spacing:0!important}.sp-check input{width:17px;height:17px}
 .sp-image{border-left:1px solid var(--solrak-border);padding-left:19px}.sp-image h3{margin:0 0 10px;font-size:12px}.sp-preview{height:210px;border:1px dashed #cbd3db;border-radius:10px;background:#f7f9fa;display:grid;place-items:center;overflow:hidden;color:#8a96a2;font-size:11px;text-align:center;padding:8px}.sp-preview img{width:100%;height:100%;object-fit:contain;background:#fff}.sp-file{display:block;width:100%;margin-top:10px;font-size:11px}.sp-image small{display:block;color:var(--solrak-muted);font-size:10px;line-height:1.45;margin-top:8px}.sp-status{min-height:17px;margin-top:9px;font-size:11px;color:var(--solrak-muted)}.sp-status.bad{color:#a33131}.sp-status.ok{color:#1d713f}
 .sp-foot{display:flex;justify-content:flex-end;gap:9px;padding:13px 18px;border-top:1px solid var(--solrak-border);background:#f8fafb}.sp-btn{border:1px solid #ccd4dc;border-radius:7px;padding:9px 16px;background:#fff;color:#25313c;font-weight:750;cursor:pointer}.sp-btn.primary{border-color:#1c66d2;background:#2474f0;color:#fff}.sp-btn:disabled{opacity:.55;cursor:not-allowed}
 @media(max-width:800px){.sp-layout{grid-template-columns:1fr}.sp-image{border-left:0;border-top:1px solid var(--solrak-border);padding:15px 0 0}.sp-fields{grid-template-columns:1fr 1fr}.sp-fields .span3{grid-column:1/-1}.sp-preview{height:180px}}@media(max-width:560px){.sp-fields{grid-template-columns:1fr}.sp-fields .span2,.sp-fields .span3{grid-column:auto}}
 `;document.head.appendChild(s);
}

function brand(){
 const nav=document.querySelector('.nav');if(!nav)return;
 if(!nav.querySelector('#solrakAppBrand')){const el=document.createElement('div');el.id='solrakAppBrand';el.innerHTML='<div id="solrakAppMark" aria-hidden="true">S</div><div><strong>SOLRAK</strong><small>PUNTO DE VENTA</small></div>';nav.insertBefore(el,nav.firstChild)}
 const native=document.getElementById('frNativeBar');document.documentElement.style.setProperty('--solrak-native-top',native?`${Math.max(36,native.getBoundingClientRect().height||40)}px`:'0px');
 document.documentElement.dataset.solrakDesktop='1';
}

const sectionMap=[['pos','OPERACIÓN'],['proveedores','COMPRAS'],['inventario','INVENTARIO'],['clientes','CLIENTES'],['historial','REPORTES'],['configuracion','SISTEMA']];
const labelMap={pos:'Ventas',factura:'Facturación',cotizaciones:'Cotizaciones',inventario:'Inventario',clientes:'Clientes',proveedores:'Proveedores',historial:'Reportes',configuracion:'Configuración',usuarios:'Usuarios'};
function refreshNav(){
 const nav=document.querySelector('.nav');if(!nav)return;brand();
 nav.querySelectorAll(':scope > .solrakNavSection').forEach(x=>x.remove());
 for(const [tab,title] of sectionMap){const b=nav.querySelector(`:scope > button[data-tab="${tab}"]`);if(!b)continue;const d=document.createElement('div');d.className='solrakNavSection';d.textContent=title;nav.insertBefore(d,b)}
 for(const [tab,label] of Object.entries(labelMap)){const b=nav.querySelector(`:scope > button[data-tab="${tab}"]`);if(!b)continue;b.dataset.solrakLabel=label;b.setAttribute('aria-label',label);const count=b.querySelector('.count');if(!b.querySelector(':scope > .solrakNavText')){const span=document.createElement('span');span.className='solrakNavText';span.textContent=label;[...b.childNodes].filter(x=>x.nodeType===Node.TEXT_NODE).forEach(x=>x.remove());b.insertBefore(span,count||b.firstChild)}else b.querySelector(':scope > .solrakNavText').textContent=label}
}

function imageUrl(p){if(p?.image_url)return p.image_url;if(p?.image_path)return IMAGE_BASE+String(p.image_path).split('/').map(encodeURIComponent).join('/');return''}
function fileB64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=()=>reject(new Error('No se pudo leer la imagen'));r.readAsDataURL(file)})}
async function imageCall(action,payload={}){const headers={'Authorization':'Bearer '+ANON_KEY,'apikey':ANON_KEY,'Content-Type':'application/json'};if(session?.token)headers['x-session-token']=session.token;const r=await fetch(IMAGE_API,{method:'POST',headers,body:JSON.stringify({action,...payload})});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||d.detail||'No se pudo guardar la imagen');e.data=d;throw e}return d}

function ensureProductDialog(){
 if($('solrakProductDialog'))return;
 const d=document.createElement('dialog');d.id='solrakProductDialog';d.innerHTML=`<form id="solrakProductForm" class="sp-shell"><div class="sp-head"><div><h2 id="spTitle">Producto</h2><p>Los valores se guardan exactamente como los captures. SOLRAK no recalcula precios ni existencias.</p></div><button id="spCloseX" class="sp-x" type="button" aria-label="Cerrar">×</button></div><div class="sp-body"><div class="sp-layout"><div class="sp-fields">
 <label>Código<input id="spCode" class="sp-field" maxlength="120" autocomplete="off"></label><label>Categoría<input id="spCategory" class="sp-field" maxlength="150" list="spCategories"></label><label>Nombre<input id="spName" class="sp-field" maxlength="400" required></label>
 <label class="span3">Descripción<textarea id="spDescription" class="sp-field" maxlength="700" rows="2"></textarea></label>
 <label>Existencias<input id="spStock" class="sp-field" type="number" step="0.001"></label><label>Costo<input id="spCost" class="sp-field" type="number" min="0" step="0.01"></label><label>Precio mayoreo<input id="spWholesale" class="sp-field" type="number" min="0" step="0.01"></label>
 <label>Precio público<input id="spPrice" class="sp-field" type="number" min="0" step="0.01" required></label><label>Unidad<input id="spUnit" class="sp-field" maxlength="80" list="spUnits"></label><label>IVA %<input id="spIva" class="sp-field" type="number" min="0" max="100" step="0.01"></label>
 <label>Inventario mínimo<input id="spMinStock" class="sp-field" type="number" step="0.001"></label><label>Inventario máximo<input id="spMaxStock" class="sp-field" type="number" step="0.001"></label><label>Clave SAT<input id="spSat" class="sp-field" inputmode="numeric" maxlength="8"></label>
 <label>Clave unidad SAT<input id="spUnitKey" class="sp-field" maxlength="3"></label><label class="sp-check"><input id="spTaxIncluded" type="checkbox"> Precio incluye IVA</label><label class="sp-check"><input id="spActive" type="checkbox"> Producto activo</label>
 </div><aside class="sp-image"><h3>Imagen del producto</h3><div id="spPreview" class="sp-preview">Sin imagen</div><input id="spImageFile" class="sp-file" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG o WEBP · máximo 5 MB. Al cambiarla se conserva intacto el resto del producto.</small><div id="spImageStatus" class="sp-status"></div></aside></div>
 <datalist id="spCategories"></datalist><datalist id="spUnits"><option value="Pieza"><option value="Kilogramo"><option value="Gramo"><option value="Metro"><option value="Metro lineal"><option value="Litro"><option value="Mililitro"><option value="Caja"><option value="Paquete"><option value="Rollo"><option value="Bolsa"><option value="Par"><option value="Juego"><option value="Tramo"><option value="Bote"><option value="Cubeta"><option value="Servicio"></datalist>
 </div><div class="sp-foot"><button id="spClose" class="sp-btn" type="button">Cerrar</button><button id="spSave" class="sp-btn primary" type="submit">Guardar</button></div></form>`;document.body.appendChild(d);
 $('spClose').onclick=$('spCloseX').onclick=()=>d.close();
 $('spImageFile').onchange=()=>{const f=$('spImageFile').files?.[0];if(!f)return renderPreview(imageUrl(editing));if(f.size>5*1024*1024){$('spImageStatus').className='sp-status bad';$('spImageStatus').textContent='La imagen supera 5 MB.';$('spImageFile').value='';return renderPreview(imageUrl(editing))}const u=URL.createObjectURL(f);renderPreview(u,true)};
 $('solrakProductForm').onsubmit=saveProduct;
}

function renderPreview(url,temporary=false){const box=$('spPreview');if(!box)return;box.innerHTML=url?`<img src="${esc(url)}" alt="Imagen del producto">`:'Sin imagen';if(temporary){const img=box.querySelector('img');img?.addEventListener('load',()=>setTimeout(()=>URL.revokeObjectURL(url),15000),{once:true})}}
function setField(id,v){const e=$(id);if(e)e.value=v??''}
function categories(){const list=$('spCategories');if(!list)return;const values=[...new Set((Array.isArray(products)?products:[]).map(p=>String(p.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));list.innerHTML=values.map(x=>`<option value="${esc(x)}"></option>`).join('')}

function openProductEditor(p){
 ensureProductDialog();editing=p||null;categories();
 $('spTitle').textContent=p?'Editar producto':'Agregar producto';setField('spCode',p?.code||'');setField('spCategory',p?.category||'Producto en General');setField('spName',p?.name||'');setField('spDescription',p?.description||'');setField('spStock',p?String(p.stock??0):'0');setField('spCost',p?String(p.cost??0):'0');setField('spWholesale',p?String(p.wholesale??0):'0');setField('spPrice',p?String(p.price??0):'0');setField('spUnit',p?.unit||'Pieza');setField('spMinStock',p?String(p.min_stock??0):'0');setField('spMaxStock',p?String(p.max_stock??0):'0');setField('spIva',p?String(p.iva??16):'16');setField('spSat',p?.sat_key||'');setField('spUnitKey',p?.unit_key||'');$('spActive').checked=p?p.active!==false:true;$('spTaxIncluded').checked=p?p.price_includes_tax!==false:true;$('spImageFile').value='';$('spImageStatus').className='sp-status';$('spImageStatus').textContent='';renderPreview(imageUrl(p));
 $('solrakProductDialog').showModal();setTimeout(()=>$('spCode')?.focus(),20);
}

async function saveProduct(e){
 e.preventDefault();if(session?.user?.role!=='admin')return typeof notice==='function'&&notice('Solo el administrador puede modificar productos.',true);
 const product={id:editing?.id||undefined,code:String(val('spCode')).trim(),category:String(val('spCategory')).trim()||'Producto en General',name:String(val('spName')).trim(),description:String(val('spDescription')).trim(),stock:n(val('spStock')),cost:n(val('spCost')),wholesale:n(val('spWholesale')),price:n(val('spPrice')),unit:String(val('spUnit')).trim()||'Pieza',min_stock:n(val('spMinStock')),max_stock:n(val('spMaxStock')),iva:n(val('spIva')),sat_key:String(val('spSat')).trim(),unit_key:String(val('spUnitKey')).trim().toUpperCase(),price_includes_tax:$('spTaxIncluded').checked,active:$('spActive').checked,source:editing?.source||'Manual'};
 if(!product.name){$('spImageStatus').className='sp-status bad';$('spImageStatus').textContent='El producto necesita nombre.';return}
 const file=$('spImageFile').files?.[0]||null;$('spSave').disabled=true;if(typeof busy==='function')busy(true);$('spImageStatus').className='sp-status';$('spImageStatus').textContent='Guardando producto…';
 try{
  const r=await api('saveProduct',{product});const saved=r.product;if(!saved?.id)throw new Error('El producto se guardó sin identificador.');editing=saved;
  if(file){$('spImageStatus').textContent='Producto guardado. Subiendo imagen…';const base64=await fileB64(file);const ir=await imageCall('uploadImage',{productId:saved.id,contentType:file.type,base64});saved.image_path=ir.image?.path||saved.image_path;saved.image_url=ir.image?.url||saved.image_url}
  $('spImageStatus').className='sp-status ok';$('spImageStatus').textContent=file?'Producto e imagen guardados.':'Producto guardado.';
  await loadAll();if(window.FacturaRapidaProductImages?.refresh)await window.FacturaRapidaProductImages.refresh();if(typeof notice==='function')notice(file?'Producto e imagen guardados.':'Producto guardado.');$('solrakProductDialog').close();
 }catch(err){$('spImageStatus').className='sp-status bad';$('spImageStatus').textContent=err?.message||'No se pudo guardar.';if(typeof notice==='function')notice(err?.message||'No se pudo guardar el producto.',true)}finally{if(typeof busy==='function')busy(false);$('spSave').disabled=false}
}

function hookProductEditor(){
 if(typeof window.openProduct==='function'&&window.openProduct!==openProductEditor){window.__solrakLegacyOpenProduct=window.openProduct;window.openProduct=openProductEditor}
}
function boot(){if(booted)return;booted=true;injectStyle();ensureProductDialog();brand();refreshNav();hookProductEditor();const nav=document.querySelector('.nav');if(nav){const mo=new MutationObserver(()=>{clearTimeout(navTimer);navTimer=setTimeout(()=>{refreshNav();hookProductEditor()},20)});mo.observe(nav,{childList:true,subtree:false})}setInterval(()=>{hookProductEditor();brand()},2500);window.SolrakDesktopV0162={version:VERSION,refreshNav,openProduct:openProductEditor}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
