(() => {
  "use strict";

  const VERSION = "0.1.92";
  const PRINTER_KEY = "solrak:native:printer:v0192";
  const PORT_KEY = "solrak:native:scale-port:v0192";
  const BAUD_KEY = "solrak:native:scale-baud:v0192";
  const AUTO_KEY = "solrak:native:scale-auto:v0192";
  const byId = (id) => document.getElementById(id);
  let nativeInfo = null;
  let scaleConnected = false;
  let liveTimer = null;

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK native", message);
  }
  function get(key, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
  function set(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  function invokeFn() { return window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null; }
  async function invoke(command, args = {}) {
    const fn = invokeFn();
    if (!fn) throw new Error("Esta función requiere la aplicación SOLRAK para Windows.");
    return await fn(command, args);
  }
  async function info() {
    if (nativeInfo) return nativeInfo;
    nativeInfo = await invoke("desktop_info");
    if (!nativeInfo?.native || !nativeInfo?.hardwareBridge) throw new Error("El puente nativo de Windows no está disponible.");
    return nativeInfo;
  }
  function exactFolio(payload = {}) {
    const value = String(payload.saleNumber ?? payload.folio ?? payload.ticketNumber ?? "").trim().replace(/^#/, "");
    if (!value) throw new Error("El ticket no contiene un folio exacto.");
    return value;
  }
  function money(value) { return Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function clean(value, max = 80) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max); }
  function buildTicketText(payload = {}) {
    const folio = exactFolio(payload), lines = [];
    const business = clean(payload.businessName || payload.business || "SOLRAK", 42);
    lines.push(business.toUpperCase(), `TICKET DE VENTA #${folio}`);
    if (payload.createdAt) { try { lines.push(new Date(payload.createdAt).toLocaleString("es-MX")); } catch {} }
    if (payload.customerName) lines.push(`Cliente: ${clean(payload.customerName, 48)}`);
    lines.push("------------------------------------------");
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.lines) ? payload.lines : [];
    for (const item of items) {
      const name = clean(item.name || item.description || "Producto", 36);
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const unit = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
      const total = Number(item.total ?? qty * unit);
      lines.push(name);
      lines.push(`${qty.toLocaleString("es-MX", { maximumFractionDigits: 3 })} x $${money(unit)}    $${money(total)}`);
    }
    lines.push("------------------------------------------");
    if (payload.subtotal != null) lines.push(`Subtotal: $${money(payload.subtotal)}`);
    if (payload.tax != null || payload.iva != null) lines.push(`IVA:      $${money(payload.tax ?? payload.iva)}`);
    lines.push(`TOTAL:    $${money(payload.total)}`);
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    for (const p of payments) lines.push(`${clean(p.method || "Pago", 18)}: $${money(p.amount)}`);
    if (Number(payload.change) > 0) lines.push(`Cambio:   $${money(payload.change)}`);
    if (payload.note) lines.push(`Nota: ${clean(payload.note, 70)}`);
    if (payload.footer) lines.push("", clean(payload.footer, 100));
    lines.push("");
    return lines.join("\n");
  }

  async function listPorts() { await info(); return await invoke("list_serial_ports"); }
  async function listPrinters() { await info(); return await invoke("list_windows_printers"); }
  async function connectScale(config = {}) {
    await info();
    const portName = String(config.portName || config.port || get(PORT_KEY)).trim();
    const baudRate = Number(config.baudRate || config.baud || get(BAUD_KEY, "9600"));
    if (!portName) throw new Error("Selecciona el puerto COM de la báscula.");
    const result = await invoke("scale_connect", { portName, baudRate });
    set(PORT_KEY, portName); set(BAUD_KEY, baudRate); scaleConnected = true; return result;
  }
  async function disconnectScale() { try { await invoke("scale_disconnect"); } finally { scaleConnected = false; } }
  async function readWeight() { return await invoke("scale_read"); }

  async function printTicket(payload = {}) {
    const native = await info();
    if (!native.directPrint) throw new Error("Esta versión de SOLRAK no habilita impresión directa.");
    const printerName = String(payload.printerName || payload.printer || get(PRINTER_KEY)).trim();
    if (!printerName) throw new Error("Selecciona una impresora térmica en Configuración.");
    const folio = exactFolio(payload);
    const result = await invoke("print_thermal_ticket", { job: { printerName, folio, text: buildTicketText(payload), barcode: payload.barcode !== false && payload.barcode !== null, cut: payload.cut !== false } });
    if (!result?.ok) throw new Error("Windows no confirmó la impresión del ticket.");
    return result;
  }

  function installBridge() {
    if (!invokeFn()) return false;
    const api = { version: VERSION, ports: { list: listPorts }, listPorts, scale: { connect: connectScale, disconnect: disconnectScale, readWeight }, readWeight, printer: { list: listPrinters, printTicket }, printTicket };
    window.SOLRAKDesktop = api;
    window.solrakDesktop = api;
    return true;
  }

  function ensureStyle() {
    if (byId("solrakNative92Style")) return;
    const style = document.createElement("style"); style.id = "solrakNative92Style";
    style.textContent = `#solrakNative92{margin-top:7px}.solrakN92Grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.solrakN92Box{border:1px solid #d5dce1;background:#fff;padding:7px}.solrakN92Box h3{margin:0 0 6px;font-size:11px}.solrakN92Row{display:grid;grid-template-columns:minmax(120px,1fr) 104px auto;gap:5px;align-items:end}.solrakN92Row label{font-size:9px;font-weight:800}.solrakN92Row select{width:100%;height:30px;margin-top:3px;border:1px solid #cbd3d9;border-radius:3px;background:#fff;padding:3px 5px;font-size:10px}.solrakN92Actions{display:flex;gap:4px}.solrakN92Actions button{height:30px;border:1px solid #c7cfd5;border-radius:3px;background:#fff;padding:0 8px;font-size:9px;font-weight:800}.solrakN92Actions .primary{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrakN92Status{margin-top:6px;padding:5px 6px;border:1px solid #dce2e6;background:#f7f9fa;font-size:9px}.solrakN92Status.ok{background:#effaf3;border-color:#b9dfc7;color:#17673b}.solrakN92Status.bad{background:#fff2f2;border-color:#e5c1c1;color:#943b3b}.solrakN92Weight{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}.solrakN92Note{margin-top:5px;font-size:9px;color:#68747e;line-height:1.35}@media(max-width:900px){.solrakN92Grid{grid-template-columns:1fr}.solrakN92Row{grid-template-columns:1fr 100px}.solrakN92Actions{grid-column:1/-1}}`;
    document.head.appendChild(style);
  }
  function ensureUi() {
    if (byId("solrakNative92")) return true;
    const section = byId("tab-configuracion"); if (!section) return false;
    ensureStyle(); const card = document.createElement("article"); card.id = "solrakNative92"; card.className = "card admin-only";
    card.innerHTML = `<div class="card-head"><div><h2>Hardware Windows nativo</h2><p class="muted small">Impresora RAW/ESC-POS y báscula COM reales. Sin datos simulados.</p></div><span id="solrakN92Bridge" class="solrakN92Status">Comprobando…</span></div><div class="solrakN92Grid"><section class="solrakN92Box"><h3>Impresora térmica</h3><div class="solrakN92Row"><label>Impresora<select id="solrakN92Printer"><option value="">Detectando…</option></select></label><div></div><div class="solrakN92Actions"><button id="solrakN92Printers" type="button">Actualizar</button><button id="solrakN92Test" class="primary" type="button">Probar</button></div></div><div id="solrakN92PrinterStatus" class="solrakN92Status">Selecciona una impresora instalada en Windows.</div><div class="solrakN92Note">Al imprimir desde SOLRAK, Windows recibe bytes RAW/ESC-POS. Si está activado el código de barras, CODE128 contiene únicamente el folio exacto de la venta.</div></section><section class="solrakN92Box"><h3>Báscula USB / COM</h3><div class="solrakN92Row"><label>Puerto<select id="solrakN92Port"><option value="">Selecciona COM…</option></select></label><label>Baudios<select id="solrakN92Baud"><option>9600</option><option>4800</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label><div class="solrakN92Actions"><button id="solrakN92Ports" type="button">Actualizar</button><button id="solrakN92Connect" class="primary" type="button">Conectar</button><button id="solrakN92Disconnect" type="button">Desconectar</button></div></div><label style="font-size:9px;display:flex;gap:5px;align-items:center;margin-top:5px"><input id="solrakN92Auto" type="checkbox"> Conectar automáticamente</label><div id="solrakN92Weight" class="solrakN92Status"><span class="solrakN92Weight">Desconectada</span></div></section></div>`;
    section.appendChild(card); bindUi(); return true;
  }
  async function refreshPrinters() {
    const select = byId("solrakN92Printer"); if (!select) return;
    try { const printers = await listPrinters(), saved = get(PRINTER_KEY); select.innerHTML = `<option value="">Selecciona impresora…</option>${(printers || []).map(p => `<option value="${String(p.name).replace(/"/g,"&quot;")}" data-port="${String(p.portName||"").replace(/"/g,"&quot;")}" data-default="${p.isDefault?"1":"0"}">${p.isDefault?"★ ":""}${p.name}</option>`).join("")}`; if (saved && [...select.options].some(o => o.value === saved)) select.value = saved; else { const def = [...select.options].find(o => o.dataset.default === "1"); if (def) select.value = def.value; } printerChanged(); } catch (e) { notify(e.message || String(e), true); }
  }
  function printerChanged() { const select=byId("solrakN92Printer"), box=byId("solrakN92PrinterStatus"), opt=select?.selectedOptions?.[0]; if (!opt?.value) { if(box){box.className="solrakN92Status";box.textContent="Selecciona una impresora instalada en Windows.";} return; } set(PRINTER_KEY,opt.value); if(box){box.className="solrakN92Status ok";box.textContent=`Directa RAW: ${opt.value}${opt.dataset.port?` · ${opt.dataset.port}`:""}`;} }
  async function testPrinter() { try { const result=await printTicket({ printerName:byId("solrakN92Printer")?.value, saleNumber:"0", businessName:"SOLRAK", items:[{name:"Prueba de impresora",qty:1,unitPrice:0,total:0}], total:0, barcode:false, cut:true }); notify(`Windows confirmó impresión en ${result.printerName}.`); } catch(e){notify(e.message||String(e),true);} }
  async function refreshPorts() { const select=byId("solrakN92Port"); if(!select)return; try { const ports=await listPorts(), saved=get(PORT_KEY); select.innerHTML=`<option value="">Selecciona COM…</option>${(ports||[]).map(p=>`<option value="${String(p.portName).replace(/"/g,"&quot;")}">${p.portName}${p.product?` · ${p.product}`:""}</option>`).join("")}`; if(saved&&[...select.options].some(o=>o.value===saved))select.value=saved; } catch(e){notify(e.message||String(e),true);} }
  async function uiConnect(silent=false){ try { const portName=byId("solrakN92Port")?.value||get(PORT_KEY), baudRate=Number(byId("solrakN92Baud")?.value||get(BAUD_KEY,"9600")); await connectScale({portName,baudRate}); if(!silent)notify(`Báscula conectada en ${portName}.`); startLive(); return true; } catch(e){ if(!silent)notify(e.message||String(e),true); return false; } }
  async function uiDisconnect(){try{await disconnectScale();}catch{} stopLive(); const box=byId("solrakN92Weight");if(box)box.innerHTML='<span class="solrakN92Weight">Desconectada</span>';}
  function startLive(){stopLive();liveTimer=setInterval(async()=>{if(!scaleConnected)return;try{const r=await readWeight(),n=Number(r?.weight);if(Number.isFinite(n)){const box=byId("solrakN92Weight");if(box){box.className="solrakN92Status ok";box.innerHTML=`<span class="solrakN92Weight">${n.toFixed(3)} ${r.unit||"kg"}</span>`;}}}catch(e){stopLive();notify(e.message||"Se perdió la báscula.",true);}},250);}
  function stopLive(){if(liveTimer)clearInterval(liveTimer);liveTimer=null;}
  function bindUi(){byId("solrakN92Printers").onclick=refreshPrinters;byId("solrakN92Printer").onchange=printerChanged;byId("solrakN92Test").onclick=testPrinter;byId("solrakN92Ports").onclick=refreshPorts;byId("solrakN92Connect").onclick=()=>uiConnect(false);byId("solrakN92Disconnect").onclick=uiDisconnect;const baud=byId("solrakN92Baud");baud.value=get(BAUD_KEY,"9600");baud.onchange=()=>set(BAUD_KEY,baud.value);const auto=byId("solrakN92Auto");auto.checked=get(AUTO_KEY)==="1";auto.onchange=()=>set(AUTO_KEY,auto.checked?"1":"0");Promise.all([refreshPrinters(),refreshPorts()]).then(()=>{if(auto.checked)uiConnect(true);});}

  function tryPrintReceipt(receipt, settings = {}) {
    if (!invokeFn()) return false;
    const printerName = get(PRINTER_KEY); if (!printerName) return false;
    const payload = { ...receipt, printerName, businessName: settings.businessName || "SOLRAK", footer: settings.footer || "", barcode: settings.showBarcode !== false, cut: true };
    printTicket(payload).then(result => notify(`Ticket #${result.folio} enviado a ${result.printerName}.`)).catch(error => notify(error.message || String(error), true));
    return true;
  }

  installBridge();
  const mount=()=>{ensureUi();const badge=byId("solrakN92Bridge");if(badge){info().then(i=>{badge.className="solrakN92Status ok";badge.textContent=i.directPrint?"Windows · impresión directa activa":"Windows · puente activo";}).catch(()=>{badge.className="solrakN92Status bad";badge.textContent="Puente nativo no disponible";});}};
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true}); document.addEventListener("DOMContentLoaded",mount); mount();
  window.addEventListener("beforeunload",()=>{stopLive();if(scaleConnected)disconnectScale().catch(()=>{});});
  window.SOLRAKNativePeripheralsV0192={version:VERSION,info,listPorts,listPrinters,connectScale,disconnectScale,readWeight,printTicket,tryPrintReceipt,buildTicketText};
})();