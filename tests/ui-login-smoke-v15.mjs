import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const path = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(path, 'utf8');

for (const marker of [
  'data-fr-login-clean="1"',
  "window.__frLoginUiVersion='15-clean2'",
  'if(window.__frLoginPending)return',
  'loading&&!authVisible',
  'body.loading{pointer-events:auto!important}',
  "issueApi('timber',{draftId:d.id})",
  'data-fr-facturar-real="8"',
  'data-fr-usage-ui="1"',
  'data-fr-business-mail-ui="1"'
]) assert.ok(html.includes(marker), `Falta marcador requerido: ${marker}`);

assert.ok(!html.includes("document.body.classList.toggle('loading',v)"), 'Persistió toggle global de loading');
assert.ok(!html.includes('if(loading)return;busy(true)'), 'El login sigue dependiendo de loading global');
assert.ok(!html.includes('window.frStampDraftDirect=frStampDraftDirect'), 'Persistió ruta fiscal legacy directa');
assert.ok(!html.includes('function addRealStampButtons()'), 'Persistió controlador fiscal legacy de botones');
assert.ok(!html.includes("cfdiApi('timber',{draftId:d.id})"), 'Persistió timbrado directo fuera de cfdi-issue-api');

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const coreScript = inlineScripts.find(s => s.includes('const API_URL=') && s.includes("$('loginForm').onsubmit"));
assert.ok(coreScript, 'No se encontró script principal completo de la aplicación');
const cleanMatch = html.match(/<script data-fr-login-clean="1">([\s\S]*?)<\/script>/);
assert.ok(cleanMatch, 'No se encontró script login-clean');
let base = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
base = base.replace('</body>', `<script>${coreScript}</script><script>${cleanMatch[1]}</script></body>`);

let loginCalls = 0;
const virtualConsole = new VirtualConsole();
const jsErrors = [];
const errText = e => [e?.message, e?.cause?.stack, e?.detail?.stack, e?.stack].filter(Boolean).join('\n');
virtualConsole.on('jsdomError', e => jsErrors.push(e));
virtualConsole.on('error', e => jsErrors.push(e));
function response(data,status=200){return{ok:status>=200&&status<300,status,async json(){return data},async text(){return JSON.stringify(data)},async blob(){return new Blob([JSON.stringify(data)],{type:'application/json'})}}}

const dom = new JSDOM(base,{url:'https://factura-rapida.local/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,beforeParse(window){
  window.confirm=()=>false;window.alert=()=>{};window.scrollTo=()=>{};
  window.fetch=async(url,options={})=>{let payload={};try{payload=JSON.parse(options.body||'{}')}catch{}const action=payload.action,u=String(url);
    if(u.includes('/factura-api')){
      if(action==='login'){loginCalls++;await new Promise(r=>setTimeout(r,80));return response({token:'test-session-token',expiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'u1',name:'Admin Prueba',role:'admin'},business:{id:'b1',name:'Negocio Prueba',code:'AZTLAN'}})}
      if(action==='loadData')return response({clients:[],products:[],drafts:[],invoices:[],users:[],stats:{products_sat_ready:0,products_total:0,clients_fiscal_ready:0,clients_total:0,emitter_ready:true},business:{id:'b1',name:'Negocio Prueba',code:'AZTLAN'}});
      if(action==='me')return response({user:{id:'u1',name:'Admin Prueba',role:'admin'},business:{id:'b1',name:'Negocio Prueba',code:'AZTLAN'}});return response({ok:true});}
    if(u.includes('/cfdi-api'))return response({pacConnected:true,csdConfigured:true,provider:'finkok',environment:'production'});
    if(u.includes('/cfdi-config-api'))return response({});return response({ready:false,invoices:[],autoSend:true,business:{id:'b1',name:'Negocio Prueba'},user:{role:'admin'}});
  };
}});

const {window}=dom,doc=window.document;await new Promise(r=>setTimeout(r,120));
const fatalAtBoot=jsErrors.filter(e=>!String(e?.message||e).includes('Not implemented'));assert.equal(fatalAtBoot.length,0,`Errores al iniciar:\n${fatalAtBoot.map(errText).join('\n---\n')}`);
const auth=doc.getElementById('authLayer'),shell=doc.querySelector('main.shell'),form=doc.getElementById('loginForm');
assert.ok(auth&&!auth.classList.contains('hidden'),'El login debe iniciar visible');assert.equal(typeof form?.onsubmit,'function','Handler de login requerido');

// Reproduce exactamente body.loading y NO usa focus/pageshow para desbloquear antes de escribir.
doc.body.classList.add('loading');
const business=doc.getElementById('businessCode'),user=doc.getElementById('loginUser'),pin=doc.getElementById('loginPin');
assert.ok(business&&user&&pin,'Faltan campos de login');
business.value='AZTLAN';business.dispatchEvent(new window.Event('input',{bubbles:true}));
user.value='admin';user.dispatchEvent(new window.Event('input',{bubbles:true}));
pin.value='1234';pin.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(business.value,'AZTLAN');assert.equal(user.value,'admin');assert.equal(pin.value,'1234');
assert.notEqual(window.getComputedStyle(auth).pointerEvents,'none','Auth debe ser interactiva bajo body.loading');
assert.ok(!shell?.classList.contains('frWorking'),'Shell no debe bloquear auth antes del submit');

form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,5));
assert.equal(loginCalls,1,'Primer submit debe iniciar una solicitud');assert.equal(window.__frLoginPending,true,'Guardia debe activarse');
assert.ok(!shell?.classList.contains('frWorking'),'busy no debe bloquear shell mientras auth sea visible');
form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,500));
assert.equal(loginCalls,1,'Doble submit debe producir una sola solicitud');assert.ok(auth.classList.contains('hidden'),'Login exitoso debe ocultar auth');
assert.ok(!shell?.classList.contains('frWorking'),'Interfaz desbloqueada tras login');assert.ok(!doc.body.classList.contains('loading'),'body no queda loading');
assert.match(doc.getElementById('currentUser')?.textContent||'',/Admin Prueba/,'Sesión simulada debe renderizar usuario');
const clientesBtn=doc.querySelector('button[data-tab="clientes"]');clientesBtn?.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,20));
assert.ok(!doc.getElementById('tab-clientes')?.classList.contains('hidden'),'Navegación debe responder después del login');
const fatal=jsErrors.filter(e=>!String(e?.message||e).includes('Not implemented'));assert.equal(fatal.length,0,`Errores JS:\n${fatal.map(errText).join('\n---\n')}`);
console.log('SMOKE V15 OK: body.loading reproducido sin focus, campos escribibles, auth interactiva, doble-submit protegido, sesión y navegación OK.');dom.window.close();
