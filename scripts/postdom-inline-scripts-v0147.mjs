import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');

if (!html.includes('HEAD_SCRIPT_STARTED')) throw new Error('No se encontró diagnóstico HEAD_SCRIPT_STARTED');
if (!html.includes('</head>')) throw new Error('HTML sin </head>');

let moved = 0;
let kept = 0;
let fiscalMoved = 0;
html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
  const a = attrs || '';
  const src = /\bsrc\s*=/.test(a);
  const headDiag = body.includes('HEAD_SCRIPT_STARTED') || body.includes('DOM_CONTENT_LOADED');
  const bootstrap = /data-fr-postdom-bootstrap/.test(a);
  const fiscal = /data-fr-facturar-real\s*=\s*["']8["']/.test(a);
  // Solo diagnóstico mínimo y scripts externos ya lazy quedan activos durante parser.
  // Todo inline de aplicación, incluido el controlador fiscal, se conserva byte por byte
  // pero con MIME inerte y se activa después de DOMContentLoaded en el mismo orden.
  if (src || headDiag || bootstrap) {
    kept++;
    return full;
  }
  moved++;
  if (fiscal) fiscalMoved++;
  const cleaned = a.replace(/\s+type\s*=\s*(["']).*?\1/ig, '');
  return `<script type="application/fr-postdom" data-fr-postdom="1"${cleaned}>${body}</script>`;
});

if (fiscalMoved !== 1) throw new Error(`Controlador fiscal diferido esperado=1 actual=${fiscalMoved}`);
if (moved < 6) throw new Error(`Se movieron muy pocos scripts: ${moved}`);

const bootstrap = String.raw`<script data-fr-postdom-bootstrap="1">
(function(){
  function milestone(step,detail){
    try{window.__TAURI__?.core?.invoke?.('webview_milestone',{step,detail:JSON.stringify(detail||{})});}catch(_){}
  }
  function frRunPostDomScripts(){
    const pending=[...document.querySelectorAll('script[type="application/fr-postdom"][data-fr-postdom="1"]')];
    let index=0;
    const next=()=>{
      if(index>=pending.length){ milestone('POSTDOM_SCRIPTS_DONE',{count:pending.length}); return; }
      const old=pending[index++];
      const s=document.createElement('script');
      for(const attr of old.attributes){
        if(attr.name==='type'||attr.name==='data-fr-postdom') continue;
        s.setAttribute(attr.name,attr.value);
      }
      s.textContent=old.textContent||'';
      old.after(s);
      // Ceder el event loop entre scripts evita congelar WebView2 y mantiene orden.
      setTimeout(next,0);
    };
    setTimeout(next,0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{
    milestone('POSTDOM_BOOTSTRAP_START',{readyState:document.readyState});
    setTimeout(frRunPostDomScripts,0);
  },{once:true});
  else {
    milestone('POSTDOM_BOOTSTRAP_START',{readyState:document.readyState});
    setTimeout(frRunPostDomScripts,0);
  }
})();
</script>`;

html = html.replace('</head>', `${bootstrap}\n</head>`);
await writeFile(path, html, 'utf8');
console.log(`POSTDOM V0.1.47 OK: moved=${moved} kept=${kept} fiscalMoved=${fiscalMoved}; parser limitado a diagnóstico mínimo.`);
