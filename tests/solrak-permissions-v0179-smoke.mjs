import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('solrak-permissions-v0179.js', 'utf8');
const apiSource = fs.readFileSync('supabase/functions/permissions-api/index.ts', 'utf8');

assert.match(source, /0\.1\.79/);
assert.match(source, /Empleado · acceso según permisos/);
for (const key of ['allow_discounts','allow_price_changes','allow_wholesale','allow_inventory_entry']) {
  assert.ok(source.includes(key), `Falta permiso UI ${key}`);
  assert.ok(apiSource.includes(key), `Falta permiso API ${key}`);
}
assert.match(apiSource, /action==="myPermissions"/);
assert.match(apiSource, /action==="listUsersPermissions"/);
assert.match(apiSource, /action==="saveUserPermissions"/);
assert.match(apiSource, /user\.role==="admin"\)return \{\.\.\.allAllowed\}/);
assert.match(apiSource, /\.eq\("active",true\)/);
assert.ok(!/cfdi-api|finkok|recargas/i.test(source));
assert.ok(!/cfdi-api|finkok|recargas/i.test(apiSource));

const html = `<!doctype html><html><head></head><body>
<select id="userRole"><option value="seller">Vendedor</option><option value="admin">Administrador</option></select>
<section id="tab-usuarios"><div class="callout">Viejo</div><div id="userList"><span class="badge">Vendedor</span></div></section>
<button data-fiel-pos-tool="discount">Descuento</button>
<button data-solrak-inventory="purchase">Entrada</button>
<button data-solrak-inventory="adjustment">Ajuste</button>
</body></html>`;
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://solrak.local/' });
const { window } = dom;
window.session = { token: 'session-token', user: { id:'u1', role:'seller', name:'Empleado Uno' } };
window.ANON_KEY = 'anon';
window.alert = () => {};
window.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  if (body.action === 'myPermissions') {
    return { ok:true, json:async()=>({ ok:true, user:{id:'u1',name:'Empleado Uno',username:'empleado',role:'seller'}, permissions:{allow_discounts:false,allow_price_changes:false,allow_wholesale:true,allow_inventory_entry:true} }) };
  }
  throw new Error(`Acción inesperada: ${body.action}`);
};
window.eval(source);
await new Promise((resolve) => setTimeout(resolve, 150));

assert.equal(window.document.querySelector('#userRole option[value="seller"]').textContent, 'Empleado · acceso según permisos');
assert.equal(window.document.querySelector('#userList .badge').textContent, 'Empleado');
assert.equal(window.document.querySelector('[data-fiel-pos-tool="discount"]').disabled, true);
assert.equal(window.document.querySelector('[data-solrak-inventory="purchase"]').disabled, false);
assert.equal(window.document.querySelector('[data-solrak-inventory="adjustment"]').disabled, false);
assert.equal(window.document.documentElement.dataset.solrakCanDiscount, '0');
assert.equal(window.document.documentElement.dataset.solrakCanWholesale, '1');
assert.equal(window.document.documentElement.dataset.solrakCanInventoryEntry, '1');
assert.equal(window.SOLRAKPermissionsV0179.can('allow_discounts'), false);
assert.equal(window.SOLRAKPermissionsV0179.can('allow_wholesale'), true);

console.log('SOLRAK v0.1.79 permissions smoke: OK');
