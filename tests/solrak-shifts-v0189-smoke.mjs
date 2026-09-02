import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync('solrak-shifts-v0189.js','utf8');
const api=fs.readFileSync('supabase/functions/shift-api/index.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/202609020009_automatic_shift_windows.sql','utf8');

assert.match(ui,/const VERSION="0\.1\.89"/);
assert.match(ui,/Turnos automáticos/);
assert.match(ui,/00:00–24:00/);
assert.match(ui,/Corte automático por turno/);
assert.match(ui,/legacyOpen=byId\("posOpenCash"\),legacyClose=byId\("posCloseCash"\)/);
assert.match(ui,/closeBtn\.style\.display="none"/);
assert.doesNotMatch(ui,/cfdi-api|finkok/i);

assert.match(api,/manualCloseRequired:false/);
assert.match(api,/immutableHistory:true/);
assert.match(api,/strictCashOutflow:true/);
assert.match(api,/solrak_shift_window/);
assert.match(api,/saveConfig/);
assert.doesNotMatch(api,/cfdi-api|finkok/i);

assert.match(sql,/create table if not exists public\.shift_schedule_versions/);
assert.match(sql,/create table if not exists public\.shift_schedules/);
assert.match(sql,/business_timezone text not null default 'America\/Mazatlan'/);
assert.match(sql,/Los IDs de turnos deben ser consecutivos desde 1/);
assert.match(sql,/00:00 a 24:00/);
assert.match(sql,/sin huecos ni traslapes/);
assert.match(sql,/Una configuración de turnos ya vigente es histórica e inmutable/);
assert.match(sql,/v_effective_local := \(\(now\(\) at time zone v_timezone\)::date \+ 1\)/);
assert.match(sql,/movement_type not in \('withdrawal','expense'\)/);
assert.match(sql,/Saldo insuficiente en caja/);
assert.doesNotMatch(sql,/cfdi|finkok/i);

console.log('SOLRAK v0.1.89 smoke OK');
