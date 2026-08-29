import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const path = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(path, 'utf8');
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const coreScript=inlineScripts.find(s=>s.includes('const API_URL=')&&s.includes("$('loginForm').onsubmit"));
assert.ok(coreScript,'No se encontró script principal');
const cleanMatch=html.match(/<script data-fr-login-clean="1">([\s\S]*?)<\/script>/);
assert.ok(cleanMatch,'No se encontró login-clean');
const lsMatch=coreScript.match(/const\s+LS\s*=\s*['"]([^'"]+)['"]/);
assert.ok(lsMatch,'No se pudo detectar la clave de sesión de localStorage');
const LS=lsMatch[1];
let base=html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'');
base=base.replace('</body>',`<script>${coreScript}</script><script>${cleanMatch[1]}</script></body>`);

function response(data,status=200){return{ok:status>=200&&status<300,status,async json(){return data},async text(){return JSON.stringify(data)},async blob(){return new Blob([JSON.stringify(data)],{type:'application/json'})}}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const session=(token,user='Admin Persistido')=>({token,expiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'u1',name:user,role:'admin'},business:{id:'b1',name:'Negocio Persistido',code:'AZTLAN'}});
const data=(name='Admin Persistido')=>({clients:[],products:[],drafts:[],invoices:[],users:[],stats:{products_sat_ready:0,products_total:0,clients_fiscal_ready:0,clients_total:0,emitter_ready:true},business:{id:'b1',name:'Negocio Persistido',code:'AZTLAN'},user:{id:'u1',name,role:'admin'}});

async function makeDom({seed,meMode='ok',meDelay=0,loginDelay=20,loadDelay=5}={}){
  const calls={me:0,login:0,loadData:0};
  const errors=[];const vc=new VirtualConsole();
  vc.on('jsdomError',e=>errors.push(e));vc.on('error',e=>errors.push(e));
  const dom=new JSDOM(base,{url:'https://factura-rapida.local/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(window){
    if(seed)window.localStorage.setItem(LS,JSON.stringify(seed));
    window.confirm=()=>false;window.alert=()=>{};window.scrollTo=()=>{};
    window.fetch=async(url,options={})=>{let payload={};try{payload=JSON.parse(options.body||'{}')}catch{}const action=payload.action,u=String(url);
      if(u.includes('/factura-api')){
        if(action==='me'){calls.me++;if(meDelay)await wait(meDelay);if(meMode==='fail')return response({error:'Sesión expirada'},401);return response({user:{id:'u1',name:'Admin Persistido',role:'admin'},business:{id:'b1',name:'Negocio Persistido',code:'AZTLAN'}})}
        if(action==='login'){calls.login++;if(loginDelay)await wait(loginDelay);return response(session('fresh-token','Admin Nuevo'))}
        if(action==='loadData'){calls.loadData++;if(loadDelay)await wait(loadDelay);return response(data())}
        return response({ok:true});
      }
      if(u.includes('/cfdi-api'))return response({pacConnected:true,csdConfigured:true,provider:'finkok',environment:'production',productionAuthorized:true});
      if(u.includes('/cfdi-config-api'))return response({});
      return response({ready:false,invoices:[],autoSend:true,business:{id:'b1',name:'Negocio Persistido'},user:{role:'admin'}});
    };
  }});
  return {dom,calls,errors};
}
function fatal(errors){return errors.filter(e=>!String(e?.message||e).includes('Not implemented'))}
function fillAndSubmit(window){const d=window.document;d.getElementById('businessCode').value='AZTLAN';d.getElementById('loginUser').value='admin';d.getElementById('loginPin').value='1234';d.getElementById('loginForm').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}))}

// 1) Sesión persistida válida debe restaurar sin pedir login.
{
  const {dom,calls,errors}=await makeDom({seed:session('persisted-valid')});
  await wait(600);const {window}=dom,d=window.document;
  assert.equal(fatal(errors).length,0,'Errores al restaurar sesión válida: '+fatal(errors).map(e=>e?.message||e).join(' | '));
  assert.ok(calls.me>=1,'Debe consultar me para restaurar sesión');
  assert.equal(calls.login,0,'No debe hacer login nuevo durante restauración válida');
  assert.ok(d.getElementById('authLayer').classList.contains('hidden'),'Sesión válida debe ocultar login');
  assert.match(d.getElementById('currentUser')?.textContent||'',/Admin Persistido/,'Debe renderizar usuario persistido');
  const stored=JSON.parse(window.localStorage.getItem(LS)||'null');assert.equal(stored?.token,'persisted-valid','Debe conservar token válido');
  d.querySelector('button[data-tab="clientes"]')?.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await wait(20);
  assert.ok(!d.getElementById('tab-clientes')?.classList.contains('hidden'),'Navegación debe funcionar tras restauración');dom.window.close();
}

// 2) Sesión expirada debe limpiarse y permitir login nuevo.
{
  const {dom,calls,errors}=await makeDom({seed:session('persisted-expired'),meMode:'fail',meDelay:20});
  await wait(300);const {window}=dom,d=window.document;
  assert.equal(fatal(errors).length,0,'Errores al expirar sesión: '+fatal(errors).map(e=>e?.message||e).join(' | '));
  assert.ok(!d.getElementById('authLayer').classList.contains('hidden'),'Sesión inválida debe dejar login visible');
  assert.equal(window.localStorage.getItem(LS),null,'Sesión inválida debe limpiarse');
  fillAndSubmit(window);await wait(500);
  assert.equal(calls.login,1,'Debe permitir un login nuevo después de limpiar sesión expirada');
  assert.ok(d.getElementById('authLayer').classList.contains('hidden'),'Login nuevo debe entrar');
  const stored=JSON.parse(window.localStorage.getItem(LS)||'null');assert.equal(stored?.token,'fresh-token','Debe guardar la sesión nueva');dom.window.close();
}

// 3) Carrera realista WebView2: restore viejo lento + login nuevo rápido.
// El restore viejo NO puede borrar ni sobrescribir una sesión recién autenticada.
{
  const {dom,calls,errors}=await makeDom({seed:session('stale-token'),meMode:'fail',meDelay:260,loginDelay:25,loadDelay:15});
  await wait(30);const {window}=dom,d=window.document;
  assert.ok(!d.getElementById('authLayer').classList.contains('hidden'),'El login debe seguir accesible mientras restore está pendiente');
  fillAndSubmit(window);
  await wait(800);
  assert.equal(fatal(errors).length,0,'Errores en carrera restore/login: '+fatal(errors).map(e=>e?.message||e).join(' | '));
  assert.equal(calls.login,1,'Debe existir un solo login nuevo');
  const stored=JSON.parse(window.localStorage.getItem(LS)||'null');
  assert.equal(stored?.token,'fresh-token','BUG DE CARRERA: el restore viejo borró/sobrescribió la sesión nueva');
  assert.ok(d.getElementById('authLayer').classList.contains('hidden'),'La sesión nueva debe permanecer autenticada tras terminar el restore viejo');
  assert.match(d.getElementById('currentUser')?.textContent||'',/Admin Nuevo|Admin Persistido/,'Debe quedar una sesión renderizada');
  dom.window.close();
}

console.log('SESSION RESTORE V15 OK: sesión válida, expirada y carrera restore/login protegidas.');
