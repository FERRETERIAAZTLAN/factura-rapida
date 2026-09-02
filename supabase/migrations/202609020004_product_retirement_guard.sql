create or replace function public.solrak_retire_product(
  p_business_id uuid,
  p_user_id uuid,
  p_product_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user public.app_users%rowtype;
  v_product public.products%rowtype;
  v_has_history boolean := false;
begin
  select * into v_user
  from public.app_users
  where id = p_user_id
    and business_id = p_business_id
    and active = true;

  if not found or v_user.role <> 'admin' then
    raise exception 'Solo el administrador puede dar de baja productos';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and business_id = p_business_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if v_product.active = false then
    return jsonb_build_object(
      'ok', true,
      'product_id', v_product.id,
      'mode', 'deactivated',
      'already_inactive', true,
      'name', v_product.name
    );
  end if;

  select exists(
    select 1 from public.sale_items si
      where si.business_id = p_business_id and si.product_id = p_product_id
    union all
    select 1 from public.sale_return_items sri
      where sri.business_id = p_business_id and sri.product_id = p_product_id
    union all
    select 1 from public.inventory_movements im
      where im.business_id = p_business_id and im.product_id = p_product_id
    union all
    select 1 from public.purchase_order_items poi
      where poi.business_id = p_business_id and poi.product_id = p_product_id
  ) into v_has_history;

  if v_has_history then
    update public.products
    set active = false,
        updated_by = p_user_id,
        updated_at = now()
    where id = p_product_id
      and business_id = p_business_id;

    insert into public.audit_logs(
      business_id,user_id,action,entity_type,entity_id,details
    ) values (
      p_business_id,p_user_id,'product.deactivate','product',p_product_id::text,
      jsonb_build_object(
        'code',v_product.code,
        'name',v_product.name,
        'reason','operational_history'
      )
    );

    return jsonb_build_object(
      'ok', true,
      'product_id', p_product_id,
      'mode', 'deactivated',
      'already_inactive', false,
      'name', v_product.name
    );
  end if;

  delete from public.products
  where id = p_product_id
    and business_id = p_business_id;

  insert into public.audit_logs(
    business_id,user_id,action,entity_type,entity_id,details
  ) values (
    p_business_id,p_user_id,'product.delete_unused','product',p_product_id::text,
    jsonb_build_object('code',v_product.code,'name',v_product.name)
  );

  return jsonb_build_object(
    'ok', true,
    'product_id', p_product_id,
    'mode', 'deleted',
    'name', v_product.name
  );
end;
$function$;

revoke all on function public.solrak_retire_product(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.solrak_retire_product(uuid,uuid,uuid) to service_role;

create or replace function public.solrak_guard_product_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists(
    select 1 from public.sale_items si where si.business_id = old.business_id and si.product_id = old.id
    union all
    select 1 from public.sale_return_items sri where sri.business_id = old.business_id and sri.product_id = old.id
    union all
    select 1 from public.inventory_movements im where im.business_id = old.business_id and im.product_id = old.id
    union all
    select 1 from public.purchase_order_items poi where poi.business_id = old.business_id and poi.product_id = old.id
  ) then
    raise exception 'Este producto tiene historial y no puede eliminarse físicamente; desactívalo';
  end if;
  return old;
end;
$function$;

revoke all on function public.solrak_guard_product_delete() from public, anon, authenticated;

drop trigger if exists trg_solrak_guard_product_delete on public.products;
create trigger trg_solrak_guard_product_delete
before delete on public.products
for each row
execute function public.solrak_guard_product_delete();
