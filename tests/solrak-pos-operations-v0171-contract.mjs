import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/202609020001_sumapro_pos_operations.sql",
  "utf8",
);
const edge = fs.readFileSync("supabase/functions/pos-api/index.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const table of [
  "product_promotions",
  "sale_returns",
  "sale_return_items",
  "customer_credit_movements",
]) {
  assert(
    migration.includes(`create table if not exists public.${table}`),
    `Falta tabla ${table}`,
  );
  assert(
    migration.includes(`alter table public.${table} enable row level security`),
    `Falta RLS en ${table}`,
  );
  assert(
    migration.includes(`revoke all on table public.${table} from anon, authenticated`),
    `Falta revocar acceso directo a ${table}`,
  );
}

for (const fn of [
  "pos_complete_sale",
  "pos_update_sale_payments",
  "pos_void_sale",
  "pos_return_sale",
  "pos_record_credit_payment",
  "pos_save_promotion",
]) {
  assert(
    migration.includes(`create or replace function public.${fn}`),
    `Falta función ${fn}`,
  );
  assert(
    new RegExp(
      `create or replace function public\\.${fn}\\([\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      "i",
    ).test(migration),
    `${fn} no fija seguridad y search_path`,
  );
  assert(
    new RegExp(`revoke execute on function public\\.${fn}\\(`).test(migration),
    `${fn} conserva ejecución pública`,
  );
}

const ddlOnly = migration.split("create or replace function public.pos_complete_sale")[0];
assert(
  !/\b(update|delete from)\s+public\.products\b/i.test(ddlOnly),
  "La migración altera datos comerciales durante el despliegue",
);
assert(
  /product_id uuid references public\.products/.test(migration),
  "Producto común no permite líneas sin inventario",
);
assert(
  /method in \('cash','card','transfer','credit','other'\)/.test(migration),
  "Crédito no está validado como forma de pago",
);
assert(
  /movement_type in \('sale','sale_void','sale_return'/.test(migration),
  "Devolución no tiene movimiento de inventario propio",
);

for (const action of [
  "health",
  "bootstrap",
  "openCash",
  "addCashMovement",
  "closeCash",
  "completeSale",
  "recentSales",
  "findSale",
  "saleDetail",
  "voidSale",
  "updateSalePayments",
  "returnSale",
  "listPromotions",
  "savePromotion",
  "creditSummary",
  "recordCreditPayment",
]) {
  assert(edge.includes(`action === "${action}"`), `Falta acción ${action}`);
}

for (const rpc of [
  "pos_complete_sale",
  "pos_update_sale_payments",
  "pos_void_sale",
  "pos_return_sale",
  "pos_record_credit_payment",
  "pos_save_promotion",
]) {
  assert(edge.includes(`db.rpc("${rpc}"`), `El servicio no usa ${rpc}`);
}

assert(/version:\s*1/.test(edge), "pos-api rompió el contrato de salud v1");
assert(
  /capabilitiesVersion:\s*2/.test(edge),
  "pos-api no declara las capacidades operativas v2",
);
assert(
  edge.includes("Escribe el nombre de cada producto común"),
  "pos-api no exige nombre para productos comunes",
);
assert(
  /const ctx = await context\(req\)/.test(edge) &&
    /Sesión inválida o vencida/.test(edge),
  "El servicio no exige la sesión propia de SOLRAK",
);
assert(
  !/\.from\("products"\)\s*\.update\(/s.test(edge),
  "El servicio evita la transacción atómica para modificar inventario",
);

console.log(
  "SOLRAK_POS_OPERATIONS_V0171_OK atomic=sale,void,return,payments credit=ledger promotions=server rls=enabled directAccess=revoked",
);
