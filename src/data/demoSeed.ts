import type { Product, RiderProfile, Shop } from '@/types'
import { nowISO } from '@/utils'
import { useCatalogStore } from '@/store/catalog'
import { useDeliveryStore } from '@/store/delivery'

const shop = (
  id: string,
  name: string,
  ownerName: string,
  phone: string,
  categoryId: string,
  categoryName: string,
  address: string,
  pincode: string,
  lat: number,
  lng: number,
  distanceKm: number,
  status: Shop['status'] = 'approved',
): Shop => ({
  id,
  name,
  tagline: categoryName,
  ownerName,
  phone,
  categoryId,
  categoryName,
  rating: status === 'approved' ? 4.7 : 0,
  reviewCount: status === 'approved' ? 40 : 0,
  distanceKm,
  address,
  village: '',
  town: 'Agra',
  district: 'Agra',
  state: 'Uttar Pradesh',
  pincode,
  lat,
  lng,
  pickup: true,
  delivery: true,
  status,
  commissionPct: 5,
  open: status === 'approved',
  prepTimeMins: 20,
  since: 2022,
  servicePins: [pincode],
  tint: 'from-orange-100 to-amber-50',
  accent: 'text-orange-600',
})

const shops: Shop[] = [
  shop(
    'a1000000-0000-4000-8000-000000000001',
    'Sharda Daily Needs',
    'Amit Sharma',
    '9000001001',
    'kirana',
    'Kirana & Grocery',
    'Sikandra-Bodla Road, near Sharda University area',
    '282007',
    27.1767,
    78.0081,
    1.2,
  ),
  shop(
    'a1000000-0000-4000-8000-000000000002',
    'Brij Fresh Mart',
    'Neha Verma',
    '9000001002',
    'vegetables',
    'Fruits & Vegetables',
    'NH-2 Service Road, Sikandra, Agra',
    '282005',
    27.193,
    77.95,
    2.4,
  ),
  shop(
    'a1000000-0000-4000-8000-000000000003',
    'Campus Corner Pharmacy',
    'Rakesh Gupta',
    '9000001003',
    'pharmacy',
    'Pharmacy',
    'Sharda University Road, Agra',
    '282001',
    27.2056,
    78.002,
    3.1,
  ),
  shop(
    'a1000000-0000-4000-8000-000000000004',
    'Pending Agra Stationers',
    'Kavita Jain',
    '9000001004',
    'stationery',
    'Stationery',
    'Khandari, Agra',
    '282005',
    27.2101,
    77.987,
    3.8,
    'pending',
  ),
]

const products: Product[] = [
  ['c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Basmati Rice', '1 kg', 120, 35, 'kirana'],
  ['c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Tata Salt', '1 kg', 28, 50, 'kirana'],
  ['c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Toor Dal', '1 kg', 145, 24, 'kirana'],
  ['c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 'Fresh Tomatoes', '1 kg', 38, 28, 'vegetables'],
  ['c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'Banana', '1 dozen', 55, 20, 'vegetables'],
  ['c1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000002', 'Full Cream Milk', '1 litre', 68, 18, 'dairy'],
  ['c1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000003', 'Paracetamol 500 mg', '10 tablets', 22, 40, 'pharmacy'],
  ['c1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000003', 'Hand Sanitizer', '100 ml', 45, 25, 'pharmacy'],
  ['c1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000003', 'Vitamin C Tablets', '20 tablets', 85, 16, 'pharmacy'],
].map(([id, shopId, name, unit, price, stock, categoryId]) => ({
  id,
  shopId,
  name,
  categoryId,
  unit,
  price,
  stock,
  inStock: true,
  stockUpdatedAt: nowISO(),
  description: `${name} available at your local Agra shop.`,
  tags: [categoryId, 'agra'],
  archived: false,
})) as Product[]

const rider = (
  id: string,
  name: string,
  phone: string,
  vehicle: RiderProfile['vehicle'],
  pincode: string,
  status: RiderProfile['status'] = 'approved',
): RiderProfile => ({
  id,
  name,
  phone,
  collegeName: 'Agra Student Network',
  vehicle,
  city: 'Agra',
  district: 'Agra',
  pincode,
  serviceArea: 'Sikandra, Bodla, Sharda University area',
  availabilityHours: 'Flexible / Post-Classes',
  status,
  online: false,
  rating: status === 'approved' ? 4.8 : 0,
  totalDeliveries: status === 'approved' ? 24 : 0,
  idDocName: 'College Student ID Card',
  joinedAt: nowISO(),
})

const riders: RiderProfile[] = [
  rider('b1000000-0000-4000-8000-000000000001', 'Rahul Singh', '9100002001', 'bike', '282007'),
  rider('b1000000-0000-4000-8000-000000000002', 'Priya Yadav', '9100002002', 'scooter', '282005'),
  rider('b1000000-0000-4000-8000-000000000003', 'Arjun Kumar', '9100002003', 'cycle', '282001'),
  rider('b1000000-0000-4000-8000-000000000004', 'Mohit Verma', '9100002004', 'bike', '282005'),
  rider('b1000000-0000-4000-8000-000000000005', 'Pending Rider', '9100002005', 'bike', '282007', 'pending'),
]

export function seedDemoDataIfEmpty(): void {
  const catalog = useCatalogStore.getState()
  const hasAgraDemoShop = catalog.shops.some((item) => item.id === shops[0].id)
  if ((catalog.shops.length === 0 && catalog.products.length === 0) || !hasAgraDemoShop) {
    catalog.replaceCatalog(shops, products)
  }

  const delivery = useDeliveryStore.getState()
  const hasAgraDemoRider = delivery.riders.some((item) => item.id === riders[0].id)
  if ((delivery.riders.length === 0 && delivery.jobs.length === 0) || !hasAgraDemoRider) {
    delivery.replaceDelivery([], [], riders)
  }
}
