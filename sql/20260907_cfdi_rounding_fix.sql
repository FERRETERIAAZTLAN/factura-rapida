-- CFDI 4.0: Comprobante.SubTotal and transferred taxes must match the
-- rounded amounts of the concepts that are actually serialized.
--
-- factura-api stores each line_subtotal / line_iva / line_total at 2 decimals.
-- Previously drafts accumulated the unrounded values first and rounded only the
-- document totals, which could create a 0.01 difference and cause Finkok/SAT to
-- reject the CFDI.

create or replace function private.sync_draft_cfdi_totals()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_subtotal numeric := 0;
  v_iva numeric := 0;
  v_total numeric := 0;
begin
  if jsonb_typeof(new.items) <> 'array' then
    return new;
  end if;

  select
    coalesce(sum(round(case when coalesce(x->>'line_subtotal','') ~ '^-?[0-9]+([.][0-9]+)?$' then (x->>'line_subtotal')::numeric else 0 end, 2)), 0),
    coalesce(sum(round(case when coalesce(x->>'line_iva','') ~ '^-?[0-9]+([.][0-9]+)?$' then (x->>'line_iva')::numeric else 0 end, 2)), 0),
    coalesce(sum(round(case when coalesce(x->>'line_total','') ~ '^-?[0-9]+([.][0-9]+)?$' then (x->>'line_total')::numeric else 0 end, 2)), 0)
  into v_subtotal, v_iva, v_total
  from jsonb_array_elements(new.items) as x;

  new.subtotal := round(v_subtotal, 2);
  new.iva := round(v_iva, 2);
  new.total := round(v_total, 2);
  return new;
end;
$$;

drop trigger if exists trg_drafts_sync_cfdi_totals on public.drafts;
create trigger trg_drafts_sync_cfdi_totals
before insert or update of items, subtotal, iva, total on public.drafts
for each row execute function private.sync_draft_cfdi_totals();
