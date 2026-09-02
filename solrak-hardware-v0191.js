(() => {
  "use strict";
  const VERSION="0.1.91";
  const byId=(id)=>document.getElementById(id);
  const invoke=()=>window.__TAURI__?.core?.invoke||null;
  const notify=(m,e=false)=>typeof window.notice==="function"?window.notice(m,e):console[e?"error":"info"]("SOLRAK",m);
  const state={native:false,printers:[],ports:[],scale:null,weight:null};

  async function call(command,payload={}){
    const fn=invoke();
    if(!fn)throw new Error("Esta función requiere la aplicación de escritorio SOLRAK para Windows.");
    return await fn(command,payload);
  }
  async function refresh(){
    state.native=!!invoke();
    if(!state.native){render();return state;}
    try{
      const info=await call("solrak_hardware_info");
      state.printers=Array.isArray(info?.printers)?info.printers:[];
      state.ports=Array.isArray(info?.serialPorts)?info.serialPorts:[];
      state.scale=info?.scale||null;
    }catch(error){notify(error.message,true)}
    render();return state;
  }
  async function printTicket(html,printerName=""){
    if(!html)throw new Error("No hay ticket para imprimir.");
    return call("solrak_print_ticket",{html,printerName});
  }
  async function connectScale(portName,baudRate=9600){
    const result=await call("solrak_scale_connect",{portName,baudRate:Number(baudRate)||9600});
    state.scale=result;render();return result;
  }
  async function disconnectScale(){
    const result=await call("solrak_scale_disconnect");state.scale=null;state.weight=null;render();return result;
  }
  async function readWeight(){
    const result=await call("solrak_scale_read");
    const value=Number(result?.weight);
    if(Number.isFinite(value)){
      state.weight=value;
      window.dispatchEvent(new CustomEvent("solrak:scale-weight",{detail:{weight:value,unit:result?.unit||"kg",raw:result?.raw||""}}));
    }
    render();return result;
  }
  function ensurePanel(){
    if(byId("solrakHardware91"))return byId("solrakHardware91");
    const host=byId("tab-config")||byId("tab-configuracion")||document.querySelector('[id*="config"]');
    if(!host)return null;
    const card=document.createElement("article");card.id="solrakHardware91";card.className="card";
    card.innerHTML=`<div class="card-head"><h2>Hardware Windows</h2><span id="solrakHardware91State" class="muted small"></span></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px"><label>Impresora térmica<select id="solrakPrinter91" class="field"><option value="">Predeterminada de Windows</option></select></label><label>Puerto báscula<select id="solrakPort91" class="field"><option value="">Seleccionar COM…</option></select></label><label>Baudios<input id="solrakBaud91" class="field" type="number" value="9600" min="300" max="921600"></label></div><div style="display:flex;gap:6px;margin-top:7px"><button id="solrakRefreshHw91" class="secondary compact" type="button">Detectar dispositivos</button><button id="solrakConnectScale91" class="secondary compact" type="button">Conectar báscula</button><button id="solrakReadScale91" class="secondary compact" type="button">Leer peso</button><strong id="solrakWeight91" style="margin-left:auto;font-size:18px">—</strong></div><div class="help" style="margin-top:6px">El lector de códigos de barras USB funciona como teclado Plug & Play. Impresora y báscula usan el puente nativo de SOLRAK; no se simulan dispositivos desde el navegador.</div>`;
    host.appendChild(card);
    byId("solrakRefreshHw91").onclick=refresh;
    byId("solrakConnectScale91").onclick=()=>connectScale(byId("solrakPort91").value,byId("solrakBaud91").value).catch(e=>notify(e.message,true));
    byId("solrakReadScale91").onclick=()=>readWeight().catch(e=>notify(e.message,true));
    return card;
  }
  function render(){
    if(!ensurePanel())return;
    byId("solrakHardware91State").textContent=state.native?"Puente nativo disponible":"Solo disponible en Windows";
    const printer=byId("solrakPrinter91"),selected=printer.value;
    printer.innerHTML='<option value="">Predeterminada de Windows</option>'+state.printers.map(p=>`<option value="${String(p.name||p).replace(/"/g,"&quot;")}">${String(p.name||p)}</option>`).join("");printer.value=selected;
    const port=byId("solrakPort91"),portSelected=port.value;
    port.innerHTML='<option value="">Seleccionar COM…</option>'+state.ports.map(p=>`<option value="${String(p.name||p.portName||p).replace(/"/g,"&quot;")}">${String(p.name||p.portName||p)}</option>`).join("");port.value=portSelected;
    byId("solrakWeight91").textContent=Number.isFinite(state.weight)?`${state.weight.toFixed(3)} kg`:"—";
  }
  function install(){ensurePanel();refresh();}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",install,{once:true}):install();
  window.SOLRAKHardwareV0191={version:VERSION,state,refresh,printTicket,connectScale,disconnectScale,readWeight};
})();