(() => {
  "use strict";

  const VERSION="0.1.87";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/catalog-integrity-api";
  const byId=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const state={categories:[],loaded:false,status:"idle",error:""};

  function currentSession(){try{return session||window.session||null}catch{return window.session||null}}
  function anonKey(){try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function isAdmin(){return currentSession()?.user?.role==="admin"}
  function productsNow(){try{return Array.isArray(products)?products:(window.products||[])}catch{return window.products||[]}}
  function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};console[error?"error":"info"]("SOLRAK",message)}

  async function api(action,payload={}){
    const key=anonKey(),token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo consultar categorías");
    return data;
  }

  function ensureStyle(){
    if(byId("solrakCategories87Style"))return;
    const style=document.createElement("style");style.id="solrakCategories87Style";
    style.textContent=`
.solrak87Categories{margin-top:10px}.solrak87CategoryForm{display:grid;grid-template-columns:120px minmax(220px,1fr) auto;gap:7px;align-items:end;margin-bottom:8px}.solrak87CategoryForm .reserved{height:35px;display:flex;align-items:center;padding:0 9px;border:1px solid #d8dfe4;background:#f5f7f9;border-radius:4px;font-size:11px;font-weight:850}.solrak87CategoryTable{width:100%;border-collapse:collapse;font-size:11px}.solrak87CategoryTable th,.solrak87CategoryTable td{padding:6px 7px;border-bottom:1px solid #edf0f2}.solrak87CategoryTable th{position:sticky;top:0;background:#f4f6f7;z-index:1;font-size:9px;text-transform:uppercase}.solrak87CategoryId{font-size:15px;font-weight:900;font-variant-numeric:tabular-nums}.solrak87Reserved{display:inline-block;margin-left:6px;padding:2px 5px;border-radius:3px;background:#eef5ff;color:#285d9b;font-size:8px;font-weight:900}.solrak87CategoryState{font-size:9px;font-weight:900}.solrak87CategoryState.off{color:#9a4242}.solrak87CategoryState.on{color:#247044}#pCategory option:disabled{color:#999}.solrak87Integrity{padding:7px 9px;border:1px solid #d7e0e8;background:#f7fafc;border-radius:5px;font-size:10px;color:#60707d;margin-top:7px}.solrak87State{min-height:88px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #dde2e6;background:#fafbfc;color:#66737d;font-size:11px;font-weight:700}.solrak87State.error{border-color:#e3c2c2;background:#fff7f7;color:#963c3c;flex-direction:column}.solrak87State.empty{color:#6d7881}@media(max-width:760px){.solrak87CategoryForm{grid-template-columns:1fr}.solrak87CategoryForm .reserved{display:none}}
`;
    document.head.appendChild(style);
  }

  function productCount(category){return productsNow().filter(p=>Number(p.category_id)===Number(category.id)&&p.active!==false).length}

  function syncCategorySelect(){
    const old=byId("pCategory");if(!old||!state.loaded)return;
    const selected=old.value||"Producto en General";
    let select=old;
    if(old.tagName!=="SELECT"){
      select=document.createElement("select");select.id="pCategory";select.className=old.className||"field";select.required=true;old.replaceWith(select);
    }
    const categories=state.categories;
    select.innerHTML=categories.map(c=>`<option value="${esc(c.name)}" ${c.active===false?'disabled':''}>#${c.id} · ${esc(c.name)}${c.active===false?' · Inactiva':''}</option>`).join("");
    const match=categories.find(c=>c.name===selected)||categories.find(c=>c.name==="Producto en General")||categories.find(c=>c.id===1)||categories[0];
    if(match){
      const options=[...select.options];
      const existing=options.find(option=>option.value===match.name);
      if(existing&&match.active===false)existing.disabled=false;
      select.value=match.name;
    }
  }

  function head(disabled=false){return `<div class="card-head"><div><h2>Categorías</h2><p class="muted small">IDs consecutivos por negocio. La categoría 1 está reservada permanentemente para Producto Común.</p></div><button id="solrak87Refresh" class="secondary compact" type="button" ${disabled?'disabled':''}>Actualizar</button></div>`}
  function bindRefresh(){const button=byId("solrak87Refresh");if(button)button.onclick=()=>refresh().catch(e=>notify(e.message,true))}

  function renderManager(){
    if(!isAdmin())return;
    const tab=byId("tab-inventario");if(!tab)return;
    let card=byId("solrakCategoryManager");
    if(!card){card=document.createElement("article");card.id="solrakCategoryManager";card.className="card solrak87Categories";tab.appendChild(card)}
    if(state.status==="loading"){
      card.innerHTML=`${head(true)}<div class="solrak87State" role="status" aria-live="polite">Cargando categorías…</div>`;bindRefresh();return;
    }
    if(state.status==="error"){
      card.innerHTML=`${head(false)}<div class="solrak87State error" role="alert"><strong>Error al cargar categorías</strong><span>${esc(state.error||"No se pudo consultar el catálogo.")}</span><button id="solrak87Retry" class="secondary compact" type="button">Reintentar</button></div>`;bindRefresh();byId("solrak87Retry").onclick=()=>refresh().catch(e=>notify(e.message,true));return;
    }
    card.innerHTML=`${head(false)}
      <div class="solrak87CategoryForm"><div><label>ID siguiente</label><div class="reserved">Automático</div></div><label>Nombre de categoría<input id="solrak87CategoryName" class="field" maxlength="150" placeholder="Ej. Plomería"></label><button id="solrak87Create" class="primary" type="button">Crear categoría</button></div>
      <div class="table-wrap"><table class="solrak87CategoryTable"><thead><tr><th>ID</th><th>Nombre</th><th>Productos activos</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${state.categories.length?state.categories.map(c=>`<tr><td class="solrak87CategoryId">${c.id}</td><td><strong>${esc(c.name)}</strong>${c.id===1?'<span class="solrak87Reserved">RESERVADA</span>':''}</td><td>${productCount(c)}</td><td><span class="solrak87CategoryState ${c.active?'on':'off'}">${c.active?'ACTIVA':'INACTIVA'}</span></td><td><button class="secondary compact" data-solrak-category-active="${c.id}" data-next-active="${c.active?'0':'1'}" type="button" ${c.id===1?'disabled title="Producto Común no se puede desactivar"':''}>${c.active?'Desactivar':'Activar'}</button></td></tr>`).join(""):'<tr><td colspan="5"><div class="solrak87State empty">No hay registros de categorías.</div></td></tr>'}</tbody></table></div>
      <div class="solrak87Integrity"><strong>Integridad:</strong> no hay botón de eliminar. Una categoría con productos activos tampoco puede desactivarse; primero debes reasignar o dar de baja esos productos.</div>`;
    bindRefresh();
    byId("solrak87Create").onclick=createCategory;
    byId("solrak87CategoryName").onkeydown=(event)=>{if(event.key==="Enter"){event.preventDefault();createCategory()}};
    card.querySelectorAll("[data-solrak-category-active]").forEach(button=>button.onclick=()=>setActive(button));
  }

  async function createCategory(){
    const input=byId("solrak87CategoryName"),name=input?.value.trim()||"";if(!name)return notify("Escribe el nombre de la categoría.",true);
    const button=byId("solrak87Create");if(button)button.disabled=true;
    try{const result=await api("createCategory",{name});if(input)input.value="";await refresh();notify(result.existing?`La categoría #${result.category_id} ya existía.`:`Categoría #${result.category_id} creada.`)}catch(error){notify(error.message,true)}finally{if(button)button.disabled=false}
  }

  async function setActive(button){
    const id=Number(button.dataset.solrakCategoryActive),active=button.dataset.nextActive==="1";
    const category=state.categories.find(c=>c.id===id);if(!category)return;
    if(!active){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Desactivar categoría',message:`¿Desactivar la categoría #${id} ${category.name}?`,detail:'No se eliminará. Su ID quedará reservado y el servidor impedirá desactivarla si conserva productos activos.',danger:true,confirmText:'Desactivar · Enter'});if(!accepted)return;}
    button.disabled=true;
    try{await api("setCategoryActive",{categoryId:id,active});await refresh();notify(active?"Categoría activada.":"Categoría desactivada sin borrar su ID.")}catch(error){notify(error.message,true)}finally{button.disabled=false}
  }

  async function refresh(){
    if(!currentSession()?.token)return;
    state.status="loading";state.error="";renderManager();
    try{
      const result=await api("listCategories");state.categories=result.categories||[];state.loaded=true;state.status="ready";syncCategorySelect();renderManager();
      document.dispatchEvent(new CustomEvent("solrak:categories-updated",{detail:{categories:state.categories}}));
    }catch(error){state.status="error";state.error=error?.message||"No se pudo consultar categorías.";renderManager();throw error}
  }

  function sync(){ensureStyle();syncCategorySelect()}
  function boot(){
    ensureStyle();refresh().catch(e=>console.warn("SOLRAK categories",e));
    document.addEventListener("click",event=>{const hit=event.target?.closest?.('[data-tab="inventario"],#openProduct,[data-editp]');if(hit)setTimeout(()=>{sync();if(!state.loaded)refresh().catch(()=>{});else renderManager()},25)},true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKCategoriesV0187={version:VERSION,state,api,refresh,syncCategorySelect};
})();
