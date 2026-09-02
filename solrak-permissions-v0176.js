(() => {
  "use strict";

  const VERSION = "0.1.76";
  const API = "https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/permissions-api";
  const byId = (id) => document.getElementById(id);
  const escHtml = (value) => String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let current = null;
  let userRows = [];

  function anonKey() {
    try { return ANON_KEY || ""; } catch { return window.ANON_KEY || ""; }
  }
  function sessionToken() {
    try { return session?.token || ""; } catch { return window.session?.token || ""; }
  }
  function notify(message, error = false) {
    try { if (typeof notice === "function") return notice(message, error); } catch {}
    if (error) window.alert?.(message);
  }
  async function api(action, payload = {}) {
    const key = anonKey();
    const headers = { Authorization: "Bearer " + key, apikey: key, "Content-Type": "application/json" };
    const token = sessionToken();
    if (token) headers["x-session-token"] = token;
    const response = await fetch(API, { method: "POST", headers, body: JSON.stringify({ action, ...payload }) });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || data.detail || "No se pudo continuar");
    return data;
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

  function applyCurrentPermissions() {
    const permissions = current?.permissions || {};
    const isAdmin = current?.user?.role === "admin";
    document.querySelectorAll('[data-solrak-inventory="purchase"],[data-solrak-inventory="adjustment"]').forEach((button) => {
      button.hidden = !(isAdmin || permissions.allow_inventory_entry === true);
    });
    const manage = document.querySelector('[data-solrak-permissions="manage"]');
    if (manage) manage.hidden = !isAdmin;
    document.documentElement.dataset.solrakAllowDiscounts = isAdmin || permissions.allow_discounts ? "1" : "0";
    document.documentElement.dataset.solrakAllowPriceChanges = isAdmin || permissions.allow_price_changes ? "1" : "0";
    document.documentElement.dataset.solrakAllowWholesale = isAdmin || permissions.allow_wholesale ? "1" : "0";
    document.documentElement.dataset.solrakAllowInventoryEntry = isAdmin || permissions.allow_inventory_entry ? "1" : "0";
    window.dispatchEvent(new CustomEvent("solrak:permissions", { detail: current }));
  }

  async function loadMine() {
    try {
      current = await api("myPermissions");
      window.SOLRAKCurrentPermissions = current;
      applyCurrentPermissions();
      return current;
    } catch (error) {
      console.warn("SOLRAK permissions", error);
      return null;
    }
  }

  function renderUsers() {
    const body = byId("solrakPermissionsRows");
    if (!body) return;
    body.innerHTML = userRows.length ? userRows.map((user) => {
      const p = user.permissions || {};
      const locked = user.role === "admin";
      const disabled = locked ? " disabled" : "";
      const checked = (value) => value === true ? " checked" : "";
      return `<tr data-solrak-permission-user="${escHtml(user.id)}"><td><strong>${escHtml(user.name || user.username)}</strong><small style="display:block;color:#74808b">${escHtml(user.username || "")} · ${user.role === "admin" ? "Administrador" : "Empleado"}${user.active === false ? " · Inactivo" : ""}</small></td><td><input type="checkbox" data-permission="allow_discounts"${checked(p.allow_discounts)}${disabled}></td><td><input type="checkbox" data-permission="allow_price_changes"${checked(p.allow_price_changes)}${disabled}></td><td><input type="checkbox" data-permission="allow_wholesale"${checked(p.allow_wholesale)}${disabled}></td><td><input type="checkbox" data-permission="allow_inventory_entry"${checked(p.allow_inventory_entry)}${disabled}></td><td>${locked ? '<span class="fielSoon">Siempre permitido</span>' : '<button class="fielBtn primary" type="button" data-save-permissions>Guardar</button>'}</td></tr>`;
    }).join("") : '<tr><td colspan="6"><div class="fielEmpty">No hay usuarios.</div></td></tr>';

    body.querySelectorAll("[data-save-permissions]").forEach((button) => {
      button.onclick = async () => {
        const row = button.closest("[data-solrak-permission-user]");
        const userId = row.dataset.solrakPermissionUser;
        const permissions = {};
        row.querySelectorAll("[data-permission]").forEach((input) => { permissions[input.dataset.permission] = input.checked; });
        button.disabled = true;
        try {
          const result = await api("saveUserPermissions", { userId, permissions });
          const target = userRows.find((user) => user.id === userId);
          if (target) target.permissions = result.permissions;
          notify("Permisos guardados.");
        } catch (error) {
          notify(error.message, true);
        } finally {
          button.disabled = false;
        }
      };
    });
  }

  async function openManager() {
    showDialog(byId("solrakPermissionsDialog"));
    const body = byId("solrakPermissionsRows");
    body.innerHTML = '<tr><td colspan="6"><div class="fielEmpty">Cargando usuarios…</div></td></tr>';
    try {
      const result = await api("listUsersPermissions");
      userRows = result.users || [];
      renderUsers();
    } catch (error) {
      body.innerHTML = `<tr><td colspan="6"><div class="fielEmpty">${escHtml(error.message)}</div></td></tr>`;
    }
  }

  function injectUi() {
    if (!byId("solrakPermissionsDialog")) {
      document.body.insertAdjacentHTML("beforeend", `
        <dialog id="solrakPermissionsDialog" class="fielDialog wide">
          <div class="fielDialogHead">Permisos de Usuarios<button class="fielDialogClose" data-solrak-permissions-close type="button">×</button></div>
          <div class="fielDialogBody">
            <p>El administrador decide qué acciones sensibles puede realizar cada empleado. Los administradores conservan todos los permisos.</p>
            <div class="fielTableWrap"><table class="fielTable"><thead><tr><th>Usuario</th><th>Descuentos</th><th>Cambiar precios</th><th>Mayoreo</th><th>Ingresar mercancía</th><th></th></tr></thead><tbody id="solrakPermissionsRows"></tbody></table></div>
            <div class="fielSoon" style="margin-top:12px">Estos permisos se validan también en el servidor para las funciones que ya los utilizan; ocultar un botón no sustituye la autorización del backend.</div>
            <div class="fielDialogFoot"><button class="fielBtn" data-solrak-permissions-close type="button">Cerrar</button></div>
          </div>
        </dialog>`);
      document.querySelectorAll("[data-solrak-permissions-close]").forEach((button) => button.addEventListener("click", () => closeDialog(byId("solrakPermissionsDialog"))));
    }
    const usersButton = document.querySelector('[data-fiel-action="tab"][data-tab-target="usuarios"]');
    if (usersButton && !document.querySelector('[data-solrak-permissions="manage"]')) {
      const button = document.createElement("button");
      button.className = "fielMenuItem";
      button.type = "button";
      button.dataset.solrakPermissions = "manage";
      button.innerHTML = '<span style="width:18px;text-align:center;font-weight:900">✓</span><span>Permisos de Usuarios</span>';
      button.onclick = openManager;
      usersButton.insertAdjacentElement("afterend", button);
    }
    return Boolean(byId("solrakPermissionsDialog"));
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    injectUi();
    if (document.querySelector('[data-solrak-permissions="manage"]') || attempts > 150) {
      window.clearInterval(timer);
      loadMine();
    }
  }, 100);

  window.addEventListener("focus", () => loadMine());
  window.SOLRAKPermissionsV0176 = { version: VERSION, api, loadMine, openManager, get current() { return current; } };
})();
