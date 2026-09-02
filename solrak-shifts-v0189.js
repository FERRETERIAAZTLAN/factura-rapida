(() => {
  "use strict";

  const VERSION="0.1.89";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/shift-api";
  const byId=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const money=(v)=>Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
  const state={config:null,report:null,loaded:false};

  function currentSession(){try{return session||window.session||null}catch{return window.session||null}}
  function anonKey(){try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function admin(){return currentSession()?.user?.role==="admin"}
  function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};console[error?"error":"info"]("SOLRAK",message)}
  function show(dialog){try{dialog.showModal()}catch{dialog.setAttribute("open","")}}
  function close(dialog){try{dialog.close()}catch{dialog.removeAttribute("open")}}

  async function api(action,payload={}){
    const key=anonKey(),token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};
    if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo consultar turnos");
    return data;
  }

  function minuteClock(value){const n=Number(value);if(n===1440)return"24:00";const h=Math.floor(n/60),m=n%60;return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
  function parseClock(value){const x=String(value||"").trim();if(x==="24:00")return 1440;const m=x.match(/^(\d{1,2}):([0-5]\d)$/);if(!m)return NaN;const h=Number(m[1]),min=Number(m[2]);if(h<0||h>23)return NaN;return h*60+min}
  function fmtDate(v){return v?new Date(v).toLocaleString("es-MX"):"—"}

  function ensureStyle(){
    if(byId("solrakShift89Style"))return;
    const style=document.createElement("style");style.id="solrakShift89Style";
    style.textContent=`
.solrak89Card{margin-top:14px}.solrak89Head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.solrak89Badge{display:inline-flex;padding:5px 8px;border-radius:4px;background:#eef7ff;border:1px solid #cbdff2;color:#285f90;font-size:9px;font-weight:900;text-transform:uppercase}.solrak89Pending{background:#fff7e6;border-color:#ead6a5;color:#8d6416}.solrak89Rows{margin-top:10px;border:1px solid #d8dfe4}.solrak89Row{display:grid;grid-template-columns:48px minmax(180px,1fr) 100px 100px 34px;gap:6px;align-items:center;padding:6px;border-bottom:1px solid #edf0f2}.solrak89Row:last-child{border-bottom:0}.solrak89Row strong{text-align:center;font-size:14px}.solrak89Row input{height:34px;border:1px solid #ccd4da;border-radius:4px;padding:0 7px}.solrak89Remove{height:30px;border:0;background:#fff0f0;color:#a13d3d;border-radius:4px;font-size:17px}.solrak89Actions{display:flex;gap:7px;justify-content:flex-end;margin-top:9px}.solrak89Info{margin-top:8px;padding:8px 10px;background:#f7fafc;border:1px dashed #ccd6de;border-radius:5px;font-size:10px;color:#64727d}.solrak89CashAuto{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:7px 9px;background:#edf7ff;border:1px solid #c8def1;font-size:10px;color:#315f82}.solrak89CashAuto button{border:1px solid #aac9e3;background:#fff;border-radius:4px;padding:5px 8px;font-weight:800;color:#285f90}.solrak89Report{padding:0;border:0;background:#f1f3f5;width:100vw;height:100vh;max-width:none;max-height:none;margin:0}.solrak89Report::backdrop{background:rgba(18,23,27,.65)}.solrak89ReportHead{height:54px;background:var(--solrak83-accent,#2588d8);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 15px}.solrak89ReportHead button{border:0;background:transparent;color:#fff;font-size:24px}.solrak89ReportBody{height:calc(100vh - 54px);padding:10px;box-sizing:border-box;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px;overflow:hidden}.solrak89Window{background:#fff;border:1px solid #d7dde2;padding:8px 10px;font-size:10px;display:flex;gap:16px;flex-wrap:wrap}.solrak89Cards{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:6px}.solrak89Metric{background:#fff;border:1px solid #d7dde2;padding:8px}.solrak89Metric span{display:block;font-size:8px;text-transform:uppercase;font-weight:900;color:#6b7781}.solrak89Metric strong{display:block;font-size:19px;margin-top:3px}.solrak89Tables{min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}.solrak89Panel{min-height:0;background:#fff;border:1px solid #d7dde2;overflow:auto}.solrak89Panel h3{position:sticky;top:0;margin:0;padding:8px;background:#eef1f3;font-size:10px;text-transform:uppercase}.solrak89Table{width:100%;border-collapse:collapse;font-size:10px}.solrak89Table td,.solrak89Table th{padding:6px;border-bottom:1px solid #edf0f2;text-align:left}.solrak89Table td:last-child,.solrak89Table th:last-child{text-align:right}.solrak89ReportFoot{display:flex;justify-content:flex-end;gap:7px;background:#fff;border:1px solid #d7dde2;padding:8px}.solrak89ReportFoot button{height:34px;border:1px solid #cbd3d9;background:#fff;border-radius:4px;padding:0 12px;font-weight:800}@media(max-width:900px){.solrak89Cards{grid-template-columns:repeat(3,1fr)}.solrak89Tables{grid-template-columns:1fr}.solrak89Row{grid-template-columns:38px 1fr 82px 82px 30px}}@media print{body>*:not(#solrakShiftReportDialog){display:none!important}#solrakShiftReportDialog{display:block!important;position:static!important;width:auto!important;height:auto!important}.solrak89ReportBody{height:auto!important;overflow:visible!important;display:block!important}.solrak89ReportFoot{display:none!important}.solrak89Tables{display:block!important}.solrak89Panel{margin-top:8px;overflow:visible!important}}
`;
    document.head.appendChild(style);
  }

  function selectedConfig(){return state.config?.pending||state.config?.current||null}
  function scheduleRows(){return selectedConfig()?.shifts||[]}

  function renderConfig(){
    const tab=byId("tab-configuracion");if(!tab||!state.loaded)return;
    let card=byId("solrakShiftConfigCard");
    if(!card){card=document.createElement("article");card.id="solrakShiftConfigCard";card.className="card solrak89Card admin-only";tab.appendChild(card)}
    if(!admin()){card.classList.add("hidden");return}card.classList.remove("hidden");
    const cfg=selectedConfig(),pending=state.config?.pending;
    const tz=cfg?.timezone||"America/Mazatlan";
    const rows=scheduleRows();
    card.innerHTML=`<div class="solrak89Head"><div><h2 style="margin:0">Turnos automáticos</h2><p class="muted small">Los cortes se calculan por franjas consecutivas. No se abre ni se cierra un turno manualmente.</p></div><span class="solrak89Badge ${pending?'solrak89Pending':''}">${pending?'Configuración pendiente':'Configuración vigente'}</span></div>
      <label style="margin-top:10px;max-width:340px">Zona horaria<input id="solrak89Timezone" class="field" value="${esc(tz)}"></label>
      <div id="solrak89Rows" class="solrak89Rows">${rows.map((r,i)=>rowHtml(i+1,r.name,r.start_minute,r.end_minute)).join("")}</div>
      <div class="solrak89Actions"><button id="solrak89Add" class="secondary compact" type="button">+ Agregar turno</button><button id="solrak89Report" class="secondary compact" type="button">Ver corte actual</button><button id="solrak89Save" class="primary compact" type="button">Guardar horarios</button></div>
      <div class="solrak89Info">Los horarios deben cubrir <b>00:00–24:00</b> sin huecos ni traslapes. Una nueva configuración entra en vigor al siguiente día local; los horarios ya vigentes quedan inmutables para no alterar cortes históricos.${pending?`<br><b>Pendiente desde:</b> ${esc(fmtDate(pending.effective_from))}`:""}</div>`;
    bindRows();
  }

  function rowHtml(id,name,start,end){return`<div class="solrak89Row" data-shift-row><strong>#${id}</strong><input data-shift-name maxlength="120" value="${esc(name||`Turno ${id}`)}"><input data-shift-start inputmode="numeric" value="${minuteClock(start)}"><input data-shift-end inputmode="numeric" value="${minuteClock(end)}"><button class="solrak89Remove" data-shift-remove type="button" title="Quitar">×</button></div>`}
  function bindRows(){
    byId("solrak89Add").onclick=()=>{const host=byId("solrak89Rows"),rows=[...host.querySelectorAll('[data-shift-row]')];if(rows.length>=12)return notify("Máximo 12 turnos.",true);const lastEnd=rows.at(-1)?.querySelector('[data-shift-end]')?.value||"00:00";host.insertAdjacentHTML("beforeend",rowHtml(rows.length+1,`Turno ${rows.length+1}`,parseClock(lastEnd),1440));renumberRows()};
    byId("solrak89Save").onclick=saveConfig;
    byId("solrak89Report").onclick=()=>openReport().catch(e=>notify(e.message,true));
    byId("solrak89Rows").onclick=(event)=>{const btn=event.target.closest('[data-shift-remove]');if(!btn)return;const rows=byId("solrak89Rows").querySelectorAll('[data-shift-row]');if(rows.length<=1)return notify("Debe existir al menos un turno.",true);btn.closest('[data-shift-row]').remove();renumberRows()};
  }
  function renumberRows(){[...byId("solrak89Rows").querySelectorAll('[data-shift-row]')].forEach((row,i)=>row.querySelector('strong').textContent=`#${i+1}`)}
  function collectRows(){return[...byId("solrak89Rows").querySelectorAll('[data-shift-row]')].map((row,i)=>({name:row.querySelector('[data-shift-name]').value.trim()||`Turno ${i+1}`,start_minute:parseClock(row.querySelector('[data-shift-start]').value),end_minute:parseClock(row.querySelector('[data-shift-end]').value)}))}
  function validateRows(rows){let expected=0;for(let i=0;i<rows.length;i++){const r=rows[i];if(!Number.isInteger(r.start_minute)||!Number.isInteger(r.end_minute))return`Horario inválido en turno #${i+1}. Usa HH:MM.`;if(r.start_minute!==expected)return`El turno #${i+1} debe iniciar a ${minuteClock(expected)}.`;if(r.end_minute<=r.start_minute||r.end_minute>1440)return`Fin inválido en turno #${i+1}.`;expected=r.end_minute}if(expected!==1440)return"El último turno debe terminar a las 24:00.";return""}
  async function saveConfig(){const rows=collectRows(),error=validateRows(rows);if(error)return notify(error,true);const button=byId("solrak89Save");button.disabled=true;try{const result=await api("saveConfig",{timezone:byId("solrak89Timezone").value.trim(),shifts:rows});state.config={current:result.current,pending:result.pending};state.loaded=true;renderConfig();await refreshReport();notify("Horarios guardados. Entrarán en vigor al siguiente día local.")}catch(e){notify(e.message,true)}finally{byId("solrak89Save")&&(byId("solrak89Save").disabled=false)}}

  function ensureReportDialog(){
    let dialog=byId("solrakShiftReportDialog");if(dialog)return dialog;
    dialog=document.createElement("dialog");dialog.id="solrakShiftReportDialog";dialog.className="solrak89Report";
    dialog.innerHTML=`<div class="solrak89ReportHead"><div><strong>Corte automático por turno</strong><small id="solrak89ReportName" style="margin-left:10px;opacity:.85"></small></div><button id="solrak89ReportClose" type="button">×</button></div><div class="solrak89ReportBody"><div id="solrak89Window" class="solrak89Window"></div><div id="solrak89Metrics" class="solrak89Cards"></div><div class="solrak89Tables"><section class="solrak89Panel"><h3>Formas de pago</h3><div id="solrak89Payments"></div></section><section class="solrak89Panel"><h3>Entradas y salidas</h3><div id="solrak89Movements"></div></section></div><div class="solrak89ReportFoot"><button id="solrak89Csv" type="button">Exportar CSV</button><button id="solrak89Print" type="button">Imprimir</button></div></div>`;
    document.body.appendChild(dialog);byId("solrak89ReportClose").onclick=()=>close(dialog);byId("solrak89Print").onclick=()=>window.print();byId("solrak89Csv").onclick=exportCsv;return dialog;
  }
  function renderReport(data){state.report=data;const w=data.window,t=data.totals;byId("solrak89ReportName").textContent=`#${w.shift_id} · ${w.shift_name}`;byId("solrak89Window").innerHTML=`<span>Turno: <b>#${w.shift_id} · ${esc(w.shift_name)}</b></span><span>Horario: <b>${minuteClock(w.start_minute)}–${minuteClock(w.end_minute)}</b></span><span>Zona: <b>${esc(w.timezone)}</b></span><span>Ventana: <b>${esc(fmtDate(w.window_start))} → ${esc(fmtDate(w.window_end))}</b></span>`;const cards=[["Ventas",t.sales],["Tickets",t.tickets],["Devoluciones",t.returns],["Entradas caja",t.cash_entries],["Salidas caja",t.cash_exits],["Flujo efectivo",t.net_cash_flow]];byId("solrak89Metrics").innerHTML=cards.map(([l,v],i)=>`<div class="solrak89Metric"><span>${l}</span><strong>${i===1?Number(v):money(v)}</strong></div>`).join("");const p=t.payments||{};byId("solrak89Payments").innerHTML=`<table class="solrak89Table"><tbody>${[["Efectivo",p.cash],["Tarjeta",p.card],["Transferencia",p.transfer],["Crédito",p.credit],["Otro",p.other],["Total",p.total]].map(([l,v])=>`<tr><td>${l}</td><td>${money(v)}</td></tr>`).join("")}</tbody></table>`;const m=data.movements||[];byId("solrak89Movements").innerHTML=m.length?`<table class="solrak89Table"><thead><tr><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody>${m.map(x=>`<tr><td>${esc(x.concept||"—")}</td><td>${esc(x.movement_type)}</td><td>${["income","deposit"].includes(x.movement_type)?"+":"−"}${money(x.amount)}</td></tr>`).join("")}</tbody></table>`:'<div style="padding:18px;text-align:center;color:#78838d;font-size:10px">Sin movimientos en esta franja.</div>';
  }
  async function openReport(){const dialog=ensureReportDialog();show(dialog);byId("solrak89Metrics").innerHTML='<div class="solrak89Metric"><span>Estado</span><strong>Calculando…</strong></div>';renderReport(await api("currentReport"))}
  async function refreshReport(){try{state.report=await api("currentReport");syncCashDashboard()}catch{}}
  function exportCsv(){if(!state.report)return;const d=state.report,w=d.window,t=d.totals,lines=[["SOLRAK","Corte automático"],["Turno",`#${w.shift_id} ${w.shift_name}`],["Inicio",w.window_start],["Fin",w.window_end],["Zona",w.timezone],[],["Concepto","Importe"],["Ventas",t.sales],["Devoluciones",t.returns],["Entradas caja",t.cash_entries],["Salidas caja",t.cash_exits],["Flujo efectivo",t.net_cash_flow],[],["Movimiento","Tipo","Importe","Fecha"],...(d.movements||[]).map(m=>[m.concept||"",m.movement_type,m.amount,m.created_at])];const csv=lines.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\r\n"),blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`SOLRAK_Corte_Turno_${w.shift_id}_${w.local_date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

  function syncCashDashboard(){
    const closeBtn=byId("solrakCash85CloseTurn");if(closeBtn)closeBtn.style.display="none";
    const counted=byId("solrakCash85Counted");if(counted?.closest("label"))counted.closest("label").style.display="none";
    const legacyOpen=byId("posOpenCash"),legacyClose=byId("posCloseCash");if(legacyOpen)legacyOpen.style.display="none";if(legacyClose)legacyClose.style.display="none";
    const dialog=byId("solrakCashDashboardDialog");if(!dialog)return;
    let bar=byId("solrak89CashAuto");if(!bar){bar=document.createElement("div");bar.id="solrak89CashAuto";bar.className="solrak89CashAuto";const body=dialog.querySelector('.solrakCash85Body');body?.insertBefore(bar,body.firstChild)}
    const w=state.report?.window;bar.innerHTML=`<div><strong>Corte automático</strong><div>${w?`Turno #${w.shift_id} · ${esc(w.shift_name)} · ${minuteClock(w.start_minute)}–${minuteClock(w.end_minute)}`:"Calculado por las franjas configuradas; no requiere cierre manual."}</div></div><button id="solrak89OpenAutoCut" type="button">Ver corte del turno</button>`;byId("solrak89OpenAutoCut").onclick=()=>openReport().catch(e=>notify(e.message,true));
    const status=byId("solrakCash85Status");if(status)status.textContent="Corte automático por horario";
  }

  function enforceEightTickets(){
    const apiPos=window.FacturaRapidaPOS,button=byId("posNewTicket");if(apiPos?.tickets&&button){button.disabled=apiPos.tickets.length>=8;button.title="Hasta 8 ventas simultáneas"}
    const hint=byId("tab-pos")?.querySelector('.frPosTop .frPosHint');if(hint&&/hasta\s+7\s+tickets/i.test(hint.textContent))hint.textContent=hint.textContent.replace(/hasta\s+7\s+tickets/i,"hasta 8 tickets");
  }

  async function refresh(){if(!currentSession()?.token)return;const result=await api("getConfig");state.config={current:result.current,pending:result.pending};state.loaded=true;renderConfig();await refreshReport();syncCashDashboard();enforceEightTickets()}
  function boot(){ensureStyle();refresh().catch(e=>console.warn("SOLRAK shifts",e));document.addEventListener("click",event=>{if(event.target?.closest?.('[data-tab="configuracion"],#solrakCashDashboardDialog,[data-fiel-action]'))setTimeout(()=>{renderConfig();syncCashDashboard();enforceEightTickets()},25)},true);new MutationObserver(()=>{syncCashDashboard();enforceEightTickets()}).observe(document.body,{childList:true,subtree:true});setInterval(()=>{refreshReport();enforceEightTickets()},60000)}

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKShiftsV0189={version:VERSION,state,api,refresh,openReport,parseClock,minuteClock};
})();