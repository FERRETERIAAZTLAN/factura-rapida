import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=180)=>String(v??"").trim().slice(0,m);

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
  const action=clean(body?.action,60);
  try{
    if(action==="health")return json({ok:true,service:"catalog-integrity-api",version:1,numericCategories:true,reservedCommonCategory:true,softDeleteGuards:true,cfdiUntouched:true});
    const ctx=await context(req);if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(ctx.user.role))return json({error:"Usuario no autorizado"},403);

    if(action==="listCategories"){
      const result=await db.from("product_categories").select("id,name,active,created_at,updated_at").eq("business_id",ctx.businessId).order("id");
      if(result.error)throw result.error;
      return json({ok:true,categories:result.data||[]});
    }

    if(action==="createCategory"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede crear categorías"},403);
      const result=await db.rpc("solrak_create_category",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_name:clean(body?.name,150)});
      if(result.error)return json({error:result.error.message,code:result.error.code||null},409);
      return json(result.data||{ok:true});
    }

    if(action==="setCategoryActive"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede cambiar categorías"},403);
      const id=Number(body?.categoryId),active=body?.active===true;
      if(!Number.isInteger(id)||id<1)return json({error:"Categoría inválida"},400);
      const result=await db.rpc("solrak_set_category_active",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_category_id:id,p_active:active});
      if(result.error)return json({error:result.error.message,code:result.error.code||null},409);
      return json(result.data||{ok:true});
    }

    return json({error:"Acción desconocida"},400);
  }catch(error:any){console.error("catalog-integrity-api",error);return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,350)},500)}
});