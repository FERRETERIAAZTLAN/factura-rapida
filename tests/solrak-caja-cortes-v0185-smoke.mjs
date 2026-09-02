import fs from "node:fs";
import { JSDOM } from "jsdom";

const code=fs.readFileSync("solrak-caja-cortes-v0185.js","utf8");
const apiCode=fs.readFileSync("supabase/functions/cash-dashboard-api/index.ts","utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(!/cfdi-api|finkok|completeSale/i.test(code+apiCode),"Caja v0.1.85 invadió CFDI/cobro");
assert(/opening\+cashSales\+entries-exits/.test(apiCode),"El backend no usa la fórmula real de efectivo teórico");
assert(/\.eq\("cash_session_id",session\.id\)/.test(apiCode),"El resumen no está delimitado por turno");
assert(/\.eq\("movement_type","payment"\)/.test(apiCode),"Falta desglose de abonos");

const dom=new JSDOM(`<!doctype html><html><head></head><body><button data-fiel-action="cash-cut">Corte de Caja</button><button id="posCloseCash">Cerrar caja</button><dialog id="posCloseDialog"><input id="posCountedCash"></dialog></body></html>`,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://example.test"});
const {window}=dom;
if(window.HTMLDialogElement){window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","")};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute("open")}}
window.ANON_KEY="test";window.session={token:"session-token",user:{role:"admin"}};
window.notice=()=>{};
window.FacturaRapidaPOS={state:{openSession:{id:"11111111-1111-4111-8111-111111111111"}}};
let closeClicked=0;window.document.getElementById("posCloseCash").onclick=()=>{closeClicked++};
const payload={ok:true,session:{id:"11111111-1111-4111-8111-111111111111",register_name:"Caja 1",opened_at:"2026-09-02T05:00:00Z",opened_by_name:"Administrador",opening_amount:100,status:"open",counted_cash:null,difference:null},totals:{opening:100,cash_sales:500,entries:75,exits:25,expected_cash:650,tickets:4,payments:{cash:500,card:200,transfer:100,credit:50,other:0,total:850},credit_payments:{cash:50,card:20,transfer:0,other:0,total:70}},movements:[{id:"m1",movement_type:"deposit",amount:75,concept:"Fondo adicional",reference:"",created_at:"2026-09-02T05:10:00Z",user_name:"Administrador",direction:"in"},{id:"m2",movement_type:"withdrawal",amount:25,concept:"Retiro",reference:"R1",created_at:"2026-09-02T05:20:00Z",user_name:"Administrador",direction:"out"}],credit_payments:[],sales:[]};
window.fetch=async()=>({ok:true,json:async()=>payload});
window.print=()=>{};
window.URL.createObjectURL=()=>"blob:test";window.URL.revokeObjectURL=()=>{};
window.eval(code);window.document.dispatchEvent(new window.Event("DOMContentLoaded"));await new Promise(r=>setTimeout(r,30));
const doc=window.document;
assert(window.SOLRAKCajaCortesV0185?.version==="0.1.85","No montó v0.1.85");
doc.querySelector('[data-fiel-action="cash-cut"]').click();await new Promise(r=>setTimeout(r,30));
assert(doc.getElementById("solrakCashDashboardDialog")?.open,"Corte no abre panel operativo");
assert(doc.getElementById("solrakCash85Cards").textContent.includes("$650.00"),"No muestra efectivo teórico");
assert(doc.getElementById("solrakCash85Payments").textContent.includes("$500.00"),"No muestra efectivo de ventas");
assert(doc.getElementById("solrakCash85Payments").textContent.includes("$50.00"),"No muestra abonos en efectivo");
assert(doc.getElementById("solrakCash85Movements").textContent.includes("Fondo adicional")&&doc.getElementById("solrakCash85Movements").textContent.includes("Retiro"),"No muestra entradas/salidas");
doc.getElementById("solrakCash85Counted").value="645.50";doc.getElementById("solrakCash85CloseTurn").click();await new Promise(r=>setTimeout(r,40));
assert(closeClicked===1,"Cerrar turno no delega al cierre real");
assert(doc.getElementById("posCountedCash").value==="645.50","No transfiere efectivo contado al cierre real");
window.close();
console.log("SOLRAK_CAJA_CORTES_V0185_OK expected=650 payments=true credits=true movements=true closeDelegates=true");