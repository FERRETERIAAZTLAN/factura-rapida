(() => {
  "use strict";

  const VERSION="0.1.82";
  const API_URL="https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/credit-api";
  const byId=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??"").replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const money=(v)=>Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
  const state={accounts:[],selectedClientId:null,history:null,lastReceipt:null};

  function currentSession(){try{return session||window.session||null}catch{return window.session||null}}
  function anonKey(){try{return ANON_KEY||window.ANON_KEY||""}catch{return window.ANON_KEY||""}}
  function isAdmin(){return currentSession()?.user?.role==="admin"}
  function notify(message,error=false){try{if(typeof window.notice==="function")return window.notice(message,error)}catch{} if(error)window.alert?.(message)}

  async function api(action,payload={}){
    const key=anonKey(),token=currentSession()?.token||"";
    const headers={Authorization:`Bearer ${key}`,apikey:key,"Content-Type":"application/json"};if(token)headers["x-session-token"]=token;
    const response=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||data.detail||"No se pudo continuar");
    return data;
  }

  function label(type,row={}){
    if(row.is_reversal)return "Cancelación de abono";
    return {charge:"Cargo",payment:"Abono",return:"Devolución",void:"Cancelación de venta",adjustment:"Ajuste"}[type]||type;
  }
  function methodLabel(method){return {cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia",other:"Otro",credit:"Crédito"}[method]||method||"—"}
  function show(dialog){if(!dialog)return;if(dialog.showModal&&!dialog.open)dialog.showModal();else dialog.setAttribute("open","")}
  function close(dialog){if(!dialog)return;if(dialog.close&&dialog.open)dialog.close();else dialog.removeAttribute("open")}

  function inject(){
    if(byId("solrakCreditAccountsDialog"))return;
    document.body.insertAdjacentHTML("beforeend",`
      <dialog id="solrakCreditAccountsDialog" class="fielDialog wide">
        <div class="fielDialogHead">Créditos y Abonos<button class="fielDialogClose" id="solrakCreditClose" type="button">×</button></div>
        <div class="fielDialogBody solrakCreditBody">
          <div class="solrakCreditFilters">
            <input id="solrakCreditQuery" class="fielField" placeholder="Cliente o RFC">
            <input id="solrakCreditMin" class="fielField" type="number" min="0" step="0.01" placeholder="Deuda mínima">
            <input id="solrakCreditMax" class="fielField" type="number" min="0" step="0.01" placeholder="Deuda máxima">
            <input id="solrakCreditDays" class="fielField" type="number" min="0" step="1" placeholder="Días sin pago">
            <select id="solrakCreditSort" class="fielField"><option value="debt_desc">Mayor deuda</option><option value="debt_asc">Menor deuda</option><option value="oldest">Más tiempo sin pago</option></select>
            <button id="solrakCreditSearch" class="fielBtn primary" type="button">Aplicar</button>
          </div>
          <div id="solrakCreditTotals" class="solrakCreditTotals"></div>
          <div class="solrakCreditGrid">
            <div><div class="fielTableWrap solrakCreditAccountsWrap"><table class="fielTable"><thead><tr><th>Cliente</th><th>Saldo</th><th>Límite</th><th>Disponible</th><th>Sin pago</th></tr></thead><tbody id="solrakCreditAccountsRows"></tbody></table></div></div>
            <div class="solrakCreditDetail">
              <div id="solrakCreditSelected" class="fielEmpty">Selecciona un cliente con saldo pendiente.</div>
              <div id="solrakCreditHistory"></div>
              <form id="solrakCreditPaymentForm" class="solrakCreditPaymentForm ${isAdmin()?"":"hidden"}">
                <h3>Registrar abono</h3>
                <div class="fielFormGrid"><label class="fielLabel">Importe<input id="solrakCreditPaymentAmount" class="fielField" type="number" min="0.01" step="0.01" required></label><label class="fielLabel">Forma de pago<select id="solrakCreditPaymentMethod" class="fielField"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label><label class="fielLabel wide">Concepto / referencia<input id="solrakCreditPaymentReason" class="fielField" maxlength="500" required placeholder="Ej. Abono cuenta cliente"></label></div>
                <div class="fielDialogFoot"><button class="fielBtn primary" type="submit">Guardar abono</button><button id="solrakPrintLastCreditReceipt" class="fielBtn" type="button" disabled>Imprimir último comprobante</button></div>
              </form>
            </div>
          </div>
        </div>
      </dialog>`);
    if(!byId("solrakCreditStyle")){
      const style=document.createElement("style");style.id="solrakCreditStyle";style.textContent=`
      .solrakCreditBody{display:flex!important;flex-direction:column;gap:10px}.solrakCreditFilters{display:grid;grid-template-columns:1.5fr repeat(3,.8fr) 1fr auto;gap:8px}.solrakCreditTotals{font-size:12px;font-weight:800}.solrakCreditGrid{display:grid;grid-template-columns:minmax(430px,.9fr) minmax(0,1.1fr);gap:14px;min-height:0;flex:1}.solrakCreditAccountsWrap{max-height:none!important;height:100%}.solrakCreditDetail{min-height:0;overflow:auto;border:1px solid #e0e3e5;padding:12px}.solrakCreditHistoryWrap{max-height:42vh!important}.solrakCreditPaymentForm{margin-top:14px;padding-top:12px;border-top:1px solid #e1e4e6}.solrakCreditPaymentForm h3{margin:0 0 10px}.solrakCreditCancelled{opacity:.48;text-decoration:line-through}.solrakCreditPositive{color:#a43131}.solrakCreditNegative{color:#247044}@media(max-width:900px){.solrakCreditFilters{grid-template-columns:1fr 1fr}.solrakCreditGrid{grid-template-columns:1fr}.solrakCreditAccountsWrap{max-height:34vh!important}}
      `;document.head.appendChild(style);
    }
    byId("solrakCreditClose").onclick=()=>close(byId("solrakCreditAccountsDialog"));
    byId("solrakCreditSearch").onclick=loadSummary;
    ["solrakCreditQuery","solrakCreditMin","solrakCreditMax","solrakCreditDays"].forEach((id)=>byId(id)?.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();loadSummary()}}));
    byId("solrakCreditPaymentForm").onsubmit=savePayment;
    byId("solrakPrintLastCreditReceipt").onclick=()=>state.lastReceipt&&printReceipt(state.lastReceipt);
  }

  async function openCredits(){
    inject();show(byId("solrakCreditAccountsDialog"));
    await loadSummary();
  }

  async function loadSummary(){
    inject();
    const tbody=byId("solrakCreditAccountsRows");tbody.innerHTML='<tr><td colspan="5" class="fielEmpty">Cargando…</td></tr>';
    try{
      const result=await api("summary",{query:byId("solrakCreditQuery").value,minDebt:Number(byId("solrakCreditMin").value)||0,maxDebt:Number(byId("solrakCreditMax").value)||0,noPaymentDays:Number(byId("solrakCreditDays").value)||0,sort:byId("solrakCreditSort").value});
      state.accounts=result.accounts||[];
      byId("solrakCreditTotals").textContent=`${result.totals?.clients||0} cliente(s) con saldo · Deuda total ${money(result.totals?.debt||0)}`;
      tbody.innerHTML=state.accounts.length?state.accounts.map((a)=>`<tr data-solrak-credit-client="${esc(a.id)}"><td><strong>${esc(a.name)}</strong><div class="fielSoon" style="padding:0;border:0;background:none">${esc(a.rfc||"")} ${a.active===false?'· Inactivo':''}</div></td><td><strong>${money(a.balance)}</strong></td><td>${money(a.credit_limit)}</td><td>${money(a.available_credit)}</td><td>${a.days_without_payment==null?'—':`${a.days_without_payment} día(s)`}</td></tr>`).join(""):'<tr><td colspan="5" class="fielEmpty">No hay cuentas pendientes con esos filtros.</td></tr>';
      tbody.querySelectorAll("[data-solrak-credit-client]").forEach((row)=>row.onclick=()=>selectClient(row.dataset.solrakCreditClient,row));
      if(state.selectedClientId&&state.accounts.some((a)=>a.id===state.selectedClientId))await selectClient(state.selectedClientId,tbody.querySelector(`[data-solrak-credit-client="${state.selectedClientId}"]`));
      else{state.selectedClientId=null;state.history=null;byId("solrakCreditSelected").innerHTML="Selecciona un cliente con saldo pendiente.";byId("solrakCreditHistory").innerHTML=""}
    }catch(error){tbody.innerHTML=`<tr><td colspan="5" class="fielEmpty">${esc(error.message)}</td></tr>`}
  }

  async function selectClient(clientId,row){
    state.selectedClientId=clientId;
    document.querySelectorAll("#solrakCreditAccountsRows tr").forEach((tr)=>tr.classList.toggle("selected",tr===row));
    byId("solrakCreditSelected").innerHTML='<div class="fielEmpty">Cargando historial…</div>';
    try{state.history=await api("history",{clientId});renderHistory()}catch(error){byId("solrakCreditSelected").innerHTML=`<div class="fielEmpty">${esc(error.message)}</div>`}
  }

  function renderHistory(){
    const data=state.history;if(!data?.client)return;
    byId("solrakCreditSelected").innerHTML=`<div class="fielProductFacts"><div class="fielFact"><span>Cliente</span><strong>${esc(data.client.name)}</strong></div><div class="fielFact"><span>Saldo pendiente</span><strong>${money(data.balance)}</strong></div><div class="fielFact"><span>Límite</span><strong>${money(data.client.credit_limit)}</strong></div><div class="fielFact"><span>Estado</span><strong>${data.client.active===false?'Inactivo':data.client.credit_enabled?'Crédito autorizado':'Sin crédito nuevo'}</strong></div></div>`;
    const movements=data.movements||[];
    byId("solrakCreditHistory").innerHTML=`<h3>Historial de movimientos</h3><div class="fielTableWrap solrakCreditHistoryWrap"><table class="fielTable"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Importe</th><th>Forma</th><th>Saldo</th><th>Concepto</th><th></th></tr></thead><tbody>${movements.length?movements.map((m)=>`<tr class="${m.reversed?'solrakCreditCancelled':''}"><td>${esc(new Date(m.created_at).toLocaleString("es-MX"))}</td><td>${esc(label(m.movement_type,m))}</td><td class="${m.movement_type==='charge'?'solrakCreditPositive':'solrakCreditNegative'}">${m.movement_type==='charge'?'+':'−'}${money(m.amount)}</td><td>${esc(methodLabel(m.payment_method))}</td><td>${money(m.balance_after)}</td><td>${esc(m.reason||"")}</td><td>${m.movement_type==='payment'?`<button class="fielBtn" type="button" data-credit-print="${esc(m.id)}">Imprimir</button>${isAdmin()&&!m.reversed?` <button class="fielBtn danger" type="button" data-credit-void="${esc(m.id)}">Cancelar</button>`:''}`:''}</td></tr>`).join(""):'<tr><td colspan="7" class="fielEmpty">Sin movimientos.</td></tr>'}</tbody></table></div>`;
    byId("solrakCreditHistory").querySelectorAll("[data-credit-print]").forEach((button)=>button.onclick=()=>{
      const movement=movements.find((m)=>m.id===button.dataset.creditPrint);if(movement)printReceipt({client:data.client,movementId:movement.id,amount:movement.amount,paymentMethod:movement.payment_method,reason:movement.reason,date:movement.created_at,balance:movement.balance_after,cancelled:movement.reversed});
    });
    byId("solrakCreditHistory").querySelectorAll("[data-credit-void]").forEach((button)=>button.onclick=()=>voidPayment(button.dataset.creditVoid));
    if(byId("solrakCreditPaymentAmount"))byId("solrakCreditPaymentAmount").max=Math.max(0,Number(data.balance||0)).toFixed(2);
  }

  async function savePayment(event){
    event.preventDefault();if(!state.selectedClientId||!state.history?.client)return notify("Selecciona una cuenta.",true);
    const amount=Number(byId("solrakCreditPaymentAmount").value),paymentMethod=byId("solrakCreditPaymentMethod").value,reason=byId("solrakCreditPaymentReason").value.trim();
    if(!(amount>0)||!reason)return notify("Escribe importe y concepto del abono.",true);
    let cashSessionId=null;
    try{
      if(paymentMethod==="cash")cashSessionId=(await window.SOLRAKFlowV0173?.ensureOperationalSession?.())?.id||window.FacturaRapidaPOS?.state?.openSession?.id||null;
      const result=await api("recordPayment",{clientId:state.selectedClientId,cashSessionId,amount,paymentMethod,reason});
      state.lastReceipt={client:result.client||state.history.client,movementId:result.movement_id,amount:result.amount??amount,paymentMethod,reason,date:new Date().toISOString(),balance:result.balance};
      byId("solrakPrintLastCreditReceipt").disabled=false;
      byId("solrakCreditPaymentForm").reset();
      notify("Abono registrado.");
      await loadSummary();
      if(state.selectedClientId)await selectClient(state.selectedClientId,document.querySelector(`[data-solrak-credit-client="${state.selectedClientId}"]`));
    }catch(error){notify(error.message,true)}
  }

  async function voidPayment(movementId){
    const reason=window.prompt?.("Motivo para cancelar este abono:","Abono capturado por error");if(!String(reason||"").trim())return;
    if(window.confirm?.("La cancelación restaurará la deuda y, si fue efectivo, retirará ese importe de la caja abierta. ¿Continuar?")===false)return;
    try{await api("voidPayment",{movementId,reason:String(reason).trim()});notify("Abono cancelado mediante movimiento compensatorio; no se borró el historial.");await loadSummary();if(state.selectedClientId)await selectClient(state.selectedClientId,document.querySelector(`[data-solrak-credit-client="${state.selectedClientId}"]`))}catch(error){notify(error.message,true)}
  }

  function printReceipt(receipt){
    const frame=document.createElement("iframe");frame.style.position="fixed";frame.style.width="1px";frame.style.height="1px";frame.style.opacity="0";frame.style.pointerEvents="none";document.body.appendChild(frame);
    const doc=frame.contentDocument;const client=receipt.client||{};
    doc.open();doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprobante de abono</title><style>body{font-family:Arial,sans-serif;width:72mm;margin:0 auto;padding:5mm;font-size:12px}h1{text-align:center;font-size:18px;margin:0 0 3px}h2{text-align:center;font-size:13px;margin:0 0 12px}.line{border-top:1px dashed #000;margin:9px 0}.row{display:flex;justify-content:space-between;gap:8px;margin:5px 0}.total{font-size:20px;font-weight:700}.center{text-align:center}.cancel{font-weight:700;color:#900}</style></head><body><h1>SOLRAK</h1><h2>Comprobante de abono</h2>${receipt.cancelled?'<div class="center cancel">ABONO CANCELADO</div>':''}<div class="line"></div><div><strong>${esc(client.name||"Cliente")}</strong></div><div>${esc(client.rfc||"")}</div><div class="row"><span>Fecha</span><span>${esc(new Date(receipt.date||Date.now()).toLocaleString("es-MX"))}</span></div><div class="row"><span>Forma</span><span>${esc(methodLabel(receipt.paymentMethod))}</span></div><div class="row total"><span>Abono</span><span>${money(receipt.amount)}</span></div><div class="row"><span>Saldo</span><span>${money(receipt.balance)}</span></div><div>Concepto: ${esc(receipt.reason||"")}</div><div class="line"></div><div class="center">Movimiento ${esc(receipt.movementId||"")}</div></body></html>`);doc.close();
    setTimeout(()=>{try{frame.contentWindow?.focus();frame.contentWindow?.print()}finally{setTimeout(()=>frame.remove(),1200)}},80);
  }

  function boot(){
    inject();
    document.addEventListener("click",(event)=>{
      const credits=event.target?.closest?.('[data-fiel-action="credits"]');
      if(!credits)return;
      event.preventDefault();event.stopImmediatePropagation();openCredits().catch((e)=>notify(e.message,true));
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SOLRAKCreditAccountsV0182={version:VERSION,state,api,open:openCredits,refresh:loadSummary,printReceipt};
})();
