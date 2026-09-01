import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const id='11111111-1111-4111-8111-111111111111';
const dom=new JSDOM(`<!doctype html><html><body>
<button id="quotesTabBtn"></button><button id="refreshQuotesBtn"></button>
<div id="quoteList"><div class="quote-row"><div><div class="meta">Base</div></div><div><div class="quote-actions"><button data-qact="print" data-id="${id}">PDF / Imprimir</button></div></div></div></div>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
let sent=false,sendCalls=0,lastNotice='';
window.eval(`var ANON_KEY='anon'; var session={token:'session'}; function busy(){}; function notice(m){window.__notice=String(m)}`);
window.fetch=async(url,opts)=>{
  const body=JSON.parse(String(opts?.body||'{}'));
  if(String(url).includes('/quote-api')&&body.action==='listQuotes'){
    return {ok:true,status:200,json:async()=>({ok:true,quotes:[{id:'${id}',customer_email:'cliente@example.com',last_email_sent_at:sent?'2026-09-01T06:00:00Z':null,last_email_to:sent?'cliente@example.com':null,email_send_count:sent?1:0,last_email_error:null}]})};
  }
  if(String(url).includes('/quote-delivery-api')&&body.action==='sendQuote'){
    if(body.quoteId!=='${id}'||body.recipient!=='cliente@example.com')throw new Error('Payload de envío incorrecto');
    sendCalls++;sent=true;
    return {ok:true,status:200,json:async()=>({ok:true,sent:true,message:'Cotización enviada.'})};
  }
  throw new Error('Llamada inesperada: '+url);
};
const source=await fs.readFile('quotes-email-module.js','utf8');
window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,260));
let button=window.document.querySelector('[data-quote-email]');
if(!button)throw new Error('No se agregó el botón Enviar correo');
if(button.textContent!=='Enviar correo')throw new Error('Etiqueta inicial incorrecta: '+button.textContent);
const meta=window.document.querySelector('.quote-email-meta');
if(!meta||!meta.textContent.includes('cliente@example.com'))throw new Error('No se mostró el correo del cliente');
button.click();
await new Promise(r=>setTimeout(r,120));
button=window.document.querySelector('[data-quote-email]');
if(sendCalls!==1)throw new Error('El envío no se ejecutó exactamente una vez');
if(button.textContent!=='Reenviar correo')throw new Error('No cambió a Reenviar correo');
lastNotice=String(window.__notice||'');
if(!lastNotice.includes('Cotización enviada'))throw new Error('No se notificó el envío exitoso');
console.log('QUOTE_EMAIL_UI_SMOKE_OK');
