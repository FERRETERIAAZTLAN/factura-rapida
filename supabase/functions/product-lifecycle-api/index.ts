import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(value:ArrayBuffer)=>[...new Uint8Array(value)].map((b)=>b.toString(16).padStart(2,"0")).join("");
const sha=async(value:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(value)));
const clean=(value:unknown,max=200)=>String(value??"").trim().slice(0,max);

async function context(req:Request){
  const raw=req.headers.get("x-session-token")||"";
  if(!raw)return null;
  const tokenHash=await sha(raw),now=new Date().toISOString();
  const session=(await db.from("app_sessions").select("id,user_id").eq("token_hash",tokenHash).gt("expires_at",now).maybeSingle()).data;
  if(!session)return null;
  const user=(await db.from("app_users").select("id,business_id,name,role,active").eq("id",session.user_id).eq("active",true).maybeSingle()).data;
  if(!user)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",session.id);
  return {session,user,businessId:user.business_id};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={};try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,60);
  try{
    if(action==="health")return json({ok:true,service:"product-lifecycle-api",version:1,softDeleteHistory:true,physicalDeleteUnused:true,cfdiUntouched:true});
    const ctx=await context(req);
    if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede dar de baja productos"},403);

    if(action==="retireProduct"){
      const productId=clean(body?.productId||body?.id,80);
      if(!productId)return json({error:"Falta el producto"},400);
      const result=await db.rpc("solrak_retire_product",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_product_id:productId});
      if(result.error)return json({error:result.error.message||"No se pudo dar de baja el producto",code:result.error.code||null},409);
      return json(result.data||{ok:true});
    }

    return json({error:"Acción desconocida"},400);
  }catch(error:any){
    console.error("product-lifecycle-api",error);
    return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,400)},500);
  }
});
