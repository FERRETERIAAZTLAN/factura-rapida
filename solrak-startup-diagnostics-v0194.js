(()=>{
  'use strict';
  const invoke=(step,detail='')=>{
    try{window.__TAURI__?.core?.invoke?.('webview_milestone',{step:String(step),detail:String(detail).slice(0,1800)}).catch(()=>{});}catch{}
  };
  const clean=s=>String(s||'').replace(/\s+/g,' ').slice(0,1500);
  let seq=0;
  const original=EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener=function(type,listener,options){
    const watched=(this===document&&type==='DOMContentLoaded')||(this===window&&type==='load');
    if(!watched||!listener)return original.call(this,type,listener,options);
    const id=++seq;
    const stack=clean(new Error(`register-${type}-${id}`).stack);
    invoke(`DIAG_REG_${id}`,`${type} ${stack}`);
    const wrapped=function(...args){
      invoke(`DIAG_BEGIN_${id}`,`${type} readyState=${document.readyState} ${stack}`);
      try{
        const result=typeof listener==='function'?listener.apply(this,args):listener.handleEvent?.apply(listener,args);
        invoke(`DIAG_END_${id}`,`${type} readyState=${document.readyState}`);
        return result;
      }catch(error){
        invoke(`DIAG_ERROR_${id}`,`${type} ${clean(error?.stack||error)}`);
        throw error;
      }
    };
    return original.call(this,type,wrapped,options);
  };
  window.addEventListener('error',e=>invoke('DIAG_WINDOW_ERROR',clean(e?.error?.stack||e?.message||e)));
  window.addEventListener('unhandledrejection',e=>invoke('DIAG_REJECTION',clean(e?.reason?.stack||e?.reason)));
  const snapshot=()=>{
    const pendingImgs=[...document.images].filter(i=>!i.complete).slice(0,12).map(i=>i.currentSrc||i.src);
    const pendingFrames=[...document.querySelectorAll('iframe')].slice(0,8).map(i=>i.src||'(sin src)');
    return JSON.stringify({readyState:document.readyState,pendingImgs,pendingFrames,active:document.activeElement?.id||document.activeElement?.tagName||'',login:!!document.querySelector('#loginPanel, #loginForm, [data-login], input[type="password"]')});
  };
  let ticks=0;
  const timer=setInterval(()=>{
    ticks++;
    invoke(`DIAG_TICK_${ticks}`,snapshot());
    if(ticks>=35)clearInterval(timer);
  },1000);
  invoke('DIAG_BOOT',`readyState=${document.readyState}`);
})();
