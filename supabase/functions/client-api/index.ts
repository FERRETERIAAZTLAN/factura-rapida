import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=160)=>String(v??"").trim().slice(0,m);
const num=(v:unknown)=>Number(v??0);

async function ctx(req:Request){
  const raw=req.headers.get("x-session-token")||"";if(!raw)return null;
  const h=await sha(raw),now=new Date().toISOString();
  const s=(await db.from("app_sessions").select("id,user_id,expires_at").eq("token_hash",h).gt("expires_at",now).maybeSingle()).data;if(!s)return null;
  const u=(await db.from("app_users").select("id,business_id,name,username,role,active").eq("id",s.user_id).eq("active",true).maybeSingle()).data;if(!u)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",s.id);
  return{user:u};
}

async function managementRows(businessId:string){
  const clients=await db.from("clients").select("id,name,rfc,email,phone,active,credit_enabled,credit_limit,created_at,updated_at").eq("business_id",businessId).order("name");
  if(clients.error)throw clients.error;
  const movements=await db.from("customer_credit_movements").select("client_id,movement_type,amount,created_at").eq("business_id",businessId).order("created_at",{ascending:false});
  if(movements.error)throw movements.error;
  const balances=new Map<string,{balance:number,lastMovementAt:string|null}>();
  for(const row of movements.data||[]){
    const current=balances.get(row.client_id)||{balance:0,lastMovementAt:null};
    current.balance+=row.movement_type==="charge"?num(row.amount):-num(row.amount);
    if(!current.lastMovementAt)current.lastMovementAt=row.created_at;
    balances.set(row.client_id,current);
  }
  return (clients.data||[]).map((client:any)=>({
    ...client,
    credit_limit:num(client.credit_limit),
    balance:Math.round((balances.get(client.id)?.balance||0)*100)/100,
    last_movement_at:balances.get(client.id)?.lastMovementAt||null,
  }));
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any;try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,40);
  try{
    if(action==="health")return json({ok:true,service:"client-api",version:2,softDelete:true,creditLimits:true,creditAuthorization:true,cfdiUntouched:true});
    const c=await ctx(req);if(!c)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(c.user.role))return json({error:"Usuario no autorizado"},403);

    if(action==="listClientsManagement"){
      if(c.user.role!=="admin")return json({error:"Solo el administrador puede administrar créditos"},403);
      return json({ok:true,clients:await managementRows(c.user.business_id)});
    }

    if(action==="saveCreditSettings"){
      if(c.user.role!=="admin")return json({error:"Solo el administrador puede administrar créditos"},403);
      const id=clean(body?.id||body?.clientId,80);
      const enabled=body?.creditEnabled===true;
      const limit=Math.round(num(body?.creditLimit)*100)/100;
      if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"Cliente inválido"},400);
      if(!Number.isFinite(limit)||limit<0)return json({error:"Límite de crédito inválido"},400);
      if(enabled&&limit<=0)return json({error:"Escribe un límite mayor a cero para autorizar crédito"},400);
      const existing=(await db.from("clients").select("id,name,active").eq("id",id).eq("business_id",c.user.business_id).maybeSingle()).data;
      if(!existing)return json({error:"Cliente no encontrado"},404);
      if(existing.active===false&&enabled)return json({error:"Activa al cliente antes de autorizar crédito"},409);
      const updated=await db.from("clients").update({credit_enabled:enabled,credit_limit:limit,updated_by:c.user.id,updated_at:new Date().toISOString()}).eq("id",id).eq("business_id",c.user.business_id).select("id,name,active,credit_enabled,credit_limit").single();
      if(updated.error)throw updated.error;
      await db.from("audit_logs").insert({business_id:c.user.business_id,user_id:c.user.id,action:"client.credit.settings",entity_type:"client",entity_id:id,details:{credit_enabled:enabled,credit_limit:limit}});
      return json({ok:true,client:updated.data});
    }

    if(action==="setClientActive"){
      if(c.user.role!=="admin")return json({error:"Solo el administrador puede activar o desactivar clientes"},403);
      const id=clean(body?.id||body?.clientId,80),active=body?.active===true;
      if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"Cliente inválido"},400);
      if(!active){
        const r=await db.rpc("delete_client_safe",{p_business_id:c.user.business_id,p_user_id:c.user.id,p_client_id:id});
        if(r.error)throw r.error;
        const out:any=r.data||{};
        if(out.ok===true)return json(out);
        if(out.code==="CLIENT_NOT_FOUND")return json({error:out.message||"Cliente no encontrado",code:out.code},404);
        if(out.code==="ADMIN_REQUIRED")return json({error:out.message||"Solo el administrador puede dar de baja clientes",code:out.code},403);
        return json({error:out.message||"No se pudo dar de baja el cliente",code:out.code||"DEACTIVATE_BLOCKED"},400);
      }
      const updated=await db.from("clients").update({active:true,updated_by:c.user.id,updated_at:new Date().toISOString()}).eq("id",id).eq("business_id",c.user.business_id).select("id,name,active,credit_enabled,credit_limit").maybeSingle();
      if(updated.error)throw updated.error;
      if(!updated.data)return json({error:"Cliente no encontrado"},404);
      await db.from("audit_logs").insert({business_id:c.user.business_id,user_id:c.user.id,action:"client.activate",entity_type:"client",entity_id:id,details:{name:updated.data.name}});
      return json({ok:true,client:updated.data});
    }

    if(action==="deleteClient"){
      if(c.user.role!=="admin")return json({error:"Solo el administrador puede dar de baja clientes"},403);
      const id=clean(body?.id,80);if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"Cliente inválido"},400);
      const r=await db.rpc("delete_client_safe",{p_business_id:c.user.business_id,p_user_id:c.user.id,p_client_id:id});
      if(r.error)throw r.error;const out:any=r.data||{};
      if(out.ok===true)return json(out);
      if(out.code==="CLIENT_NOT_FOUND")return json({error:out.message||"Cliente no encontrado",code:out.code},404);
      if(out.code==="ADMIN_REQUIRED")return json({error:out.message||"Solo el administrador puede dar de baja clientes",code:out.code},403);
      return json({error:out.message||"No se pudo dar de baja el cliente",code:out.code||"DEACTIVATE_BLOCKED"},400);
    }

    return json({error:"Acción desconocida"},400);
  }catch(e:any){console.error("client-api",e);return json({error:"Error del servidor",detail:String(e?.message||e).slice(0,300)},500)}
});
