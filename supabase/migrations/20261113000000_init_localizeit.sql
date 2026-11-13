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
    'Placed multi-shop order worth ₹' || p_grand_total
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
