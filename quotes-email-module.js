(function(){
'use strict';
const QUOTE_EMAIL_API='https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/quote-delivery-api';
const QUOTE_LIST_API='https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/quote-api';
let mailQuotes=new Map(),loadingMailState=false,decorateTimer=null;
const byId=id=>document.getElementById(id);
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizeEmail=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,'').trim();
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(v));
const fmtDate=v=>{try{return new Date(v).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}catch{return''}};
function headers(){const h={'Authorization':'Bearer '+ANON_KEY,'apikey':ANON_KEY,'Content-Type':'application/json'};if(session?.token)h['x-session-token']=session.token;return h}
async function post(url,action,payload={}){const r=await fetch(url,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload})});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||d.detail||'No se pudo enviar la cotización');e.data=d;e.status=r.status;throw e}return d}
function quoteMailMeta(q){if(q?.last_email_sent_at){const n=Number(q.email_send_count||0);return `<span class="badge good">Correo enviado</span> · ${html(q.last_email_to||q.customer_email||'')} · ${html(fmtDate(q.last_email_sent_at))}${n?` · ${n} envío${n===1?'':'s'}`:''}`}if(q?.last_email_error)return `<span class="badge bad">Error de correo</span> · ${html(String(q.last_email_error).slice(0,180))}`;if(q?.customer_email)return `Correo: ${html(q.customer_email)}`;return '<span class="badge warn">Sin correo</span>'}
function decorate(){const list=byId('quoteList');if(!list)return;list.querySelectorAll('[data-qact="print"][data-id]').forEach(printBtn=>{const id=printBtn.dataset.id,row=printBtn.closest('.quote-row'),actions=printBtn.closest('.quote-actions');if(!id||!row||!actions)return;const q=mailQuotes.get(id);let btn=actions.querySelector(`[data-quote-email="${id}"]`);if(!btn){btn=document.createElement('button');btn.type='button';btn.className='primary compact';btn.dataset.quoteEmail=id;printBtn.insertAdjacentElement('afterend',btn);btn.onclick=()=>sendQuoteEmail(id)}const label=q?.last_email_sent_at?'Reenviar correo':'Enviar correo';if(btn.textContent!==label)btn.textContent=label;let meta=row.querySelector('.quote-email-meta');if(!meta){meta=document.createElement('div');meta.className='meta quote-email-meta';const left=row.firstElementChild;left?.appendChild(meta)}if(meta){const markup=quoteMailMeta(q);if(meta.dataset.mailMarkup!==markup){meta.innerHTML=markup;meta.dataset.mailMarkup=markup}}})}
async function loadMailState(){if(loadingMailState||!session?.token)return;loadingMailState=true;try{const r=await post(QUOTE_LIST_API,'listQuotes');mailQuotes=new Map((r.quotes||[]).map(q=>[q.id,q]));decorate()}catch(e){console.warn('quote email state',e)}finally{loadingMailState=false}}
async function sendQuoteEmail(id){
  const q=mailQuotes.get(id);
  let recipient=normalizeEmail(q?.customer_email||'');
  if(recipient){
    if(!emailOk(recipient))return notice('Corrige el correo del cliente en la cotización antes de enviarla.',true);
  }else{
    const formEmail=normalizeEmail(byId('quoteCustomerEmail')?.value||'');
    if(formEmail&&emailOk(formEmail))recipient=formEmail;
    else{
      recipient=normalizeEmail((await window.SOLRAKUXV0192?.prompt?.({title:'Enviar cotización',message:'La cotización no tiene un correo guardado.',label:'Correo del cliente',type:'email',placeholder:'cliente@correo.com',required:true,confirmText:'Usar correo · Enter'}))||'');
      if(!recipient)return;
      if(!emailOk(recipient))return notice('Escribe un correo válido para enviar la cotización.',true);
    }
  }
  busy(true);
  try{
    const r=await post(QUOTE_EMAIL_API,'sendQuote',{quoteId:id,recipient});
    await loadMailState();
    notice(r.message||`Cotización enviada a ${recipient}.`);
  }catch(e){
    if(e.data?.code==='CLIENT_EMAIL_REQUIRED'){
      return notice('La cotización no tiene un correo válido. Edítala y corrige el correo del cliente.',true);
    }
    notice(e.data?.code==='BUSINESS_EMAIL_NOT_READY'?'Primero configura y prueba el Gmail del negocio en la sección de correo.':e.message,true);
    await loadMailState();
  }finally{busy(false)}
}
function scheduleDecorate(){clearTimeout(decorateTimer);decorateTimer=setTimeout(decorate,40)}
function boot(){const wait=()=>{const list=byId('quoteList'),tab=byId('quotesTabBtn');if(!list||!tab){setTimeout(wait,120);return}new MutationObserver(scheduleDecorate).observe(list,{childList:true,subtree:true});tab.addEventListener('click',()=>setTimeout(loadMailState,180));byId('refreshQuotesBtn')?.addEventListener('click',()=>setTimeout(loadMailState,180));if(session?.token)loadMailState();decorate()};wait()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
(function(){
  if(document.querySelector('script[data-fr-pos-loader]'))return;
  const s=document.createElement('script');
  s.src='pos-module.js?v=1';
  s.dataset.frPosLoader='1';
  s.async=false;
  document.body.appendChild(s);
})();
