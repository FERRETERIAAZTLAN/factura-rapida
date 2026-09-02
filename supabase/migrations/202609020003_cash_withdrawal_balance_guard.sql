-- SOLRAK v0.1.78
-- Garantiza en PostgreSQL que una salida manual (withdrawal) nunca pueda
-- superar el efectivo teórico disponible en la sesión de caja.
-- El bloqueo de la fila de cash_sessions serializa retiros concurrentes.

create or replace function public.pos_validate_cash_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_cash_sales numeric(14,2) := 0;
  v_cash_movements numeric(14,2) := 0;
  v_available numeric(14,2) := 0;
begin
  if new.movement_type <> 'withdrawal' then
    return new;
  end if;

  select * into v_session
  from public.cash_sessions
  where id = new.cash_session_id
    and business_id = new.business_id
    and status = 'open'
  for update;

  if not found then
    raise exception 'La caja no está abierta';
  end if;

  select coalesce(sum(sp.amount), 0)::numeric(14,2)
  into v_cash_sales
  from public.sale_payments sp
  join public.sales s
    on s.id = sp.sale_id
   and s.business_id = new.business_id
  where sp.business_id = new.business_id
    and sp.method = 'cash'
    and s.cash_session_id = new.cash_session_id
    and s.status = 'completed';

  select coalesce(sum(
    case
      when cm.movement_type in ('income', 'deposit') then cm.amount
      else -cm.amount
    end
  ), 0)::numeric(14,2)
  into v_cash_movements
  from public.cash_movements cm
  where cm.business_id = new.business_id
    and cm.cash_session_id = new.cash_session_id;

  v_available := round(
    coalesce(v_session.opening_amount, 0)
    + coalesce(v_cash_sales, 0)
    + coalesce(v_cash_movements, 0),
    2
  );

  if round(coalesce(new.amount, 0), 2) > v_available then
    raise exception 'Saldo insuficiente en caja. Disponible: $%',
      to_char(greatest(v_available, 0), 'FM999999999990.00');
  end if;

  return new;
end;
$$;

revoke all on function public.pos_validate_cash_withdrawal() from public;
revoke all on function public.pos_validate_cash_withdrawal() from anon;
revoke all on function public.pos_validate_cash_withdrawal() from authenticated;

drop trigger if exists trg_pos_validate_cash_withdrawal on public.cash_movements;
create trigger trg_pos_validate_cash_withdrawal
before insert on public.cash_movements
for each row
when (new.movement_type = 'withdrawal')
execute function public.pos_validate_cash_withdrawal();
