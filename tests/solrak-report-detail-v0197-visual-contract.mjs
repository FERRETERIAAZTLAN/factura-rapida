import fs from 'node:fs';

const source = fs.readFileSync('solrak-report-detail-v0197.js', 'utf8');
const must = [
  'grid-template-rows:32px minmax(0,1fr)',
  'grid-template-columns:180px minmax(0,1fr)',
  '.s97Preset{width:100%;height:34px',
  '.s97Toolbar{height:30px',
  '.s97Paper{--s97-zoom:1;width:min(950px',
  'background:linear-gradient(90deg,#ef4b2a 0%,#f2691e 55%,#ee4a28 100%)',
  '>HOY</button>',
  '>ESTE MES</button>',
  '>ESTE AÑO</button>',
  '>BUSCAR</button>',
  '>CERRAR</button>',
  'Reporte de Ventas',
  '>Resumen</h2>',
  '>Totales</div>',
  'Total Ventas Netas',
  'Total Ganancias',
  'Detalle de Ventas',
  'Ticket</th><th>Fecha</th><th>Nombre del Producto</th><th>Categoría</th><th>Dev.</th><th>Canc.</th><th>Mayr.</th><th>Pr. Costo</th><th>Pr. Mayr.</th><th>Pr. Pub.</th><th>% Desc.</th><th>Cant.</th><th>UM</th><th>Total',
  'class="s97Chart"',
  'class="bar"',
  '100%</option>',
  'placeholder="Buscar"',
  '>Siguiente</button>',
];
for (const marker of must) {
  if (!source.includes(marker)) throw new Error(`Contrato visual v0.1.97: falta ${marker}`);
}
if (!/position:fixed;z-index:9950;inset:0/.test(source)) throw new Error('El reporte debe ocupar la ventana de SOLRAK como en la referencia.');
if (!/background:#f7f7f5/.test(source)) throw new Error('Falta panel lateral gris claro.');
if (!/background:#46515a;color:#fff/.test(source)) throw new Error('Faltan encabezados oscuros de las tablas.');
console.log('SOLRAK_REPORT_DETAIL_V0197_VISUAL_CONTRACT_OK');
