alter table public.customer_credit_movements
  add column if not exists reversed_movement_id uuid null;

do $block$
begin
  if not exists (
    select 1 from pg_constraint where conname='customer_credit_movements_reversed_movement_id_fkey'
  ) then
    alter table public.customer_credit_movements
      add constraint customer_credit_movements_reversed_movement_id_fkey
      foreign key (reversed_movement_id)
      references public.customer_credit_movements(id)
      on delete restrict;
  end if;
end
$block$;

create unique index if not exists customer_credit_one_reversal_idx
  on public.customer_credit_movements(reversed_movement_id)
  where reversed_movement_id is not null;

create index if not exists customer_credit_client_created_idx
  on public.customer_credit_movements(business_id,client_id,created_at desc);

create or replace function public.solrak_validate_credit_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_client public.clients%rowtype;
  v_original public.customer_credit_movements%rowtype;
  v_balance numeric(14,2) := 0;
  v_projected numeric(14,2) := 0;
begin
  if new.movement_type <> 'charge' then
    return new;
  end if;

  if new.reversed_movement_id is not null then
    select * into v_original
    from public.customer_credit_movements
    where id=new.reversed_movement_id
      and business_id=new.business_id
      and client_id=new.client_id
      and movement_type='payment';
    if not found then
      raise exception 'El movimiento a cancelar no es un abono válido';
    end if;
    if round(new.amount,2) <> round(v_original.amount,2) then
      raise exception 'La reversa debe coincidir con el importe del abono original';
    end if;
    return new;
  end if;

  select * into v_client
  from public.clients
  where id=new.client_id
    and business_id=new.business_id
  for update;

  if not found then raise exception 'Cliente no encontrado para el crédito'; end if;
  if v_client.active = false then raise exception 'El cliente está inactivo'; end if;
  if v_client.credit_enabled = false then raise exception 'El cliente no tiene crédito autorizado'; end if;
  if v_client.credit_limit <= 0 then raise exception 'El cliente no tiene un límite de crédito disponible'; end if;

  select coalesce(sum(case when movement_type='charge' then amount else -amount end),0)::numeric(14,2)
  into v_balance
  from public.customer_credit_movements
  where business_id=new.business_id
    and client_id=new.client_id
    and id <> new.id;

  v_projected := round(v_balance + new.amount,2);
  if v_projected > v_client.credit_limit + 0.01 then
    raise exception 'Límite de crédito excedido. Saldo proyectado: %, límite: %',v_projected,v_client.credit_limit;
  end if;
  return new;
end;
$function$;

create or replace function public.solrak_void_credit_payment(
  p_business_id uuid,
  p_user_id uuid,
  p_movement_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user public.app_users%rowtype;
  v_original public.customer_credit_movements%rowtype;
  v_client public.clients%rowtype;
  v_session public.cash_sessions%rowtype;
  v_reversal_id uuid;
begin
  select * into v_user
  from public.app_users
  where id=p_user_id and business_id=p_business_id and active=true;
  if not found or v_user.role <> 'admin' then
    raise exception 'Solo el administrador puede cancelar abonos';
  end if;
  if nullif(trim(p_reason),'') is null then
    raise exception 'Escribe el motivo de la cancelación';
  end if;

  select * into v_original
  from public.customer_credit_movements
  where id=p_movement_id
    and business_id=p_business_id
    and movement_type='payment'
  for update;
  if not found then raise exception 'Abono no encontrado'; end if;

  if exists(
    select 1 from public.customer_credit_movements
    where business_id=p_business_id
      and reversed_movement_id=v_original.id
  ) then
    raise exception 'Este abono ya fue cancelado';
  end if;

  select * into v_client
  from public.clients
  where id=v_original.client_id and business_id=p_business_id;
  if not found then raise exception 'Cliente no encontrado'; end if;

  if v_original.payment_method='cash' then
    if v_original.cash_session_id is null then
      raise exception 'El abono en efectivo no tiene una caja asociada';
    end if;
    select * into v_session
    from public.cash_sessions
    where id=v_original.cash_session_id
      and business_id=p_business_id
      and status='open'
    for update;
    if not found then
      raise exception 'El turno del abono ya está cerrado; no se puede alterar un corte cerrado';
    end if;

    insert into public.cash_movements(
      business_id,cash_session_id,movement_type,amount,concept,reference,created_by
    ) values (
      p_business_id,v_original.cash_session_id,'withdrawal',v_original.amount,
      'Cancelación de abono · ' || v_client.name,
      'ABONO-CANCEL-' || v_original.id::text,p_user_id
    );
  end if;

  insert into public.customer_credit_movements(
    business_id,client_id,cash_session_id,movement_type,amount,reason,created_by,reversed_movement_id
  ) values (
    p_business_id,v_original.client_id,v_original.cash_session_id,'charge',v_original.amount,
    'Cancelación de abono · ' || trim(p_reason),p_user_id,v_original.id
  ) returning id into v_reversal_id;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values(
    p_business_id,p_user_id,'pos.credit.payment.void','credit_movement',v_reversal_id::text,
    jsonb_build_object(
      'original_movement_id',v_original.id,
      'client_id',v_original.client_id,
      'amount',v_original.amount,
      'payment_method',v_original.payment_method,
      'reason',trim(p_reason)
    )
  );

  return jsonb_build_object(
    'ok',true,
    'original_movement_id',v_original.id,
    'reversal_movement_id',v_reversal_id,
    'client_id',v_original.client_id,
    'amount',v_original.amount,
    'payment_method',v_original.payment_method
  );
end;
$function$;

revoke all on function public.solrak_void_credit_payment(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.solrak_void_credit_payment(uuid,uuid,uuid,text) to service_role;
