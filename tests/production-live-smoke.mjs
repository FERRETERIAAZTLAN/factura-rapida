import assert from 'node:assert/strict';
import vm from 'node:vm';

const uiUrl = process.env.FR_PRODUCTION_UI_URL || 'https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/factura-desktop-production-ui-v15';
const healthUrl = process.env.FR_PRODUCTION_HEALTH_URL || 'https://jojzhohqrshsjmlirkqz.supabase.co/functions/v1/factura-production-health?business=AZTLAN';

const forbidden = [
  /demo-facturacion/i,
  /finkok\s*demo/i,
  /\bsandbox\b/i,
  /stampSmokeTest/i,
  /cancelSmokeTest/i,
  /checkCancelSmokeTest/i,
  /uploadSandbox/i,
  /EKU9003173C9/i,
  /ESCUELA KEMPER URGATE/i,
  /mock/i,
  /simulad[oa]/i,
];

const required = [
  'data-fr-production-clean="1"',
  'data-fr-facturar-real="8"',
  'data-fr-usage-ui="1"',
  'data-fr-business-mail-ui="1"',
  'data-fr-issue-delivery="2"',
  'data-fr-login-clean="1"',
  "window.__frLoginUiVersion='15-clean2'",
  'finkok-production-readiness-api',
  'cfdi-issue-api',
  'cfdi-usage-api',
  'business-email-settings-api',
  'gmail-mail-api',
  "issueApi('timber',{draftId:d.id})",
];

async function fetchText(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
  const text = await r.text();
  return { r, text };
}

const ui = await fetchText(uiUrl);
assert.equal(ui.r.status, 200, `UI productiva respondió HTTP ${ui.r.status}: ${ui.text.slice(0,300)}`);
const html = ui.text;

for (const x of required) assert.ok(html.includes(x), `Falta contrato productivo: ${x}`);
for (const re of forbidden) assert.ok(!re.test(html), `Contenido no productivo detectado: ${re}`);
assert.ok(!html.includes("document.body.classList.toggle('loading',v)"), 'Persistió loading global antiguo');
assert.ok(!html.includes('if(loading)return;busy(true)'), 'Login aún depende de loading global');
assert.ok(!html.includes('window.frStampDraftDirect=frStampDraftDirect'), 'Persistió ruta fiscal antigua');
assert.ok(!html.includes('function addRealStampButtons()'), 'Persistió controlador fiscal alterno');
assert.ok(!html.includes("cfdiApi('timber',{draftId:d.id})"), 'Persistió timbrado directo fuera de cfdi-issue-api');

const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
assert.ok(scripts.length > 0, 'No se encontraron scripts inline en la UI productiva');
for (let i = 0; i < scripts.length; i++) {
  try { new vm.Script(scripts[i], { filename: `live-inline-${i+1}.js` }); }
  catch (e) {
    console.error(`SCRIPT INVÁLIDO live-inline-${i+1}.js`);
    console.error(e?.stack || e);
    const line = Number(String(e?.stack||'').match(/live-inline-\d+\.js:(\d+)/)?.[1] || 0);
    const lines = scripts[i].split(/\r?\n/);
    if (line) for (let n=Math.max(1,line-4); n<=Math.min(lines.length,line+4); n++) console.error(`${n===line?'>>>':'   '} ${n}: ${lines[n-1]}`);
    throw e;
  }
}

const active = html.match(/<script data-fr-facturar-real="8">([\s\S]*?)<\/script>/i);
assert.ok(active, 'No se encontró el controlador fiscal activo');
const flow = active[1];
const tokens = [
  "api('saveDraft',{draft:payload})",
  "cfdiApi('preflight',{draftId:d.id})",
  "readiness('ensure')",
  "const ok=confirm('Vas a emitir un CFDI REAL",
  "issueApi('timber',{draftId:d.id})",
  'cart=[]'
];
const pos = tokens.map(t => flow.indexOf(t));
assert.ok(pos.every(n => n >= 0), `Flujo fiscal incompleto: ${JSON.stringify(pos)}`);
for (let i=1;i<pos.length;i++) assert.ok(pos[i] > pos[i-1], `Orden fiscal inseguro: ${JSON.stringify(pos)}`);

const health = await fetch(healthUrl, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
const healthText = await health.text();
let data;
try { data = JSON.parse(healthText); } catch { throw new Error(`Health no devolvió JSON: ${healthText.slice(0,300)}`); }
assert.equal(health.status, 200, `Health producción respondió HTTP ${health.status}: ${healthText}`);
assert.equal(data?.environment, 'production', 'Health no está en producción');
assert.equal(data?.provider, 'finkok', 'Health no usa Finkok');
assert.equal(data?.productionOnly, true, 'Health no está marcado productionOnly');
assert.equal(data?.providerReady, true, 'PAC producción no está listo');
assert.equal(data?.csdReady, true, 'CSD real no está listo');
assert.equal(data?.emitterReady, true, 'Emisor real no está listo');
assert.equal(data?.productionAuthorized, true, 'Producción no está autorizada');
assert.equal(data?.finkokReachable, true, 'Finkok PRODUCCIÓN no respondió al probe real');
assert.equal(data?.ready, true, 'Health integral de producción no está listo');

console.log(`PRODUCTION LIVE OK: UI HTTP 200, ${scripts.length} scripts válidos, flujo fiscal único, Finkok PRODUCCIÓN reachable (${data.finkokServerDatetime || 'hora no reportada'}), CSD/emisor/autorización OK.`);
