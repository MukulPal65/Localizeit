-- LocalizeIt application onboarding.
-- Shop and rider accounts are created as pending and cannot sell or accept jobs
-- until an administrator changes their status through the existing RPCs.

insert into public.categories (id, name, slug, emoji, tint) values
  ('kirana', 'Kirana & Grocery', 'kirana', '🌾', 'from-orange-100 to-cream-2'),
  ('dairy', 'Dairy & Sweets', 'dairy', '🥛', 'from-cream-2 to-orange-50'),
  ('vegetables', 'Fruits & Vegetables', 'vegetables', '🥬', 'from-success-soft to-cream-2'),
  ('stationery', 'Stationery', 'stationery', '✏️', 'from-info-soft to-cream-2'),
  ('pharmacy', 'Pharmacy', 'pharmacy', '💊', 'from-info-soft to-orange-50'),
  ('hardware', 'Hardware & Paints', 'hardware', '🔨', 'from-cream-3 to-cream-2'),
  ('fashion', 'Sarees & Handloom', 'fashion', '🧵', 'from-orange-100 to-cream-3'),
  ('electronics', 'Mobile & Electronics', 'electronics', '📱', 'from-cream-2 to-info-soft'),
  ('bakery', 'Bakery', 'bakery', '🍞', 'from-orange-50 to-cream-3'),
  ('agriculture', 'Agri & Seeds', 'agriculture', '🌱', 'from-success-soft to-cream-2')
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
