import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || new URL("../index.html", import.meta.url).pathname);
const apiUrl = process.env.FR_SIGNUP_API_URL || "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/tenant-public-signup";

if (!/^https:\/\/[^/]+\/functions\/v1\/tenant-public-signup(?:$|\?)/.test(apiUrl)) {
  throw new Error("FR_SIGNUP_API_URL no apunta al servicio de registro esperado.");
}

let html = await readFile(input, "utf8");
for (const marker of ['id="authLayer"', 'id="loginForm"', 'id="businessCode"', 'id="loginUser"', 'id="loginPin"']) {
  if (!html.includes(marker)) throw new Error(`La interfaz base no contiene ${marker}.`);
}
if (html.includes('data-fr-public-signup="1"')) throw new Error("La interfaz ya contiene el registro público.");
if (!html.includes("</head>") || !html.includes("</body>")) throw new Error("La interfaz base está incompleta.");

const css = String.raw`
<style data-fr-public-signup="1">
.frSignupOpen{width:100%;margin-top:10px}
.frSignupHelp{margin:10px 0 0;text-align:center;color:var(--muted);font-size:12px;line-height:1.4}
.frSignupModal{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:18px;background:rgba(12,16,20,.72);backdrop-filter:blur(5px)}
.frSignupModal.hidden{display:none!important}
.frSignupCard{position:relative;width:min(560px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;background:#fff;border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 28px 90px rgba(0,0,0,.3)}
.frSignupClose{position:absolute;right:14px;top:14px;width:34px;height:34px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:20px;line-height:1}
.frSignupStep{display:none}.frSignupStep.on{display:block}
.frSignupStep h2{font-size:27px;margin:5px 42px 7px 0;letter-spacing:-.025em}
.frSignupStep .field{margin-top:10px}
.frSignupActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.frSignupActions button{flex:1;min-width:145px}
.frSignupMsg{display:none;margin-top:13px;padding:11px 12px;border-radius:11px;background:#f3f7ff;color:#2f4f77;font-size:13px;line-height:1.4}
.frSignupMsg.show{display:block}.frSignupMsg.bad{background:#fff0f0;color:#9a2d2d}.frSignupMsg.ok{background:#eef9f2;color:#176a3a}
.frSignupSummary{margin:14px 0;padding:14px;border:1px solid #f0d8c4;border-radius:14px;background:#fff8f1}
.frSignupCode{font-size:25px;font-weight:900;letter-spacing:.12em;overflow-wrap:anywhere}
.frSignupPinNote{font-size:11px;color:var(--muted);margin:6px 0 0}
@media(max-width:600px){.frSignupCard{padding:20px 16px;border-radius:17px}.frSignupStep h2{font-size:23px}.frSignupActions{display:grid}.frSignupActions button{width:100%}}
</style>`;

const script = String.raw`
<script data-fr-public-signup="1">
(function(){
 var API=${JSON.stringify(apiUrl)};
 var state={token:'',email:'',businessCode:'',username:''};
 function q(id){return document.getElementById(id)}
 function setMessage(text,kind){var box=q('frSignupMsg');if(!box)return;box.textContent=text||'';box.className='frSignupMsg'+(text?' show':'')+(kind?' '+kind:'')}
 function step(number){document.querySelectorAll('.frSignupStep').forEach(function(el){el.classList.toggle('on',el.dataset.step===String(number))});setMessage('')}
 function pending(button,on,label){if(!button)return;button.disabled=on;if(on){button.dataset.oldText=button.textContent;button.textContent=label||'Procesando…'}else if(button.dataset.oldText){button.textContent=button.dataset.oldText;delete button.dataset.oldText}}
 async function call(body){
  var controller=new AbortController();var timer=setTimeout(function(){controller.abort()},25000);
  try{
   var response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
   var data={};try{data=await response.json()}catch(e){}
   if(!response.ok)throw new Error(data.error||'No se pudo continuar.');
   return data;
  }catch(error){if(error&&error.name==='AbortError')throw new Error('La conexión tardó demasiado. Intenta nuevamente.');throw error}
  finally{clearTimeout(timer)}
 }
 function open(){q('frSignupModal').classList.remove('hidden');step(1);setTimeout(function(){q('frBusinessName')?.focus()},30)}
 function close(){q('frSignupModal').classList.add('hidden');setMessage('')}
 function mount(){
  var form=q('loginForm');if(!form||q('frSignupOpen'))return;
  var openButton=document.createElement('button');openButton.id='frSignupOpen';openButton.type='button';openButton.className='secondary frSignupOpen';openButton.textContent='Crear cuenta para mi negocio';openButton.onclick=open;form.insertAdjacentElement('afterend',openButton);
  var help=document.createElement('p');help.className='frSignupHelp';help.textContent='Cada negocio conserva sus propios clientes, productos y facturas.';openButton.insertAdjacentElement('afterend',help);
  var modal=document.createElement('div');modal.id='frSignupModal';modal.className='frSignupModal hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','frSignupTitle');
  modal.innerHTML='<div class="frSignupCard"><button id="frSignupClose" class="frSignupClose" type="button" aria-label="Cerrar">×</button>'+
   '<section class="frSignupStep on" data-step="1"><p class="eyebrow">REGISTRO · PASO 1 DE 3</p><h2 id="frSignupTitle">Crea la cuenta de tu negocio</h2><p class="muted small">Te enviaremos un código para verificar tu correo.</p><input id="frBusinessName" class="field" maxlength="120" autocomplete="organization" placeholder="Nombre del negocio"><input id="frSignupEmail" class="field" type="email" maxlength="254" autocomplete="email" placeholder="correo@ejemplo.com"><div class="frSignupActions"><button id="frSignupStart" class="primary" type="button">Enviar código</button></div></section>'+
   '<section class="frSignupStep" data-step="2"><p class="eyebrow">REGISTRO · PASO 2 DE 3</p><h2>Verifica tu correo</h2><p id="frSignupEmailHint" class="muted small"></p><input id="frSignupCode" class="field" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Código de 6 dígitos"><div class="frSignupActions"><button id="frSignupBack" class="secondary" type="button">Volver</button><button id="frSignupVerify" class="primary" type="button">Verificar</button></div></section>'+
   '<section class="frSignupStep" data-step="3"><p class="eyebrow">REGISTRO · PASO 3 DE 3</p><h2>Crea tu administrador</h2><p class="muted small">Este usuario podrá configurar el negocio y crear empleados.</p><input id="frAdminName" class="field" maxlength="120" autocomplete="name" placeholder="Nombre del administrador"><input id="frAdminUsername" class="field" maxlength="50" autocomplete="username" placeholder="Usuario, por ejemplo admin"><input id="frAdminPin" class="field" type="password" inputmode="numeric" minlength="6" maxlength="8" autocomplete="new-password" placeholder="PIN de 6 a 8 dígitos"><input id="frAdminPinConfirm" class="field" type="password" inputmode="numeric" minlength="6" maxlength="8" autocomplete="new-password" placeholder="Confirma el PIN"><p class="frSignupPinNote">Guarda este PIN: lo necesitarás para entrar.</p><div class="frSignupActions"><button id="frSignupComplete" class="primary" type="button">Crear negocio</button></div></section>'+
   '<section class="frSignupStep" data-step="4"><p class="eyebrow">CUENTA CREADA</p><h2>Tu negocio está listo</h2><div class="frSignupSummary"><div class="muted small">Código del negocio</div><div id="frSignupDoneCode" class="frSignupCode"></div><div class="muted small" style="margin-top:12px">Usuario</div><strong id="frSignupDoneUser"></strong></div><p class="muted small">Ya colocamos estos datos en la pantalla de acceso. Escribe tu PIN para entrar.</p><div class="frSignupActions"><button id="frSignupGoLogin" class="primary" type="button">Ir al acceso</button></div></section>'+
   '<div id="frSignupMsg" class="frSignupMsg" role="status" aria-live="polite"></div></div>';
  document.body.appendChild(modal);
  q('frSignupClose').onclick=close;
  modal.addEventListener('click',function(event){if(event.target===modal)close()});
  q('frSignupBack').onclick=function(){step(1)};
  q('frSignupStart').onclick=async function(){
   var button=this;var businessName=q('frBusinessName').value.trim();var email=q('frSignupEmail').value.trim().toLowerCase();
   if(businessName.length<3||!email.includes('@'))return setMessage('Escribe el nombre del negocio y un correo válido.','bad');
   pending(button,true,'Enviando…');setMessage('');
   try{var data=await call({action:'start',businessName:businessName,email:email});state.token=data.token;state.email=email;state.businessCode=data.businessCode;q('frSignupEmailHint').textContent='Enviamos un código a '+(data.emailMasked||email)+'.';step(2);q('frSignupCode').focus()}
   catch(error){setMessage(error.message,'bad')}finally{pending(button,false)}
  };
  q('frSignupVerify').onclick=async function(){
   var button=this;var code=q('frSignupCode').value.trim();if(!/^\d{6}$/.test(code))return setMessage('Escribe el código de 6 dígitos.','bad');
   pending(button,true,'Verificando…');setMessage('');
   try{await call({action:'verify',token:state.token,email:state.email,code:code});step(3);q('frAdminName').focus()}
   catch(error){setMessage(error.message,'bad')}finally{pending(button,false)}
  };
  q('frSignupComplete').onclick=async function(){
   var button=this;var adminName=q('frAdminName').value.trim();var username=q('frAdminUsername').value.trim().toLowerCase();var pin=q('frAdminPin').value.trim();var confirmPin=q('frAdminPinConfirm').value.trim();
   if(adminName.length<2||!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username))return setMessage('Revisa el nombre y el usuario.','bad');
   if(!/^\d{6,8}$/.test(pin))return setMessage('El PIN debe tener de 6 a 8 dígitos.','bad');
   if(pin!==confirmPin)return setMessage('Los dos PIN no coinciden.','bad');
   pending(button,true,'Creando…');setMessage('');
   try{var data=await call({action:'complete',token:state.token,email:state.email,adminName:adminName,username:username,pin:pin});state.businessCode=data.business.code;state.username=data.user.username;q('frSignupDoneCode').textContent=state.businessCode;q('frSignupDoneUser').textContent=state.username;q('businessCode').value=state.businessCode;q('loginUser').value=state.username;q('loginPin').value='';state.token='';step(4)}
   catch(error){setMessage(error.message,'bad')}finally{pending(button,false)}
  };
  q('frSignupGoLogin').onclick=function(){close();q('loginPin').focus()};
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!modal.classList.contains('hidden'))close()});
  document.documentElement.dataset.frPublicSignup='1';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
</script>`;

html = html.replace("</head>", `${css}\n</head>`).replace("</body>", `${script}\n</body>`);
await writeFile(input, html, "utf8");
console.log(`REGISTRATION_UI_INJECTED ${input}`);
