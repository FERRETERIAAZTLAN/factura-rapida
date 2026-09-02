(() => {
  "use strict";

  const VERSION = "0.1.84";
  const FX_KEY = "solrak:fx-mxn-usd:v0183";
  const STYLE_ID = "solrakUiHardeningV0184Style";
  const byId = (id) => document.getElementById(id);

  function pos(){ return window.FacturaRapidaPOS || null; }
  function notify(message,error=false){
    try{ if(typeof window.notice === "function") return window.notice(message,error); }catch{}
    console[error?"error":"info"]("SOLRAK",message);
  }
  function money(value){
    try{ if(typeof window.money === "function") return window.money(value); }catch{}
    return Number(value||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
  }
  function esc(value){ return String(value??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]); }
  function savedFx(){ try{return localStorage.getItem(FX_KEY)||""}catch{return""} }
  function discountService(){
    const bridge=window.SOLRAKDiscounts;
    return bridge&&typeof bridge.openSaleDiscount==="function"&&typeof bridge.applyLineDiscount==="function"?bridge:null;
  }
  function discountAllowed(){
    try{return window.SOLRAKPermissionsV0179?.can?.("allow_discounts")===true || window.session?.user?.role==="admin" || session?.user?.role==="admin"}catch{return false}
  }

  function injectStyle(){
    if(byId(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
#solrakGlobalDiscount[data-solrak-backend="missing"],#solrakLineDiscount[data-solrak-backend="missing"]{opacity:.46!important;cursor:not-allowed!important;background:#eef0f2!important;color:#6f7982!important}
#solrakFxDialog .solrak83DialogBody>p::after{content:" No se precarga ningún tipo de cambio supuesto.";font-weight:700;color:#4f5d68}
#tab-inventario input[type="number"],#tab-clientes input[type="number"],#tab-proveedores input[type="number"],.fielFormGrid input[type="number"]{min-height:40px!important;font-size:16px!important;font-variant-numeric:tabular-nums!important}
#posCutDialog .frCutGrid,.fielCutGrid{background:#fff!important;border:1px solid #d6dce1!important;padding:10px 14px!important}.frCutRow{min-height:31px!important;align-items:center!important}.frCutRow strong{font-variant-numeric:tabular-nums!important}.frCutRow:nth-last-child(-n+3){background:#f5f7f8!important;font-size:13px!important}
`;
    document.head.appendChild(style);
  }

  function patchFx(){
    const button=byId("solrakFx");
    if(!button||button.dataset.solrak84==="1")return;
    button.dataset.solrak84="1";
    button.onclick=()=>{
      window.SOLRAKUiOperativaV0183?.openFx?.();
      setTimeout(()=>{
        const rate=byId("solrakFxRate"),usd=byId("solrakFxUsd");
        if(!rate)return;
        const stored=savedFx();
        if(!stored){ rate.value=""; rate.placeholder="Captura MXN por USD"; if(usd)usd.value=""; }
      },0);
    };
  }

  function patchDiscounts(){
    const service=discountService(),allowed=discountAllowed();
    const global=byId("solrakGlobalDiscount");
    if(global){
      if(service&&allowed){
        global.removeAttribute("data-solrak-backend");
        global.disabled=false;
        global.setAttribute("data-fiel-pos-tool","discount");
        global.title="";
        global.onclick=()=>service.openSaleDiscount();
      }else{
        global.dataset.solrakBackend="missing";
        global.disabled=true;
        global.removeAttribute("data-fiel-pos-tool");
        global.title=service?"Este usuario no tiene permiso para aplicar descuentos.":"Descuento manual todavía no está habilitado en el backend productivo.";
        global.onclick=null;
      }
    }
    const line=byId("solrakLineDiscount");
    if(line){
      const dialog=byId("solrakLineEditDialog"),lineId=dialog?.dataset?.lineId;
      if(service&&allowed&&lineId){
        line.removeAttribute("data-solrak-backend");line.disabled=false;line.title="";
        line.onclick=()=>{ dialog?.close?.(); service.applyLineDiscount({lineId}); };
      }else{
        line.dataset.solrakBackend="missing";line.disabled=true;
        line.title=service?"Este usuario no tiene permiso para aplicar descuentos.":"Descuento individual todavía no está habilitado en el backend productivo.";
      }
    }
  }

  function lineAmount(line){
    const gross=Number(line?.price||0)*Number(line?.qty||0),rate=Number(line?.iva??16)/100;
    if(line?.price_includes_tax!==false){const base=rate?gross/(1+rate):gross;return{base,tax:gross-base,total:gross}}
    const tax=gross*rate;return{base:gross,tax,total:gross+tax};
  }
  function printDraft(){
    const api=pos(),cart=Array.isArray(api?.cart)?api.cart:[];
    if(!cart.length)return notify("Agrega productos antes de imprimir el borrador.",true);
    const totals=cart.reduce((sum,line)=>{const x=lineAmount(line);sum.base+=x.base;sum.tax+=x.tax;sum.total+=x.total;return sum},{base:0,tax:0,total:0});
    const rows=cart.map((line)=>`<tr><td>${esc(line.code||"—")}</td><td>${esc(line.name||"Producto")}</td><td class="n">${Number(line.qty||0)}</td><td class="n">${money(line.price)}</td><td class="n">${money(lineAmount(line).total)}</td></tr>`).join("");
    const win=window.open?.("","_blank","width=900,height=760");
    if(!win)return notify("No se pudo abrir la ventana de impresión.",true);
    const ticket=api?.activeTicketId||1;
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cotización borrador</title><style>body{font-family:Segoe UI,Arial,sans-serif;margin:30px;color:#26313a}h1{margin:0;font-size:24px}.tag{display:inline-block;margin-top:8px;padding:5px 8px;background:#eceff1;font-size:11px;font-weight:800}.meta{margin-top:7px;color:#68747d;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:12px}th,td{padding:8px;border-bottom:1px solid #dfe3e6;text-align:left}.n{text-align:right}.tot{width:320px;margin:18px 0 0 auto}.tot div{display:flex;justify-content:space-between;padding:5px 0}.grand{border-top:2px solid #26313a;font-size:18px;font-weight:800}.foot{margin-top:26px;border-top:1px solid #ddd;padding-top:11px;color:#68747d;font-size:11px}@media print{body{margin:14mm}}</style></head><body><h1>SOLRAK · Cotización borrador</h1><span class="tag">BORRADOR · NO ES CFDI</span><div class="meta">Ticket ${ticket} · ${new Date().toLocaleString("es-MX")}</div><table><thead><tr><th>Código</th><th>Descripción</th><th class="n">Cantidad</th><th class="n">P. unitario</th><th class="n">Importe</th></tr></thead><tbody>${rows}</tbody></table><div class="tot"><div><span>Subtotal</span><strong>${money(totals.base)}</strong></div><div><span>IVA</span><strong>${money(totals.tax)}</strong></div><div class="grand"><span>Total</span><strong>${money(totals.total)}</strong></div></div><div class="foot">Este borrador no timbra CFDI y no modifica inventario ni caja.</div><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
    win.document.close();
  }
  function patchDraft(){
    const button=byId("solrakDraftQuote");
    if(!button||button.dataset.solrak84==="1")return;
    button.dataset.solrak84="1";
    button.textContent="Cotización borrador";
    button.title="Imprime el ticket actual como borrador sin guardar ni descontar inventario.";
    button.onclick=printDraft;
  }
  function patchServices(){
    const button=byId("solrakServices");if(!button)return;
    const service=window.SOLRAKServices;
    if(typeof service?.open==="function"){button.disabled=false;button.title="";button.onclick=()=>service.open()}
    else{button.disabled=true;button.title="Requiere un proveedor externo productivo de recargas/servicios; SOLRAK no simula operaciones."}
  }
  function sync(){ injectStyle();patchFx();patchDiscounts();patchDraft();patchServices(); }
  function boot(){
    sync();
    document.addEventListener("solrak:permissions-updated",()=>setTimeout(sync,0));
    document.addEventListener("dblclick",(event)=>{if(event.target?.closest?.("#posCart [data-pos-line]"))setTimeout(patchDiscounts,0)},true);
    setInterval(sync,1200);
    setTimeout(sync,250);setTimeout(sync,900);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKUiHardeningV0184={version:VERSION,sync,printDraft,discountService};
})();
