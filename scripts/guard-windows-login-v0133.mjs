import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');

const css = `<style id="frWindowsLoginHitCss" data-fr-windows-login-hit="2">
#authLayer{position:fixed!important;inset:0!important;z-index:2147483000!important;pointer-events:auto!important;isolation:isolate!important}
html.fr-native-desktop #authLayer{top:34px!important}
#authLayer.hidden{display:none!important}
#authLayer::before,#authLayer::after{pointer-events:none!important}
#authLayer #businessCode,#authLayer #loginUser,#authLayer #loginPin,#authLayer #loginBtn,#authLayer #loginForm{position:relative!important;z-index:2147483001!important;pointer-events:auto!important}
body.loading #authLayer{pointer-events:auto!important}
[data-fr-login-blocked="1"]{pointer-events:none!important}
</style>`;

const js = `<script id="frWindowsLoginHitJs" data-fr-windows-login-hit="2">
(function(){
  const IDS=['businessCode','loginUser','loginPin','loginBtn'];
  let reported=false,retryTimer=null;
  const nativeStep=(step,detail={})=>{
    const send=()=>{
      const invoke=window.__TAURI__?.core?.invoke;
      if(typeof invoke!=='function')return false;
      Promise.resolve(invoke('webview_milestone',{step,detail:JSON.stringify(detail)})).catch(()=>{});
      return true;
    };
    if(!send())setTimeout(send,60);
  };
  nativeStep('HEAD_SCRIPT_STARTED',{readyState:document.readyState,href:location.href});
  const auth=()=>document.getElementById('authLayer');
  const visible=el=>!!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  const neutralized=new Set();
  function clearNeutralized(){for(const el of neutralized){try{el.removeAttribute('data-fr-login-blocked')}catch{}}neutralized.clear()}
  function isSafeTop(top,target){return !!top&&(top===target||target.contains(top));}
  function neutralizeAt(target,a){
    const r=target.getBoundingClientRect();
    if(!(r.width>2&&r.height>2))return {ok:false,id:target.id,reason:'zero-rect',rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};
    const x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2));
    const y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));
    for(let pass=0;pass<8;pass++){
      const top=document.elementFromPoint(x,y);
      if(isSafeTop(top,target)) return {ok:true,id:target.id,top:top?.id||top?.tagName||''};
      const stack=document.elementsFromPoint?document.elementsFromPoint(x,y):[top].filter(Boolean);
      let changed=false;
      for(const el of stack){
        if(!el||el===target||target.contains(el)||el.contains(target)||el===a||el.id==='frNativeBar')continue;
        if(el.closest?.('#authLayer')&&['INPUT','BUTTON','LABEL','FORM'].includes(el.tagName))continue;
        try{el.setAttribute('data-fr-login-blocked','1');neutralized.add(el);changed=true;}catch{}
        if(changed)break;
      }
      if(!changed)return {ok:false,id:target.id,reason:'blocked',top:top?.id||top?.tagName||''};
    }
    const top=document.elementFromPoint(x,y);
    return {ok:isSafeTop(top,target),id:target.id,reason:'max-passes',top:top?.id||top?.tagName||''};
  }
  function reportNative(report){
    if(reported||!report.ok)return;
    const invoke=window.__TAURI__?.core?.invoke;
    if(typeof invoke!=='function'){setTimeout(()=>reportNative(report),100);return;}
    reported=true;
    Promise.resolve(invoke('login_ui_ready',{report:JSON.stringify(report)})).catch(error=>{
      reported=false;
      console.error('[FR-LOGIN-HIT] native handshake failed',error);
      setTimeout(run,150);
    });
  }
  function run(){
    const a=auth();
    if(!visible(a)){clearNeutralized();return;}
    a.style.setProperty('pointer-events','auto','important');
    a.style.setProperty('z-index','2147483000','important');
    const form=document.getElementById('loginForm');
    if(form){form.style.setProperty('pointer-events','auto','important');form.style.setProperty('z-index','2147483001','important')}
    const results=[];
    for(const id of IDS){
      const el=document.getElementById(id);
      if(!el){results.push({ok:false,id,reason:'missing'});continue;}
      if('disabled' in el)el.disabled=false;
      if('readOnly' in el&&id!=='loginBtn')el.readOnly=false;
      el.style.setProperty('pointer-events','auto','important');
      el.style.setProperty('z-index','2147483001','important');
      results.push(neutralizeAt(el,a));
    }
    const report={ok:results.every(x=>x.ok),readyState:document.readyState,results};
    window.__FR_LOGIN_HITTEST__=report;
    window.__frTrace?.('LOGIN_HITTEST',report);
    console.log('[FR-LOGIN-HIT]',report);
    if(report.ok){nativeStep('LOGIN_HITTEST_OK',{readyState:document.readyState,ids:IDS});reportNative(report);if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}
    else if(!retryTimer){retryTimer=setTimeout(()=>{retryTimer=null;run()},120)}
  }
  function schedule(){requestAnimationFrame(()=>requestAnimationFrame(run));setTimeout(run,80);setTimeout(run,350)}
  document.addEventListener('DOMContentLoaded',()=>{nativeStep('DOM_CONTENT_LOADED',{readyState:document.readyState});schedule()},{once:true});
  window.addEventListener('load',()=>{nativeStep('WINDOW_LOAD',{readyState:document.readyState});schedule()},{once:true});
  const startObserver=()=>{const a=auth();if(!a)return;new MutationObserver(()=>{if(visible(a))schedule();else clearNeutralized()}).observe(a,{attributes:true,attributeFilter:['class','style']});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else{nativeStep('SCRIPT_AFTER_DOM',{readyState:document.readyState});startObserver();schedule()}
})();
</script>`;

if (!html.includes('id="frWindowsLoginHitCss"')) {
  const headClose = html.indexOf('</head>');
  if (headClose < 0) throw new Error('No se encontró </head> para inyectar guardia CSS del login');
  html = html.slice(0, headClose) + css + '\n' + html.slice(headClose);
}
if (!html.includes('id="frWindowsLoginHitJs"')) {
  const cssPos = html.indexOf('</style>', html.indexOf('id="frWindowsLoginHitCss"'));
  if (cssPos < 0) throw new Error('No se encontró cierre del CSS del guardia de login');
  const insertAt = cssPos + '</style>'.length;
  html = html.slice(0, insertAt) + '\n' + js + html.slice(insertAt);
}

const scriptPos=html.indexOf('id="frWindowsLoginHitJs"');
const headClose=html.indexOf('</head>');
if(scriptPos<0||headClose<0||scriptPos>headClose)throw new Error('El script de diagnóstico del login no quedó dentro de <head>');

for (const marker of [
  'data-fr-windows-login-hit="2"',
  'HEAD_SCRIPT_STARTED',
  'DOM_CONTENT_LOADED',
  'WINDOW_LOAD',
  'LOGIN_HITTEST_OK',
  "invoke('webview_milestone'",
  'document.elementFromPoint',
  'document.elementsFromPoint',
  "invoke('login_ui_ready'",
  "IDS=['businessCode','loginUser','loginPin','loginBtn']",
  'data-fr-login-blocked',
  '2147483000',
]) if (!html.includes(marker)) throw new Error(`Falta marcador del guardia de login: ${marker}`);

await writeFile(path, html, 'utf8');
console.log('WINDOWS LOGIN HIT GUARD V2 OK: script temprano en <head>, milestones nativos y hit-test real de los cuatro controles.');
