begin;

alter table public.pos_settings
  add column if not exists next_return_number bigint not null default 1;

alter table public.sales
  add column if not exists return_status text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_return_status_check'
  ) then
    alter table public.sales
      add constraint sales_return_status_check
      check (return_status in ('none','partial','full'));
  end if;
end $$;

alter table public.sale_items
  add column if not exists list_unit_price numeric(14,2),
  add column if not exists promotion_id uuid,
  add column if not exists promotion_name text,
  add column if not exists discount_amount numeric(14,2) not null default 0;

create table if not exists public.product_promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  discount_type text not null check (discount_type in ('percent','fixed_price')),
  value numeric(14,4) not null check (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (discount_type <> 'percent' or value <= 100)
);

create index if not exists product_promotions_business_active_idx
  on public.product_promotions(business_id, active, starts_at, ends_at);
create index if not exists product_promotions_product_idx
  on public.product_promotions(product_id, active);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sale_items'::regclass
      and conname = 'sale_items_promotion_id_fkey'
  ) then
    alter table public.sale_items
      add constraint sale_items_promotion_id_fkey
      foreign key (promotion_id) references public.product_promotions(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_number bigint not null,
  sale_id uuid not null references public.sales(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  iva numeric(14,2) not null check (iva >= 0),
  total numeric(14,2) not null check (total > 0),
  refund_method text not null check (refund_method in ('cash','card','transfer','credit','other')),
  reason text not null,
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (business_id, return_number)
);

create index if not exists sale_returns_sale_idx
  on public.sale_returns(business_id, sale_id, created_at);

create table if not exists public.sale_return_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_id uuid not null references public.sale_returns(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  iva numeric(14,2) not null check (iva >= 0),
  total numeric(14,2) not null check (total > 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_return_items_sale_item_idx
  on public.sale_return_items(business_id, sale_item_id);
create index if not exists sale_return_items_return_idx
  on public.sale_return_items(return_id);

create table if not exists public.customer_credit_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  return_id uuid references public.sale_returns(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  movement_type text not null check (movement_type in ('charge','payment','return','void','adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  payment_method text check (payment_method is null or payment_method in ('cash','card','transfer','other')),
  reason text,
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists customer_credit_client_idx
  on public.customer_credit_movements(business_id, client_id, created_at);
create unique index if not exists customer_credit_sale_charge_uniq
  on public.customer_credit_movements(sale_id)
  where movement_type = 'charge';
create unique index if not exists customer_credit_sale_void_uniq
  on public.customer_credit_movements(sale_id)
  where movement_type = 'void';

alter table public.product_promotions enable row level security;
alter table public.sale_returns enable row level security;
alter table public.sale_return_items enable row level security;
alter table public.customer_credit_movements enable row level security;

revoke all on table public.product_promotions from anon, authenticated;
revoke all on table public.sale_returns from anon, authenticated;
revoke all on table public.sale_return_items from anon, authenticated;
revoke all on table public.customer_credit_movements from anon, authenticated;
grant select, insert, update, delete on table public.product_promotions to service_role;
grant select, insert, update, delete on table public.sale_returns to service_role;
grant select, insert, update, delete on table public.sale_return_items to service_role;
grant select, insert, update, delete on table public.customer_credit_movements to service_role;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in ('sale','sale_void','sale_return','purchase','purchase_return','adjustment'));

alter table public.sale_payments
  drop constraint if exists sale_payments_method_check;
alter table public.sale_payments
  add constraint sale_payments_method_check
  check (method in ('cash','card','transfer','credit','other'));

create or replace function public.pos_complete_sale(
  p_business_id uuid,
  p_user_id uuid,
  p_cash_session_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_client_id uuid default null,
  p_notes text default null,
  p_quote_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.app_users%rowtype;
  v_session public.cash_sessions%rowtype;
  v_settings public.pos_settings%rowtype;
  v_product public.products%rowtype;
  v_promotion public.product_promotions%rowtype;
  v_sale_id uuid := gen_random_uuid();
  v_sale_number bigint;
  v_subtotal numeric(14,2) := 0;
  v_iva numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_payment_total numeric(14,2) := 0;
  v_credit_total numeric(14,2) := 0;
  v_lines jsonb := '[]'::jsonb;
  v_line_base numeric(14,2);
  v_line_iva numeric(14,2);
  v_line_total numeric(14,2);
  v_qty numeric(14,4);
  v_rate numeric(7,4);
  v_price numeric(14,2);
  v_list_price numeric(14,2);
  v_discount numeric(14,2);
  v_before numeric(14,4);
  v_after numeric(14,4);
  v_client_name text;
  v_custom_name text;
  v_custom_unit text;
  v_custom_cost numeric(14,2);
  v_includes_tax boolean;
  r record;
  item jsonb;
  pay jsonb;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id and business_id = p_business_id and active = true;
  if not found or v_user.role not in ('admin','seller') then
    raise exception 'Usuario no autorizado para vender';
  end if;

  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id and business_id = p_business_id and status = 'open'
  for update;
  if not found then raise exception 'No hay una sesión de caja abierta válida'; end if;

  if p_client_id is not null then
    select name into v_client_name
    from public.clients
    where id = p_client_id and business_id = p_business_id;
    if not found then raise exception 'Cliente no válido para este negocio'; end if;
  end if;
  if p_quote_id is not null and not exists(
    select 1 from public.quotes
    where id = p_quote_id and business_id = p_business_id
  ) then
    raise exception 'Cotización no válida para este negocio';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'La venta no tiene pagos';
  end if;

  insert into public.pos_settings(business_id)
  values (p_business_id)
  on conflict (business_id) do nothing;
  select * into v_settings
  from public.pos_settings
  where business_id = p_business_id
  for update;

  for r in
    select
      (x->>'product_id')::uuid as product_id,
      sum((x->>'qty')::numeric)::numeric(14,4) as qty
    from jsonb_array_elements(p_items) x
    where nullif(x->>'product_id','') is not null
      and coalesce(x->>'custom','false') <> 'true'
    group by (x->>'product_id')::uuid
  loop
    v_qty := r.qty;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    select * into v_product
    from public.products
    where id = r.product_id and business_id = p_business_id and active = true
    for update;
    if not found then raise exception 'Producto no encontrado o inactivo'; end if;
    if not v_settings.allow_negative_stock and v_product.stock < v_qty then
      raise exception 'Existencia insuficiente para % (disponible %, solicitado %)',
        v_product.name, v_product.stock, v_qty;
    end if;

    v_list_price := round(v_product.price::numeric, 2);
    v_price := v_list_price;
    v_discount := 0;
    v_promotion := null;
    select * into v_promotion
    from public.product_promotions
    where business_id = p_business_id
      and product_id = v_product.id
      and active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    order by created_at desc
    limit 1;
    if found then
      if v_promotion.discount_type = 'percent' then
        v_price := round((v_list_price * (1 - (v_promotion.value / 100)))::numeric, 2);
      else
        v_price := least(v_list_price, round(v_promotion.value::numeric, 2));
      end if;
      v_price := greatest(v_price, 0);
      v_discount := round(((v_list_price - v_price) * v_qty)::numeric, 2);
    end if;

    v_rate := greatest(coalesce(v_product.iva, 0), 0);
    if v_product.price_includes_tax then
      v_line_total := round((v_price * v_qty)::numeric, 2);
      v_line_base := case when v_rate > 0
        then round((v_line_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_line_total end;
      v_line_iva := v_line_total - v_line_base;
    else
      v_line_base := round((v_price * v_qty)::numeric, 2);
      v_line_iva := round((v_line_base * (v_rate / 100))::numeric, 2);
      v_line_total := v_line_base + v_line_iva;
    end if;
    v_subtotal := v_subtotal + v_line_base;
    v_iva := v_iva + v_line_iva;
    v_total := v_total + v_line_total;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'code', v_product.code,
      'name', v_product.name,
      'unit', v_product.unit,
      'qty', v_qty,
      'price', v_price,
      'list_price', v_list_price,
      'cost', v_product.cost,
      'iva_rate', v_rate,
      'price_includes_tax', v_product.price_includes_tax,
      'subtotal', v_line_base,
      'iva', v_line_iva,
      'total', v_line_total,
      'discount', v_discount,
      'promotion_id', v_promotion.id,
      'promotion_name', v_promotion.name,
      'stock_before', v_product.stock
    ));
  end loop;

  for item in
    select value
    from jsonb_array_elements(p_items)
    where nullif(value->>'product_id','') is null
      or coalesce(value->>'custom','false') = 'true'
  loop
    v_qty := coalesce((item->>'qty')::numeric, 0);
    v_price := round(coalesce((item->>'unit_price')::numeric, 0), 2);
    v_custom_cost := round(greatest(coalesce((item->>'cost')::numeric, 0), 0), 2);
    v_rate := greatest(coalesce((item->>'iva_rate')::numeric, 0), 0);
    v_includes_tax := coalesce((item->>'price_includes_tax')::boolean, true);
    v_custom_name := left(nullif(trim(item->>'name'), ''), 180);
    v_custom_unit := left(coalesce(nullif(trim(item->>'unit'), ''), 'Pieza'), 80);
    if v_qty <= 0 then raise exception 'Cantidad inválida en producto común'; end if;
    if v_price <= 0 then raise exception 'Precio inválido en producto común'; end if;
    if v_rate > 100 then raise exception 'IVA inválido en producto común'; end if;
    if v_custom_name is null then v_custom_name := 'Producto común'; end if;
    if v_includes_tax then
      v_line_total := round((v_price * v_qty)::numeric, 2);
      v_line_base := case when v_rate > 0
        then round((v_line_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_line_total end;
      v_line_iva := v_line_total - v_line_base;
    else
      v_line_base := round((v_price * v_qty)::numeric, 2);
      v_line_iva := round((v_line_base * (v_rate / 100))::numeric, 2);
      v_line_total := v_line_base + v_line_iva;
    end if;
    v_subtotal := v_subtotal + v_line_base;
    v_iva := v_iva + v_line_iva;
    v_total := v_total + v_line_total;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', null,
      'code', null,
      'name', v_custom_name,
      'unit', v_custom_unit,
      'qty', v_qty,
      'price', v_price,
      'list_price', v_price,
      'cost', v_custom_cost,
      'iva_rate', v_rate,
      'price_includes_tax', v_includes_tax,
      'subtotal', v_line_base,
      'iva', v_line_iva,
      'total', v_line_total,
      'discount', 0,
      'promotion_id', null,
      'promotion_name', null,
      'stock_before', null
    ));
  end loop;

  if jsonb_array_length(v_lines) = 0 then raise exception 'La venta no tiene líneas válidas'; end if;

  for pay in select value from jsonb_array_elements(p_payments)
  loop
    if coalesce((pay->>'amount')::numeric, 0) <= 0 then
      raise exception 'Monto de pago inválido';
    end if;
    if coalesce(pay->>'method','') not in ('cash','card','transfer','credit','other') then
      raise exception 'Forma de pago inválida';
    end if;
    if pay->>'method' = 'credit' and p_client_id is null then
      raise exception 'Selecciona un cliente para vender a crédito';
    end if;
    v_payment_total := v_payment_total + round((pay->>'amount')::numeric, 2);
    if pay->>'method' = 'credit' then
      v_credit_total := v_credit_total + round((pay->>'amount')::numeric, 2);
    end if;
  end loop;
  if abs(v_payment_total - v_total) > 0.01 then
    raise exception 'Los pagos (%) no coinciden con el total (%)', v_payment_total, v_total;
  end if;

  v_sale_number := v_settings.next_sale_number;
  update public.pos_settings
  set next_sale_number = next_sale_number + 1, updated_at = now()
  where business_id = p_business_id;

  insert into public.sales(
    id,business_id,sale_number,register_id,cash_session_id,client_id,quote_id,
    customer_name,subtotal,iva,total,currency,status,notes,created_by
  ) values (
    v_sale_id,p_business_id,v_sale_number,v_session.register_id,v_session.id,
    p_client_id,p_quote_id,v_client_name,v_subtotal,v_iva,v_total,
    v_settings.currency,'completed',nullif(trim(p_notes),''),p_user_id
  );

  for r in select value as line from jsonb_array_elements(v_lines)
  loop
    insert into public.sale_items(
      business_id,sale_id,product_id,code_snapshot,name_snapshot,unit_snapshot,
      quantity,unit_price,list_unit_price,cost_snapshot,iva_rate,
      price_includes_tax,subtotal,iva,total,promotion_id,promotion_name,discount_amount
    ) values (
      p_business_id,v_sale_id,nullif(r.line->>'product_id','')::uuid,
      r.line->>'code',r.line->>'name',r.line->>'unit',
      (r.line->>'qty')::numeric,(r.line->>'price')::numeric,
      (r.line->>'list_price')::numeric,(r.line->>'cost')::numeric,
      (r.line->>'iva_rate')::numeric,(r.line->>'price_includes_tax')::boolean,
      (r.line->>'subtotal')::numeric,(r.line->>'iva')::numeric,
      (r.line->>'total')::numeric,nullif(r.line->>'promotion_id','')::uuid,
      nullif(r.line->>'promotion_name',''),(r.line->>'discount')::numeric
    );
    if nullif(r.line->>'product_id','') is not null then
      v_before := (r.line->>'stock_before')::numeric;
      v_after := v_before - (r.line->>'qty')::numeric;
      update public.products
      set stock = v_after, updated_by = p_user_id, updated_at = now()
      where id = (r.line->>'product_id')::uuid and business_id = p_business_id;
      insert into public.inventory_movements(
        business_id,product_id,movement_type,quantity_delta,stock_before,
        stock_after,reference_type,reference_id,user_id
      ) values (
        p_business_id,(r.line->>'product_id')::uuid,'sale',
        -((r.line->>'qty')::numeric),v_before,v_after,'sale',v_sale_id,p_user_id
      );
    end if;
  end loop;

  for pay in select value from jsonb_array_elements(p_payments)
  loop
    insert into public.sale_payments(
      business_id,sale_id,method,amount,tendered_amount,change_amount,reference,created_by
    ) values (
      p_business_id,v_sale_id,pay->>'method',round((pay->>'amount')::numeric,2),
      case when pay->>'method'='cash'
        then greatest(coalesce((pay->>'tendered')::numeric,(pay->>'amount')::numeric),(pay->>'amount')::numeric)
        else null end,
      case when pay->>'method'='cash'
        then round(greatest(coalesce((pay->>'tendered')::numeric,(pay->>'amount')::numeric)-(pay->>'amount')::numeric,0),2)
        else 0 end,
      nullif(trim(pay->>'reference'),''),p_user_id
    );
  end loop;

  if v_credit_total > 0 then
    insert into public.customer_credit_movements(
      business_id,client_id,sale_id,cash_session_id,movement_type,amount,reason,created_by
    ) values (
      p_business_id,p_client_id,v_sale_id,v_session.id,'charge',v_credit_total,
      'Venta a crédito',p_user_id
    );
  end if;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values (
    p_business_id,p_user_id,'pos.sale.complete','sale',v_sale_id::text,
    jsonb_build_object(
      'sale_number',v_sale_number,'total',v_total,
      'items',jsonb_array_length(v_lines),'cash_session_id',v_session.id,
      'credit_total',v_credit_total
    )
  );

  return jsonb_build_object(
    'ok',true,'sale_id',v_sale_id,'sale_number',v_sale_number,
    'subtotal',v_subtotal,'iva',v_iva,'total',v_total,
    'currency',v_settings.currency,'items',jsonb_array_length(v_lines),
    'created_at',now()
  );
end;
$$;

revoke execute on function public.pos_complete_sale(uuid,uuid,uuid,jsonb,jsonb,uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function public.pos_complete_sale(uuid,uuid,uuid,jsonb,jsonb,uuid,text,uuid)
  to service_role;

create or replace function public.pos_update_sale_payments(
  p_business_id uuid,
  p_user_id uuid,
  p_sale_id uuid,
  p_payments jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.app_users%rowtype;
  v_sale public.sales%rowtype;
  v_session public.cash_sessions%rowtype;
  v_total numeric(14,2) := 0;
  v_credit numeric(14,2) := 0;
  pay jsonb;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id and business_id = p_business_id and active = true;
  if not found or v_user.role <> 'admin' then
    raise exception 'Solo el administrador puede modificar la forma de pago';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Escribe el motivo del cambio'; end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and business_id = p_business_id
  for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status <> 'completed' then raise exception 'Solo se puede modificar una venta finalizada'; end if;
  if v_sale.return_status <> 'none' then raise exception 'No se puede modificar una venta con devoluciones'; end if;

  select * into v_session
  from public.cash_sessions
  where id = v_sale.cash_session_id and business_id = p_business_id
  for update;
  if not found or v_session.status <> 'open' then
    raise exception 'El turno de esta venta ya está cerrado';
  end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'La venta necesita al menos una forma de pago';
  end if;

  for pay in select value from jsonb_array_elements(p_payments)
  loop
    if coalesce((pay->>'amount')::numeric,0) <= 0 then raise exception 'Monto de pago inválido'; end if;
    if coalesce(pay->>'method','') not in ('cash','card','transfer','credit','other') then
      raise exception 'Forma de pago inválida';
    end if;
    if pay->>'method' = 'credit' and v_sale.client_id is null then
      raise exception 'La venta necesita un cliente para usar crédito';
    end if;
    v_total := v_total + round((pay->>'amount')::numeric,2);
    if pay->>'method' = 'credit' then
      v_credit := v_credit + round((pay->>'amount')::numeric,2);
    end if;
  end loop;
  if abs(v_total - v_sale.total) > 0.01 then
    raise exception 'Los pagos (%) no coinciden con el total (%)',v_total,v_sale.total;
  end if;

  delete from public.sale_payments
  where business_id = p_business_id and sale_id = p_sale_id;
  for pay in select value from jsonb_array_elements(p_payments)
  loop
    insert into public.sale_payments(
      business_id,sale_id,method,amount,tendered_amount,change_amount,reference,created_by
    ) values (
      p_business_id,p_sale_id,pay->>'method',round((pay->>'amount')::numeric,2),
      case when pay->>'method'='cash' then (pay->>'amount')::numeric else null end,
      0,nullif(trim(pay->>'reference'),''),p_user_id
    );
  end loop;

  if v_credit > 0 then
    insert into public.customer_credit_movements(
      business_id,client_id,sale_id,cash_session_id,movement_type,amount,reason,created_by
    ) values (
      p_business_id,v_sale.client_id,p_sale_id,v_sale.cash_session_id,
      'charge',v_credit,'Venta cambiada a crédito',p_user_id
    )
    on conflict (sale_id) where movement_type = 'charge'
    do update set amount = excluded.amount, reason = excluded.reason, created_by = excluded.created_by;
  else
    delete from public.customer_credit_movements
    where business_id = p_business_id and sale_id = p_sale_id and movement_type = 'charge';
  end if;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values (
    p_business_id,p_user_id,'pos.sale.payments.update','sale',p_sale_id::text,
    jsonb_build_object('reason',trim(p_reason),'payments',p_payments,'credit_total',v_credit)
  );
  return jsonb_build_object('ok',true,'sale_id',p_sale_id,'total',v_sale.total,'credit_total',v_credit);
end;
$$;

revoke execute on function public.pos_update_sale_payments(uuid,uuid,uuid,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.pos_update_sale_payments(uuid,uuid,uuid,jsonb,text)
  to service_role;

create or replace function public.pos_void_sale(
  p_business_id uuid,
  p_user_id uuid,
  p_sale_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.app_users%rowtype;
  v_sale public.sales%rowtype;
  v_session public.cash_sessions%rowtype;
  v_product public.products%rowtype;
  v_before numeric(14,4);
  v_after numeric(14,4);
  v_credit numeric(14,2);
  line public.sale_items%rowtype;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id and business_id = p_business_id and active = true;
  if not found or v_user.role <> 'admin' then
    raise exception 'Solo el administrador puede cancelar tickets';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Escribe el motivo de cancelación'; end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and business_id = p_business_id
  for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status = 'voided' then
    return jsonb_build_object('ok',true,'already_voided',true,'sale_id',v_sale.id,'sale_number',v_sale.sale_number);
  end if;
  if v_sale.return_status <> 'none' then
    raise exception 'No se puede cancelar una venta que ya tiene devoluciones';
  end if;

  select * into v_session
  from public.cash_sessions
  where id = v_sale.cash_session_id and business_id = p_business_id
  for update;
  if not found or v_session.status <> 'open' then
    raise exception 'El turno de esta venta ya está cerrado; usa una devolución';
  end if;

  for line in
    select * from public.sale_items
    where business_id = p_business_id and sale_id = p_sale_id
    order by created_at
    for update
  loop
    if line.product_id is not null then
      select * into v_product
      from public.products
      where id = line.product_id and business_id = p_business_id
      for update;
      if not found then raise exception 'No se encontró un producto de la venta'; end if;
      v_before := v_product.stock;
      v_after := v_before + line.quantity;
      update public.products
      set stock = v_after, updated_by = p_user_id, updated_at = now()
      where id = line.product_id and business_id = p_business_id;
      insert into public.inventory_movements(
        business_id,product_id,movement_type,quantity_delta,stock_before,
        stock_after,reference_type,reference_id,user_id,notes
      ) values (
        p_business_id,line.product_id,'sale_void',line.quantity,v_before,v_after,
        'sale',p_sale_id,p_user_id,trim(p_reason)
      );
    end if;
  end loop;

  update public.sales
  set status = 'voided', voided_by = p_user_id, voided_at = now(), void_reason = trim(p_reason)
  where id = p_sale_id and business_id = p_business_id;

  select coalesce(sum(amount),0) into v_credit
  from public.customer_credit_movements
  where business_id = p_business_id and sale_id = p_sale_id and movement_type = 'charge';
  if v_credit > 0 then
    insert into public.customer_credit_movements(
      business_id,client_id,sale_id,cash_session_id,movement_type,amount,reason,created_by
    ) values (
      p_business_id,v_sale.client_id,p_sale_id,v_sale.cash_session_id,
      'void',v_credit,trim(p_reason),p_user_id
    ) on conflict (sale_id) where movement_type = 'void' do nothing;
  end if;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values (
    p_business_id,p_user_id,'pos.sale.void','sale',p_sale_id::text,
    jsonb_build_object('sale_number',v_sale.sale_number,'total',v_sale.total,'reason',trim(p_reason))
  );
  return jsonb_build_object('ok',true,'sale_id',p_sale_id,'sale_number',v_sale.sale_number,'total',v_sale.total);
end;
$$;

revoke execute on function public.pos_void_sale(uuid,uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.pos_void_sale(uuid,uuid,uuid,text)
  to service_role;

create or replace function public.pos_return_sale(
  p_business_id uuid,
  p_user_id uuid,
  p_cash_session_id uuid,
  p_sale_id uuid,
  p_items jsonb,
  p_refund_method text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.app_users%rowtype;
  v_sale public.sales%rowtype;
  v_settings public.pos_settings%rowtype;
  v_session public.cash_sessions%rowtype;
  v_item public.sale_items%rowtype;
  v_product public.products%rowtype;
  v_return_id uuid := gen_random_uuid();
  v_return_number bigint;
  v_subtotal numeric(14,2) := 0;
  v_iva numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_qty numeric(14,4);
  v_already numeric(14,4);
  v_available numeric(14,4);
  v_line_subtotal numeric(14,2);
  v_line_iva numeric(14,2);
  v_line_total numeric(14,2);
  v_before numeric(14,4);
  v_after numeric(14,4);
  v_all_sold numeric(14,4);
  v_all_returned numeric(14,4);
  v_lines jsonb := '[]'::jsonb;
  raw_item jsonb;
  line record;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id and business_id = p_business_id and active = true;
  if not found or v_user.role not in ('admin','seller') then
    raise exception 'Usuario no autorizado para devolver';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Escribe el motivo de la devolución'; end if;
  if p_refund_method not in ('cash','card','transfer','credit','other') then
    raise exception 'Forma de devolución inválida';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Selecciona al menos un producto para devolver';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and business_id = p_business_id
  for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status <> 'completed' then raise exception 'No se puede devolver una venta cancelada'; end if;
  if p_refund_method = 'credit' and v_sale.client_id is null then
    raise exception 'La venta no tiene cliente para aplicar saldo a crédito';
  end if;

  if p_refund_method = 'cash' then
    select * into v_session
    from public.cash_sessions
    where id = p_cash_session_id and business_id = p_business_id and status = 'open'
    for update;
    if not found then raise exception 'Abre una caja para devolver efectivo'; end if;
  end if;

  insert into public.pos_settings(business_id)
  values (p_business_id)
  on conflict (business_id) do nothing;
  select * into v_settings
  from public.pos_settings
  where business_id = p_business_id
  for update;
  v_return_number := v_settings.next_return_number;
  update public.pos_settings
  set next_return_number = next_return_number + 1, updated_at = now()
  where business_id = p_business_id;

  for line in
    select
      (x->>'sale_item_id')::uuid as sale_item_id,
      sum((x->>'qty')::numeric)::numeric(14,4) as qty
    from jsonb_array_elements(p_items) x
    group by (x->>'sale_item_id')::uuid
  loop
    v_qty := line.qty;
    if v_qty <= 0 then raise exception 'Cantidad inválida para devolución'; end if;
    select * into v_item
    from public.sale_items
    where id = line.sale_item_id and sale_id = p_sale_id and business_id = p_business_id
    for update;
    if not found then raise exception 'Producto de venta no encontrado'; end if;
    select coalesce(sum(quantity),0) into v_already
    from public.sale_return_items
    where business_id = p_business_id and sale_item_id = v_item.id;
    v_available := v_item.quantity - v_already;
    if v_qty > v_available then
      raise exception 'La cantidad a devolver supera la disponible para %',v_item.name_snapshot;
    end if;
    v_line_subtotal := round((v_item.subtotal * v_qty / v_item.quantity)::numeric,2);
    v_line_iva := round((v_item.iva * v_qty / v_item.quantity)::numeric,2);
    v_line_total := round((v_item.total * v_qty / v_item.quantity)::numeric,2);
    v_subtotal := v_subtotal + v_line_subtotal;
    v_iva := v_iva + v_line_iva;
    v_total := v_total + v_line_total;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'sale_item_id',v_item.id,'product_id',v_item.product_id,'qty',v_qty,
      'unit_price',v_item.unit_price,'subtotal',v_line_subtotal,
      'iva',v_line_iva,'total',v_line_total
    ));
  end loop;

  if v_total <= 0 then raise exception 'El total de la devolución es inválido'; end if;

  insert into public.sale_returns(
    id,business_id,return_number,sale_id,cash_session_id,subtotal,iva,total,
    refund_method,reason,created_by
  ) values (
    v_return_id,p_business_id,v_return_number,p_sale_id,
    case when p_refund_method='cash' then p_cash_session_id else null end,
    v_subtotal,v_iva,v_total,p_refund_method,trim(p_reason),p_user_id
  );

  for raw_item in select value from jsonb_array_elements(v_lines)
  loop
    insert into public.sale_return_items(
      business_id,return_id,sale_item_id,product_id,quantity,unit_price,subtotal,iva,total
    ) values (
      p_business_id,v_return_id,(raw_item->>'sale_item_id')::uuid,
      nullif(raw_item->>'product_id','')::uuid,(raw_item->>'qty')::numeric,
      (raw_item->>'unit_price')::numeric,(raw_item->>'subtotal')::numeric,
      (raw_item->>'iva')::numeric,(raw_item->>'total')::numeric
    );
    if nullif(raw_item->>'product_id','') is not null then
      select * into v_product
      from public.products
      where id = (raw_item->>'product_id')::uuid and business_id = p_business_id
      for update;
      if not found then raise exception 'No se encontró un producto para restaurar inventario'; end if;
      v_before := v_product.stock;
      v_after := v_before + (raw_item->>'qty')::numeric;
      update public.products
      set stock = v_after, updated_by = p_user_id, updated_at = now()
      where id = v_product.id and business_id = p_business_id;
      insert into public.inventory_movements(
        business_id,product_id,movement_type,quantity_delta,stock_before,
        stock_after,reference_type,reference_id,user_id,notes
      ) values (
        p_business_id,v_product.id,'sale_return',(raw_item->>'qty')::numeric,
        v_before,v_after,'sale_return',v_return_id,p_user_id,trim(p_reason)
      );
    end if;
  end loop;

  if p_refund_method = 'cash' then
    insert into public.cash_movements(
      business_id,cash_session_id,movement_type,amount,concept,reference,created_by
    ) values (
      p_business_id,p_cash_session_id,'expense',v_total,
      'Devolución Ticket #' || v_sale.sale_number,
      'DEV-' || v_return_number,p_user_id
    );
  elsif p_refund_method = 'credit' then
    insert into public.customer_credit_movements(
      business_id,client_id,sale_id,return_id,cash_session_id,movement_type,
      amount,reason,created_by
    ) values (
      p_business_id,v_sale.client_id,p_sale_id,v_return_id,p_cash_session_id,
      'return',v_total,trim(p_reason),p_user_id
    );
  end if;

  select coalesce(sum(quantity),0) into v_all_sold
  from public.sale_items
  where business_id = p_business_id and sale_id = p_sale_id;
  select coalesce(sum(sri.quantity),0) into v_all_returned
  from public.sale_return_items sri
  join public.sale_returns sr on sr.id = sri.return_id
  where sr.business_id = p_business_id and sr.sale_id = p_sale_id;
  update public.sales
  set return_status = case when v_all_returned >= v_all_sold then 'full' else 'partial' end
  where id = p_sale_id and business_id = p_business_id;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values (
    p_business_id,p_user_id,'pos.sale.return','sale_return',v_return_id::text,
    jsonb_build_object('return_number',v_return_number,'sale_id',p_sale_id,
      'sale_number',v_sale.sale_number,'total',v_total,'refund_method',p_refund_method,
      'reason',trim(p_reason))
  );

  return jsonb_build_object(
    'ok',true,'return_id',v_return_id,'return_number',v_return_number,
    'sale_id',p_sale_id,'subtotal',v_subtotal,'iva',v_iva,'total',v_total,
    'refund_method',p_refund_method
  );
end;
$$;

revoke execute on function public.pos_return_sale(uuid,uuid,uuid,uuid,jsonb,text,text)
  from public, anon, authenticated;
grant execute on function public.pos_return_sale(uuid,uuid,uuid,uuid,jsonb,text,text)
  to service_role;

create or replace function public.pos_record_credit_payment(
  p_business_id uuid,
  p_user_id uuid,
  p_client_id uuid,
  p_cash_session_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.app_users%rowtype;
  v_client public.clients%rowtype;
  v_session public.cash_sessions%rowtype;
  v_amount numeric(14,2) := round(coalesce(p_amount,0),2);
  v_balance numeric(14,2);
  v_id uuid;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id and business_id = p_business_id and active = true;
  if not found or v_user.role <> 'admin' then
    raise exception 'Solo el administrador puede registrar pagos de crédito';
  end if;
  select * into v_client
  from public.clients
  where id = p_client_id and business_id = p_business_id;
  if not found then raise exception 'Cliente no encontrado'; end if;
  if v_amount <= 0 then raise exception 'El importe debe ser mayor a cero'; end if;
  if p_payment_method not in ('cash','card','transfer','other') then
    raise exception 'Forma de pago inválida';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Escribe una referencia o concepto'; end if;
  if p_payment_method = 'cash' then
    select * into v_session
    from public.cash_sessions
    where id = p_cash_session_id and business_id = p_business_id and status = 'open'
    for update;
    if not found then raise exception 'Abre una caja para recibir efectivo'; end if;
  end if;

  select coalesce(sum(case when movement_type='charge' then amount else -amount end),0)
  into v_balance
  from public.customer_credit_movements
  where business_id = p_business_id and client_id = p_client_id;
  if v_amount > v_balance + 0.01 then
    raise exception 'El pago supera el saldo pendiente (%)',v_balance;
  end if;

  insert into public.customer_credit_movements(
    business_id,client_id,cash_session_id,movement_type,amount,payment_method,
    reason,created_by
  ) values (
    p_business_id,p_client_id,p_cash_session_id,'payment',v_amount,p_payment_method,
    trim(p_reason),p_user_id
  ) returning id into v_id;
  if p_payment_method = 'cash' then
    insert into public.cash_movements(
      business_id,cash_session_id,movement_type,amount,concept,reference,created_by
    ) values (
      p_business_id,p_cash_session_id,'income',v_amount,
      'Pago de crédito · ' || v_client.name,v_id::text,p_user_id
    );
  end if;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values (
    p_business_id,p_user_id,'pos.credit.payment','credit_movement',v_id::text,
    jsonb_build_object('client_id',p_client_id,'amount',v_amount,
      'payment_method',p_payment_method,'reason',trim(p_reason))
  );
  return jsonb_build_object('ok',true,'movement_id',v_id,'amount',v_amount,'balance',v_balance-v_amount);
end;
$$;

revoke execute on function public.pos_record_credit_payment(uuid,uuid,uuid,uuid,numeric,text,text)
  from public, anon, authenticated;
grant execute on function public.pos_record_credit_payment(uuid,uuid,uuid,uuid,numeric,text,text)
  to service_role;

create or replace function public.pos_save_promotion(
  p_business_id uuid,
  p_user_id uuid,
  p_id uuid,
  p_product_id uuid,
  p_name text,
  p_discount_type text,
  p_value numeric,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.app_users%rowtype;
  v_promotion public.product_promotions%rowtype;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id and business_id = p_business_id and active = true;
  if not found or v_user.role <> 'admin' then
    raise exception 'Solo el administrador puede modificar promociones';
  end if;
  if not exists(
    select 1 from public.products
    where id = p_product_id and business_id = p_business_id and active = true
  ) then raise exception 'Producto no encontrado'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Escribe el nombre de la promoción'; end if;
  if p_discount_type not in ('percent','fixed_price') then raise exception 'Tipo de promoción inválido'; end if;
  if coalesce(p_value,0) <= 0 or (p_discount_type='percent' and p_value>100) then
    raise exception 'Valor de promoción inválido';
  end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at <= p_starts_at then
    raise exception 'La fecha final debe ser posterior a la inicial';
  end if;

  if p_id is null then
    insert into public.product_promotions(
      business_id,product_id,name,discount_type,value,starts_at,ends_at,active,created_by
    ) values (
      p_business_id,p_product_id,trim(p_name),p_discount_type,p_value,
      p_starts_at,p_ends_at,coalesce(p_active,true),p_user_id
    ) returning * into v_promotion;
  else
    update public.product_promotions
    set product_id=p_product_id,name=trim(p_name),discount_type=p_discount_type,
      value=p_value,starts_at=p_starts_at,ends_at=p_ends_at,
      active=coalesce(p_active,true),updated_by=p_user_id,updated_at=now()
    where id=p_id and business_id=p_business_id
    returning * into v_promotion;
    if not found then raise exception 'Promoción no encontrada'; end if;
  end if;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values (
    p_business_id,p_user_id,'pos.promotion.save','product_promotion',v_promotion.id::text,
    jsonb_build_object('product_id',p_product_id,'name',trim(p_name),
      'discount_type',p_discount_type,'value',p_value,'active',p_active)
  );
  return jsonb_build_object('ok',true,'promotion',to_jsonb(v_promotion));
end;
$$;

revoke execute on function public.pos_save_promotion(uuid,uuid,uuid,uuid,text,text,numeric,timestamptz,timestamptz,boolean)
  from public, anon, authenticated;
grant execute on function public.pos_save_promotion(uuid,uuid,uuid,uuid,text,text,numeric,timestamptz,timestamptz,boolean)
  to service_role;

commit;
