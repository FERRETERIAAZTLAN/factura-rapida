(() => {
  "use strict";

  const VERSION="0.1.90";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/ticket-ux-api";
  const byId=(id)=>document.getElementById(id);
  const money=(v)=>Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
  const esc=(v)=>String(v??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const state={ticketBarcodeEnabled:true,installed:false};

  function currentSession(){try{return session||window.session||null}catch{return window.session||null}}
  function anonKey(){try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function isAdmin(){return currentSession()?.user?.role==="admin"}
  function productsNow(){try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}}
  async function settingsApi(action,payload={}){
    const key=anonKey(),token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};if(token)headers["x-session-token"]=token;
    const r=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});let d={};try{d=await r.json()}catch{}
    if(!r.ok)throw new Error(d.error||d.detail||"No se pudo guardar la configuración del ticket");return d;
  }

  function ensureStyle(){
    if(byId("solrak90Style"))return;
    const s=document.createElement("style");s.id="solrak90Style";s.textContent=`
html[data-solrak-ux90="1"]{--solrak90-row:30px}
html[data-solrak-ux90="1"] .tab-panel:not(#tab-pos){padding:9px 10px 18px!important}
html[data-solrak-ux90="1"] .card{border-radius:4px!important;padding:9px!important;box-shadow:none!important}
html[data-solrak-ux90="1"] .card-head{min-height:30px!important;margin-bottom:6px!important}html[data-solrak-ux90="1"] .card h2{font-size:13px!important}
html[data-solrak-ux90="1"] .field,html[data-solrak-ux90="1"] input.field,html[data-solrak-ux90="1"] select.field{min-height:30px!important;height:30px!important;border-radius:3px!important;padding:4px 7px!important;font-size:11px!important}
html[data-solrak-ux90="1"] textarea.field{height:auto!important;min-height:58px!important}
html[data-solrak-ux90="1"] label{gap:3px!important;font-size:10px!important}html[data-solrak-ux90="1"] .form-grid{gap:6px!important}
html[data-solrak-ux90="1"] .table-wrap{margin-top:5px!important;max-height:calc(100vh - 210px)!important;border-radius:3px!important}html[data-solrak-ux90="1"] table{font-size:10px!important}html[data-solrak-ux90="1"] th,html[data-solrak-ux90="1"] td{height:var(--solrak90-row);padding:4px 6px!important}html[data-solrak-ux90="1"] th{font-size:9px!important}
html[data-solrak-ux90="1"] .client-row,html[data-solrak-ux90="1"] .user-row{min-height:34px!important;padding:5px 7px!important;border-radius:3px!important}html[data-solrak-ux90="1"] .client-list{gap:3px!important;max-height:calc(100vh - 205px)!important}
html[data-solrak-ux90="1"] .frTicket{transition:none!important}html[data-solrak-ux90="1"] .solrakTicketDock{scroll-behavior:auto!important}
.solrak90Dialog{padding:0;border:0;border-radius:6px;width:min(620px,calc(100% - 24px));box-shadow:0 24px 80px rgba(0,0,0,.34);background:#fff;color:#25313a}.solrak90Dialog::backdrop{background:rgba(19,25,30,.62);backdrop-filter:blur(2px)}.solrak90Head{height:43px;display:flex;align-items:center;justify-content:space-between;padding:0 13px;background:var(--solrak83-accent,#2588d8);color:#fff;font-size:13px;font-weight:900}.solrak90Head.danger{background:#a63d3d}.solrak90Head button{border:0;background:transparent;color:#fff;font-size:22px}.solrak90Body{padding:12px;font-size:11px}.solrak90Impact{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:8px 0}.solrak90Impact>div{border:1px solid #d8dee3;background:#f7f9fa;padding:7px}.solrak90Impact span{display:block;color:#6c7882;font-size:8px;text-transform:uppercase;font-weight:900}.solrak90Impact strong{display:block;margin-top:2px;font-size:15px}.solrak90Stock{max-height:180px;overflow:auto;border:1px solid #dce1e5;margin-top:7px}.solrak90Stock div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:5px 7px;border-bottom:1px solid #eef0f2}.solrak90Stock div:last-child{border-bottom:0}.solrak90Input{width:100%;height:34px;border:1px solid #c9d1d8;border-radius:3px;padding:5px 7px;margin-top:5px}.solrak90Foot{display:flex;justify-content:flex-end;gap:6px;padding:9px 12px;border-top:1px solid #dce1e5;background:#f7f8f9}.solrak90Foot button{min-width:105px;height:32px;border:1px solid #c7cfd6;border-radius:3px;background:#fff;font-weight:800}.solrak90Foot .primary{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrak90Foot .danger{background:#a63d3d;border-color:#a63d3d;color:#fff}.solrak90ToastHost{position:fixed;right:12px;bottom:12px;z-index:30000;display:grid;gap:5px;pointer-events:none}.solrak90Toast{min-width:260px;max-width:430px;padding:8px 10px;border:1px solid #cad4dc;background:#fff;box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:10px;font-weight:700}.solrak90Toast.error{border-color:#deb9b9;background:#fff4f4;color:#8b3434}.solrak90Empty{padding:18px 8px;text-align:center;color:#78858f;font-size:10px;border:1px dashed #d2d9df;background:#fafbfc}.solrak90Empty b{display:block;font-size:22px;font-weight:400;margin-bottom:4px;color:#9aa5ad}.solrak90Hotkeys{position:fixed;z-index:12000;right:10px;bottom:5px;padding:3px 7px;background:rgba(35,43,50,.88);color:#fff;border-radius:3px;font:9px/1.2 "Segoe UI",sans-serif;pointer-events:none}.solrak90TicketActions{display:flex;gap:6px;margin-top:10px;justify-content:flex-end}.solrak90TicketActions button{height:31px;border:1px solid #cbd3d9;background:#fff;border-radius:3px;padding:0 10px;font-weight:800}.solrak90TicketActions .primary{background:var(--solrak83-accent,#2588d8);color:#fff;border-color:var(--solrak83-accent,#2588d8)}
@media(max-width:800px){.solrak90Impact{grid-template-columns:1fr}.solrak90Hotkeys{display:none}}
`;
    document.head.appendChild(s);document.documentElement.dataset.solrakUx90="1";
  }

  function toast(message,error=false){
    let host=byId("solrak90ToastHost");if(!host){host=document.createElement("div");host.id="solrak90ToastHost";host.className="solrak90ToastHost";document.body.appendChild(host)}
    const item=document.createElement("div");item.className=`solrak90Toast${error?" error":""}`;item.textContent=String(message||"");host.appendChild(item);setTimeout(()=>item.remove(),3800);
  }

  function focusSaleSearch(delay=0){setTimeout(()=>{const input=byId("posSearch");if(!input||byId("tab-pos")?.classList.contains("hidden"))return;if(document.querySelector("dialog[open]"))return;input.focus();input.select?.()},delay)}

  function ensureDialog(){
    let d=byId("solrak90Dialog");if(d)return d;d=document.createElement("dialog");d.id="solrak90Dialog";d.className="solrak90Dialog";d.innerHTML='<div id="solrak90Head" class="solrak90Head"><span id="solrak90Title"></span><button id="solrak90X" type="button">×</button></div><div id="solrak90Body" class="solrak90Body"></div><div id="solrak90Foot" class="solrak90Foot"></div>';document.body.appendChild(d);byId("solrak90X").onclick=()=>{d.dataset.result="cancel";d.close()};d.addEventListener("close",()=>focusSaleSearch(20));return d;
  }

  function modal({title,html,confirmLabel="Aceptar",cancelLabel="Cancelar",danger=false,input=null}){
    const d=ensureDialog();if(d.open)d.close();byId("solrak90Title").textContent=title||"SOLRAK";byId("solrak90Head").className=`solrak90Head${danger?" danger":""}`;byId("solrak90Body").innerHTML=html||"";if(input)byId("solrak90Body").insertAdjacentHTML("beforeend",`<label style="display:block;margin-top:9px">${esc(input.label||"")}<input id="solrak90Input" class="solrak90Input" maxlength="${Number(input.maxlength)||240}" value="${esc(input.value||"")}"></label>`);byId("solrak90Foot").innerHTML=`<button id="solrak90Cancel" type="button">${esc(cancelLabel)}</button><button id="solrak90Ok" class="${danger?"danger":"primary"}" type="button">${esc(confirmLabel)}</button>`;
    return new Promise((resolve)=>{let done=false;const finish=(confirmed)=>{if(done)return;done=true;const value=byId("solrak90Input")?.value?.trim()??null;resolve({confirmed,value});if(d.open)d.close()};byId("solrak90Cancel").onclick=()=>finish(false);byId("solrak90Ok").onclick=()=>finish(true);const closeHandler=()=>{if(!done){done=true;resolve({confirmed:false,value:null})}d.removeEventListener("close",closeHandler)};d.addEventListener("close",closeHandler);try{d.showModal()}catch{d.setAttribute("open","")}setTimeout(()=>byId("solrak90Input")?.focus(),20)});
  }

  const Dialog={
    notice:(message,opts={})=>toast(message,!!opts.error),
    confirm:async(message,opts={})=>(await modal({title:opts.title||"Confirmar",html:`<div>${esc(message)}</div>`,confirmLabel:opts.confirmLabel||"Continuar",cancelLabel:opts.cancelLabel||"Cancelar",danger:!!opts.danger})).confirmed,
    prompt:async(label,opts={})=>{const r=await modal({title:opts.title||"Datos requeridos",html:opts.html||"",confirmLabel:opts.confirmLabel||"Continuar",danger:!!opts.danger,input:{label,value:opts.value||"",maxlength:opts.maxlength||240}});return r.confirmed?r.value:null},
    modal,
    close:()=>{const d=byId("solrak90Dialog");if(d?.open)d.close()},
  };
  window.SOLRAKDialog=Dialog;
  window.alert=(message)=>toast(message,true);

  function inventoryImpact(detail,selected=null){
    const selectedMap=selected?new Map(selected.map(x=>[String(x.sale_item_id),Number(x.qty||0)])):null;
    return (detail?.items||[]).filter(i=>i.product_id&&i.inventory_applied!==false).map(i=>({name:i.name_snapshot||"Producto",qty:selectedMap?Number(selectedMap.get(String(i.id))||0):Number(i.quantity||0)})).filter(i=>i.qty>0);
  }
  function stockHtml(lines){return lines.length?`<div class="solrak90Stock">${lines.map(i=>`<div><span>${esc(i.name)}</span><strong>+${Number(i.qty).toLocaleString("es-MX",{maximumFractionDigits:3})}</strong></div>`).join("")}</div>`:'<div class="solrak90Empty"><b>□</b>El stock no cambiará en esta operación.</div>'}

  async function confirmSaleVoid(detail){
    const sale=detail?.sale;if(!sale)return null;const stock=inventoryImpact(detail);const credit=(detail.payments||[]).filter(p=>p.method==="credit").reduce((a,p)=>a+Number(p.amount||0),0);
    const r=await modal({title:`Cancelar Ticket #${sale.sale_number}`,danger:true,confirmLabel:"Cancelar venta",html:`<div>Revisa el impacto antes de continuar. La operación queda auditada y el ticket no se elimina.</div><div class="solrak90Impact"><div><span>Total de venta</span><strong>${money(sale.total)}</strong></div><div><span>Stock a restaurar</span><strong>${stock.reduce((a,i)=>a+i.qty,0).toLocaleString("es-MX",{maximumFractionDigits:3})}</strong></div><div><span>Crédito a revertir</span><strong>${money(credit)}</strong></div></div>${stockHtml(stock)}`,input:{label:"Motivo de cancelación",value:"",maxlength:240}});
    if(!r.confirmed)return null;if(!r.value){toast("Escribe el motivo de cancelación.",true);return null}return r.value;
  }

  async function confirmReturnImpact(detail,items,refundMethod,reason){
    if(!detail?.sale||!items?.length)return false;const stock=inventoryImpact(detail,items);const map=new Map((detail.items||[]).map(i=>[String(i.id),i]));let total=0;for(const x of items){const i=map.get(String(x.sale_item_id));if(i)total+=Number(i.total||0)*Number(x.qty||0)/Math.max(Number(i.quantity||1),0.0001)}
    const method={cash:"Salida de caja",card:"Devolución a tarjeta",transfer:"Devolución por transferencia",credit:"Disminución del crédito",other:"Otra devolución"}[refundMethod]||"Devolución";
    const r=await modal({title:`Devolver Ticket #${detail.sale.sale_number}`,danger:true,confirmLabel:"Registrar devolución",html:`<div>Esta devolución modifica registros contables y no borra el historial.</div><div class="solrak90Impact"><div><span>Total a devolver</span><strong>${money(total)}</strong></div><div><span>${esc(method)}</span><strong>${money(total)}</strong></div><div><span>Stock a restaurar</span><strong>${stock.reduce((a,i)=>a+i.qty,0).toLocaleString("es-MX",{maximumFractionDigits:3})}</strong></div></div>${stockHtml(stock)}<div style="margin-top:8px"><b>Motivo:</b> ${esc(reason)}</div>`});return r.confirmed;
  }

  function receiptFromDetail(data){const s=data.sale;return{saleId:s.id,saleNumber:s.sale_number,createdAt:s.created_at,customerName:s.customer_name||"Público general",items:(data.items||[]).map(i=>({productId:i.product_id,code:i.code_snapshot||"",name:i.name_snapshot,qty:Number(i.quantity),unit:i.unit_snapshot,unitPrice:Number(i.unit_price),subtotal:Number(i.subtotal),tax:Number(i.iva),total:Number(i.total)})),payments:(data.payments||[]).map(p=>({method:p.method,amount:Number(p.amount),tendered:p.tendered_amount})),subtotal:Number(s.subtotal),tax:Number(s.iva),total:Number(s.total),note:s.notes||""}}

  async function openSaleByFolio(folio){
    const pos=window.FacturaRapidaPOS;if(!pos?.api)return false;const found=await pos.api("findSale",{saleNumber:String(folio)});const detail=await pos.api("saleDetail",{saleId:found.sale.id});const stock=inventoryImpact(detail);const payments=(detail.payments||[]).map(p=>`${p.method}: ${money(p.amount)}`).join(" · ");
    const r=await modal({title:`Ticket #${detail.sale.sale_number}`,confirmLabel:"Cerrar",cancelLabel:"Cerrar",html:`<div class="solrak90Impact"><div><span>Total</span><strong>${money(detail.sale.total)}</strong></div><div><span>Estado</span><strong>${esc(detail.sale.status)}</strong></div><div><span>Devuelto</span><strong>${money(detail.returnedTotal||0)}</strong></div></div><div>${esc(payments||"Sin pagos")}</div><div style="margin-top:7px">${stock.length?`${stock.length} línea(s) con movimiento de inventario.`:"Esta venta no aplicó movimientos de inventario."}</div><div class="solrak90TicketActions"><button id="solrak90Reprint" class="primary" type="button">Reimprimir</button><button id="solrak90Return" type="button" ${detail.sale.status!=="completed"?"disabled":""}>Devolver</button></div>`});return r;
  }

  function bindTicketLookupActions(){
    document.addEventListener("click",async(e)=>{const reprint=e.target.closest?.("#solrak90Reprint"),ret=e.target.closest?.("#solrak90Return");if(!reprint&&!ret)return;const title=byId("solrak90Title")?.textContent||"";const folio=title.match(/#(\d+)/)?.[1];if(!folio)return;try{const found=await window.FacturaRapidaPOS.api("findSale",{saleNumber:folio}),detail=await window.FacturaRapidaPOS.api("saleDetail",{saleId:found.sale.id});Dialog.close();if(reprint)window.SOLRAKSumaproTicketsV0169?.printReceipt?.(receiptFromDetail(detail),{force:true});if(ret){window.SOLRAKSumaproFielV0171?.openReturns?.();setTimeout(()=>{const q=byId("fielReturnQuery");if(q){q.value=String(detail.sale.sale_number);byId("fielReturnSearch")?.click()}},30)}}catch(err){toast(err.message,true)}},true);
  }

  function installScannerFallback(){
    const input=byId("posSearch");if(!input||input.dataset.solrakUx90Scanner==="1")return false;const original=input.onkeydown;if(typeof original!=="function")return false;input.dataset.solrakUx90Scanner="1";input.onkeydown=async function(e){if(e.key!=="Enter")return original.call(this,e);const raw=String(this.value||"").trim();if(raw.includes("*"))return original.call(this,e);const exact=productsNow().find(p=>p?.active!==false&&String(p?.code||"").trim().toLowerCase()===raw.toLowerCase());if(exact)return original.call(this,e);if(!/^\d+$/.test(raw))return original.call(this,e);e.preventDefault();e.stopPropagation?.();try{await openSaleByFolio(raw);this.value=""}catch(err){return original.call(this,{key:"Enter",target:this,preventDefault(){},stopPropagation(){}})}finally{focusSaleSearch(20)}};return true;
  }

  function hotkeys(e){
    if(e.defaultPrevented)return;const tag=e.target?.tagName;if((tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")&&!/^F\d+$/.test(e.key))return;
    if(e.key==="F2"){e.preventDefault();focusSaleSearch(0);return}
    if(e.key==="F4"){e.preventDefault();window.FacturaRapidaPOS?.newTicket?.();focusSaleSearch(20);return}
    if(e.key==="F8"){e.preventDefault();window.SOLRAKSumaproFielV0171?.openReturns?.();setTimeout(()=>byId("fielReturnQuery")?.focus(),30);return}
    if(e.key==="F9"){e.preventDefault();window.SOLRAKSumaproFielV0171?.openTicketSearch?.();setTimeout(()=>byId("fielTicketQuery")?.focus(),30);return}
    if(e.key==="F12"){e.preventDefault();const b=byId("fielFinishSale")||byId("posCharge");if(b&&!b.disabled)b.click();return}
    if(e.ctrlKey&&/^[1-8]$/.test(e.key)){e.preventDefault();const tickets=window.FacturaRapidaPOS?.tickets||[],t=tickets[Number(e.key)-1];if(t)window.FacturaRapidaPOS?.switchTicket?.(t.id);focusSaleSearch(20)}
  }

  function installFocus(){document.addEventListener("solrak:pos-sale-complete",()=>focusSaleSearch(30));document.addEventListener("click",(e)=>{if(e.target.closest?.("[data-pos-product]"))focusSaleSearch(20)},true);document.addEventListener("close",()=>focusSaleSearch(20),true);document.addEventListener("keydown",hotkeys,true)}
  function hotkeyLegend(){if(byId("solrak90Hotkeys"))return;const x=document.createElement("div");x.id="solrak90Hotkeys";x.className="solrak90Hotkeys";x.textContent="F2 Buscar · F4 Nuevo ticket · F8 Devolución · F9 Consultar · F12 Finalizar · Ctrl+1…8 Tickets";document.body.appendChild(x)}

  function syncEmptyStates(){
    const selectors=["#tab-inventario .table-wrap","#tab-clientes .table-wrap","#tab-clientes .client-list","#tab-creditos .table-wrap","#solrakCreditPanel .table-wrap"];
    for(const sel of selectors)document.querySelectorAll(sel).forEach(host=>{const count=host.querySelectorAll("tbody tr,.client-row,[data-client-row],[data-credit-row]").length;let empty=host.parentElement?.querySelector?.(`.solrak90Empty[data-for="${host.id||sel.replace(/[^a-z]/gi,"")}"]`);if(!count){if(!empty){empty=document.createElement("div");empty.className="solrak90Empty";empty.dataset.for=host.id||sel.replace(/[^a-z]/gi,"");empty.innerHTML="<b>▤</b>No hay registros";host.insertAdjacentElement("afterend",empty)}}else empty?.remove()})
  }

  async function loadTicketSetting(){if(!currentSession()?.token)return;try{const d=await settingsApi("getSettings");state.ticketBarcodeEnabled=d.ticketBarcodeEnabled!==false;syncTicketControls()}catch(e){console.warn("ticket settings",e)}}
  function syncTicketControls(){for(const id of ["solrakTicketShowBarcode","fielTicketBarcode"]){const el=byId(id);if(el)el.checked=state.ticketBarcodeEnabled}}
  function bindTicketSetting(){document.addEventListener("change",async(e)=>{if(!["solrakTicketShowBarcode","fielTicketBarcode"].includes(e.target?.id))return;const enabled=!!e.target.checked;if(!isAdmin()){syncTicketControls();return toast("Solo el administrador puede cambiar el código de barras del ticket.",true)}try{const d=await settingsApi("setBarcode",{enabled});state.ticketBarcodeEnabled=d.ticketBarcodeEnabled!==false;syncTicketControls();toast(state.ticketBarcodeEnabled?"Código de barras de folio activado.":"Código de barras de folio desactivado.")}catch(err){syncTicketControls();toast(err.message,true)}},true)}

  function install(){if(state.installed)return true;if(!document.body)return false;ensureStyle();state.installed=true;window.confirm=()=>{toast("Esta acción requiere el modal seguro de SOLRAK.",true);return false};installFocus();bindTicketLookupActions();bindTicketSetting();hotkeyLegend();loadTicketSetting();let tries=0;const timer=setInterval(()=>{tries++;installScannerFallback();syncTicketControls();syncEmptyStates();if(tries>120)clearInterval(timer)},100);new MutationObserver(()=>syncEmptyStates()).observe(document.body,{subtree:true,childList:true});return true}

  window.SOLRAKUXV0190={version:VERSION,state,get ticketBarcodeEnabled(){return state.ticketBarcodeEnabled},Dialog,focusSaleSearch,confirmSaleVoid,confirmReturnImpact,openSaleByFolio,receiptFromDetail,install};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
