(()=>{
'use strict';
const VERSION='0.1.63';
const byId=id=>document.getElementById(id);

const META={
 pos:{title:'Ventas',subtitle:'Punto de venta, caja y cobro'},
 factura:{title:'Facturación',subtitle:'Preparar y administrar documentos fiscales'},
 cotizaciones:{title:'Cotizaciones',subtitle:'Crear, consultar y enviar cotizaciones'},
 inventario:{title:'Inventario',subtitle:'Productos, existencias, precios e imágenes'},
 clientes:{title:'Clientes',subtitle:'Directorio y datos fiscales de clientes'},
 proveedores:{title:'Proveedores',subtitle:'Directorio de proveedores y productos relacionados'},
 historial:{title:'Reportes',subtitle:'Historial, documentos y seguimiento de operación'},
 configuracion:{title:'Configuración',subtitle:'Negocio, correo, fiscal y preferencias'},
 usuarios:{title:'Usuarios',subtitle:'Accesos y permisos del equipo'}
};

const ICONS={
 pos:'<path d="M3 5h2l1.5 8.5h9.5l2-6H6.2M9 18a1 1 0 1 0 0 .01M16 18a1 1 0 1 0 0 .01"/>',
 factura:'<path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6"/>',
 cotizaciones:'<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
 inventario:'<path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/>',
 clientes:'<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11a3 3 0 1 0 0-6M18 15a4 4 0 0 1 3 4v2"/>',
 proveedores:'<path d="M3 21v-8l5-3v11M8 21V6l6-3v18M14 21v-6l7-3v9M2 21h20"/>',
 historial:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
 configuracion:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.5A1.7 1.7 0 0 0 4.2 8a1.7 1.7 0 0 0-.31-1.91l-.06-.06L6.66 3.2l.06.06A1.7 1.7 0 0 0 8.6 3.6a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10 1.9V2h4v-.1a1.7 1.7 0 0 0 1.6 1.7 1.7 1.7 0 0 0 1.31-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.9v4h-.9a1.7 1.7 0 0 0-1.7 1.6Z"/>',
 usuarios:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0M18 8h4M20 6v4"/>'
};

function svg(path){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`}

function injectStyle(){
 if(byId('solrakDesktopV0163Style'))return;
 const s=document.createElement('style');s.id='solrakDesktopV0163Style';s.textContent=`
 @media(min-width:1050px){
  html[data-solrak-desktop-polish="1"]{--solrak-sidebar:244px;--solrak-bg:#f2f4f7;--solrak-border:#dce1e6;--solrak-blue:#146ee8}
  html[data-solrak-desktop-polish="1"] body{font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif!important;background:var(--solrak-bg)!important}
  html[data-solrak-desktop-polish="1"] main.shell{padding:16px 22px 32px!important}
  html[data-solrak-desktop-polish="1"] .nav{padding-left:9px!important;padding-right:9px!important;background:linear-gradient(180deg,#101d2a 0%,#101922 100%)!important}
  html[data-solrak-desktop-polish="1"] .nav>button{justify-content:flex-start!important;gap:10px!important;padding:0 11px!important;min-height:40px!important;font-size:12px!important}
  html[data-solrak-desktop-polish="1"] .nav>button .solrakNavIcon{width:19px;height:19px;display:grid;place-items:center;color:#91a6b9;flex:0 0 19px}
  html[data-solrak-desktop-polish="1"] .nav>button .solrakNavIcon svg{width:18px;height:18px;display:block}
  html[data-solrak-desktop-polish="1"] .nav>button:hover .solrakNavIcon,html[data-solrak-desktop-polish="1"] .nav>button.active .solrakNavIcon{color:#fff}
  html[data-solrak-desktop-polish="1"] .nav>button .solrakNavText{flex:1}
  html[data-solrak-desktop-polish="1"] .nav>button.active{background:linear-gradient(90deg,#1b67d2,#2077ef)!important;box-shadow:none!important}
  html[data-solrak-desktop-polish="1"] .solrakNavSection{margin-top:5px;padding:12px 11px 5px!important;color:#647b90!important}
  html[data-solrak-desktop-polish="1"] #solrakAppBrand{padding:18px 11px 16px!important;margin-bottom:7px!important}
  html[data-solrak-desktop-polish="1"] .top{margin:-16px -22px 0!important;padding:12px 22px!important;min-height:56px;box-sizing:border-box;background:rgba(250,251,252,.97)!important}
  html[data-solrak-desktop-polish="1"] .tab-panel{padding-top:0!important}
  html[data-solrak-desktop-polish="1"] .card{border-radius:8px!important;box-shadow:0 1px 1px rgba(19,32,45,.025)!important}
  html[data-solrak-desktop-polish="1"] .card h2{font-size:15px!important;letter-spacing:-.01em}
  html[data-solrak-desktop-polish="1"] .card-head{padding-bottom:3px}
  html[data-solrak-desktop-polish="1"] .primary,html[data-solrak-desktop-polish="1"] .secondary,html[data-solrak-desktop-polish="1"] .ghost{border-radius:6px!important;min-height:34px;font-family:inherit!important}
  html[data-solrak-desktop-polish="1"] .primary{background:#146ee8!important;border-color:#146ee8!important}
  html[data-solrak-desktop-polish="1"] .field,html[data-solrak-desktop-polish="1"] input,html[data-solrak-desktop-polish="1"] select,html[data-solrak-desktop-polish="1"] textarea{border-radius:6px!important}
  html[data-solrak-desktop-polish="1"] .search{border-radius:7px!important;background:#fff!important}
  html[data-solrak-desktop-polish="1"] table{font-size:12px!important}
  html[data-solrak-desktop-polish="1"] table th{height:36px!important;padding-top:7px!important;padding-bottom:7px!important;background:#f4f6f8!important;border-bottom:1px solid #d8dee4!important}
  html[data-solrak-desktop-polish="1"] table td{padding-top:7px!important;padding-bottom:7px!important;border-bottom-color:#edf0f2!important}
  html[data-solrak-desktop-polish="1"] table tbody tr:hover td{background:#f7faff!important}
  html[data-solrak-desktop-polish="1"] .badge{border-radius:999px!important;font-size:10px!important}
  html[data-solrak-desktop-polish="1"] dialog{font-family:inherit!important}
 }
 #solrakContextBar{display:none}
 @media(min-width:1050px){
  #solrakContextBar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 -22px 16px;padding:15px 22px 14px;background:#fff;border-bottom:1px solid var(--solrak-border)}
  #solrakContextBar .sc-title{min-width:0}
  #solrakContextBar h1{margin:0;color:#172433;font:750 20px/1.12 "Segoe UI Variable","Segoe UI",Arial,sans-serif;letter-spacing:-.02em}
  #solrakContextBar p{margin:4px 0 0;color:#718090;font-size:11px;line-height:1.3}
  #solrakContextBar .sc-meta{display:flex;align-items:center;gap:10px;color:#647486;font-size:10px;white-space:nowrap}
  #solrakContextBar .sc-online{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid #dbe7df;border-radius:999px;background:#f5fbf7;color:#34704b;font-weight:700}
  #solrakContextBar .sc-online::before{content:"";width:6px;height:6px;border-radius:50%;background:#34a565;box-shadow:0 0 0 2px rgba(52,165,101,.12)}
  #solrakNavFooter{margin-top:auto;padding:12px 11px 4px;border-top:1px solid rgba(255,255,255,.08);color:#7f94a7;font-size:9px;line-height:1.45}
  #solrakNavFooter strong{display:block;color:#c5d2dd;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 }
 `;document.head.appendChild(s)
}

function navIcon(btn){
 const tab=btn?.dataset?.tab;if(!tab||!ICONS[tab]||btn.querySelector('.solrakNavIcon'))return;
 const i=document.createElement('span');i.className='solrakNavIcon';i.innerHTML=svg(ICONS[tab]);
 const text=btn.querySelector('.solrakNavText');btn.insertBefore(i,text||btn.firstChild);
}

function ensureContext(){
 let bar=byId('solrakContextBar');if(bar)return bar;
 const main=document.querySelector('main.shell');if(!main)return null;
 const top=main.querySelector('.top');bar=document.createElement('div');bar.id='solrakContextBar';bar.innerHTML='<div class="sc-title"><h1>Inicio</h1><p>Escritorio SOLRAK</p></div><div class="sc-meta"><span class="sc-online">Sistema conectado</span><span class="sc-version">v'+VERSION+'</span></div>';
 if(top?.nextSibling)main.insertBefore(bar,top.nextSibling);else main.insertBefore(bar,main.firstChild);
 return bar;
}

function activeTab(){
 const active=document.querySelector('.nav > button.active[data-tab],.nav > button[aria-current="page"][data-tab]');
 if(active?.dataset?.tab)return active.dataset.tab;
 const visible=[...document.querySelectorAll('.tab-panel')].find(x=>!x.classList.contains('hidden')&&x.id?.startsWith('tab-'));
 return visible?.id?.slice(4)||'pos';
}

function updateContext(){
 const tab=activeTab(),m=META[tab]||{title:'SOLRAK',subtitle:'Sistema de punto de venta e inventario'},bar=ensureContext();if(!bar)return;
 const h=bar.querySelector('h1'),p=bar.querySelector('p');if(h&&h.textContent!==m.title)h.textContent=m.title;if(p&&p.textContent!==m.subtitle)p.textContent=m.subtitle;
}

function footer(){
 const nav=document.querySelector('.nav');if(!nav||byId('solrakNavFooter'))return;
 const x=document.createElement('div');x.id='solrakNavFooter';
 const business=String(window.session?.business?.name||'Negocio actual');x.innerHTML='<strong></strong><span>Escritorio SOLRAK · v'+VERSION+'</span>';x.querySelector('strong').textContent=business;nav.appendChild(x);
}

function mount(){
 injectStyle();document.documentElement.dataset.solrakDesktopPolish='1';
 document.querySelectorAll('.nav > button[data-tab]').forEach(navIcon);ensureContext();updateContext();footer();
}

function boot(){
 mount();document.addEventListener('click',e=>{if(e.target?.closest?.('.nav > button[data-tab]'))setTimeout(updateContext,0)},true);
 const nav=document.querySelector('.nav');if(nav)new MutationObserver(()=>mount()).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-current']});
 const main=document.querySelector('main.shell');if(main)new MutationObserver(()=>updateContext()).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 setTimeout(mount,250);setTimeout(mount,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SOLRAKDesktopV0163={version:VERSION,mount,updateContext};
})();
