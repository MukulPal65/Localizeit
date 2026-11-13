-- Allow the frontend to use a stable UUID for a new product.

create or replace function public.upsert_product(
  p_product_id uuid,
  p_shop_id uuid,
  p_name text,
  p_category_id text,
  p_unit text,
  p_price numeric,
  p_mrp numeric,
  p_stock int,
  p_expiry date,
  p_description text,
  p_tags text[],
  p_image_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not (public.owns_shop(p_shop_id) or public.is_admin()) then
    return jsonb_build_object('ok', false, 'error', 'You do not manage this shop.');
  end if;
  if p_price is null or p_price <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Price must be above zero.');
  end if;
  if p_mrp is not null and p_mrp > 0 and p_mrp < p_price then
    return jsonb_build_object('ok', false, 'error', 'MRP cannot be below the selling price.');
  end if;
  if p_stock is null or p_stock < 0 then
    return jsonb_build_object('ok', false, 'error', 'Stock cannot be negative.');
  end if;
  if p_expiry is not null and p_expiry < current_date then
    return jsonb_build_object('ok', false, 'error', 'Expired products cannot be listed.');
  end if;

  if exists (select 1 from public.products where id = p_product_id) then
    update public.products set
      name = p_name, category_id = p_category_id, unit = p_unit, price = p_price,
      mrp = p_mrp, stock = p_stock, in_stock = p_stock > 0, expiry = p_expiry,
      description = coalesce(p_description, ''), tags = coalesce(p_tags, '{}'),
      image_url = p_image_url, stock_updated_at = now(), updated_at = now()
    where id = p_product_id and shop_id = p_shop_id
    returning id into v_id;
  else
    insert into public.products (
      id, shop_id, name, category_id, unit, price, mrp, stock, in_stock,
      expiry, description, tags, image_url
    ) values (
      p_product_id, p_shop_id, p_name, p_category_id, p_unit, p_price, p_mrp,
      p_stock, p_stock > 0, p_expiry, coalesce(p_description, ''),
      coalesce(p_tags, '{}'), p_image_url
    ) returning id into v_id;
  end if;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'Product was not saved.');
  end if;
  return jsonb_build_object('ok', true, 'product_id', v_id);
end;
$$;

grant execute on function public.upsert_product(uuid, uuid, text, text, text, numeric, numeric, int, date, text, text[], text)
  to authenticated;
