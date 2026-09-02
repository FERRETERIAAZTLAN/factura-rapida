create index if not exists product_promotions_created_by_idx
  on public.product_promotions(created_by);
create index if not exists product_promotions_updated_by_idx
  on public.product_promotions(updated_by);

create index if not exists sale_returns_sale_fk_idx
  on public.sale_returns(sale_id);
create index if not exists sale_returns_cash_session_idx
  on public.sale_returns(cash_session_id);
create index if not exists sale_returns_created_by_idx
  on public.sale_returns(created_by);

create index if not exists sale_return_items_sale_item_fk_idx
  on public.sale_return_items(sale_item_id);
create index if not exists sale_return_items_product_idx
  on public.sale_return_items(product_id);

create index if not exists customer_credit_client_fk_idx
  on public.customer_credit_movements(client_id);
create index if not exists customer_credit_return_idx
  on public.customer_credit_movements(return_id);
create index if not exists customer_credit_cash_session_idx
  on public.customer_credit_movements(cash_session_id);
create index if not exists customer_credit_created_by_idx
  on public.customer_credit_movements(created_by);
