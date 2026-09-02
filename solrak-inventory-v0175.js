(() => {
  "use strict";

  const VERSION = "0.1.75";
  const INVENTORY_API = "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/inventory-api";
  const SUPPLIER_API = "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/supplier-api";
  const byId = (id) => document.getElementById(id);
  const escHtml = (value) => String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const moneyMx = (value) => Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  let purchaseLines = [];
  let supplierRows = [];

  function productsNow() {
    try {
      return Array.isArray(products) ? products : [];
    } catch {
      return Array.isArray(window.products) ? window.products : [];
    }
  }

  function sessionToken() {
    try {
      return session?.token || "";
    } catch {
      return window.session?.token || "";
    }
  }

  function anonKey() {
    try {
      return ANON_KEY || "";
    } catch {
      return window.ANON_KEY || "";
    }
  }

  async function callApi(url, action, payload = {}) {
    const key = anonKey();
    const headers = {
      Authorization: "Bearer " + key,
      apikey: key,
      "Content-Type": "application/json",
    };
    const token = sessionToken();
    if (token) headers["x-session-token"] = token;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || data.detail || "No se pudo continuar");
    return data;
  }

  const inventoryApi = (action, payload = {}) => callApi(INVENTORY_API, action, payload);
  const supplierApi = (action, payload = {}) => callApi(SUPPLIER_API, action, payload);

  function notify(message, error = false) {
    try {
      if (typeof notice === "function") return notice(message, error);
    } catch {}
    console[error ? "error" : "info"]("SOLRAK", message);
  }

  function showDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function findMatches(query) {
    const q = String(query || "").trim().toLocaleLowerCase("es-MX");
    const rows = productsNow().filter((p) => p?.active !== false);
    if (!q) return rows.slice(0, 30);
    const exact = rows.filter((p) => String(p.code || "").trim().toLocaleLowerCase("es-MX") === q);
    if (exact.length) return exact;
    return rows.filter((p) => `${p.code || ""} ${p.name || ""}`.toLocaleLowerCase("es-MX").includes(q)).slice(0, 30);
  }

  function renderProductSelect(inputId, selectId) {
    const input = byId(inputId), select = byId(selectId);
    if (!input || !select) return;
    const rows = findMatches(input.value);
    select.innerHTML = rows.length
      ? rows.map((p) => `<option value="${escHtml(p.id)}">${escHtml(p.code || "—")} · ${escHtml(p.name)} · Exist. ${Number(p.stock || 0)}</option>`).join("")
      : '<option value="">Sin resultados</option>';
  }

  function purchaseTotals() {
    return purchaseLines.reduce((acc, line) => {
      const subtotal = Number(line.qty) * Number(line.unitCost);
      const iva = subtotal * (Number(line.ivaRate) / 100);
      acc.subtotal += subtotal;
      acc.iva += iva;
      acc.total += subtotal + iva;
      return acc;
    }, { subtotal: 0, iva: 0, total: 0 });
  }

  function renderPurchaseLines() {
    const box = byId("solrakPurchaseLines");
    if (!box) return;
    box.innerHTML = purchaseLines.length
      ? `<div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Costo</th><th>IVA</th><th>Total</th><th></th></tr></thead><tbody>${purchaseLines.map((line, index) => {
          const subtotal = line.qty * line.unitCost;
          const total = subtotal * (1 + line.ivaRate / 100);
          return `<tr><td>${escHtml(line.code || "—")}</td><td>${escHtml(line.name)}</td><td>${line.qty}</td><td>${moneyMx(line.unitCost)}</td><td>${line.ivaRate}%</td><td>${moneyMx(total)}</td><td><button class="fielBtn danger" type="button" data-solrak-purchase-remove="${index}">Quitar</button></td></tr>`;
        }).join("")}</tbody></table></div>`
      : '<div class="fielEmpty">Agrega los productos recibidos del proveedor.</div>';
    box.querySelectorAll("[data-solrak-purchase-remove]").forEach((button) => {
      button.onclick = () => {
        purchaseLines.splice(Number(button.dataset.solrakPurchaseRemove), 1);
        renderPurchaseLines();
      };
    });
    const totals = purchaseTotals();
    if (byId("solrakPurchaseTotals")) byId("solrakPurchaseTotals").textContent = `Subtotal ${moneyMx(totals.subtotal)} · IVA ${moneyMx(totals.iva)} · Total ${moneyMx(totals.total)}`;
  }

  async function loadSuppliers() {
    const select = byId("solrakPurchaseSupplier");
    if (!select) return;
    select.innerHTML = '<option value="">Cargando proveedores…</option>';
    try {
      const result = await supplierApi("listSuppliers", { activeOnly: true });
      supplierRows = result.suppliers || [];
      select.innerHTML = supplierRows.length
        ? '<option value="">Selecciona proveedor</option>' + supplierRows.map((row) => `<option value="${escHtml(row.id)}">${escHtml(row.name)}</option>`).join("")
        : '<option value="">No hay proveedores activos</option>';
      byId("solrakNoSuppliers")?.classList.toggle("hidden", supplierRows.length > 0);
    } catch (error) {
      select.innerHTML = '<option value="">No se pudieron cargar proveedores</option>';
      notify(error.message, true);
    }
  }

  async function refreshInventoryData() {
    try {
      if (typeof loadData === "function") await loadData();
    } catch {}
    try { await window.FacturaRapidaPOS?.refresh?.(); } catch {}
  }

  function openPurchaseEntry() {
    purchaseLines = [];
    renderPurchaseLines();
    byId("solrakPurchaseSearch").value = "";
    renderProductSelect("solrakPurchaseSearch", "solrakPurchaseProduct");
    showDialog(byId("solrakPurchaseDialog"));
    loadSuppliers();
    setTimeout(() => byId("solrakPurchaseSearch")?.focus(), 30);
  }

  function openAdjustment(defaultSign = -1) {
    byId("solrakAdjustSearch").value = "";
    byId("solrakAdjustQty").value = "1";
    byId("solrakAdjustReason").value = "";
    byId("solrakAdjustDirection").value = defaultSign < 0 ? "out" : "in";
    renderProductSelect("solrakAdjustSearch", "solrakAdjustProduct");
    showDialog(byId("solrakAdjustDialog"));
    setTimeout(() => byId("solrakAdjustSearch")?.focus(), 30);
  }

  function injectUi() {
    if (byId("solrakPurchaseDialog")) return true;
    const host = document.body;
    if (!host) return false;
    host.insertAdjacentHTML("beforeend", `
      <dialog id="solrakPurchaseDialog" class="fielDialog wide">
        <div class="fielDialogHead">Entrada de Mercancía<button class="fielDialogClose" type="button" data-solrak-close="solrakPurchaseDialog">×</button></div>
        <div class="fielDialogBody">
          <div class="fielFormGrid">
            <label class="fielLabel wide">Proveedor<select id="solrakPurchaseSupplier" class="fielField"></select></label>
            <div id="solrakNoSuppliers" class="fielSoon wide hidden">Primero registra al proveedor en el módulo Proveedores. La entrada de mercancía siempre queda ligada al proveedor real.</div>
            <label class="fielLabel wide">Buscar producto por código o nombre<input id="solrakPurchaseSearch" class="fielField" autocomplete="off" placeholder="Escanea código o escribe producto"></label>
            <label class="fielLabel wide">Producto<select id="solrakPurchaseProduct" class="fielField"></select></label>
            <label class="fielLabel">Cantidad recibida<input id="solrakPurchaseQty" class="fielField" type="number" min="0.001" step="0.001" value="1"></label>
            <label class="fielLabel">Costo unitario<input id="solrakPurchaseCost" class="fielField" type="number" min="0" step="0.0001" value="0"></label>
            <label class="fielLabel">IVA de compra<select id="solrakPurchaseIva" class="fielField"><option value="16">16%</option><option value="0">0%</option><option value="8">8%</option></select></label>
            <div class="fielLabel"><span>&nbsp;</span><button id="solrakPurchaseAdd" class="fielBtn primary" type="button">Agregar producto</button></div>
            <label class="fielLabel wide">Notas / referencia<input id="solrakPurchaseNotes" class="fielField" maxlength="500" placeholder="Factura, pedido o comentario"></label>
          </div>
          <div id="solrakPurchaseLines" style="margin-top:14px"></div>
          <div id="solrakPurchaseTotals" style="font-weight:800;text-align:right;margin-top:10px">Total $0.00</div>
          <div class="fielSoon" style="margin-top:12px">Al guardar, SOLRAK aumenta existencias y actualiza el costo mediante promedio ponderado. El movimiento queda en el historial de inventario.</div>
          <div class="fielDialogFoot"><button id="solrakPurchaseSave" class="fielBtn primary" type="button">Guardar entrada</button><button class="fielBtn" type="button" data-solrak-close="solrakPurchaseDialog">Cerrar</button></div>
        </div>
      </dialog>

      <dialog id="solrakAdjustDialog" class="fielDialog wide">
        <div class="fielDialogHead">Entrada / Salida de Inventario<button class="fielDialogClose" type="button" data-solrak-close="solrakAdjustDialog">×</button></div>
        <div class="fielDialogBody">
          <div class="fielFormGrid">
            <label class="fielLabel wide">Buscar producto por código o nombre<input id="solrakAdjustSearch" class="fielField" autocomplete="off" placeholder="Escanea código o escribe producto"></label>
            <label class="fielLabel wide">Producto<select id="solrakAdjustProduct" class="fielField"></select></label>
            <label class="fielLabel">Movimiento<select id="solrakAdjustDirection" class="fielField"><option value="out">Merma / salida de producto</option><option value="in">Entrada manual / ajuste positivo</option></select></label>
            <label class="fielLabel">Cantidad<input id="solrakAdjustQty" class="fielField" type="number" min="0.001" step="0.001" value="1"></label>
            <label class="fielLabel wide">Motivo<input id="solrakAdjustReason" class="fielField" maxlength="500" placeholder="Ej. producto dañado, ajuste físico, regalo, diferencia de conteo" required></label>
          </div>
          <div class="fielSoon" style="margin-top:12px">Las mermas disminuyen existencias y siempre requieren un motivo. Las entradas de proveedor deben registrarse en Entrada de Mercancía para mantener el costo promedio.</div>
          <div class="fielDialogFoot"><button id="solrakAdjustSave" class="fielBtn primary" type="button">Registrar movimiento</button><button class="fielBtn" type="button" data-solrak-close="solrakAdjustDialog">Cerrar</button></div>
        </div>
      </dialog>
    `);

    document.querySelectorAll("[data-solrak-close]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(byId(button.dataset.solrakClose)));
    });

    byId("solrakPurchaseSearch").addEventListener("input", () => renderProductSelect("solrakPurchaseSearch", "solrakPurchaseProduct"));
    byId("solrakAdjustSearch").addEventListener("input", () => renderProductSelect("solrakAdjustSearch", "solrakAdjustProduct"));

    byId("solrakPurchaseAdd").onclick = () => {
      const productId = byId("solrakPurchaseProduct").value;
      const product = productsNow().find((row) => row.id === productId);
      const qty = Number(byId("solrakPurchaseQty").value);
      const unitCost = Number(byId("solrakPurchaseCost").value);
      const ivaRate = Number(byId("solrakPurchaseIva").value);
      if (!product) return notify("Selecciona un producto.", true);
      if (!(qty > 0)) return notify("Escribe una cantidad válida.", true);
      if (!(unitCost >= 0)) return notify("Escribe un costo válido.", true);
      const existing = purchaseLines.find((line) => line.productId === productId);
      if (existing) Object.assign(existing, { qty: existing.qty + qty, unitCost, ivaRate });
      else purchaseLines.push({ productId, code: product.code || "", name: product.name, qty, unitCost, ivaRate });
      byId("solrakPurchaseQty").value = "1";
      byId("solrakPurchaseCost").value = Number(product.cost || 0).toFixed(4);
      renderPurchaseLines();
    };

    byId("solrakPurchaseProduct").addEventListener("change", () => {
      const product = productsNow().find((row) => row.id === byId("solrakPurchaseProduct").value);
      if (product) byId("solrakPurchaseCost").value = Number(product.cost || 0).toFixed(4);
    });

    byId("solrakPurchaseSave").onclick = async () => {
      const supplierId = byId("solrakPurchaseSupplier").value;
      if (!supplierId) return notify("Selecciona un proveedor.", true);
      if (!purchaseLines.length) return notify("Agrega al menos un producto.", true);
      const button = byId("solrakPurchaseSave");
      button.disabled = true;
      try {
        const result = await inventoryApi("receivePurchase", {
          supplierId,
          notes: byId("solrakPurchaseNotes").value.trim(),
          items: purchaseLines.map((line) => ({ productId: line.productId, qty: line.qty, unitCost: line.unitCost, ivaRate: line.ivaRate })),
        });
        notify(`Entrada #${result.order_number || "—"} registrada por ${moneyMx(result.total || 0)}.`);
        closeDialog(byId("solrakPurchaseDialog"));
        await refreshInventoryData();
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
      }
    };

    byId("solrakAdjustSave").onclick = async () => {
      const productId = byId("solrakAdjustProduct").value;
      const qty = Number(byId("solrakAdjustQty").value);
      const reason = byId("solrakAdjustReason").value.trim();
      const sign = byId("solrakAdjustDirection").value === "out" ? -1 : 1;
      if (!productId) return notify("Selecciona un producto.", true);
      if (!(qty > 0)) return notify("Escribe una cantidad válida.", true);
      if (!reason) return notify("Escribe el motivo del movimiento.", true);
      const button = byId("solrakAdjustSave");
      button.disabled = true;
      try {
        const result = await inventoryApi("adjustStock", { productId, quantityDelta: sign * qty, reason });
        notify(`Movimiento registrado. Existencia nueva: ${Number(result.stock_after || 0)}.`);
        closeDialog(byId("solrakAdjustDialog"));
        await refreshInventoryData();
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
      }
    };

    return true;
  }

  function insertMenuItems() {
    const submenu = document.querySelector('[data-fiel-submenu="products"]');
    if (!submenu || submenu.querySelector('[data-solrak-inventory="purchase"]')) return Boolean(submenu);
    const purchase = document.createElement("button");
    purchase.className = "fielMenuItem";
    purchase.type = "button";
    purchase.dataset.solrakInventory = "purchase";
    purchase.innerHTML = '<span style="width:18px;text-align:center;font-weight:900">＋</span><span>Entrada de Mercancía</span>';
    purchase.onclick = openPurchaseEntry;
    const adjustment = document.createElement("button");
    adjustment.className = "fielMenuItem";
    adjustment.type = "button";
    adjustment.dataset.solrakInventory = "adjustment";
    adjustment.innerHTML = '<span style="width:18px;text-align:center;font-weight:900">±</span><span>Mermas / Ajustes</span>';
    adjustment.onclick = () => openAdjustment(-1);
    const lowStock = submenu.querySelector('[data-fiel-action="low-stock"]');
    submenu.insertBefore(purchase, lowStock || null);
    submenu.insertBefore(adjustment, lowStock || null);
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    injectUi();
    insertMenuItems();
    if ((byId("solrakPurchaseDialog") && document.querySelector('[data-solrak-inventory="purchase"]')) || attempts > 150) window.clearInterval(timer);
  }, 100);

  window.SOLRAKInventoryV0175 = {
    version: VERSION,
    inventoryApi,
    openPurchaseEntry,
    openAdjustment,
    purchaseTotals,
  };
})();
