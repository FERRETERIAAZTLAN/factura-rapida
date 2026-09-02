(() => {
  "use strict";

  const VERSION="0.1.84";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/cash-dashboard-api";
  const byId=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const money=(v)=>Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
  const date=(v)=>v?new Date(v).toLocaleString("es-MX"):"—";
  let current=null;

  function session(){try{return window.session||null}catch{return null}}
  function anonKey(){try{return window.ANON_KEY||ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function pos(){return window.FacturaRapidaPOS||null}
  function notice(message,error=false){if(typeof window.notice==="function")window.notice(message,error);else if(error)window.alert?.(message)}
  function show(dialog){if(!dialog)return;try{dialog.showModal()}catch{dialog.setAttribute("open","")}}
  function close(dialog){if(!dialog)return;try{dialog.close()}catch{dialog.removeAttribute("open")}}

  async function api(action,payload={}){
    const key=anonKey(),token=session()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo consultar la caja");
    return data;
  }

  function ensureStyle(){
    if(byId("solrakCash84Style"))return;
    const style=document.createElement("style");style.id="solrakCash84Style";
    style.textContent=`
#solrakCashDashboardDialog{padding:0;border:0;background:#f1f3f5;color:#2d3942;width:100vw;height:100vh;max-width:none;max-height:none;margin:0}#solrakCashDashboardDialog::backdrop{background:rgba(18,23,27,.65)}
.solrakCash84Head{height:55px;background:var(--solrak83-accent,#2588d8);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;box-sizing:border-box}.solrakCash84Head strong{font-size:17px}.solrakCash84Head small{opacity:.85;margin-left:10px}.solrakCash84Head button{border:0;background:transparent;color:#fff;font-size:24px;cursor:pointer}
.solrakCash84Body{height:calc(100vh - 55px);box-sizing:border-box;padding:10px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px;overflow:hidden}.solrakCash84Meta{display:flex;gap:16px;align-items:center;min-height:31px;padding:0 8px;background:#fff;border:1px solid #d7dde2;font-size:10px}.solrakCash84Meta b{color:#222}.solrakCash84Cards{display:grid;grid-template-columns:repeat(5,minmax(125px,1fr));gap:6px}.solrakCash84Card{background:#fff;border:1px solid #d5dbe0;padding:8px 10px;min-height:58px;box-sizing:border-box}.solrakCash84Card span{display:block;font-size:9px;text-transform:uppercase;font-weight:900;color:#697680}.solrakCash84Card strong{display:block;margin-top:3px;font-size:21px;font-variant-numeric:tabular-nums}.solrakCash84Card.expected{border-color:var(--solrak83-accent,#2588d8);box-shadow:inset 0 3px 0 var(--solrak83-accent,#2588d8)}.solrakCash84Card.expected strong{color:var(--solrak83-accent,#2588d8)}.solrakCash84Card.out strong{color:#a33131}.solrakCash84Card.in strong{color:#167346}
.solrakCash84Grid{min-height:0;display:grid;grid-template-columns:minmax(330px,.85fr) minmax(480px,1.35fr);gap:8px}.solrakCash84Panel{min-height:0;background:#fff;border:1px solid #d5dbe0;display:flex;flex-direction:column}.solrakCash84PanelHead{height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 9px;border-bottom:1px solid #dce1e5;font-size:11px;font-weight:900}.solrakCash84TableWrap{overflow:auto;min-height:0;flex:1}.solrakCash84Table{width:100%;border-collapse:collapse;font-size:10px}.solrakCash84Table th{position:sticky;top:0;background:#eef1f3;text-align:left;padding:6px;border-bottom:1px solid #cfd6dc;font-size:9px;text-transform:uppercase}.solrakCash84Table td{padding:6px;border-bottom:1px solid #edf0f2;vertical-align:top}.solrakCash84Table td.num,.solrakCash84Table th.num{text-align:right;font-variant-numeric:tabular-nums}.solrakCash84Type{display:inline-block;border-radius:3px;padding:2px 5px;font-size:8px;font-weight:900;text-transform:uppercase;background:#eef1f3}.solrakCash84Type.in{background:#e8f7ee;color:#13683d}.solrakCash84Type.out{background:#fbeaea;color:#963838}
.solrakCash84Pay{padding:8px}.solrakCash84PayGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.solrakCash84PayRow{display:flex;justify-content:space-between;gap:8px;padding:7px 8px;border:1px solid #e0e4e7;background:#fafbfb;font-size:10px}.solrakCash84PayRow strong{font-size:12px}.solrakCash84Subhead{font-size:9px;font-weight:900;text-transform:uppercase;color:#66737e;margin:10px 0 5px}
.solrakCash84Foot{display:grid;grid-template-columns:minmax(200px,1fr) 170px auto auto auto;gap:7px;align-items:end;background:#fff;border:1px solid #d5dbe0;padding:8px}.solrakCash84Foot label{font-size:9px;font-weight:900;text-transform:uppercase;color:#61707a}.solrakCash84Foot input{display:block;width:100%;height:35px;box-sizing:border-box;margin-top:3px;border:1px solid #cbd3d9;border-radius:3px;padding:5px 8px;font-size:17px;font-variant-numeric:tabular-nums}.solrakCash84Foot button{height:35px;border:1px solid #c8d0d6;border-radius:3px;background:#fff;padding:0 12px;font-weight:800;cursor:pointer}.solrakCash84Foot .primary{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrakCash84Empty{padding:25px;text-align:center;color:#76828b;font-size:11px}
@media(max-width:980px){.solrakCash84Cards{grid-template-columns:repeat(3,1fr)}.solrakCash84Grid{grid-template-columns:1fr}.solrakCash84Foot{grid-template-columns:1fr 150px repeat(3,auto)}}
@media print{body>*:not(#solrakCashDashboardDialog){display:none!important}#solrakCashDashboardDialog{display:block!important;position:static!important;width:auto!important;height:auto!important}#solrakCashDashboardDialog .solrakCash84Body{height:auto!important;overflow:visible!important;display:block!important}.solrakCash84Grid{display:block!important}.solrakCash84Panel{margin-top:8px}.solrakCash84TableWrap{overflow:visible!important}.solrakCash84Foot button{display:none!important}}
`;
    document.head.appendChild(style);
  }

  function ensureDialog(){
    if(byId("solrakCashDashboardDialog"))return byId("solrakCashDashboardDialog");
    ensureStyle();
    const dialog=document.createElement("dialog");dialog.id="solrakCashDashboardDialog";
    dialog.innerHTML=`<div class="solrakCash84Head"><div><strong>Caja y Corte</strong><small id="solrakCash84Status">Turno actual</small></div><button type="button" id="solrakCash84Close">×</button></div><div class="solrakCash84Body"><div id="solrakCash84Meta" class="solrakCash84Meta"></div><div id="solrakCash84Cards" class="solrakCash84Cards"></div><div class="solrakCash84Grid"><section class="solrakCash84Panel"><div class="solrakCash84PanelHead"><span>Formas de pago</span><span id="solrakCash84TicketCount"></span></div><div id="solrakCash84Payments" class="solrakCash84Pay"></div></section><section class="solrakCash84Panel"><div class="solrakCash84PanelHead"><span>Entradas y salidas de efectivo</span><span id="solrakCash84MovementCount"></span></div><div id="solrakCash84Movements" class="solrakCash84TableWrap"></div></section></div><div class="solrakCash84Foot"><div><strong>Efectivo teórico</strong><div style="font-size:10px;color:#6a7680;margin-top:4px">El cierre definitivo vuelve a calcular este importe en el servidor.</div></div><label>Efectivo contado<input id="solrakCash84Counted" type="number" min="0" step="0.01" inputmode="decimal"></label><button id="solrakCash84Csv" type="button">Exportar CSV</button><button id="solrakCash84Print" type="button">Imprimir</button><button id="solrakCash84CloseTurn" class="primary" type="button">Cerrar turno y hacer corte</button></div></div>`;
    document.body.appendChild(dialog);
    byId("solrakCash84Close").onclick=()=>close(dialog);
    byId("solrakCash84Print").onclick=()=>window.print();
    byId("solrakCash84Csv").onclick=exportCsv;
    byId("solrakCash84CloseTurn").onclick=closeTurn;
    return dialog;
  }

  function paymentLabel(key){return({cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia",credit:"Crédito",other:"Otro",total:"Total"})[key]||key}
  function movementLabel(type){return({income:"Entrada",deposit:"Depósito / fondo",expense:"Gasto / devolución",withdrawal:"Retiro"})[type]||type}

  function render(data){
    current=data;
    const s=data.session,t=data.totals;
    byId("solrakCash84Status").textContent=s.status==="closed"?"Turno cerrado":"Turno abierto";
    byId("solrakCash84Meta").innerHTML=`<span>Caja: <b>${esc(s.register_name)}</b></span><span>Apertura: <b>${esc(date(s.opened_at))}</b></span><span>Usuario: <b>${esc(s.opened_by_name)}</b></span>${s.closed_at?`<span>Cierre: <b>${esc(date(s.closed_at))}</b></span>`:""}`;
    const cards=[
      ["Fondo inicial",t.opening,""],
      ["Ventas en efectivo",t.cash_sales,"in"],
      ["Entradas / abonos",t.entries,"in"],
      ["Salidas / devoluciones",t.exits,"out"],
      ["Efectivo teórico",t.expected_cash,"expected"],
    ];
    byId("solrakCash84Cards").innerHTML=cards.map(([label,value,cls])=>`<div class="solrakCash84Card ${cls}"><span>${label}</span><strong>${money(value)}</strong></div>`).join("");
    byId("solrakCash84TicketCount").textContent=`${t.tickets} ticket(s)`;
    const methods=["cash","card","transfer","credit","other"];
    byId("solrakCash84Payments").innerHTML=`<div class="solrakCash84Subhead">Ventas del turno</div><div class="solrakCash84PayGrid">${methods.map(k=>`<div class="solrakCash84PayRow"><span>${paymentLabel(k)}</span><strong>${money(t.payments?.[k])}</strong></div>`).join("")}</div><div class="solrakCash84Subhead">Abonos a crédito recibidos</div><div class="solrakCash84PayGrid">${["cash","card","transfer","other"].map(k=>`<div class="solrakCash84PayRow"><span>${paymentLabel(k)}</span><strong>${money(t.credit_payments?.[k])}</strong></div>`).join("")}</div>`;
    const rows=data.movements||[];
    byId("solrakCash84MovementCount").textContent=`${rows.length} movimiento(s)`;
    byId("solrakCash84Movements").innerHTML=rows.length?`<table class="solrakCash84Table"><thead><tr><th>Tipo</th><th>Concepto</th><th>Usuario</th><th>Fecha</th><th class="num">Importe</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="solrakCash84Type ${r.direction}">${esc(movementLabel(r.movement_type))}</span></td><td>${esc(r.concept||"—")}<div style="font-size:8px;color:#8a949c">${esc(r.reference||"")}</div></td><td>${esc(r.user_name||"Usuario")}</td><td>${esc(date(r.created_at))}</td><td class="num">${r.direction==="out"?"−":"+"}${money(r.amount)}</td></tr>`).join("")}</tbody></table>`:'<div class="solrakCash84Empty">No hay entradas ni salidas manuales en este turno.</div>';
    const counted=byId("solrakCash84Counted");
    counted.value=s.status==="closed"&&s.counted_cash!==null?Number(s.counted_cash).toFixed(2):"";
    counted.disabled=s.status==="closed";
    byId("solrakCash84CloseTurn").disabled=s.status==="closed";
    if(s.status==="closed"&&s.difference!==null)byId("solrakCash84Meta").insertAdjacentHTML("beforeend",`<span>Diferencia: <b>${money(s.difference)}</b></span>`);
  }

  async function openDashboard(){
    const active=pos()?.state?.openSession;
    if(!active?.id)return notice("No hay un turno de caja abierto para hacer el corte.",true);
    const dialog=ensureDialog();show(dialog);
    byId("solrakCash84Cards").innerHTML='<div class="solrakCash84Empty">Calculando caja…</div>';
    byId("solrakCash84Payments").innerHTML="";byId("solrakCash84Movements").innerHTML="";
    try{render(await api("preview",{cashSessionId:active.id}))}catch(error){byId("solrakCash84Cards").innerHTML=`<div class="solrakCash84Empty">${esc(error.message)}</div>`;notice(error.message,true)}
  }

  function closeTurn(){
    if(!current?.session||current.session.status==="closed")return;
    const counted=Number(byId("solrakCash84Counted").value);
    if(!Number.isFinite(counted)||counted<0)return notice("Escribe el efectivo contado antes de cerrar el turno.",true);
    close(byId("solrakCashDashboardDialog"));
    const button=byId("posCloseCash");
    if(!button)return notice("No se encontró el cierre real de caja.",true);
    button.click();
    setTimeout(()=>{const input=byId("posCountedCash");if(input){input.value=counted.toFixed(2);input.dispatchEvent(new Event("input",{bubbles:true}))}},20);
  }

  function csvCell(v){const s=String(v??"").replace(/"/g,'""');return `"${s}"`}
  function exportCsv(){
    if(!current)return;
    const s=current.session,t=current.totals,lines=[];
    lines.push(["SOLRAK - CORTE DE CAJA"],["Caja",s.register_name],["Apertura",date(s.opened_at)],["Usuario",s.opened_by_name],[]);
    lines.push(["CONCEPTO","IMPORTE"],["Fondo inicial",t.opening],["Ventas efectivo",t.cash_sales],["Entradas/abonos",t.entries],["Salidas/devoluciones",t.exits],["Efectivo teórico",t.expected_cash],[]);
    lines.push(["FORMA DE PAGO","VENTAS","ABONOS"]);for(const k of ["cash","card","transfer","credit","other"])lines.push([paymentLabel(k),t.payments?.[k]||0,t.credit_payments?.[k]||0]);
    lines.push([], ["MOVIMIENTOS"],["Tipo","Concepto","Referencia","Usuario","Fecha","Importe"]);for(const r of current.movements||[])lines.push([movementLabel(r.movement_type),r.concept||"",r.reference||"",r.user_name||"",date(r.created_at),(r.direction==="out"?-1:1)*Number(r.amount||0)]);
    const text="\ufeff"+lines.map(row=>row.map(csvCell).join(",")).join("\r\n");
    const blob=new Blob([text],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`SOLRAK_Corte_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  function bindCutButton(){
    const button=document.querySelector('[data-fiel-action="cash-cut"]');
    if(!button||button.dataset.solrakCash84==="1")return;
    button.dataset.solrakCash84="1";
    button.onclick=(event)=>{event?.preventDefault?.();openDashboard()};
  }

  function boot(){ensureStyle();ensureDialog();bindCutButton();new MutationObserver(()=>bindCutButton()).observe(document.body,{childList:true,subtree:true});document.addEventListener("solrak:pos-sale-complete",()=>{if(byId("solrakCashDashboardDialog")?.open)setTimeout(openDashboard,20)});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKCajaCortesV0184={version:VERSION,api,openDashboard,render,exportCsv};
})();