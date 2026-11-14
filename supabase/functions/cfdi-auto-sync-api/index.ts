import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL"),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const MAX_PER_OPEN=25;
const MIN_CHECK_AGE_MS=2*60*1000;
const SAT_TIMEOUT_MS=12000;
const UUID_RE=/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
const trim=(s,max=200)=>String(s??"").trim().slice(0,max);
const xmlEsc=(s)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
function decode(s){return s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}
function xmlTag(xml,name){const match=xml.match(new RegExp("<(?:[\\w-]+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?"+name+">","i"));return match?decode(match[1].trim().replace(/^<!\[CDATA\[/,"").replace(/\]\]>$/,"")):""}
async function hash(s){const d=await crypto.subtle.digest("SHA-256",enc.encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sessionContext(req){
 const raw=req.headers.get("x-session-token")||"";
 if(!raw)return null;
 const row=await db.from("app_sessions").select("user_id").eq("token_hash",await hash(raw)).gt("expires_at",new Date().toISOString()).maybeSingle();
 if(row.error)throw row.error;
 if(!row.data)return null;
 const user=await db.from("app_users").select("id,business_id,role,active").eq("id",row.data.user_id).eq("active",true).maybeSingle();
 if(user.error)throw user.error;
 return user.data||null;
}
function soap(method,body){
 return '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://facturacion.finkok.com/cancel"><soap:Header/><soap:Body><tns:'+method+'>'+body+'</tns:'+method+'></soap:Body></soap:Envelope>';
}
async function checkInvoice(inv,issuerRfc,cred,user){
 const uuid=trim(inv.uuid,50).toUpperCase(),receiver=trim(inv.receptor_snapshot?.rfc||inv.receptor_snapshot?.Rfc,20).toUpperCase();
 const amount=Number(inv.total);
 if(!UUID_RE.test(uuid)||!/^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/.test(receiver)||!Number.isFinite(amount)||amount<0)return {checked:false,reason:"INVALID_INVOICE_DATA"};
 const e=xmlEsc;
 const args='<tns:username>'+e(cred.pac_user)+'</tns:username><tns:password>'+e(cred.pac_password)+'</tns:password><tns:taxpayer_id>'+e(issuerRfc)+'</tns:taxpayer_id><tns:rtaxpayer_id>'+e(receiver)+'</tns:rtaxpayer_id><tns:uuid>'+e(uuid)+'</tns:uuid><tns:total>'+amount.toFixed(2)+'</tns:total>';
 let response,body;
 try{
  response=await fetch("https://facturacion.finkok.com/servicios/soap/cancel",{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8","SOAPAction":"get_sat_status","Accept":"text/xml"},body:soap("get_sat_status",args),signal:AbortSignal.timeout(SAT_TIMEOUT_MS)});
  body=await response.text();
 }catch{return {checked:false,reason:"PROVIDER_UNAVAILABLE"}}
 const fault=xmlTag(body,"faultstring"),code=xmlTag(body,"CodigoEstatus"),estado=xmlTag(body,"Estado");
 const cancelabilidad=xmlTag(body,"EsCancelable"),estatus=xmlTag(body,"EstatusCancelacion"),efos=xmlTag(body,"ValidacionEFOS");
 if(!response.ok||fault||!/^S(\s|-|$)/i.test(code)||!["Vigente","Cancelado"].includes(estado))return {checked:false,reason:"SAT_STATUS_UNCONFIRMED"};
 const cancelled=estado==="Cancelado",time=new Date().toISOString();
 const changes={sat_code_status:code,sat_estado:estado,sat_es_cancelable:cancelabilidad||null,sat_estatus_cancelacion:estatus||null,sat_validacion_efos:efos||null,sat_checked_at:time,sat_status_message:estatus||code,updated_at:time};
 if(cancelled){changes.status="cancelled";changes.cancellation_status="cancelled";changes.cancelled_at=inv.cancelled_at||time}
 // A conditional write prevents a stale SAT response from overwriting a newer invoice transition.
 const updated=await db.from("cfdi_invoices").update(changes).eq("id",inv.id).eq("business_id",user.business_id).eq("uuid",uuid).eq("status","timbered").select("id");
 if(updated.error)return {checked:false,reason:"DATABASE_WRITE_FAILED"};
 const changed=cancelled&&updated.data.length===1;
 if(changed){
  const audit=await db.from("audit_logs").insert({business_id:user.business_id,user_id:user.id,action:"cfdi.cancel.detected_from_sat",entity_type:"cfdi",entity_id:inv.id,details:{uuid,origin:"sat_auto_sync",status:estado,code:trim(code,150)}});
  if(audit.error)console.error("Auto-sync audit failed");
 }
 return {checked:true,cancelled:changed,id:changed?inv.id:null};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 if(req.method!=="POST")return json({error:"Método no permitido"},405);
 let body;try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
 if(body?.action==="health")return json({ok:true,service:"cfdi-auto-sync-api",version:1,safeMode:true,maxPerOpen:MAX_PER_OPEN});
 if(body?.action!=="sync")return json({error:"Acción no disponible"},400);
 try{
  const user=await sessionContext(req);
  if(!user)return json({error:"Sesión inválida o vencida"},401);
  const business=await db.from("businesses").select("rfc").eq("id",user.business_id).maybeSingle();
  if(business.error)throw business.error;
  const issuerRfc=trim(business.data?.rfc,20).toUpperCase();
  if(!/^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/.test(issuerRfc))return json({ok:true,skipped:true,reason:"EMITTER_RFC_UNAVAILABLE",checked:0,changed:0,cancelledIds:[]});
  const ps=await db.rpc("get_cfdi_provider_status",{p_business_id:user.business_id});
  if(ps.error)throw ps.error;
  if(ps.data?.provider!=="finkok"||ps.data?.environment!=="production"||ps.data?.pac_connected!==true)return json({ok:true,skipped:true,reason:"FINKOK_PRODUCTION_NOT_READY",checked:0,changed:0,cancelledIds:[]});
  const creds=await db.rpc("get_cfdi_provider_credentials",{p_business_id:user.business_id});
  if(creds.error)throw creds.error;
  if(!creds.data?.pac_user||!creds.data?.pac_password)return json({ok:true,skipped:true,reason:"FINKOK_CREDENTIALS_MISSING",checked:0,changed:0,cancelledIds:[]});
  const query=await db.from("cfdi_invoices")
   .select("id,uuid,total,receptor_snapshot,created_at,cancelled_at,sat_checked_at")
   .eq("business_id",user.business_id).eq("status","timbered").not("uuid","is",null)
   .order("sat_checked_at",{ascending:true,nullsFirst:true})
   .limit(MAX_PER_OPEN);
  if(query.error)throw query.error;
  const now=Date.now();
  const items=(query.data||[]).filter(x=>!x.sat_checked_at||now-Date.parse(x.sat_checked_at)>=MIN_CHECK_AGE_MS);
  if(!items.length)return json({ok:true,checked:0,changed:0,failed:0,throttled:(query.data||[]).length,cancelledIds:[]});
  let cursor=0,checked=0,failed=0;
  const cancelledIds=[];
  const worker=async()=>{
   while(cursor<items.length){
    const inv=items[cursor++];
    try{
     const result=await checkInvoice(inv,issuerRfc,creds.data,user);
     if(result.checked)checked++;
     else failed++;
     if(result.cancelled)cancelledIds.push(result.id);
    }catch{failed++}
   }
  };
  await Promise.all(Array.from({length:Math.min(3,items.length)},()=>worker()));
  return json({ok:true,checked,changed:cancelledIds.length,failed,examined:items.length,throttled:(query.data||[]).length-items.length,cancelledIds});
 }catch(e){console.error("cfdi-auto-sync-api:",trim(e?.message,180));return json({error:"Sincronización SAT no disponible. La facturación no ha sido modificada."},503)}
});