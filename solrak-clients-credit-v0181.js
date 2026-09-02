(() => {
  "use strict";

  const VERSION="0.1.81";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/client-api";
  const byId=(id)=>document.getElementById(id);
  const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const money=(value)=>Number(value||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
  const state={clients:[],loaded:false,status:"idle",error:""};
  let observer=null,scheduled=false;

  function currentSession(){try{return session||window.session||null}catch{return window.session||null}}
  function anonKey(){try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function isAdmin(){return currentSession()?.user?.role==="admin"}
  function notify(message,error=false){try{if(typeof window.notice==="function")return window.notice(message,error)}catch{} console[error?"error":"info"]("SOLRAK",message)}

  async function api(action,payload={}){
    const key=anonKey(),token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo continuar");
    return data;
  }

  function mapById(){return new Map(state.clients.map((client)=>[client.id,client]))}

  function sanitizeClientUi(){
    if(!state.loaded)return;
    const rows=mapById();
    const invoiceSelect=byId("invoiceClient");
    if(invoiceSelect){
      [...invoiceSelect.options].forEach((option)=>{
        if(!option.value)return;
        const client=rows.get(option.value);
        if(client?.active===false)option.remove();
      });
    }
    document.querySelectorAll("#clientList [data-ci][data-id]").forEach((button)=>{
      const client=rows.get(button.dataset.id);
      if(!client)return;
      const clientRow=button.closest(".client-row");
      if(clientRow){
        clientRow.dataset.solrakClientActive=client.active===false?"0":"1";
        clientRow.style.opacity=client.active===false?"0.58":"";
        const strong=clientRow.querySelector("strong");
        if(client.active===false&&strong&&!strong.querySelector(".solrakClientInactive"))strong.insertAdjacentHTML("beforeend",' <span class="badge bad solrakClientInactive">Inactivo</span>');
      }
      if(button.dataset.ci==="invoice"){
        button.disabled=client.active===false;
        button.title=client.active===false?"Activa al cliente antes de usarlo en una nueva venta o factura.":"";
      }
    });
  }

  function ensureStyle(){
    if(byId("solrakClientCreditStyle"))return;
    const style=document.createElement("style");style.id="solrakClientCreditStyle";
    style.textContent=`.solrakClientToggle{display:flex;align-items:center;gap:7px;font-size:11px}.solrakClientToggle input{width:16px;height:16px;accent-color:#e97618}.solrakCreditLimit{min-width:120px;padding:7px 9px}.badge.bad{background:#fff0f0;color:#a43131}.solrakClientState{min-height:92px;display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid #dde2e6;background:#fafbfc;color:#65727d;font-size:11px;font-weight:700}.solrakClientState.error{border-color:#e4c2c2;background:#fff7f7;color:#993c3c;flex-direction:column}.solrakClientState.empty{color:#6d7881}.solrakClientState button{height:31px}`;
    document.head.appendChild(style);
  }

  function managerHead(disabled=false){return `<div class="card-head"><div><h2>Clientes y Crédito</h2><p class="muted small">Autoriza crédito, define el límite máximo de deuda y administra la baja lógica sin borrar historial.</p></div><button id="solrakClientsRefresh" class="secondary compact" type="button" ${disabled?'disabled':''}>Actualizar</button></div>`}

  function bindRefresh(){const button=byId("solrakClientsRefresh");if(button)button.onclick=()=>refreshManagement().catch((e)=>notify(e.message,true))}

  function renderManager(){
    if(!isAdmin())return;
    ensureStyle();
    const tab=byId("tab-clientes");if(!tab)return;
    let card=byId("solrakClientCreditManager");
    if(!card){card=document.createElement("article");card.id="solrakClientCreditManager";card.className="card";card.style.marginTop="10px";tab.appendChild(card)}
    if(state.status==="loading"){
      card.innerHTML=`${managerHead(true)}<div class="solrakClientState" role="status" aria-live="polite">Cargando clientes y crédito…</div>`;
      bindRefresh();return;
    }
    if(state.status==="error"){
      card.innerHTML=`${managerHead(false)}<div class="solrakClientState error" role="alert"><strong>Error al cargar clientes</strong><span>${esc(state.error||"No se pudo consultar la información.")}</span><button id="solrakClientsRetry" class="secondary compact" type="button">Reintentar</button></div>`;
      bindRefresh();byId("solrakClientsRetry").onclick=()=>refreshManagement().catch((e)=>notify(e.message,true));return;
    }
    const rows=state.clients;
    card.innerHTML=`${managerHead(false)}
      <div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Estado</th><th>Saldo</th><th>Crédito</th><th>Límite</th><th>Acciones</th></tr></thead><tbody>${rows.length?rows.map((client)=>`<tr data-solrak-client-row="${esc(client.id)}"><td><strong>${esc(client.name)}</strong><div class="muted small">${esc(client.rfc||"")}</div></td><td><span class="badge ${client.active===false?'bad':'good'}">${client.active===false?'Inactivo':'Activo'}</span></td><td><strong>${money(client.balance)}</strong></td><td><label class="solrakClientToggle"><input type="checkbox" data-solrak-credit-enabled="${esc(client.id)}" ${client.credit_enabled?'checked':''} ${client.active===false?'disabled':''}> Autorizado</label></td><td><input class="field solrakCreditLimit" data-solrak-credit-limit="${esc(client.id)}" type="number" min="0" step="0.01" value="${Number(client.credit_limit||0).toFixed(2)}" ${client.active===false?'disabled':''}></td><td><div class="actions"><button class="primary compact" data-solrak-credit-save="${esc(client.id)}" type="button" ${client.active===false?'disabled':''}>Guardar crédito</button><button class="secondary compact" data-solrak-client-active="${esc(client.id)}" data-next-active="${client.active===false?'1':'0'}" type="button">${client.active===false?'Activar':'Dar de baja'}</button></div></td></tr>`).join(""):'<tr><td colspan="6"><div class="solrakClientState empty">No hay registros de clientes.</div></td></tr>'}</tbody></table></div>
      <div class="help">Una baja no elimina al cliente ni sus ventas, facturas o abonos. Si conserva saldo pendiente, todavía se pueden registrar pagos para liquidarlo; solo se bloquean nuevas ventas a crédito.</div>`;
    bindRefresh();
    card.querySelectorAll("[data-solrak-credit-save]").forEach((button)=>button.onclick=async()=>{
      const id=button.dataset.solrakCreditSave;
      const enabled=card.querySelector(`[data-solrak-credit-enabled="${id}"]`)?.checked===true;
      const limit=Number(card.querySelector(`[data-solrak-credit-limit="${id}"]`)?.value||0);
      button.disabled=true;
      try{await api("saveCreditSettings",{clientId:id,creditEnabled:enabled,creditLimit:limit});notify("Configuración de crédito guardada.");await refreshManagement()}
      catch(error){notify(error.message,true)}finally{button.disabled=false}
    });
    card.querySelectorAll("[data-solrak-client-active]").forEach((button)=>button.onclick=async()=>{
      const id=button.dataset.solrakClientActive,next=button.dataset.nextActive==="1";
      const client=state.clients.find((row)=>row.id===id);
      if(!next){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Dar de baja cliente',message:`¿Dar de baja a ${client?.name||'este cliente'}?`,detail:'Se conservarán ventas, facturas, abonos y saldo. Solo se bloquearán nuevas operaciones que requieran un cliente activo.',danger:true,confirmText:'Dar de baja · Enter'});if(!accepted)return;}
      button.disabled=true;
      try{await api("setClientActive",{clientId:id,active:next});try{if(typeof loadAll==="function")await loadAll();else if(typeof window.loadAll==="function")await window.loadAll()}catch{};notify(next?"Cliente activado.":"Cliente dado de baja sin borrar su historial.");await refreshManagement()}
      catch(error){notify(error.message,true)}finally{button.disabled=false}
    });
  }

  async function refreshManagement(){
    if(!currentSession()?.token||!isAdmin())return;
    state.status="loading";state.error="";renderManager();
    try{
      const result=await api("listClientsManagement");
      state.clients=result.clients||[];state.loaded=true;state.status="ready";
      renderManager();sanitizeClientUi();
      document.dispatchEvent(new CustomEvent("solrak:clients-credit-updated",{detail:{clients:state.clients}}));
    }catch(error){
      state.status="error";state.error=error?.message||"No se pudo consultar clientes.";renderManager();throw error;
    }
  }

  function scheduleSanitize(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sanitizeClientUi()},15)}

  function boot(){
    if(!isAdmin())return;
    observer=new MutationObserver(scheduleSanitize);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener("click",(event)=>{
      const button=event.target?.closest?.('[data-tab="clientes"],[data-tab-target="clientes"]');
      if(button)setTimeout(()=>refreshManagement().catch((e)=>notify(e.message,true)),25);
    });
    setTimeout(()=>refreshManagement().catch((e)=>console.warn("SOLRAK clients credit",e)),120);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKClientsCreditV0181={version:VERSION,state,api,refresh:refreshManagement,sanitize:sanitizeClientUi};
})();
