import fs from "node:fs";

const code = fs.readFileSync("solrak-reports-v0172.js", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(code.includes('const VERSION = "0.1.72"'), "Versión v0.1.72 ausente");
assert(code.includes('<span>Venta</span>'), "Falta el acceso Venta");
assert(code.includes('window.FacturaRapidaPOS?.api'), "La UI no usa el POS API productivo");
assert(code.includes('api("reports", payloadFor(activeKind))'), "Los reportes no invocan action=reports");
assert(!/Recargas\s+y\s+Servicios/i.test(code), "Se reintrodujo la opción excluida Recargas y Servicios");

const required = new Map([
  ["Resumen de Ventas", "summary"],
  ["Detalle de Ventas", "detail"],
  ["F.P. en Ventas", "payments"],
  ["Inventario", "inventory"],
  ["Historial Movimientos", "movements"],
  ["Más Vendidos", "best-sellers"],
]);
for (const [label, kind] of required) {
  assert(code.includes(`"${label}"`), `Falta reporte ${label}`);
  assert(code.includes(`kind: "${kind}"`), `Falta conexión ${label} -> ${kind}`);
}

for (const text of ["Exportar CSV", "Imprimir", "Desde", "Hasta", "Categoría", "Usuario"]) {
  assert(code.includes(text), `Falta control de reporte: ${text}`);
}

assert(code.includes('data-filter="payment"'), "Falta filtro de forma de pago");
assert(code.includes('data-filter="movement"'), "Falta filtro de movimientos");
assert(code.includes('data-filter="existence"'), "Falta filtro de existencias");
assert(code.includes('data-filter="order"'), "Falta orden Más/Menos vendidos");
assert(code.includes('data-filter="limit"'), "Falta límite de ranking");
assert(code.includes('a.download = `SOLRAK-${activeKind}-'), "Falta descarga CSV identificable");
assert(code.includes('window.print()'), "Falta impresión");

console.log("SOLRAK_V0172_REPORTS_SMOKE_OK");
