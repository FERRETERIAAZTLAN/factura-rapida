(() => {
  "use strict";

  const VERSION = "0.1.77";
  const IMAGE_BASE = "https://jojzhohqrshsjmlirkqz.supabase.co/storage/v1/object/public/product-images/";
  const STYLE_ID = "solrakPriceVerifierV0177Style";
  let activeProductId = "";

  const byId = (id) => document.getElementById(id);
  const clean = (value) => String(value ?? "").trim();
  const lower = (value) => clean(value).toLocaleLowerCase("es-MX");
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"})[char]);
  const money = (value) => Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  function currentProducts() {
    try {
      if (Array.isArray(products)) return products;
    } catch {}
    return Array.isArray(window.products) ? window.products : [];
  }

  function productImageUrl(product) {
    if (product?.image_url) return String(product.image_url);
    if (!product?.image_path) return "";
    return IMAGE_BASE + String(product.image_path).split("/").map(encodeURIComponent).join("/");
  }

  function findProduct(query) {
    const q = lower(query);
    if (!q) return null;
    const rows = currentProducts().filter((product) => product?.active !== false);
    return (
      rows.find((product) => lower(product.code) === q) ||
      rows.find((product) => lower(product.name) === q) ||
      rows.find((product) => lower(product.description) === q) ||
      rows.find((product) => lower(product.code).includes(q)) ||
      rows.find((product) => lower(product.name).includes(q)) ||
      rows.find((product) => lower(product.description).includes(q)) ||
      null
    );
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#fielPriceResult .solrakPriceV0177{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,260px);gap:18px;width:100%;align-items:start}
#fielPriceResult .solrakPriceInfo h2{margin:0 0 5px;font-size:24px;color:#20262c}
#fielPriceResult .solrakPriceDescription{margin:0 0 14px;color:#66717b;font-size:13px;line-height:1.45}
#fielPriceResult .solrakPriceFacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
#fielPriceResult .solrakPriceFact{padding:10px 11px;border:1px solid #e0e4e7;background:#fff;border-radius:6px}
#fielPriceResult .solrakPriceFact span{display:block;color:#7b858e;font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:.04em}
#fielPriceResult .solrakPriceFact strong{display:block;margin-top:4px;font-size:15px;color:#263039}
#fielPriceResult .solrakPriceSale{margin-top:15px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#fielPriceResult .solrakPriceAdd{min-width:180px;border:0;border-radius:5px;padding:11px 16px;background:#176fd1;color:#fff;font-weight:800;cursor:pointer}
#fielPriceResult .solrakPriceAdd:disabled{opacity:.48;cursor:not-allowed}
#fielPriceResult .solrakPriceImage{min-height:220px;display:grid;place-items:center;border:1px solid #e1e5e8;border-radius:7px;background:#fff;overflow:hidden}
#fielPriceResult .solrakPriceImage img{display:block;width:100%;height:220px;object-fit:contain}
#fielPriceResult .solrakPriceNoImage{color:#929ba3;font-size:12px}
#fielPriceResult .solrakPriceStockBad{color:#b33d3d!important}
@media(max-width:760px){#fielPriceResult .solrakPriceV0177{grid-template-columns:1fr}#fielPriceResult .solrakPriceFacts{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);
  }

  function notify(message, error = false) {
    if (typeof window.notice === "function") window.notice(message, error);
    else if (error && typeof window.alert === "function") window.alert(message);
  }

  function render() {
    const query = byId("fielPriceQuery")?.value || "";
    const host = byId("fielPriceResult");
    if (!host) return;
    const product = findProduct(query);
    activeProductId = product ? String(product.id || "") : "";
    if (!product) {
      host.innerHTML = '<div class="fielEmpty">No encontré un producto activo con ese código, nombre o descripción.</div><div class="fielProductImage"></div>';
      return;
    }

    const stock = Number(product.stock || 0);
    const image = productImageUrl(product);
    const description = clean(product.description) || clean(product.name) || "Sin descripción adicional.";
    const category = clean(product.category_name || product.category || product.category_id) || "General";
    const unit = clean(product.unit) || "Pieza";
    const canAdd = stock > 0 || Boolean(window.FacturaRapidaPOS?.state?.settings?.allow_negative_stock);

    host.innerHTML = `<div class="solrakPriceV0177">
      <div class="solrakPriceInfo">
        <h2>${esc(product.name || "Producto")}</h2>
        <p class="solrakPriceDescription">${esc(description)}</p>
        <div class="solrakPriceFacts">
          <div class="solrakPriceFact"><span>Código</span><strong>${esc(product.code || "—")}</strong></div>
          <div class="solrakPriceFact"><span>Precio público</span><strong>${money(product.price)}</strong></div>
          <div class="solrakPriceFact"><span>Precio mayoreo</span><strong>${money(product.wholesale || 0)}</strong></div>
          <div class="solrakPriceFact"><span>Existencia</span><strong class="${stock <= 0 ? "solrakPriceStockBad" : ""}">${stock} ${esc(unit)}</strong></div>
          <div class="solrakPriceFact"><span>Categoría</span><strong>${esc(category)}</strong></div>
          <div class="solrakPriceFact"><span>Estado</span><strong class="${stock <= 0 ? "solrakPriceStockBad" : ""}">${stock > 0 ? "Disponible" : "Sin existencia"}</strong></div>
        </div>
        <div class="solrakPriceSale">
          <button id="solrakPriceAddV0177" class="solrakPriceAdd" type="button" ${canAdd ? "" : "disabled"}>Agregar al ticket actual</button>
          <small>${canAdd ? "Se agregará 1 unidad a la venta activa." : "No se puede agregar porque no hay existencia."}</small>
        </div>
      </div>
      <div class="solrakPriceImage">${image ? `<img src="${esc(image)}" alt="${esc(product.name || "Producto")}">` : '<span class="solrakPriceNoImage">Sin imagen</span>'}</div>
    </div>`;
    byId("solrakPriceAddV0177")?.addEventListener("click", () => addToCurrentTicket(product));
  }

  function cartQuantity() {
    const cart = window.FacturaRapidaPOS?.cart;
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((total, line) => total + Number(line?.qty || 0), 0);
  }

  function addToCurrentTicket(product) {
    const input = byId("posSearch");
    if (!input || !window.FacturaRapidaPOS) {
      notify("La pantalla de venta todavía no está lista.", true);
      return false;
    }
    const code = clean(product?.code);
    const name = clean(product?.name);
    if (!code && !name) {
      notify("Este producto no tiene código ni nombre utilizable.", true);
      return false;
    }
    const before = cartQuantity();
    input.value = code || name;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
    const after = cartQuantity();
    if (after > before) {
      window.FacturaRapidaPOS?.rerender?.();
      document.dispatchEvent(new CustomEvent("solrak:price-verifier-added", { detail: { productId: String(product.id || "") } }));
      notify(`${product.name || "Producto"} agregado al ticket.`);
      return true;
    }
    if (Number(product?.stock || 0) <= 0) return false;
    notify("No fue posible agregar el producto al ticket actual.", true);
    return false;
  }

  function bind() {
    const query = byId("fielPriceQuery");
    const search = byId("fielPriceSearch");
    const result = byId("fielPriceResult");
    if (!query || !search || !result) return false;
    injectStyle();

    if (query.dataset.solrakV0177 !== "1") {
      query.dataset.solrakV0177 = "1";
      query.addEventListener("keydown", (event) => {
        if (event.key === "Enter") window.setTimeout(render, 0);
      });
      query.addEventListener("input", () => {
        if (!clean(query.value)) activeProductId = "";
      });
    }
    if (search.dataset.solrakV0177 !== "1") {
      search.dataset.solrakV0177 = "1";
      search.addEventListener("click", () => window.setTimeout(render, 0));
    }
    if (result.dataset.solrakV0177 !== "1") {
      result.dataset.solrakV0177 = "1";
      const observer = new MutationObserver(() => {
        if (result.querySelector(".solrakPriceV0177")) return;
        const product = findProduct(query.value);
        if (product && String(product.id || "") !== activeProductId) window.setTimeout(render, 0);
      });
      observer.observe(result, { childList: true, subtree: false });
    }
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (bind() || attempts > 180) window.clearInterval(timer);
  }, 100);

  window.SOLRAKPriceVerifierV0177 = {
    version: VERSION,
    findProduct,
    render,
    addToCurrentTicket,
    bind,
  };
})();