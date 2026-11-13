-- Fix recursive RLS checks between checkouts and shop_orders.
-- These SECURITY DEFINER helpers read through the relationship without
-- re-entering the policies that call them.

create or replace function public.can_view_checkout(p_checkout_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.checkouts c
    where c.id = p_checkout_id
      and (
        c.buyer_id = public.current_profile_id()
        or public.is_admin()
        or exists (
          select 1
          from public.shop_orders so
          where so.checkout_id = c.id
            and (
              public.owns_shop(so.shop_id)
              or so.rider_id = public.current_rider_id()
            )
        )
      )
  );
$$;

create or replace function public.can_view_shop_order(p_shop_order_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.shop_orders so
    where so.id = p_shop_order_id
      and (
        so.buyer_id = public.current_profile_id()
        or public.is_admin()
        or public.owns_shop(so.shop_id)
        or so.rider_id = public.current_rider_id()
        or exists (
          select 1
          from public.checkouts c
          where c.id = so.checkout_id
            and c.buyer_id = public.current_profile_id()
        )
      )
  );
$$;

drop policy if exists checkouts_select on public.checkouts;
create policy checkouts_select on public.checkouts for select
  using (public.can_view_checkout(id));

drop policy if exists shop_orders_select on public.shop_orders;
create policy shop_orders_select on public.shop_orders for select
  using (public.can_view_shop_order(id));

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (public.can_view_shop_order(shop_order_id));

drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events for select
  using (public.can_view_shop_order(shop_order_id));

drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select on public.deliveries for select
  using (
    public.is_admin()
    or rider_id = public.current_rider_id()
    or (
      status = 'available'
      and exists (
        select 1
        from public.riders r
        where r.id = public.current_rider_id()
          and r.status = 'approved'
          and r.online
      )
    )
    or public.can_view_shop_order(shop_order_id)
  );

grant execute on function public.can_view_checkout(text) to authenticated;
grant execute on function public.can_view_shop_order(text) to authenticated;
