import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync(
  "supabase/migrations/202609020003_cash_withdrawal_balance_guard.sql",
  "utf8",
);

assert.match(sql, /SOLRAK v0\.1\.78/);
assert.match(sql, /create or replace function public\.pos_validate_cash_withdrawal/i);
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path = ''/i);
assert.match(sql, /for update/i, "El bloqueo de sesión debe serializar retiros concurrentes");
assert.match(sql, /sale_payments/i, "Debe considerar ventas cobradas en efectivo");
assert.match(sql, /cash_movements/i, "Debe considerar entradas y salidas previas");
assert.match(sql, /movement_type in \('income', 'deposit'\)/i);
assert.match(sql, /s\.status = 'completed'/i, "Ventas canceladas no deben contar como efectivo");
assert.match(sql, /Saldo insuficiente en caja/i);
assert.match(sql, /when \(new\.movement_type = 'withdrawal'\)/i);
assert.match(sql, /revoke all on function public\.pos_validate_cash_withdrawal\(\) from public/i);
assert.match(sql, /revoke all on function public\.pos_validate_cash_withdrawal\(\) from anon/i);
assert.match(sql, /revoke all on function public\.pos_validate_cash_withdrawal\(\) from authenticated/i);
assert.doesNotMatch(sql, /cfdi|finkok/i);

console.log("SOLRAK v0.1.78 cash withdrawal balance contract OK");