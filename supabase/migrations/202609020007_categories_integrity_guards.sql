create table if not exists public.product_categories (
  business_id uuid not null references public.businesses(id) on delete cascade,
  id integer not null,
  name text not null,
  active boolean not null default true,
  created_by uuid null references public.app_users(id) on delete set null,
  updated_by uuid null references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id,id),
  constraint product_categories_id_positive check (id >= 1),
  constraint product_categories_name_required check (btrim(name) <> '')
);

create unique index if not exists product_categories_business_name_uidx
  on public.product_categories (business_id, lower(btrim(name)));

alter table public.product_categories enable row level security;
revoke all on table public.product_categories from public, anon, authenticated;
grant select, insert, update, delete on table public.product_categories to service_role;

insert into public.product_categories(business_id,id,name,active)
select id,1,'Producto Común',true
from public.businesses
on conflict (business_id,id) do update
set name='Producto Común',active=true,updated_at=now();

with source as (
  select distinct
    p.business_id,
    coalesce(nullif(btrim(p.category),''),'Producto en General') as name
  from public.products p
), numbered as (
  select
    business_id,
    name,
    row_number() over(partition by business_id order by lower(name),name)::integer + 1 as category_id
  from source
  where lower(name) <> lower('Producto Común')
)
insert into public.product_categories(business_id,id,name,active)
select business_id,category_id,name,true
from numbered
on conflict do nothing;

alter table public.products
  add column if not exists category_id integer;

update public.products p
set category_id = pc.id,
    category = pc.name
from public.product_categories pc
where pc.business_id = p.business_id
  and lower(pc.name) = lower(coalesce(nullif(btrim(p.category),''),'Producto en General'))
  and (p.category_id is distinct from pc.id or p.category is distinct from pc.name);

update public.products p
set category_id = 1,
    category = 'Producto Común'
where lower(coalesce(btrim(p.category),'')) = lower('Producto Común')
  and category_id is distinct from 1;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint where conname='products_business_category_fk'
  ) then
    alter table public.products
      add constraint products_business_category_fk
      foreign key (business_id,category_id)
      references public.product_categories(business_id,id)
      on update restrict on delete restrict;
  end if;
end;
$migration$;

alter table public.products alter column category_id set not null;
create index if not exists products_business_category_idx
  on public.products(business_id,category_id,active);

create or replace function public.solrak_guard_product_category()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if tg_op='DELETE' then
    if old.id=1 then
      raise exception 'La categoría 1 Producto Común es obligatoria y no puede eliminarse';
    end if;
    raise exception 'Las categorías no se eliminan físicamente; desactívalas';
  end if;

  if new.business_id is distinct from old.business_id or new.id is distinct from old.id then
    raise exception 'El ID numérico de una categoría es inmutable';
  end if;

  if old.id=1 and (
    new.name is distinct from 'Producto Común' or
    new.active is distinct from true
  ) then
    raise exception 'La categoría 1 debe permanecer activa y llamarse Producto Común';
  end if;

  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.solrak_guard_product_category() from public,anon,authenticated;

drop trigger if exists trg_solrak_guard_product_category on public.product_categories;
create trigger trg_solrak_guard_product_category
before update or delete on public.product_categories
for each row execute function public.solrak_guard_product_category();

create or replace function public.solrak_sync_product_category()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_name text;
  v_category_id integer;
begin
  if tg_op='UPDATE' and new.category_id is distinct from old.category_id then
    select name into v_name
    from public.product_categories
    where business_id=new.business_id and id=new.category_id and active=true;
    if not found then raise exception 'Categoría inexistente o inactiva'; end if;
    new.category := v_name;
    return new;
  end if;

  if tg_op='INSERT' and new.category_id is not null then
    select name into v_name
    from public.product_categories
    where business_id=new.business_id and id=new.category_id and active=true;
    if not found then raise exception 'Categoría inexistente o inactiva'; end if;
    new.category := v_name;
    return new;
  end if;

  if tg_op='UPDATE' and new.category is not distinct from old.category then
    select name into v_name
    from public.product_categories
    where business_id=new.business_id and id=new.category_id;
    if found then new.category := v_name; end if;
    return new;
  end if;

  v_name := coalesce(nullif(btrim(new.category),''),'Producto en General');
  if lower(v_name)=lower('Producto Común') then
    v_category_id := 1;
  else
    select id into v_category_id
    from public.product_categories
    where business_id=new.business_id and lower(name)=lower(v_name)
    limit 1;

    if v_category_id is null then
      perform pg_advisory_xact_lock(hashtextextended(new.business_id::text,0));
      select id into v_category_id
      from public.product_categories
      where business_id=new.business_id and lower(name)=lower(v_name)
      limit 1;
      if v_category_id is null then
        select coalesce(max(id),1)+1 into v_category_id
        from public.product_categories
        where business_id=new.business_id;
        insert into public.product_categories(business_id,id,name,active,created_by,updated_by)
        values(new.business_id,v_category_id,v_name,true,new.created_by,new.updated_by);
      end if;
    end if;
  end if;

  select name into v_name
  from public.product_categories
  where business_id=new.business_id and id=v_category_id and active=true;
  if not found then raise exception 'Categoría inexistente o inactiva'; end if;
  new.category_id := v_category_id;
  new.category := v_name;
  return new;
end;
$function$;

revoke all on function public.solrak_sync_product_category() from public,anon,authenticated;

drop trigger if exists trg_solrak_sync_product_category on public.products;
create trigger trg_solrak_sync_product_category
before insert or update of category,category_id on public.products
for each row execute function public.solrak_sync_product_category();

create or replace function public.solrak_create_category(
  p_business_id uuid,
  p_user_id uuid,
  p_name text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user public.app_users%rowtype;
  v_name text := btrim(coalesce(p_name,''));
  v_existing public.product_categories%rowtype;
  v_id integer;
begin
  select * into v_user from public.app_users
  where id=p_user_id and business_id=p_business_id and active=true;
  if not found or v_user.role<>'admin' then
    raise exception 'Solo el administrador puede crear categorías';
  end if;
  if v_name='' then raise exception 'Escribe el nombre de la categoría'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text,0));
  select * into v_existing from public.product_categories
  where business_id=p_business_id and lower(name)=lower(v_name)
  limit 1;
  if found then
    return jsonb_build_object('ok',true,'category_id',v_existing.id,'name',v_existing.name,'active',v_existing.active,'existing',true);
  end if;

  select coalesce(max(id),1)+1 into v_id
  from public.product_categories where business_id=p_business_id;
  if lower(v_name)=lower('Producto Común') then
    raise exception 'Producto Común está reservado como categoría 1';
  end if;

  insert into public.product_categories(business_id,id,name,active,created_by,updated_by)
  values(p_business_id,v_id,v_name,true,p_user_id,p_user_id);
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values(p_business_id,p_user_id,'category.create','product_category',v_id::text,jsonb_build_object('name',v_name));
  return jsonb_build_object('ok',true,'category_id',v_id,'name',v_name,'active',true,'existing',false);
end;
$function$;

revoke all on function public.solrak_create_category(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.solrak_create_category(uuid,uuid,text) to service_role;

create or replace function public.solrak_set_category_active(
  p_business_id uuid,
  p_user_id uuid,
  p_category_id integer,
  p_active boolean
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user public.app_users%rowtype;
  v_category public.product_categories%rowtype;
begin
  select * into v_user from public.app_users
  where id=p_user_id and business_id=p_business_id and active=true;
  if not found or v_user.role<>'admin' then
    raise exception 'Solo el administrador puede cambiar categorías';
  end if;

  select * into v_category from public.product_categories
  where business_id=p_business_id and id=p_category_id for update;
  if not found then raise exception 'Categoría no encontrada'; end if;
  if p_category_id=1 and p_active=false then
    raise exception 'La categoría 1 Producto Común debe permanecer activa';
  end if;
  if p_active=false and exists(
    select 1 from public.products
    where business_id=p_business_id and category_id=p_category_id and active=true
  ) then
    raise exception 'No puedes desactivar una categoría que todavía tiene productos activos';
  end if;

  update public.product_categories
  set active=p_active,updated_by=p_user_id,updated_at=now()
  where business_id=p_business_id and id=p_category_id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values(p_business_id,p_user_id,'category.active.change','product_category',p_category_id::text,jsonb_build_object('active',p_active,'name',v_category.name));
  return jsonb_build_object('ok',true,'category_id',p_category_id,'name',v_category.name,'active',p_active);
end;
$function$;

revoke all on function public.solrak_set_category_active(uuid,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.solrak_set_category_active(uuid,uuid,integer,boolean) to service_role;

create or replace function public.solrak_guard_client_delete()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if exists(
    select 1 from public.sales s where s.business_id=old.business_id and s.client_id=old.id
    union all select 1 from public.customer_credit_movements c where c.business_id=old.business_id and c.client_id=old.id
    union all select 1 from public.cfdi_invoices i where i.business_id=old.business_id and i.client_id=old.id
    union all select 1 from public.quotes q where q.business_id=old.business_id and q.client_id=old.id
    union all select 1 from public.drafts d where d.business_id=old.business_id and d.client_id=old.id
  ) then
    raise exception 'Este cliente tiene historial y no puede eliminarse físicamente; desactívalo';
  end if;
  return old;
end;
$function$;

revoke all on function public.solrak_guard_client_delete() from public,anon,authenticated;
drop trigger if exists trg_solrak_guard_client_delete on public.clients;
create trigger trg_solrak_guard_client_delete
before delete on public.clients
for each row execute function public.solrak_guard_client_delete();

create or replace function public.solrak_guard_user_delete()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if exists(
    select 1 from public.sales s where s.business_id=old.business_id and (s.created_by=old.id or s.voided_by=old.id)
    union all select 1 from public.sale_returns r where r.business_id=old.business_id and r.created_by=old.id
    union all select 1 from public.cash_sessions cs where cs.business_id=old.business_id and (cs.opened_by=old.id or cs.closed_by=old.id)
    union all select 1 from public.cash_movements cm where cm.business_id=old.business_id and cm.created_by=old.id
    union all select 1 from public.customer_credit_movements cc where cc.business_id=old.business_id and cc.created_by=old.id
    union all select 1 from public.inventory_movements im where im.business_id=old.business_id and im.user_id=old.id
    union all select 1 from public.purchase_orders po where po.business_id=old.business_id and po.created_by=old.id
    union all select 1 from public.supplier_payments sp where sp.business_id=old.business_id and sp.created_by=old.id
    union all select 1 from public.cfdi_invoices ci where ci.business_id=old.business_id and ci.created_by=old.id
  ) then
    raise exception 'Este usuario tiene historial y no puede eliminarse físicamente; desactívalo';
  end if;
  return old;
end;
$function$;

revoke all on function public.solrak_guard_user_delete() from public,anon,authenticated;
drop trigger if exists trg_solrak_guard_user_delete on public.app_users;
create trigger trg_solrak_guard_user_delete
before delete on public.app_users
for each row execute function public.solrak_guard_user_delete();