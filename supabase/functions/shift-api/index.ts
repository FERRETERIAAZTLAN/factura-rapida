import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=160)=>String(v??"").trim().slice(0,m);
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

async function schedulesFor(versionId:string){
  const result=await db.from("shift_schedules").select("id,name,start_minute,end_minute").eq("version_id",versionId).order("id");
  if(result.error)throw result.error;return result.data||[];
}

async function config(businessId:string){
  const now=new Date().toISOString();
  const current=(await db.from("shift_schedule_versions").select("id,timezone,effective_from,created_at").eq("business_id",businessId).lte("effective_from",now).order("effective_from",{ascending:false}).limit(1).maybeSingle()).data;
  const pending=(await db.from("shift_schedule_versions").select("id,timezone,effective_from,created_at").eq("business_id",businessId).gt("effective_from",now).order("effective_from",{ascending:true}).limit(1).maybeSingle()).data;
  return{
    current:current?{...current,shifts:await schedulesFor(current.id)}:null,
    pending:pending?{...pending,shifts:await schedulesFor(pending.id)}:null,
  };
}

async function report(businessId:string,at?:string){
  const pAt=at&&Number.isFinite(Date.parse(at))?new Date(at).toISOString():new Date().toISOString();
  const wr=await db.rpc("solrak_shift_window",{p_business_id:businessId,p_at:pAt});
  if(wr.error)throw wr.error;
  const window=wr.data;
  const start=window.window_start,end=window.window_end;

  const sales=(await db.from("sales").select("id,sale_number,total,created_at,created_by").eq("business_id",businessId).eq("status","completed").gte("created_at",start).lt("created_at",end).order("created_at",{ascending:false}).limit(10000)).data||[];
  const saleIds=sales.map((s:any)=>s.id);
  const payments=saleIds.length?(await db.from("sale_payments").select("sale_id,method,amount").eq("business_id",businessId).in("sale_id",saleIds).limit(30000)).data||[]:[];
  const returns=(await db.from("sale_returns").select("id,return_number,total,refund_method,created_at").eq("business_id",businessId).gte("created_at",start).lt("created_at",end).order("created_at",{ascending:false}).limit(10000)).data||[];
  const movements=(await db.from("cash_movements").select("id,movement_type,amount,concept,reference,created_at,created_by").eq("business_id",businessId).gte("created_at",start).lt("created_at",end).order("created_at",{ascending:false}).limit(20000)).data||[];
  const credits=(await db.from("customer_credit_movements").select("id,client_id,amount,payment_method,reason,created_at").eq("business_id",businessId).eq("movement_type","payment").gte("created_at",start).lt("created_at",end).order("created_at",{ascending:false}).limit(10000)).data||[];

  const paymentTotals:any={cash:0,card:0,transfer:0,credit:0,other:0,total:0};
  for(const p of payments){const key=Object.hasOwn(paymentTotals,p.method)?p.method:"other";paymentTotals[key]+=num(p.amount);paymentTotals.total+=num(p.amount)}
  Object.keys(paymentTotals).forEach(k=>paymentTotals[k]=round(paymentTotals[k]));

  let incoming=0,outgoing=0;
  for(const m of movements){if(["income","deposit"].includes(m.movement_type))incoming+=num(m.amount);else outgoing+=num(m.amount)}
  incoming=round(incoming);outgoing=round(outgoing);
  const creditTotals:any={cash:0,card:0,transfer:0,other:0,total:0};
  for(const p of credits){const key=Object.hasOwn(creditTotals,p.payment_method)?p.payment_method:"other";creditTotals[key]+=num(p.amount);creditTotals.total+=num(p.amount)}
  Object.keys(creditTotals).forEach(k=>creditTotals[k]=round(creditTotals[k]));
  const returnTotal=round(returns.reduce((a:number,r:any)=>a+num(r.total),0));
  const saleTotal=round(sales.reduce((a:number,s:any)=>a+num(s.total),0));
  const netCash=round(paymentTotals.cash+incoming-outgoing);

  return{ok:true,window,totals:{tickets:sales.length,sales:saleTotal,payments:paymentTotals,returns:returnTotal,return_count:returns.length,cash_entries:incoming,cash_exits:outgoing,net_cash_flow:netCash,credit_payments:creditTotals},sales,returns,movements};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={};try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,60);
  try{
    if(action==="health")return json({ok:true,service:"shift-api",version:1,automaticWindows:true,immutableHistory:true,strictCashOutflow:true,manualCloseRequired:false,cfdiUntouched:true});
    const ctx=await context(req);if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(ctx.user.role))return json({error:"Usuario no autorizado"},403);

    if(action==="getConfig")return json({ok:true,...await config(ctx.businessId)});
    if(action==="currentReport")return json(await report(ctx.businessId,clean(body?.at,60)||undefined));
    if(action==="saveConfig"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede configurar turnos"},403);
      const timezone=clean(body?.timezone,100);
      const shifts=Array.isArray(body?.shifts)?body.shifts:[];
      const result=await db.rpc("solrak_save_shift_schedule",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_timezone:timezone,p_shifts:shifts});
      if(result.error)return json({error:result.error.message,code:result.error.code||null},409);
      return json({ok:true,result:result.data,...await config(ctx.businessId)});
    }
    return json({error:"Acción desconocida"},400);
  }catch(error:any){console.error("shift-api",error);return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,350)},500)}
});