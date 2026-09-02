(() => {
  "use strict";

  const VERSION="0.1.88";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/inventory-mode-api";
  const byId=(id)=>document.getElementById(id);
  const state={enabled:true,loaded:false};

  function currentSession(){try{return session||window.session||null}catch{return window.session||null}}
  function anonKey(){try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function admin(){return currentSession()?.user?.role==="admin"}
  function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};if(error)window.alert?.(message)}

  async function api(action,payload={}){
    const key=anonKey(),token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo consultar el modo de inventario");
    return data;
  }

  function ensureStyle(){
    if(byId("solrakInventoryMode88Style"))return;
    const style=document.createElement("style");style.id="solrakInventoryMode88Style";
    style.textContent=`
.solrak88ModeCard{margin-top:14px;border-left:4px solid #278052}.solrak88ModeCard.off{border-left-color:#b44747;background:#fffafa}.solrak88ModeRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}.solrak88Switch{display:inline-flex;align-items:center;gap:9px;font-size:11px;font-weight:900}.solrak88Switch input{width:38px;height:20px;accent-color:#278052}.solrak88ModeStatus{display:inline-flex;align-items:center;gap:6px;border:1px solid #cce4d4;background:#eef9f2;color:#176a3a;border-radius:5px;padding:5px 8px;font-size:9px;font-weight:900;text-transform:uppercase}.solrak88ModeStatus.off{border-color:#e8c8c8;background:#fff0f0;color:#9d3838}.solrak88ModeBanner{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;padding:8px 10px;border:1px solid #e4c2c2;background:#fff0f0;color:#943a3a;border-radius:5px;font-size:10px;font-weight:800}.solrak88ModeBanner strong{font-size:11px}.solrak88ModeExplain{margin-top:8px;padding:8px 10px;border:1px dashed #ccd5dd;background:#f8fafb;border-radius:5px;font-size:10px;color:#62707c}.solrak88ModeExplain b{color:#27343e}@media(max-width:700px){.solrak88ModeRow{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);
  }

  function renderBanner(){
    const tab=byId("tab-pos");if(!tab)return;
    let banner=byId("solrak88InventoryBanner");
    if(state.enabled){banner?.remove();return}
    if(!banner){banner=document.createElement("div");banner.id="solrak88InventoryBanner";banner.className="solrak88ModeBanner";const first=tab.firstElementChild;tab.insertBefore(banner,first||null)}
    banner.innerHTML='<div><strong>MODO SIN INVENTARIO ACTIVO</strong><div>Las ventas se cobran y registran normalmente, pero no descuentan existencias.</div></div><span>STOCK CONGELADO</span>';
  }

  function renderCard(){
    const tab=byId("tab-inventario");if(!tab||!state.loaded)return;
    let card=byId("solrakInventoryModeCard");
    if(!card){card=document.createElement("article");card.id="solrakInventoryModeCard";card.className="card solrak88ModeCard";tab.appendChild(card)}
    card.classList.toggle("off",!state.enabled);
    card.innerHTML=`<div class="solrak88ModeRow"><div><div class="card-head" style="margin:0"><div><h2>Control global de inventario</h2><p class="muted small">Define si las ventas modifican existencias. El estado se guarda en el negocio y aplica a todos los usuarios.</p></div></div><span class="solrak88ModeStatus ${state.enabled?'':'off'}">${state.enabled?'Inventario activo':'Stock congelado'}</span></div><label class="solrak88Switch"><input id="solrak88ModeToggle" type="checkbox" ${state.enabled?'checked':''} ${admin()?'':'disabled'}> Descontar inventario al vender</label></div><div class="solrak88ModeExplain"><b>Protección histórica:</b> cada renglón de venta guarda si afectó inventario. Una devolución o cancelación solo restaura stock cuando esa venta realmente lo descontó, aunque cambies este interruptor después.</div>`;
    const toggle=byId("solrak88ModeToggle");if(toggle&&admin())toggle.onchange=()=>changeMode(toggle.checked,toggle);
  }

  function render(){ensureStyle();document.documentElement.dataset.solrakInventoryTracking=state.enabled?"on":"off";renderBanner();renderCard()}

  async function refresh(){
    if(!currentSession()?.token)return;
    const result=await api("getMode");state.enabled=result.inventoryTrackingEnabled!==false;state.loaded=true;render();
    document.dispatchEvent(new CustomEvent("solrak:inventory-mode",{detail:{enabled:state.enabled}}));
  }

  async function changeMode(enabled,toggle){
    if(!admin()){if(toggle)toggle.checked=state.enabled;return}
    if(!enabled){
      const ok=window.confirm?.("¿Activar Modo sin Inventario?\n\nLas nuevas ventas NO descontarán stock hasta que vuelvas a activar el seguimiento. Las ventas seguirán siendo reales y quedarán registradas.");
      if(ok===false){if(toggle)toggle.checked=true;return}
    }
    if(toggle)toggle.disabled=true;
    try{const result=await api("setMode",{enabled});state.enabled=result.inventoryTrackingEnabled!==false;state.loaded=true;render();notify(state.enabled?"Seguimiento de inventario activado.":"Modo sin Inventario activado. Las nuevas ventas no descontarán stock.")}
    catch(error){if(toggle)toggle.checked=state.enabled;notify(error.message,true)}
    finally{const current=byId("solrak88ModeToggle");if(current&&admin())current.disabled=false}
  }

  function boot(){
    ensureStyle();refresh().catch(e=>console.warn("SOLRAK inventory mode",e));
    document.addEventListener("click",event=>{const hit=event.target?.closest?.('[data-tab="inventario"],[data-tab="pos"]');if(hit)setTimeout(()=>{render();if(!state.loaded)refresh().catch(()=>{})},25)},true);
    document.addEventListener("solrak:session-ready",()=>refresh().catch(()=>{}));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKInventoryModeV0188={version:VERSION,state,api,refresh,setEnabled:(enabled)=>changeMode(Boolean(enabled),null)};
})();