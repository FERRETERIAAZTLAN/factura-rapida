import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=180)=>String(v??"").trim().slice(0,m);
const num=(v:unknown)=>Number(v??0);
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;

async function context(req:Request){
  const raw=req.headers.get("x-session-token")||"";if(!raw)return null;
  const hash=await sha(raw),now=new Date().toISOString();
  const session=(await db.from("app_sessions").select("id,user_id").eq("token_hash",hash).gt("expires_at",now).maybeSingle()).data;if(!session)return null;
  const user=(await db.from("app_users").select("id,business_id,name,role,active").eq("id",session.user_id).eq("active",true).maybeSingle()).data;if(!user)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",session.id);
  return{user,businessId:user.business_id};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={};try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,50);
  try{
    if(action==="health")return json({ok:true,service:"cash-dashboard-api",version:1,readOnly:true,sessionBreakdown:true,cfdiUntouched:true});
    const ctx=await context(req);if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(ctx.user.role))return json({error:"Usuario no autorizado"},403);
    if(action!=="preview")return json({error:"Acción desconocida"},400);
    const cashSessionId=clean(body?.cashSessionId,80);
    if(!/^[0-9a-f-]{36}$/i.test(cashSessionId))return json({error:"Turno de caja inválido"},400);
    const session=(await db.from("cash_sessions").select("id,register_id,opened_by,opened_at,opening_amount,status,closed_by,closed_at,expected_cash,counted_cash,difference,notes").eq("business_id",ctx.businessId).eq("id",cashSessionId).maybeSingle()).data;
    if(!session)return json({error:"Turno de caja no encontrado"},404);
    const register=(await db.from("cash_registers").select("id,code,name").eq("business_id",ctx.businessId).eq("id",session.register_id).maybeSingle()).data;
    const sales=(await db.from("sales").select("id,sale_number,total,created_at,created_by").eq("business_id",ctx.businessId).eq("cash_session_id",session.id).eq("status","completed").order("created_at",{ascending:false}).limit(5000)).data||[];
    const saleIds=sales.map((s:any)=>s.id);
    const payments=saleIds.length?(await db.from("sale_payments").select("sale_id,method,amount,tendered_amount,change_amount,reference,created_at").eq("business_id",ctx.businessId).in("sale_id",saleIds).limit(20000)).data||[]:[];
    const movements=(await db.from("cash_movements").select("id,movement_type,amount,concept,reference,created_by,created_at").eq("business_id",ctx.businessId).eq("cash_session_id",session.id).order("created_at",{ascending:false}).limit(10000)).data||[];
    const credits=(await db.from("customer_credit_movements").select("id,client_id,movement_type,amount,payment_method,reason,created_by,created_at,reversed_movement_id").eq("business_id",ctx.businessId).eq("cash_session_id",session.id).eq("movement_type","payment").order("created_at",{ascending:false}).limit(10000)).data||[];
    const userIds=[...new Set([session.opened_by,session.closed_by,...sales.map((s:any)=>s.created_by),...movements.map((m:any)=>m.created_by),...credits.map((m:any)=>m.created_by)].filter(Boolean))];
    const users=userIds.length?(await db.from("app_users").select("id,name").eq("business_id",ctx.businessId).in("id",userIds)).data||[]:[];
    const userMap=new Map(users.map((u:any)=>[u.id,u.name]));
    const clientIds=[...new Set(credits.map((m:any)=>m.client_id).filter(Boolean))];
    const clients=clientIds.length?(await db.from("clients").select("id,name").eq("business_id",ctx.businessId).in("id",clientIds)).data||[]:[];
    const clientMap=new Map(clients.map((c:any)=>[c.id,c.name]));
    const paymentTotals:any={cash:0,card:0,transfer:0,credit:0,other:0,total:0};
    for(const payment of payments){const method=Object.hasOwn(paymentTotals,payment.method)?payment.method:"other";paymentTotals[method]+=num(payment.amount);paymentTotals.total+=num(payment.amount)}
    Object.keys(paymentTotals).forEach(k=>paymentTotals[k]=round(paymentTotals[k]));
    let entries=0,exits=0;
    const movementRows=movements.map((m:any)=>{
      const incoming=m.movement_type==="income"||m.movement_type==="deposit";
      if(incoming)entries+=num(m.amount);else exits+=num(m.amount);
      return{...m,amount:round(num(m.amount)),direction:incoming?"in":"out",user_name:userMap.get(m.created_by)||"Usuario"};
    });
    entries=round(entries);exits=round(exits);
    const opening=round(num(session.opening_amount));
    const cashSales=round(paymentTotals.cash);
    const expectedComputed=round(opening+cashSales+entries-exits);
    const creditPayments=credits.map((m:any)=>({...m,amount:round(num(m.amount)),client_name:clientMap.get(m.client_id)||"Cliente",user_name:userMap.get(m.created_by)||"Usuario"}));
    const creditTotals=creditPayments.reduce((acc:any,m:any)=>{const method=m.payment_method||"other";acc[method]=(acc[method]||0)+m.amount;acc.total+=m.amount;return acc},{cash:0,card:0,transfer:0,other:0,total:0});
    Object.keys(creditTotals).forEach(k=>creditTotals[k]=round(creditTotals[k]));
    return json({ok:true,session:{...session,opening_amount:opening,expected_cash:session.expected_cash===null?null:round(num(session.expected_cash)),counted_cash:session.counted_cash===null?null:round(num(session.counted_cash)),difference:session.difference===null?null:round(num(session.difference)),opened_by_name:userMap.get(session.opened_by)||"Usuario",closed_by_name:userMap.get(session.closed_by)||null,register_name:register?.name||register?.code||"Caja"},totals:{opening,cash_sales:cashSales,entries,exits,expected_cash:session.status==="closed"&&session.expected_cash!==null?round(num(session.expected_cash)):expectedComputed,payments:paymentTotals,credit_payments:creditTotals,tickets:sales.length},movements:movementRows,credit_payments:creditPayments,sales:sales.map((s:any)=>({...s,total:round(num(s.total)),user_name:userMap.get(s.created_by)||"Usuario"}))});
  }catch(error:any){console.error("cash-dashboard-api",error);return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,350)},500)}
});