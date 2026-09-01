(() => {
  "use strict";

  const VERSION = "0.1.68";
  const STYLE_ID = "solrakSimpleUIV0168Style";
  const byId = (id) => document.getElementById(id);

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
:root{
  --solrak-simple-side:210px;
  --solrak-simple-top:56px;
  --solrak-simple-accent:#176fd1;
  --solrak-simple-accent-dark:#0f5caf;
  --solrak-simple-line:#dfe3e7;
  --solrak-simple-soft:#f5f6f7;
  --solrak-simple-text:#252d35;
  --solrak-simple-muted:#69747e;
}
html[data-solrak-simple-ui="1"] #frBrandPill{display:none!important;visibility:hidden!important;pointer-events:none!important}
html[data-solrak-simple-ui="1"] #solrakContextBar,
html[data-solrak-simple-ui="1"] #frReadyPanel,
html[data-solrak-simple-ui="1"] main.shell>.statusgrid,
html[data-solrak-simple-ui="1"] main.shell>footer{display:none!important}

@media(min-width:1050px){
  html[data-solrak-simple-ui="1"],
  html[data-solrak-simple-ui="1"] body{background:#fff!important;color:var(--solrak-simple-text)!important;font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif!important}

  html[data-solrak-simple-ui="1"] .nav{
    position:fixed!important;z-index:7200;left:0;top:var(--solrak-native-top,0px);bottom:0;
    width:var(--solrak-simple-side)!important;height:auto!important;box-sizing:border-box;
    display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:2px!important;
    padding:0 8px 10px!important;overflow-y:auto!important;
    border:0!important;border-right:1px solid var(--solrak-simple-line)!important;border-radius:0!important;
    background:#f7f8f9!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"] #solrakAppBrand{
    min-height:58px;box-sizing:border-box;margin:0 -8px 7px!important;padding:10px 13px!important;
    border-bottom:1px solid var(--solrak-simple-line)!important;background:#fff!important;gap:9px!important;
  }
  html[data-solrak-simple-ui="1"] #solrakAppMark{width:34px!important;height:34px!important;flex:0 0 34px!important}
  html[data-solrak-simple-ui="1"] #solrakAppBrand strong{color:#24303b!important;font-size:16px!important;letter-spacing:.045em!important}
  html[data-solrak-simple-ui="1"] #solrakAppBrand small{color:#77828d!important;font-size:9px!important;margin-top:3px!important}
  html[data-solrak-simple-ui="1"] .solrakNavSection{display:none!important}
  html[data-solrak-simple-ui="1"] .nav>button{
    display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:9px!important;
    width:100%!important;min-height:40px!important;margin:0!important;padding:0 10px!important;
    border:0!important;border-radius:2px!important;background:transparent!important;box-shadow:none!important;
    color:#414b55!important;text-align:left!important;font:600 12px/1 "Segoe UI",Arial,sans-serif!important;
  }
  html[data-solrak-simple-ui="1"] .nav>button:hover{background:#eceff2!important;color:#1f2a34!important}
  html[data-solrak-simple-ui="1"] .nav>button.active,
  html[data-solrak-simple-ui="1"] .nav>button[aria-current="page"]{
    background:#eaf2fb!important;color:#125fae!important;box-shadow:inset 3px 0 0 var(--solrak-simple-accent)!important;
  }
  html[data-solrak-simple-ui="1"] .nav>button .solrakNavIcon{width:18px!important;height:18px!important;flex:0 0 18px!important;color:#68747f!important}
  html[data-solrak-simple-ui="1"] .nav>button.active .solrakNavIcon{color:var(--solrak-simple-accent)!important}
  html[data-solrak-simple-ui="1"] .nav>button .solrakNavText{flex:1!important}
  html[data-solrak-simple-ui="1"] .nav>button .count{
    min-width:18px!important;padding:2px 4px!important;border:0!important;border-radius:2px!important;
    background:#e3e7ea!important;color:#64717c!important;font-size:9px!important;text-align:center!important;
  }
  html[data-solrak-simple-ui="1"] #solrakNavFooter{
    margin-top:auto!important;padding:10px 9px 2px!important;border-top:1px solid var(--solrak-simple-line)!important;
    color:#7b858e!important;font-size:9px!important;
  }
  html[data-solrak-simple-ui="1"] #solrakNavFooter strong{color:#3e4851!important;font-size:10px!important}

  html[data-solrak-simple-ui="1"] main.shell{
    box-sizing:border-box!important;width:auto!important;max-width:none!important;min-height:calc(100vh - var(--solrak-native-top,0px))!important;
    margin-left:var(--solrak-simple-side)!important;padding:14px 18px 24px!important;background:#fff!important;
  }
  html[data-solrak-simple-ui="1"] main.shell>.top{
    position:sticky!important;z-index:6500;top:var(--solrak-native-top,0px)!important;
    min-height:var(--solrak-simple-top)!important;box-sizing:border-box!important;margin:-14px -18px 14px!important;padding:8px 18px!important;
    display:flex!important;align-items:center!important;border:0!important;border-radius:0!important;
    background:var(--solrak-simple-accent)!important;box-shadow:none!important;color:#fff!important;
  }
  html[data-solrak-simple-ui="1"] main.shell>.top .eyebrow{display:none!important}
  html[data-solrak-simple-ui="1"] main.shell>.top h1{margin:0!important;color:#fff!important;font-size:17px!important;letter-spacing:.02em!important}
  html[data-solrak-simple-ui="1"] main.shell>.top #businessName{margin-top:2px!important;color:rgba(255,255,255,.82)!important;font-size:10px!important}
  html[data-solrak-simple-ui="1"] main.shell>.top .top-actions{gap:6px!important}
  html[data-solrak-simple-ui="1"] main.shell>.top .pill{
    min-height:27px!important;box-sizing:border-box!important;padding:5px 8px!important;border:1px solid rgba(255,255,255,.24)!important;
    border-radius:2px!important;background:rgba(255,255,255,.10)!important;color:#fff!important;font-size:10px!important;
  }
  html[data-solrak-simple-ui="1"] main.shell>.top .secondary{
    min-height:29px!important;padding:5px 9px!important;border:1px solid rgba(255,255,255,.42)!important;
    border-radius:2px!important;background:transparent!important;color:#fff!important;box-shadow:none!important;font-size:10px!important;
  }

  html[data-solrak-simple-ui="1"] .tab-panel{padding-top:0!important}
  html[data-solrak-simple-ui="1"] .card{
    border:1px solid var(--solrak-simple-line)!important;border-radius:3px!important;background:#fff!important;
    box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"] .card h2{font-size:14px!important;font-weight:700!important;letter-spacing:0!important}
  html[data-solrak-simple-ui="1"] .grid2,
  html[data-solrak-simple-ui="1"] .split,
  html[data-solrak-simple-ui="1"] .stack{gap:10px!important}
  html[data-solrak-simple-ui="1"] .field,
  html[data-solrak-simple-ui="1"] input,
  html[data-solrak-simple-ui="1"] select,
  html[data-solrak-simple-ui="1"] textarea,
  html[data-solrak-simple-ui="1"] .search{
    border-radius:2px!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"] .primary,
  html[data-solrak-simple-ui="1"] .secondary,
  html[data-solrak-simple-ui="1"] .ghost{
    min-height:34px;border-radius:2px!important;box-shadow:none!important;font-family:inherit!important;
  }
  html[data-solrak-simple-ui="1"] .primary{border-color:var(--solrak-simple-accent)!important;background:var(--solrak-simple-accent)!important}
  html[data-solrak-simple-ui="1"] .primary:hover{border-color:var(--solrak-simple-accent-dark)!important;background:var(--solrak-simple-accent-dark)!important}
  html[data-solrak-simple-ui="1"] .table-wrap{border:1px solid var(--solrak-simple-line)!important;border-radius:2px!important;box-shadow:none!important}
  html[data-solrak-simple-ui="1"] table{font-size:12px!important}
  html[data-solrak-simple-ui="1"] table th{
    height:34px!important;padding-top:6px!important;padding-bottom:6px!important;border-bottom:1px solid #d9dde1!important;
    background:#f0f2f4!important;color:#4d5862!important;font-size:10px!important;letter-spacing:.02em!important;
  }
  html[data-solrak-simple-ui="1"] table td{padding-top:7px!important;padding-bottom:7px!important;border-bottom-color:#eceff1!important}
  html[data-solrak-simple-ui="1"] table tbody tr:hover td{background:#f5f8fb!important}

  html[data-solrak-simple-ui="1"] #tab-configuracion>.split{
    width:min(920px,100%)!important;margin:0 auto!important;grid-template-columns:1fr!important;
  }
  html[data-solrak-simple-ui="1"] #solrakSimpleConfigTools{
    width:min(920px,100%);box-sizing:border-box;margin:0 auto 10px;padding:9px 11px;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    border:1px solid var(--solrak-simple-line);border-radius:3px;background:#f8f9fa;
  }
  html[data-solrak-simple-ui="1"] #solrakSimpleConfigTools span{color:var(--solrak-simple-muted);font-size:10px}
  html[data-solrak-simple-ui="1"] #solrakSimpleAdvancedToggle{min-height:30px!important;padding:5px 10px!important;font-size:10px!important}

  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] body{overflow:hidden!important;background:#fff!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] main.shell{
    height:calc(100vh - var(--solrak-native-top,0px))!important;min-height:0!important;overflow:hidden!important;padding:0!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] main.shell>.top{
    position:relative!important;top:0!important;height:var(--solrak-simple-top)!important;min-height:var(--solrak-simple-top)!important;
    margin:0!important;padding:8px 16px!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos{
    height:calc(100% - var(--solrak-simple-top))!important;min-height:0!important;box-sizing:border-box!important;
    display:grid!important;grid-template-rows:44px minmax(0,1fr)!important;gap:0!important;padding:0!important;background:#fff!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop{
    height:44px!important;min-height:44px!important;box-sizing:border-box!important;margin:0!important;padding:0 14px!important;
    display:flex!important;align-items:center!important;border:0!important;border-bottom:1px solid var(--solrak-simple-line)!important;
    background:#fff!important;color:var(--solrak-simple-text)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop>div:first-child{display:flex!important;align-items:center!important;gap:8px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop .eyebrow,
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop .frPosHint{display:none!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop h2{margin:0!important;color:#303942!important;font-size:13px!important;font-weight:700!important;opacity:1!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop .actions{display:flex!important;align-items:center!important;gap:5px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop .frPosState{
    min-height:29px!important;box-sizing:border-box!important;padding:5px 8px!important;border-radius:2px!important;font-size:10px!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosTop button{min-height:29px!important;padding:5px 9px!important;border-radius:2px!important;font-size:10px!important}

  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid{
    height:100%!important;min-height:0!important;display:grid!important;
    grid-template-columns:minmax(0,1fr) 270px!important;gap:0!important;background:#fff!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack{
    height:100%!important;min-height:0!important;display:grid!important;grid-template-rows:70px minmax(0,1fr)!important;
    gap:0!important;border-right:1px solid var(--solrak-simple-line)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article{
    min-height:0!important;box-sizing:border-box!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article:first-child{
    position:relative!important;padding:10px 14px 7px!important;border-bottom:1px solid var(--solrak-simple-line)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article:first-child .card-head,
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid>.stack>article:last-child{display:none!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosSearch{display:grid!important;grid-template-columns:minmax(0,1fr) 96px!important;grid-template-rows:36px 9px!important;gap:3px 7px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosSearch::after{
    content:"BUSCAR";grid-column:2;grid-row:1;display:grid;place-items:center;border-radius:2px;background:var(--solrak-simple-accent);color:#fff;font-size:10px;font-weight:800;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosSearch input{
    grid-column:1;grid-row:1;height:36px!important;box-sizing:border-box!important;padding:7px 10px!important;border:0!important;border-bottom:2px solid var(--solrak-simple-accent)!important;
    border-radius:0!important;background:#f3f4f5!important;font-size:13px!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosSearch .frPosHint{grid-column:1/-1!important;grid-row:2!important;margin:0!important;color:#7b858f!important;font-size:8px!important;line-height:9px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosResults{
    position:absolute!important;z-index:30;left:14px!important;right:117px!important;top:47px!important;max-height:255px!important;margin:0!important;
    overflow:auto!important;border:1px solid var(--solrak-simple-line)!important;border-radius:0!important;background:#fff!important;box-shadow:0 12px 24px rgba(33,42,50,.13)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosResults>.frPosEmpty{display:none!important}

  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartCard{height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartCard>.card-head{
    height:39px!important;min-height:39px!important;box-sizing:border-box!important;margin:0!important;padding:0 13px!important;border-bottom:1px solid var(--solrak-simple-line)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartCard>.card-head h2{font-size:12px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartCard>.card-head button{min-height:28px!important;border:0!important;background:transparent!important;color:#a03f3f!important;font-size:9px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartCard>label{
    height:38px!important;min-height:38px!important;box-sizing:border-box!important;margin:0!important;padding:0 13px!important;
    display:grid!important;grid-template-columns:98px minmax(0,1fr)!important;align-items:center!important;gap:7px!important;
    border-bottom:1px solid var(--solrak-simple-line)!important;font-size:10px!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartCard>label .field{height:28px!important;min-height:28px!important;padding:3px 7px!important;font-size:10px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartHead,
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosLine{
    display:grid!important;grid-template-columns:86px minmax(180px,1fr) 116px 86px 102px!important;gap:7px!important;align-items:center!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartHead{
    height:32px!important;min-height:32px!important;box-sizing:border-box!important;padding:0 9px!important;
    border-bottom:1px solid #d9dde1!important;background:#eef0f2!important;color:#59636d!important;font-size:9px!important;font-weight:800!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCartHead span:nth-child(n+3){text-align:right!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosCart{
    flex:1!important;min-height:0!important;max-height:none!important;margin:0!important;overflow:auto!important;
    border:0!important;border-radius:0!important;background:#fff!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosLine{
    min-height:45px!important;box-sizing:border-box!important;padding:4px 9px!important;border-bottom:1px solid #eceff1!important;
    background:#fff!important;font-size:10px!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosLine:nth-child(even){background:#fafbfb!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosLine:hover{background:#f2f6fa!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosProduct strong{font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosQty{justify-self:end!important;border-radius:2px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosQty button{width:24px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosQty input{width:44px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosUnitPrice,
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] .frPosLineTotal{text-align:right!important;white-space:nowrap!important}

  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos aside.summary{
    position:static!important;height:100%!important;min-height:0!important;box-sizing:border-box!important;margin:0!important;padding:10px!important;padding-bottom:max(10px,env(safe-area-inset-bottom))!important;
    display:flex!important;flex-direction:column!important;border:0!important;border-radius:0!important;background:#f8f9fa!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos aside.summary>.card-head{display:none!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPreview{
    height:126px!important;min-height:126px!important;margin:0 0 9px!important;border:1px solid var(--solrak-simple-line)!important;border-radius:2px!important;background:#fff!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPreview img{height:88px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPreviewMeta{padding:5px 7px!important;font-size:9px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frTicketBar{display:block!important;margin:0!important;padding:0!important;overflow:visible!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frTicketBar::before{
    content:"TICKETS ABIERTOS";display:block;margin:0 0 5px;color:#707b85;font-size:8px;font-weight:850;letter-spacing:.08em;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos #posTickets{display:grid!important;grid-template-columns:1fr 1fr!important;gap:4px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frTicket{
    min-width:0!important;min-height:38px!important;padding:4px 6px!important;border-radius:2px!important;background:#fff!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frTicket.active{
    border-color:var(--solrak-simple-accent)!important;background:#edf4fb!important;color:#125fae!important;box-shadow:inset 0 -2px 0 var(--solrak-simple-accent)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frTicketNew{
    width:100%!important;height:29px!important;margin-top:4px!important;padding:3px 7px!important;border-radius:2px!important;background:#fff!important;font-size:10px!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPosTotals{
    margin-top:auto!important;padding:8px 0 0!important;border-top:1px solid var(--solrak-simple-line)!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPosTotals>div{padding:2px 0!important;font-size:10px!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPosGrand{
    margin-top:4px!important;padding-top:6px!important;color:#2c353d!important;font-size:29px!important;font-weight:500!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos .frPosGrand strong{color:var(--solrak-simple-accent)!important;font-weight:500!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos #posCharge{
    position:relative!important;z-index:2!important;height:46px!important;min-height:46px!important;margin-top:6px!important;
    border-radius:2px!important;background:var(--solrak-simple-accent)!important;font-size:12px!important;font-weight:850!important;text-transform:uppercase!important;box-shadow:none!important;
  }
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos #posCharge:hover{background:var(--solrak-simple-accent-dark)!important}
  html[data-solrak-simple-ui="1"][data-solrak-professional-pos="1"] #tab-pos #posReceipt{font-size:8px!important}
}
`;
    document.head.appendChild(style);
  }

  function advancedConfigCard() {
    const cards = [...document.querySelectorAll("#tab-configuracion article.card")];
    return (
      cards.find((card) =>
        /preparaci[oó]n para timbrado|\bcsd\b|\bpac\b/i.test(
          card.textContent || "",
        ),
      ) || null
    );
  }

  function ensureSimpleConfig() {
    const panel = byId("tab-configuracion");
    const card = advancedConfigCard();
    if (!panel || !card) return;
    card.classList.add("solrakSimpleAdvancedCard");
    let tools = byId("solrakSimpleConfigTools");
    if (!tools) {
      tools = document.createElement("div");
      tools.id = "solrakSimpleConfigTools";
      tools.innerHTML =
        '<span>Las opciones técnicas permanecen disponibles cuando las necesites.</span><button id="solrakSimpleAdvancedToggle" class="secondary" type="button" aria-expanded="false">Configuración avanzada</button>';
      panel.insertBefore(tools, panel.firstChild);
    }
    const toggle = byId("solrakSimpleAdvancedToggle");
    if (!toggle || toggle.dataset.bound === "1") return;
    card.hidden = true;
    toggle.dataset.bound = "1";
    toggle.onclick = () => {
      const opening = card.hidden;
      card.hidden = !opening;
      toggle.setAttribute("aria-expanded", opening ? "true" : "false");
      toggle.textContent = opening
        ? "Ocultar configuración avanzada"
        : "Configuración avanzada";
      if (opening) card.scrollIntoView({ block: "start", behavior: "smooth" });
    };
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset.solrakSimpleUi = "1";
    ensureSimpleConfig();
  }

  function boot() {
    mount();
    let timer = null;
    const main = document.querySelector("main.shell") || document.body;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(mount, 20);
    }).observe(main, { childList: true, subtree: true });
    document.addEventListener(
      "click",
      (event) => {
        if (event.target?.closest?.('.nav [data-tab="configuracion"]'))
          setTimeout(ensureSimpleConfig, 0);
      },
      true,
    );
    setTimeout(mount, 250);
    setTimeout(mount, 1000);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSimpleUIV0168 = { version: VERSION, mount };
})();
