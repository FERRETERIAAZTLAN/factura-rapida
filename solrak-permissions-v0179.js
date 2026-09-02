(() => {
  "use strict";

  const VERSION = "0.1.79";
  const API_URL = "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/permissions-api";
  const STYLE_ID = "solrakPermissionsV0179Style";
  const PANEL_ID = "solrakPermissionsPanel";
  const DEFAULTS = Object.freeze({
    allow_discounts: false,
    allow_price_changes: false,
    allow_wholesale: false,
    allow_inventory_entry: false,
  });
  const ADMIN = Object.freeze({
    allow_discounts: true,
    allow_price_changes: true,
    allow_wholesale: true,
    allow_inventory_entry: true,
  });
  const LABELS = Object.freeze({
    allow_discounts: "Aplicar descuentos",
    allow_price_changes: "Cambiar precios",
    allow_wholesale: "Aplicar mayoreo",
    allow_inventory_entry: "Ingresar / ajustar mercancía",
  });

  let myPermissions = { ...DEFAULTS };
  let myUser = null;
  let users = [];
  let refreshPromise = null;

  const byId = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function currentSession() {
    try { return session || null; } catch { return window.session || null; }
  }

  function currentRole() {
    return myUser?.role || currentSession()?.user?.role || "seller";
  }

  function sessionToken() {
    return currentSession()?.token || "";
  }

  function anonKey() {
    try { return ANON_KEY || ""; } catch { return window.ANON_KEY || ""; }
  }

  function notify(message, error = false) {
    try {
      if (typeof notice === "function") return notice(message, error);
    } catch {}
    if (typeof window.notice === "function") return window.notice(message, error);
    if (error) window.alert?.(message);
  }

  async function callApi(action, payload = {}) {
    const key = anonKey();
    const token = sessionToken();
    if (!key || !token) throw new Error("No hay una sesión válida para consultar permisos.");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
        "x-session-token": token,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || data.detail || "No se pudieron consultar los permisos.");
    return data;
  }

  function normalizePermissions(value, role = "seller") {
    if (role === "admin") return { ...ADMIN };
    const source = value || {};
    return Object.fromEntries(
      Object.keys(DEFAULTS).map((key) => [key, source[key] === true]),
    );
  }

  function has(permission) {
    if (currentRole() === "admin") return true;
    return myPermissions?.[permission] === true;
  }

  function permissionMessage(permission) {
    return `No tienes permiso para ${String(LABELS[permission] || permission).toLocaleLowerCase("es-MX")}.`;
  }

  function setControlPermission(control, permission) {
    if (!control) return;
    const allowed = has(permission);
    control.disabled = !allowed;
    control.setAttribute("aria-disabled", allowed ? "false" : "true");
    if (!allowed) control.title = permissionMessage(permission);
    else if (control.title === permissionMessage(permission)) control.removeAttribute("title");
  }

  function enforceUi() {
    const role = currentRole();
    document.documentElement.dataset.solrakUserRole = role === "admin" ? "admin" : "employee";

    setControlPermission(
      document.querySelector('[data-solrak-inventory="purchase"]'),
      "allow_inventory_entry",
    );
    setControlPermission(
      document.querySelector('[data-solrak-inventory="adjustment"]'),
      "allow_inventory_entry",
    );
    setControlPermission(
      document.querySelector('[data-fiel-pos-tool="discount"]'),
      "allow_discounts",
    );

    document.querySelectorAll("[data-solrak-requires-permission]").forEach((node) => {
      setControlPermission(node, node.dataset.solrakRequiresPermission);
    });

    const roleSelect = byId("userRole");
    if (roleSelect) {
      const sellerOption = roleSelect.querySelector('option[value="seller"]');
      if (sellerOption) sellerOption.textContent = "Empleado · permisos configurables";
      const adminOption = roleSelect.querySelector('option[value="admin"]');
      if (adminOption) adminOption.textContent = "Administrador · acceso completo";
    }

    const list = byId("userList");
    if (list) {
      list.querySelectorAll(".badge:not(.admin)").forEach((badge) => {
        if (/vendedor/i.test(badge.textContent || "")) badge.textContent = "Empleado";
      });
    }
  }

  function injectStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID}{grid-column:1/-1}
.solrakPermHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.solrakPermHeader h2{margin:0}.solrakPermHeader p{margin:5px 0 0}
.solrakPermTable{width:100%;border-collapse:collapse;font-size:12px}
.solrakPermTable th,.solrakPermTable td{padding:9px 10px;border-bottom:1px solid #edf0f2;text-align:left;vertical-align:middle}
.solrakPermTable th{background:#f6f8fa;color:#52606c;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
.solrakPermUser strong{display:block}.solrakPermUser small{display:block;color:#697583;margin-top:3px}
.solrakPermCheck{display:inline-flex;align-items:center;justify-content:center;min-width:34px}
.solrakPermCheck input{width:18px;height:18px;accent-color:#e97618}
.solrakPermSave{white-space:nowrap}.solrakPermInactive{opacity:.58}
.solrakPermLegend{margin-top:12px;padding:10px 12px;border:1px dashed #ccd5dd;background:#f7f9fb;color:#566576;font-size:11px;line-height:1.45}
@media(max-width:900px){.solrakPermScroll{overflow:auto}.solrakPermTable{min-width:780px}}
`;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    const tab = byId("tab-usuarios");
    if (!tab) return null;
    let panel = byId(PANEL_ID);
    if (panel) return panel;
    const split = tab.querySelector(".split") || tab;
    panel = document.createElement("article");
    panel.id = PANEL_ID;
    panel.className = "card admin-only";
    panel.innerHTML = `
      <div class="solrakPermHeader">
        <div><h2>Permisos por empleado</h2><p class="muted small">Controla qué operaciones sensibles puede realizar cada usuario.</p></div>
        <button id="solrakPermissionsRefresh" class="secondary compact" type="button">Actualizar</button>
      </div>
      <div id="solrakPermissionsContent" class="solrakPermScroll"><div class="empty">Cargando permisos…</div></div>
      <div class="solrakPermLegend"><strong>Administrador:</strong> siempre conserva acceso completo. <strong>Empleado:</strong> solo recibe los permisos marcados. La entrada y ajuste de inventario también se valida en el servidor, no únicamente en esta pantalla.</div>`;
    split.appendChild(panel);
    byId("solrakPermissionsRefresh").onclick = () => loadUsersPermissions(true);
    return panel;
  }

  function renderUsersPermissions() {
    const host = byId("solrakPermissionsContent");
    if (!host) return;
    if (!users.length) {
      host.innerHTML = '<div class="empty">No hay usuarios para mostrar.</div>';
      return;
    }

    host.innerHTML = `<table class="solrakPermTable"><thead><tr><th>Usuario</th>${Object.values(LABELS).map((label) => `<th>${esc(label)}</th>`).join("")}<th>Acción</th></tr></thead><tbody>${users.map((user) => {
      const admin = user.role === "admin";
      const perms = normalizePermissions(user.permissions, user.role);
      return `<tr data-solrak-perm-user="${esc(user.id)}" class="${user.active === false ? "solrakPermInactive" : ""}">
        <td class="solrakPermUser"><strong>${esc(user.name || user.username)}</strong><small>@${esc(user.username)} · ${admin ? "Administrador" : "Empleado"} · ${user.active === false ? "Inactivo" : "Activo"}</small></td>
        ${Object.keys(LABELS).map((key) => `<td><label class="solrakPermCheck" title="${esc(LABELS[key])}"><input type="checkbox" data-solrak-perm-key="${key}" ${perms[key] ? "checked" : ""} ${admin ? "disabled" : ""}></label></td>`).join("")}
        <td>${admin ? '<span class="badge admin">Acceso completo</span>' : `<button class="secondary compact solrakPermSave" type="button" data-solrak-perm-save="${esc(user.id)}">Guardar</button>`}</td>
      </tr>`;
    }).join("")}</tbody></table>`;

    host.querySelectorAll("[data-solrak-perm-save]").forEach((button) => {
      button.onclick = () => saveRow(button.dataset.solrakPermSave, button);
    });
  }

  function userRow(userId) {
    return [...document.querySelectorAll("[data-solrak-perm-user]")].find(
      (row) => row.dataset.solrakPermUser === userId,
    ) || null;
  }

  async function saveRow(userId, button) {
    const row = userRow(userId);
    if (!row) return;
    const permissions = {};
    Object.keys(LABELS).forEach((key) => {
      permissions[key] = row.querySelector(`[data-solrak-perm-key="${key}"]`)?.checked === true;
    });
    button.disabled = true;
    try {
      const result = await callApi("saveUserPermissions", { userId, permissions });
      const target = users.find((user) => user.id === userId);
      if (target) target.permissions = normalizePermissions(result.permissions, target.role);
      notify("Permisos del empleado actualizados.");
      renderUsersPermissions();
    } catch (error) {
      notify(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadUsersPermissions(force = false) {
    if (currentRole() !== "admin") return [];
    ensurePanel();
    const host = byId("solrakPermissionsContent");
    if (host && force) host.innerHTML = '<div class="empty">Actualizando permisos…</div>';
    try {
      const result = await callApi("listUsersPermissions");
      users = Array.isArray(result.users) ? result.users : [];
      renderUsersPermissions();
      return users;
    } catch (error) {
      if (host) host.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
      if (force) notify(error.message, true);
      return [];
    }
  }

  async function loadMyPermissions() {
    try {
      const result = await callApi("myPermissions");
      myUser = result.user || currentSession()?.user || null;
      myPermissions = normalizePermissions(result.permissions, myUser?.role);
      enforceUi();
      document.dispatchEvent(new CustomEvent("solrak:permissions-ready", { detail: { user: myUser, permissions: { ...myPermissions } } }));
      return { user: myUser, permissions: { ...myPermissions } };
    } catch (error) {
      myUser = currentSession()?.user || null;
      myPermissions = normalizePermissions(null, myUser?.role);
      enforceUi();
      console.warn("SOLRAK permisos", error);
      return { user: myUser, permissions: { ...myPermissions }, error };
    }
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const result = await loadMyPermissions();
      if (currentRole() === "admin") {
        ensurePanel();
        await loadUsersPermissions();
      }
      enforceUi();
      return result;
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function installObservers() {
    if (document.documentElement.dataset.solrakPermissionsV0179 === "1") return;
    document.documentElement.dataset.solrakPermissionsV0179 = "1";

    document.addEventListener("click", (event) => {
      const target = event.target?.closest?.('[data-tab-target="usuarios"], [data-tab="usuarios"]');
      if (target && currentRole() === "admin") window.setTimeout(() => loadUsersPermissions(true), 0);
    }, true);

    const observer = new MutationObserver(() => {
      enforceUi();
      if (currentRole() === "admin" && byId("tab-usuarios")) ensurePanel();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("solrak:inventory-ready", enforceUi);
    document.addEventListener("solrak:pos-sale-complete", enforceUi);
  }

  function install() {
    injectStyle();
    installObservers();
    enforceUi();
    refresh();
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if ((currentSession()?.token && byId("tab-usuarios")) || attempts > 180) {
      window.clearInterval(timer);
      if (currentSession()?.token) install();
    }
  }, 100);

  window.SOLRAKPermissionsV0179 = {
    version: VERSION,
    callApi,
    has,
    refresh,
    enforceUi,
    loadMyPermissions,
    loadUsersPermissions,
    normalizePermissions,
    get permissions() { return { ...myPermissions }; },
    get user() { return myUser; },
  };
})();