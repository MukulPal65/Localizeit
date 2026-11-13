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
