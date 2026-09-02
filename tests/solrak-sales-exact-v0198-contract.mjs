import fs from 'node:fs';

const source = fs.readFileSync('solrak-sales-exact-v0198.js', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const marker of [
  'const VERSION = "0.1.98"',
  '--s98-side:184px', '--s98-top:48px', '--s98-right:190px',
  'Verificador Precios', 'Nuevo Ticket', 'Producto Común', 'Consultar Ticket', 'Devolución',
  'Clientes', 'Productos', 'Usuarios', 'Turnos', 'Caja', 'Configuración', 'Reportes',
  'Facturación', 'Cotizaciones', 'Proveedores',
  'Resumen de Ventas', 'Detalle de Ventas', 'F.P. en Ventas', 'Historial Movimientos', 'Más Vendidos',
  'FINALIZAR VENTA', 's98TicketNumber', 'solrakSalesV0198StatusGlyph',
  'grid-template-rows:38px minmax(0,1fr)', 'grid-template-rows:62px minmax(0,1fr)',
  'grid-template-columns:minmax(0,1fr) var(--s98-right)',
  'grid-template-columns:minmax(250px,365px) 78px',
  'height:26px', 'height:116px', 'height:166px', 'height:150px',
  '#solrakV0195Menu', 'frTicketNew{display:none',
]) assert(source.includes(marker), `Falta contrato visual: ${marker}`);

assert(!/Recargas/i.test(source), 'No deben aparecer Recargas');
assert(!/(?:cfdi|finkok)/i.test(source), 'Ventas v0.1.98 no debe tocar facturación fiscal');
assert(!/(?:saveProduct|saveInventory|updateProduct|adjustStock)/i.test(source), 'Ventas v0.1.98 no debe escribir inventario');
assert(!/FERRETERIA\s+AZTLAN/i.test(source), 'El negocio no debe quedar hardcodeado');
assert(source.includes('h1.textContent = h1.textContent.trim().toUpperCase()'), 'El negocio debe seguir siendo dinámico');

console.log('SOLRAK_SALES_EXACT_V0198_CONTRACT_OK');
