(() => {
  "use strict";

  const VERSION = "0.1.69";
  const STYLE_ID = "solrakSumaproTicketsV0169Style";
  const SETTINGS_PREFIX = "solrak.ticket.settings.v1";
  const LAST_RECEIPT_PREFIX = "solrak.ticket.last.v1";
  const byId = (id) => document.getElementById(id);
  const clean = (value) => String(value ?? "").trim();
  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const moneyText = (value) =>
    Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });

  const DEFAULT_SETTINGS = {
    printerEnabled: true,
    autoPrint: false,
    paperSize: "58",
    copies: 1,
    showLogo: true,
    showAddress: true,
    showTax: true,
    showBarcode: true,
    businessName: "",
    address: "",
    phone: "",
    rfc: "",
    footer: "Gracias por su compra",
  };

  const PAYMENT_LABELS = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    credit: "Crédito",
    other: "Otro",
  };

  const ICONS = {
    tickets:
      '<path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Zm3 5h6M9 12h6M9 16h4"/>',
    correo:
      '<path d="M3 5h18v14H3zM3 7l9 6 9-6"/>',
    timbres:
      '<path d="M7 3h10v5a5 5 0 0 0 2 4v3H5v-3a5 5 0 0 0 2-4V3Zm-1 12h12v3H6zM9 21h6"/>',
  };

  let settings = null;
  let settingsStorageKey = "";
  let lastReceipt = null;
  let mountTimer = null;
  let moving = false;

  function svg(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function businessIdentity() {
    const business = window.session?.business || {};
    return clean(business.id || business.code || business.name || "dispositivo")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-");
  }

  function keyFor(prefix) {
    return `${prefix}:${businessIdentity()}`;
  }

  function businessDefaults() {
    const business = window.session?.business || {};
    return {
      businessName: clean(
        byId("frBusinessName")?.value ||
          business.name ||
          byId("businessName")?.textContent ||
          "SOLRAK",
      ),
      address: clean(business.address || business.street || ""),
      phone: clean(byId("frBusinessPhone")?.value || business.phone || ""),
      rfc: clean(byId("businessRFC")?.value || business.rfc || ""),
    };
  }

  function readStored(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function writeStored(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function loadSettings() {
    const key = keyFor(SETTINGS_PREFIX);
    if (settings && settingsStorageKey === key) return settings;
    const stored = readStored(key) || {};
    settings = {
      ...DEFAULT_SETTINGS,
      ...businessDefaults(),
      ...stored,
      paperSize: String(stored.paperSize || DEFAULT_SETTINGS.paperSize),
      copies: Math.min(2, Math.max(1, Number(stored.copies) || 1)),
    };
    settingsStorageKey = key;
    lastReceipt = readStored(keyFor(LAST_RECEIPT_PREFIX));
    return settings;
  }

  function isAdminUser() {
    if (typeof window.isAdmin === "function") {
      try {
        return window.isAdmin();
      } catch {}
    }
    return window.session?.user?.role === "admin";
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-solrak-sumapro-tickets="1"] #frBrandPill,
html[data-solrak-sumapro-tickets="1"] #frBrandPanel,
html[data-solrak-sumapro-tickets="1"] [data-solrak-floating-shortcut="1"]{display:none!important;visibility:hidden!important;pointer-events:none!important}

html[data-solrak-sumapro-tickets="1"] #tab-tickets,
html[data-solrak-sumapro-tickets="1"] #tab-correo,
html[data-solrak-sumapro-tickets="1"] #tab-timbres{width:min(1120px,100%);margin:0 auto;padding:2px 0 28px}
.solrakSettingsHead{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:0 0 12px;padding:2px 1px}
.solrakSettingsHead h2{margin:0;color:#26313b;font-size:20px}
.solrakSettingsHead p{margin:4px 0 0;color:#707b85;font-size:11px}
.solrakConfigHost{display:grid;gap:10px}
.solrakConfigHost>.frSection{margin:0!important;padding:16px!important;border:1px solid var(--solrak-simple-line,#dfe3e7)!important;border-radius:3px!important;background:#fff!important}
.solrakConfigHost .frField{border-radius:2px!important}
.solrakConfigHost .frBtn{border-radius:2px!important}
.solrakConfigPlaceholder{padding:18px;border:1px dashed #ccd3d9;background:#fafbfc;color:#6f7a84;font-size:12px;text-align:center}
#tab-timbres #frReadyPanel{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;margin:0 0 10px!important}
#tab-timbres #solrakTimbresHost>article.card{display:block!important;width:100%!important;margin:0!important}
#tab-timbres #solrakTimbresHost .hidden.admin-only{display:none!important}
#solrakBusinessProfileCard .frSection{margin:0!important;padding:0!important;border:0!important}

.solrakTicketLayout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:12px;align-items:start}
.solrakTicketSettings{padding:18px!important}
.solrakTicketSettings h3{margin:18px 0 10px;padding-top:15px;border-top:1px solid #e4e7ea;color:#303a43;font-size:13px}
.solrakTicketSettings h3:first-child{margin-top:0;padding-top:0;border-top:0}
.solrakTicketFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.solrakTicketFormGrid .wide{grid-column:1/-1}
.solrakCheckGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.solrakCheck{min-height:38px;display:flex!important;grid-template-columns:none!important;flex-direction:row!important;align-items:center;gap:8px!important;padding:8px 10px;border:1px solid #dfe3e7;background:#fafbfc;color:#46515b!important;font-size:11px!important}
.solrakCheck input{width:16px;height:16px;margin:0;accent-color:#176fd1}
.solrakTicketHelp{margin:9px 0 0;padding:9px 10px;border-left:3px solid #176fd1;background:#f3f7fb;color:#65717c;font-size:10px;line-height:1.45}
.solrakTicketActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.solrakTicketActions button{min-width:140px}
.solrakTicketMessage{display:none;margin-top:9px;padding:9px 10px;background:#eef8f2;color:#226d45;font-size:11px}
.solrakTicketMessage.on{display:block}
.solrakTicketPreviewCard{position:sticky!important;top:72px!important;padding:14px!important;background:#eef1f3!important}
.solrakTicketPreviewTitle{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:#53606b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.solrakTicketPaper{width:274px;min-height:440px;margin:0 auto;padding:18px 16px;background:#fff;color:#111;box-shadow:0 7px 24px rgba(26,37,47,.15);font-family:Arial,sans-serif}
.solrakTicketPaper.paper80{width:330px}
.ticket-sheet{box-sizing:border-box;color:#111;background:#fff;font-family:Arial,sans-serif;font-size:10px;line-height:1.35}
.ticket-sheet *{box-sizing:border-box}
.ticket-head{text-align:center}
.ticket-logo{display:block;max-width:64px;max-height:56px;margin:0 auto 6px;object-fit:contain}
.ticket-business{font-size:14px;font-weight:900;line-height:1.2;text-transform:uppercase}
.ticket-business-meta{margin-top:3px;font-size:8px;line-height:1.35}
.ticket-rule{border:0;border-top:1px dashed #111;margin:8px 0}
.ticket-folio{text-align:center;font-size:11px;font-weight:850}
.ticket-date{text-align:center;font-size:8px;margin-top:2px}
.ticket-customer{margin:7px 0;font-size:8px}
.ticket-items{width:100%;border-collapse:collapse;font-size:8px}
.ticket-items th,.ticket-items td{padding:3px 1px;border:0;vertical-align:top}
.ticket-items th{border-bottom:1px solid #111;text-align:left;font-weight:800}
.ticket-items .num{text-align:right;white-space:nowrap}
.ticket-item-name{font-weight:700}
.ticket-item-code{font-size:7px;color:#444}
.ticket-totals{margin-left:auto;width:76%;font-size:9px}
.ticket-total-row{display:flex;justify-content:space-between;gap:8px;padding:2px 0}
.ticket-total-row.grand{margin-top:2px;padding-top:5px;border-top:1px solid #111;font-size:13px;font-weight:900}
.ticket-payments{margin-top:6px;font-size:8px}
.ticket-payment-row{display:flex;justify-content:space-between;gap:8px}
.ticket-note{margin-top:7px;font-size:8px}
.ticket-barcode{display:block;width:100%;height:38px;margin:8px auto 2px}
.ticket-barcode-text{text-align:center;font:8px ui-monospace,monospace;letter-spacing:.12em}
.ticket-footer{margin-top:9px;text-align:center;font-size:9px;font-weight:700;white-space:pre-line}
.ticket-copy+.ticket-copy{break-before:page;page-break-before:always}
.solrakReceiptPrint{display:block;width:100%;min-height:31px!important;margin-top:7px!important;padding:5px 8px!important;border:1px solid #91b8df!important;background:#fff!important;color:#145fa9!important;font-size:9px!important;font-weight:800!important}

@media(min-width:1050px){
 html[data-solrak-sumapro-tickets="1"]{--solrak-simple-side:238px;--solrak-simple-top:58px}
 html[data-solrak-sumapro-tickets="1"] .nav>button{min-height:42px!important;padding:0 12px!important;font-size:12px!important}
 html[data-solrak-sumapro-tickets="1"] #solrakAppBrand{min-height:66px!important;padding:11px 14px!important}
 html[data-solrak-sumapro-tickets="1"] #solrakAppMark{width:38px!important;height:38px!important;flex-basis:38px!important}
 html[data-solrak-sumapro-tickets="1"][data-solrak-professional-pos="1"] #tab-pos>.frPosGrid{grid-template-columns:minmax(0,1fr) 292px!important}
 html[data-solrak-sumapro-tickets="1"][data-solrak-professional-pos="1"] #tab-pos .frPreview{height:142px!important;min-height:142px!important}
 html[data-solrak-sumapro-tickets="1"][data-solrak-professional-pos="1"] #tab-pos .frTicket{min-height:42px!important}
}
@media(max-width:900px){.solrakTicketLayout{grid-template-columns:1fr}.solrakTicketPreviewCard{position:static!important}.solrakTicketFormGrid,.solrakCheckGrid{grid-template-columns:1fr}.solrakTicketFormGrid .wide{grid-column:auto}#tab-timbres #frReadyPanel{grid-template-columns:1fr!important}}
`;
    document.head.appendChild(style);
  }

  function navButton(tab, label) {
    let button = byId(`solrak${tab[0].toUpperCase()}${tab.slice(1)}TabBtn`);
    if (button) return button;
    button = document.createElement("button");
    button.id = `solrak${tab[0].toUpperCase()}${tab.slice(1)}TabBtn`;
    button.type = "button";
    button.dataset.tab = tab;
    button.innerHTML = `<span class="solrakNavIcon">${svg(ICONS[tab])}</span><span class="solrakNavText">${label}</span>`;
    button.onclick = () => openTab(tab);
    document.querySelector(".nav")?.appendChild(button);
    return button;
  }

  function openTab(tab) {
    if ((tab === "correo" || tab === "timbres") && !isAdminUser()) {
      if (typeof window.notice === "function")
        window.notice("Solo el administrador puede abrir esta configuración.", true);
      return;
    }
    ensurePanels();
    if (typeof window.switchTab === "function") window.switchTab(tab);
    if (tab === "tickets") {
      syncTicketForm();
      renderTicketPreview();
    }
  }

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav || moving) return;
    navButton("tickets", "Tickets");
    navButton("correo", "Correo");
    navButton("timbres", "Timbres");

    const correo = byId("solrakCorreoTabBtn");
    const timbres = byId("solrakTimbresTabBtn");
    if (correo) correo.classList.toggle("hidden", !isAdminUser());
    if (timbres) timbres.classList.toggle("hidden", !isAdminUser());

    const brand = byId("solrakAppBrand");
    const desiredTabs = [
      "pos",
      "factura",
      "cotizaciones",
      "clientes",
      "inventario",
      "proveedores",
      "tickets",
      "correo",
      "timbres",
      "historial",
      "configuracion",
      "usuarios",
    ];
    moving = true;
    try {
      if (brand && nav.firstElementChild !== brand)
        nav.insertBefore(brand, nav.firstElementChild);
      let anchor = brand || null;
      desiredTabs.forEach((tab) => {
        const button = nav.querySelector(`:scope>button[data-tab="${tab}"]`);
        if (!button) return;
        const target = anchor ? anchor.nextElementSibling : nav.firstElementChild;
        if (target !== button) nav.insertBefore(button, target || null);
        anchor = button;
      });
      const footer = byId("solrakNavFooter");
      if (footer) {
        let version = footer.querySelector("span");
        if (!version) {
          version = document.createElement("span");
          footer.appendChild(version);
        }
        version.textContent = `Escritorio SOLRAK · v${VERSION}`;
        if (footer !== nav.lastElementChild) nav.appendChild(footer);
      }
    } finally {
      moving = false;
    }
  }

  function createPanel(id, title, subtitle, body) {
    const main = document.querySelector("main.shell");
    if (!main || byId(id)) return byId(id);
    const section = document.createElement("section");
    section.id = id;
    section.className = "tab-panel hidden";
    section.innerHTML = `<div class="solrakSettingsHead"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></div>${body}`;
    main.appendChild(section);
    return section;
  }

  function ticketPanelMarkup() {
    return `<div class="solrakTicketLayout">
      <article class="card solrakTicketSettings">
        <h3>Impresión</h3>
        <div class="solrakCheckGrid">
          <label class="solrakCheck"><input id="solrakTicketPrinterEnabled" type="checkbox"> Usar impresora de tickets</label>
          <label class="solrakCheck"><input id="solrakTicketAutoPrint" type="checkbox"> Imprimir al terminar la venta</label>
        </div>
        <div class="solrakTicketFormGrid" style="margin-top:10px">
          <label>Impresora<select id="solrakTicketPrinter" class="field"><option value="system">Predeterminada de Windows</option></select></label>
          <label>Tipo de rollo<select id="solrakTicketPaper" class="field"><option value="58">58 mm</option><option value="80">80 mm</option></select></label>
          <label>Copias<select id="solrakTicketCopies" class="field"><option value="1">1 copia</option><option value="2">2 copias</option></select></label>
        </div>
        <p class="solrakTicketHelp">SOLRAK prepara el ticket térmico y usa la ventana de impresión de Windows. Deja tu impresora POS como predeterminada para imprimir con menos pasos.</p>

        <h3>Diseño del ticket</h3>
        <div class="solrakCheckGrid">
          <label class="solrakCheck"><input id="solrakTicketShowLogo" type="checkbox"> Mostrar logotipo</label>
          <label class="solrakCheck"><input id="solrakTicketShowAddress" type="checkbox"> Mostrar datos del negocio</label>
          <label class="solrakCheck"><input id="solrakTicketShowTax" type="checkbox"> Desglosar IVA</label>
          <label class="solrakCheck"><input id="solrakTicketShowBarcode" type="checkbox"> Código de barras del folio</label>
        </div>
        <div class="solrakTicketFormGrid" style="margin-top:10px">
          <label class="wide">Nombre del negocio<input id="solrakTicketBusinessName" class="field" maxlength="160"></label>
          <label class="wide">Dirección<input id="solrakTicketAddress" class="field" maxlength="260"></label>
          <label>Teléfono<input id="solrakTicketPhone" class="field" maxlength="60"></label>
          <label>RFC<input id="solrakTicketRfc" class="field" maxlength="20"></label>
          <label class="wide">Mensaje al final<textarea id="solrakTicketFooter" class="field" rows="2" maxlength="220"></textarea></label>
        </div>
        <div class="solrakTicketActions">
          <button id="solrakTicketSave" class="primary" type="button">Guardar configuración</button>
          <button id="solrakTicketTest" class="secondary" type="button">Imprimir ticket de prueba</button>
          <button id="solrakTicketReprint" class="secondary hidden" type="button">Reimprimir último ticket</button>
        </div>
        <div id="solrakTicketMessage" class="solrakTicketMessage"></div>
      </article>
      <aside class="card solrakTicketPreviewCard"><div class="solrakTicketPreviewTitle"><span>Vista previa</span><span id="solrakTicketPreviewSize">58 mm</span></div><div id="solrakTicketPreview"></div></aside>
    </div>`;
  }

  function ensurePanels() {
    createPanel(
      "tab-tickets",
      "Tickets e impresión",
      "Configura la impresora térmica y el diseño del comprobante de venta.",
      ticketPanelMarkup(),
    );
    createPanel(
      "tab-correo",
      "Correo",
      "Configura el remitente, las pruebas y el envío automático de documentos.",
      '<div id="solrakCorreoHost" class="solrakConfigHost"><div class="solrakConfigPlaceholder">Cargando configuración de correo…</div></div>',
    );
    createPanel(
      "tab-timbres",
      "Timbres",
      "Administra CSD, conexión Finkok, ambiente y preparación para timbrado.",
      '<div id="solrakTimbresStatus"></div><div id="solrakTimbresHost" class="solrakConfigHost"><div class="solrakConfigPlaceholder">Cargando configuración de timbres…</div></div>',
    );
    bindTicketForm();
  }

  function findAdvancedCard() {
    return (
      [...document.querySelectorAll("#tab-configuracion article.card")].find(
        (card) =>
          /preparaci[oó]n para timbrado|csd real|finkok|conexi[oó]n pac/i.test(
            card.textContent || "",
          ),
      ) || null
    );
  }

  function moveExistingSettings() {
    ensurePanels();
    const correoHost = byId("solrakCorreoHost");
    const timbresHost = byId("solrakTimbresHost");
    if (!correoHost || !timbresHost) return;

    const gmail = byId("frGmailSection");
    if (gmail && gmail.parentElement !== correoHost) correoHost.appendChild(gmail);
    const autoSend = byId("frAutoSendBar");
    if (autoSend && autoSend.parentElement !== correoHost)
      correoHost.appendChild(autoSend);
    const platform = byId("frPlatformSection");
    if (platform && platform.parentElement !== correoHost)
      correoHost.appendChild(platform);
    if (gmail || autoSend)
      correoHost.querySelector(".solrakConfigPlaceholder")?.remove();

    const advanced = findAdvancedCard();
    if (advanced && advanced.parentElement !== timbresHost) {
      advanced.id = advanced.id || "solrakTimbresAdvancedCard";
      advanced.hidden = false;
      advanced.classList.remove("solrakSimpleAdvancedCard");
      timbresHost.appendChild(advanced);
    }
    const ready = byId("frReadyPanel");
    const statusHost = byId("solrakTimbresStatus");
    if (ready && statusHost && ready.parentElement !== statusHost)
      statusHost.appendChild(ready);
    if (advanced)
      timbresHost.querySelector(".solrakConfigPlaceholder")?.remove();
    byId("solrakSimpleConfigTools")?.remove();

    const profileSection = byId("frLogoPreview")?.closest(".frSection");
    const configGrid = document.querySelector("#tab-configuracion>.split");
    if (profileSection && configGrid) {
      let card = byId("solrakBusinessProfileCard");
      if (!card) {
        card = document.createElement("article");
        card.id = "solrakBusinessProfileCard";
        card.className = "card admin-only";
        card.innerHTML =
          '<div class="card-head"><div><h2>Negocio y logotipo</h2><p class="muted small">Estos datos también pueden aparecer en el ticket.</p></div></div><div id="solrakBusinessProfileHost"></div>';
        configGrid.insertBefore(card, configGrid.firstChild);
      }
      const host = byId("solrakBusinessProfileHost");
      if (host && profileSection.parentElement !== host)
        host.appendChild(profileSection);
      card.classList.toggle("hidden", !isAdminUser());
    }
  }

  function hideFloatingShortcuts() {
    document.querySelectorAll("body *").forEach((node) => {
      if (node.childElementCount || node.closest(".nav")) return;
      if (node.closest("#tab-correo,#tab-timbres,#tab-tickets,#frBrandPanel"))
        return;
      const text = clean(node.textContent).toLocaleLowerCase("es-MX");
      if (text !== "correo" && text !== "timbres") return;
      const target =
        node.closest("button,a,[role='button'],.pill,.badge") || node;
      target.dataset.solrakFloatingShortcut = "1";
      target.setAttribute("aria-hidden", "true");
    });
  }

  function logoUrl() {
    const logo = byId("frLogoPreview");
    if (!logo || !logo.getAttribute("src")) return "";
    return logo.src || logo.getAttribute("src") || "";
  }

  function code39Svg(value) {
    const patterns = {
      "0": "101001101101",
      "1": "110100101011",
      "2": "101100101011",
      "3": "110110010101",
      "4": "101001101011",
      "5": "110100110101",
      "6": "101100110101",
      "7": "101001011011",
      "8": "110100101101",
      "9": "101100101101",
      V: "100110101011",
      "*": "100101101101",
    };
    const normalized = clean(value).toUpperCase().replace(/[^V0-9]/g, "");
    const bits = `*${normalized || "V000000"}*`
      .split("")
      .map((char) => patterns[char] || patterns["0"])
      .join("0");
    const bars = [...bits]
      .map((bit, index) =>
        bit === "1"
          ? `<rect x="${index}" y="0" width="1" height="30" fill="#000"/>`
          : "",
      )
      .join("");
    return `<svg class="ticket-barcode" viewBox="0 0 ${bits.length} 30" preserveAspectRatio="none" aria-label="Código de barras ${escapeHtml(normalized)}">${bars}</svg>`;
  }

  function sampleReceipt() {
    return {
      saleNumber: 123,
      ticketNumber: 1,
      createdAt: new Date().toISOString(),
      customerName: "Público general",
      items: [
        {
          code: "7501234567890",
          name: "Producto de prueba",
          qty: 2,
          unitPrice: 25,
          total: 50,
        },
        {
          code: "44012",
          name: "Mensula de acero blanca",
          qty: 1,
          unitPrice: 29,
          total: 29,
        },
      ],
      payments: [{ method: "cash", amount: 79, tendered: 100 }],
      subtotal: 68.1,
      tax: 10.9,
      total: 79,
      change: 21,
      note: "",
    };
  }

  function receiptMarkup(receipt, currentSettings = loadSettings()) {
    const number = String(receipt?.saleNumber || 0).padStart(6, "0");
    const barcodeValue = number;
    const date = new Date(receipt?.createdAt || Date.now()).toLocaleString(
      "es-MX",
      { dateStyle: "short", timeStyle: "short" },
    );
    const logo = currentSettings.showLogo ? logoUrl() : "";
    const rows = (receipt?.items || [])
      .map(
        (item) => `<tr><td><div class="ticket-item-name">${escapeHtml(item.name || "Producto")}</div><div class="ticket-item-code">${escapeHtml(item.code || "")}</div></td><td class="num">${Number(item.qty || 0).toLocaleString("es-MX", { maximumFractionDigits: 3 })}</td><td class="num">${moneyText(item.unitPrice)}</td><td class="num">${moneyText(item.total)}</td></tr>`,
      )
      .join("");
    const payments = (receipt?.payments || [])
      .map(
        (payment) => `<div class="ticket-payment-row"><span>${escapeHtml(PAYMENT_LABELS[payment.method] || payment.method || "Pago")}</span><strong>${moneyText(payment.amount)}</strong></div>`,
      )
      .join("");
    const businessMeta = [
      currentSettings.address,
      currentSettings.phone ? `Tel. ${currentSettings.phone}` : "",
      currentSettings.rfc ? `RFC ${currentSettings.rfc}` : "",
    ]
      .filter(Boolean)
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");
    return `<div class="ticket-sheet">
      <div class="ticket-head">${logo ? `<img class="ticket-logo" src="${escapeHtml(logo)}" alt="Logotipo">` : ""}<div class="ticket-business">${escapeHtml(currentSettings.businessName || "SOLRAK")}</div>${currentSettings.showAddress && businessMeta ? `<div class="ticket-business-meta">${businessMeta}</div>` : ""}</div>
      <hr class="ticket-rule"><div class="ticket-folio">TICKET DE VENTA #${number}</div><div class="ticket-date">${escapeHtml(date)}</div>
      <div class="ticket-customer"><strong>Cliente:</strong> ${escapeHtml(receipt?.customerName || "Público general")}</div>
      <table class="ticket-items"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>${rows}</tbody></table>
      <hr class="ticket-rule"><div class="ticket-totals"><div class="ticket-total-row"><span>Subtotal</span><strong>${moneyText(receipt?.subtotal)}</strong></div>${currentSettings.showTax ? `<div class="ticket-total-row"><span>IVA</span><strong>${moneyText(receipt?.tax)}</strong></div>` : ""}<div class="ticket-total-row grand"><span>Total</span><strong>${moneyText(receipt?.total)}</strong></div></div>
      ${payments ? `<div class="ticket-payments">${payments}${Number(receipt?.change) > 0 ? `<div class="ticket-payment-row"><span>Cambio</span><strong>${moneyText(receipt.change)}</strong></div>` : ""}</div>` : ""}
      ${receipt?.note ? `<div class="ticket-note"><strong>Nota:</strong> ${escapeHtml(receipt.note)}</div>` : ""}
      ${currentSettings.showBarcode ? `${code39Svg(barcodeValue)}<div class="ticket-barcode-text">${escapeHtml(barcodeValue)}</div>` : ""}
      ${currentSettings.footer ? `<div class="ticket-footer">${escapeHtml(currentSettings.footer)}</div>` : ""}
    </div>`;
  }

  function printDocument(receipt, currentSettings) {
    const paper = currentSettings.paperSize === "80" ? 80 : 58;
    const copies = Math.min(2, Math.max(1, Number(currentSettings.copies) || 1));
    const sheets = Array.from(
      { length: copies },
      () => `<div class="ticket-copy">${receiptMarkup(receipt, currentSettings)}</div>`,
    ).join("");
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket de venta</title><style>@page{size:${paper}mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}body{width:${paper}mm}.ticket-copy{width:${paper}mm;padding:3mm}.ticket-copy+.ticket-copy{break-before:page;page-break-before:always}.ticket-sheet{box-sizing:border-box;color:#000;background:#fff;font:10px/1.35 Arial,sans-serif}.ticket-sheet *{box-sizing:border-box}.ticket-head{text-align:center}.ticket-logo{display:block;max-width:20mm;max-height:16mm;margin:0 auto 2mm;object-fit:contain}.ticket-business{font-size:14px;font-weight:900;line-height:1.2;text-transform:uppercase}.ticket-business-meta{margin-top:1mm;font-size:8px;line-height:1.35}.ticket-rule{border:0;border-top:.25mm dashed #000;margin:2mm 0}.ticket-folio{text-align:center;font-size:11px;font-weight:850}.ticket-date{text-align:center;font-size:8px;margin-top:.7mm}.ticket-customer{margin:2mm 0;font-size:8px}.ticket-items{width:100%;border-collapse:collapse;font-size:8px}.ticket-items th,.ticket-items td{padding:1mm .3mm;border:0;vertical-align:top}.ticket-items th{border-bottom:.25mm solid #000;text-align:left;font-weight:800}.ticket-items .num{text-align:right;white-space:nowrap}.ticket-item-name{font-weight:700}.ticket-item-code{font-size:7px}.ticket-totals{margin-left:auto;width:76%;font-size:9px}.ticket-total-row{display:flex;justify-content:space-between;gap:2mm;padding:.6mm 0}.ticket-total-row.grand{margin-top:.5mm;padding-top:1.2mm;border-top:.25mm solid #000;font-size:13px;font-weight:900}.ticket-payments{margin-top:2mm;font-size:8px}.ticket-payment-row{display:flex;justify-content:space-between;gap:2mm}.ticket-note{margin-top:2mm;font-size:8px}.ticket-barcode{display:block;width:100%;height:10mm;margin:2mm auto .5mm}.ticket-barcode-text{text-align:center;font:8px monospace;letter-spacing:.12em}.ticket-footer{margin-top:2.5mm;text-align:center;font-size:9px;font-weight:700;white-space:pre-line}</style></head><body>${sheets}</body></html>`;
  }

  function printReceipt(receipt, options = {}) {
    const currentSettings = loadSettings();
    if (!receipt) return false;
    if (!options.force && !currentSettings.printerEnabled) return false;
    const html = printDocument(receipt, currentSettings);
    if (typeof window.__SOLRAK_TEST_PRINT__ === "function") {
      window.__SOLRAK_TEST_PRINT__({ html, receipt, settings: currentSettings });
      return true;
    }
    const frame = document.createElement("iframe");
    frame.title = "Impresión de ticket";
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    frame.onload = () => {
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          if (typeof window.notice === "function")
            window.notice("Windows no pudo abrir la impresión del ticket.", true);
        }
      }, 120);
      setTimeout(() => frame.remove(), 60000);
    };
    document.body.appendChild(frame);
    frame.srcdoc = html;
    return true;
  }

  function readTicketForm() {
    return {
      printerEnabled: !!byId("solrakTicketPrinterEnabled")?.checked,
      autoPrint: !!byId("solrakTicketAutoPrint")?.checked,
      paperSize: byId("solrakTicketPaper")?.value === "80" ? "80" : "58",
      copies: Math.min(
        2,
        Math.max(1, Number(byId("solrakTicketCopies")?.value) || 1),
      ),
      showLogo: !!byId("solrakTicketShowLogo")?.checked,
      showAddress: !!byId("solrakTicketShowAddress")?.checked,
      showTax: !!byId("solrakTicketShowTax")?.checked,
      showBarcode: !!byId("solrakTicketShowBarcode")?.checked,
      businessName: clean(byId("solrakTicketBusinessName")?.value) || "SOLRAK",
      address: clean(byId("solrakTicketAddress")?.value),
      phone: clean(byId("solrakTicketPhone")?.value),
      rfc: clean(byId("solrakTicketRfc")?.value).toUpperCase(),
      footer: clean(byId("solrakTicketFooter")?.value),
    };
  }

  function showTicketMessage(message) {
    const box = byId("solrakTicketMessage");
    if (!box) return;
    box.textContent = message;
    box.classList.add("on");
    clearTimeout(showTicketMessage.timer);
    showTicketMessage.timer = setTimeout(() => box.classList.remove("on"), 3500);
  }

  function saveTicketSettings(showMessage = true) {
    settings = { ...loadSettings(), ...readTicketForm() };
    writeStored(settingsStorageKey, settings);
    updateTicketControls();
    renderTicketPreview();
    if (showMessage) showTicketMessage("Configuración de tickets guardada.");
    return settings;
  }

  function syncTicketForm() {
    const formMarker = byId("tab-tickets");
    if (!formMarker) return;
    const currentSettings = loadSettings();
    if (formMarker.dataset.loadedTicketKey === settingsStorageKey) {
      updateTicketControls();
      return;
    }
    formMarker.dataset.loadedTicketKey = settingsStorageKey;
    const checks = {
      solrakTicketPrinterEnabled: currentSettings.printerEnabled,
      solrakTicketAutoPrint: currentSettings.autoPrint,
      solrakTicketShowLogo: currentSettings.showLogo,
      solrakTicketShowAddress: currentSettings.showAddress,
      solrakTicketShowTax: currentSettings.showTax,
      solrakTicketShowBarcode: currentSettings.showBarcode,
    };
    Object.entries(checks).forEach(([id, value]) => {
      if (byId(id)) byId(id).checked = !!value;
    });
    const values = {
      solrakTicketPaper: currentSettings.paperSize,
      solrakTicketCopies: String(currentSettings.copies),
      solrakTicketBusinessName: currentSettings.businessName,
      solrakTicketAddress: currentSettings.address,
      solrakTicketPhone: currentSettings.phone,
      solrakTicketRfc: currentSettings.rfc,
      solrakTicketFooter: currentSettings.footer,
    };
    Object.entries(values).forEach(([id, value]) => {
      if (byId(id)) byId(id).value = value ?? "";
    });
    updateTicketControls();
    renderTicketPreview();
  }

  function updateTicketControls() {
    const enabled = !!byId("solrakTicketPrinterEnabled")?.checked;
    ["solrakTicketAutoPrint", "solrakTicketPrinter", "solrakTicketPaper", "solrakTicketCopies"].forEach(
      (id) => {
        if (byId(id)) byId(id).disabled = !enabled;
      },
    );
    byId("solrakTicketReprint")?.classList.toggle("hidden", !lastReceipt);
  }

  function renderTicketPreview() {
    const host = byId("solrakTicketPreview");
    if (!host) return;
    const currentSettings = byId("solrakTicketBusinessName")
      ? { ...loadSettings(), ...readTicketForm() }
      : loadSettings();
    host.innerHTML = `<div class="solrakTicketPaper ${currentSettings.paperSize === "80" ? "paper80" : ""}">${receiptMarkup(sampleReceipt(), currentSettings)}</div>`;
    if (byId("solrakTicketPreviewSize"))
      byId("solrakTicketPreviewSize").textContent = `${currentSettings.paperSize} mm`;
  }

  function bindTicketForm() {
    const panel = byId("tab-tickets");
    if (!panel || panel.dataset.ticketBound === "1") return;
    panel.dataset.ticketBound = "1";
    panel.querySelectorAll("input,select,textarea").forEach((control) => {
      control.addEventListener("input", () => {
        updateTicketControls();
        renderTicketPreview();
      });
      control.addEventListener("change", () => {
        updateTicketControls();
        renderTicketPreview();
      });
    });
    byId("solrakTicketSave").onclick = () => saveTicketSettings(true);
    byId("solrakTicketTest").onclick = () => {
      saveTicketSettings(false);
      printReceipt(sampleReceipt(), { force: true });
      showTicketMessage("Ticket de prueba enviado a la impresión de Windows.");
    };
    byId("solrakTicketReprint").onclick = () => {
      if (!lastReceipt) return;
      printReceipt(lastReceipt, { force: true });
      showTicketMessage("Último ticket enviado nuevamente a impresión.");
    };
    syncTicketForm();
  }

  function onSaleComplete(event) {
    const receipt = event?.detail;
    if (!receipt?.saleNumber) return;
    lastReceipt = receipt;
    writeStored(keyFor(LAST_RECEIPT_PREFIX), receipt);
    updateTicketControls();
    const confirmation = byId("posReceipt")?.querySelector(".frPosReceipt");
    if (confirmation && !confirmation.querySelector(".solrakReceiptPrint")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "solrakReceiptPrint";
      button.textContent = "Imprimir ticket";
      button.onclick = () => printReceipt(receipt, { force: true });
      confirmation.appendChild(button);
    }
    const currentSettings = loadSettings();
    if (currentSettings.printerEnabled && currentSettings.autoPrint)
      setTimeout(() => printReceipt(receipt), 160);
  }

  function mount() {
    injectStyle();
    document.documentElement.dataset.solrakSumaproTickets = "1";
    loadSettings();
    ensurePanels();
    ensureNav();
    moveExistingSettings();
    hideFloatingShortcuts();
    syncTicketForm();
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 25);
  }

  function boot() {
    mount();
    document.addEventListener("solrak:pos-sale-complete", onSaleComplete);
    const nav = document.querySelector(".nav");
    if (nav)
      new MutationObserver(scheduleMount).observe(nav, {
        childList: true,
        subtree: false,
      });
    const main = document.querySelector("main.shell") || document.body;
    new MutationObserver(scheduleMount).observe(main, {
      childList: true,
      subtree: true,
    });
    setTimeout(mount, 300);
    setTimeout(mount, 1100);
    setInterval(mount, 3000);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.SOLRAKSumaproTicketsV0169 = {
    version: VERSION,
    mount,
    openTab,
    printReceipt,
    printTest: () => printReceipt(sampleReceipt(), { force: true }),
    get settings() {
      return { ...loadSettings() };
    },
    get lastReceipt() {
      return lastReceipt;
    },
  };
})();
