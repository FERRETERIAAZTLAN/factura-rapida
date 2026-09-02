import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(value:ArrayBuffer)=>[...new Uint8Array(value)].map((b)=>b.toString(16).padStart(2,"0")).join("");
const sha=async(value:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(value)));
const clean=(value:unknown,max=200)=>String(value??"").trim().slice(0,max);
const defaults={allow_discounts:false,allow_price_changes:false,allow_wholesale:false,allow_inventory_entry:false};
const allAllowed={allow_discounts:true,allow_price_changes:true,allow_wholesale:true,allow_inventory_entry:true};

async function context(req:Request){
  const raw=req.headers.get("x-session-token")||"";if(!raw)return null;
  const tokenHash=await sha(raw),now=new Date().toISOString();
  const session=(await db.from("app_sessions").select("id,user_id").eq("token_hash",tokenHash).gt("expires_at",now).maybeSingle()).data;if(!session)return null;
  const user=(await db.from("app_users").select("id,business_id,name,username,role,active").eq("id",session.user_id).eq("active",true).maybeSingle()).data;if(!user)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",session.id);return {session,user,businessId:user.business_id};
}
async function permissionsFor(businessId:string,user:any){
  if(user.role==="admin")return {...allAllowed};
  const row=(await db.from("pos_user_permissions").select("allow_discounts,allow_price_changes,allow_wholesale,allow_inventory_entry").eq("business_id",businessId).eq("user_id",user.id).maybeSingle()).data;
  return {...defaults,...(row||{})};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={};try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,60);
  try{
    if(action==="health")return json({ok:true,service:"permissions-api",version:1,granularPermissions:true,cfdiUntouched:true});
    const ctx=await context(req);if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(ctx.user.role))return json({error:"Usuario no autorizado"},403);
    if(action==="myPermissions")return json({ok:true,user:{id:ctx.user.id,name:ctx.user.name,username:ctx.user.username,role:ctx.user.role},permissions:await permissionsFor(ctx.businessId,ctx.user)});
    if(action==="listUsersPermissions"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede administrar permisos"},403);
      const users=await db.from("app_users").select("id,name,username,role,active").eq("business_id",ctx.businessId).order("name");if(users.error)throw users.error;
      const rows=await db.from("pos_user_permissions").select("user_id,allow_discounts,allow_price_changes,allow_wholesale,allow_inventory_entry,updated_at").eq("business_id",ctx.businessId);if(rows.error)throw rows.error;
      const map=new Map((rows.data||[]).map((row:any)=>[row.user_id,row]));
      return json({ok:true,users:(users.data||[]).map((user:any)=>({...user,permissions:user.role==="admin"?{...allAllowed}:{...defaults,...(map.get(user.id)||{})}}))});
    }
    if(action==="saveUserPermissions"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede administrar permisos"},403);
      const userId=clean(body?.userId,80);if(!userId)return json({error:"Falta el usuario"},400);
      const target=(await db.from("app_users").select("id,role,active").eq("id",userId).eq("business_id",ctx.businessId).maybeSingle()).data;if(!target)return json({error:"Usuario no encontrado"},404);
      if(target.role==="admin")return json({ok:true,userId,permissions:{...allAllowed},adminLocked:true});
      const input=body?.permissions||{};
      const payload={business_id:ctx.businessId,user_id:userId,allow_discounts:input.allow_discounts===true,allow_price_changes:input.allow_price_changes===true,allow_wholesale:input.allow_wholesale===true,allow_inventory_entry:input.allow_inventory_entry===true,updated_by:ctx.user.id,updated_at:new Date().toISOString()};
      const saved=await db.from("pos_user_permissions").upsert(payload,{onConflict:"business_id,user_id"}).select("allow_discounts,allow_price_changes,allow_wholesale,allow_inventory_entry").single();if(saved.error)throw saved.error;
      await db.from("audit_logs").insert({business_id:ctx.businessId,user_id:ctx.user.id,action:"pos.permissions.update",entity_type:"app_user",entity_id:userId,details:saved.data});
      return json({ok:true,userId,permissions:saved.data});
    }
    return json({error:"Acción desconocida"},400);
  }catch(error:any){console.error("permissions-api",error);return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,400)},500)}
});
