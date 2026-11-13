-- LocalizeIt complete database setup
-- Run this file once in Supabase SQL Editor.
-- Migrations are included in filename order.


-- ============================================================
-- SOURCE: 20261113000000_init_localizeit.sql
-- ============================================================

-- ====================================================================
-- LocalizeIt Database Schema Migration
-- Hyperlocal multi-shop commerce for Tier 2/3 cities, towns and villages
-- ====================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enum types
do $$ begin
  create type user_role as enum ('buyer', 'shopkeeper', 'rider', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status as enum (
    'placed',
    'accepted',
    'preparing',
    'ready',
    'picked_up',
    'delivered',
    'rejected',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type shop_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type rider_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type vehicle_type as enum ('cycle', 'bike', 'scooter', 'auto');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type fulfilment_type as enum ('delivery', 'pickup');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('upi', 'cod');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum ('pending', 'authorized', 'captured', 'failed', 'refunded');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type delivery_job_status as enum ('available', 'accepted', 'picked_up', 'delivered', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type cod_status as enum ('pending', 'handed_over', 'discrepancy');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type settlement_status as enum ('pending', 'paid', 'disputed');
exception
  when duplicate_object then null;
end $$;

-- 1. PROFILES (extends Supabase auth.users or standalone for demo/OTP)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete set null,
  role user_role not null default 'buyer',
  name text not null,
  phone text not null unique,
  email text,
  avatar_tint text default 'from-orange-400 to-amber-500',
  language text default 'en',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for phone lookups
create index if not exists idx_profiles_phone on public.profiles(phone);
create index if not exists idx_profiles_role on public.profiles(role);

-- 2. ADDRESSES
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  recipient text not null,
  phone text not null,
  line1 text not null,
  landmark text,
  village text,
  town text not null,
  district text not null,
  state text not null,
  pincode text not null,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses(user_id);
create index if not exists idx_addresses_pincode on public.addresses(pincode);

-- 3. CATEGORIES
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  emoji text not null,
  tint text not null,
  created_at timestamptz not null default now()
);

-- 4. SHOPS
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  tagline text default '',
  owner_name text not null,
  phone text not null,
  category_id text not null references public.categories(id),
  category_name text not null,
  rating numeric(3,2) not null default 5.0,
  review_count int not null default 0,
  distance_km numeric(4,2) not null default 1.0,
  address text not null,
  village text default '',
  town text not null,
  district text not null,
  state text not null,
  pincode text not null,
  latitude double precision,
  longitude double precision,
  pickup boolean not null default true,
  delivery boolean not null default true,
  status shop_status not null default 'pending',
  rejection_reason text,
  commission_pct numeric(4,2) not null default 4.5,
  open boolean not null default true,
  prep_time_mins int not null default 15,
  since int not null default 2024,
  service_pins text[] not null default '{}',
  image_url text,
  tint text default 'from-orange-100 to-amber-50',
  accent text default 'text-orange-600',
  payout_method jsonb default '{"bank_name": "State Bank of India", "ifsc": "SBIN0001234", "account_num": "4821"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shops_status on public.shops(status);
create index if not exists idx_shops_category on public.shops(category_id);
create index if not exists idx_shops_town on public.shops(town);
create index if not exists idx_shops_owner on public.shops(owner_id);

-- 5. RIDERS (Student delivery partners)
create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text not null unique,
  college_name text,
  student_id_url text,
  id_doc_name text default 'Student ID Card',
  vehicle vehicle_type not null default 'bike',
  city text not null,
  district text not null,
  pincode text not null,
  service_area text not null,
  availability_hours text default 'Flexible / Post-Classes',
  status rider_status not null default 'pending',
  rejection_reason text,
  online boolean not null default false,
  rating numeric(3,2) not null default 5.0,
  total_deliveries int not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_riders_status on public.riders(status);
create index if not exists idx_riders_online on public.riders(online);
create index if not exists idx_riders_service_area on public.riders(service_area);

-- 6. PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  category_id text not null references public.categories(id),
  unit text not null,
  price numeric(10,2) not null check (price >= 0),
  mrp numeric(10,2) check (mrp is null or mrp >= price),
  stock int not null default 0 check (stock >= 0),
  in_stock boolean not null default true,
  stock_updated_at timestamptz not null default now(),
  expiry date,
  description text default '',
  tags text[] not null default '{}',
  image_url text,
  archived boolean not null default false,
  deal_price numeric(10,2),
  deal_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_shop on public.products(shop_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_instock on public.products(in_stock) where archived = false;

-- 7. FEE RULES & CONFIGURATION (auditable, versioned)
create table if not exists public.fee_rules (
  id uuid primary key default gen_random_uuid(),
  version int not null default 1,
  platform_fee numeric(8,2) not null default 30.00,
  free_fee_above numeric(8,2) not null default 500.00,
  near_distance_km numeric(4,2) not null default 3.0,
  delivery_fee_near numeric(8,2) not null default 30.00,
  delivery_fee_far numeric(8,2) not null default 50.00,
  shop_commission_pct numeric(4,2) not null default 4.50,
  cod_enabled boolean not null default true,
  cod_max_amount numeric(8,2) not null default 2000.00,
  pickup_only_prepaid boolean not null default true,
  is_active boolean not null default true,
  updated_by text default 'Super Admin',
  created_at timestamptz not null default now()
);

-- 8. CHECKOUTS (Multi-shop unified checkout)
create table if not exists public.checkouts (
  id text primary key, -- e.g. LZ-2401
  buyer_id uuid references public.profiles(id) on delete set null,
  buyer_name text not null,
  buyer_phone text not null,
  address_snapshot jsonb not null,
  item_subtotal numeric(10,2) not null default 0,
  platform_fee numeric(10,2) not null default 0,
  delivery_total numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  grand_total numeric(10,2) not null default 0,
  cod_amount numeric(10,2) not null default 0,
  payment_method payment_method not null default 'upi',
  payment_status payment_status not null default 'pending',
  fee_rule_version int not null default 1,
  note text,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkouts_buyer on public.checkouts(buyer_id);
create index if not exists idx_checkouts_created on public.checkouts(created_at desc);

-- 9. SHOP ORDERS (Per-shop packet within a multi-shop checkout)
create table if not exists public.shop_orders (
  id text primary key, -- e.g. LZ-2401-SHARMA
  checkout_id text not null references public.checkouts(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  shop_name text not null,
  shop_town text not null,
  subtotal numeric(10,2) not null default 0,
  fulfilment fulfilment_type not null default 'delivery',
  delivery_fee numeric(10,2) not null default 0,
  commission_pct numeric(4,2) not null default 4.5,
  commission_amount numeric(10,2) not null default 0,
  status order_status not null default 'placed',
  payment_method payment_method not null default 'upi',
  cod_amount numeric(10,2) not null default 0,
  rider_id uuid references public.riders(id) on delete set null,
  rejection_reason text,
  substitution_proposed jsonb, -- { original_item_id, item_name, substitute_name, substitute_price, status: 'pending'|'approved'|'rejected' }
  substitution_status text not null default 'none',
  note text,
  estimated_mins int not null default 25,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shop_orders_checkout on public.shop_orders(checkout_id);
create index if not exists idx_shop_orders_shop on public.shop_orders(shop_id);
create index if not exists idx_shop_orders_rider on public.shop_orders(rider_id);
create index if not exists idx_shop_orders_status on public.shop_orders(status);

-- 10. ORDER ITEMS (Immutable historical snapshot)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  shop_order_id text not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  unit text not null,
  price numeric(10,2) not null,
  mrp numeric(10,2),
  qty int not null check (qty > 0),
  subtotal numeric(10,2) not null,
  category_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items(shop_order_id);

-- 11. DELIVERIES (Dispatch jobs for student riders)
create table if not exists public.deliveries (
  id text primary key, -- e.g. JOB-101
  checkout_id text not null references public.checkouts(id),
  shop_order_id text not null references public.shop_orders(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  shop_name text not null,
  pickup_address text not null,
  drop_address text not null,
  customer_name text not null,
  customer_phone text not null,
  distance_km numeric(4,2) not null default 1.0,
  payout numeric(8,2) not null default 30.00,
  cod_amount numeric(10,2) not null default 0,
  item_count int not null default 1,
  status delivery_job_status not null default 'available',
  rider_id uuid references public.riders(id) on delete set null,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  pickup_note text default '',
  drop_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deliveries_status on public.deliveries(status);
create index if not exists idx_deliveries_rider on public.deliveries(rider_id);
create index if not exists idx_deliveries_shop_order on public.deliveries(shop_order_id);

-- 12. COD LEDGER (Cash tracking and reconciliation)
create table if not exists public.cod_ledger (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null references public.deliveries(id),
  order_id text not null,
  rider_id uuid not null references public.riders(id),
  shop_name text not null,
  customer_name text not null,
  expected_amount numeric(10,2) not null,
  collected_amount numeric(10,2) not null,
  handed_over_amount numeric(10,2) not null default 0,
  status cod_status not null default 'pending',
  discrepancy_note text,
  collected_at timestamptz not null default now(),
  handed_over_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_cod_ledger_rider on public.cod_ledger(rider_id);
create index if not exists idx_cod_ledger_status on public.cod_ledger(status);

-- 13. SETTLEMENTS (Shop and rider financial payouts)
create table if not exists public.settlements (
  id text primary key, -- e.g. STL-24-W18-SHARMA
  party text not null check (party in ('shop', 'rider')),
  party_id text not null,
  party_name text not null,
  period text not null,
  gross_sales numeric(10,2) not null default 0,
  commission numeric(10,2) not null default 0,
  refunds numeric(10,2) not null default 0,
  cod_collected numeric(10,2) not null default 0,
  payout numeric(10,2) not null default 0,
  status settlement_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_settlements_party on public.settlements(party, party_id);
create index if not exists idx_settlements_status on public.settlements(status);

-- 14. PAYMENTS (Gateway transaction records)
create table if not exists public.payments (
  id text primary key, -- e.g. PAY-1234
  checkout_id text not null references public.checkouts(id),
  gateway text not null default 'razorpay_test',
  gateway_order_id text,
  gateway_payment_id text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status payment_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 15. AUDIT LOGS (Append-only immutable audit trail)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'System',
  role text not null default 'system',
  action text not null,
  target_type text not null,
  target_id text,
  target_label text not null,
  description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);

-- 16. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.shops enable row level security;
alter table public.riders enable row level security;
alter table public.products enable row level security;
alter table public.fee_rules enable row level security;
alter table public.checkouts enable row level security;
alter table public.shop_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.deliveries enable row level security;
alter table public.cod_ledger enable row level security;
alter table public.settlements enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: Public read, users can update own profile
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = auth_id or auth.uid() is null);
create policy "Users can insert own profile" on public.profiles for insert with check (true);

-- Addresses: Users can read/write own addresses
create policy "Users can view own addresses" on public.addresses for select using (true);
create policy "Users can insert own addresses" on public.addresses for insert with check (true);
create policy "Users can update own addresses" on public.addresses for update using (true);
create policy "Users can delete own addresses" on public.addresses for delete using (true);

-- Categories: Public read
create policy "Categories are viewable by everyone" on public.categories for select using (true);

-- Shops: Approved shops visible to everyone; owners and admins can manage
create policy "Shops are viewable by everyone" on public.shops for select using (true);
create policy "Owners and admins can update shops" on public.shops for update using (true);
create policy "New shops can be registered" on public.shops for insert with check (true);

-- Riders: Fleet viewable by admins and owners
create policy "Riders viewable by authenticated users" on public.riders for select using (true);
create policy "Riders can update own profile" on public.riders for update using (true);
create policy "New riders can register" on public.riders for insert with check (true);

-- Products: In-stock and active visible to buyers, owners manage own
create policy "Products viewable by everyone" on public.products for select using (true);
create policy "Shop owners can manage products" on public.products for all using (true);

-- Fee rules: Readable by everyone, updatable by admin
create policy "Fee rules readable by everyone" on public.fee_rules for select using (true);
create policy "Admins can update fee rules" on public.fee_rules for all using (true);

-- Checkouts & Orders: Visible to relevant parties (buyer, shop, rider, admin)
create policy "Checkouts viewable by participants" on public.checkouts for select using (true);
create policy "Checkouts insertable" on public.checkouts for insert with check (true);
create policy "Checkouts updatable" on public.checkouts for update using (true);

create policy "Shop orders viewable by participants" on public.shop_orders for select using (true);
create policy "Shop orders updatable by shop, rider or admin" on public.shop_orders for update using (true);
create policy "Shop orders insertable" on public.shop_orders for insert with check (true);

create policy "Order items viewable by participants" on public.order_items for select using (true);
create policy "Order items insertable" on public.order_items for insert with check (true);

-- Deliveries: Available jobs visible to riders; assigned visible to rider & admin
create policy "Deliveries viewable by riders and admins" on public.deliveries for select using (true);
create policy "Deliveries manageable by riders and admin" on public.deliveries for update using (true);
create policy "Deliveries insertable by system" on public.deliveries for insert with check (true);

-- COD Ledger: Visible to rider and admin
create policy "COD entries viewable by participants" on public.cod_ledger for select using (true);
create policy "COD entries manageable" on public.cod_ledger for all using (true);

-- Settlements: Viewable by party and admin
create policy "Settlements viewable by owner and admin" on public.settlements for select using (true);
create policy "Settlements updatable by admin" on public.settlements for update using (true);

-- Audit logs: Read-only for admins, appendable by system
create policy "Audit logs viewable by admin" on public.audit_logs for select using (true);
create policy "Audit logs insertable" on public.audit_logs for insert with check (true);

-- 17. DATABASE FUNCTION: Atomic stock reservation and checkout
create or replace function public.process_checkout_atomic(
  p_checkout_id text,
  p_buyer_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_address_snapshot jsonb,
  p_item_subtotal numeric,
  p_platform_fee numeric,
  p_delivery_total numeric,
  p_discount numeric,
  p_grand_total numeric,
  p_cod_amount numeric,
  p_payment_method payment_method,
  p_note text,
  p_shop_orders jsonb -- Array of { id, shop_id, shop_name, shop_town, subtotal, fulfilment, delivery_fee, commission_pct, items: [...] }
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_shop_order jsonb;
  v_item jsonb;
  v_current_stock int;
  v_product_name text;
begin
  -- 1. Validate and reserve stock for all items
  for v_shop_order in select * from jsonb_array_elements(p_shop_orders) loop
    for v_item in select * from jsonb_array_elements(v_shop_order->'items') loop
      select stock, name into v_current_stock, v_product_name
      from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

      if v_current_stock is null then
        return jsonb_build_object('ok', false, 'error', 'Product ' || (v_item->>'name') || ' no longer exists');
      end if;

      if v_current_stock < (v_item->>'qty')::int then
        return jsonb_build_object(
          'ok', false,
          'error', 'Insufficient stock for ' || v_product_name || '. Only ' || v_current_stock || ' available.'
        );
      end if;

      -- Deduct stock
      update public.products
      set stock = stock - (v_item->>'qty')::int,
          in_stock = (stock - (v_item->>'qty')::int) > 0,
          stock_updated_at = now()
      where id = (v_item->>'product_id')::uuid;
    end loop;
  end loop;

  -- 2. Create master checkout record
  insert into public.checkouts (
    id, buyer_id, buyer_name, buyer_phone, address_snapshot,
    item_subtotal, platform_fee, delivery_total, discount,
    grand_total, cod_amount, payment_method, payment_status,
    note, is_demo
  ) values (
    p_checkout_id, p_buyer_id, p_buyer_name, p_buyer_phone, p_address_snapshot,
    p_item_subtotal, p_platform_fee, p_delivery_total, p_discount,
    p_grand_total, p_cod_amount, p_payment_method,
    case when p_payment_method = 'upi' then 'completed'::payment_status else 'pending'::payment_status end,
    p_note, true
  );

  -- 3. Create shop orders and order items
  for v_shop_order in select * from jsonb_array_elements(p_shop_orders) loop
    insert into public.shop_orders (
      id, checkout_id, shop_id, shop_name, shop_town,
      subtotal, fulfilment, delivery_fee, commission_pct,
      commission_amount, status, payment_method, cod_amount,
      estimated_mins, status_history, note
    ) values (
      v_shop_order->>'id',
      p_checkout_id,
      (v_shop_order->>'shop_id')::uuid,
      v_shop_order->>'shop_name',
      v_shop_order->>'shop_town',
      (v_shop_order->>'subtotal')::numeric,
      (v_shop_order->>'fulfilment')::fulfilment_type,
      (v_shop_order->>'delivery_fee')::numeric,
      (v_shop_order->>'commission_pct')::numeric,
      round(((v_shop_order->>'subtotal')::numeric * (v_shop_order->>'commission_pct')::numeric) / 100, 2),
      'placed',
      p_payment_method,
      (v_shop_order->>'cod_amount')::numeric,
      (v_shop_order->>'estimated_mins')::int,
      jsonb_build_array(jsonb_build_object('status', 'placed', 'at', to_jsonb(now()))),
      p_note
    );

    for v_item in select * from jsonb_array_elements(v_shop_order->'items') loop
      insert into public.order_items (
        shop_order_id, product_id, name, unit,
        price, mrp, qty, subtotal, category_id
      ) values (
        v_shop_order->>'id',
        (v_item->>'product_id')::uuid,
        v_item->>'name',
        v_item->>'unit',
        (v_item->>'price')::numeric,
        (v_item->>'mrp')::numeric,
        (v_item->>'qty')::int,
        (v_item->>'price')::numeric * (v_item->>'qty')::int,
        v_item->>'category_id'
      );
    end loop;
  end loop;

  -- 4. Audit Log
  insert into public.audit_logs (
    actor, role, action, target_type, target_id, target_label, description
  ) values (
    p_buyer_name, 'buyer', 'Order placed', 'order', p_checkout_id, p_checkout_id,
    'Placed multi-shop order worth â‚¹' || p_grand_total
  );

  return jsonb_build_object('ok', true, 'checkout_id', p_checkout_id);
end;
$$;

-- 18. STORAGE BUCKETS (for student IDs, product photos, shop banners)
-- Insert buckets into storage.buckets if storage extension exists
do $$ begin
  insert into storage.buckets (id, name, public)
  values ('student-ids', 'student-ids', false)
  on conflict (id) do nothing;

  insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;

  insert into storage.buckets (id, name, public)
  values ('shop-images', 'shop-images', true)
  on conflict (id) do nothing;
exception
  when undefined_table then null;
end $$;

-- ============================================================
-- SOURCE: 20261113100000_secure_schema.sql
-- ============================================================

-- ============================================================
-- LocalizeIt Â· Production hardening migration
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
  add column if not exists opening_hours text not null default '8:00 AM â€“ 9:00 PM',
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

-- ============================================================
-- SOURCE: 20261113100100_rpc.sql
-- ============================================================

-- ============================================================
-- LocalizeIt Â· Transactional RPCs
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
      return jsonb_build_object('ok', false, 'error', 'This order exceeds the COD limit of â‚¹' || v_cod_max || '.');
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
        v_group->>'shop_name' || ' Â· order ' || v_shop_order_id,
        'order', jsonb_build_object('shop_order_id', v_shop_order_id)
      );
    end if;
  end loop;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description, metadata)
  values (
    v_buyer.name, 'buyer', 'Order placed', 'order', v_checkout_id, v_checkout_id,
    'Placed a multi-shop order worth â‚¹' || v_grand_total || ' via ' || upper(p_method::text) || '.',
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
    v_event_note || ' Â· ' || v_order.shop_name,
    jsonb_build_object('shop_order_id', p_shop_order_id, 'status', p_status, 'reason', p_reason, 'refund', v_refund)
  );

  if v_order.buyer_id is not null then
    insert into public.notifications (profile_id, title, body, kind, data)
    values (
      v_order.buyer_id,
      case when p_status = 'ready' then 'Order ready' when p_status in ('rejected','cancelled') then 'Order update' else 'Order update' end,
      v_order.shop_name || ' Â· ' || v_event_note,
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
          'Substitution proposed: ' || v_orig.name || ' â†’ ' || v_sub.name);

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
          'Delivered to ' || v_job.customer_name || '. COD â‚¹' || v_job.cod_amount || '.');

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
      discrepancy_note = case when v_variance = 0 then null else coalesce(p_note, 'Variance â‚¹' || v_variance) end,
      handed_over_at = now()
  where id = p_entry_id;

  insert into public.audit_logs (actor, role, action, target_type, target_id, target_label, description)
  values (v_rider.name, 'rider',
          case when v_variance = 0 then 'COD handed over' else 'COD discrepancy flagged' end,
          'settlement', p_entry_id::text, v_entry.order_id,
          'Handed over â‚¹' || p_amount || ' against â‚¹' || v_entry.expected_amount || '.',
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
          v_shop.name || ' marked ' || p_status::text || coalesce(' â€” ' || p_reason, ''));

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
          v_rider.name || ' marked ' || p_status::text || coalesce(' â€” ' || p_reason, ''));

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
    coalesce(p_reason, 'Fee rules updated') || ' Â· Platform â‚¹' || p_platform_fee ||
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
          'Paid â‚¹' || v_row.payout || ' to ' || v_row.party_name || '.');

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

-- ============================================================
-- SOURCE: 20261113100200_seed_storage.sql
-- ============================================================

-- ============================================================
-- LocalizeIt Â· Reference seed + Storage policies
-- Only configuration/reference data is seeded. No demo users,
-- shops, products, orders or fake metrics.
-- ============================================================

insert into public.categories (id, name, slug, emoji, tint) values
  ('kirana', 'Kirana & Grocery', 'kirana', 'ðŸŒ¾', 'from-orange-100 to-cream-2'),
  ('dairy', 'Dairy & Sweets', 'dairy', 'ðŸ¥›', 'from-cream-2 to-orange-50'),
  ('vegetables', 'Fruits & Vegetables', 'vegetables', 'ðŸ¥¬', 'from-success-soft to-cream-2'),
  ('stationery', 'Stationery', 'stationery', 'âœï¸', 'from-info-soft to-cream-2'),
  ('pharmacy', 'Pharmacy', 'pharmacy', 'ðŸ’Š', 'from-info-soft to-orange-50'),
  ('hardware', 'Hardware & Paints', 'hardware', 'ðŸ”¨', 'from-cream-3 to-cream-2'),
  ('fashion', 'Sarees & Handloom', 'fashion', 'ðŸ§µ', 'from-orange-100 to-cream-3'),
  ('electronics', 'Mobile & Electronics', 'electronics', 'ðŸ“±', 'from-cream-2 to-info-soft'),
  ('bakery', 'Bakery', 'bakery', 'ðŸž', 'from-orange-50 to-cream-3'),
  ('agriculture', 'Agri & Seeds', 'agriculture', 'ðŸŒ±', 'from-success-soft to-cream-2')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  emoji = excluded.emoji,
  tint = excluded.tint;

insert into public.service_areas
  (id, state, district, town, village, pincode, serviceability, delivery_eta_mins)
values
  ('area-gyanpur','Uttar Pradesh','Bhadohi','Gyanpur','','221304','full',35),
  ('area-aurai','Uttar Pradesh','Bhadohi','Gyanpur','Aurai','221301','pickup',0),
  ('area-bhadohi','Uttar Pradesh','Bhadohi','Bhadohi','','221401','full',40),
  ('area-suriyawan','Uttar Pradesh','Bhadohi','Suriyawan','','221308','full',45),
  ('area-varanasi','Uttar Pradesh','Varanasi','Varanasi','Sarnath','221007','full',50),
  ('area-prayagraj','Uttar Pradesh','Prayagraj','Prayagraj','','211001','full',55),
  ('area-biharsharif','Bihar','Nalanda','Biharsharif','','232101','full',38),
  ('area-rajgir','Bihar','Nalanda','Rajgir','','803116','pickup',0),
  ('area-chhindwara','Madhya Pradesh','Chhindwara','Chhindwara','','480001','full',42),
  ('area-seoni','Madhya Pradesh','Seoni','Seoni','Barghat','480667','none',0),
  ('area-banswara','Rajasthan','Banswara','Banswara','','327001','full',40),
  ('area-kushalgarh','Rajasthan','Banswara','Kushalgarh','Kushalgarh','327601','pickup',0)
on conflict (id) do update set
  state = excluded.state, district = excluded.district, town = excluded.town,
  village = excluded.village, pincode = excluded.pincode,
  serviceability = excluded.serviceability, delivery_eta_mins = excluded.delivery_eta_mins;

insert into public.fee_rules (
  version, platform_fee, free_fee_above, near_distance_km, delivery_fee_near,
  delivery_fee_far, shop_commission_pct, cod_enabled, cod_max_amount,
  pickup_only_prepaid, is_active, updated_by
)
select 1, 30, 500, 3, 30, 50, 4.5, true, 2000, true, true, 'System'
where not exists (select 1 from public.fee_rules);

insert into public.delivery_tiers (max_km, payout)
select * from (values (2.0, 24.0), (5.0, 32.0), (10.0, 45.0), (20.0, 60.0)) as t(max_km, payout)
where not exists (select 1 from public.delivery_tiers);

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-ids', 'student-ids', false, 5242880, array['image/png','image/jpeg','image/webp','application/pdf']),
  ('product-photos', 'product-photos', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('shop-images', 'shop-images', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public product & shop images: anyone can read, owners can write their folder.
drop policy if exists "public read product photos" on storage.objects;
create policy "public read product photos" on storage.objects for select
  using (bucket_id = 'product-photos');

drop policy if exists "owner write product photos" on storage.objects;
create policy "owner write product photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "owner update product photos" on storage.objects;
create policy "owner update product photos" on storage.objects for update to authenticated
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "public read shop images" on storage.objects;
create policy "public read shop images" on storage.objects for select
  using (bucket_id = 'shop-images');

drop policy if exists "owner write shop images" on storage.objects;
create policy "owner write shop images" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shop-images'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

-- Private student IDs: rider reads own folder; admins read all.
drop policy if exists "rider read own student id" on storage.objects;
create policy "rider read own student id" on storage.objects for select to authenticated
  using (
    bucket_id = 'student-ids'
    and ((storage.foldername(name))[1] = public.current_profile_id()::text or public.is_admin())
  );

drop policy if exists "rider upload own student id" on storage.objects;
create policy "rider upload own student id" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-ids'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "admin manage student ids" on storage.objects;
create policy "admin manage student ids" on storage.objects for delete to authenticated
  using (bucket_id = 'student-ids' and public.is_admin());

-- ============================================================
-- SOURCE: 20261113100300_applications.sql
-- ============================================================

-- LocalizeIt application onboarding.
-- Shop and rider accounts are created as pending and cannot sell or accept jobs
-- until an administrator changes their status through the existing RPCs.

insert into public.categories (id, name, slug, emoji, tint) values
  ('kirana', 'Kirana & Grocery', 'kirana', 'ðŸŒ¾', 'from-orange-100 to-cream-2'),
  ('dairy', 'Dairy & Sweets', 'dairy', 'ðŸ¥›', 'from-cream-2 to-orange-50'),
  ('vegetables', 'Fruits & Vegetables', 'vegetables', 'ðŸ¥¬', 'from-success-soft to-cream-2'),
  ('stationery', 'Stationery', 'stationery', 'âœï¸', 'from-info-soft to-cream-2'),
  ('pharmacy', 'Pharmacy', 'pharmacy', 'ðŸ’Š', 'from-info-soft to-orange-50'),
  ('hardware', 'Hardware & Paints', 'hardware', 'ðŸ”¨', 'from-cream-3 to-cream-2'),
  ('fashion', 'Sarees & Handloom', 'fashion', 'ðŸ§µ', 'from-orange-100 to-cream-3'),
  ('electronics', 'Mobile & Electronics', 'electronics', 'ðŸ“±', 'from-cream-2 to-info-soft'),
  ('bakery', 'Bakery', 'bakery', 'ðŸž', 'from-orange-50 to-cream-3'),
  ('agriculture', 'Agri & Seeds', 'agriculture', 'ðŸŒ±', 'from-success-soft to-cream-2')
on conflict (id) do nothing;

insert into public.fee_rules (
  version, platform_fee, free_fee_above, near_distance_km,
  delivery_fee_near, delivery_fee_far, shop_commission_pct,
  cod_enabled, cod_max_amount, pickup_only_prepaid, is_active
) values (1, 30, 500, 2, 30, 50, 5, true, 1500, true, true)
on conflict do nothing;

create or replace function public.register_shop_application(
  p_name text,
  p_owner_name text,
  p_phone text,
  p_category_id text,
  p_category_name text,
  p_address text,
  p_village text,
  p_town text,
  p_district text,
  p_state text,
  p_pincode text,
  p_pickup boolean,
  p_delivery boolean
)
returns public.shops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_shop public.shops;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to register a shop.';
  end if;
  if not p_pickup and not p_delivery then
    raise exception 'Select pickup, delivery, or both.';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Select a valid shop category.';
  end if;

  select id into v_profile_id from public.profiles where auth_id = auth.uid() limit 1;
  if v_profile_id is null then
    insert into public.profiles (auth_id, role, name, phone, onboarded)
    values (auth.uid(), 'shopkeeper', p_owner_name, p_phone, true)
    returning id into v_profile_id;
  else
    update public.profiles
    set role = case when role = 'admin' then role else 'shopkeeper' end,
        name = p_owner_name,
        phone = p_phone,
        onboarded = true
    where id = v_profile_id;
  end if;

  if exists (
    select 1 from public.shops
    where owner_id = v_profile_id and status in ('pending', 'approved')
  ) then
    raise exception 'This account already has an active shop application.';
  end if;

  insert into public.shops (
    owner_id, name, owner_name, phone, category_id, category_name,
    address, village, town, district, state, pincode, pickup, delivery,
    status, commission_pct
  ) values (
    v_profile_id, trim(p_name), trim(p_owner_name), trim(p_phone), p_category_id,
    trim(p_category_name), trim(p_address), trim(coalesce(p_village, '')),
    trim(p_town), trim(p_district), trim(p_state), trim(p_pincode),
    p_pickup, p_delivery, 'pending', 5
  )
  returning * into v_shop;

  return v_shop;
end;
$$;

create or replace function public.register_rider_application(
  p_name text,
  p_phone text,
  p_college_name text,
  p_student_id_url text,
  p_id_doc_name text,
  p_vehicle vehicle_type,
  p_city text,
  p_district text,
  p_pincode text,
  p_service_area text,
  p_availability_hours text
)
returns public.riders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_rider public.riders;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to register as a rider.';
  end if;

  select id into v_profile_id from public.profiles where auth_id = auth.uid() limit 1;
  if v_profile_id is null then
    insert into public.profiles (auth_id, role, name, phone, onboarded)
    values (auth.uid(), 'rider', p_name, p_phone, true)
    returning id into v_profile_id;
  else
    update public.profiles
    set role = case when role = 'admin' then role else 'rider' end,
        name = p_name,
        phone = p_phone,
        onboarded = true
    where id = v_profile_id;
  end if;

  if exists (
    select 1 from public.riders
    where user_id = v_profile_id and status in ('pending', 'approved')
  ) then
    raise exception 'This account already has an active rider application.';
  end if;
  if exists (
    select 1 from public.riders
    where phone = trim(p_phone) and user_id is distinct from v_profile_id
  ) then
    raise exception 'This phone number is already registered as a rider.';
  end if;

  insert into public.riders (
    user_id, auth_id, name, phone, college_name, student_id_url, id_doc_name,
    vehicle, city, district, pincode, service_area, availability_hours,
    status, online
  ) values (
    v_profile_id, auth.uid(), trim(p_name), trim(p_phone), trim(p_college_name),
    nullif(trim(p_student_id_url), ''), coalesce(nullif(trim(p_id_doc_name), ''), 'College Student ID Card'),
    p_vehicle, trim(p_city), trim(p_district), trim(p_pincode), trim(p_service_area),
    nullif(trim(p_availability_hours), ''), 'pending', false
  )
  returning * into v_rider;

  return v_rider;
end;
$$;

grant execute on function public.register_shop_application(text, text, text, text, text, text, text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.register_rider_application(text, text, text, text, text, vehicle_type, text, text, text, text, text) to authenticated;

-- ============================================================
-- SOURCE: 20261113100400_fix_order_rls.sql
-- ============================================================

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

-- ============================================================
-- SOURCE: 20261113100500_public_applications.sql
-- ============================================================

-- Public onboarding submissions. Applications are always pending and require
-- admin approval before a shop sells or a rider receives jobs.

create or replace function public.submit_shop_application(
  p_name text,
  p_owner_name text,
  p_phone text,
  p_category_id text,
  p_category_name text,
  p_address text,
  p_village text,
  p_town text,
  p_district text,
  p_state text,
  p_pincode text,
  p_pickup boolean,
  p_delivery boolean
)
returns public.shops
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
  v_shop public.shops;
begin
  if not p_pickup and not p_delivery then
    raise exception 'Select pickup, delivery, or both.';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Select a valid shop category.';
  end if;
  select id into v_owner_id from public.profiles where auth_id = auth.uid() limit 1;

  insert into public.shops (
    owner_id, name, owner_name, phone, category_id, category_name,
    address, village, town, district, state, pincode, pickup, delivery,
    status, commission_pct
  ) values (
    v_owner_id, trim(p_name), trim(p_owner_name), trim(p_phone), p_category_id,
    trim(p_category_name), trim(p_address), trim(coalesce(p_village, '')),
    trim(p_town), trim(p_district), trim(p_state), trim(p_pincode),
    p_pickup, p_delivery, 'pending', 5
  )
  returning * into v_shop;
  return v_shop;
end;
$$;

create or replace function public.submit_rider_application(
  p_name text,
  p_phone text,
  p_college_name text,
  p_student_id_url text,
  p_id_doc_name text,
  p_vehicle vehicle_type,
  p_city text,
  p_district text,
  p_pincode text,
  p_service_area text,
  p_availability_hours text
)
returns public.riders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_rider public.riders;
begin
  select id into v_profile_id from public.profiles where auth_id = auth.uid() limit 1;
  insert into public.riders (
    user_id, auth_id, name, phone, college_name, student_id_url, id_doc_name,
    vehicle, city, district, pincode, service_area, availability_hours,
    status, online
  ) values (
    v_profile_id, auth.uid(), trim(p_name), trim(p_phone), trim(p_college_name),
    nullif(trim(p_student_id_url), ''), coalesce(nullif(trim(p_id_doc_name), ''), 'College Student ID Card'),
    p_vehicle, trim(p_city), trim(p_district), trim(p_pincode), trim(p_service_area),
    nullif(trim(p_availability_hours), ''), 'pending', false
  )
  returning * into v_rider;
  return v_rider;
end;
$$;

grant execute on function public.submit_shop_application(text, text, text, text, text, text, text, text, text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.submit_rider_application(text, text, text, text, text, vehicle_type, text, text, text, text, text) to anon, authenticated;

-- ============================================================
-- SOURCE: 20261113100600_product_state.sql
-- ============================================================

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

-- ============================================================
-- SOURCE: 20261113100700_fix_product_upsert.sql
-- ============================================================

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
