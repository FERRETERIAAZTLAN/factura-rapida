import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const clean=(v:unknown,max=200)=>String(v??"").trim().slice(0,max);
const escapeXml=(v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const enc=new TextEncoder();
async function hash(s:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function context(req:Request){
 const token=req.headers.get("x-session-token")||"";if(!token)return null;
 const session=(await db.from("app_sessions").select("user_id").eq("token_hash",await hash(token)).gt("expires_at",new Date().toISOString()).maybeSingle()).data;
 if(!session)return null;
 const user=(await db.from("app_users").select("id,business_id,role,active").eq("id",session.user_id).eq("active",true).maybeSingle()).data;
 return user||null;
}
async function audit(user:any,action:string,invoiceId:string,details:any){
 const result=await db.from("audit_logs").insert({business_id:user.business_id,user_id:user.id,action,entity_type:"cfdi",entity_id:invoiceId,details});
 if(result.error)console.error("Audit",result.error.message);
}
function soap(operation:string,args:string){
 const ns="http://facturacion.finkok.com/cancel";
 return '<?xml version="1.0" encoding="utf-8"?>'+
 '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="'+ns+'" xmlns:s0="apps.services.soap.core.views"><soap:Header/><soap:Body><tns:'+operation+'>'+args+'</tns:'+operation+'></soap:Body></soap:Envelope>';
}
async function finkok(operation:string,args:string){
 const r=await fetch("https://facturacion.finkok.com/servicios/soap/cancel",{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8","SOAPAction":operation,"Accept":"text/xml"},body:soap(operation,args),signal:AbortSignal.timeout(20000)});
 const t=await r.text();return {httpStatus:r.status,text:t};
}
function tag(xml:string,name:string){
 const m=xml.match(new RegExp("<(?:[\\w-]+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?"+name+">","i"));
 return m?m[1].replace(/^<!\[CDATA\[/,"").replace(/\]\]>$/,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&").trim():"";
}
async function credentials(bid:string){
 const ps=await db.rpc("get_cfdi_provider_status",{p_business_id:bid});if(ps.error)throw ps.error;
 const x=ps.data||{};
 if(x.provider!=="finkok"||x.environment!=="production"||x.pac_connected!==true)return null;
 const cr=await db.rpc("get_cfdi_provider_credentials",{p_business_id:bid});if(cr.error)throw cr.error;
 const username=clean(cr.data?.pac_user,300),password=clean(cr.data?.pac_password,300);
 if(!username||!password)return null;
 return {username,password};
}
async function invoiceFor(user:any,id:string){
 const r=await db.from("cfdi_invoices").select("id,business_id,draft_id,uuid,status,cancellation_status,cancellation_reason,cancelled_at,total,receptor_snapshot,xml_text,issuer_snapshot,pac_response").eq("id",id).eq("business_id",user.business_id).maybeSingle();
 if(r.error)throw r.error;return r.data;
}
async function check(user:any,invoice:any,creds:any){
 const x=escapeXml;
 const receptor=clean(invoice.receptor_snapshot?.rfc||invoice.receptor_snapshot?.Rfc,20).toUpperCase();
 const rfc=clean(invoice.issuer_snapshot?.rfc||invoice.issuer_snapshot?.Rfc,20).toUpperCase()||
  clean((await db.from("businesses").select("rfc").eq("id",user.business_id).single()).data?.rfc,20).toUpperCase();
 if(!rfc||!receptor)return json({error:"No se pudieron obtener los RFC del CFDI para comprobar su estatus."},409);
 const args='<tns:username>'+x(creds.username)+'</tns:username><tns:password>'+x(creds.password)+'</tns:password><tns:taxpayer_id>'+x(rfc)+'</tns:taxpayer_id><tns:rtaxpayer_id>'+x(receptor)+'</tns:rtaxpayer_id><tns:uuid>'+x(invoice.uuid)+'</tns:uuid><tns:total>'+Number(invoice.total).toFixed(2)+'</tns:total>';
 let response;
 try{response=await finkok("get_sat_status",args)}catch{return json({error:"No se pudo consultar el SAT por Finkok. Intenta de nuevo sin reenviar la cancelación.",code:"SAT_CHECK_UNAVAILABLE"},502)}
 const fault=tag(response.text,"faultstring"),estado=tag(response.text,"Estado"),esCancelable=tag(response.text,"EsCancelable"),estatus=tag(response.text,"EstatusCancelacion"),codigo=tag(response.text,"CodigoEstatus");
 if(response.httpStatus>=400||fault||!estado)return json({error:"No se pudo confirmar el estado del CFDI.",code:"SAT_CHECK_UNAVAILABLE",detail:clean(fault||codigo,180)},502);
 const cancelled=estado.toLowerCase()==="cancelado",when=new Date().toISOString();
 const update:any={sat_estado:estado,sat_es_cancelable:esCancelable||null,sat_estatus_cancelacion:estatus||null,sat_code_status:codigo||null,sat_checked_at:when,sat_status_message:estatus||codigo||null,updated_at:when};
 if(cancelled){update.status="cancelled";update.cancellation_status="cancelled";update.cancelled_at=invoice.cancelled_at||when}
 const up=await db.from("cfdi_invoices").update(update).eq("id",invoice.id).eq("business_id",user.business_id);
 if(up.error)throw up.error;
 if(cancelled&&invoice.status!=="cancelled")await audit(user,"cfdi.cancel.confirmed",invoice.id,{uuid:invoice.uuid,estado,estatus});
 return json({ok:true,invoiceId:invoice.id,uuid:invoice.uuid,estado,esCancelable,estatusCancelacion:estatus,codigoEstatus:codigo,cancelled,pending:!cancelled&&["requested","uncertain","submitting"].includes(invoice.cancellation_status||"")});
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método no permitido"},405);
 let body:any={};try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
 const action=clean(body.action,30);
 if(action==="health")return json({ok:true,service:"cfdi-cancel-api",version:1,productionOnly:true,requestIsNotConfirmation:true});
 try{
 const user=await context(req);if(!user)return json({error:"Sesión inválida o vencida"},401);
 const invoiceId=clean(body.invoiceId,60);
 if(!uuidPattern.test(invoiceId))return json({error:"Identificador de factura incorrecto"},400);
 const invoice=await invoiceFor(user,invoiceId);
 if(!invoice)return json({error:"Factura no encontrada"},404);
 if(!invoice.uuid||!uuidPattern.test(invoice.uuid))return json({error:"El CFDI no tiene UUID confirmado; revisa el timbrado antes de cancelar."},409);
 if(!["timbered","cancelled"].includes(invoice.status))return json({error:"La factura no está timbrada. No se puede enviar una cancelación fiscal."},409);
 const creds=await credentials(user.business_id);
 if(!creds)return json({error:"Finkok producción no está configurado para consultar o cancelar."},409);
 if(action==="check")return await check(user,invoice,creds);
 if(action!=="request")return json({error:"Acción no disponible"},400);
 if(user.role!=="admin")return json({error:"Solo el administrador puede solicitar una cancelación fiscal."},403);
 if(invoice.status==="cancelled")return json({error:"El CFDI ya aparece cancelado. Consulta el estado para confirmarlo."},409);
 if(invoice.cancellation_status&&invoice.cancellation_status!=="rejected")return json({error:"Ya hay una solicitud o revisión de cancelación. Usa «Consultar estado» antes de repetirla.",code:"CANCEL_ALREADY_STARTED",status:invoice.cancellation_status},409);
 const reason=clean(body.reason,2),replacement=clean(body.replacementUuid,60).toUpperCase();
 if(!["01","02","03","04"].includes(reason))return json({error:"Selecciona un motivo del SAT: 01, 02, 03 o 04."},400);
 if(reason==="01"){
  if(!uuidPattern.test(replacement)||replacement===String(invoice.uuid).toUpperCase())return json({error:"El motivo 01 requiere el UUID de una factura sustituta timbrada y relacionada con la original."},400);
  const rep=(await db.from("cfdi_invoices").select("uuid,xml_text,status").eq("business_id",user.business_id).eq("uuid",replacement).maybeSingle()).data;
  if(!rep||rep.status!=="timbered"||!rep.xml_text||!rep.xml_text.includes('TipoRelacion="04"')||!rep.xml_text.toUpperCase().includes(String(invoice.uuid).toUpperCase()))
   return json({error:"Primero debe timbrarse un CFDI sustituto con relación 04 al UUID original. Esta aplicación todavía no emite esa relación; no se enviará una cancelación 01 incompleta.",code:"REPLACEMENT_RELATION_REQUIRED"},409);
 }
 const claimed=await db.from("cfdi_invoices").update({cancellation_status:"submitting",cancellation_reason:reason,updated_at:new Date().toISOString()}).eq("id",invoice.id).eq("business_id",user.business_id).eq("status","timbered").is("cancellation_status",null).select("id");
 if(claimed.error)throw claimed.error;
 if(!claimed.data?.length)return json({error:"La solicitud ya cambió de estado. Actualiza y consulta antes de volver a intentar.",code:"CANCEL_ALREADY_STARTED"},409);
 await audit(user,"cfdi.cancel.request_started",invoice.id,{uuid:invoice.uuid,reason,replacement:reason==="01"?replacement:null});
 const issuerRfc=clean(invoice.issuer_snapshot?.rfc||invoice.issuer_snapshot?.Rfc,20).toUpperCase()||
  clean((await db.from("businesses").select("rfc").eq("id",user.business_id).single()).data?.rfc,20).toUpperCase();
 if(!issuerRfc)throw new Error("RFC emisor no disponible");
 const x=escapeXml;
 const uu='<tns:UUIDS><s0:UUID UUID="'+x(invoice.uuid)+'" Motivo="'+x(reason)+'"'+(reason==="01"?' FolioSustitucion="'+x(replacement)+'"':'')+'/></tns:UUIDS>';
 const args=uu+'<tns:username>'+x(creds.username)+'</tns:username><tns:password>'+x(creds.password)+'</tns:password><tns:taxpayer_id>'+x(issuerRfc)+'</tns:taxpayer_id><tns:store_pending>false</tns:store_pending>';
 let response;
 try{response=await finkok("cancel",args)}catch{
  await db.from("cfdi_invoices").update({cancellation_status:"uncertain",updated_at:new Date().toISOString()}).eq("id",invoice.id).eq("business_id",user.business_id);
  await audit(user,"cfdi.cancel.response_uncertain",invoice.id,{reason});
  return json({error:"No se pudo confirmar si Finkok recibió la solicitud. No vuelvas a enviarla: consulta primero su estado.",code:"CANCEL_RESPONSE_UNCERTAIN"},502);
 }
 const fault=tag(response.text,"faultstring"),codigo=tag(response.text,"EstatusUUID")||tag(response.text,"CodEstatus"),descripcion=tag(response.text,"EstatusCancelacion")||tag(response.text,"MensajeIncidencia");
 const accepted=response.httpStatus<400&&!fault&&["201","202"].includes(codigo);
 const now=new Date().toISOString();
 await db.from("cfdi_invoices").update({cancellation_status:accepted?"requested":"rejected",updated_at:now,sat_status_message:clean(fault||descripcion||codigo,250)||null}).eq("id",invoice.id).eq("business_id",user.business_id);
 await audit(user,accepted?"cfdi.cancel.request_accepted":"cfdi.cancel.request_rejected",invoice.id,{reason,codigo,httpStatus:response.httpStatus,description:clean(fault||descripcion,250)});
 if(!accepted)return json({error:"Finkok no aceptó la solicitud; la factura sigue vigente hasta verificar lo contrario.",code:"FINKOK_CANCEL_REJECTED",finkokCode:codigo||null,detail:clean(fault||descripcion,200)},422);
 // Finkok acceptance is not the same as final SAT cancellation; check once.
 const result=await check(user,{...invoice,cancellation_status:"requested"},creds);
 return result;
 }catch(e:any){console.error("cfdi-cancel-api",String(e?.message||e));return json({error:"No se pudo completar la operación. Consulta el estado fiscal antes de repetirla.",detail:clean(e?.message,180)},500)}
});