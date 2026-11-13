-- LocalizeIt Agra test data
-- Run after the main schema in Supabase SQL Editor.
-- Safe to run repeatedly: these records use fixed IDs and are updated in place.

insert into public.shops (
  id, name, tagline, owner_name, phone, category_id, category_name,
  rating, review_count, distance_km, address, village, town, district, state,
  pincode, latitude, longitude, pickup, delivery, status, commission_pct,
  open, prep_time_mins, since, service_pins, tint, accent
) values
(
  'a1000000-0000-4000-8000-000000000001',
  'Sharda Daily Needs',
  'Groceries and essentials near campus',
  'Amit Sharma', '9000001001', 'kirana', 'Kirana & Grocery',
  4.7, 86, 1.2, 'Sikandra-Bodla Road, near Sharda University area',
  '', 'Agra', 'Agra', 'Uttar Pradesh', '282007',
  27.1767, 78.0081, true, true, 'approved', 5,
  true, 20, 2022, array['282007','282005'], 'from-orange-100 to-amber-50', 'text-orange-600'
),
(
  'a1000000-0000-4000-8000-000000000002',
  'Brij Fresh Mart',
  'Fresh vegetables, fruit, and dairy',
  'Neha Verma', '9000001002', 'vegetables', 'Fruits & Vegetables',
  4.8, 54, 2.4, 'NH-2 Service Road, Sikandra, Agra',
  '', 'Agra', 'Agra', 'Uttar Pradesh', '282005',
  27.1930, 77.9500, true, true, 'approved', 5,
  true, 15, 2023, array['282005','282007'], 'from-success-soft to-cream-2', 'text-green-700'
),
(
  'a1000000-0000-4000-8000-000000000003',
  'Campus Corner Pharmacy',
  'Medicines and personal care essentials',
  'Rakesh Gupta', '9000001003', 'pharmacy', 'Pharmacy',
  4.6, 39, 3.1, 'Sharda University Road, Agra',
  '', 'Agra', 'Agra', 'Uttar Pradesh', '282001',
  27.2056, 78.0020, true, true, 'approved', 5,
  true, 10, 2021, array['282001','282005','282007'], 'from-info-soft to-orange-50', 'text-blue-700'
)
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  owner_name = excluded.owner_name,
  phone = excluded.phone,
  category_id = excluded.category_id,
  category_name = excluded.category_name,
  rating = excluded.rating,
  review_count = excluded.review_count,
  distance_km = excluded.distance_km,
  address = excluded.address,
  town = excluded.town,
  district = excluded.district,
  state = excluded.state,
  pincode = excluded.pincode,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  pickup = excluded.pickup,
  delivery = excluded.delivery,
  status = excluded.status,
  open = excluded.open,
  prep_time_mins = excluded.prep_time_mins,
  service_pins = excluded.service_pins,
  updated_at = now();

insert into public.riders (
  id, name, phone, college_name, id_doc_name, vehicle, city, district,
  pincode, service_area, availability_hours, status, online, rating,
  total_deliveries
) values
(
  'b1000000-0000-4000-8000-000000000001',
  'Rahul Singh', '9100002001', 'Sharda University Agra',
  'College Student ID Card', 'bike', 'Agra', 'Agra', '282007',
  'Sikandra, Bodla, Sharda University area', '8:00 AM - 1:00 PM',
  'approved', false, 4.8, 42
),
(
  'b1000000-0000-4000-8000-000000000002',
  'Priya Yadav', '9100002002', 'Agra College',
  'College Student ID Card', 'scooter', 'Agra', 'Agra', '282005',
  'Sikandra, NH-2, Khandari', '1:00 PM - 7:00 PM',
  'approved', false, 4.9, 67
),
(
  'b1000000-0000-4000-8000-000000000003',
  'Arjun Kumar', '9100002003', 'RBS College',
  'College Student ID Card', 'cycle', 'Agra', 'Agra', '282001',
  'Agra city, Sikandra, Khandari', '5:00 PM - 10:00 PM',
  'approved', false, 4.7, 28
),
(
  'b1000000-0000-4000-8000-000000000004',
  'Mohit Verma', '9100002004', 'Dayalbagh Educational Institute',
  'College Student ID Card', 'bike', 'Agra', 'Agra', '282005',
  'Khandari, Sikandra, Bodla', '10:00 AM - 4:00 PM',
  'approved', false, 4.6, 19
)
on conflict (id) do update set
  name = excluded.name,
  phone = excluded.phone,
  college_name = excluded.college_name,
  vehicle = excluded.vehicle,
  city = excluded.city,
  district = excluded.district,
  pincode = excluded.pincode,
  service_area = excluded.service_area,
  availability_hours = excluded.availability_hours,
  status = excluded.status,
  online = excluded.online,
  rating = excluded.rating,
  total_deliveries = excluded.total_deliveries,
  updated_at = now();

insert into public.products (
  id, shop_id, name, category_id, unit, price, mrp, stock, in_stock,
  description, tags, archived, image_url
) values
(
  'c1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Basmati Rice', 'kirana', '1 kg', 120, 145, 35, true,
  'Premium rice for everyday meals.', array['rice','grocery','staples'], false, null
),
(
  'c1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000001',
  'Tata Salt', 'kirana', '1 kg', 28, 30, 50, true,
  'Iodised salt for daily cooking.', array['salt','grocery','staples'], false, null
),
(
  'c1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000001',
  'Toor Dal', 'kirana', '1 kg', 145, 165, 24, true,
  'Clean and unpolished pigeon pea dal.', array['dal','pulses','grocery'], false, null
),
(
  'c1000000-0000-4000-8000-000000000004',
  'a1000000-0000-4000-8000-000000000002',
  'Fresh Tomatoes', 'vegetables', '1 kg', 38, 45, 28, true,
  'Fresh red tomatoes sourced locally.', array['vegetable','fresh','tomato'], false, null
),
(
  'c1000000-0000-4000-8000-000000000005',
  'a1000000-0000-4000-8000-000000000002',
  'Banana', 'vegetables', '1 dozen', 55, 65, 20, true,
  'Fresh ripe bananas.', array['fruit','fresh','banana'], false, null
),
(
  'c1000000-0000-4000-8000-000000000006',
  'a1000000-0000-4000-8000-000000000002',
  'Full Cream Milk', 'dairy', '1 litre', 68, 72, 18, true,
  'Chilled full cream dairy milk.', array['milk','dairy','fresh'], false, null
),
(
  'c1000000-0000-4000-8000-000000000007',
  'a1000000-0000-4000-8000-000000000003',
  'Paracetamol 500 mg', 'pharmacy', '10 tablets', 22, 25, 40, true,
  'Common fever and pain relief medicine.', array['medicine','health','pharmacy'], false, null
),
(
  'c1000000-0000-4000-8000-000000000008',
  'a1000000-0000-4000-8000-000000000003',
  'Hand Sanitizer', 'pharmacy', '100 ml', 45, 55, 25, true,
  'Pocket-size alcohol hand sanitizer.', array['hygiene','sanitizer','personal care'], false, null
),
(
  'c1000000-0000-4000-8000-000000000009',
  'a1000000-0000-4000-8000-000000000003',
  'Vitamin C Tablets', 'pharmacy', '20 tablets', 85, 99, 16, true,
  'Daily vitamin C supplement.', array['vitamins','health','pharmacy'], false, null
)
on conflict (id) do update set
  shop_id = excluded.shop_id,
  name = excluded.name,
  category_id = excluded.category_id,
  unit = excluded.unit,
  price = excluded.price,
  mrp = excluded.mrp,
  stock = excluded.stock,
  in_stock = excluded.in_stock,
  description = excluded.description,
  tags = excluded.tags,
  archived = excluded.archived,
  updated_at = now();
