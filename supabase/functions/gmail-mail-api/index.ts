import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import nodemailer from "npm:nodemailer@6.9.16";
import { Buffer } from "node:buffer";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const clean=(v:unknown,m=300)=>String(v??"").trim().slice(0,m);
const emailOk=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
const PDF_BUCKET="cfdi-documents";
const DOC_URL=`${Deno.env.get("SUPABASE_URL")}/functions/v1/cfdi-document-api`;

async function ctx(req:Request){
  const raw=req.headers.get("x-session-token")||""; if(!raw)return null;
  const h=await sha(raw),now=new Date().toISOString();
  const s=(await db.from("app_sessions").select("id,user_id,expires_at").eq("token_hash",h).gt("expires_at",now).maybeSingle()).data; if(!s)return null;
  const u=(await db.from("app_users").select("id,business_id,name,username,role,active,email").eq("id",s.user_id).eq("active",true).maybeSingle()).data; if(!u)return null;
  const b=(await db.from("businesses").select("id,name,code,contact_email,phone,address,logo_path,auto_send_cfdi_email").eq("id",u.business_id).maybeSingle()).data; if(!b)return null;
  const p=await db.rpc("is_platform_admin",{p_user_id:u.id});
  return{user:u,business:b,isPlatformAdmin:!p.error&&p.data===true};
}
async function status(bid:string){const r=await db.rpc("get_business_mail_status",{p_business_id:bid});if(r.error)throw r.error;return r.data||{}}
async function creds(bid:string){const r=await db.rpc("get_business_mail_credentials",{p_business_id:bid});if(r.error)throw r.error;return r.data||{}}
async function mark(bid:string,ok:boolean,msg:string){const r=await db.rpc("set_business_mail_test_result",{p_business_id:bid,p_ok:ok,p_message:msg});if(r.error)throw r.error}
async function markPlatform(ok:boolean,msg:string){const r=await db.rpc("set_platform_email_test_result",{p_ok:ok,p_message:msg});if(r.error)throw r.error}
function transport(c:any){return nodemailer.createTransport({host:"smtp.gmail.com",port:465,secure:true,auth:{user:String(c.email||""),pass:String(c.app_password||"")},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:25000,tls:{servername:"smtp.gmail.com"}})}
function esc(v:unknown){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;")}
function money(v:unknown){return Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"})}
function logoUrl(path:string|null|undefined){if(!path)return"";return`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/business-logos/${encodeURI(path)}`}
function fmtDate(v:unknown){try{return new Date(String(v||Date.now())).toLocaleString("es-MX",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Mazatlan"})}catch{return""}}

function shell(content:string,b:any){
  const logo=logoUrl(b.logo_path), phone=clean(b.phone,80), address=clean(b.address,220);
  const brand=logo?`<img src="${esc(logo)}" alt="${esc(b.name)}" width="148" style="display:block;max-width:148px;width:100%;height:auto;max-height:90px;object-fit:contain;margin:0 auto;border:0">`:`<div style="font-size:24px;font-weight:800;color:#17202a">${esc(b.name)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head><body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#17202a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f8;border-collapse:collapse"><tr><td align="center" style="padding:18px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border:1px solid #e2e6e9;border-radius:16px;overflow:hidden;border-collapse:separate"><tr><td style="height:5px;background:#ef7615;font-size:0">&nbsp;</td></tr><tr><td align="center" style="padding:22px 24px 18px;background:#fff">${brand}</td></tr><tr><td style="padding:0 24px 24px;background:#fff">${content}</td></tr><tr><td align="center" style="padding:18px 20px;background:#fff8f2;border-top:1px solid #f1dfd1"><div style="font-size:16px;font-weight:800;color:#17202a">¡Gracias por su preferencia!</div><div style="font-size:14px;font-weight:800;color:#ef7615;margin-top:4px">${esc(b.name)}</div><div style="margin:13px auto 0;max-width:410px">${phone?`<div style="font-size:13px;line-height:1.6;color:#505966;padding:0 0 8px"><strong style="color:#202936">Teléfono:</strong> ${esc(phone)}</div>`:""}${address?`<div style="font-size:13px;line-height:1.6;color:#505966;overflow-wrap:break-word"><strong style="color:#202936">Dirección:</strong><div style="margin:3px auto 0;max-width:390px">${esc(address)}</div></div>`:""}</div></td></tr></table></td></tr></table></body></html>`;
}
function testTemplate(b:any,email:string){
  const c=`<div style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:#ef7615;margin-bottom:8px">CORREO DE PRUEBA</div><div style="font-size:24px;line-height:1.2;font-weight:800;color:#17202a;margin-bottom:10px">¡El envío de facturas está listo!</div><div style="font-size:14px;line-height:1.55;color:#5f6872">Este mensaje confirma que <strong style="color:#17202a">${esc(b.name)}</strong> puede enviar facturas por correo. En una factura real se adjuntarán únicamente los archivos <strong>PDF</strong> y <strong>XML</strong> del CFDI timbrado.</div><div style="margin-top:18px;padding:13px 14px;border:1px solid #cfe5d6;background:#f3fbf5;border-radius:10px;font-size:13px"><strong>Estado:</strong> <span style="color:#168544;font-weight:800">✓ Correo conectado correctamente</span></div><div style="margin-top:12px;font-size:11px;color:#7a838c">Remitente: ${esc(email)}</div>`;
  return shell(c,b);
}
function invoiceTemplate(p:any,b:any){
  const c=`<div style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:#ef7615;margin-bottom:8px">FACTURA ELECTRÓNICA</div><div style="font-size:24px;line-height:1.2;font-weight:800;color:#17202a;margin-bottom:10px">Su factura electrónica está lista</div><div style="font-size:14px;line-height:1.55;color:#5f6872">Le hacemos llegar su factura electrónica. Los archivos <strong style="color:#17202a">PDF</strong> y <strong style="color:#17202a">XML</strong> se encuentran adjuntos.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #e2e6e9;border-radius:12px;overflow:hidden;border-collapse:separate;background:#f8f9fa"><tr><td style="padding:11px 13px;border-bottom:1px solid #e2e6e9;font-size:10px;font-weight:800;color:#7f8891;width:32%">FOLIO</td><td style="padding:11px 13px;border-bottom:1px solid #e2e6e9;font-size:14px;font-weight:800;color:#ef7615">${esc(p.folio)}</td></tr><tr><td style="padding:11px 13px;border-bottom:1px solid #e2e6e9;font-size:10px;font-weight:800;color:#7f8891">TOTAL</td><td style="padding:11px 13px;border-bottom:1px solid #e2e6e9;font-size:17px;font-weight:800;color:#ef7615">${esc(money(p.total))}</td></tr><tr><td style="padding:11px 13px;border-bottom:1px solid #e2e6e9;font-size:10px;font-weight:800;color:#7f8891">FECHA</td><td style="padding:11px 13px;border-bottom:1px solid #e2e6e9;font-size:12px;color:#303841">${esc(fmtDate(p.issuedAt))}</td></tr><tr><td colspan="2" style="padding:12px 13px"><div style="font-size:10px;font-weight:800;color:#7f8891;margin-bottom:6px">FOLIO FISCAL (UUID)</div><div style="font-size:11px;line-height:1.6;color:#5f6872;overflow-wrap:anywhere;word-break:normal">${esc(p.uuid).replace(/-/g,"-<wbr>")}</div></td></tr></table><div style="margin-top:16px;padding:12px 14px;border:1px solid #d9e2ef;background:#f4f8fd;border-radius:10px;font-size:12px;color:#40536a"><strong>Archivos adjuntos:</strong> PDF y XML de su CFDI.</div>`;
  return shell(c,b);
}
async function sendTest(c:any,to:string,b:any){const tx=transport(c);await tx.verify();return await tx.sendMail({from:{name:String(c.from_name||b.name||"Factura Rápida"),address:String(c.email)},to,replyTo:String(b.contact_email||c.email),subject:`Prueba de correo · ${b.name}`,html:testTemplate(b,String(c.email))})}
async function ensurePdfThroughApi(req:Request,invoiceId:string){const headers:any={"Content-Type":"application/json"};for(const h of["authorization","apikey","x-session-token"]){const v=req.headers.get(h);if(v)headers[h]=v}const r=await fetch(DOC_URL,{method:"POST",headers,body:JSON.stringify({action:"ensurePdf",invoiceId})});let d:any={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.detail||d.error||"No se pudo generar el PDF");return d}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any;try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,50);
  try{
    if(action==="health")return json({ok:true,service:"gmail-mail-api",version:8,provider:"gmail",emailTemplateVersion:6,logoInlineInBody:true,logoAttachment:false,invoiceAttachments:["pdf","xml"]});
    const c=await ctx(req);if(!c)return json({error:"Sesión inválida o vencida"},401);
    if(action==="status"){const s:any=await status(c.business.id);return json({ok:true,provider:"gmail",email:s.email||null,fromName:s.from_name||null,credentialsConfigured:s.credentials_configured===true,lastTestAt:s.last_test_at||null,lastTestOk:s.last_test_ok===true,lastTestMessage:s.last_test_message||null,ready:s.ready===true,isPlatformAdmin:c.isPlatformAdmin,autoSendInvoices:c.business.auto_send_cfdi_email!==false,templateVersion:6})}
    if(action==="configureGmail"){
      if(c.user.role!=="admin")return json({error:"Solo el administrador puede configurar el correo"},403);
      const email=clean(body?.email,254).toLowerCase(),appPassword=String(body?.appPassword??body?.app_password??""),fromName=clean(body?.fromName??body?.from_name,120)||c.business.name;
      if(!emailOk(email)||!appPassword)return json({error:"Correo o contraseña de aplicación inválidos"},400);
      const r=await db.rpc("set_business_gmail_config",{p_business_id:c.business.id,p_user_id:c.user.id,p_email:email,p_app_password:appPassword,p_from_name:fromName});if(r.error)return json({error:r.error.message},400);
      return json({ok:true,email,fromName,message:"Gmail guardado de forma segura. Falta enviar una prueba."});
    }
    if(action==="testGmail"){
      if(c.user.role!=="admin")return json({error:"Solo el administrador puede probar el correo"},403);
      const cr:any=await creds(c.business.id);if(!cr?.email||!cr?.app_password)return json({error:"Primero configura Gmail y su contraseña de aplicación"},409);
      const recipient=clean(body?.recipient,254).toLowerCase()||String(c.user.email||c.business.contact_email||cr.email).toLowerCase();if(!emailOk(recipient))return json({error:"Escribe un correo válido para recibir la prueba"},400);
      try{const info:any=await sendTest(cr,recipient,c.business);await mark(c.business.id,true,"Gmail conectado y correo de prueba enviado");if(c.isPlatformAdmin)await markPlatform(true,"Gmail de plataforma verificado mediante el negocio administrador");return json({ok:true,ready:true,message:"Gmail conectado. Correo de prueba enviado.",messageId:info?.messageId||null,templateVersion:6})}catch(e:any){const m=String(e?.message||e).slice(0,350);await mark(c.business.id,false,m);if(c.isPlatformAdmin)await markPlatform(false,m);return json({error:"Google no aceptó la conexión: "+m,ready:false},502)}
    }
    if(action==="sendInvoice"){
      const invoiceId=clean(body?.invoiceId??body?.invoice_id,80);if(!invoiceId)return json({error:"Falta invoiceId"},400);
      let inv=(await db.from("cfdi_invoices").select("id,business_id,client_id,series,folio,uuid,status,issued_at,total,xml_text,pdf_storage_path,receptor_snapshot").eq("id",invoiceId).eq("business_id",c.business.id).maybeSingle()).data;
      if(!inv)return json({error:"Factura no encontrada"},404);
      if(inv.status!=="timbered"||!inv.uuid||!inv.xml_text)return json({error:"La factura todavía no está timbrada completamente",code:"INVOICE_NOT_STAMPED"},409);
      if(!inv.pdf_storage_path){await ensurePdfThroughApi(req,invoiceId);inv=(await db.from("cfdi_invoices").select("id,business_id,client_id,series,folio,uuid,status,issued_at,total,xml_text,pdf_storage_path,receptor_snapshot").eq("id",invoiceId).eq("business_id",c.business.id).single()).data}
      if(!inv?.pdf_storage_path)return json({error:"El PDF de la factura todavía no está listo",code:"PDF_NOT_READY"},409);
      let recipient=clean(body?.recipient,254).toLowerCase();
      if(!recipient&&inv.client_id){const cl=(await db.from("clients").select("email").eq("id",inv.client_id).eq("business_id",c.business.id).maybeSingle()).data;recipient=clean(cl?.email,254).toLowerCase()}
      if(!recipient)recipient=clean((inv.receptor_snapshot as any)?.email,254).toLowerCase();
      if(!emailOk(recipient))return json({error:"El cliente no tiene un correo válido",code:"CLIENT_EMAIL_REQUIRED"},409);
      const cr:any=await creds(c.business.id);if(!cr?.ready||!cr?.email||!cr?.app_password)return json({error:"Primero configura y prueba el Gmail del negocio",code:"BUSINESS_EMAIL_NOT_READY"},409);
      const ar=await db.rpc("begin_invoice_email_attempt",{p_business_id:c.business.id,p_invoice_id:inv.id,p_recipient:recipient,p_user_id:c.user.id});if(ar.error)throw ar.error;const logId=String(ar.data);
      try{
        const pr=await db.storage.from(PDF_BUCKET).download(String(inv.pdf_storage_path));if(pr.error||!pr.data)throw pr.error||new Error("No se pudo leer el PDF privado");
        const pdf=Buffer.from(await pr.data.arrayBuffer());if(pdf.length>12*1024*1024)throw new Error("El PDF es demasiado grande para enviarlo");
        const xml=Buffer.from(String(inv.xml_text),"utf8"),receiver=String((inv.receptor_snapshot as any)?.name||"Cliente"),folio=`${inv.series||"A"}-${inv.folio}`,tx=transport(cr);
        const info:any=await tx.sendMail({from:{name:String(cr.from_name||c.business.name),address:String(cr.email)},to:recipient,replyTo:String(c.business.contact_email||cr.email),subject:`Factura ${folio} · ${c.business.name}`,html:invoiceTemplate({receiver,folio,uuid:String(inv.uuid),total:inv.total,issuedAt:inv.issued_at},c.business),attachments:[{filename:`CFDI-${folio}.xml`,content:xml,contentType:"application/xml"},{filename:`CFDI-${folio}.pdf`,content:pdf,contentType:"application/pdf"}]});
        await db.rpc("finish_invoice_email_attempt",{p_business_id:c.business.id,p_log_id:logId,p_ok:true,p_message_id:String(info?.messageId||""),p_error:null});
        return json({ok:true,sent:true,recipient,messageId:info?.messageId||null,message:`Factura ${folio} enviada por correo.`,pdfReady:true,templateVersion:6,logoAttachment:false});
      }catch(e:any){const m=String(e?.message||e).slice(0,600);await db.rpc("finish_invoice_email_attempt",{p_business_id:c.business.id,p_log_id:logId,p_ok:false,p_message_id:null,p_error:m});return json({error:"La factura sigue válida, pero el correo no pudo enviarse: "+m,code:"EMAIL_SEND_FAILED",invoiceUnaffected:true},502)}
    }
    return json({error:"Acción desconocida"},400);
  }catch(e:any){console.error(e);return json({error:"Error del servidor",detail:String(e?.message||e).slice(0,350)},500)}
});