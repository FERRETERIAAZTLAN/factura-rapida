import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const path = process.argv[2] || 'desktop/dist/index.html';
const html = fs.readFileSync(path, 'utf8');

for (const marker of [
  'data-fr-login-clean="1"',
  "window.__frLoginUiVersion='15-clean'",
  'if(window.__frLoginPending)return',
  'body.loading{pointer-events:auto!important}',
  '.frWorking{opacity:.6;pointer-events:none}',
  "issueApi('timber',{draftId:d.id})",
  'data-fr-facturar-real="8"',
  'data-fr-usage-ui="1"',
  'data-fr-business-mail-ui="1"'
]) assert.ok(html.includes(marker), `Falta marcador requerido: ${marker}`);

assert.ok(!html.includes("function busy(v){loading=v;document.body.classList.toggle('loading',v)}"), 'Persistió busy global antiguo');
assert.ok(!html.includes("document.body.classList.toggle('loading',v)"), 'Persistió toggle global de loading');
assert.ok(!html.includes('if(loading)return;busy(true)'), 'El login sigue dependiendo de loading global');

// Extrae el script principal COMPLETO. La prueba anterior empezaba en const API_URL
// y podía omitir helpers definidos unas líneas antes, dando un falso negativo.
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const coreScript = inlineScripts.find(s => s.includes('const API_URL=') && s.includes("$('loginForm').onsubmit"));
assert.ok(coreScript, 'No se encontró script principal completo de la aplicación');
const cleanMatch = html.match(/<script data-fr-login-clean="1">([\s\S]*?)<\/script>/);
assert.ok(cleanMatch, 'No se encontró script de recuperación limpia del login');

let base = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
base = base.replace('</body>', `<script>${coreScript}</script><script>${cleanMatch[1]}</script></body>`);

let loginCalls = 0;
const virtualConsole = new VirtualConsole();
const jsErrors = [];
virtualConsole.on('jsdomError', e => jsErrors.push(e));
virtualConsole.on('error', e => jsErrors.push(e));

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
    async text() { return JSON.stringify(data); },
    async blob() { return new Blob([JSON.stringify(data)], { type: 'application/json' }); }
  };
}

const dom = new JSDOM(base, {
  url: 'https://factura-rapida.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.confirm = () => false;
    window.alert = () => {};
    window.scrollTo = () => {};
    window.fetch = async (url, options = {}) => {
      let payload = {};
      try { payload = JSON.parse(options.body || '{}'); } catch {}
      const action = payload.action;
      const u = String(url);
      if (u.includes('/factura-api')) {
        if (action === 'login') {
          loginCalls++;
          await new Promise(r => setTimeout(r, 80));
          return response({
            token: 'test-session-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            user: { id: 'u1', name: 'Admin Prueba', role: 'admin' },
            business: { id: 'b1', name: 'Negocio Prueba', code: 'AZTLAN' }
          });
        }
        if (action === 'loadData') return response({
          clients: [], products: [], drafts: [], invoices: [], users: [],
          stats: { products_sat_ready: 0, products_total: 0, clients_fiscal_ready: 0, clients_total: 0, emitter_ready: true },
          business: { id: 'b1', name: 'Negocio Prueba', code: 'AZTLAN' }
        });
        if (action === 'me') return response({
          user: { id: 'u1', name: 'Admin Prueba', role: 'admin' },
          business: { id: 'b1', name: 'Negocio Prueba', code: 'AZTLAN' }
        });
        return response({ ok: true });
      }
      if (u.includes('/cfdi-api')) return response({ pacConnected: true, csdConfigured: true, provider: 'finkok', environment: 'production' });
      if (u.includes('/cfdi-config-api')) return response({});
      return response({ ready: false, invoices: [], autoSend: true, business: { id: 'b1', name: 'Negocio Prueba' }, user: { role: 'admin' } });
    };
  }
});

const { window } = dom;
const doc = window.document;
await new Promise(r => setTimeout(r, 120));

const fatalAtBoot = jsErrors.filter(e => !String(e?.message || e).includes('Not implemented'));
assert.equal(fatalAtBoot.length, 0, `La app lanzó errores al iniciar: ${fatalAtBoot.map(e => e?.message || String(e)).join(' | ')}`);

const auth = doc.getElementById('authLayer');
const shell = doc.querySelector('main.shell');
assert.ok(auth && !auth.classList.contains('hidden'), 'El login debe iniciar visible');

// Reproduce el fallo histórico: body marcado loading antes de escribir.
doc.body.classList.add('loading');
shell?.classList.add('frWorking');
window.dispatchEvent(new window.Event('focus'));
await new Promise(r => setTimeout(r, 20));
assert.ok(!doc.body.classList.contains('loading'), 'El login no debe conservar body.loading');
assert.ok(!shell?.classList.contains('frWorking'), 'El shell no debe bloquear el login visible');
assert.equal(auth.style.pointerEvents, 'auto', 'La capa de login debe forzar interacción');

const business = doc.getElementById('businessCode');
const user = doc.getElementById('loginUser');
const pin = doc.getElementById('loginPin');
assert.ok(business && user && pin, 'Faltan campos de login');
business.value = 'AZTLAN';
user.value = 'admin';
pin.value = '1234';
assert.equal(business.value, 'AZTLAN');
assert.equal(user.value, 'admin');
assert.equal(pin.value, '1234');

const form = doc.getElementById('loginForm');
assert.equal(typeof form.onsubmit, 'function', 'El formulario debe tener controlador de login activo');
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 500));

assert.equal(loginCalls, 1, 'Doble submit debe producir una sola solicitud de login');
assert.ok(auth.classList.contains('hidden'), 'Después de login exitoso la capa debe ocultarse');
assert.ok(!shell?.classList.contains('frWorking'), 'La interfaz debe quedar desbloqueada después de login');
assert.ok(!doc.body.classList.contains('loading'), 'body no debe quedar en loading después de login');
assert.match(doc.getElementById('currentUser')?.textContent || '', /Admin Prueba/, 'La sesión debe renderizar usuario');

const clientesBtn = doc.querySelector('button[data-tab="clientes"]');
clientesBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 20));
assert.ok(!doc.getElementById('tab-clientes')?.classList.contains('hidden'), 'La navegación debe seguir funcionando después del login');

const fatal = jsErrors.filter(e => !String(e?.message || e).includes('Not implemented'));
assert.equal(fatal.length, 0, `Errores JS inesperados: ${fatal.map(e => e?.message || String(e)).join(' | ')}`);

console.log('SMOKE OK: login interactivo bajo loading, doble-submit protegido, sesión carga y navegación responde.');
dom.window.close();
