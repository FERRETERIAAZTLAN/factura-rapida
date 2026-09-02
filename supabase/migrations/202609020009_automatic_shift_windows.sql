alter table public.pos_settings
  add column if not exists business_timezone text not null default 'America/Mazatlan';

create table if not exists public.shift_schedule_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  timezone text not null,
  effective_from timestamptz not null,
  created_by uuid null references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shift_schedule_timezone_required check (btrim(timezone) <> '')
);

create unique index if not exists shift_schedule_versions_effective_uidx
  on public.shift_schedule_versions(business_id,effective_from);
create index if not exists shift_schedule_versions_lookup_idx
  on public.shift_schedule_versions(business_id,effective_from desc);

create table if not exists public.shift_schedules (
  version_id uuid not null references public.shift_schedule_versions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  id integer not null,
  name text not null,
  start_minute integer not null,
  end_minute integer not null,
  created_at timestamptz not null default now(),
  primary key(version_id,id),
  constraint shift_schedule_id_positive check(id >= 1),
  constraint shift_schedule_name_required check(btrim(name) <> ''),
  constraint shift_schedule_start_range check(start_minute >= 0 and start_minute < 1440),
  constraint shift_schedule_end_range check(end_minute > 0 and end_minute <= 1440),
  constraint shift_schedule_positive_window check(end_minute > start_minute)
);

create index if not exists shift_schedules_business_version_idx
  on public.shift_schedules(business_id,version_id,id);

alter table public.shift_schedule_versions enable row level security;
alter table public.shift_schedules enable row level security;
revoke all on table public.shift_schedule_versions from public,anon,authenticated;
revoke all on table public.shift_schedules from public,anon,authenticated;
grant select,insert,update,delete on table public.shift_schedule_versions to service_role;
grant select,insert,update,delete on table public.shift_schedules to service_role;

insert into public.pos_settings(business_id)
select id from public.businesses
on conflict(business_id) do nothing;

with missing as (
  select b.id as business_id,ps.business_timezone
  from public.businesses b
  join public.pos_settings ps on ps.business_id=b.id
  where not exists(
    select 1 from public.shift_schedule_versions v where v.business_id=b.id
  )
), versions as (
  insert into public.shift_schedule_versions(id,business_id,timezone,effective_from)
  select gen_random_uuid(),business_id,business_timezone,'2000-01-01 00:00:00+00'::timestamptz
  from missing
  returning id,business_id
)
insert into public.shift_schedules(version_id,business_id,id,name,start_minute,end_minute)
select id,business_id,1,'Turno general',0,1440 from versions;

create or replace function public.solrak_validate_shift_schedule_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_count integer;
  v_min_id integer;
  v_max_id integer;
  v_min_start integer;
  v_max_end integer;
  v_bad integer;
begin
  if not exists(select 1 from public.shift_schedule_versions where id=p_version_id) then
    return;
  end if;

  select count(*),min(id),max(id),min(start_minute),max(end_minute)
  into v_count,v_min_id,v_max_id,v_min_start,v_max_end
  from public.shift_schedules
  where version_id=p_version_id;

  if v_count < 1 then
    raise exception 'Debe existir al menos un turno';
  end if;
  if v_min_id <> 1 or v_max_id <> v_count then
    raise exception 'Los IDs de turnos deben ser consecutivos desde 1';
  end if;
  if v_min_start <> 0 or v_max_end <> 1440 then
    raise exception 'Los turnos deben cubrir el día completo de 00:00 a 24:00';
  end if;

  select count(*) into v_bad
  from (
    select id,start_minute,end_minute,
      lag(end_minute) over(order by id) as previous_end
    from public.shift_schedules
    where version_id=p_version_id
  ) x
  where (id=1 and start_minute<>0)
     or (id>1 and start_minute<>previous_end)
     or end_minute<=start_minute;

  if v_bad > 0 then
    raise exception 'Las franjas de turno deben ser consecutivas, sin huecos ni traslapes';
  end if;
end;
$function$;

revoke all on function public.solrak_validate_shift_schedule_version(uuid) from public,anon,authenticated;
grant execute on function public.solrak_validate_shift_schedule_version(uuid) to service_role;

create or replace function public.solrak_shift_schedule_constraint()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  perform public.solrak_validate_shift_schedule_version(coalesce(new.version_id,old.version_id));
  return null;
end;
$function$;

revoke all on function public.solrak_shift_schedule_constraint() from public,anon,authenticated;
drop trigger if exists trg_solrak_shift_schedule_constraint on public.shift_schedules;
create constraint trigger trg_solrak_shift_schedule_constraint
after insert or update or delete on public.shift_schedules
deferrable initially deferred
for each row execute function public.solrak_shift_schedule_constraint();

create or replace function public.solrak_guard_shift_history()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_effective timestamptz;
begin
  if tg_table_name='shift_schedule_versions' then
    if tg_op='UPDATE' then
      raise exception 'Una configuración de turnos no se edita; crea una nueva versión';
    end if;
    if old.effective_from <= now() then
      raise exception 'Una configuración de turnos ya vigente es histórica e inmutable';
    end if;
    return old;
  end if;

  select effective_from into v_effective
  from public.shift_schedule_versions
  where id=coalesce(new.version_id,old.version_id);
  if v_effective is null then return coalesce(new,old); end if;
  if v_effective <= now() then
    raise exception 'Los turnos de una configuración ya vigente son históricos e inmutables';
  end if;
  return coalesce(new,old);
end;
$function$;

revoke all on function public.solrak_guard_shift_history() from public,anon,authenticated;
drop trigger if exists trg_solrak_guard_shift_versions on public.shift_schedule_versions;
create trigger trg_solrak_guard_shift_versions
before update or delete on public.shift_schedule_versions
for each row execute function public.solrak_guard_shift_history();
drop trigger if exists trg_solrak_guard_shift_rows on public.shift_schedules;
create trigger trg_solrak_guard_shift_rows
before insert or update or delete on public.shift_schedules
for each row execute function public.solrak_guard_shift_history();

create or replace function public.solrak_save_shift_schedule(
  p_business_id uuid,
  p_user_id uuid,
  p_timezone text,
  p_shifts jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user public.app_users%rowtype;
  v_timezone text := btrim(coalesce(p_timezone,''));
  v_version_id uuid := gen_random_uuid();
  v_effective timestamptz;
  v_effective_local date;
  v_expected_start integer := 0;
  v_idx integer := 0;
  v_name text;
  v_start integer;
  v_end integer;
  row jsonb;
begin
  select * into v_user
  from public.app_users
  where id=p_user_id and business_id=p_business_id and active=true;
  if not found or v_user.role<>'admin' then
    raise exception 'Solo el administrador puede configurar turnos';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=v_timezone) then
    raise exception 'Zona horaria inválida';
  end if;
  if jsonb_typeof(p_shifts)<>'array' or jsonb_array_length(p_shifts)<1 or jsonb_array_length(p_shifts)>12 then
    raise exception 'Configura de 1 a 12 turnos';
  end if;

  v_effective_local := ((now() at time zone v_timezone)::date + 1);
  v_effective := (v_effective_local::timestamp at time zone v_timezone);

  delete from public.shift_schedule_versions
  where business_id=p_business_id and effective_from>now();

  insert into public.shift_schedule_versions(id,business_id,timezone,effective_from,created_by)
  values(v_version_id,p_business_id,v_timezone,v_effective,p_user_id);

  for row in select value from jsonb_array_elements(p_shifts)
  loop
    v_idx := v_idx + 1;
    v_name := btrim(coalesce(row->>'name',''));
    v_start := coalesce((row->>'start_minute')::integer,-1);
    v_end := coalesce((row->>'end_minute')::integer,-1);
    if v_name='' then raise exception 'El turno % necesita nombre',v_idx; end if;
    if v_start<>v_expected_start then
      raise exception 'El turno % debe iniciar en el minuto % para mantener franjas consecutivas',v_idx,v_expected_start;
    end if;
    if v_end<=v_start or v_end>1440 then
      raise exception 'Horario inválido en turno %',v_idx;
    end if;
    insert into public.shift_schedules(version_id,business_id,id,name,start_minute,end_minute)
    values(v_version_id,p_business_id,v_idx,left(v_name,120),v_start,v_end);
    v_expected_start := v_end;
  end loop;

  if v_expected_start<>1440 then
    raise exception 'El último turno debe terminar a las 24:00';
  end if;
  perform public.solrak_validate_shift_schedule_version(v_version_id);

  update public.pos_settings
  set business_timezone=v_timezone,updated_at=now()
  where business_id=p_business_id;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values(
    p_business_id,p_user_id,'pos.shift_schedule.create','shift_schedule_version',v_version_id::text,
    jsonb_build_object('timezone',v_timezone,'effective_from',v_effective,'shift_count',v_idx)
  );

  return jsonb_build_object('ok',true,'version_id',v_version_id,'timezone',v_timezone,'effective_from',v_effective,'shift_count',v_idx);
end;
$function$;

revoke all on function public.solrak_save_shift_schedule(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.solrak_save_shift_schedule(uuid,uuid,text,jsonb) to service_role;

create or replace function public.solrak_shift_window(
  p_business_id uuid,
  p_at timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_version public.shift_schedule_versions%rowtype;
  v_shift public.shift_schedules%rowtype;
  v_local timestamp;
  v_day date;
  v_minute integer;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_utc timestamptz;
  v_end_utc timestamptz;
begin
  select * into v_version
  from public.shift_schedule_versions
  where business_id=p_business_id and effective_from<=p_at
  order by effective_from desc
  limit 1;
  if not found then raise exception 'No existe configuración de turnos vigente'; end if;

  v_local := p_at at time zone v_version.timezone;
  v_day := v_local::date;
  v_minute := extract(hour from v_local)::integer*60 + extract(minute from v_local)::integer;

  select * into v_shift
  from public.shift_schedules
  where version_id=v_version.id
    and start_minute<=v_minute
    and end_minute>v_minute
  order by id
  limit 1;
  if not found then raise exception 'No existe un turno para la hora solicitada'; end if;

  v_start_local := v_day::timestamp + make_interval(mins=>v_shift.start_minute);
  v_end_local := v_day::timestamp + make_interval(mins=>v_shift.end_minute);
  v_start_utc := v_start_local at time zone v_version.timezone;
  v_end_utc := v_end_local at time zone v_version.timezone;

  return jsonb_build_object(
    'version_id',v_version.id,
    'timezone',v_version.timezone,
    'effective_from',v_version.effective_from,
    'shift_id',v_shift.id,
    'shift_name',v_shift.name,
    'start_minute',v_shift.start_minute,
    'end_minute',v_shift.end_minute,
    'local_date',v_day,
    'window_start',v_start_utc,
    'window_end',v_end_utc
  );
end;
$function$;

revoke all on function public.solrak_shift_window(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.solrak_shift_window(uuid,timestamptz) to service_role;

create or replace function public.pos_validate_cash_withdrawal()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_session public.cash_sessions%rowtype;
  v_cash_sales numeric(14,2) := 0;
  v_cash_movements numeric(14,2) := 0;
  v_available numeric(14,2) := 0;
begin
  if new.movement_type not in ('withdrawal','expense') then
    return new;
  end if;

  select * into v_session
  from public.cash_sessions
  where id=new.cash_session_id
    and business_id=new.business_id
    and status='open'
  for update;
  if not found then raise exception 'La caja no está abierta'; end if;

  select coalesce(sum(sp.amount),0)::numeric(14,2)
  into v_cash_sales
  from public.sale_payments sp
  join public.sales s on s.id=sp.sale_id and s.business_id=new.business_id
  where sp.business_id=new.business_id
    and sp.method='cash'
    and s.cash_session_id=new.cash_session_id
    and s.status='completed';

  select coalesce(sum(case when cm.movement_type in ('income','deposit') then cm.amount else -cm.amount end),0)::numeric(14,2)
  into v_cash_movements
  from public.cash_movements cm
  where cm.business_id=new.business_id and cm.cash_session_id=new.cash_session_id;

  v_available := round(coalesce(v_session.opening_amount,0)+coalesce(v_cash_sales,0)+coalesce(v_cash_movements,0),2);
  if round(coalesce(new.amount,0),2)>v_available then
    raise exception 'Saldo insuficiente en caja. Disponible: $%',to_char(greatest(v_available,0),'FM999999999990.00');
  end if;
  return new;
end;
$function$;

revoke all on function public.pos_validate_cash_withdrawal() from public,anon,authenticated;
drop trigger if exists trg_pos_validate_cash_withdrawal on public.cash_movements;
create trigger trg_pos_validate_cash_withdrawal
before insert on public.cash_movements
for each row
when (new.movement_type in ('withdrawal','expense'))
execute function public.pos_validate_cash_withdrawal();