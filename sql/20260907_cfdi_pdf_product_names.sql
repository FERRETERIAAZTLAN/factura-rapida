-- Ensure invoice concept snapshots use the product name as the printable description.
-- This keeps the PDF/email representation aligned with the CFDI XML, which already
-- serializes the product name in Concepto.Descripcion.

create or replace function private.normalize_invoice_concept_names()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_items jsonb;
begin
  if new.concepts_snapshot is null or jsonb_typeof(new.concepts_snapshot) <> 'array' then
    return new;
  end if;

  select coalesce(
    jsonb_agg(
      case
        when nullif(btrim(item->>'name'),'') is not null
          then item || jsonb_build_object('description', item->>'name')
        else item
      end
      order by ord
    ),
    '[]'::jsonb
  )
  into v_items
  from jsonb_array_elements(new.concepts_snapshot) with ordinality as e(item, ord);

  new.concepts_snapshot := v_items;
  return new;
end;
$$;

drop trigger if exists trg_cfdi_invoice_concept_names on public.cfdi_invoices;
create trigger trg_cfdi_invoice_concept_names
before insert or update of concepts_snapshot on public.cfdi_invoices
for each row execute function private.normalize_invoice_concept_names();
