(() => {
  "use strict";
  const VERSION = "0.1.66";
  const byId = (id) => document.getElementById(id);

  function injectStyle() {
    if (byId("solrakProfessionalPOSV0166Style")) return;
    const style = document.createElement("style");
    style.id = "solrakProfessionalPOSV0166Style";
    style.textContent = `
:root{--solrak-pos-blue:#1777d3;--solrak-pos-blue-dark:#0f61b3;--solrak-pos-border:#dce2e8;--solrak-pos-text:#263442;--solrak-pos-muted:#718090}
@media(min-width:1050px){
 html[data-solrak-professional-pos="1"] body{overflow:hidden!important;background:#fff!important}
 html[data-solrak-professional-pos="1"] main.shell{height:calc(100vh - var(--solrak-native-top,0px))!important;min-height:0!important;overflow:hidden!important;padding:0!important;background:#fff!important}
 html[data-solrak-professional-pos="1"] main.shell>.top,
 html[data-solrak-professional-pos="1"] main.shell>.statusgrid,
 html[data-solrak-professional-pos="1"] #frReadyPanel,
 html[data-solrak-professional-pos="1"] #solrakContextBar{display:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos{height:100%;min-height:0;display:grid!important;grid-template-rows:54px minmax(0,1fr);gap:0!important;padding:0!important;background:#fff}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop{height:54px;min-height:54px!important;margin:0!important;padding:0 18px!important;background:var(--solrak-pos-blue)!important;border:0!important;color:#fff;box-sizing:border-box}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop>div:first-child{display:flex;align-items:center;gap:10px}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop .eyebrow{display:block!important;margin:0!important;font-size:0!important}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop .eyebrow::before{content:"SOLRAK";font-size:18px;font-weight:900;letter-spacing:.04em}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop h2{font-size:16px!important;font-weight:500!important;margin:0!important;opacity:.92}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop .frPosHint{display:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop .actions{display:flex;align-items:center;gap:7px}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop .frPosState{border-color:rgba(255,255,255,.35)!important;background:rgba(255,255,255,.13)!important;color:#fff!important;border-radius:3px!important;padding:7px 10px!important}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosTop button{border-radius:3px!important;border-color:rgba(255,255,255,.55)!important;box-shadow:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosGrid{height:100%;min-height:0;display:grid!important;grid-template-columns:minmax(0,1fr) 294px!important;gap:0!important;background:#fff}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack{height:100%;min-height:0;display:grid!important;grid-template-rows:78px minmax(0,1fr)!important;gap:0!important;border-right:1px solid var(--solrak-pos-border)}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article{padding:0!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;min-height:0}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article:first-child{position:relative;padding:12px 16px 8px!important;border-bottom:1px solid var(--solrak-pos-border)!important}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article:first-child .card-head{display:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article:last-child{display:none!important}
 html[data-solrak-professional-pos="1"] .frPosSearch{display:grid;grid-template-columns:minmax(0,1fr) 108px;gap:8px}
 html[data-solrak-professional-pos="1"] .frPosSearch::after{content:"BUSCAR";display:grid;place-items:center;background:var(--solrak-pos-blue);color:#fff;font-size:12px;font-weight:800;border-radius:3px}
 html[data-solrak-professional-pos="1"] .frPosSearch input{height:38px!important;padding:8px 11px!important;border:0!important;border-bottom:2px solid var(--solrak-pos-blue)!important;border-radius:0!important;background:#f5f7f9!important;font-size:14px!important;box-shadow:none!important}
 html[data-solrak-professional-pos="1"] .frPosSearch .frPosHint{grid-column:1/-1;margin:0!important;font-size:9px!important}
 html[data-solrak-professional-pos="1"] .frPosResults{position:absolute;z-index:30;left:16px;right:132px;top:53px;max-height:260px!important;margin:0!important;background:#fff;box-shadow:0 12px 28px rgba(24,39,53,.17)}
 html[data-solrak-professional-pos="1"] .frPosResults>.frPosEmpty{display:none!important}
 html[data-solrak-professional-pos="1"] .frPosCartCard{display:flex!important;flex-direction:column;height:100%;min-height:0!important}
 html[data-solrak-professional-pos="1"] .frPosCartCard>.card-head{height:42px;min-height:42px;padding:0 16px!important;margin:0!important;border-bottom:1px solid var(--solrak-pos-border);box-sizing:border-box}
 html[data-solrak-professional-pos="1"] .frPosCartCard>.card-head h2{font-size:13px!important}
 html[data-solrak-professional-pos="1"] .frPosCartCard>.card-head button{border:0!important;color:#c44949!important;background:transparent!important}
 html[data-solrak-professional-pos="1"] .frPosCartCard>label{height:42px;display:grid;grid-template-columns:105px minmax(0,1fr);align-items:center;gap:8px;margin:0!important;padding:0 16px;border-bottom:1px solid var(--solrak-pos-border);font-size:11px;box-sizing:border-box}
 html[data-solrak-professional-pos="1"] .frPosCartCard>label .field{height:30px!important;padding:4px 8px!important;border-radius:2px!important}
 html[data-solrak-professional-pos="1"] .frPosCartHead,
 html[data-solrak-professional-pos="1"] .frPosLine{display:grid!important;grid-template-columns:90px minmax(190px,1fr) 126px 92px 112px!important;gap:8px;align-items:center}
 html[data-solrak-professional-pos="1"] .frPosCartHead{height:34px;min-height:34px;padding:0 10px;background:#edf1f4;color:#5f6c78;font-size:10px;font-weight:800;border-bottom:1px solid #d7dde3;box-sizing:border-box}
 html[data-solrak-professional-pos="1"] .frPosCartHead span:nth-child(n+3){text-align:right}
 html[data-solrak-professional-pos="1"] .frPosCart{flex:1;min-height:0;max-height:none!important;overflow:auto!important;margin:0!important;border:0!important;border-radius:0!important;background:#fff}
 html[data-solrak-professional-pos="1"] .frPosLine{min-height:48px;padding:5px 10px!important;border-bottom:1px solid #edf0f2!important;background:#fff!important;font-size:11px}
 html[data-solrak-professional-pos="1"] .frPosLine:hover{background:#eef6ff!important}
 html[data-solrak-professional-pos="1"] .frPosLine:nth-child(even){background:#fbfcfd!important}
 html[data-solrak-professional-pos="1"] .frPosCode{color:#607080;font-weight:700;overflow:hidden;text-overflow:ellipsis}
 html[data-solrak-professional-pos="1"] .frPosProduct strong{font-size:11px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 html[data-solrak-professional-pos="1"] .frPosProduct small{font-size:9px}
 html[data-solrak-professional-pos="1"] .frPosQty{justify-self:end;border-radius:2px!important}
 html[data-solrak-professional-pos="1"] .frPosQty button{width:26px!important}
 html[data-solrak-professional-pos="1"] .frPosQty input{width:48px!important}
 html[data-solrak-professional-pos="1"] .frPosUnitPrice,
 html[data-solrak-professional-pos="1"] .frPosLineTotal{text-align:right;font-weight:750;white-space:nowrap}
 html[data-solrak-professional-pos="1"] .frPosLineTotal{display:flex;justify-content:flex-end;align-items:center;gap:7px}
 html[data-solrak-professional-pos="1"] #tab-pos aside.summary{height:100%;min-height:0;position:static!important;display:flex!important;flex-direction:column;padding:12px!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#f8f9fa!important}
 html[data-solrak-professional-pos="1"] #tab-pos aside.summary>.card-head{display:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frPreview{height:180px!important;min-height:180px!important;margin:0 0 10px!important;border:1px solid var(--solrak-pos-border)!important;border-radius:3px!important;background:#fff!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frPreview img{height:132px!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frPreviewMeta{padding:6px 8px!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frTicketBar{display:block!important;margin:0!important;padding:0!important;overflow:visible!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frTicketBar::before{content:"TICKETS ABIERTOS";display:block;margin:0 0 5px;color:#778491;font-size:9px;font-weight:850;letter-spacing:.08em}
 html[data-solrak-professional-pos="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr 1fr;gap:5px!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frTicket{min-width:0!important;min-height:42px;padding:5px 7px!important;border-radius:2px!important;background:#fff!important;box-shadow:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frTicket.active{color:var(--solrak-pos-blue)!important;border-color:var(--solrak-pos-blue)!important;background:#eef6ff!important;box-shadow:inset 0 -2px 0 var(--solrak-pos-blue)!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frTicketNew{width:100%;height:31px;margin-top:5px;padding:4px 8px!important;border-radius:2px!important;background:#fff!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frPosTotals{margin-top:auto!important;padding:9px 0 0!important;border-top:1px solid var(--solrak-pos-border)!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frPosTotals>div{padding:2px 0!important;font-size:11px}
 html[data-solrak-professional-pos="1"] #tab-pos .frPosGrand{margin-top:5px!important;padding-top:7px!important;font-size:31px!important;color:var(--solrak-pos-text)!important}
 html[data-solrak-professional-pos="1"] #tab-pos .frPosGrand strong{color:var(--solrak-pos-blue)!important;font-weight:600!important}
 html[data-solrak-professional-pos="1"] #tab-pos #posCharge{height:48px;min-height:48px!important;margin-top:7px!important;border-radius:2px!important;background:var(--solrak-pos-blue)!important;font-size:13px!important;font-weight:850!important;text-transform:uppercase;box-shadow:none!important}
 html[data-solrak-professional-pos="1"] #tab-pos #posCharge:hover{background:var(--solrak-pos-blue-dark)!important}
 html[data-solrak-professional-pos="1"] #tab-pos #posReceipt{font-size:9px}
}
.frPayDialog{width:min(1120px,calc(100% - 36px))!important;max-width:1120px!important;border-radius:4px!important;overflow:hidden!important}
.frPayDialog::backdrop{background:rgba(18,26,34,.72)!important;backdrop-filter:blur(2px)!important}
.frPayHead{height:46px!important;padding:0 20px!important;background:var(--solrak-pos-blue)!important}
.frPayHead strong{font-size:15px!important;letter-spacing:.01em}
.frPayBody{padding:18px 24px 20px!important;background:#fff}
.frPaySummary{grid-template-columns:190px 1fr 190px!important;align-items:start!important}
.frPayTicket{padding-top:5px!important}
.frPayTicket strong{font-size:17px!important}
.frPayTotal span{font-size:22px!important;color:#252f39}
.frPayTotal strong{font-size:58px!important;color:var(--solrak-pos-blue)!important;font-weight:450!important}
.frPaySecure{text-align:right;padding-top:6px;color:#268059;font-size:12px;font-weight:800}.frPaySecure small{color:#7b8792;font-weight:500}
.frPayInstruction{margin:12px 0 8px;color:#687684;font-size:11px}
.frPayMethods{margin:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}
.frPayMethod{min-height:128px!important;padding:14px!important;border:1px solid #cfd6dd!important;border-radius:3px!important;background:#fff!important;text-align:left;box-sizing:border-box;cursor:pointer}
.frPayMethod.active{border-color:var(--solrak-pos-blue)!important;background:#f5f9fe!important;box-shadow:inset 0 -3px 0 var(--solrak-pos-blue)!important}
.frPayMethodIcon{display:block;font-size:25px!important;color:var(--solrak-pos-blue)!important;font-weight:800}
.frPayMethod b{display:block;margin:7px 0 9px;font-size:14px}
.frPayMethod label{display:block;color:#77838e;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.frPayAmount{width:100%;height:34px;margin-top:3px;padding:4px 7px;border:0;border-bottom:2px solid #87939e;background:#f2f4f6;font-size:16px;box-sizing:border-box;outline:none}
.frPayAmount:focus{border-color:var(--solrak-pos-blue);background:#fff}
.frPayDetails{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px;padding:13px 14px;background:#f7f8f9;border:1px solid #e3e7eb}
.frPayDetails label{font-size:10px;font-weight:750;color:#64717d}.frPayDetails .field{margin-top:5px!important;border-radius:2px!important;font-size:14px!important}
.frPayChange{display:flex;justify-content:space-between;margin-top:5px;color:#5c6873;font-size:11px}.frPayChange strong{color:#268059}
.frPayFooter{display:grid;grid-template-columns:170px 1fr auto;gap:18px;align-items:end;margin-top:14px}
.frPayPaid span{display:block;color:#65727e;font-size:11px}.frPayPaid strong{display:block;margin-top:3px;font-size:22px;color:#263442}
.frPayBalance{justify-content:flex-end!important;margin:0!important;font-size:21px!important}.frPayBalance strong{font-size:38px!important;color:var(--solrak-pos-blue)!important}
.frPayActions{margin:0!important}.frPayActions button{height:42px;min-width:135px!important;border-radius:2px!important;text-transform:uppercase;font-size:11px;font-weight:850}
@media(max-width:900px){.frPaySummary,.frPayFooter{grid-template-columns:1fr!important}.frPaySecure{text-align:left}.frPayMethods{grid-template-columns:1fr 1fr!important}.frPayDetails{grid-template-columns:1fr!important}.frPayTotal strong{font-size:44px!important}}
`;
    document.head.appendChild(style);
  }

  function posIsActive() {
    const panel = byId("tab-pos");
    return !!panel && !panel.classList.contains("hidden");
  }

  function moveTickets() {
    const bar = document.querySelector("#tab-pos>.frTicketBar");
    const preview = byId("posProductPreview");
    const summary = preview?.closest("aside.summary");
    if (bar && preview && summary && bar.parentElement !== summary)
      preview.insertAdjacentElement("afterend", bar);
  }

  function updateMode() {
    moveTickets();
    if (posIsActive())
      document.documentElement.dataset.solrakProfessionalPos = "1";
    else delete document.documentElement.dataset.solrakProfessionalPos;
  }

  function mount() {
    injectStyle();
    moveTickets();
    updateMode();
  }

  function boot() {
    mount();
    document.addEventListener(
      "click",
      (event) => {
        if (event.target?.closest?.(".nav [data-tab]"))
          setTimeout(updateMode, 0);
      },
      true,
    );
    const main = document.querySelector("main.shell") || document.body;
    new MutationObserver(updateMode).observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    setTimeout(mount, 250);
    setTimeout(mount, 1000);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  window.SOLRAKProfessionalPOSV0166 = { version: VERSION, mount, updateMode };
})();
