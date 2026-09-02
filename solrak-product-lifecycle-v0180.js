(() => {
  "use strict";

  const VERSION = "0.1.80";
  const API_URL = "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/product-lifecycle-api";
  const byId = (id) => document.getElementById(id);
  let observer = null;

  function currentSession(){ try{return session||window.session||null}catch{return window.session||null} }
  function anonKey(){ try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""} }
  function productsNow(){ try{return Array.isArray(products)?products:(Array.isArray(window.products)?window.products:[])}catch{return Array.isArray(window.products)?window.products:[]} }
  function editingId(){ try{return editingProductId||window.editingProductId||null}catch{return window.editingProductId||null} }

  function notify(message,error=false){
    try{if(typeof window.notice==="function")return window.notice(message,error)}catch{}
    console[error?"error":"info"]("SOLRAK",message);
  }

  async function lifecycleApi(action,payload={}){
    const key=anonKey();
    const token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo continuar");
    return data;
  }

  function annotateInventory(){
    document.querySelectorAll("#inventoryBody [data-editp]").forEach((button)=>{
      const product=productsNow().find((row)=>row.id===button.dataset.editp);
      const tr=button.closest("tr");
      if(!product||!tr)return;
      tr.dataset.solrakProductActive=product.active===false?"0":"1";
      if(product.active===false){
        tr.style.opacity="0.58";
        const cell=tr.querySelector("td.productname");
        if(cell&&!cell.querySelector(".solrakInactiveBadge"))cell.insertAdjacentHTML("beforeend",'<div><span class="badge bad solrakInactiveBadge">Inactivo</span></div>');
      }else{
        tr.style.opacity="";
        tr.querySelector(".solrakInactiveBadge")?.parentElement?.remove();
      }
    });
  }

  function syncButton(){
    const button=byId("deleteProduct");
    if(!button)return;
    button.textContent="Dar de baja";
    button.title="Conserva el historial del producto. Solo se elimina físicamente si nunca tuvo movimientos.";
  }

  async function retireCurrentProduct(){
    const id=editingId();
    if(!id)return;
    const product=productsNow().find((row)=>row.id===id);
    const name=product?.name||"este producto";
    const ok=await window.SOLRAKUXV0192?.confirm?.({title:'Dar de baja producto',message:`¿Dar de baja ${name}?`,detail:'Si tiene historial, SOLRAK lo desactivará y conservará ventas y movimientos. Solo se eliminará físicamente si el servidor verifica que nunca tuvo historial.',danger:true,confirmText:'Dar de baja · Enter'});
    if(!ok)return;
    const button=byId("deleteProduct");
    if(button)button.disabled=true;
    try{
      const result=await lifecycleApi("retireProduct",{productId:id});
      byId("productDialog")?.close?.();
      try{editingProductId=null}catch{window.editingProductId=null}
      try{if(typeof loadAll==="function")await loadAll();else if(typeof window.loadAll==="function")await window.loadAll()}catch{}
      annotateInventory();
      if(result.mode==="deactivated")notify("Producto desactivado. Sus ventas y movimientos históricos se conservaron.");
      else notify("Producto eliminado porque no tenía historial operativo.");
    }catch(error){
      notify(error.message,true);
    }finally{
      if(button)button.disabled=false;
    }
  }

  function install(){
    syncButton();
    const button=byId("deleteProduct");
    if(button)button.onclick=retireCurrentProduct;
    annotateInventory();
    const body=byId("inventoryBody");
    if(body){
      observer?.disconnect?.();
      observer=new MutationObserver(()=>annotateInventory());
      observer.observe(body,{childList:true,subtree:true});
    }
    const dialog=byId("productDialog");
    dialog?.addEventListener?.("toggle",syncButton);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();

  window.SOLRAKProductLifecycleV0180={version:VERSION,retireProduct:retireCurrentProduct,api:lifecycleApi,annotateInventory};
})();
