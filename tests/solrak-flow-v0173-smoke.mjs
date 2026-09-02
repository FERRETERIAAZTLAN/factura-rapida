import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source=fs.readFileSync('solrak-flow-v0173.js','utf8');
for(const marker of ['0.1.73','openingAmount: 0','deposit','withdrawal','fielFinish.disabled','dialog.fielDialog','#posPayDialog.frPosDialog','SOLRAKFlowV0173']){
  if(!source.includes(marker)) throw new Error('Falta marcador: '+marker);
}
if(/cfdi-api|finkok|Recargas y Servicios/i.test(source)) throw new Error('La capa v0.1.73 invadió CFDI/Finkok o Recargas');
if(/fetch\s*\(|XMLHttpRequest/i.test(source)) throw new Error('v0.1.73 no debe saltarse FacturaRapidaPOS.api');

const dom=new JSDOM(`<!doctype html><html data-solrak-fiel="1"><head></head><body>
<button id="fielFinishSale" class="fielFinish disabled"></button>
<div id="fielCashMovementTitle"></div><input id="fielCashMovementType"><input id="fielCashConcept"><input id="fielCashAmount">
</body></html>`,{runScripts:'outside-only',url:'https://solrak.local'});
const {window}=dom;
let openCalls=0,refreshCalls=0;
const state={registers:[{id:'reg-1'}],openSession:null};
window.FacturaRapidaPOS={
  state,
  cart:[{id:'p1',qty:1}],
  api:async(action,payload)=>{
    if(action!=='openCash') throw new Error('Acción inesperada '+action);
    if(payload.openingAmount!==0) throw new Error('La sesión automática debe iniciar en 0');
    openCalls++;
    state.openSession={id:'auto-1',register_id:'reg-1',opening_amount:0,status:'open'};
    return {ok:true,session:state.openSession};
  },
  refresh:async()=>{refreshCalls++;},
};
window.notice=()=>{};
window.console=console;
vm.runInContext(source,dom.getInternalVMContext());
await window.SOLRAKFlowV0173.ensureAutomaticCashSession();
if(openCalls!==1||refreshCalls!==1||!state.openSession) throw new Error('No abrió la sesión automática real');
window.SOLRAKFlowV0173.configureCashMovement('cash-in');
if(window.document.getElementById('fielCashMovementType').value!=='deposit') throw new Error('Entrada no usa depósito');
window.SOLRAKFlowV0173.configureCashMovement('cash-out');
if(window.document.getElementById('fielCashMovementType').value!=='withdrawal') throw new Error('Salida no usa retiro');
const style=window.document.getElementById('solrakFlowV0173Style')?.textContent||'';
for(const marker of ['opacity:1!important','width:calc(100vw - var(--fiel-side,246px))!important','height:calc(100vh - var(--fiel-top,58px))!important']) if(!style.includes(marker)) throw new Error('Pantalla completa/botón sólido incompleto: '+marker);
console.log('SOLRAK_V0173_CONTINUOUS_CASH_FULLSCREEN_OK');
process.exit(0);
