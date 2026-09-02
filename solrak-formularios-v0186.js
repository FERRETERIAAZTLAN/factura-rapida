(() => {
  "use strict";

  const VERSION="0.1.86";
  const byId=(id)=>document.getElementById(id);
  let productSubmitInstalled=false,clientSubmitInstalled=false,syncTimer=null;

  function productsNow(){try{return Array.isArray(products)?products:(window.products||[])}catch{return window.products||[]}}
  function clientsNow(){try{return Array.isArray(clients)?clients:(window.clients||[])}catch{return window.clients||[]}}
  function productId(){try{return editingProductId||null}catch{return window.editingProductId||null}}
  function clientId(){try{return editingClientId||null}catch{return window.editingClientId||null}}
  function admin(){try{return session?.user?.role==="admin"}catch{return window.session?.user?.role==="admin"}}
  function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};window.notice?.(message,error)}
  function setBusy(value){try{if(typeof busy==="function")return busy(value)}catch{};document.body.classList.toggle("loading",value)}
  async function baseApi(action,payload={}){try{return await api(action,payload)}catch(error){throw error}}
  async function reload(){try{if(typeof loadAll==="function")return await loadAll()}catch{};return window.loadAll?.()}
  function closeDialog(id){const d=byId(id);if(!d)return;try{d.close()}catch{d.removeAttribute("open")}}

  function ensureStyle(){
    if(byId("solrakForms86Style"))return;
    const style=document.createElement("style");style.id="solrakForms86Style";
    style.textContent=`
html[data-solrak-forms86="1"] #productDialog{width:min(980px,calc(100% - 28px))!important}html[data-solrak-forms86="1"] #productDialog .modal-inner{padding:14px 16px!important}
html[data-solrak-forms86="1"] #productForm{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px 10px!important}html[data-solrak-forms86="1"] #productForm label,html[data-solrak-forms86="1"] #clientForm label{gap:4px!important;font-size:10px!important;text-transform:uppercase;letter-spacing:.02em;color:#61707b}html[data-solrak-forms86="1"] #productForm .field,html[data-solrak-forms86="1"] #clientForm .field{border-radius:4px!important;padding:7px 9px!important;min-height:35px!important;font-size:12px!important}
html[data-solrak-forms86="1"] #productForm label:has(#pName){grid-column:span 2}html[data-solrak-forms86="1"] #productForm .span2{grid-column:span 3!important}.solrak86Numeric{font-size:17px!important;font-weight:750!important;font-variant-numeric:tabular-nums}.solrak86Toggle{display:flex!important;align-items:center!important;gap:8px!important;min-height:38px;padding:6px 9px;border:1px solid #d5dce2;border-radius:4px;background:#f8fafb;text-transform:none!important}.solrak86Toggle input{width:18px;height:18px;accent-color:var(--solrak83-accent,#2588d8)}
.solrak86Validation{grid-column:span 3;display:flex;gap:7px;align-items:center;min-height:31px;padding:6px 9px;border:1px solid #d9dfe4;background:#f7f9fa;border-radius:4px;font-size:10px;color:#63707b}.solrak86Validation.good{border-color:#b8dec8;background:#f2fbf6;color:#1f7046}.solrak86Validation.warn{border-color:#ead09d;background:#fff9ec;color:#8a5a12}.solrak86Validation.bad{border-color:#e6b9b9;background:#fff3f3;color:#993636}.solrak86Dot{width:8px;height:8px;border-radius:50%;background:currentColor;flex:0 0 8px}
html[data-solrak-forms86="1"] #clientForm{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px 10px!important}html[data-solrak-forms86="1"] #clientForm .span2{grid-column:span 3!important}html[data-solrak-forms86="1"] #clientForm label:has(#clientName){grid-column:span 3!important}html[data-solrak-forms86="1"] #clientForm label:has(#clientRegime){grid-column:span 2!important}html[data-solrak-forms86="1"] #clientForm label:has(#clientCfdiUse){grid-column:span 2!important}#solrakClientActiveLabel{align-self:end}.solrak86StateText{font-size:10px;font-weight:800;text-transform:none}
html[data-solrak-forms86="1"] #deleteProduct{background:#fff!important;border-color:#d5a8a8!important;color:#8c3434!important}html[data-solrak-forms86="1"] #deleteProduct::after{content:" · conserva historial";font-size:9px;font-weight:600}
@media(max-width:760px){html[data-solrak-forms86="1"] #productForm,html[data-solrak-forms86="1"] #clientForm{grid-template-columns:1fr!important}html[data-solrak-forms86="1"] #productForm>* ,html[data-solrak-forms86="1"] #clientForm>*{grid-column:span 1!important}}
`;
    document.head.appendChild(style);
  }

  function addProductFields(){
    const form=byId("productForm");if(!form)return;
    const stockLabel=byId("pStock")?.closest("label");
    if(stockLabel&&!byId("pMinStock")){
      const min=document.createElement("label");min.innerHTML='Existencia mínima<input id="pMinStock" class="field solrak86Numeric" type="number" step="0.001" min="0" value="0">';
      const max=document.createElement("label");max.innerHTML='Existencia máxima<input id="pMaxStock" class="field solrak86Numeric" type="number" step="0.001" min="0" value="0">';
      stockLabel.insertAdjacentElement("afterend",min);min.insertAdjacentElement("afterend",max);
    }
    const priceLabel=byId("pPrice")?.closest("label");
    if(priceLabel&&!byId("pWholesale")){
      const wholesale=document.createElement("label");wholesale.innerHTML='Precio mayoreo<input id="pWholesale" class="field solrak86Numeric" type="number" step="0.01" min="0" value="0">';priceLabel.insertAdjacentElement("afterend",wholesale);
    }
    if(!byId("pActive")){
      const tax=byId("pTaxIncluded")?.closest("label");
      const active=document.createElement("label");active.className="solrak86Toggle";active.innerHTML='<input id="pActive" type="checkbox" checked><span><strong>Producto activo</strong><br><span class="solrak86StateText">Disponible para nuevas ventas</span></span>';
      tax?.insertAdjacentElement("beforebegin",active);
    }
    if(!byId("solrakProductValidation")){
      const box=document.createElement("div");box.id="solrakProductValidation";box.className="solrak86Validation";box.innerHTML='<span class="solrak86Dot"></span><span>Completa costo, precio y existencias.</span>';
      form.querySelector(".actions")?.insertAdjacentElement("beforebegin",box);
    }
    ["pCost","pPrice","pWholesale","pStock","pMinStock","pMaxStock","pIva"].forEach(id=>byId(id)?.classList.add("solrak86Numeric"));
    ["pCost","pPrice","pWholesale","pStock","pMinStock","pMaxStock","pActive"].forEach(id=>{const el=byId(id);if(el&&!el.dataset.solrak86Validation){el.dataset.solrak86Validation="1";el.addEventListener("input",validateProduct);el.addEventListener("change",validateProduct)}});
  }

  function currentProduct(){const id=productId();return id?productsNow().find(p=>p.id===id):null}
  function populateProductExtras(){
    addProductFields();const p=currentProduct();
    if(byId("pWholesale"))byId("pWholesale").value=Number(p?.wholesale||0);
    if(byId("pMinStock"))byId("pMinStock").value=Number(p?.min_stock||0);
    if(byId("pMaxStock"))byId("pMaxStock").value=Number(p?.max_stock||0);
    if(byId("pActive"))byId("pActive").checked=p?.active!==false;
    updateProductStateCopy();validateProduct();
  }
  function updateProductStateCopy(){const label=byId("pActive")?.closest(".solrak86Toggle")?.querySelector(".solrak86StateText");if(label)label.textContent=byId("pActive").checked?"Disponible para nuevas ventas":"Inactivo; conserva historial y movimientos"}
  function validateProduct(){
    updateProductStateCopy();const box=byId("solrakProductValidation");if(!box)return true;
    const cost=Number(byId("pCost")?.value||0),price=Number(byId("pPrice")?.value||0),wholesale=Number(byId("pWholesale")?.value||0),stock=Number(byId("pStock")?.value||0),min=Number(byId("pMinStock")?.value||0),max=Number(byId("pMaxStock")?.value||0);
    let cls="good",message="Datos de inventario consistentes.";
    if([cost,price,wholesale,stock,min,max].some(v=>!Number.isFinite(v)||v<0)){cls="bad";message="Costo, precios y existencias no pueden ser negativos."}
    else if(max>0&&min>max){cls="bad";message="La existencia mínima no puede ser mayor que la máxima."}
    else if(stock<min){cls="warn";message=`Inventario bajo: ${stock} disponibles y mínimo configurado ${min}.`}
    else if(wholesale>0&&price>0&&wholesale>price){cls="warn";message="El precio de mayoreo es mayor que el precio público; revísalo antes de guardar."}
    else if(price<cost&&price>0){cls="warn";message="El precio público está por debajo del costo."}
    box.className=`solrak86Validation ${cls}`;box.innerHTML=`<span class="solrak86Dot"></span><span>${message}</span>`;return cls!=="bad";
  }

  function installProductSubmit(){
    const form=byId("productForm");if(!form||productSubmitInstalled)return;productSubmitInstalled=true;
    form.onsubmit=async(event)=>{
      event.preventDefault();if(!validateProduct())return notify("Corrige los datos de inventario marcados antes de guardar.",true);
      setBusy(true);const id=productId();
      try{
        const product={id:id||undefined,code:byId("pCode").value.trim(),name:byId("pName").value.trim(),cost:Number(byId("pCost").value)||0,price:Number(byId("pPrice").value)||0,wholesale:Number(byId("pWholesale").value)||0,stock:Number(byId("pStock").value)||0,min_stock:Number(byId("pMinStock").value)||0,max_stock:Number(byId("pMaxStock").value)||0,unit:byId("pUnit").value.trim()||"Pieza",sat_key:byId("pSat").value.trim(),unit_key:byId("pUnitKey").value.trim().toUpperCase(),iva:Number(byId("pIva").value)||16,category:byId("pCategory").value.trim()||"Producto en General",price_includes_tax:byId("pTaxIncluded").checked,active:byId("pActive").checked,source:"Manual"};
        await baseApi("saveProduct",{product});closeDialog("productDialog");try{editingProductId=null}catch{window.editingProductId=null};await reload();notify(id?"Producto actualizado.":"Producto guardado.");
      }catch(error){notify(error.message,true)}finally{setBusy(false)}
    };
  }

  function addClientFields(){
    const form=byId("clientForm");if(!form)return;
    byId("clientCP")?.setAttribute("maxlength","5");
    if(!byId("clientActive")){
      const phone=byId("clientPhone")?.closest("label");
      const active=document.createElement("label");active.id="solrakClientActiveLabel";active.className="solrak86Toggle";active.innerHTML='<input id="clientActive" type="checkbox" checked><span><strong>Cliente activo</strong><br><span class="solrak86StateText">Disponible para nuevas operaciones</span></span>';
      phone?.insertAdjacentElement("afterend",active);
    }
    if(!byId("solrakClientValidation")){
      const box=document.createElement("div");box.id="solrakClientValidation";box.className="solrak86Validation";box.innerHTML='<span class="solrak86Dot"></span><span>Completa los datos fiscales obligatorios.</span>';
      form.querySelector(".actions")?.insertAdjacentElement("beforebegin",box);
    }
    byId("clientCP")?.classList.add("solrak86Numeric");
    ["clientName","clientRFC","clientCP","clientRegime","clientCfdiUse","clientActive"].forEach(id=>{const el=byId(id);if(el&&!el.dataset.solrak86Validation){el.dataset.solrak86Validation="1";el.addEventListener("input",validateClient);el.addEventListener("change",validateClient)}});
  }
  function currentClient(){const id=clientId();return id?clientsNow().find(c=>c.id===id):null}
  function populateClientState(){
    addClientFields();const c=currentClient(),toggle=byId("clientActive");if(!toggle)return;
    toggle.checked=c?.active!==false;toggle.disabled=!admin()||!c;
    const copy=toggle.closest(".solrak86Toggle")?.querySelector(".solrak86StateText");if(copy)copy.textContent=!c?"Los clientes nuevos se crean activos":toggle.checked?"Disponible para nuevas operaciones":"Inactivo; historial conservado";
    validateClient();
  }
  function validateClient(){
    const box=byId("solrakClientValidation");if(!box)return true;
    const name=byId("clientName")?.value.trim()||"",rfc=(byId("clientRFC")?.value||"").trim().toUpperCase(),cp=(byId("clientCP")?.value||"").trim();
    let cls="good",message="Datos básicos listos para guardar.";
    if(!name){cls="bad";message="Escribe el nombre o razón social."}
    else if(rfc&&!/^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/.test(rfc)){cls="warn";message="Revisa el formato del RFC antes de guardar."}
    else if(cp&&!/^\d{5}$/.test(cp)){cls="warn";message="El código postal fiscal debe tener 5 dígitos."}
    box.className=`solrak86Validation ${cls}`;box.innerHTML=`<span class="solrak86Dot"></span><span>${message}</span>`;return cls!=="bad";
  }

  function installClientSubmit(){
    const form=byId("clientForm");if(!form||clientSubmitInstalled)return;clientSubmitInstalled=true;
    form.onsubmit=async(event)=>{
      event.preventDefault();if(!validateClient())return notify("Completa los datos del cliente antes de guardar.",true);
      const id=clientId(),desiredActive=byId("clientActive")?.checked!==false;setBusy(true);
      try{
        const client={id:id||undefined,name:byId("clientName").value.trim(),rfc:byId("clientRFC").value.trim().toUpperCase(),postal_code:byId("clientCP").value.trim(),regime:byId("clientRegime").value,cfdi_use:byId("clientCfdiUse").value,email:byId("clientEmail").value.trim(),phone:byId("clientPhone").value.trim()};
        const result=await baseApi("saveClient",{client});
        if(id&&admin()&&currentClient()?.active!==desiredActive){const clientApi=window.SOLRAKClientsCreditV0181?.api;if(typeof clientApi!=="function")throw new Error("No se encontró el control de estado del cliente.");await clientApi("setClientActive",{clientId:result.client?.id||id,active:desiredActive})}
        try{resetClient()}catch{};await reload();window.SOLRAKClientsCreditV0181?.refresh?.().catch?.(()=>{});notify(id?"Cliente actualizado.":"Cliente guardado.");
      }catch(error){notify(error.message,true)}finally{setBusy(false)}
    };
  }

  function sync(){
    ensureStyle();document.documentElement.dataset.solrakForms86="1";addProductFields();installProductSubmit();addClientFields();installClientSubmit();
    if(byId("productDialog")?.open)populateProductExtras();populateClientState();
  }
  function schedule(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,20)}
  function boot(){
    sync();
    const productDialog=byId("productDialog");productDialog&&new MutationObserver((list)=>{if(list.some(m=>m.attributeName==="open")&&productDialog.open)setTimeout(populateProductExtras,0)}).observe(productDialog,{attributes:true,attributeFilter:["open"]});
    document.addEventListener("click",(event)=>{const edit=event.target?.closest?.("[data-editp],[data-ci='edit'],#openProduct,#cancelClientEdit");if(edit)setTimeout(()=>{populateProductExtras();populateClientState()},20)},true);
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKFormulariosV0186={version:VERSION,validateProduct,validateClient,populateProductExtras,populateClientState};
})();