(() => {
  "use strict";

  const VERSION = "0.1.91";
  const PORT_KEY = "solrak:hardware:scale-port:v0191";
  const BAUD_KEY = "solrak:hardware:scale-baud:v0191";
  const AUTO_KEY = "solrak:hardware:scale-auto:v0191";
  const PRINTER_KEY = "solrak:hardware:printer:v0191";
  const byId = (id) => document.getElementById(id);
  let scaleTimer = null;
  let scaleConnected = false;
  let nativeReady = null;

  function storeGet(key, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
  function storeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else console[error ? "error" : "info"]("SOLRAK hardware", message);
  }
  function invokeFn() {
    return window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null;
  }
  async function invoke(command, args = {}) {
    const fn = invokeFn();
    if (!fn) throw new Error("El puente de hardware está disponible únicamente en la aplicación SOLRAK para Windows.");
    return fn(command, args);
  }
  function setStatus(text, kind = "") {
    const box = byId("solrakHw91Status");
    if (!box) return;
    box.textContent = text;
    box.className = `solrakHw91Status ${kind}`.trim();
  }
  function publishScale(reading) {
    const weight = Number(reading?.weight);
    const connected = reading?.connected === true;
    if (connected && Number.isFinite(weight)) {
      const unit = String(reading?.unit || "kg");
      window.SOLRAKScale = { connected: true, weight, unit, raw: reading?.raw || "" };
      document.dispatchEvent(new CustomEvent("solrak:scale-weight", { detail: { weight, unit, raw: reading?.raw || "" } }));
      const live = byId("solrakHw91Weight");
      if (live) live.textContent = `${weight.toFixed(3)} ${unit}`;
      return;
    }
    if (!connected) {
      window.SOLRAKScale = { connected: false, weight: undefined, unit: "kg", raw: "" };
      document.dispatchEvent(new CustomEvent("solrak:scale-weight", { detail: {} }));
      const live = byId("solrakHw91Weight");
      if (live) live.textContent = "Desconectada";
    }
  }

  function ensureStyle() {
    if (byId("solrakHardwareV0191Style")) return;
    const style = document.createElement("style");
    style.id = "solrakHardwareV0191Style";
    style.textContent = `
#solrakHardwareV0191{margin-top:7px}.solrakHw91Grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px}.solrakHw91Panel{border:1px solid #d7dde2;background:#fff;padding:8px}.solrakHw91Panel h3{margin:0 0 6px;font-size:12px}.solrakHw91Fields{display:grid;grid-template-columns:minmax(140px,1fr) 110px auto;gap:5px;align-items:end}.solrakHw91Fields label{font-size:9px;font-weight:900;text-transform:uppercase;color:#64717b}.solrakHw91Fields select{display:block;width:100%;height:31px;margin-top:3px;border:1px solid #cbd3d9;border-radius:3px;background:#fff;padding:3px 6px;font:11px "Segoe UI",sans-serif}.solrakHw91Actions{display:flex;gap:4px;align-items:center}.solrakHw91Actions button{height:31px;border:1px solid #c7cfd5;border-radius:3px;background:#fff;padding:0 9px;font:800 9px "Segoe UI",sans-serif;cursor:pointer}.solrakHw91Actions .primary{background:var(--solrak83-accent,#2588d8);border-color:var(--solrak83-accent,#2588d8);color:#fff}.solrakHw91Live{display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding:6px 7px;border:1px solid #e0e4e7;background:#f7f9fa;font-size:9px}.solrakHw91Live strong{font-size:18px;font-variant-numeric:tabular-nums}.solrakHw91Status{display:inline-flex;margin-top:5px;padding:3px 6px;border:1px solid #d4dbe0;background:#f5f7f8;color:#65727c;font-size:9px;font-weight:800}.solrakHw91Status.ok{border-color:#b9dfc7;background:#effaf3;color:#17673b}.solrakHw91Status.bad{border-color:#e5c1c1;background:#fff2f2;color:#943b3b}.solrakHw91Note{margin-top:6px;color:#697680;font-size:9px;line-height:1.35}.solrakHw91PrinterRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px}.solrakHw91PrinterRow select{height:31px;border:1px solid #cbd3d9;border-radius:3px;background:#fff;padding:3px 6px;font:11px "Segoe UI",sans-serif}.solrakHw91PrinterMeta{margin-top:6px;border:1px solid #e0e4e7;background:#f7f9fa;padding:6px;font-size:9px;min-height:42px}@media(max-width:900px){.solrakHw91Grid{grid-template-columns:1fr}.solrakHw91Fields{grid-template-columns:1fr 1fr}.solrakHw91Actions{grid-column:1/-1}}
`;
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (byId("solrakHardwareV0191")) return true;
    const section = byId("tab-configuracion");
    if (!section) return false;
    ensureStyle();
    const card = document.createElement("article");
    card.id = "solrakHardwareV0191";
    card.className = "card admin-only";
    card.innerHTML = `
<div class="card-head"><div><h2>Hardware de Punto de Venta</h2><p class="muted small">Dispositivos reales conectados a Windows. No se generan lecturas simuladas.</p></div><span id="solrakHw91Status" class="solrakHw91Status">Comprobando Windows…</span></div>
<div class="solrakHw91Grid">
  <section class="solrakHw91Panel"><h3>Báscula USB / COM</h3><div class="solrakHw91Fields"><label>Puerto<select id="solrakHw91Port"><option value="">Selecciona COM…</option></select></label><label>Baudios<select id="solrakHw91Baud"><option>9600</option><option>4800</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label><div class="solrakHw91Actions"><button id="solrakHw91RefreshPorts" type="button">Actualizar</button><button id="solrakHw91Connect" class="primary" type="button">Conectar</button><button id="solrakHw91Disconnect" type="button" disabled>Desconectar</button></div></div><label style="display:flex;align-items:center;gap:5px;margin-top:6px;font-size:9px"><input id="solrakHw91Auto" type="checkbox"> Conectar automáticamente al iniciar SOLRAK</label><div class="solrakHw91Live"><span>Peso recibido en tiempo real</span><strong id="solrakHw91Weight">Desconectada</strong></div><div class="solrakHw91Note">La báscula debe enviar el peso por puerto serial. SOLRAK admite cadenas ASCII comunes con kg, g o lb y conserva el texto bruto para diagnóstico.</div></section>
  <section class="solrakHw91Panel"><h3>Impresora térmica / Windows</h3><div class="solrakHw91PrinterRow"><select id="solrakHw91Printer"><option value="">Detectando impresoras…</option></select><div class="solrakHw91Actions"><button id="solrakHw91RefreshPrinters" type="button">Actualizar</button></div></div><div id="solrakHw91PrinterMeta" class="solrakHw91PrinterMeta">SOLRAK utiliza el controlador de impresión de Windows. El código de barras del ticket contiene el folio exacto para búsqueda, reimpresión y devolución.</div><div class="solrakHw91Note">La impresora seleccionada queda registrada como preferida de SOLRAK. Al imprimir, Windows utiliza sus drivers instalados; no se envían bytes falsos a un puerto USB inexistente.</div></section>
</div>`;
    section.appendChild(card);
    bindUi();
    return true;
  }

  async function detectNative() {
    if (nativeReady !== null) return nativeReady;
    try {
      const info = await invoke("desktop_info");
      nativeReady = info?.native === true && info?.hardwareBridge === true;
    } catch { nativeReady = false; }
    setStatus(nativeReady ? "Windows · puente nativo activo" : "Hardware nativo no disponible", nativeReady ? "ok" : "bad");
    return nativeReady;
  }

  async function refreshPorts() {
    if (!(await detectNative())) return;
    const select = byId("solrakHw91Port");
    try {
      const ports = await invoke("list_serial_ports");
      const saved = storeGet(PORT_KEY);
      select.innerHTML = `<option value="">Selecciona COM…</option>${(ports || []).map((port) => `<option value="${String(port.portName).replace(/"/g, "&quot;")}">${port.portName}${port.product ? ` · ${port.product}` : ""}${port.manufacturer ? ` · ${port.manufacturer}` : ""}</option>`).join("")}`;
      if (saved && [...select.options].some((option) => option.value === saved)) select.value = saved;
      if (!(ports || []).length) notify("Windows no reportó puertos COM disponibles.", true);
    } catch (error) { notify(error.message || String(error), true); }
  }

  function stopPolling(disconnected = false) {
    if (scaleTimer) clearInterval(scaleTimer);
    scaleTimer = null;
    scaleConnected = false;
    byId("solrakHw91Connect") && (byId("solrakHw91Connect").disabled = false);
    byId("solrakHw91Disconnect") && (byId("solrakHw91Disconnect").disabled = true);
    if (disconnected) publishScale({ connected: false });
  }

  async function pollScale() {
    if (!scaleConnected) return;
    try {
      const reading = await invoke("scale_read");
      publishScale(reading);
    } catch (error) {
      stopPolling(true);
      notify(error.message || "Se perdió la conexión con la báscula.", true);
    }
  }

  async function connectScale(silent = false) {
    if (!(await detectNative())) return false;
    const portName = byId("solrakHw91Port")?.value || storeGet(PORT_KEY);
    const baudRate = Number(byId("solrakHw91Baud")?.value || storeGet(BAUD_KEY, "9600"));
    if (!portName) { if (!silent) notify("Selecciona el puerto COM de la báscula.", true); return false; }
    try {
      await invoke("scale_connect", { portName, baudRate });
      storeSet(PORT_KEY, portName); storeSet(BAUD_KEY, baudRate);
      scaleConnected = true;
      byId("solrakHw91Connect") && (byId("solrakHw91Connect").disabled = true);
      byId("solrakHw91Disconnect") && (byId("solrakHw91Disconnect").disabled = false);
      if (scaleTimer) clearInterval(scaleTimer);
      scaleTimer = setInterval(pollScale, 250);
      await pollScale();
      if (!silent) notify(`Báscula conectada en ${portName} a ${baudRate} baudios.`);
      return true;
    } catch (error) { stopPolling(true); if (!silent) notify(error.message || String(error), true); return false; }
  }

  async function disconnectScale() {
    try { if (nativeReady) await invoke("scale_disconnect"); } catch {}
    stopPolling(true);
    notify("Báscula desconectada.");
  }

  async function refreshPrinters() {
    if (!(await detectNative())) return;
    const select = byId("solrakHw91Printer");
    try {
      const printers = await invoke("list_windows_printers");
      const saved = storeGet(PRINTER_KEY);
      select.innerHTML = `<option value="">Selecciona impresora…</option>${(printers || []).map((printer) => `<option value="${String(printer.name).replace(/"/g, "&quot;")}" data-driver="${String(printer.driverName || "").replace(/"/g, "&quot;")}" data-port="${String(printer.portName || "").replace(/"/g, "&quot;")}" data-default="${printer.isDefault ? "1" : "0"}">${printer.isDefault ? "★ " : ""}${printer.name}</option>`).join("")}`;
      if (saved && [...select.options].some((option) => option.value === saved)) select.value = saved;
      else {
        const def = [...select.options].find((option) => option.dataset.default === "1");
        if (def) select.value = def.value;
      }
      renderPrinterMeta();
      if (!(printers || []).length) notify("Windows no reportó impresoras instaladas.", true);
    } catch (error) { notify(error.message || String(error), true); }
  }

  function renderPrinterMeta() {
    const select = byId("solrakHw91Printer");
    const option = select?.selectedOptions?.[0];
    const box = byId("solrakHw91PrinterMeta");
    if (!box) return;
    if (!option?.value) { box.textContent = "Selecciona una impresora instalada en Windows."; return; }
    storeSet(PRINTER_KEY, option.value);
    box.innerHTML = `<strong>${option.value}</strong><br>Driver: ${option.dataset.driver || "Windows"}<br>Puerto: ${option.dataset.port || "Administrado por Windows"}${option.dataset.default === "1" ? " · Predeterminada" : ""}`;
    window.SOLRAKPrinter = { name: option.value, driver: option.dataset.driver || "", port: option.dataset.port || "", windowsDriver: true };
  }

  function bindUi() {
    byId("solrakHw91RefreshPorts").onclick = refreshPorts;
    byId("solrakHw91Connect").onclick = () => connectScale(false);
    byId("solrakHw91Disconnect").onclick = disconnectScale;
    byId("solrakHw91RefreshPrinters").onclick = refreshPrinters;
    byId("solrakHw91Printer").onchange = renderPrinterMeta;
    const baud = byId("solrakHw91Baud"); baud.value = storeGet(BAUD_KEY, "9600"); baud.onchange = () => storeSet(BAUD_KEY, baud.value);
    const auto = byId("solrakHw91Auto"); auto.checked = storeGet(AUTO_KEY, "0") === "1"; auto.onchange = () => storeSet(AUTO_KEY, auto.checked ? "1" : "0");
  }

  async function bootNative() {
    if (!ensureUi()) return false;
    if (!(await detectNative())) { publishScale({ connected: false }); return false; }
    await Promise.all([refreshPorts(), refreshPrinters()]);
    const port = storeGet(PORT_KEY); const select = byId("solrakHw91Port"); if (port && select) select.value = port;
    if (storeGet(AUTO_KEY, "0") === "1" && port) await connectScale(true);
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (ensureUi() || attempts > 120) { clearInterval(timer); bootNative(); }
  }, 100);
  window.addEventListener("beforeunload", () => { if (scaleTimer) clearInterval(scaleTimer); });

  window.SOLRAKHardwareV0191 = { version: VERSION, invoke, refreshPorts, refreshPrinters, connectScale, disconnectScale, publishScale, printer: () => window.SOLRAKPrinter || null };
})();