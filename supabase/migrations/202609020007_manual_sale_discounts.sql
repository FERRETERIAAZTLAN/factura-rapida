create or replace function public.pos_complete_sale(
  p_business_id uuid,
  p_user_id uuid,
  p_cash_session_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_client_id uuid default null::uuid,
  p_notes text default null::text,
  p_quote_id uuid default null::uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
  v_manual_discount_total numeric(14,2) := 0;
  v_lines jsonb := '[]'::jsonb;
  v_line_base numeric(14,2);
  v_line_iva numeric(14,2);
  v_line_total numeric(14,2);
  v_pre_base numeric(14,2);
  v_pre_iva numeric(14,2);
  v_pre_total numeric(14,2);
  v_qty numeric(14,4);
  v_rate numeric(7,4);
  v_price numeric(14,4);
  v_list_price numeric(14,2);
  v_discount numeric(14,2);
  v_promotion_discount numeric(14,2);
  v_manual_discount numeric(14,2);
  v_before numeric(14,4);
  v_after numeric(14,4);
  v_client_name text;
  v_custom_name text;
  v_custom_unit text;
  v_custom_cost numeric(14,2);
  v_includes_tax boolean;
  v_allow_discounts boolean := false;
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

  if v_user.role = 'admin' then
    v_allow_discounts := true;
  else
    select coalesce(permission.allow_discounts,false)
      into v_allow_discounts
    from public.pos_user_permissions permission
    where permission.business_id=p_business_id and permission.user_id=p_user_id;
    v_allow_discounts := coalesce(v_allow_discounts,false);
  end if;

  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id and business_id = p_business_id and status = 'open'
  for update;
  if not found then raise exception 'No hay una sesión de caja abierta válida'; end if;

  if p_client_id is not null then
    select name into v_client_name
    from public.clients
    where id = p_client_id and business_id = p_business_id and active = true;
    if not found then raise exception 'Cliente no válido para este negocio'; end if;
  end if;
  if p_quote_id is not null and not exists(
    select 1 from public.quotes where id = p_quote_id and business_id = p_business_id
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
      sum((x->>'qty')::numeric)::numeric(14,4) as qty,
      sum(greatest(coalesce(nullif(x->>'manual_discount_amount','')::numeric,0),0))::numeric(14,2) as manual_discount_amount
    from jsonb_array_elements(p_items) x
    where nullif(x->>'product_id','') is not null
      and coalesce(x->>'custom','false') <> 'true'
    group by (x->>'product_id')::uuid
  loop
    v_qty := r.qty;
    v_manual_discount := round(greatest(coalesce(r.manual_discount_amount,0),0),2);
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    if v_manual_discount > 0 and not v_allow_discounts then
      raise exception 'Este usuario no tiene permiso para aplicar descuentos';
    end if;

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
    v_promotion_discount := 0;
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
      v_promotion_discount := round(((v_list_price - v_price) * v_qty)::numeric, 2);
    end if;

    v_rate := greatest(coalesce(v_product.iva, 0), 0);
    if v_product.price_includes_tax then
      v_pre_total := round((v_price * v_qty)::numeric, 2);
      v_pre_base := case when v_rate > 0
        then round((v_pre_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_pre_total end;
      v_pre_iva := v_pre_total - v_pre_base;
    else
      v_pre_base := round((v_price * v_qty)::numeric, 2);
      v_pre_iva := round((v_pre_base * (v_rate / 100))::numeric, 2);
      v_pre_total := v_pre_base + v_pre_iva;
    end if;

    if v_manual_discount >= v_pre_total and v_manual_discount > 0 then
      raise exception 'El descuento de % no puede ser igual o mayor al total de la línea', v_product.name;
    end if;

    v_line_total := round((v_pre_total - v_manual_discount)::numeric, 2);
    if v_product.price_includes_tax then
      v_line_base := case when v_rate > 0
        then round((v_line_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_line_total end;
      v_line_iva := v_line_total - v_line_base;
      v_price := round((v_line_total / v_qty)::numeric, 4);
    else
      v_line_base := case when v_rate > 0
        then round((v_line_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_line_total end;
      v_line_iva := v_line_total - v_line_base;
      v_price := round((v_line_base / v_qty)::numeric, 4);
    end if;

    v_discount := round((v_promotion_discount + v_manual_discount)::numeric,2);
    v_manual_discount_total := v_manual_discount_total + v_manual_discount;
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
      'manual_discount', v_manual_discount,
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
    v_list_price := round(coalesce((item->>'unit_price')::numeric, 0), 2);
    v_price := v_list_price;
    v_custom_cost := round(greatest(coalesce((item->>'cost')::numeric, 0), 0), 2);
    v_rate := greatest(coalesce((item->>'iva_rate')::numeric, 0), 0);
    v_includes_tax := coalesce((item->>'price_includes_tax')::boolean, true);
    v_custom_name := left(nullif(trim(item->>'name'), ''), 180);
    v_custom_unit := left(coalesce(nullif(trim(item->>'unit'), ''), 'Pieza'), 80);
    v_manual_discount := round(greatest(coalesce(nullif(item->>'manual_discount_amount','')::numeric,0),0),2);
    if v_qty <= 0 then raise exception 'Cantidad inválida en producto común'; end if;
    if v_list_price <= 0 then raise exception 'Precio inválido en producto común'; end if;
    if v_rate > 100 then raise exception 'IVA inválido en producto común'; end if;
    if v_custom_name is null then raise exception 'Escribe el nombre del producto común'; end if;
    if v_manual_discount > 0 and not v_allow_discounts then
      raise exception 'Este usuario no tiene permiso para aplicar descuentos';
    end if;

    if v_includes_tax then
      v_pre_total := round((v_list_price * v_qty)::numeric, 2);
      v_pre_base := case when v_rate > 0
        then round((v_pre_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_pre_total end;
      v_pre_iva := v_pre_total - v_pre_base;
    else
      v_pre_base := round((v_list_price * v_qty)::numeric, 2);
      v_pre_iva := round((v_pre_base * (v_rate / 100))::numeric, 2);
      v_pre_total := v_pre_base + v_pre_iva;
    end if;
    if v_manual_discount >= v_pre_total and v_manual_discount > 0 then
      raise exception 'El descuento del producto común no puede ser igual o mayor al total de la línea';
    end if;

    v_line_total := round((v_pre_total - v_manual_discount)::numeric, 2);
    if v_includes_tax then
      v_line_base := case when v_rate > 0
        then round((v_line_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_line_total end;
      v_line_iva := v_line_total - v_line_base;
      v_price := round((v_line_total / v_qty)::numeric,4);
    else
      v_line_base := case when v_rate > 0
        then round((v_line_total / (1 + (v_rate / 100)))::numeric, 2)
        else v_line_total end;
      v_line_iva := v_line_total - v_line_base;
      v_price := round((v_line_base / v_qty)::numeric,4);
    end if;

    v_discount := v_manual_discount;
    v_manual_discount_total := v_manual_discount_total + v_manual_discount;
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
      'list_price', v_list_price,
      'cost', v_custom_cost,
      'iva_rate', v_rate,
      'price_includes_tax', v_includes_tax,
      'subtotal', v_line_base,
      'iva', v_line_iva,
      'total', v_line_total,
      'discount', v_discount,
      'manual_discount', v_manual_discount,
      'promotion_id', null,
      'promotion_name', null,
      'stock_before', null
    ));
  end loop;

  if jsonb_array_length(v_lines) = 0 then raise exception 'La venta no tiene líneas válidas'; end if;

  for pay in select value from jsonb_array_elements(p_payments)
  loop
    if coalesce((pay->>'amount')::numeric, 0) <= 0 then raise exception 'Monto de pago inválido'; end if;
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
      'sale_number',v_sale_number,
      'total',v_total,
      'items',jsonb_array_length(v_lines),
      'cash_session_id',v_session.id,
      'credit_total',v_credit_total,
      'manual_discount_total',round(v_manual_discount_total,2)
    )
  );

  return jsonb_build_object(
    'ok',true,
    'sale_id',v_sale_id,
    'sale_number',v_sale_number,
    'subtotal',v_subtotal,
    'iva',v_iva,
    'total',v_total,
    'manual_discount_total',round(v_manual_discount_total,2),
    'currency',v_settings.currency,
    'items',jsonb_array_length(v_lines),
    'created_at',now()
  );
end;
$function$;

revoke all on function public.pos_complete_sale(uuid,uuid,uuid,jsonb,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.pos_complete_sale(uuid,uuid,uuid,jsonb,jsonb,uuid,text,uuid) to service_role;
