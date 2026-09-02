alter table public.clients
  add column if not exists active boolean not null default true,
  add column if not exists credit_enabled boolean not null default false,
  add column if not exists credit_limit numeric(14,2) not null default 0;

do $block$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_credit_limit_check'
  ) then
    alter table public.clients
      add constraint clients_credit_limit_check check (credit_limit >= 0);
  end if;
end
$block$;

create index if not exists clients_business_active_idx
  on public.clients(business_id, active, name);

create or replace function public.delete_client_safe(
  p_business_id uuid,
  p_user_id uuid,
  p_client_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_client public.clients%rowtype;
begin
  if not exists (
    select 1 from public.app_users u
    where u.id=p_user_id
      and u.business_id=p_business_id
      and u.active=true
      and u.role='admin'
  ) then
    return jsonb_build_object('ok',false,'code','ADMIN_REQUIRED','message','Solo el administrador puede dar de baja clientes.');
  end if;

  select * into v_client
  from public.clients
  where id=p_client_id and business_id=p_business_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'code','CLIENT_NOT_FOUND','message','Cliente no encontrado.');
  end if;

  if v_client.active = false then
    return jsonb_build_object(
      'ok',true,'deactivated',true,'already_inactive',true,
      'recoverable',true,'name',v_client.name
    );
  end if;

  update public.clients
  set active=false,
      credit_enabled=false,
      updated_by=p_user_id,
      updated_at=now()
  where id=p_client_id and business_id=p_business_id;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values(
    p_business_id,p_user_id,'client.deactivate','client',p_client_id::text,
    jsonb_build_object('name',v_client.name,'rfc',v_client.rfc,'recoverable',true)
  );

  return jsonb_build_object(
    'ok',true,'deactivated',true,'recoverable',true,
    'name',v_client.name
  );
end;
$function$;

create or replace function public.solrak_validate_credit_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_client public.clients%rowtype;
  v_balance numeric(14,2) := 0;
  v_projected numeric(14,2) := 0;
begin
  if new.movement_type <> 'charge' then
    return new;
  end if;

  select * into v_client
  from public.clients
  where id=new.client_id
    and business_id=new.business_id
  for update;

  if not found then
    raise exception 'Cliente no encontrado para el crédito';
  end if;
  if v_client.active = false then
    raise exception 'El cliente está inactivo';
  end if;
  if v_client.credit_enabled = false then
    raise exception 'El cliente no tiene crédito autorizado';
  end if;
  if v_client.credit_limit <= 0 then
    raise exception 'El cliente no tiene un límite de crédito disponible';
  end if;

  select coalesce(sum(
    case when movement_type='charge' then amount else -amount end
  ),0)::numeric(14,2)
  into v_balance
  from public.customer_credit_movements
  where business_id=new.business_id
    and client_id=new.client_id
    and id <> new.id;

  v_projected := round(v_balance + new.amount, 2);
  if v_projected > v_client.credit_limit + 0.01 then
    raise exception 'Límite de crédito excedido. Saldo proyectado: %, límite: %',
      v_projected, v_client.credit_limit;
  end if;

  return new;
end;
$function$;

revoke all on function public.solrak_validate_credit_charge() from public, anon, authenticated;

drop trigger if exists trg_solrak_validate_credit_charge on public.customer_credit_movements;
create trigger trg_solrak_validate_credit_charge
before insert or update of business_id,client_id,movement_type,amount
on public.customer_credit_movements
for each row
execute function public.solrak_validate_credit_charge();

create or replace function public.solrak_validate_active_sale_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.client_id is not null and not exists(
    select 1 from public.clients c
    where c.id=new.client_id
      and c.business_id=new.business_id
      and c.active=true
  ) then
    raise exception 'El cliente está inactivo o no pertenece a este negocio';
  end if;
  return new;
end;
$function$;

revoke all on function public.solrak_validate_active_sale_client() from public, anon, authenticated;

drop trigger if exists trg_solrak_validate_active_sale_client on public.sales;
create trigger trg_solrak_validate_active_sale_client
before insert or update of business_id,client_id
on public.sales
for each row
execute function public.solrak_validate_active_sale_client();
