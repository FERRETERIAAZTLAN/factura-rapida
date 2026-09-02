import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=300)=>String(v??"").trim().slice(0,m);
const num=(v:unknown)=>Number(v??0);
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;

async function context(req:Request){
  const raw=req.headers.get("x-session-token")||"";if(!raw)return null;
  const hash=await sha(raw),now=new Date().toISOString();
  const session=(await db.from("app_sessions").select("id,user_id").eq("token_hash",hash).gt("expires_at",now).maybeSingle()).data;if(!session)return null;
  const user=(await db.from("app_users").select("id,business_id,name,username,role,active").eq("id",session.user_id).eq("active",true).maybeSingle()).data;if(!user)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",session.id);
  return{user,businessId:user.business_id};
}

function movementSign(type:string){return type==="charge"?1:-1}
function daysSince(value:string|null){if(!value)return null;const t=new Date(value).getTime();return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null}

async function summary(ctx:any,body:any){
  const [clientsRes,movementsRes]=await Promise.all([
    db.from("clients").select("id,name,rfc,active,credit_enabled,credit_limit").eq("business_id",ctx.businessId).order("name").limit(10000),
    db.from("customer_credit_movements").select("id,client_id,movement_type,amount,payment_method,reason,created_at,reversed_movement_id").eq("business_id",ctx.businessId).order("created_at",{ascending:true}).limit(50000),
  ]);
  if(clientsRes.error)throw clientsRes.error;if(movementsRes.error)throw movementsRes.error;
  const reversed=new Set((movementsRes.data||[]).map((m:any)=>m.reversed_movement_id).filter(Boolean));
  const map=new Map<string,any>();
  for(const client of clientsRes.data||[])map.set(client.id,{...client,credit_limit:num(client.credit_limit),charges:0,payments:0,reductions:0,balance:0,last_payment_at:null,oldest_charge_at:null,movements:0});
  for(const movement of movementsRes.data||[]){
    const account=map.get(movement.client_id);if(!account)continue;
    const amount=num(movement.amount);account.movements++;
    account.balance+=movementSign(movement.movement_type)*amount;
    if(movement.movement_type==="charge"){
      account.charges+=amount;
      if(!account.oldest_charge_at)account.oldest_charge_at=movement.created_at;
    }else if(movement.movement_type==="payment"){
      account.payments+=amount;
      if(!reversed.has(movement.id))account.last_payment_at=movement.created_at;
    }else account.reductions+=amount;
  }
  const q=clean(body?.query,180).toLocaleLowerCase("es-MX");
  const minDebt=Math.max(0,num(body?.minDebt));
  const maxDebt=num(body?.maxDebt)>0?num(body.maxDebt):null;
  const noPaymentDays=Math.max(0,Math.floor(num(body?.noPaymentDays)));
  const sort=clean(body?.sort,30)||"debt_desc";
  let rows=[...map.values()].map((row:any)=>{
    row.balance=round(row.balance);row.charges=round(row.charges);row.payments=round(row.payments);row.reductions=round(row.reductions);
    row.available_credit=row.active&&row.credit_enabled?round(Math.max(0,row.credit_limit-row.balance)):0;
    const basis=row.last_payment_at||row.oldest_charge_at;
    row.days_without_payment=daysSince(basis);
    return row;
  }).filter((row:any)=>row.balance>0.009)
    .filter((row:any)=>!q||`${row.name||""} ${row.rfc||""}`.toLocaleLowerCase("es-MX").includes(q))
    .filter((row:any)=>row.balance>=minDebt)
    .filter((row:any)=>maxDebt===null||row.balance<=maxDebt)
    .filter((row:any)=>!noPaymentDays||(row.days_without_payment??0)>=noPaymentDays);
  rows.sort((a:any,b:any)=>{
    if(sort==="debt_asc")return a.balance-b.balance||a.name.localeCompare(b.name,"es");
    if(sort==="oldest")return (b.days_without_payment??-1)-(a.days_without_payment??-1)||b.balance-a.balance;
    return b.balance-a.balance||a.name.localeCompare(b.name,"es");
  });
  return{ok:true,accounts:rows,totals:{clients:rows.length,debt:round(rows.reduce((s:number,r:any)=>s+r.balance,0))}};
}

async function history(ctx:any,body:any){
  const clientId=clean(body?.clientId,80);if(!clientId)return{error:"Falta el cliente"};
  const client=(await db.from("clients").select("id,name,rfc,active,credit_enabled,credit_limit").eq("business_id",ctx.businessId).eq("id",clientId).maybeSingle()).data;
  if(!client)return{error:"Cliente no encontrado",status:404};
  const result=await db.from("customer_credit_movements").select("id,sale_id,return_id,cash_session_id,movement_type,amount,payment_method,reason,created_by,created_at,reversed_movement_id").eq("business_id",ctx.businessId).eq("client_id",clientId).order("created_at",{ascending:false}).limit(2000);
  if(result.error)throw result.error;
  const rows=result.data||[];
  const reversedBy=new Map(rows.filter((r:any)=>r.reversed_movement_id).map((r:any)=>[r.reversed_movement_id,r.id]));
  const userIds=[...new Set(rows.map((r:any)=>r.created_by).filter(Boolean))];
  const users=userIds.length?(await db.from("app_users").select("id,name").eq("business_id",ctx.businessId).in("id",userIds)).data||[]:[];
  const userMap=new Map(users.map((u:any)=>[u.id,u.name]));
  let balance=0;
  const chronological=[...rows].reverse();
  const running=new Map<string,number>();
  for(const row of chronological){balance+=movementSign(row.movement_type)*num(row.amount);running.set(row.id,round(balance))}
  return{ok:true,client:{...client,credit_limit:num(client.credit_limit)},balance:round(balance),movements:rows.map((row:any)=>({...row,amount:num(row.amount),balance_after:running.get(row.id)||0,user_name:userMap.get(row.created_by)||"Usuario",reversed:reversedBy.has(row.id),reversal_id:reversedBy.get(row.id)||null,is_reversal:Boolean(row.reversed_movement_id)}))};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={};try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,50);
  try{
    if(action==="health")return json({ok:true,service:"credit-api",version:1,history:true,filters:true,paymentReceipts:true,safePaymentVoids:true,cfdiUntouched:true});
    const ctx=await context(req);if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(ctx.user.role))return json({error:"Usuario no autorizado"},403);
    if(action==="summary")return json(await summary(ctx,body));
    if(action==="history"){const out:any=await history(ctx,body);return json(out,out.status||("error" in out?400:200))}
    if(action==="recordPayment"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede registrar abonos"},403);
      const result=await db.rpc("pos_record_credit_payment",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_client_id:body?.clientId||null,p_cash_session_id:body?.cashSessionId||null,p_amount:num(body?.amount),p_payment_method:clean(body?.paymentMethod,30),p_reason:clean(body?.reason,500)});
      if(result.error)return json({error:result.error.message||"No se pudo registrar el abono",code:result.error.code||null},409);
      const client=(await db.from("clients").select("id,name,rfc").eq("business_id",ctx.businessId).eq("id",body?.clientId||"").maybeSingle()).data;
      return json({...(result.data||{ok:true}),client});
    }
    if(action==="voidPayment"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede cancelar abonos"},403);
      const result=await db.rpc("solrak_void_credit_payment",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_movement_id:body?.movementId||null,p_reason:clean(body?.reason,500)});
      if(result.error)return json({error:result.error.message||"No se pudo cancelar el abono",code:result.error.code||null},409);
      return json(result.data||{ok:true});
    }
    return json({error:"Acción desconocida"},400);
  }catch(error:any){console.error("credit-api",error);return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,400)},500)}
});
