import fs from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1448, height: 1086 }, deviceScaleFactor: 1 });
try {
  await page.goto('http://127.0.0.1:4173/tests/fixtures/solrak-sales-suma-v0201.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#solrakSalesSumaV0201Workspace', { state: 'visible' });
  await page.waitForTimeout(250);

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      sidebar: rect('#solrakFielSidebar'),
      top: rect('main.shell > .top'),
      workspace: rect('#solrakSalesSumaV0201Workspace'),
      right: rect('.s201Right'),
      search: rect('#posSearch'),
      finish: rect('#fielFinishSale'),
      total: rect('.s201Right .frPosTotals'),
      menuLabels: [...document.querySelectorAll('#solrakSalesV0198Menu .s98MenuItem')].map((x) => x.dataset.s98Label),
      bodyText: document.body.innerText
    };
  });

  const near = (actual, expected, tolerance, label) => {
    if (Math.abs(actual - expected) > tolerance) throw new Error(`${label}: ${actual} fuera de ${expected}±${tolerance}`);
  };
  if (geometry.viewport.width !== 1448 || geometry.viewport.height !== 1086) throw new Error('Viewport visual incorrecto');
  near(geometry.sidebar.x, 0, 1, 'sidebar.x');
  near(geometry.sidebar.width, 260, 2, 'sidebar.width');
  near(geometry.top.x, 260, 2, 'top.x');
  near(geometry.top.height, 74, 2, 'top.height');
  near(geometry.workspace.x, 260, 2, 'workspace.x');
  near(geometry.workspace.y, 74, 2, 'workspace.y');
  near(geometry.right.width, 246, 3, 'right.width');
  if (!geometry.search || geometry.search.width < 330 || geometry.search.height < 38) throw new Error('Buscador no tiene geometría Suma');
  if (!geometry.finish || geometry.finish.width < 250 || geometry.finish.height < 50) throw new Error('FINALIZAR VENTA no ocupa el pie lateral');
  if (!geometry.total || geometry.total.height < 176) throw new Error('Total no ocupa el bloque inferior derecho');
  if (geometry.bodyText.includes('Recargas')) throw new Error('Apareció Recargas');
  for (const label of ['Verificador Precios','Nuevo Ticket','Producto Común','Consultar Ticket','Devolución','Clientes','Productos','Usuarios','Turnos','Caja','Configuración','Reportes']) {
    if (!geometry.menuLabels.includes(label)) throw new Error(`Falta menú ${label}`);
  }
  for (const label of ['Código','Producto','Cantidad','Precio','Importe','Mayoreo','Descuento','FINALIZAR VENTA','BUSCAR','Total:']) {
    if (!geometry.bodyText.includes(label)) throw new Error(`Falta texto visual ${label}`);
  }

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/solrak-v0201-geometry.json', JSON.stringify(geometry, null, 2));
  await page.screenshot({ path: 'artifacts/solrak-v0201-suma-render.png', fullPage: false });
  console.log('SOLRAK_SALES_SUMA_V0201_VISUAL_OK');
} finally {
  await browser.close();
}
