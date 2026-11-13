-- Persist product state changes made from the shop dashboard.

create or replace function public.update_product_state(
  p_product_id uuid,
  p_stock int default null,
  p_in_stock boolean default null,
  p_archived boolean default null,
  p_set_deal boolean default false,
  p_deal_price numeric default null,
  p_deal_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
begin
  select * into v_product from public.products where id = p_product_id;
  if v_product is null then
    return jsonb_build_object('ok', false, 'error', 'Product not found.');
  end if;
  if not (public.owns_shop(v_product.shop_id) or public.is_admin()) then
    return jsonb_build_object('ok', false, 'error', 'You do not manage this product.');
  end if;
  if p_stock is not null and p_stock < 0 then
    return jsonb_build_object('ok', false, 'error', 'Stock cannot be negative.');
  end if;
  if p_set_deal and p_deal_price is not null and p_deal_price <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Deal price must be above zero.');
  end if;

  update public.products
  set stock = coalesce(p_stock, stock),
      in_stock = coalesce(p_in_stock, in_stock),
      archived = coalesce(p_archived, archived),
      deal_price = case when p_set_deal then p_deal_price else deal_price end,
      deal_expires_at = case when p_set_deal then p_deal_expires_at else deal_expires_at end,
      stock_updated_at = now(),
      updated_at = now()
  where id = p_product_id;

  return jsonb_build_object('ok', true, 'product_id', p_product_id);
end;
$$;

grant execute on function public.update_product_state(uuid, int, boolean, boolean, boolean, numeric, timestamptz)
  to authenticated;
