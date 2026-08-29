import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] || 'desktop/dist/index.html';
let html = await readFile(path, 'utf8');

if (!html.includes('HEAD_SCRIPT_STARTED')) throw new Error('No se encontró diagnóstico HEAD_SCRIPT_STARTED');
if (!html.includes('</head>')) throw new Error('HTML sin </head>');

let moved = 0;
let kept = 0;
let keptFiscal = 0;
html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
  const a = attrs || '';
  const src = /\bsrc\s*=/.test(a);
  const headDiag = body.includes('HEAD_SCRIPT_STARTED') || body.includes('DOM_CONTENT_LOADED');
  const bootstrap = /data-fr-postdom-bootstrap/.test(a);
  const fiscal = /data-fr-facturar-real\s*=\s*["']8["']/.test(a);
  // El controlador fiscal queda exactamente como <script data-fr-facturar-real="8"> para que
  // la auditoría productiva valide el mismo flujo que irá dentro del EXE. Es declarativo/registro
  // de handlers y no depende de recursos externos de arranque.
  if (src || headDiag || bootstrap || fiscal) {
    kept++;
    if (fiscal) keptFiscal++;
    return full;
  }
  moved++;
  const cleaned = a.replace(/\s+type\s*=\s*(["']).*?\1/ig, '');
  return `<script type="application/fr-postdom" data-fr-postdom="1"${cleaned}>${body}</script>`;
});

if (keptFiscal !== 1) throw new Error(`Controlador fiscal esperado=1 actual=${keptFiscal}`);
if (moved < 5) throw new Error(`Se movieron muy pocos scripts: ${moved}`);

const bootstrap = String.raw`<script data-fr-postdom-bootstrap="1">
(function(){
  function frRunPostDomScripts(){
    const pending=[...document.querySelectorAll('script[type="application/fr-postdom"][data-fr-postdom="1"]')];
    let index=0;
    const next=()=>{
      if(index>=pending.length){
        try{window.__TAURI__?.core?.invoke?.('webview_milestone',{step:'POSTDOM_SCRIPTS_DONE',detail:JSON.stringify({count:pending.length})});}catch(_){}
        return;
      }
      const old=pending[index++];
      const s=document.createElement('script');
      for(const attr of old.attributes){
        if(attr.name==='type'||attr.name==='data-fr-postdom') continue;
        s.setAttribute(attr.name,attr.value);
      }
      s.textContent=old.textContent||'';
      old.after(s);
      next();
    };
    next();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(frRunPostDomScripts,0),{once:true});
  else setTimeout(frRunPostDomScripts,0);
})();
</script>`;

html = html.replace('</head>', `${bootstrap}\n</head>`);
await writeFile(path, html, 'utf8');
console.log(`POSTDOM V0.1.46 OK: moved=${moved} kept=${kept} fiscal=${keptFiscal}; fiscal auditable y scripts no críticos post-DOM.`);
