(()=>{
'use strict';
const MARK=`<svg class="solrakLogoSvg" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false"><defs><linearGradient id="solrakBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#198BFF"/><stop offset=".38" stop-color="#075CBF"/><stop offset="1" stop-color="#061C46"/></linearGradient><linearGradient id="solrakHex" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A5BC8"/><stop offset="1" stop-color="#061C46"/></linearGradient></defs><rect x="72" y="72" width="880" height="880" rx="202" fill="url(#solrakBg)" stroke="#0A3B82" stroke-width="18"/><path d="M512 167 820 345 820 701 512 879 204 701 204 345Z" fill="url(#solrakHex)" stroke="#10B9FF" stroke-width="26"/><path d="M512 188 798 353 798 693 512 858 226 693 226 353Z" fill="none" stroke="#1375ED" stroke-width="10"/><path fill="#fff" d="M688 286c25 15 34 48 19 73-6 10-15 18-25 24L439 524l112 64 70-40-83-48 75-44 107 62c18 10 30 29 30 50v75c0 20-11 39-29 50L451 850c-25 14-57 6-72-19-15-25-6-57 19-72l243-140-113-65-70 41 84 48-76 44-108-62c-18-11-29-30-29-50v-75c0-21 11-40 30-51l257-148c22-13 50-11 72 5Z"/></svg>`;

function style(){
 if(document.getElementById('solrakLogoV0162Style'))return;
 const s=document.createElement('style');s.id='solrakLogoV0162Style';s.textContent=`
 .solrakLogoSvg{display:block;width:100%;height:100%}
 #solrakAppMark{background:transparent!important;box-shadow:none!important;border-radius:10px!important;overflow:hidden!important;padding:0!important}
 #solrakLoginBrand{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 auto 16px;padding:0 4px;color:#10243e;font-family:"Segoe UI",Arial,sans-serif;user-select:none}
 #solrakLoginBrand .mark{width:52px;height:52px;flex:0 0 52px}
 #solrakLoginBrand strong{display:block;font-size:23px;line-height:1;font-weight:900;letter-spacing:.09em}
 #solrakLoginBrand small{display:block;margin-top:5px;color:#718093;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
 #solrakStartupBrand{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;pointer-events:none;background:linear-gradient(145deg,#071d3e,#0a3b78 55%,#07182f);opacity:1;transition:opacity .22s ease}
 #solrakStartupBrand.out{opacity:0}
 #solrakStartupBrand .inner{text-align:center;color:#fff;font-family:"Segoe UI",Arial,sans-serif}
 #solrakStartupBrand .mark{width:112px;height:112px;margin:0 auto 17px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.25))}
 #solrakStartupBrand strong{display:block;font-size:34px;font-weight:900;letter-spacing:.13em}
 #solrakStartupBrand span{display:block;margin-top:8px;color:#9bcaff;font-size:10px;font-weight:700;letter-spacing:.17em;text-transform:uppercase}
 `;document.head.appendChild(s);
}

function mountNav(){const mark=document.getElementById('solrakAppMark');if(mark&&mark.dataset.logoReady!=='1'){mark.innerHTML=MARK;mark.dataset.logoReady='1'}}
function mountLogin(){
 const auth=document.getElementById('authLayer');if(!auth||document.getElementById('solrakLoginBrand'))return;
 const form=document.getElementById('loginForm');const host=form?.parentElement||auth.firstElementChild||auth;
 const brand=document.createElement('div');brand.id='solrakLoginBrand';brand.innerHTML=`<div class="mark">${MARK}</div><div><strong>SOLRAK</strong><small>Punto de venta e inventario</small></div>`;
 host.insertBefore(brand,form||host.firstChild);
}
function mountSplash(){
 if(document.getElementById('solrakStartupBrand'))return;
 const x=document.createElement('div');x.id='solrakStartupBrand';x.innerHTML=`<div class="inner"><div class="mark">${MARK}</div><strong>SOLRAK</strong><span>Punto de venta e inventario</span></div>`;document.body.appendChild(x);
 const close=()=>{if(!x.isConnected)return;x.classList.add('out');setTimeout(()=>x.remove(),240)};
 setTimeout(close,620);window.addEventListener('load',()=>setTimeout(close,120),{once:true});
}
function normalizeTitle(){document.title=String(document.title||'').replace(/Factura Rápida|Factura Rapida|Solrak/g,'SOLRAK')||'SOLRAK'}
function mount(){style();mountNav();mountLogin();normalizeTitle()}

style();mountSplash();mount();
const observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{subtree:true,childList:true});
setTimeout(()=>{mount();observer.disconnect()},5000);
window.SOLRAKLogoV0162={mark:MARK,mount};
})();
