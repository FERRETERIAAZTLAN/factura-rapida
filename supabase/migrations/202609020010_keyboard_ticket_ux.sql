alter table public.pos_settings
  add column if not exists ticket_barcode_enabled boolean not null default true;

create or replace function public.solrak_set_ticket_barcode(
  p_business_id uuid,
  p_user_id uuid,
  p_enabled boolean
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user public.app_users%rowtype;
  v_previous boolean;
begin
  select * into v_user
  from public.app_users
  where id=p_user_id and business_id=p_business_id and active=true;
  if not found or v_user.role<>'admin' then
    raise exception 'Solo el administrador puede cambiar la configuración del ticket';
  end if;

  insert into public.pos_settings(business_id)
  values(p_business_id)
  on conflict(business_id) do nothing;

  select ticket_barcode_enabled into v_previous
  from public.pos_settings
  where business_id=p_business_id
  for update;

  update public.pos_settings
  set ticket_barcode_enabled=coalesce(p_enabled,false),updated_at=now()
  where business_id=p_business_id;

  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,details)
  values(
    p_business_id,p_user_id,'pos.ticket_barcode.change','pos_settings',p_business_id::text,
    jsonb_build_object('previous',v_previous,'enabled',coalesce(p_enabled,false),'format','CODE39_NUMERIC_EXACT_FOLIO')
  );

  return jsonb_build_object('ok',true,'ticket_barcode_enabled',coalesce(p_enabled,false),'previous',v_previous);
end;
$function$;

revoke all on function public.solrak_set_ticket_barcode(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.solrak_set_ticket_barcode(uuid,uuid,boolean) to service_role;
