/** Shared domain types for the LocalizeIt demo frontend. */

export type Role = 'buyer' | 'shopkeeper' | 'rider' | 'admin'

export type Fulfilment = 'delivery' | 'pickup'

export type PaymentMethod = 'upi' | 'cod'

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'rejected'
  | 'cancelled'

export type ShopStatus = 'approved' | 'pending' | 'rejected' | 'suspended'

export type RiderStatus = 'approved' | 'pending' | 'rejected' | 'suspended'

export type VehicleType = 'cycle' | 'bike' | 'scooter' | 'auto'

export type Serviceability = 'full' | 'pickup' | 'none'

export interface Category {
  id: string
  name: string
  slug: string
  emoji: string
  tint: string
}

export interface ServiceArea {
  id: string
  state: string
  district: string
  town: string
  village: string
  pincode: string
  serviceability: Serviceability
  deliveryEtaMins: number
}

export interface Shop {
  id: string
  name: string
  tagline: string
  ownerName: string
  phone: string
  categoryId: string
  categoryName: string
  rating: number
  reviewCount: number
  distanceKm: number
  address: string
  village: string
  town: string
  district: string
  state: string
  pincode: string
  pickup: boolean
  delivery: boolean
  status: ShopStatus
  commissionPct: number
  open: boolean
  prepTimeMins: number
  since: number
  servicePins: string[]
  rejectionReason?: string
  tint: string
  accent: string
}

export interface ProductDeal {
  dealPrice: number
  expiresAt: string
  qtyLeft: number
}

export interface Product {
  id: string
  shopId: string
  name: string
  categoryId: string
  unit: string
  price: number
  mrp?: number
  stock: number
  inStock: boolean
  stockUpdatedAt: string
  expiry?: string
  description: string
  tags: string[]
  archived?: boolean
  deal?: ProductDeal
}

export interface Address {
  id: string
  label: string
  recipient: string
  phone: string
  line1: string
  landmark?: string
  village: string
  town: string
  district: string
  state: string
  pincode: string
  isDefault: boolean
}

export interface NotificationPrefs {
  orderUpdates: boolean
  deals: boolean
  newShops: boolean
  whatsapp: boolean
  sms: boolean
}

export interface BuyerProfile {
  id: string
  name: string
  phone: string
  email: string
  addresses: Address[]
  favouriteShopIds: string[]
  wishlistProductIds: string[]
  notifications: NotificationPrefs
  language: string
  avatarTint: string
  onboarded: boolean
}

export interface CartGroup {
  qty: Record<string, number>
  fulfilment: Fulfilment
}

export interface CartState {
  groups: Record<string, CartGroup>
}

export interface OrderLine {
  productId: string
  name: string
  unit: string
  price: number
  mrp?: number
  qty: number
  shopId: string
  categoryId: string
}

export interface StatusEvent {
  status: OrderStatus
  at: string
  note?: string
}

export interface ShopOrder {
  id: string
  shopId: string
  shopName: string
  shopTown: string
  items: OrderLine[]
  subtotal: number
  fulfilment: Fulfilment
  deliveryFee: number
  status: OrderStatus
  statusHistory: StatusEvent[]
  estimatedMins: number
  paymentMethod: PaymentMethod
  codAmount: number
  riderId?: string
  rejectionReason?: string
  note?: string
}

export interface PriceBreakdown {
  itemSubtotal: number
  platformFee: number
  deliveryTotal: number
  discount: number
  grandTotal: number
  codAmount: number
}

export interface Order {
  id: string
  buyerId: string
  buyerName: string
  buyerPhone: string
  address: Address
  shopOrders: ShopOrder[]
  breakdown: PriceBreakdown
  paymentMethod: PaymentMethod
  createdAt: string
  note?: string
  isDemo: true
}

export interface FeeConfig {
  platformFee: number
  freeFeeAbove: number
  nearDistanceKm: number
  deliveryFeeNear: number
  deliveryFeeFar: number
  shopCommissionPct: number
  codEnabled: boolean
  codMaxAmount: number
  pickupOnlyPrepaid: boolean
}

export type JobStatus = 'available' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled'

export interface DeliveryJob {
  id: string
  orderId: string
  shopOrderId: string
  shopId: string
  shopName: string
  pickupAddress: string
  dropAddress: string
  customerName: string
  customerPhone: string
  distanceKm: number
  payout: number
  codAmount: number
  itemCount: number
  status: JobStatus
  createdAt: string
  riderId?: string
  acceptedAt?: string
  pickedUpAt?: string
  deliveredAt?: string
  pickupNote: string
  dropNote: string
}

export interface CodEntry {
  id: string
  jobId: string
  orderId: string
  shopName: string
  customerName: string
  amount: number
  status: 'pending' | 'handed_over'
  collectedAt: string
  handedOverAt?: string
}

export interface RiderProfile {
  id: string
  name: string
  phone: string
  vehicle: VehicleType
  city: string
  district: string
  pincode: string
  serviceArea: string
  status: RiderStatus
  online: boolean
  rating: number
  totalDeliveries: number
  idDocName?: string
  joinedAt: string
  rejectionReason?: string
}

export interface Settlement {
  id: string
  party: 'shop' | 'rider'
  partyId: string
  partyName: string
  period: string
  grossSales: number
  commission: number
  refunds: number
  codCollected: number
  payout: number
  status: 'pending' | 'paid'
  paidAt?: string
}

export interface ActivityEntry {
  id: string
  actor: string
  role: Role | 'system'
  action: string
  targetType: 'order' | 'shop' | 'rider' | 'fee' | 'settlement' | 'product' | 'system'
  targetLabel: string
  description: string
  at: string
}

export interface AiComparisonRow {
  shopId: string
  shopName: string
  town: string
  distanceKm: number
  price: number
  unit: string
  inStock: boolean
  delivery: boolean
  deal?: boolean
}

export interface AiProductHit {
  productId: string
  name: string
  unit: string
  price: number
  mrp?: number
  shopId: string
  shopName: string
  distanceKm: number
  inStock: boolean
  stock: number
  explanation: string
  categoryId: string
}

export interface AiComparison {
  label: string
  rows: AiComparisonRow[]
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  hits?: AiProductHit[]
  comparison?: AiComparison
  clarification?: string[]
  suggestions?: string[]
  at: string
}

export interface CheckoutDraft {
  addressId: string
  paymentMethod: PaymentMethod
  note: string
}

export interface AnalyticsPoint {
  label: string
  value: number
  secondary?: number
}
