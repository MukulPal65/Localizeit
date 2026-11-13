-- ============================================================
-- LocalizeIt · Transactional RPCs
-- All money/stock/status mutations are server-side and atomic.
-- Client-facing RPCs are SECURITY DEFINER and validate the caller.
-- ============================================================

-- ---------- Internal: compute a checkout from the live catalogue ----------
create or replace function public.compute_checkout(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rule record;
  v_group jsonb;
  v_item jsonb;
  v_shop record;
  v_product record;
  v_qty int;
  v_price numeric(10,2);
  v_subtotal numeric(10,2);
  v_item_subtotal numeric(10,2) := 0;
  v_delivery_total numeric(10,2) := 0;
  v_platform_fee numeric(10,2);
  v_delivery_fee numeric(10,2);
  v_commission numeric(10,2);
  v_groups jsonb := '[]'::jsonb;
  v_lines jsonb;
  v_fulfilment fulfilment_type;
  v_count int := 0;
begin
  select * into v_rule from public.fee_rules where is_active order by version desc limit 1;
  if v_rule is null then
    return jsonb_build_object('ok', false, 'error', 'Fee configuration is missing. Ask an admin to publish fee rules.');
  end if;

  if p_payload->'address' is null then
    return jsonb_build_object('ok', false, 'error', 'A delivery address is required.');
  end if;

  for v_group in select * from jsonb_array_elements(coalesce(p_payload->'groups', '[]'::jsonb)) loop
    select * into v_shop from public.shops where id = (v_group->>'shop_id')::uuid;
    if v_shop is null or v_shop.status <> 'approved' then
      return jsonb_build_object('ok', false, 'error', 'A shop in your cart is not accepting orders.');
    end if;

    v_fulfilment := coalesce((v_group->>'fulfilment')::fulfilment_type, 'delivery');
    if v_fulfilment = 'pickup' and not v_shop.pickup then
      return jsonb_build_object('ok', false, 'error', v_shop.name || ' does not offer pickup.');
    end if;
    if v_fulfilment = 'delivery' and not v_shop.delivery then
      return jsonb_build_object('ok', false, 'error', v_shop.name || ' does not offer delivery.');
    end if;

    v_subtotal := 0;
    v_lines := '[]'::jsonb;

    for v_item in select * from jsonb_array_elements(coalesce(v_group->'items', '[]'::jsonb)) loop
      v_qty := coalesce((v_item->>'qty')::int, 0);
      if v_qty <= 0 or v_qty > 99 then
        return jsonb_build_object('ok', false, 'error', 'Invalid quantity in cart.');
      end if;

      select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

      if v_product is null or v_product.shop_id <> v_shop.id or v_product.archived then
        return jsonb_build_object('ok', false, 'error', 'A product in your cart is no longer available.');
      end if;
      if v_product.expiry is not null and v_product.expiry < current_date then
        return jsonb_build_object('ok', false, 'error', v_product.name || ' has expired and cannot be sold.');
      end if;
      if v_product.stock < v_qty then
        return jsonb_build_object('ok', false, 'error',
          'Only ' || v_product.stock || ' of ' || v_product.name || ' remain in stock.');
      end if;

      -- Active deal price, otherwise shelf price. Never trust client prices.
      v_price := case
        when v_product.deal_price is not null
          and (v_product.deal_expires_at is null or v_product.deal_expires_at > now())
          and v_product.deal_price > 0
          and v_product.deal_price <= v_product.price
        then v_product.deal_price
        else v_product.price
      end;

      v_subtotal := v_subtotal + (v_price * v_qty);
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'product_id', v_product.id,
        'name', v_product.name,
        'unit', v_product.unit,
        'price', v_price,
        'mrp', v_product.mrp,
        'qty', v_qty,
        'subtotal', v_price * v_qty,
        'category_id', v_product.category_id
      ));
    end loop;

    if jsonb_array_length(v_lines) = 0 then
      return jsonb_build_object('ok', false, 'error', 'A shop in your cart has no items.');
    end if;

    if v_fulfilment = 'pickup' then
      v_delivery_fee := 0;
    else
      v_delivery_fee := case
        when v_shop.distance_km <= v_rule.near_distance_km then v_rule.delivery_fee_near
        else v_rule.delivery_fee_far
      end;
    end if;

    v_commission := round((v_subtotal * v_shop.commission_pct) / 100, 2);
    v_delivery_total := v_delivery_total + v_delivery_fee;
    v_item_subtotal := v_item_subtotal + v_subtotal;
    v_count := v_count + 1;

    v_groups := v_groups || jsonb_build_array(jsonb_build_object(
      'shop_id', v_shop.id,
      'shop_name', v_shop.name,
      'shop_town', v_shop.town,
      'shop_address', v_shop.address,
      'fulfilment', v_fulfilment,
      'items', v_lines,
      'subtotal', v_subtotal,
      'delivery_fee', v_delivery_fee,
      'commission_pct', v_shop.commission_pct,
      'commission_amount', v_commission,
      'estimated_mins', v_shop.prep_time_mins + 12 + round(v_shop.distance_km * 4)
    ));
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'Your cart is empty.');
  end if;

  -- Platform fee is waived strictly above the threshold. Exactly the
  -- threshold still pays the fee.
  v_platform_fee := case when v_item_subtotal > v_rule.free_fee_above then 0 else v_rule.platform_fee end;

  return jsonb_build_object(
    'ok', true,
    'groups', v_groups,
    'item_subtotal', v_item_subtotal,
    'platform_fee', v_platform_fee,
    'delivery_total', v_delivery_total,
    'discount', 0,
    'grand_total', v_item_subtotal + v_platform_fee + v_delivery_total,
    'amount', v_item_subtotal + v_platform_fee + v_delivery_total,
    'fee_rule_version', v_rule.version,
    'cod_enabled', v_rule.cod_enabled,
    'cod_max_amount', v_rule.cod_max_amount,
    'pickup_only_prepaid', v_rule.pickup_only_prepaid
  );
end $$;

-- ---------- Internal: create orders from a priced payload ----------
create or replace function public.create_orders_from_payload(
  p_payload jsonb,
  p_buyer_id uuid,
  p_method payment_method,
  p_intent_id uuid default null,
  p_payment_ref text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_quote jsonb;
  v_group jsonb;
  v_item jsonb;
  v_rule record;
  v_checkout_id text;
  v_shop_order_id text;
  v_job_id text;
  v_buyer record;
  v_address jsonb := p_payload->'address';
  v_shop record;
  v_delivery record;
  v_payout numeric(8,2);
  v_distance numeric(5,2);
  v_cod_amount numeric(10,2);
  v_cod_enabled boolean;
  v_cod_max numeric(10,2);
  v_pickup_prepaid boolean;
  v_prepaid boolean := p_method = 'upi';
  v_platform_fee numeric(10,2);
  v_item_subtotal numeric(10,2);
  v_delivery_total numeric(10,2);
  v_grand_total numeric(10,2);
  v_all_cod boolean;
  v_has_pickup boolean;
  v_group_index int := 0;
begin
  select * into v_buyer from public.profiles where id = p_buyer_id;
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'Buyer profile not found.');
  end if;

  v_quote := public.compute_checkout(p_payload);
  if not (v_quote->>'ok')::boolean then
    return v_quote;
  end if;

  select * into v_rule from public.fee_rules where is_active order by version desc limit 1;
  v_platform_fee := (v_quote->>'platform_fee')::numeric;
  v_item_subtotal := (v_quote->>'item_subtotal')::numeric;
  v_delivery_total := (v_quote->>'delivery_total')::numeric;
  v_grand_total := (v_quote->>'grand_total')::numeric;
  v_cod_enabled := (v_quote->>'cod_enabled')::boolean;
  v_cod_max := (v_quote->>'cod_max_amount')::numeric;
  v_pickup_prepaid := (v_quote->>'pickup_only_prepaid')::boolean;

  v_has_pickup := exists (
    select 1 from jsonb_array_elements(v_quote->'groups') g
    where (g->>'fulfilment') = 'pickup'
  );

  if p_method = 'cod' then
    if not v_cod_enabled then
      return jsonb_build_object('ok', false, 'error', 'Cash on delivery is currently disabled.');
    end if;
    if v_pickup_prepaid and v_has_pickup then
      return jsonb_build_object('ok', false, 'error', 'Pickup orders must be prepaid.');
    end if;
    if v_grand_total > v_cod_max then
      return jsonb_build_object('ok', false, 'error', 'This order exceeds the COD limit of ₹' || v_cod_max || '.');
    end if;
  elsif p_payment_ref is null then
    return jsonb_build_object('ok', false, 'error', 'A verified payment reference is required.');
  end if;

  v_checkout_id := 'LZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_cod_amount := case when p_method = 'cod' then v_grand_total else 0 end;

  insert into public.checkouts (
    id, buyer_id, buyer_name, buyer_phone, buyer_email, address_snapshot,
    item_subtotal, platform_fee, delivery_total, discount, grand_total,
    cod_amount, payment_method, payment_status, fee_rule_version, note,
    intent_id, paid_at, is_demo
  ) values (
    v_checkout_id, p_buyer_id, v_buyer.name, v_buyer.phone, v_buyer.email, v_address,
    v_item_subtotal, v_platform_fee, v_delivery_total, 0, v_grand_total,
    v_cod_amount, p_method,
    case when v_prepaid then 'captured'::payment_status else 'pending'::payment_status end,
    v_rule.version, p_payload->>'note', p_intent_id,
    case when v_prepaid then now() else null end, false
  );

  for v_group in select * from jsonb_array_elements(v_quote->'groups') loop
    v_group_index := v_group_index + 1;
    v_shop_order_id := 'SO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    select * into v_shop from public.shops where id = (v_group->>'shop_id')::uuid;

    insert into public.shop_orders (
      id, checkout_id, shop_id, shop_name, shop_town, subtotal, fulfilment,
      delivery_fee, commission_pct, commission_amount, status, payment_method,
      cod_amount, buyer_id, estimated_mins, status_history, note
    ) values (
      v_shop_order_id, v_checkout_id, (v_group->>'shop_id')::uuid,
      v_group->>'shop_name', v_group->>'shop_town', (v_group->>'subtotal')::numeric,
      (v_group->>'fulfilment')::fulfilment_type, (v_group->>'delivery_fee')::numeric,
      (v_group->>'commission_pct')::numeric, (v_group->>'commission_amount')::numeric,
      'placed', p_method,
      case when p_method = 'cod' then
        (v_group->>'subtotal')::numeric + (v_group->>'delivery_fee')::numeric
        + case when v_group_index = 1 then v_platform_fee else 0 end
      else 0 end,
      p_buyer_id, (v_group->>'estimated_mins')::int,
      jsonb_build_array(jsonb_build_object('status', 'placed', 'at', now())),
      p_payload->>'note'
    );

    for v_item in select * from jsonb_array_elements(v_group->'items') loop
      insert into public.order_items (
        shop_order_id, product_id, name, unit, price, mrp, qty, subtotal, category_id
      ) values (
        v_shop_order_id, (v_item->>'product_id')::uuid, v_item->>'name', v_item->>'unit',
        (v_item->>'price')::numeric, (v_item->>'mrp')::numeric, (v_item->>'qty')::int,
        (v_item->>'subtotal')::numeric, v_item->>'category_id'
      );

      update public.products
      set stock = stock - (v_item->>'qty')::int,
          in_stock = (stock - (v_item->>'qty')::int) > 0,
          stock_updated_at = now()
      where id = (v_item->>'product_id')::uuid;
    end loop;

    insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
    values (v_shop_order_id, 'placed', p_buyer_id, 'buyer', 'Order placed');

    -- Delivery job for delivery shop-orders only.
    if (v_group->>'fulfilment') = 'delivery' then
      select * into v_delivery from public.deliveries
      where shop_order_id = v_shop_order_id limit 1;

      if v_delivery is null then
        v_distance := coalesce(v_shop.distance_km, 1.0) + 0.6;
        select payout into v_payout from public.delivery_tiers
        where active and max_km >= v_distance order by max_km asc limit 1;
        v_payout := coalesce(v_payout, 30);

        v_job_id := 'JOB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

        insert into public.deliveries (
          id, checkout_id, shop_order_id, shop_id, shop_name, pickup_address,
          drop_address, customer_name, customer_phone, distance_km, payout,
          cod_amount, item_count, status, delivery_fee, pickup_note, drop_note
        ) values (
          v_job_id, v_checkout_id, v_shop_order_id, v_shop.id, v_shop.name,
          v_shop.address || ', ' || v_shop.town,
          concat_ws(', ', v_address->>'line1', nullif(v_address->>'village',''), v_address->>'town', v_address->>'pincode'),
          v_buyer.name, v_buyer.phone, round(v_distance, 1), v_payout,
          case when p_method = 'cod' then
            (v_group->>'subtotal')::numeric + (v_group->>'delivery_fee')::numeric
          else 0 end,
          (select coalesce(sum((i->>'qty')::int), 0) from jsonb_array_elements(v_group->'items') i),
          'available', (v_group->>'delivery_fee')::numeric,
          'Collect the sealed packet and verify the order ID at the counter.',
          'Call the customer on arrival and collect payment if this is a COD order.'
        );
      end if;
    end if;

    -- Notify the shop owner.
    if v_shop.owner_id is not null then
      insert into public.notifications (profile_id, title, body, kind, data)
      values (
        v_shop.owner_id, 'New order received',
        v_group->>'shop_name' || ' · order ' || v_shop_order_id,
        'order', jsonb_build_object('shop_order_id', v_shop_order_id)
      );
    end if;
  end loop;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description, metadata)
  values (
    v_buyer.name, 'buyer', 'Order placed', 'order', v_checkout_id, v_checkout_id,
    'Placed a multi-shop order worth ₹' || v_grand_total || ' via ' || upper(p_method::text) || '.',
    jsonb_build_object('checkout_id', v_checkout_id, 'method', p_method, 'payment_ref', p_payment_ref)
  );

  insert into public.notifications (profile_id, title, body, kind, data)
  values (
    p_buyer_id, 'Order confirmed',
    'Your order ' || v_checkout_id || ' was placed successfully.',
    'order', jsonb_build_object('checkout_id', v_checkout_id)
  );

  -- Server-side cart cleanup.
  delete from public.carts where buyer_id = p_buyer_id;

  return jsonb_build_object('ok', true, 'checkout_id', v_checkout_id, 'amount', v_grand_total);
end $$;

-- ---------- Buyer: create a prepaid intent ----------
create or replace function public.create_checkout_intent(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
  v_quote jsonb;
  v_intent uuid;
  v_method payment_method := coalesce((p_payload->>'payment_method')::payment_method, 'upi');
begin
  if v_profile is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in to continue.');
  end if;

  v_quote := public.compute_checkout(p_payload);
  if not (v_quote->>'ok')::boolean then
    return v_quote;
  end if;

  insert into public.checkout_intents (buyer_id, payload, amount, payment_method)
  values (v_profile, p_payload, (v_quote->>'amount')::numeric, v_method)
  returning id into v_intent;

  return jsonb_build_object(
    'ok', true,
    'intent_id', v_intent,
    'amount', (v_quote->>'amount')::numeric,
    'quote', v_quote
  );
end $$;

-- ---------- COD checkout (authenticated, atomic) ----------
create or replace function public.finalize_cod_checkout(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
begin
  if v_profile is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in to continue.');
  end if;
  return public.create_orders_from_payload(p_payload, v_profile, 'cod');
end $$;

-- ---------- Gateway: mark intent paid (service role only) ----------
create or replace function public.mark_intent_paid(
  p_intent_id uuid,
  p_gateway_order_id text,
  p_gateway_payment_id text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  update public.checkout_intents
  set status = 'paid', gateway_order_id = p_gateway_order_id
  where id = p_intent_id and status = 'created';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment intent is not open.');
  end if;

  insert into public.payments (
    id, checkout_id, intent_id, gateway, gateway_order_id, gateway_payment_id, amount, status
  )
  select
    'PAY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    null, p_intent_id, 'razorpay', p_gateway_order_id, p_gateway_payment_id, amount, 'captured'
  from public.checkout_intents where id = p_intent_id;

  return jsonb_build_object('ok', true);
end $$;

-- ---------- Gateway: finalize verified payment (service role only) ----------
create or replace function public.finalize_checkout(
  p_intent_id uuid,
  p_payment_ref text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_intent record;
  v_quote jsonb;
begin
  select * into v_intent from public.checkout_intents where id = p_intent_id for update;
  if v_intent is null then
    return jsonb_build_object('ok', false, 'error', 'Unknown payment intent.');
  end if;
  if v_intent.status = 'consumed' then
    return jsonb_build_object('ok', false, 'error', 'This payment was already used.');
  end if;
  if v_intent.status <> 'paid' then
    return jsonb_build_object('ok', false, 'error', 'Payment has not been verified.');
  end if;

  v_quote := public.compute_checkout(v_intent.payload);
  if not (v_quote->>'ok')::boolean then
    return v_quote;
  end if;
  if (v_quote->>'amount')::numeric <> v_intent.amount then
    return jsonb_build_object('ok', false, 'error', 'Cart prices changed after payment. Please contact support for a refund and retry.');
  end if;

  update public.checkout_intents set status = 'consumed' where id = p_intent_id;

  return public.create_orders_from_payload(
    v_intent.payload, v_intent.buyer_id, v_intent.payment_method, v_intent.id, p_payment_ref
  );
end $$;

-- ---------- Product CRUD (kept as RPC so validation is central) ----------
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
language plpgsql security definer set search_path = public
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

  if p_product_id is null then
    insert into public.products (
      shop_id, name, category_id, unit, price, mrp, stock, in_stock,
      expiry, description, tags, image_url
    ) values (
      p_shop_id, p_name, p_category_id, p_unit, p_price, p_mrp, p_stock, p_stock > 0,
      p_expiry, coalesce(p_description, ''), coalesce(p_tags, '{}'), p_image_url
    ) returning id into v_id;
  else
    update public.products set
      name = p_name, category_id = p_category_id, unit = p_unit, price = p_price,
      mrp = p_mrp, stock = p_stock, in_stock = p_stock > 0, expiry = p_expiry,
      description = coalesce(p_description, ''), tags = coalesce(p_tags, '{}'),
      image_url = p_image_url, stock_updated_at = now()
    where id = p_product_id and shop_id = p_shop_id
    returning id into v_id;
  end if;

  return jsonb_build_object('ok', true, 'product_id', v_id);
end $$;

-- ---------- Order transitions ----------
create or replace function public.transition_shop_order(
  p_shop_order_id text,
  p_status order_status,
  p_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_shop record;
  v_actor uuid := public.current_profile_id();
  v_role user_role := public.current_role();
  v_is_shop boolean;
  v_is_buyer boolean;
  v_allowed boolean := false;
  v_job record;
  v_refund numeric(10,2) := 0;
  v_any_live boolean;
  v_event_note text;
begin
  select * into v_order from public.shop_orders where id = p_shop_order_id for update;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found.');
  end if;

  select * into v_shop from public.shops where id = v_order.shop_id;
  v_is_shop := v_shop.owner_id = v_actor;
  v_is_buyer := v_order.buyer_id = v_actor;

  if public.is_admin() then
    v_allowed := true;
  elsif v_is_buyer then
    v_allowed := p_status in ('cancelled') and v_order.status in ('placed','accepted');
  elsif v_is_shop then
    v_allowed :=
      (v_order.status = 'placed' and p_status in ('accepted','rejected')) or
      (v_order.status = 'accepted' and p_status in ('preparing','rejected')) or
      (v_order.status = 'preparing' and p_status in ('ready','rejected')) or
      (v_order.status = 'ready' and p_status = 'delivered' and v_order.fulfilment = 'pickup');
  end if;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'error', 'This status change is not permitted.');
  end if;

  -- Delivery orders become delivered through the rider flow, not the shop.
  if p_status = 'delivered' and v_order.fulfilment = 'delivery' and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Delivery orders are completed by the assigned rider.');
  end if;

  -- Restore stock and record a refund on rejection/cancellation.
  if p_status in ('rejected','cancelled') then
    update public.products p
    set stock = p.stock + oi.qty,
        in_stock = true,
        stock_updated_at = now()
    from (
      select product_id, sum(qty)::int as qty
      from public.order_items
      where shop_order_id = p_shop_order_id and product_id is not null
      group by product_id
    ) oi
    where p.id = oi.product_id;

    update public.shop_orders
    set commission_amount = 0, status = p_status,
        rejection_reason = coalesce(p_reason, rejection_reason),
        cancelled_at = now(),
        status_history = status_history || jsonb_build_array(jsonb_build_object(
          'status', p_status, 'at', now(), 'note', p_reason
        ))
    where id = p_shop_order_id;

    if v_order.payment_method = 'upi' then
      v_refund := v_order.subtotal + v_order.delivery_fee;
      insert into public.refunds (checkout_id, shop_order_id, amount, reason)
      values (v_order.checkout_id, p_shop_order_id, v_refund, coalesce(p_reason, 'Order ' || p_status));
    end if;

    select exists (
      select 1 from public.shop_orders
      where checkout_id = v_order.checkout_id and status not in ('cancelled','rejected')
    ) into v_any_live;

    if not v_any_live then
      update public.checkouts
      set payment_status = case when payment_method = 'upi' then 'refunded' else payment_status end
      where id = v_order.checkout_id;
    end if;

    update public.deliveries set status = 'cancelled'
    where shop_order_id = p_shop_order_id and status in ('available','accepted');
  else
    update public.shop_orders
    set status = p_status,
        rejection_reason = case when p_status = 'rejected' then p_reason else rejection_reason end,
        status_history = status_history || jsonb_build_array(jsonb_build_object(
          'status', p_status, 'at', now(), 'note', p_reason
        ))
    where id = p_shop_order_id;
  end if;

  insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
  values (p_shop_order_id, p_status, v_actor, coalesce(v_role::text, 'system'), p_reason);

  -- Create the delivery job as soon as a delivery order is ready.
  if p_status = 'ready' and v_order.fulfilment = 'delivery' then
    select * into v_job from public.deliveries where shop_order_id = p_shop_order_id limit 1;
    if v_job is null then
      insert into public.deliveries (
        id, checkout_id, shop_order_id, shop_id, shop_name, pickup_address,
        drop_address, customer_name, customer_phone, distance_km, payout,
        cod_amount, item_count, status, delivery_fee
      )
      select
        'JOB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        v_order.checkout_id, v_order.id, v_shop.id, v_shop.name,
        v_shop.address || ', ' || v_shop.town,
        concat_ws(', ', c.address_snapshot->>'line1', nullif(c.address_snapshot->>'village',''),
                  c.address_snapshot->>'town', c.address_snapshot->>'pincode'),
        c.buyer_name, c.buyer_phone,
        round(coalesce(v_shop.distance_km, 1.0) + 0.6, 1),
        coalesce((select payout from public.delivery_tiers where active and max_km >= coalesce(v_shop.distance_km, 1.0) + 0.6 order by max_km asc limit 1), 30),
        v_order.cod_amount,
        (select coalesce(sum(qty),0)::int from public.order_items where shop_order_id = v_order.id),
        'available', v_order.delivery_fee
      from public.checkouts c where c.id = v_order.checkout_id;
    end if;
  end if;

  v_event_note := case
    when p_status = 'rejected' then 'Order rejected: ' || coalesce(p_reason, 'no reason given')
    when p_status = 'cancelled' then 'Order cancelled: ' || coalesce(p_reason, 'no reason given')
    else 'Order marked ' || p_status::text
  end;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description, metadata)
  values (
    coalesce((select name from public.profiles where id = v_actor), 'System'),
    coalesce(v_role::text, 'system'),
    'Order ' || p_status::text, 'order', p_shop_order_id, v_order.checkout_id,
    v_event_note || ' · ' || v_order.shop_name,
    jsonb_build_object('shop_order_id', p_shop_order_id, 'status', p_status, 'reason', p_reason, 'refund', v_refund)
  );

  if v_order.buyer_id is not null then
    insert into public.notifications (profile_id, title, body, kind, data)
    values (
      v_order.buyer_id,
      case when p_status = 'ready' then 'Order ready' when p_status in ('rejected','cancelled') then 'Order update' else 'Order update' end,
      v_order.shop_name || ' · ' || v_event_note,
      'order', jsonb_build_object('checkout_id', v_order.checkout_id, 'status', p_status)
    );
  end if;

  return jsonb_build_object('ok', true, 'status', p_status, 'refund', v_refund);
end $$;

-- ---------- Substitutions ----------
create or replace function public.propose_substitution(
  p_shop_order_id text,
  p_original_product_id uuid,
  p_substitute_product_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_sub record;
  v_orig record;
begin
  select * into v_order from public.shop_orders where id = p_shop_order_id for update;
  if v_order is null then return jsonb_build_object('ok', false, 'error', 'Order not found.'); end if;
  if not (public.owns_shop(v_order.shop_id) or public.is_admin()) then
    return jsonb_build_object('ok', false, 'error', 'Not your order.');
  end if;
  if v_order.status not in ('placed','accepted','preparing') then
    return jsonb_build_object('ok', false, 'error', 'Substitutions are closed for this order.');
  end if;

  select oi.id, oi.product_id, oi.price, oi.qty, p.name into v_orig
  from public.order_items oi join public.products p on p.id = oi.product_id
  where oi.shop_order_id = p_shop_order_id and oi.product_id = p_original_product_id limit 1;

  select * into v_sub from public.products where id = p_substitute_product_id;
  if v_sub is null or v_sub.shop_id <> v_order.shop_id or v_sub.archived then
    return jsonb_build_object('ok', false, 'error', 'Substitute product is unavailable.');
  end if;
  if v_sub.stock < 1 or (v_sub.expiry is not null and v_sub.expiry < current_date) then
    return jsonb_build_object('ok', false, 'error', 'Substitute is out of stock or expired.');
  end if;
  if v_orig.product_id is null then
    return jsonb_build_object('ok', false, 'error', 'Original item is no longer linked to a product.');
  end if;

  update public.shop_orders
  set substitution_proposed = jsonb_build_object(
        'original_product_id', p_original_product_id,
        'original_product_name', v_orig.name,
        'substitute_product_id', p_substitute_product_id,
        'substitute_product_name', v_sub.name,
        'substitute_price', v_sub.price,
        'status', 'pending',
        'proposed_at', now(),
        'note', p_note
      ),
      substitution_status = 'pending',
      substitution_note = p_note
  where id = p_shop_order_id;

  insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
  values (p_shop_order_id, v_order.status, public.current_profile_id(), 'shopkeeper',
          'Substitution proposed: ' || v_orig.name || ' → ' || v_sub.name);

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.respond_substitution(
  p_shop_order_id text,
  p_approved boolean
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_sub jsonb;
  v_orig record;
  v_new_subtotal numeric(10,2);
  v_delta numeric(10,2);
begin
  select * into v_order from public.shop_orders where id = p_shop_order_id for update;
  if v_order is null then return jsonb_build_object('ok', false, 'error', 'Order not found.'); end if;
  if v_order.buyer_id <> public.current_profile_id() then
    return jsonb_build_object('ok', false, 'error', 'Only the buyer can respond.');
  end if;
  v_sub := v_order.substitution_proposed;
  if v_sub is null or (v_sub->>'status') <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'No pending substitution.');
  end if;

  if not p_approved then
    update public.shop_orders
    set substitution_status = 'rejected',
        substitution_proposed = jsonb_set(v_sub, '{status}', '"rejected"')
    where id = p_shop_order_id;
    insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
    values (p_shop_order_id, v_order.status, public.current_profile_id(), 'buyer', 'Substitution rejected');
    return jsonb_build_object('ok', true, 'approved', false);
  end if;

  select * into v_orig from public.order_items
  where shop_order_id = p_shop_order_id
    and product_id = (v_sub->>'original_product_id')::uuid limit 1;
  if v_orig is null then return jsonb_build_object('ok', false, 'error', 'Original item missing.'); end if;

  -- The substitute can never cost more than the original without a new payment.
  if (v_sub->>'substitute_price')::numeric > v_orig.price then
    return jsonb_build_object('ok', false, 'error', 'Substitute costs more than the original. Reject it or ask the shop to propose a cheaper item.');
  end if;

  update public.order_items
  set product_id = (v_sub->>'substitute_product_id')::uuid,
      name = v_sub->>'substitute_product_name',
      price = (v_sub->>'substitute_price')::numeric,
      subtotal = (v_sub->>'substitute_price')::numeric * qty
  where id = v_orig.id;

  select coalesce(sum(subtotal),0) into v_new_subtotal
  from public.order_items where shop_order_id = p_shop_order_id;

  v_delta := v_new_subtotal - v_order.subtotal;

  update public.shop_orders
  set subtotal = v_new_subtotal,
      commission_amount = round((v_new_subtotal * commission_pct) / 100, 2),
      cod_amount = case when payment_method = 'cod' then cod_amount + v_delta else cod_amount end,
      substitution_status = 'approved',
      substitution_proposed = jsonb_set(v_sub, '{status}', '"approved"')
  where id = p_shop_order_id;

  update public.checkouts
  set item_subtotal = item_subtotal + v_delta,
      grand_total = grand_total + v_delta,
      cod_amount = case when payment_method = 'cod' then cod_amount + v_delta else cod_amount end
  where id = v_order.checkout_id;

  update public.deliveries
  set cod_amount = case when cod_amount > 0 then cod_amount + v_delta else cod_amount end
  where shop_order_id = p_shop_order_id;

  insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
  values (p_shop_order_id, v_order.status, public.current_profile_id(), 'buyer',
          'Substitution approved: ' || (v_sub->>'substitute_product_name'));

  return jsonb_build_object('ok', true, 'approved', true);
end $$;

-- ---------- Rider flow ----------
create or replace function public.set_rider_online(p_online boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_rider record;
begin
  select * into v_rider from public.riders where user_id = public.current_profile_id() limit 1;
  if v_rider is null then return jsonb_build_object('ok', false, 'error', 'Rider profile not found.'); end if;
  if v_rider.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Only approved riders can change availability.');
  end if;
  update public.riders set online = p_online where id = v_rider.id;
  return jsonb_build_object('ok', true, 'online', p_online);
end $$;

create or replace function public.accept_delivery(p_job_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rider record;
  v_job record;
begin
  select * into v_rider from public.riders where user_id = public.current_profile_id() limit 1;
  if v_rider is null or v_rider.status <> 'approved' or not v_rider.online then
    return jsonb_build_object('ok', false, 'error', 'Only approved, online riders can accept jobs.');
  end if;

  select * into v_job from public.deliveries where id = p_job_id for update;
  if v_job is null or v_job.status <> 'available' or v_job.rider_id is not null then
    return jsonb_build_object('ok', false, 'error', 'This job has already been taken.');
  end if;

  update public.deliveries
  set rider_id = v_rider.id, status = 'accepted', accepted_at = now()
  where id = p_job_id;

  update public.shop_orders set rider_id = v_rider.id where id = v_job.shop_order_id;

  insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
  select v_job.shop_order_id, status, public.current_profile_id(), 'rider', 'Delivery accepted'
  from public.shop_orders where id = v_job.shop_order_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values (v_rider.name, 'rider', 'Delivery job accepted', 'order', v_job.shop_order_id, v_job.checkout_id,
          'Accepted delivery for ' || v_job.shop_name || '.');

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pickup_delivery(p_job_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rider record;
  v_job record;
begin
  select * into v_rider from public.riders where user_id = public.current_profile_id() limit 1;
  select * into v_job from public.deliveries where id = p_job_id for update;
  if v_job is null or v_job.rider_id is distinct from v_rider.id then
    return jsonb_build_object('ok', false, 'error', 'This job is not assigned to you.');
  end if;
  if v_job.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'error', 'Job is not ready for pickup.');
  end if;

  update public.deliveries set status = 'picked_up', picked_up_at = now() where id = p_job_id;
  update public.shop_orders
  set status = 'picked_up',
      status_history = status_history || jsonb_build_array(jsonb_build_object('status','picked_up','at',now()))
  where id = v_job.shop_order_id;

  insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
  values (v_job.shop_order_id, 'picked_up', public.current_profile_id(), 'rider', 'Picked up from shop');

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.complete_delivery(p_job_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rider record;
  v_job record;
begin
  select * into v_rider from public.riders where user_id = public.current_profile_id() limit 1;
  select * into v_job from public.deliveries where id = p_job_id for update;
  if v_job is null or v_job.rider_id is distinct from v_rider.id then
    return jsonb_build_object('ok', false, 'error', 'This job is not assigned to you.');
  end if;
  if v_job.status <> 'picked_up' then
    return jsonb_build_object('ok', false, 'error', 'Pick up the order before completing it.');
  end if;

  update public.deliveries set status = 'delivered', delivered_at = now() where id = p_job_id;

  update public.shop_orders
  set status = 'delivered',
      status_history = status_history || jsonb_build_array(jsonb_build_object('status','delivered','at',now()))
  where id = v_job.shop_order_id;

  update public.riders
  set total_deliveries = total_deliveries + 1
  where id = v_rider.id;

  if v_job.cod_amount > 0 then
    insert into public.cod_ledger (
      delivery_id, order_id, shop_order_id, rider_id, shop_name, customer_name,
      expected_amount, collected_amount
    ) values (
      v_job.id, v_job.checkout_id, v_job.shop_order_id, v_rider.id, v_job.shop_name,
      v_job.customer_name, v_job.cod_amount, v_job.cod_amount
    );
  end if;

  insert into public.order_events (shop_order_id, status, actor_profile_id, actor_role, note)
  values (v_job.shop_order_id, 'delivered', public.current_profile_id(), 'rider', 'Delivered to customer');

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values (v_rider.name, 'rider', 'Delivery completed', 'order', v_job.shop_order_id, v_job.checkout_id,
          'Delivered to ' || v_job.customer_name || '. COD ₹' || v_job.cod_amount || '.');

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.record_cod_handover(
  p_entry_id uuid,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_entry record;
  v_rider record;
  v_variance numeric(10,2);
begin
  select * into v_rider from public.riders where user_id = public.current_profile_id() limit 1;
  select * into v_entry from public.cod_ledger where id = p_entry_id for update;
  if v_entry is null then return jsonb_build_object('ok', false, 'error', 'COD entry not found.'); end if;
  if v_entry.rider_id <> v_rider.id and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not your cash entry.');
  end if;
  if v_entry.status = 'handed_over' then
    return jsonb_build_object('ok', false, 'error', 'This entry is already settled.');
  end if;

  v_variance := p_amount - v_entry.expected_amount;

  update public.cod_ledger
  set handed_over_amount = p_amount,
      status = case when v_variance = 0 then 'handed_over'::cod_status else 'discrepancy'::cod_status end,
      discrepancy_note = case when v_variance = 0 then null else coalesce(p_note, 'Variance ₹' || v_variance) end,
      handed_over_at = now()
  where id = p_entry_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values (v_rider.name, 'rider',
          case when v_variance = 0 then 'COD handed over' else 'COD discrepancy flagged' end,
          'settlement', p_entry_id::text, v_entry.order_id,
          'Handed over ₹' || p_amount || ' against ₹' || v_entry.expected_amount || '.',
          jsonb_build_object('variance', v_variance, 'note', p_note));

  return jsonb_build_object('ok', true, 'variance', v_variance, 'discrepancy', v_variance <> 0);
end $$;

-- ---------- Admin actions ----------
create or replace function public.admin_set_shop_status(
  p_shop_id uuid, p_status shop_status, p_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_shop record;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  select * into v_shop from public.shops where id = p_shop_id;
  if v_shop is null then return jsonb_build_object('ok', false, 'error', 'Shop not found.'); end if;

  update public.shops
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then p_reason else null end
  where id = p_shop_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values (coalesce((select name from public.profiles where id = public.current_profile_id()), 'Admin'), 'admin',
          'Shop ' || p_status::text, 'shop', p_shop_id::text, v_shop.name,
          v_shop.name || ' marked ' || p_status::text || coalesce(' — ' || p_reason, ''));

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_set_rider_status(
  p_rider_id uuid, p_status rider_status, p_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_rider record;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  select * into v_rider from public.riders where id = p_rider_id;
  if v_rider is null then return jsonb_build_object('ok', false, 'error', 'Rider not found.'); end if;

  update public.riders
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then p_reason else null end,
      online = case when p_status = 'approved' then online else false end
  where id = p_rider_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values (coalesce((select name from public.profiles where id = public.current_profile_id()), 'Admin'), 'admin',
          'Rider ' || p_status::text, 'rider', p_rider_id::text, v_rider.name,
          v_rider.name || ' marked ' || p_status::text || coalesce(' — ' || p_reason, ''));

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.assign_delivery(p_job_id text, p_rider_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_job record; v_rider record;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  select * into v_job from public.deliveries where id = p_job_id for update;
  select * into v_rider from public.riders where id = p_rider_id;
  if v_job is null or v_rider is null then return jsonb_build_object('ok', false, 'error', 'Job or rider missing.'); end if;
  if v_rider.status <> 'approved' then return jsonb_build_object('ok', false, 'error', 'Rider is not approved.'); end if;
  if v_job.status <> 'available' then return jsonb_build_object('ok', false, 'error', 'Job is no longer available.'); end if;

  update public.deliveries
  set rider_id = p_rider_id, status = 'accepted', accepted_at = now()
  where id = p_job_id;
  update public.shop_orders set rider_id = p_rider_id where id = v_job.shop_order_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values ('Super Admin', 'admin', 'Delivery assigned', 'order', v_job.shop_order_id, v_job.checkout_id,
          'Assigned ' || v_rider.name || ' to ' || v_job.id || '.');

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.publish_fee_rules(
  p_platform_fee numeric,
  p_free_fee_above numeric,
  p_near_distance_km numeric,
  p_delivery_fee_near numeric,
  p_delivery_fee_far numeric,
  p_shop_commission_pct numeric,
  p_cod_enabled boolean,
  p_cod_max_amount numeric,
  p_pickup_only_prepaid boolean,
  p_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_version int;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;

  select coalesce(max(version), 0) + 1 into v_version from public.fee_rules;
  update public.fee_rules set is_active = false where is_active;

  insert into public.fee_rules (
    version, platform_fee, free_fee_above, near_distance_km, delivery_fee_near,
    delivery_fee_far, shop_commission_pct, cod_enabled, cod_max_amount,
    pickup_only_prepaid, is_active, updated_by
  ) values (
    v_version, p_platform_fee, p_free_fee_above, p_near_distance_km, p_delivery_fee_near,
    p_delivery_fee_far, p_shop_commission_pct, p_cod_enabled, p_cod_max_amount,
    p_pickup_only_prepaid, true,
    coalesce((select name from public.profiles where id = public.current_profile_id()), 'Super Admin')
  );

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description, metadata)
  values (
    coalesce((select name from public.profiles where id = public.current_profile_id()), 'Super Admin'),
    'admin', 'Fee policy updated', 'fee', 'v' || v_version, 'v' || v_version,
    coalesce(p_reason, 'Fee rules updated') || ' · Platform ₹' || p_platform_fee ||
      ', commission ' || p_shop_commission_pct || '%.',
    jsonb_build_object('version', v_version, 'platform_fee', p_platform_fee,
      'free_fee_above', p_free_fee_above, 'commission_pct', p_shop_commission_pct)
  );

  return jsonb_build_object('ok', true, 'version', v_version);
end $$;

-- ---------- Settlements ----------
create or replace function public.run_settlements()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_created int := 0;
  v_shop record;
  v_rider record;
  v_gross numeric(12,2);
  v_commission numeric(12,2);
  v_refunds numeric(12,2);
  v_cod numeric(12,2);
  v_payout numeric(12,2);
  v_period text;
  v_id text;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;

  v_period := to_char(now(), 'DD Mon YYYY');

  for v_shop in
    select * from public.shops s
    where exists (
      select 1 from public.shop_orders so
      where so.shop_id = s.id and so.status = 'delivered'
    )
    and not exists (
      select 1 from public.settlements st
      where st.party = 'shop' and st.party_id = s.id::text and st.status = 'pending'
    )
  loop
    select
      coalesce(sum(so.subtotal), 0),
      coalesce(sum(so.commission_amount), 0),
      coalesce((select sum(r.amount) from public.refunds r
        join public.shop_orders x on x.id = r.shop_order_id
        where x.shop_id = v_shop.id and r.status <> 'failed'), 0),
      coalesce(sum(case when so.payment_method = 'cod' then so.cod_amount else 0 end), 0)
    into v_gross, v_commission, v_refunds, v_cod
    from public.shop_orders so
    where so.shop_id = v_shop.id and so.status = 'delivered';

    v_payout := greatest(0, v_gross - v_commission - v_refunds);
    v_id := 'STL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.settlements (
      id, party, party_id, party_name, period, gross_sales, commission,
      refunds, cod_collected, payout, status
    ) values (
      v_id, 'shop', v_shop.id::text, v_shop.name, v_period, v_gross, v_commission,
      v_refunds, v_cod, v_payout, 'pending'
    );
    v_created := v_created + 1;
  end loop;

  for v_rider in
    select * from public.riders r
    where exists (
      select 1 from public.deliveries d
      where d.rider_id = r.id and d.status = 'delivered'
    )
    and not exists (
      select 1 from public.settlements st
      where st.party = 'rider' and st.party_id = r.id::text and st.status = 'pending'
    )
  loop
    select coalesce(sum(payout), 0) into v_payout
    from public.deliveries where rider_id = v_rider.id and status = 'delivered';

    if v_payout > 0 then
      v_id := 'STL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      insert into public.settlements (
        id, party, party_id, party_name, period, gross_sales, commission,
        refunds, cod_collected, payout, status
      ) values (
        v_id, 'rider', v_rider.id::text, v_rider.name, v_period, 0, 0, 0, 0, v_payout, 'pending'
      );
      v_created := v_created + 1;
    end if;
  end loop;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values ('Super Admin', 'admin', 'Settlement cycle run', 'settlement', v_period, v_period,
          'Generated ' || v_created || ' settlement statements.');

  return jsonb_build_object('ok', true, 'created', v_created);
end $$;

create or replace function public.mark_settlement_paid(p_settlement_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_row record;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  select * into v_row from public.settlements where id = p_settlement_id for update;
  if v_row is null then return jsonb_build_object('ok', false, 'error', 'Settlement not found.'); end if;
  if v_row.status = 'paid' then return jsonb_build_object('ok', false, 'error', 'Already paid.'); end if;

  update public.settlements set status = 'paid', paid_at = now(), updated_at = now()
  where id = p_settlement_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values ('Super Admin', 'admin', 'Settlement paid', 'settlement', p_settlement_id, v_row.party_name,
          'Paid ₹' || v_row.payout || ' to ' || v_row.party_name || '.');

  return jsonb_build_object('ok', true);
end $$;

-- ---------- Audit helper ----------
create or replace function public.log_activity(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_target_label text,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_profile record;
begin
  select * into v_profile from public.profiles where id = public.current_profile_id();
  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description, metadata)
  values (
    coalesce(v_profile.name, 'System'), coalesce(v_profile.role::text, 'system'),
    p_action, p_target_type, p_target_id, p_target_label, p_description, p_metadata
  );
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Privileges ----------
grant execute on function public.create_checkout_intent(jsonb) to authenticated;
grant execute on function public.finalize_cod_checkout(jsonb) to authenticated;
grant execute on function public.transition_shop_order(text, order_status, text) to authenticated;
grant execute on function public.propose_substitution(text, uuid, uuid, text) to authenticated;
grant execute on function public.respond_substitution(text, boolean) to authenticated;
grant execute on function public.set_rider_online(boolean) to authenticated;
grant execute on function public.accept_delivery(text) to authenticated;
grant execute on function public.pickup_delivery(text) to authenticated;
grant execute on function public.complete_delivery(text) to authenticated;
grant execute on function public.record_cod_handover(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_shop_status(uuid, shop_status, text) to authenticated;
grant execute on function public.admin_set_rider_status(uuid, rider_status, text) to authenticated;
grant execute on function public.assign_delivery(text, uuid) to authenticated;
grant execute on function public.publish_fee_rules(numeric,numeric,numeric,numeric,numeric,numeric,boolean,numeric,boolean,text) to authenticated;
grant execute on function public.run_settlements() to authenticated;
grant execute on function public.mark_settlement_paid(text) to authenticated;
grant execute on function public.log_activity(text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.upsert_product(uuid,uuid,text,text,text,numeric,numeric,int,date,text,text[],text) to authenticated;

-- Gateway-only RPCs. These are intentionally not callable by normal users.
revoke execute on function public.mark_intent_paid(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.finalize_checkout(uuid, text) from public, anon, authenticated;
revoke execute on function public.create_orders_from_payload(jsonb, uuid, payment_method, uuid, text) from public, anon, authenticated;
revoke execute on function public.compute_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.mark_intent_paid(uuid, text, text) to service_role;
grant execute on function public.finalize_checkout(uuid, text) to service_role;
grant execute on function public.create_orders_from_payload(jsonb, uuid, payment_method, uuid, text) to service_role;
