-- ============================================================
-- LocalizeIt · Reference seed + Storage policies
-- Only configuration/reference data is seeded. No demo users,
-- shops, products, orders or fake metrics.
-- ============================================================

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
