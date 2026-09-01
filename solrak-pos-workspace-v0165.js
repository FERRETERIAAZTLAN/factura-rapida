(()=>{
'use strict';
const VERSION='0.1.65';
const byId=id=>document.getElementById(id);

function injectStyle(){
 if(byId('solrakPOSWorkspaceV0165Style'))return;
 const s=document.createElement('style');s.id='solrakPOSWorkspaceV0165Style';s.textContent=`
@media(min-width:1050px){
 html[data-solrak-pos-workspace="1"] body{overflow:hidden!important;background:#eef1f4!important}
 html[data-solrak-pos-workspace="1"] main.shell{height:calc(100vh - var(--solrak-native-top,0px))!important;min-height:0!important;overflow:hidden!important;padding:10px 14px 12px!important}
 html[data-solrak-pos-workspace="1"] main.shell>.top,
 html[data-solrak-pos-workspace="1"] main.shell>.statusgrid,
 html[data-solrak-pos-workspace="1"] #solrakContextBar{display:none!important}
 html[data-solrak-pos-workspace="1"] #notice:not(.hidden){position:fixed;z-index:9000;right:20px;top:calc(var(--solrak-native-top,0px) + 12px);width:min(520px,calc(100vw - var(--solrak-sidebar,244px) - 40px));box-shadow:0 12px 35px rgba(17,31,44,.18)}
 html[data-solrak-pos-workspace="1"] #tab-pos{height:100%;min-height:0;display:grid!important;grid-template-rows:auto minmax(0,1fr);gap:8px;padding:0!important}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosTop{margin:0!important;min-height:42px;padding:0 2px;border-bottom:1px solid #d9dfe5}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosTop .eyebrow,
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosTop .frPosHint{display:none!important}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosTop h2{font-size:18px!important;margin:0!important}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosGrid{height:100%;min-height:0;grid-template-columns:minmax(0,1fr) 306px!important;gap:8px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosGrid>.stack{height:100%;min-height:0;display:grid!important;grid-template-rows:auto minmax(0,1fr);gap:8px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosGrid>.stack>article{min-height:0;padding:10px!important;border-radius:5px!important;box-shadow:none!important}
 html[data-solrak-pos-workspace="1"] #tab-pos>.frPosGrid>.stack>article:last-child{display:none!important}
 html[data-solrak-pos-workspace="1"] .frPosSearch input{font-size:15px!important;padding:9px 11px!important;border-radius:3px!important}
 html[data-solrak-pos-workspace="1"] .frPosResults{max-height:180px!important;margin-top:4px!important}
 html[data-solrak-pos-workspace="1"] .frPosResults .frPosEmpty{padding:5px 8px!important;text-align:left!important;font-size:10px!important}
 html[data-solrak-pos-workspace="1"] .frPosCartCard{display:flex;flex-direction:column;height:100%;min-height:0!important}
 html[data-solrak-pos-workspace="1"] .frPosCartCard>label{display:grid;grid-template-columns:100px minmax(0,1fr);align-items:center;gap:8px;margin-bottom:6px}
 html[data-solrak-pos-workspace="1"] .frPosCartCard>label .field{padding:7px 9px!important}
 html[data-solrak-pos-workspace="1"] .frPosCart{flex:1;min-height:0;max-height:none!important;border-radius:3px!important;background:#fff}
 html[data-solrak-pos-workspace="1"] .frPosLine{grid-template-columns:minmax(0,1fr) 125px 92px!important;padding:7px 9px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos aside.summary{position:static!important;height:100%;min-height:0;display:flex;flex-direction:column;padding:9px!important;border-radius:5px!important;box-shadow:none!important}
 html[data-solrak-pos-workspace="1"] #tab-pos aside.summary>.card-head{margin-bottom:6px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frPreview{min-height:132px!important;height:132px!important;margin-bottom:7px!important;border-radius:3px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frPreview img{height:90px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frPreviewMeta{padding:5px 7px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frTicketBar{display:block!important;margin:0 0 7px!important;overflow:visible!important;padding:0!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frTicketBar::before{content:"Tickets abiertos";display:block;margin:0 0 5px;color:#667482;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}
 html[data-solrak-pos-workspace="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr 1fr;gap:4px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frTicket{min-width:0!important;min-height:43px;padding:5px 6px!important;border-radius:3px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frTicketNew{width:100%;min-height:30px;margin-top:4px;padding:4px 8px!important;border-radius:3px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frPosTotals{margin-top:auto!important;padding-top:6px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frPosTotals>div{padding:2px 0!important}
 html[data-solrak-pos-workspace="1"] #tab-pos .frPosGrand{font-size:28px!important;padding-top:6px!important}
 html[data-solrak-pos-workspace="1"] #tab-pos #posCharge{min-height:44px!important;margin-top:6px!important;border-radius:4px!important;font-size:14px!important;text-transform:uppercase}
 html[data-solrak-pos-workspace="1"] #tab-pos #posReceipt{font-size:10px}
}
`;document.head.appendChild(s)
}

function posIsActive(){
 const panel=byId('tab-pos');
 return !!panel&&!panel.classList.contains('hidden');
}

function moveTickets(){
 const bar=document.querySelector('#tab-pos>.frTicketBar'),preview=byId('posProductPreview'),summary=preview?.closest('aside.summary');
 if(!bar||!preview||!summary||bar.parentElement===summary)return;
 preview.insertAdjacentElement('afterend',bar);
}

function updateMode(){
 moveTickets();
 if(posIsActive())document.documentElement.dataset.solrakPosWorkspace='1';
 else delete document.documentElement.dataset.solrakPosWorkspace;
}

function mount(){injectStyle();moveTickets();updateMode()}

function boot(){
 mount();
 document.addEventListener('click',e=>{if(e.target?.closest?.('.nav [data-tab]'))setTimeout(updateMode,0)},true);
 const main=document.querySelector('main.shell')||document.body;
 new MutationObserver(updateMode).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 setTimeout(mount,250);setTimeout(mount,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SOLRAKPOSWorkspaceV0165={version:VERSION,mount,updateMode};
})();
