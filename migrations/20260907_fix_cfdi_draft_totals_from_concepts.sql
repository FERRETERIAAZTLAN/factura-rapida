-- Corrige el redondeo CFDI: los totales del borrador deben salir de los importes
-- ya redondeados de cada concepto, no de volver a sumar bases/impuestos sin redondear.
-- Esto evita que SubTotal difiera por $0.01 de la suma de Concepto.Importe.

create or replace function public.set_draft_product_tax_snapshot()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.items is null or jsonb_typeof(new.items) <> 'array' then
    return new;
  end if;

  select coalesce(jsonb_agg(
    e.item || jsonb_build_object(
      'tax_object', coalesce(p.tax_object,'02'),
      'tax_factor', coalesce(p.tax_factor,'Tasa')
    ) order by e.ord
  ), '[]'::jsonb)
  into new.items
  from jsonb_array_elements(new.items) with ordinality as e(item,ord)
  left join public.products p
    on p.business_id = new.business_id
   and p.id = case
     when coalesce(e.item->>'id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     then (e.item->>'id')::uuid
     else null
   end;

  select
    round(coalesce(sum(case when jsonb_typeof(e.item->'line_subtotal')='number' then (e.item->>'line_subtotal')::numeric else 0 end),0),2),
    round(coalesce(sum(case when jsonb_typeof(e.item->'line_iva')='number' then (e.item->>'line_iva')::numeric else 0 end),0),2),
    round(coalesce(sum(case when jsonb_typeof(e.item->'line_total')='number' then (e.item->>'line_total')::numeric else 0 end),0),2)
  into new.subtotal,new.iva,new.total
  from jsonb_array_elements(new.items) as e(item);

  return new;
end;
$function$;
