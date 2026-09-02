import fs from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1448, height: 1086 }, deviceScaleFactor: 1 });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto('http://127.0.0.1:4173/tests/fixtures/solrak-sales-suma-v0201.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.SOLRAKSalesSumaV0201), null, { timeout: 5000 });
  await page.evaluate(() => {
    window.SOLRAKSalesExactV0198?.mount?.();
    window.SOLRAKSalesPhotoV0199?.mount?.();
    window.SOLRAKSalesReferenceV0200?.mount?.();
    window.SOLRAKSalesSumaV0201?.mount?.();
    window.SOLRAKSalesSumaV0201Tune?.mount?.();
  });
  await page.waitForSelector('#solrakSalesSumaV0201Workspace', { state: 'visible', timeout: 5000 });
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
      actions: rect('.s201CartCard .fielPosActions'),
      preview: rect('.s201Right .frPreview'),
      total: rect('.s201Right .frPosTotals'),
      footer: rect('#solrakV0195Footer'),
      menuLabels: [...document.querySelectorAll('#solrakSalesV0198Menu .s98MenuItem')].map((x) => x.dataset.s98Label),
      legacyVisible: [...document.querySelectorAll('#solrakFielSidebar>.fielMenu,#solrakV0195LegacyMenu,#solrakSalesV0195LegacyMenu,#solrakV0195Menu')].some((x) => getComputedStyle(x).display !== 'none'),
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
  near(geometry.right.width, 265, 3, 'right.width');
  near(geometry.preview.width, 199, 3, 'preview.width');
  near(geometry.preview.height, 256, 3, 'preview.height');
  near(geometry.finish.height, 66, 2, 'finish.height');
  near(geometry.total.height, 156, 3, 'total.height');
  near(geometry.total.y, 760, 8, 'total.y');
  if (!geometry.search || geometry.search.width < 330 || geometry.search.height < 40) throw new Error('Buscador no tiene geometría Suma');
  if (!geometry.actions || geometry.actions.y > 805) throw new Error(`Acciones inferiores siguen demasiado abajo: ${geometry.actions?.y}`);
  if (!geometry.footer || geometry.footer.y > 1020) throw new Error(`Footer sigue demasiado abajo: ${geometry.footer?.y}`);
  if (geometry.legacyVisible) throw new Error('Menú heredado sigue visible debajo del menú Suma');
  if (geometry.bodyText.includes('Recargas')) throw new Error('Apareció Recargas');
  for (const label of ['Verificador Precios','Nuevo Ticket','Producto Común','Consultar Ticket','Devolución','Clientes','Productos','Usuarios','Turnos','Caja','Configuración','Reportes']) {
    if (!geometry.menuLabels.includes(label)) throw new Error(`Falta menú ${label}`);
  }
  for (const label of ['Código','Producto','Cantidad','Precio','Importe','Mayoreo','Descuento','FINALIZAR VENTA','BUSCAR','Total:']) {
    if (!geometry.bodyText.includes(label)) throw new Error(`Falta texto visual ${label}`);
  }

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/solrak-v0201-geometry.json', JSON.stringify({ ...geometry, pageErrors, consoleErrors }, null, 2));
  await page.screenshot({ path: 'artifacts/solrak-v0201-suma-render.png', fullPage: false });
  if (pageErrors.length) {
    console.error('PAGE_ERRORS', JSON.stringify(pageErrors));
    throw new Error(`El render produjo ${pageErrors.length} error(es) de página`);
  }
  console.log('SOLRAK_SALES_SUMA_V0201_VISUAL_OK');
} finally {
  await browser.close();
}
