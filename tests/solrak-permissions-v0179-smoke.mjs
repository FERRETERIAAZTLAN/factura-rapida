import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-permissions-v0179.js", "utf8");
const apiSource = fs.readFileSync("supabase/functions/permissions-api/index.ts", "utf8");

assert.match(source, /0\.1\.79/);
assert.match(source, /allow_discounts/);
assert.match(source, /allow_price_changes/);
assert.match(source, /allow_wholesale/);
assert.match(source, /allow_inventory_entry/);
assert.match(source, /Empleado · permisos configurables/);
assert.match(source, /data-solrak-inventory=\\?"purchase/);
assert.match(apiSource, /saveUserPermissions/);
assert.match(apiSource, /listUsersPermissions/);
assert.match(apiSource, /myPermissions/);
assert.match(apiSource, /user\.role===\"admin\"\?\{\.\.\.allAllowed\}/);
assert.match(apiSource, /audit_logs/);
assert.doesNotMatch(source, /cfdi-api|finkok/i);
assert.doesNotMatch(apiSource, /cfdi-api|finkok/i);

function baseHtml() {
  return `<!doctype html><html><head></head><body>
    <section id="tab-usuarios"><div class="split">
      <article><form id="userForm"><select id="userRole"><option value="seller">Vendedor</option><option value="admin">Administrador</option></select></form></article>
      <article><div id="userList"><div class="user-row"><span class="badge">Vendedor</span></div></article>
    </div></section>
    <button data-solrak-inventory="purchase">Entrada de Mercancía</button>
    <button data-solrak-inventory="adjustment">Mermas / Ajustes</button>
    <button data-fiel-pos-tool="discount">Aplicar descuento</button>
  </body></html>`;
}

async function adminCase() {
  const dom = new JSDOM(baseHtml(), { runScripts: "dangerously", url: "https://solrak.local/" });
  const { window } = dom;
  window.ANON_KEY = "anon-test";
  window.session = { token: "session-test", user: { id: "admin-1", role: "admin", name: "Admin" } };
  const calls = [];
  window.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    if (body.action === "myPermissions") {
      return new Response(JSON.stringify({ ok: true, user: { id: "admin-1", name: "Admin", username: "admin", role: "admin" }, permissions: { allow_discounts: true, allow_price_changes: true, allow_wholesale: true, allow_inventory_entry: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (body.action === "listUsersPermissions") {
      return new Response(JSON.stringify({ ok: true, users: [
        { id: "admin-1", name: "Admin", username: "admin", role: "admin", active: true, permissions: { allow_discounts: true, allow_price_changes: true, allow_wholesale: true, allow_inventory_entry: true } },
        { id: "seller-1", name: "Caja Uno", username: "caja1", role: "seller", active: true, permissions: { allow_discounts: false, allow_price_changes: false, allow_wholesale: true, allow_inventory_entry: true } },
      ] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (body.action === "saveUserPermissions") {
      return new Response(JSON.stringify({ ok: true, userId: body.userId, permissions: body.permissions }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "acción inesperada" }), { status: 400, headers: { "Content-Type": "application/json" } });
  };
  window.notice = () => {};
  window.eval(source);
  await window.SOLRAKPermissionsV0179.refresh();

  assert.equal(window.SOLRAKPermissionsV0179.version, "0.1.79");
  assert.equal(window.SOLRAKPermissionsV0179.has("allow_inventory_entry"), true);
  assert.equal(window.document.querySelector('option[value="seller"]').textContent, "Empleado · permisos configurables");
  assert.equal(window.document.querySelector("#userList .badge").textContent, "Empleado");
  assert.ok(window.document.getElementById("solrakPermissionsPanel"));
  assert.match(window.document.getElementById("solrakPermissionsContent").textContent, /Caja Uno/);
  assert.match(window.document.getElementById("solrakPermissionsContent").textContent, /Empleado/);
  assert.equal(window.document.querySelector('[data-solrak-perm-user="admin-1"] input').disabled, true);

  const row = window.document.querySelector('[data-solrak-perm-user="seller-1"]');
  row.querySelector('[data-solrak-perm-key="allow_discounts"]').checked = true;
  row.querySelector('[data-solrak-perm-key="allow_inventory_entry"]').checked = false;
  row.querySelector('[data-solrak-perm-save="seller-1"]').click();
  await new Promise((resolve) => window.setTimeout(resolve, 10));
  const save = calls.find((call) => call.action === "saveUserPermissions");
  assert.ok(save);
  assert.equal(save.userId, "seller-1");
  assert.equal(save.permissions.allow_discounts, true);
  assert.equal(save.permissions.allow_inventory_entry, false);
  window.close();
}

async function employeeCase() {
  const dom = new JSDOM(baseHtml(), { runScripts: "dangerously", url: "https://solrak.local/" });
  const { window } = dom;
  window.ANON_KEY = "anon-test";
  window.session = { token: "session-test", user: { id: "seller-2", role: "seller", name: "Empleado" } };
  window.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.action, "myPermissions");
    return new Response(JSON.stringify({ ok: true, user: { id: "seller-2", name: "Empleado", username: "empleado", role: "seller" }, permissions: { allow_discounts: false, allow_price_changes: true, allow_wholesale: false, allow_inventory_entry: false } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  window.notice = () => {};
  window.eval(source);
  await window.SOLRAKPermissionsV0179.refresh();

  assert.equal(window.document.documentElement.dataset.solrakUserRole, "employee");
  assert.equal(window.SOLRAKPermissionsV0179.has("allow_price_changes"), true);
  assert.equal(window.SOLRAKPermissionsV0179.has("allow_discounts"), false);
  assert.equal(window.document.querySelector('[data-solrak-inventory="purchase"]').disabled, true);
  assert.equal(window.document.querySelector('[data-solrak-inventory="adjustment"]').disabled, true);
  assert.equal(window.document.querySelector('[data-fiel-pos-tool="discount"]').disabled, true);
  assert.equal(window.document.getElementById("solrakPermissionsPanel"), null);
  window.close();
}

await adminCase();
await employeeCase();
console.log("SOLRAK v0.1.79 permissions smoke OK");