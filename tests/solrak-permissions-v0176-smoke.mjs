import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-permissions-v0176.js", "utf8");
assert.match(source, /0\.1\.76/);
assert.match(source, /allow_discounts/);
assert.match(source, /allow_price_changes/);
assert.match(source, /allow_wholesale/);
assert.match(source, /allow_inventory_entry/);
assert.doesNotMatch(source, /cfdi-api|Finkok|Recargas y Servicios/i);

const dom = new JSDOM(`<!doctype html><html><body><button class="fielMenuItem" data-fiel-action="tab" data-tab-target="usuarios">Usuarios</button><div data-fiel-submenu="products"><button data-solrak-inventory="purchase">Entrada</button><button data-solrak-inventory="adjustment">Ajuste</button></div></body></html>`, {
  runScripts: "dangerously",
  url: "https://solrak.local/",
});
const { window } = dom;
window.ANON_KEY = "anon";
window.session = { token: "session" };
window.notice = () => {};
const calls = [];
window.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  calls.push(body);
  let payload = { ok: true };
  if (body.action === "myPermissions") payload = { ok: true, user: { id: "admin1", name: "Admin", username: "admin", role: "admin" }, permissions: { allow_discounts: true, allow_price_changes: true, allow_wholesale: true, allow_inventory_entry: true } };
  if (body.action === "listUsersPermissions") payload = { ok: true, users: [
    { id: "admin1", name: "Admin", username: "admin", role: "admin", active: true, permissions: { allow_discounts: true, allow_price_changes: true, allow_wholesale: true, allow_inventory_entry: true } },
    { id: "seller1", name: "Cajero", username: "cajero", role: "seller", active: true, permissions: { allow_discounts: false, allow_price_changes: false, allow_wholesale: true, allow_inventory_entry: false } },
  ] };
  if (body.action === "saveUserPermissions") payload = { ok: true, userId: body.userId, permissions: body.permissions };
  return { ok: true, async json() { return payload; } };
};

window.eval(source);
await new Promise((resolve) => setTimeout(resolve, 150));
assert.equal(window.SOLRAKPermissionsV0176.version, "0.1.76");
assert.ok(window.document.querySelector('[data-solrak-permissions="manage"]'));
assert.equal(window.document.documentElement.dataset.solrakAllowWholesale, "1");
assert.equal(window.document.querySelector('[data-solrak-inventory="purchase"]').hidden, false);

await window.SOLRAKPermissionsV0176.openManager();
const seller = window.document.querySelector('[data-solrak-permission-user="seller1"]');
assert.ok(seller);
assert.equal(seller.querySelector('[data-permission="allow_wholesale"]').checked, true);
assert.equal(seller.querySelector('[data-permission="allow_discounts"]').checked, false);
seller.querySelector('[data-permission="allow_discounts"]').checked = true;
seller.querySelector('[data-save-permissions]').click();
await new Promise((resolve) => setTimeout(resolve, 10));
const save = calls.find((call) => call.action === "saveUserPermissions");
assert.ok(save);
assert.equal(save.userId, "seller1");
assert.equal(save.permissions.allow_discounts, true);
assert.equal(save.permissions.allow_wholesale, true);

console.log("SOLRAK v0.1.76 user permissions smoke OK");
