(() => {
  "use strict";

  const VERSION = "0.1.94";
  const STYLE_ID = "solrakWindowsNativeV0194Style";
  const CARD_ID = "solrakWindowsNativeV0194Card";
  const byId = (id) => document.getElementById(id);
  const enc = new TextEncoder();
  let scaleTimer = null;
  let connectedScale = false;
  let lastScaleReading = null;
  let mounting = false;

  function businessKey() {
    const business = window.session?.business || {};
    return String(business.id || business.code || business.name || "device")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-");
  }

  function key(name) { return `solrak.windows.v0194.${name}:${businessKey()}`; }
  function readSetting(name, fallback = "") {
    try { return localStorage.getItem(key(name)) ?? fallback; } catch { return fallback; }
  }
  function writeSetting(name, value) {
    try { localStorage.setItem(key(name), String(value ?? "")); return true; } catch { return false; }
  }

  function notice(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK", message);
  }

  function invokeNative(command, args = {}) {
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (typeof invoke !== "function") return Promise.reject(new Error("El ejecutable Windows no expone el puente nativo de SOLRAK."));
    return invoke(command, args);
  }

  function isNative() {
    return typeof (window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke) === "function";
  }

  function ascii(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^ -~]/g, "?")
      .replace(/[\r\n\t]+/g, " ")
      .trim();
  }

  function money(value) {
    const n = Number(value || 0);
    return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
  }

  function wrap(text, width) {
    const input = ascii(text);
    if (!input) return [""];
    const words = input.split(/\s+/);
    const rows = [];
    let row = "";
    for (const word of words) {
      if (word.length > width) {
        if (row) { rows.push(row); row = ""; }
        for (let i = 0; i < word.length; i += width) rows.push(word.slice(i, i + width));
        continue;
      }
      const next = row ? `${row} ${word}` : word;
      if (next.length > width) { rows.push(row); row = word; }
      else row = next;
    }
    if (row) rows.push(row);
    return rows;
  }

  function twoColumns(left, right, width) {
    left = ascii(left); right = ascii(right);
    const space = Math.max(1, width - left.length - right.length);
    if (left.length + right.length + 1 <= width) return `${left}${" ".repeat(space)}${right}`;
    return `${left.slice(0, Math.max(1, width - right.length - 1))} ${right}`;
  }

  function receiptBytes(receipt = {}, settings = {}) {
    const exactFolio = String(receipt.saleNumber ?? receipt.folio ?? "").trim();
    if (!/^\d+$/.test(exactFolio)) throw new Error("El ticket requiere un folio numérico exacto para impresión directa.");
    const paper = String(settings.paperSize || "58");
    const width = paper === "80" ? 48 : 32;
    const copies = Math.min(2, Math.max(1, Number(settings.copies) || 1));
    const bytes = [];
    const push = (...values) => bytes.push(...values);
    const text = (value = "") => push(...enc.encode(`${ascii(value)}\n`));
    const centered = (value) => {
      push(27, 97, 1);
      for (const line of wrap(value, width)) text(line);
      push(27, 97, 0);
    };
    const rule = () => text("-".repeat(width));
    const business = ascii(settings.businessName || window.session?.business?.name || "SOLRAK");
    const items = Array.isArray(receipt.items) ? receipt.items : [];
    const payments = Array.isArray(receipt.payments) ? receipt.payments : [];
    const total = Number(receipt.total ?? receipt.grandTotal ?? 0);
    const subtotal = Number(receipt.subtotal ?? (Number.isFinite(total) ? total : 0));
    const tax = Number(receipt.tax ?? receipt.iva ?? 0);
    let date = "";
    try { date = new Date(receipt.createdAt || Date.now()).toLocaleString("es-MX"); } catch {}

    for (let copy = 0; copy < copies; copy++) {
      push(27, 64);
      push(27, 69, 1);
      centered(business);
      push(27, 69, 0);
      if (settings.showAddress !== false && settings.address) centered(settings.address);
      if (settings.phone) centered(`Tel. ${settings.phone}`);
      if (settings.rfc) centered(`RFC ${settings.rfc}`);
      rule();
      push(27, 69, 1);
      centered(`FOLIO ${exactFolio}`);
      push(27, 69, 0);
      if (date) centered(date);
      if (receipt.customerName) text(`Cliente: ${receipt.customerName}`);
      rule();

      for (const item of items) {
        for (const line of wrap(item.name || item.description || item.code || "Producto", width)) text(line);
        const qty = Number(item.qty ?? item.quantity ?? 1);
        const unit = Number(item.unitPrice ?? item.price ?? 0);
        const lineTotal = Number(item.total ?? item.lineTotal ?? qty * unit);
        text(twoColumns(`${Number.isFinite(qty) ? qty : 1} x ${money(unit)}`, money(lineTotal), width));
        if (item.code) text(`  ${ascii(item.code).slice(0, Math.max(1, width - 2))}`);
      }

      rule();
      if (settings.showTax !== false && (tax || receipt.subtotal != null)) {
        text(twoColumns("Subtotal", money(subtotal), width));
        if (tax) text(twoColumns("IVA", money(tax), width));
      }
      push(27, 69, 1);
      text(twoColumns("TOTAL", money(total), width));
      push(27, 69, 0);
      for (const payment of payments) {
        text(twoColumns(ascii(payment.label || payment.method || payment.type || "Pago"), money(payment.amount ?? payment.value), width));
      }
      if (Number(receipt.change || 0) > 0) text(twoColumns("Cambio", money(receipt.change), width));
      if (receipt.note) for (const line of wrap(receipt.note, width)) text(line);

      if (settings.showBarcode !== false) {
        push(10, 27, 97, 1, 29, 72, 2, 29, 104, 64, 29, 119, 2);
        const code = enc.encode(`{B${exactFolio}`);
        if (code.length <= 255) push(29, 107, 73, code.length, ...code, 10);
        push(27, 97, 0);
      }
      if (settings.footer) centered(settings.footer);
      push(10, 10, 10, 29, 86, 66, 0);
    }
    return bytes;
  }

  async function listPrinters() {
    const rows = await invokeNative("list_windows_printers_v0194");
    return Array.isArray(rows) ? rows : [];
  }

  async function listPorts() {
    const rows = await invokeNative("list_serial_ports_v0194");
    return Array.isArray(rows) ? rows : [];
  }

  async function printReceipt(receipt, settings = {}) {
    if (!isNative()) throw new Error("La impresión directa requiere SOLRAK para Windows.");
    const printerName = readSetting("printer");
    if (!printerName) throw new Error("Selecciona una impresora en Hardware de Windows.");
    const data = receiptBytes(receipt, settings);
    const result = await invokeNative("print_windows_raw_v0194", { printerName, data });
    window.dispatchEvent(new CustomEvent("solrak:windows-print-complete", { detail: { printerName, saleNumber: String(receipt?.saleNumber ?? ""), result } }));
    return result;
  }

  async function connectScale(config = {}) {
    const portName = String(config.portName || readSetting("scale.port") || "").trim();
    const baudRate = Number(config.baudRate || readSetting("scale.baud", "9600"));
    if (!portName) throw new Error("Selecciona el puerto COM de la báscula.");
    const result = await invokeNative("scale_connect_v0194", { portName, baudRate });
    writeSetting("scale.port", portName);
    writeSetting("scale.baud", baudRate);
    connectedScale = true;
    startScaleMonitor();
    syncScaleUi(result);
    return result;
  }

  async function disconnectScale() {
    try { await invokeNative("scale_disconnect_v0194"); } finally {
      connectedScale = false;
      stopScaleMonitor();
      syncScaleUi(null);
    }
  }

  async function readWeight() {
    const reading = await invokeNative("scale_read_v0194");
    if (reading?.connected) {
      connectedScale = true;
      lastScaleReading = reading;
      syncScaleUi(reading);
    }
    return reading;
  }

  function startScaleMonitor() {
    stopScaleMonitor();
    scaleTimer = setInterval(() => readWeight().catch((error) => {
      connectedScale = false;
      syncScaleUi(null, error.message);
    }), 250);
  }

  function stopScaleMonitor() {
    if (scaleTimer) clearInterval(scaleTimer);
    scaleTimer = null;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `.solrakWin94{margin-top:10px}.solrakWin94Grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.solrakWin94Panel{border:1px solid #dfe3e7;background:#fafbfc;padding:11px}.solrakWin94Panel h3{margin:0 0 8px;font-size:12px}.solrakWin94Fields{display:grid;grid-template-columns:minmax(130px,1fr) 110px;gap:7px}.solrakWin94Actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.solrakWin94Status{font-size:10px;font-weight:800}.solrakWin94Status.good{color:#247044}.solrakWin94Status.bad{color:#a43131}.solrakWin94Weight{margin-top:8px;padding:8px;border:1px solid #d9e0e6;background:#fff;font-variant-numeric:tabular-nums}.solrakWin94Weight strong{display:block;font-size:20px}.solrakWin94Meta{margin-top:6px;color:#68747e;font-size:9px;line-height:1.45}@media(max-width:760px){.solrakWin94Grid,.solrakWin94Fields{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function syncScaleUi(reading = lastScaleReading, error = "") {
    const status = byId("solrakWin94ScaleStatus");
    const weight = byId("solrakWin94Weight");
    const connect = byId("solrakWin94ScaleConnect");
    const disconnect = byId("solrakWin94ScaleDisconnect");
    if (status) {
      status.textContent = error ? "Error de lectura" : connectedScale ? "Conectada" : "Desconectada";
      status.className = `solrakWin94Status ${connectedScale && !error ? "good" : error ? "bad" : ""}`;
      status.title = error;
    }
    if (weight) weight.textContent = reading?.weight != null ? `${Number(reading.weight)} ${reading.unit || "kg"}` : "—";
    if (connect) connect.disabled = connectedScale;
    if (disconnect) disconnect.disabled = !connectedScale;
  }

  async function refreshPrinters() {
    const select = byId("solrakWin94Printer");
    const status = byId("solrakWin94PrinterStatus");
    if (!select) return;
    select.innerHTML = '<option value="">Consultando Windows…</option>';
    try {
      const printers = await listPrinters();
      const stored = readSetting("printer");
      select.innerHTML = '<option value="">Selecciona impresora…</option>' + printers.map((p) => `<option value="${esc(p.name)}" data-driver="${esc(p.driverName)}" data-port="${esc(p.portName)}" ${p.name === stored ? "selected" : ""}>${esc(p.name)}${p.isDefault ? " · Predeterminada" : ""}</option>`).join("");
      if (!stored) {
        const preferred = printers.find((p) => p.isDefault);
        if (preferred) { select.value = preferred.name; writeSetting("printer", preferred.name); }
      }
      if (status) { status.textContent = printers.length ? `${printers.length} instalada(s)` : "Sin impresoras"; status.className = `solrakWin94Status ${printers.length ? "good" : "bad"}`; }
      renderPrinterMeta();
    } catch (error) {
      select.innerHTML = '<option value="">No disponible</option>';
      if (status) { status.textContent = "Error"; status.className = "solrakWin94Status bad"; status.title = error.message; }
    }
  }

  function renderPrinterMeta() {
    const select = byId("solrakWin94Printer");
    const meta = byId("solrakWin94PrinterMeta");
    const option = select?.selectedOptions?.[0];
    if (!meta) return;
    if (!option?.value) { meta.textContent = "Selecciona una impresora térmica instalada en Windows."; return; }
    meta.innerHTML = `<strong>${esc(option.value)}</strong><br>Driver: ${esc(option.dataset.driver || "Windows")} · Puerto: ${esc(option.dataset.port || "Windows")}`;
  }

  async function refreshPorts() {
    const select = byId("solrakWin94Port");
    if (!select) return;
    select.innerHTML = '<option value="">Consultando COM…</option>';
    try {
      const ports = await listPorts();
      const stored = readSetting("scale.port");
      select.innerHTML = '<option value="">Selecciona COM…</option>' + ports.map((p) => `<option value="${esc(p.portName)}" ${p.portName === stored ? "selected" : ""}>${esc(p.portName)}${p.product ? ` · ${esc(p.product)}` : ""}</option>`).join("");
    } catch (error) {
      select.innerHTML = '<option value="">No disponible</option>';
      notice(error.message, true);
    }
  }

  function bindUi() {
    byId("solrakWin94Printer")?.addEventListener("change", (event) => { writeSetting("printer", event.target.value); renderPrinterMeta(); });
    byId("solrakWin94RefreshPrinters")?.addEventListener("click", () => refreshPrinters());
    byId("solrakWin94RefreshPorts")?.addEventListener("click", () => refreshPorts());
    byId("solrakWin94ScaleConnect")?.addEventListener("click", async () => {
      try { await connectScale({ portName: byId("solrakWin94Port")?.value, baudRate: byId("solrakWin94Baud")?.value }); notice("Báscula conectada al puerto COM seleccionado."); }
      catch (error) { syncScaleUi(null, error.message); notice(error.message, true); }
    });
    byId("solrakWin94ScaleDisconnect")?.addEventListener("click", () => disconnectScale().catch((error) => notice(error.message, true)));
    byId("solrakWin94AutoScale")?.addEventListener("change", (event) => writeSetting("scale.auto", event.target.checked ? "1" : "0"));
    byId("solrakWin94PrintLast")?.addEventListener("click", async () => {
      const tickets = window.SOLRAKSumaproTicketsV0169;
      if (!tickets?.lastReceipt) return notice("Todavía no hay un ticket real para reimprimir.", true);
      try { await printReceipt(tickets.lastReceipt, tickets.settings || {}); notice("Ticket enviado directamente a la impresora seleccionada."); }
      catch (error) { notice(error.message, true); }
    });
  }

  async function mountCard() {
    if (mounting || !isNative() || byId(CARD_ID)) return;
    const host = byId("tab-tickets") || byId("tab-configuracion");
    if (!host) return;
    mounting = true;
    try {
      ensureStyle();
      const card = document.createElement("article");
      card.id = CARD_ID;
      card.className = "card solrakWin94";
      card.innerHTML = `<div class="card-head"><div><h2>Hardware de Windows</h2><p class="muted small">Periféricos de este equipo. SOLRAK solo muestra lecturas recibidas del puerto físico.</p></div><span class="solrakWin94Status good">Puente nativo activo</span></div><div class="solrakWin94Grid"><section class="solrakWin94Panel"><h3>Impresora térmica</h3><div class="solrakWin94Fields"><label>Impresora<select id="solrakWin94Printer" class="field"><option>Consultando Windows…</option></select></label><div><span id="solrakWin94PrinterStatus" class="solrakWin94Status">Consultando…</span><div class="solrakWin94Actions"><button id="solrakWin94RefreshPrinters" class="secondary compact" type="button">Actualizar</button></div></div></div><div id="solrakWin94PrinterMeta" class="solrakWin94Meta"></div><div class="solrakWin94Actions"><button id="solrakWin94PrintLast" class="primary compact" type="button">Reimprimir último ticket</button></div><div class="solrakWin94Meta">La salida directa usa Windows Print Spooler en modo RAW. El código de barras contiene el folio numérico exacto, sin prefijos.</div></section><section class="solrakWin94Panel"><h3>Báscula USB / COM</h3><div class="solrakWin94Fields"><label>Puerto<select id="solrakWin94Port" class="field"><option>Consultando COM…</option></select></label><label>Baudios<select id="solrakWin94Baud" class="field"><option>9600</option><option>4800</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label></div><div class="solrakWin94Actions"><button id="solrakWin94RefreshPorts" class="secondary compact" type="button">Actualizar</button><button id="solrakWin94ScaleConnect" class="primary compact" type="button">Conectar</button><button id="solrakWin94ScaleDisconnect" class="secondary compact" type="button" disabled>Desconectar</button></div><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:6px;margin-top:8px"><input id="solrakWin94AutoScale" type="checkbox"> Conectar automáticamente en este equipo</label><div class="solrakWin94Weight"><span id="solrakWin94ScaleStatus" class="solrakWin94Status">Desconectada</span><strong id="solrakWin94Weight">—</strong></div><div class="solrakWin94Meta">Lector de códigos: funciona como teclado USB. SOLRAK conserva el foco de búsqueda y procesa Enter del escáner.</div></section></div>`;
      host.appendChild(card);
      const baud = readSetting("scale.baud", "9600");
      if (byId("solrakWin94Baud")) byId("solrakWin94Baud").value = baud;
      if (byId("solrakWin94AutoScale")) byId("solrakWin94AutoScale").checked = readSetting("scale.auto") === "1";
      bindUi();
      await Promise.allSettled([refreshPrinters(), refreshPorts()]);
      if (readSetting("scale.auto") === "1" && readSetting("scale.port")) connectScale().catch((error) => syncScaleUi(null, error.message));
    } finally { mounting = false; }
  }

  function installDirectPrintCapture() {
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".solrakReceiptPrint,#solrakTicketReprint");
      if (!button || !isNative() || !readSetting("printer")) return;
      const tickets = window.SOLRAKSumaproTicketsV0169;
      const receipt = tickets?.lastReceipt;
      if (!receipt?.saleNumber) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      printReceipt(receipt, tickets.settings || {})
        .then(() => notice("Ticket enviado directamente a Windows."))
        .catch((error) => notice(error.message, true));
    }, true);
  }

  if (isNative()) {
    window.SOLRAKDesktop = {
      native: true,
      version: VERSION,
      ports: { list: listPorts },
      scale: {
        connect: (config = {}) => connectScale(config),
        disconnect: disconnectScale,
        readWeight,
      },
      printer: {
        list: listPrinters,
        printTicket: (job = {}) => printReceipt(job.receipt || job, job.settings || window.SOLRAKSumaproTicketsV0169?.settings || {}),
      },
    };
    installDirectPrintCapture();
    new MutationObserver(() => mountCard()).observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountCard, { once: true });
    else mountCard();
  }

  window.addEventListener("beforeunload", () => { stopScaleMonitor(); if (connectedScale) invokeNative("scale_disconnect_v0194").catch(() => {}); });
  window.SOLRAKWindowsNativeV0194 = {
    version: VERSION,
    isNative,
    invokeNative,
    listPrinters,
    listPorts,
    printReceipt,
    receiptBytes,
    connectScale,
    disconnectScale,
    readWeight,
    get connectedScale() { return connectedScale; },
    get lastScaleReading() { return lastScaleReading; },
  };
})();
