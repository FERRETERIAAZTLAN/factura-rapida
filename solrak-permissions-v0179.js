(() => {
  "use strict";

  const VERSION = "0.1.79";
  const API_URL = "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/permissions-api";
  const byId = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const DEFAULTS = Object.freeze({ allow_discounts:false, allow_price_changes:false, allow_wholesale:false, allow_inventory_entry:false });
  const LABELS = Object.freeze({
    allow_discounts: "Aplicar descuentos",
    allow_price_changes: "Cambiar precio durante la venta",
    allow_wholesale: "Usar precio de mayoreo",
    allow_inventory_entry: "Ingresar mercancía / ajustar inventario",
  });
  const EMPLOYEE_OPTION = "Empleado · acceso según permisos";
  const EMPLOYEE_HELP = "<strong>Empleado:</strong> accede únicamente a las funciones autorizadas. <strong>Administrador:</strong> tiene acceso completo y configura los permisos de cada empleado.";
  const state = { loaded:false, user:null, permissions:{...DEFAULTS}, users:[] };
  let observer = null;
  let refreshTimer = null;

  function currentSession(){ try{return session||window.session||null}catch{return window.session||null} }
  function anonKey(){ try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""} }
  function isAdmin(){ return currentSession()?.user?.role === "admin" || state.user?.role === "admin"; }

  async function api(action,payload={}){
    const key=anonKey();
    const token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo continuar");
    return data;
  }

  function notice(message,error=false){
    try{if(typeof window.notice==="function")return window.notice(message,error)}catch{}
    console[error?"error":"info"]("SOLRAK",message);
  }

  function can(permission){ return isAdmin() || state.permissions?.[permission]===true; }

  function employeeTerminology(){
    const seller=byId("userRole")?.querySelector('option[value="seller"]');
    if(seller && seller.textContent!==EMPLOYEE_OPTION)seller.textContent=EMPLOYEE_OPTION;
    document.querySelectorAll("#userList .badge").forEach((badge)=>{ if(badge.textContent.trim()==="Vendedor")badge.textContent="Empleado"; });
    const help=document.querySelector("#tab-usuarios .callout");
    if(help && help.innerHTML!==EMPLOYEE_HELP)help.innerHTML=EMPLOYEE_HELP;
  }

  function applyPermissionUi(){
    employeeTerminology();
    const rules=[
      ['[data-fiel-pos-tool="discount"]',"allow_discounts","No tienes permiso para aplicar descuentos."],
      ['[data-solrak-inventory="purchase"]',"allow_inventory_entry","No tienes permiso para registrar entradas de mercancía."],
      ['[data-solrak-inventory="adjustment"]',"allow_inventory_entry","No tienes permiso para ajustar inventario."],
    ];
    for(const [selector,permission,message] of rules){
      document.querySelectorAll(selector).forEach((element)=>{
        const allowed=can(permission);
        if(element.disabled===allowed)element.toggleAttribute("disabled",!allowed);
        const aria=allowed?"false":"true";
        if(element.getAttribute("aria-disabled")!==aria)element.setAttribute("aria-disabled",aria);
        if(element.dataset.solrakPermission!==permission)element.dataset.solrakPermission=permission;
        if(!allowed && element.title!==message)element.title=message;
        else if(allowed && element.title===message)element.removeAttribute("title");
      });
    }
    document.documentElement.dataset.solrakCanDiscount=can("allow_discounts")?"1":"0";
    document.documentElement.dataset.solrakCanPriceChange=can("allow_price_changes")?"1":"0";
    document.documentElement.dataset.solrakCanWholesale=can("allow_wholesale")?"1":"0";
    document.documentElement.dataset.solrakCanInventoryEntry=can("allow_inventory_entry")?"1":"0";
  }

  function permissionSwitch(user,key){
    const checked=user.permissions?.[key]===true?" checked":"";
    const locked=user.role==="admin"?" disabled":"";
    return `<label class="solrakPerm"><input type="checkbox" data-solrak-perm-user="${esc(user.id)}" data-solrak-perm-key="${key}"${checked}${locked}> <span>${esc(LABELS[key])}</span></label>`;
  }

  function ensureStyle(){
    if(byId("solrakPermissionsStyle"))return;
    const style=document.createElement("style");
    style.id="solrakPermissionsStyle";
    style.textContent=".solrakPermGrid{display:grid;grid-template-columns:repeat(2,minmax(190px,1fr));gap:6px 14px;min-width:430px}.solrakPerm{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:650;color:#4d5964}.solrakPerm input{width:16px;height:16px;accent-color:#e97618}[data-solrak-permission][disabled]{opacity:.38!important;cursor:not-allowed!important}@media(max-width:850px){.solrakPermGrid{grid-template-columns:1fr;min-width:270px}}";
    document.head.appendChild(style);
  }

  function ensureManager(){
    const tab=byId("tab-usuarios");
    if(!tab||!isAdmin())return;
    ensureStyle();
    let card=byId("solrakPermissionsManager");
    if(!card){card=document.createElement("article");card.id="solrakPermissionsManager";card.className="card admin-only";card.style.marginTop="16px";tab.appendChild(card);}
    const employees=state.users||[];
    card.innerHTML=`<div class="card-head"><div><h2>Permisos de empleados</h2><p class="muted small">Los usuarios se desactivan; no se eliminan. Los administradores conservan acceso completo.</p></div><button id="solrakPermissionsReload" class="secondary compact" type="button">Actualizar</button></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Permisos</th><th></th></tr></thead><tbody>${employees.length?employees.map((user)=>`<tr><td><strong>${esc(user.name)}</strong><div class="muted small">@${esc(user.username)}</div></td><td>${user.role==="admin"?"Administrador":"Empleado"}</td><td>${user.active===false?"Inactivo":"Activo"}</td><td><div class="solrakPermGrid">${Object.keys(LABELS).map((key)=>permissionSwitch(user,key)).join("")}</div></td><td>${user.role==="admin"?'<span class="badge admin">Acceso total</span>':`<button class="primary compact" type="button" data-solrak-save-perms="${esc(user.id)}">Guardar permisos</button>`}</td></tr>`).join(""):'<tr><td colspan="5" class="empty">No hay usuarios para configurar.</td></tr>'}</tbody></table></div>`;
    byId("solrakPermissionsReload").onclick=()=>refresh(true).catch((error)=>notice(error.message,true));
    card.querySelectorAll("[data-solrak-save-perms]").forEach((button)=>{
      button.onclick=async()=>{
        const userId=button.dataset.solrakSavePerms;
        const permissions={};
        card.querySelectorAll("[data-solrak-perm-user]").forEach((input)=>{ if(input.dataset.solrakPermUser===userId)permissions[input.dataset.solrakPermKey]=input.checked===true; });
        button.disabled=true;
        try{await api("saveUserPermissions",{userId,permissions});notice("Permisos del empleado guardados.");await refresh(true)}
        catch(error){notice(error.message,true)}finally{button.disabled=false}
      };
    });
  }

  async function refresh(includeUsers=false){
    const me=await api("myPermissions");
    state.user=me.user||null;
    state.permissions={...DEFAULTS,...(me.permissions||{})};
    state.loaded=true;
    if(includeUsers&&isAdmin()){
      const list=await api("listUsersPermissions");
      state.users=list.users||[];
    }
    applyPermissionUi();
    if(isAdmin()&&includeUsers)ensureManager();
    document.dispatchEvent(new CustomEvent("solrak:permissions-updated",{detail:{user:state.user,permissions:{...state.permissions}}}));
    return {...state.permissions};
  }

  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{ if(currentSession()?.token)refresh(isAdmin()).catch((error)=>console.warn("SOLRAK permissions",error)); },80);
  }

  function guardClicks(){
    document.addEventListener("click",(event)=>{
      const target=event.target?.closest?.("[data-solrak-permission]");
      if(!target||!target.disabled)return;
      event.preventDefault();event.stopImmediatePropagation();
      const key=target.dataset.solrakPermission;
      notice(`No tienes permiso para ${String(LABELS[key]||"usar esta función").toLocaleLowerCase("es-MX")}.`,true);
    },true);
  }

  function boot(){
    employeeTerminology();
    guardClicks();
    observer=new MutationObserver(()=>applyPermissionUi());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener("solrak:pos-sale-complete",applyPermissionUi);
    document.addEventListener("click",(event)=>{
      const tabButton=event.target?.closest?.('[data-tab="usuarios"],[data-tab-target="usuarios"]');
      if(tabButton&&isAdmin())setTimeout(()=>refresh(true).catch((error)=>notice(error.message,true)),30);
    });
    scheduleRefresh();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKPermissionsV0179={version:VERSION,state,can,api,refresh};
})();
