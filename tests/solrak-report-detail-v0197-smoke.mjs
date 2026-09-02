import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('solrak-report-detail-v0197.js', 'utf8');
new vm.Script(source, { filename: 'solrak-report-detail-v0197.js' });

const html = `<!doctype html><html><head></head><body>
<aside id="solrakFielSidebar"><button id="detailButton">Detalle de Ventas</button></aside>
<main class="shell"><header class="top">SOLRAK</header><section id="tab-pos" class="tab-panel"></section><section id="tab-solrak-reports" class="tab-panel hidden"></section></main>
</body></html>`;
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.print = () => {};
window.switchTab = () => {};
window.SOLRAKReportsV0172 = { open() {}, openSale() {} };
const calls = [];
window.FacturaRapidaPOS = {
  api: async (action, payload) => {
    calls.push({ action, payload });
    if (payload.kind === 'summary') return {
      totals: { sales: 1948.50, returns: 56, cancellations: 0, net: 1892.50, profit: 768.93 },
      periods: [{ period: '2026-09-01', sales: 1948.50, returns: 56, cancellations: 0, net: 1892.50, profit: 768.93 }],
      catalogs: { users: [{ id: 'u1', name: 'Administrador' }], categories: ['Producto en General'] },
    };
    return {
      totals: { net: 1892.50, profit: 768.93, tickets: 1, returns: 56, cancellations: 0 },
      catalogs: { users: [{ id: 'u1', name: 'Administrador' }], categories: ['Producto en General'] },
      rows: [{ ticket: 756, date: '2026-09-01T18:00:00Z', product: 'SELLADOR DEL TORO X LITRO', category: 'Producto en General', returned_quantity: 0, wholesale: 78, cost: 47.27, list_price: 78, unit_price: 78, discount_percent: 0, quantity: 2, unit: 'L', total: 156 }],
    };
  },
};
window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 20));
window.SOLRAKReportDetailV0197.open();
await new Promise((resolve) => setTimeout(resolve, 30));

const document = window.document;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(document.documentElement.dataset.solrakSumaReport97 === '1', 'No activó modo reporte v0.1.97');
assert(document.querySelector('#solrakSumaDetailReportV0197:not(.hidden)'), 'No abrió reporte a pantalla completa');
assert(document.querySelector('.s97TitleBar')?.textContent.includes('Detalle de Ventas'), 'Falta barra superior Detalle de Ventas');
for (const label of ['HOY', 'ESTE MES', 'ESTE AÑO', 'Fecha', 'Turnos', 'Un Turno', 'Categoría', 'Usuario', 'BUSCAR', 'CERRAR']) {
  assert(document.querySelector('#solrakSumaDetailReportV0197').textContent.includes(label), `Falta filtro ${label}`);
}
for (const label of ['Reporte de Ventas', 'Resumen', 'Totales', 'Periodo', 'Detalle de Ventas']) {
  assert(document.querySelector('#s97Paper').textContent.includes(label), `Falta sección ${label}`);
}
assert(document.querySelector('.s97Chart svg'), 'Falta gráfica de ventas');
assert(document.querySelector('#s97Paper').textContent.includes('$1,948.50'), 'No mostró total de ventas');
assert(document.querySelector('#s97Paper').textContent.includes('-$56.00'), 'No mostró devoluciones negativas');
assert(document.querySelector('#s97Paper').textContent.includes('$1,892.50'), 'No mostró ventas netas');
assert(document.querySelector('#s97Paper').textContent.includes('$768.93'), 'No mostró ganancias');
const headers = [...document.querySelectorAll('.s97DetailTable th')].map((node) => node.textContent.trim());
assert(headers.join('|') === 'Ticket|Fecha|Nombre del Producto|Categoría|Dev.|Canc.|Mayr.|Pr. Costo|Pr. Mayr.|Pr. Pub.|% Desc.|Cant.|UM|Total', `Columnas incorrectas: ${headers.join('|')}`);
assert(document.querySelector('.s97DetailTable')?.textContent.includes('SELLADOR DEL TORO X LITRO'), 'No mostró detalle real');
assert(document.querySelector('#s97User option[value="u1"]')?.textContent === 'Administrador', 'No hidrató usuarios');
assert(document.querySelector('#s97Category option[value="Producto en General"]'), 'No hidrató categorías');
assert(calls.filter((call) => call.action === 'reports').length === 2, 'Debe consultar detail y summary');
assert(calls.some((call) => call.payload.kind === 'detail'), 'Falta consulta detail');
assert(calls.some((call) => call.payload.kind === 'summary'), 'Falta consulta summary');
assert(!/\bdemo\b|\bmock\b|simulad[oa]|finkok|cfdi/i.test(source), 'El módulo salió del alcance seguro');

window.SOLRAKReportDetailV0197.close();
assert(!document.documentElement.dataset.solrakSumaReport97, 'No restauró la interfaz al cerrar');
window.close();
console.log('SOLRAK_REPORT_DETAIL_V0197_SMOKE_OK');
