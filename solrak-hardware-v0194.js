(() => {
  "use strict";

  const VERSION = "0.1.94";
  const PREFIX = "solrak:hardware:v0194";
  const KEYS = {
    port: `${PREFIX}:scale-port`,
    baud: `${PREFIX}:scale-baud`,
    autoScale: `${PREFIX}:scale-auto`,
    printer: `${PREFIX}:printer`,
    direct: `${PREFIX}:direct-print`,
    scanner: `${PREFIX}:scanner-fast`,
  };
  const byId = (id) => document.getElementById(id);
  const get = (key, fallback = "") => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const set = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };
  const bool = (key, fallback = false) => get(key, fallback ? "1" : "0") === "1";
  const notify = (message, error = false) => {
    try { if (typeof window.notice === "function") return window.notice(message, error); } catch {}
    console[error ? "error" : "info"]("SOLRAK hardware", message);
  };

  let nativeReady = null;
  let scaleConnected = false;
  let scaleTimer = null;
  let scannerBuffer = "";
  let scannerLastAt = 0;

  function invokeFn() {
    return window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null;
  }

  async function invoke(command, args = {}) {
    const fn = invokeFn();
    if (!fn) throw new Error("El puente nativo de SOLRAK solo está disponible en la aplicación para Windows.");
    return fn(command, args);
  }

  async function detectNative(force = false) {
    if (!force && nativeReady !== null) return nativeReady;
    try {
      const status = await invoke("hardware_status_v0194");
      nativeReady = status?.native === true && status?.hardwareBridge === true;
    } catch {
      nativeReady = false;
    }
    renderNativeStatus();
    return nativeReady;
  }

  function renderNativeStatus() {
    const box = byId("solrakHw94Status");
    if (!box) return;
    box.textContent = nativeReady ? "Windows · hardware nativo activo" : "Hardware nativo no disponible";
    box.className = `solrakHw94Status ${nativeReady ? "ok" : "bad"}`;
  }

  function ensureStyle() {
    if (byId("solrakHardwareV0194Style")) return;
    const style = document.createElement("style");
    style.id = "solrakHardwareV0194Style";
    style.textContent = `
#solrakHardwareV0194{margin-top:8px}.solrakHw94Grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.solrakHw94Panel{border:1px solid #d9dfe4;background:#fff;padding:10px}.solrakHw94Panel h3{margin:0 0 7px;font-size:12px}.solrakHw94Fields{display:grid;grid-template-columns:minmax(150px,1fr) 105px auto;gap:6px;align-items:end}.solrakHw94Fields label,.solrakHw94Label{font-size:9px;font-weight:900;text-transform:uppercase;color:#64717b}.solrakHw94Fields select,.solrakHw94PrinterRow select{width:100%;height:32px;margin-top:3px;border:1px solid #cbd3d9;border-radius:3px;background:#fff;padding:3px 6px;font:11px "Segoe UI",sans-serif}.solrakHw94Actions{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.solrakHw94Actions button{height:32px;border:1px solid #c7cfd5;border-radius:3px;background:#fff;padding:0 9px;font:800 9px "Segoe UI",sans-serif;cursor:pointer}.solrakHw94Actions .primary{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrakHw94Status{display:inline-flex;padding:4px 7px;border:1px solid #d4dbe0;background:#f5f7f8;color:#65727c;font-size:9px;font-weight:850}.solrakHw94Status.ok{border-color:#b9dfc7;background:#effaf3;color:#17673b}.solrakHw94Status.bad{border-color:#e5c1c1;background:#fff2f2;color:#943b3b}.solrakHw94Live{display:flex;align-items:center;justify-content:space-between;margin-top:7px;padding:7px 8px;border:1px solid #e0e4e7;background:#f7f9fa;font-size:9px}.solrakHw94Live strong{font-size:19px;font-variant-numeric:tabular-nums}.solrakHw94Note{margin-top:6px;color:#697680;font-size:9px;line-height:1.4}.solrakHw94PrinterRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}.solrakHw94Meta{margin-top:7px;border:1px solid #e0e4e7;background:#f7f9fa;padding:7px;font-size:9px;min-height:44px}.solrakHw94Toggle{display:flex;align-items:center;gap:6px;margin-top:7px;font-size:10px;color:#47545f}.solrakHw94Toggle input{width:16px;height:16px;accent-color:#2588d8}.solrakHw94Scanner{margin-top:8px;border-top:1px solid #edf0f2;padding-top:8px}.solrakHw94ScanLive{font:10px ui-monospace,monospace;color:#4d5964;margin-top:5px;min-height:16px}@media(max-width:900px){.solrakHw94Grid{grid-template-columns:1fr}.solrakHw94Fields{grid-template-columns:1fr 1fr}.solrakHw94Actions{grid-column:1/-1}}
`;
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (byId("solrakHardwareV0194")) return true;
    const host = byId("tab-configuracion");
    if (!host) return false;
    ensureStyle();
    const card = document.createElement("article");
    card.id = "solrakHardwareV0194";
    card.className = "card admin-only";
    card.innerHTML = `
<div class="card-head"><div><h2>Hardware de Punto de Venta</h2><p class="muted small">Impresora térmica, báscula serial y lector de códigos conectados realmente a Windows.</p></div><span id="solrakHw94Status" class="solrakHw94Status">Comprobando Windows…</span></div>
<div class="solrakHw94Grid">
<section class="solrakHw94Panel"><h3>Báscula USB / COM</h3><div class="solrakHw94Fields"><label>Puerto<select id="solrakHw94Port"><option value="">Selecciona COM…</option></select></label><label>Baudios<select id="solrakHw94Baud"><option>4800</option><option selected>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label><div class="solrakHw94Actions"><button id="solrakHw94RefreshPorts" type="button">Actualizar</button><button id="solrakHw94Connect" class="primary" type="button">Conectar</button><button id="solrakHw94Disconnect" type="button" disabled>Desconectar</button></div></div><label class="solrakHw94Toggle"><input id="solrakHw94AutoScale" type="checkbox"> Conectar automáticamente al iniciar</label><div class="solrakHw94Live"><span>Peso recibido</span><strong id="solrakHw94Weight">Desconectada</strong></div><div class="solrakHw94Note">Lectura continua del puerto serial real. Configuración 8N1; se aceptan tramas ASCII comunes con kg, g o lb.</div></section>
<section class="solrakHw94Panel"><h3>Impresora térmica / Windows</h3><div class="solrakHw94PrinterRow"><select id="solrakHw94Printer"><option value="">Detectando impresoras…</option></select><div class="solrakHw94Actions"><button id="solrakHw94RefreshPrinters" type="button">Actualizar</button><button id="solrakHw94TestPrint" type="button">Prueba directa</button></div></div><label class="solrakHw94Toggle"><input id="solrakHw94Direct" type="checkbox"> Impresión térmica directa RAW / ESC-POS</label><div id="solrakHw94PrinterMeta" class="solrakHw94Meta">Selecciona una impresora instalada en Windows.</div><div class="solrakHw94Note">La impresión directa envía el ticket al spooler de Windows sin inventar dispositivos. Incluye el folio exacto como código de barras y corte de papel cuando la impresora lo soporta.</div>
<div class="solrakHw94Scanner"><h3>Lector de códigos</h3><label class="solrakHw94Toggle"><input id="solrakHw94ScannerFast" type="checkbox"> Detección rápida de escáner tipo teclado</label><div id="solrakHw94ScanLive" class="solrakHw94ScanLive">Esperando lectura…</div><div class="solrakHw94Note">Si el lector termina con Enter y el foco no está en otro formulario, SOLRAK dirige la lectura completa al buscador del Punto de Venta. Conserva códigos alfanuméricos y cantidad*código.</div></div></section>
</div>`;
    host.appendChild(card);
    bindUi();
    return true;
  }

  async function refreshPorts() {
    if (!(await detectNative())) return;
    const select = byId("solrakHw94Port");
    if (!select) return;
    try {
      const ports = await invoke("list_serial_ports_v0194");
      const saved = get(KEYS.port);
      select.innerHTML = `<option value="">Selecciona COM…</option>${(ports || []).map((p) => `<option value="${escapeAttr(p.portName)}">${escapeHtml(p.portName)}${p.product ? ` · ${escapeHtml(p.product)}` : ""}${p.manufacturer ? ` · ${escapeHtml(p.manufacturer)}` : ""}</option>`).join("")}`;
      if (saved && [...select.options].some((o) => o.value === saved)) select.value = saved;
    } catch (error) { notify(error?.message || String(error), true); }
  }

  function publishScale(reading) {
    const connected = reading?.connected === true;
    const weight = Number(reading?.weight);
    const unit = String(reading?.unit || "kg");
    const live = byId("solrakHw94Weight");
    if (connected && Number.isFinite(weight)) {
      window.SOLRAKScale = { connected: true, weight, unit, raw: reading?.raw || "" };
      if (live) live.textContent = `${weight.toFixed(unit === "g" ? 0 : 3)} ${unit}`;
      document.dispatchEvent(new CustomEvent("solrak:scale-weight", { detail: { weight, unit, raw: reading?.raw || "" } }));
    } else if (!connected) {
      window.SOLRAKScale = { connected: false };
      if (live) live.textContent = "Desconectada";
      document.dispatchEvent(new CustomEvent("solrak:scale-weight", { detail: {} }));
    }
  }

  function stopScale(disconnected = false) {
    if (scaleTimer) clearInterval(scaleTimer);
    scaleTimer = null;
    scaleConnected = false;
    if (byId("solrakHw94Connect")) byId("solrakHw94Connect").disabled = false;
    if (byId("solrakHw94Disconnect")) byId("solrakHw94Disconnect").disabled = true;
    if (disconnected) publishScale({ connected: false });
  }

  async function pollScale() {
    if (!scaleConnected) return;
    try { publishScale(await invoke("scale_read_v0194")); }
    catch (error) { stopScale(true); notify(error?.message || "Se perdió la conexión con la báscula.", true); }
  }

  async function connectScale(silent = false) {
    if (!(await detectNative())) return false;
    const portName = byId("solrakHw94Port")?.value || get(KEYS.port);
    const baudRate = Number(byId("solrakHw94Baud")?.value || get(KEYS.baud, "9600"));
    if (!portName) { if (!silent) notify("Selecciona el puerto COM de la báscula.", true); return false; }
    try {
      await invoke("scale_connect_v0194", { portName, baudRate });
      set(KEYS.port, portName); set(KEYS.baud, baudRate);
      scaleConnected = true;
      if (byId("solrakHw94Connect")) byId("solrakHw94Connect").disabled = true;
      if (byId("solrakHw94Disconnect")) byId("solrakHw94Disconnect").disabled = false;
      if (scaleTimer) clearInterval(scaleTimer);
      scaleTimer = setInterval(pollScale, 220);
      await pollScale();
      if (!silent) notify(`Báscula conectada en ${portName} a ${baudRate} baudios.`);
      return true;
    } catch (error) { stopScale(true); if (!silent) notify(error?.message || String(error), true); return false; }
  }

  async function disconnectScale(silent = false) {
    try { if (nativeReady) await invoke("scale_disconnect_v0194"); } catch {}
    stopScale(true);
    if (!silent) notify("Báscula desconectada.");
  }

  async function refreshPrinters() {
    if (!(await detectNative())) return;
    const select = byId("solrakHw94Printer");
    if (!select) return;
    try {
      const printers = await invoke("list_windows_printers_v0194");
      const saved = get(KEYS.printer);
      select.innerHTML = `<option value="">Selecciona impresora…</option>${(printers || []).map((p) => `<option value="${escapeAttr(p.name)}" data-driver="${escapeAttr(p.driverName || "")}" data-port="${escapeAttr(p.portName || "")}" data-default="${p.isDefault ? "1" : "0"}">${p.isDefault ? "★ " : ""}${escapeHtml(p.name)}</option>`).join("")}`;
      if (saved && [...select.options].some((o) => o.value === saved)) select.value = saved;
      else {
        const def = [...select.options].find((o) => o.dataset.default === "1");
        if (def) select.value = def.value;
      }
      renderPrinterMeta();
    } catch (error) { notify(error?.message || String(error), true); }
  }

  function renderPrinterMeta() {
    const option = byId("solrakHw94Printer")?.selectedOptions?.[0];
    const box = byId("solrakHw94PrinterMeta");
    if (!box) return;
    if (!option?.value) {
      box.textContent = "Selecciona una impresora instalada en Windows.";
      window.SOLRAKPrinter = null;
      return;
    }
    set(KEYS.printer, option.value);
    window.SOLRAKPrinter = { name: option.value, driver: option.dataset.driver || "", port: option.dataset.port || "", directPrint: bool(KEYS.direct) };
    box.innerHTML = `<strong>${escapeHtml(option.value)}</strong><br>Driver: ${escapeHtml(option.dataset.driver || "Windows")}<br>Puerto: ${escapeHtml(option.dataset.port || "Administrado por Windows")}${option.dataset.default === "1" ? " · Predeterminada" : ""}<br>Modo: ${bool(KEYS.direct) ? "RAW / ESC-POS directo" : "Diálogo/controlador de Windows"}`;
  }

  function directPrintEnabled() {
    return nativeReady === true && bool(KEYS.direct) && !!get(KEYS.printer);
  }

  const PAYMENT_LABELS = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", credit: "Credito", other: "Otro" };
  const enc = new TextEncoder();
  const bytes = (...parts) => parts.flatMap((part) => Array.isArray(part) ? part : Array.from(part));
  const txt = (value) => Array.from(enc.encode(ascii(value)));
  const nl = () => [10];
  function ascii(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E\n]/g, "?");
  }
  function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
  function qty(value) { return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 3, useGrouping: false }); }
  function padLeft(s, n) { s = ascii(s); return s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s; }
  function padRight(s, n) { s = ascii(s); return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length); }
  function twoCols(left, right, width) {
    left = ascii(left); right = ascii(right);
    const gap = Math.max(1, width - left.length - right.length);
    if (left.length + right.length + 1 <= width) return left + " ".repeat(gap) + right;
    return padRight(left, Math.max(1, width - right.length - 1)) + " " + right.slice(-Math.max(1, width - 2));
  }
  function wrap(text, width) {
    const words = ascii(text).split(/\s+/).filter(Boolean); const lines = []; let line = "";
    for (const word of words) {
      if (!line) line = word.slice(0, width);
      else if ((line + " " + word).length <= width) line += " " + word;
      else { lines.push(line); line = word.slice(0, width); }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function barcodeCode128(value) {
    const raw = ascii(value).replace(/[^\x20-\x7E]/g, "");
    const data = txt(`{B${raw}`);
    const n = Math.min(255, data.length);
    return bytes([27,97,1], [29,72,2], [29,104,64], [29,119,2], [29,107,73,n], data.slice(0,n), nl(), [27,97,0]);
  }

  function buildEscPos(receipt, settings = {}) {
    const width = String(settings.paperSize || "58") === "80" ? 48 : 32;
    const folio = String(receipt?.saleNumber || 0).padStart(6, "0");
    const date = new Date(receipt?.createdAt || Date.now()).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    const out = [];
    out.push(...[27,64], ...[27,97,1], ...[27,69,1]);
    out.push(...txt(settings.businessName || "SOLRAK"), ...nl(), ...[27,69,0]);
    if (settings.showAddress !== false) {
      for (const line of wrap([settings.address, settings.phone, settings.rfc ? `RFC ${settings.rfc}` : ""].filter(Boolean).join(" · "), width)) out.push(...txt(line), ...nl());
    }
    out.push(...txt("-".repeat(width)), ...nl(), ...[27,69,1], ...txt(`TICKET DE VENTA #${folio}`), ...nl(), ...txt(date), ...nl(), ...[27,97,0]);
    out.push(...txt(twoCols("Cliente", receipt?.customerName || "Publico general", width)), ...nl(), ...txt("-".repeat(width)), ...nl());
    for (const item of receipt?.items || []) {
      for (const line of wrap(item?.name || "Producto", width)) out.push(...txt(line), ...nl());
      if (item?.code) out.push(...txt(`Cod ${ascii(item.code)}`.slice(0,width)), ...nl());
      const left = `${qty(item?.qty)} x ${money(item?.unitPrice)}`;
      out.push(...txt(twoCols(left, money(item?.total), width)), ...nl());
    }
    out.push(...txt("-".repeat(width)), ...nl());
    out.push(...txt(twoCols("Subtotal", money(receipt?.subtotal), width)), ...nl());
    if (settings.showTax !== false) out.push(...txt(twoCols("IVA", money(receipt?.tax), width)), ...nl());
    out.push(...[27,69,1], ...txt(twoCols("TOTAL", money(receipt?.total), width)), ...nl(), ...[27,69,0]);
    for (const payment of receipt?.payments || []) out.push(...txt(twoCols(PAYMENT_LABELS[payment?.method] || payment?.method || "Pago", money(payment?.amount), width)), ...nl());
    if (Number(receipt?.change) > 0) out.push(...txt(twoCols("Cambio", money(receipt.change), width)), ...nl());
    if (receipt?.note) for (const line of wrap(`Nota: ${receipt.note}`, width)) out.push(...txt(line), ...nl());
    if (settings.showBarcode !== false) {
      out.push(...nl(), ...barcodeCode128(folio), ...[27,97,1], ...txt(folio), ...nl(), ...[27,97,0]);
    }
    if (settings.footer) {
      out.push(...nl(), ...[27,97,1]);
      for (const line of wrap(settings.footer, width)) out.push(...txt(line), ...nl());
      out.push(...[27,97,0]);
    }
    out.push(...nl(), ...nl(), ...nl(), ...[29,86,66,0]);
    return Uint8Array.from(out);
  }

  async function printReceipt(receipt, settings = {}) {
    if (!(await detectNative())) throw new Error("El puente nativo de impresión no está disponible.");
    const printerName = get(KEYS.printer);
    if (!printerName) throw new Error("Selecciona una impresora térmica en Configuración.");
    const data = Array.from(buildEscPos(receipt, settings));
    const result = await invoke("print_raw_ticket_v0194", { printerName, data });
    document.dispatchEvent(new CustomEvent("solrak:printer-job", { detail: { printerName, bytes: result?.bytesWritten || data.length, folio: String(receipt?.saleNumber || 0).padStart(6, "0") } }));
    return true;
  }

  async function printTest() {
    try {
      const now = new Date().toISOString();
      await printReceipt({ saleNumber: 999999, createdAt: now, customerName: "Prueba SOLRAK", items: [{ code: "7500000000000", name: "Prueba de impresora termica", qty: 1, unitPrice: 1, total: 1 }], subtotal: .86, tax: .14, total: 1, payments: [{ method: "cash", amount: 1 }], change: 0 }, { businessName: "SOLRAK", paperSize: "58", showTax: true, showBarcode: true, footer: "Impresion directa OK" });
      notify("Ticket de prueba enviado directamente a la impresora seleccionada.");
    } catch (error) { notify(error?.message || String(error), true); }
  }

  function isEditable(target) {
    return !!target?.closest?.('input:not(#posSearch),textarea,select,[contenteditable="true"],dialog[open]');
  }

  function routeScan(code) {
    const input = byId("posSearch");
    if (!input || !code) return false;
    input.focus();
    input.value = code;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    const live = byId("solrakHw94ScanLive"); if (live) live.textContent = `Ultima lectura: ${code}`;
    document.dispatchEvent(new CustomEvent("solrak:scanner-code", { detail: { code } }));
    return true;
  }

  function scannerKeydown(event) {
    if (!bool(KEYS.scanner, true) || event.ctrlKey || event.metaKey || event.altKey || isEditable(event.target)) return;
    const now = performance.now();
    if (now - scannerLastAt > 90) scannerBuffer = "";
    scannerLastAt = now;
    if (event.key === "Enter") {
      const code = scannerBuffer.trim(); scannerBuffer = "";
      if (code.length >= 3) { event.preventDefault(); routeScan(code); }
      return;
    }
    if (event.key.length === 1) scannerBuffer += event.key;
  }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]); }
  function escapeAttr(value) { return escapeHtml(value); }

  function bindUi() {
    const baud = byId("solrakHw94Baud"); if (baud) { baud.value = get(KEYS.baud, "9600"); baud.onchange = () => set(KEYS.baud, baud.value); }
    const auto = byId("solrakHw94AutoScale"); if (auto) { auto.checked = bool(KEYS.autoScale); auto.onchange = () => set(KEYS.autoScale, auto.checked ? "1" : "0"); }
    const direct = byId("solrakHw94Direct"); if (direct) { direct.checked = bool(KEYS.direct); direct.onchange = () => { set(KEYS.direct, direct.checked ? "1" : "0"); renderPrinterMeta(); }; }
    const scanner = byId("solrakHw94ScannerFast"); if (scanner) { scanner.checked = bool(KEYS.scanner, true); scanner.onchange = () => set(KEYS.scanner, scanner.checked ? "1" : "0"); }
    byId("solrakHw94RefreshPorts").onclick = refreshPorts;
    byId("solrakHw94Connect").onclick = () => connectScale(false);
    byId("solrakHw94Disconnect").onclick = () => disconnectScale(false);
    byId("solrakHw94RefreshPrinters").onclick = refreshPrinters;
    byId("solrakHw94TestPrint").onclick = printTest;
    byId("solrakHw94Printer").onchange = renderPrinterMeta;
  }

  async function boot() {
    document.addEventListener("keydown", scannerKeydown, true);
    const mount = () => { if (!ensureUi()) return false; return true; };
    if (!mount()) {
      const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    await detectNative();
    if (!nativeReady) return;
    await Promise.allSettled([refreshPorts(), refreshPrinters()]);
    if (bool(KEYS.autoScale) && get(KEYS.port)) connectScale(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
  window.addEventListener("beforeunload", () => { if (scaleConnected) disconnectScale(true); });

  window.SOLRAKHardwareV0194 = {
    version: VERSION,
    detectNative,
    refreshPorts,
    refreshPrinters,
    connectScale,
    disconnectScale,
    directPrintEnabled,
    buildEscPos,
    printReceipt,
    routeScan,
    get printerName() { return get(KEYS.printer); },
    get scaleConnected() { return scaleConnected; },
  };
})();
