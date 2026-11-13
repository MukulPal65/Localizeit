-- ============================================================
-- LocalizeIt · Production hardening migration
-- Replaces the permissive prototype RLS with strict policies,
-- adds the tables the real product needs, and installs helpers.
-- ============================================================

-- ---------- 0. Remove every permissive prototype policy ----------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------- 1. Extend existing tables ----------
alter table public.profiles
  add column if not exists suspended boolean not null default false;

alter table public.shops
  add column if not exists opening_hours text not null default '8:00 AM – 9:00 PM',
  add column if not exists banner_url text;

alter table public.riders
  add column if not exists auth_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_profiles_auth_id on public.profiles(auth_id) where auth_id is not null;
create unique index if not exists idx_riders_user_id on public.riders(user_id) where user_id is not null;

alter table public.checkouts
  add column if not exists intent_id uuid,
  add column if not exists paid_at timestamptz,
  add column if not exists buyer_email text;

alter table public.shop_orders
  add column if not exists buyer_id uuid references public.profiles(id) on delete set null,
  add column if not exists substitution_note text,
  add column if not exists cancelled_at timestamptz;

alter table public.deliveries
  add column if not exists delivery_fee numeric(10,2) not null default 0;

alter table public.cod_ledger
  add column if not exists shop_order_id text;

alter table public.settlements
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists note text;

alter table public.payments
  alter column checkout_id drop not null,
  add column if not exists intent_id uuid references public.checkout_intents(id) on delete set null;

-- One delivery job per shop order
create unique index if not exists idx_deliveries_shop_order_unique
  on public.deliveries(shop_order_id);

-- ---------- 2. New tables ----------
create table if not exists public.service_areas (
  id text primary key,
  state text not null,
  district text not null,
  town text not null,
  village text not null default '',
  pincode text not null,
  serviceability text not null check (serviceability in ('full','pickup','none')),
  delivery_eta_mins int not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_areas_pincode on public.service_areas(pincode);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  fulfilment fulfilment_type not null default 'delivery',
  updated_at timestamptz not null default now(),
  unique (buyer_id, shop_id)
);

create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty int not null check (qty > 0 and qty <= 99),
  added_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null,
  amount numeric(10,2) not null check (amount >= 0),
  payment_method payment_method not null default 'upi',
  status text not null default 'created' check (status in ('created','paid','consumed','failed','expired')),
  gateway_order_id text,
  checkout_id text references public.checkouts(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create index if not exists idx_checkout_intents_buyer on public.checkout_intents(buyer_id);

create table if not exists public.delivery_tiers (
  id uuid primary key default gen_random_uuid(),
  max_km numeric(5,2) not null unique check (max_km > 0),
  payout numeric(8,2) not null check (payout >= 0),
  active boolean not null default true
);

create table if not exists public.delivery_offers (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.deliveries(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  status text not null default 'offered' check (status in ('offered','accepted','declined','expired')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (job_id, rider_id)
);

create table if not exists public.order_events (
  id bigserial primary key,
  shop_order_id text not null references public.shop_orders(id) on delete cascade,
  status order_status,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'system',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_events_order on public.order_events(shop_order_id, created_at);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  checkout_id text not null references public.checkouts(id) on delete cascade,
  shop_order_id text references public.shop_orders(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  gateway_refund_id text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  checkout_id text not null references public.checkouts(id) on delete cascade,
  shop_order_id text references public.shop_orders(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete cascade,
  rider_id uuid references public.riders(id) on delete set null,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'order',
  read boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_profile on public.notifications(profile_id, read);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  deal_price numeric(10,2) not null check (deal_price > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade unique,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  note text not null,
  remind_at timestamptz not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.search_logs (
  id bigserial primary key,
  buyer_id uuid references public.profiles(id) on delete set null,
  query text not null,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 3. Helper functions (SECURITY DEFINER, bounded search_path) ----------
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.profiles where auth_id = auth.uid() limit 1;
$$;

create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where auth_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'admin' and not suspended from public.profiles where auth_id = auth.uid() limit 1), false);
$$;

create or replace function public.owns_shop(p_shop_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.shops
    where id = p_shop_id and owner_id = public.current_profile_id()
  );
$$;

create or replace function public.current_rider_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.riders where user_id = public.current_profile_id() limit 1;
$$;

-- ---------- 4. RLS ----------
alter table public.service_areas enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.checkout_intents enable row level security;
alter table public.delivery_tiers enable row level security;
alter table public.delivery_offers enable row level security;
alter table public.order_events enable row level security;
alter table public.refunds enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;
alter table public.deals enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.reminders enable row level security;
alter table public.search_logs enable row level security;

-- Profiles: only the owner and admins.
create policy profiles_select on public.profiles for select
  using (auth_id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert
  with check (auth_id = auth.uid() and role in ('buyer','shopkeeper','rider'));
create policy profiles_update on public.profiles for update
  using (auth_id = auth.uid() or public.is_admin())
  with check (auth_id = auth.uid() or public.is_admin());

-- Addresses: owner and admins.
create policy addresses_select on public.addresses for select
  using (user_id = public.current_profile_id() or public.is_admin());
create policy addresses_insert on public.addresses for insert
  with check (user_id = public.current_profile_id());
create policy addresses_update on public.addresses for update
  using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy addresses_delete on public.addresses for delete
  using (user_id = public.current_profile_id() or public.is_admin());

-- Reference data.
create policy categories_read on public.categories for select using (true);
create policy categories_admin on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy areas_read on public.service_areas for select using (true);
create policy areas_admin on public.service_areas for all
  using (public.is_admin()) with check (public.is_admin());

create policy tiers_read on public.delivery_tiers for select using (true);
create policy tiers_admin on public.delivery_tiers for all
  using (public.is_admin()) with check (public.is_admin());

-- Shops: approved shops public; owners see their own; admins everything.
create policy shops_select on public.shops for select
  using (status = 'approved' or owner_id = public.current_profile_id() or public.is_admin());
create policy shops_insert on public.shops for insert
  with check (owner_id = public.current_profile_id() and status = 'pending');
create policy shops_update on public.shops for update
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());
create policy shops_delete on public.shops for delete using (public.is_admin());

-- Products: visible for approved shops; owners and admins manage.
create policy products_select on public.products for select
  using (
    public.is_admin()
    or public.owns_shop(shop_id)
    or exists (select 1 from public.shops s where s.id = shop_id and s.status = 'approved')
  );
create policy products_insert on public.products for insert
  with check (public.owns_shop(shop_id) or public.is_admin());
create policy products_update on public.products for update
  using (public.owns_shop(shop_id) or public.is_admin())
  with check (public.owns_shop(shop_id) or public.is_admin());
create policy products_delete on public.products for delete
  using (public.owns_shop(shop_id) or public.is_admin());

create policy deals_read on public.deals for select using (true);
create policy deals_write on public.deals for all
  using (public.owns_shop(shop_id) or public.is_admin())
  with check (public.owns_shop(shop_id) or public.is_admin());

-- Fee rules: everyone reads the active rule; admins manage versions.
create policy fees_read on public.fee_rules for select using (is_active or public.is_admin());
create policy fees_admin on public.fee_rules for all
  using (public.is_admin()) with check (public.is_admin());

-- Riders: owner and admins. Approved riders are visible to themselves only.
create policy riders_select on public.riders for select
  using (user_id = public.current_profile_id() or public.is_admin());
create policy riders_insert on public.riders for insert
  with check (user_id = public.current_profile_id() and status = 'pending');
create policy riders_update on public.riders for update
  using (user_id = public.current_profile_id() or public.is_admin())
  with check (user_id = public.current_profile_id() or public.is_admin());

-- Checkouts: buyer, participating shop, assigned rider, admin.
create policy checkouts_select on public.checkouts for select
  using (
    buyer_id = public.current_profile_id()
    or public.is_admin()
    or exists (
      select 1 from public.shop_orders so
      where so.checkout_id = checkouts.id
        and (
          public.owns_shop(so.shop_id)
          or so.rider_id = public.current_rider_id()
        )
    )
  );

create policy shop_orders_select on public.shop_orders for select
  using (
    buyer_id = public.current_profile_id()
    or public.is_admin()
    or public.owns_shop(shop_id)
    or rider_id = public.current_rider_id()
    or exists (
      select 1 from public.checkouts c
      where c.id = checkout_id and c.buyer_id = public.current_profile_id()
    )
  );

create policy order_items_select on public.order_items for select
  using (
    exists (
      select 1 from public.shop_orders so
      where so.id = shop_order_id
        and (
          so.buyer_id = public.current_profile_id()
          or public.is_admin()
          or public.owns_shop(so.shop_id)
          or so.rider_id = public.current_rider_id()
          or exists (
            select 1 from public.checkouts c
            where c.id = so.checkout_id and c.buyer_id = public.current_profile_id()
          )
        )
    )
  );

create policy order_events_select on public.order_events for select
  using (
    exists (
      select 1 from public.shop_orders so
      where so.id = shop_order_id
        and (
          so.buyer_id = public.current_profile_id()
          or public.is_admin()
          or public.owns_shop(so.shop_id)
          or so.rider_id = public.current_rider_id()
        )
    )
  );

-- Deliveries: approved riders see the pool; assigned rider, shop, buyer, admin see details.
create policy deliveries_select on public.deliveries for select
  using (
    public.is_admin()
    or rider_id = public.current_rider_id()
    or (status = 'available' and exists (
      select 1 from public.riders r
      where r.id = public.current_rider_id() and r.status = 'approved' and r.online
    ))
    or exists (
      select 1 from public.shop_orders so
      where so.id = shop_order_id
        and (public.owns_shop(so.shop_id) or so.buyer_id = public.current_profile_id())
    )
  );

create policy delivery_offers_select on public.delivery_offers for select
  using (rider_id = public.current_rider_id() or public.is_admin());

-- COD: rider owner and admin.
create policy cod_select on public.cod_ledger for select
  using (rider_id = public.current_rider_id() or public.is_admin());
create policy cod_update on public.cod_ledger for update
  using (rider_id = public.current_rider_id() or public.is_admin());

-- Settlements: party owner and admin.
create policy settlements_select on public.settlements for select
  using (
    public.is_admin()
    or (party = 'shop' and exists (
      select 1 from public.shops s where s.id::text = party_id and s.owner_id = public.current_profile_id()
    ))
    or (party = 'rider' and party_id = public.current_rider_id()::text)
  );
create policy settlements_admin_update on public.settlements for update
  using (public.is_admin()) with check (public.is_admin());

create policy payments_select on public.payments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.checkouts c
      where c.id = checkout_id and c.buyer_id = public.current_profile_id()
    )
  );

create policy audit_select on public.audit_logs for select using (public.is_admin());

-- Buyer-owned tables.
create policy carts_owner on public.carts for all
  using (buyer_id = public.current_profile_id()) with check (buyer_id = public.current_profile_id());
create policy cart_items_owner on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.buyer_id = public.current_profile_id()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.buyer_id = public.current_profile_id()));

create policy intents_owner on public.checkout_intents for all
  using (buyer_id = public.current_profile_id()) with check (buyer_id = public.current_profile_id());

create policy refunds_select on public.refunds for select
  using (
    public.is_admin()
    or exists (select 1 from public.checkouts c where c.id = checkout_id and c.buyer_id = public.current_profile_id())
  );

create policy ratings_select on public.ratings for select using (true);
create policy ratings_insert on public.ratings for insert
  with check (buyer_id = public.current_profile_id());

create policy notifications_owner on public.notifications for all
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create policy wishlists_owner on public.wishlists for all
  using (buyer_id = public.current_profile_id()) with check (buyer_id = public.current_profile_id());
create policy wishlist_items_owner on public.wishlist_items for all
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.buyer_id = public.current_profile_id()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.buyer_id = public.current_profile_id()));

create policy reminders_owner on public.reminders for all
  using (buyer_id = public.current_profile_id()) with check (buyer_id = public.current_profile_id());

create policy search_logs_owner on public.search_logs for insert
  with check (buyer_id = public.current_profile_id());
create policy search_logs_admin on public.search_logs for select using (public.is_admin());

-- ---------- 5. Guard triggers ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_shops_touch on public.shops;
create trigger trg_shops_touch before update on public.shops
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_riders_touch on public.riders;
create trigger trg_riders_touch before update on public.riders
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_checkouts_touch on public.checkouts;
create trigger trg_checkouts_touch before update on public.checkouts
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_orders_touch on public.shop_orders;
create trigger trg_orders_touch before update on public.shop_orders
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_deliveries_touch on public.deliveries;
create trigger trg_deliveries_touch before update on public.deliveries
  for each row execute function public.touch_updated_at();

-- Users cannot escalate their own role, or flip shop/rider status.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.suspended := old.suspended;
    new.auth_id := old.auth_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_shop_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.commission_pct := old.commission_pct;
    new.owner_id := old.owner_id;
    new.rating := old.rating;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_shop on public.shops;
create trigger trg_guard_shop before update on public.shops
  for each row execute function public.guard_shop_update();

create or replace function public.guard_rider_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.user_id := old.user_id;
    new.rating := old.rating;
    new.total_deliveries := old.total_deliveries;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_rider on public.riders;
create trigger trg_guard_rider before update on public.riders
  for each row execute function public.guard_rider_update();

-- Direct writes to financial/transaction tables are blocked entirely.
-- The RPCs in the next migration use SECURITY DEFINER and are the only path.
revoke insert, update, delete on public.checkouts from authenticated;
revoke insert, update, delete on public.shop_orders from authenticated;
revoke insert, update, delete on public.order_items from authenticated;
revoke insert, update, delete on public.payments from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.refunds from authenticated;
revoke insert, update, delete on public.cod_ledger from authenticated;
revoke insert, update, delete on public.deliveries from authenticated;
revoke insert, update, delete on public.order_events from authenticated;
