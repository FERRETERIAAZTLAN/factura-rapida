import fs from "node:fs";
import { JSDOM } from "jsdom";

const code=fs.readFileSync("solrak-formularios-v0186.js","utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(!/cfdi-api|finkok|completeSale/i.test(code),"Formularios v0.1.86 invadieron facturación/cobro");
assert(/min_stock/.test(code)&&/max_stock/.test(code)&&/wholesale/.test(code)&&/active/.test(code),"Faltan campos reales de producto");

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<dialog id="productDialog" open><form id="productForm" class="form-grid">
<label>Código<input id="pCode" class="field"></label><label>Producto<input id="pName" class="field" required></label>
<label>Costo<input id="pCost" class="field" type="number"></label><label>Precio público<input id="pPrice" class="field" type="number"></label>
<label>Existencia<input id="pStock" class="field" type="number"></label><label>Unidad<input id="pUnit" class="field"></label>
<label>Clave SAT<input id="pSat" class="field"></label><label>Clave unidad SAT<input id="pUnitKey" class="field"></label>
<label>IVA<input id="pIva" class="field" type="number"></label><label>Categoría<input id="pCategory" class="field"></label>
<label class="span2"><span><input id="pTaxIncluded" type="checkbox" checked> IVA incluido</span></label>
<div class="span2 actions"><button type="submit">Guardar</button><button id="deleteProduct" type="button">Dar de baja</button></div></form></dialog>
<section id="tab-clientes"><form id="clientForm" class="form-grid">
<label class="span2">Nombre<input id="clientName" class="field"></label><label>RFC<input id="clientRFC" class="field"></label><label>CP<input id="clientCP" class="field"></label>
<label class="span2">Régimen<input id="clientRegime" class="field"></label><label class="span2">Uso CFDI<input id="clientCfdiUse" class="field"></label>
<label>Correo<input id="clientEmail" class="field"></label><label>WhatsApp<input id="clientPhone" class="field"></label><div class="span2 actions"><button id="clientSave" type="submit">Guardar cliente</button><button id="cancelClientEdit" type="button">Cancelar</button></div>
</form></section>
</body></html>`,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://example.test"});
const {window}=dom;const doc=window.document;
if(window.HTMLDialogElement)window.HTMLDialogElement.prototype.close=function(){this.removeAttribute("open")};
window.session={user:{role:"admin"}};
window.editingProductId="p1";window.editingClientId="c1";
window.products=[{id:"p1",code:"ABC1",name:"Martillo",cost:50,price:100,wholesale:85,stock:1,min_stock:2,max_stock:12,unit:"Pieza",sat_key:"27112004",unit_key:"H87",iva:16,category:"Herramienta",price_includes_tax:true,active:true}];
window.clients=[{id:"c1",name:"Cliente Uno",rfc:"XAXX010101000",postal_code:"63000",regime:"626",cfdi_use:"G03",email:"a@example.test",phone:"123",active:true}];
const calls=[];window.api=async(action,payload)=>{calls.push({action,payload});if(action==="saveProduct")return{ok:true,product:payload.product};if(action==="saveClient")return{ok:true,client:{...payload.client,id:"c1"}};return{ok:true}};
const clientCalls=[];window.SOLRAKClientsCreditV0181={api:async(action,payload)=>{clientCalls.push({action,payload});return{ok:true}},refresh:async()=>{}};
window.loadAll=async()=>{};window.busy=()=>{};window.notice=()=>{};window.resetClient=()=>{};

// Valores base que el formulario clásico cargaría al abrir.
Object.entries({pCode:"ABC1",pName:"Martillo",pCost:"50",pPrice:"100",pStock:"1",pUnit:"Pieza",pSat:"27112004",pUnitKey:"H87",pIva:"16",pCategory:"Herramienta",clientName:"Cliente Uno",clientRFC:"XAXX010101000",clientCP:"63000",clientRegime:"626",clientCfdiUse:"G03",clientEmail:"a@example.test",clientPhone:"123"}).forEach(([id,value])=>doc.getElementById(id).value=value);

window.eval(code);doc.dispatchEvent(new window.Event("DOMContentLoaded"));await new Promise(r=>setTimeout(r,60));
assert(window.SOLRAKFormulariosV0186?.version==="0.1.86","No montó v0.1.86");
assert(doc.documentElement.dataset.solrakForms86==="1","Falta marca de formularios operativos");
assert(doc.getElementById("pWholesale")&&doc.getElementById("pMinStock")&&doc.getElementById("pMaxStock")&&doc.getElementById("pActive"),"No insertó campos de producto");
assert(doc.getElementById("pWholesale").value==="85","No carga precio mayoreo existente");
assert(doc.getElementById("pMinStock").value==="2"&&doc.getElementById("pMaxStock").value==="12","No carga mínimos/máximos");
assert(doc.getElementById("solrakProductValidation").classList.contains("warn"),"No alerta inventario bajo");

doc.getElementById("pMinStock").value="10";doc.getElementById("pMaxStock").value="5";
assert(window.SOLRAKFormulariosV0186.validateProduct()===false,"No bloquea mínimo mayor al máximo");
doc.getElementById("pMinStock").value="2";doc.getElementById("pMaxStock").value="12";doc.getElementById("pStock").value="5";doc.getElementById("pWholesale").value="80";doc.getElementById("pActive").checked=false;
doc.getElementById("productForm").dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,30));
const saved=calls.find(c=>c.action==="saveProduct")?.payload?.product;
assert(saved?.wholesale===80&&saved?.min_stock===2&&saved?.max_stock===12,"Guardado real no incluye mayoreo/min/max");
assert(saved?.active===false,"Guardado real no incluye estado activo lógico");

assert(doc.getElementById("clientActive"),"Falta check de estado del cliente");
assert(doc.getElementById("clientActive").disabled===false,"Administrador no puede cambiar estado del cliente existente");
doc.getElementById("clientActive").checked=false;
doc.getElementById("clientForm").dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,30));
assert(calls.some(c=>c.action==="saveClient"),"Cliente no usa guardado real");
assert(clientCalls.some(c=>c.action==="setClientActive"&&c.payload.active===false),"Estado lógico del cliente no usa client-api real");

window.close();
console.log("SOLRAK_FORMULARIOS_V0186_OK grid=dense wholesale=true minmax=true lowStockValidation=true logicalActive=true clientActive=true");