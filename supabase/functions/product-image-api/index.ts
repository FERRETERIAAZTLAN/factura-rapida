import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=200)=>String(v??"").trim().slice(0,m);
const BUCKET="product-images";
const MAX_BYTES=5*1024*1024;
const MIME_EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};

async function ctx(req:Request){
  const raw=req.headers.get("x-session-token")||""; if(!raw)return null;
  const h=await sha(raw),now=new Date().toISOString();
  const s=(await db.from("app_sessions").select("id,user_id,business_id,expires_at").eq("token_hash",h).gt("expires_at",now).maybeSingle()).data; if(!s)return null;
  const u=(await db.from("app_users").select("id,business_id,role,active").eq("id",s.user_id).eq("active",true).maybeSingle()).data; if(!u||u.business_id!==s.business_id)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",s.id);
  return {user:u,business_id:u.business_id};
}

function decodeBase64(raw:string){
  const normalized=raw.replace(/^data:[^;]+;base64,/,"").replace(/\s+/g,"");
  if(!normalized)throw new Error("EMPTY_IMAGE");
  if(normalized.length>Math.ceil(MAX_BYTES*4/3)+16)throw new Error("IMAGE_TOO_LARGE");
  let binary:string;
  try{binary=atob(normalized)}catch{throw new Error("INVALID_BASE64")}
  if(binary.length>MAX_BYTES)throw new Error("IMAGE_TOO_LARGE");
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

function matchesMime(bytes:Uint8Array,mime:string){
  if(mime==="image/png")return bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a;
  if(mime==="image/jpeg")return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mime==="image/webp")return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  return false;
}

async function audit(businessId:string,userId:string,action:string,productId:string,details:Record<string,unknown>){
  try{await db.from("audit_logs").insert({business_id:businessId,user_id:userId,action,entity_type:"product",entity_id:productId,details})}catch{}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={}; try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,40);
  if(action==="health")return json({ok:true,service:"product-image-api",version:2,listImages:true,manualUpload:true,maxBytes:MAX_BYTES,types:Object.keys(MIME_EXT)});
  const c=await ctx(req); if(!c)return json({error:"Sesión inválida o vencida"},401);

  if(action==="listImages"){
    const r=await db.from("products").select("id,image_path,image_source,image_updated_at").eq("business_id",c.business_id).eq("active",true).not("image_path","is",null);
    if(r.error){console.error(r.error);return json({error:"No se pudieron cargar las imágenes"},500)}
    const base=`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${BUCKET}/`;
    const images=(r.data||[]).map((x:any)=>({id:x.id,path:x.image_path,url:base+x.image_path.split("/").map(encodeURIComponent).join("/"),source:x.image_source,updated_at:x.image_updated_at}));
    return json({ok:true,images});
  }

  if(action==="uploadImage"){
    if(c.user.role!=="admin")return json({error:"Solo el administrador puede cambiar imágenes de productos"},403);
    const productId=clean(body?.productId,80),contentType=clean(body?.contentType,80).toLowerCase();
    if(!productId)return json({error:"Falta el producto"},400);
    const ext=MIME_EXT[contentType]; if(!ext)return json({error:"Usa una imagen PNG, JPG o WEBP"},400);
    const p=await db.from("products").select("id,image_path").eq("id",productId).eq("business_id",c.business_id).maybeSingle();
    if(p.error){console.error(p.error);return json({error:"No se pudo verificar el producto"},500)}
    if(!p.data)return json({error:"Producto no encontrado"},404);
    let bytes:Uint8Array;
    try{bytes=decodeBase64(String(body?.base64??""))}catch(e){const code=String((e as Error)?.message||e);if(code==="IMAGE_TOO_LARGE")return json({error:"La imagen supera 5 MB"},413);return json({error:"La imagen no se pudo leer"},400)}
    if(!matchesMime(bytes,contentType))return json({error:"El contenido del archivo no coincide con el tipo de imagen"},400);

    const path=`${c.business_id}/${productId}/manual-${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from(BUCKET).upload(path,bytes,{contentType,cacheControl:"31536000",upsert:false});
    if(up.error){console.error(up.error);return json({error:"No se pudo subir la imagen"},500)}
    const now=new Date().toISOString();
    const save=await db.from("products").update({image_path:path,image_source:"manual",image_source_ref:null,image_updated_at:now,updated_by:c.user.id}).eq("id",productId).eq("business_id",c.business_id).select("id,image_path,image_source,image_updated_at").single();
    if(save.error){console.error(save.error);await db.storage.from(BUCKET).remove([path]);return json({error:"No se pudo asociar la imagen al producto"},500)}
    const old=String(p.data.image_path||"");
    if(old&&old!==path&&old.startsWith(`${c.business_id}/`)){const rm=await db.storage.from(BUCKET).remove([old]);if(rm.error)console.warn("No se pudo limpiar imagen anterior",rm.error.message)}
    const publicUrl=db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    await audit(c.business_id,c.user.id,"product.image.update",productId,{source:"manual",content_type:contentType,size:bytes.length});
    return json({ok:true,image:{id:productId,path,url:publicUrl,source:"manual",updated_at:now}});
  }

  return json({error:"Acción desconocida"},400);
});
