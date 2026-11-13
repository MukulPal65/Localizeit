import type {
  Address,
  DeliveryJob,
  Order,
  OrderStatus,
  PaymentMethod,
  RiderStatus,
  ShopOrder,
} from '@/types'
import { makeId, nowISO } from '@/utils'
import { useActivityStore } from '@/store/activity'
import { useAuthStore } from '@/store/auth'
import { useBuyerStore } from '@/store/buyer'
import { useCartStore } from '@/store/cart'
import { useCatalogStore } from '@/store/catalog'
import { useDeliveryStore } from '@/store/delivery'
import { useFeeStore } from '@/store/fees'
import { useOrderStore } from '@/store/orders'
import { useToastStore } from '@/store/toast'
import { cartToGroups, estimateMinsFor, isCodEligibleForOrder, quoteCart } from './feeService'
import { isActiveStatus } from './orderService'

/**
 * Cross-role demo workflow. All four dashboards mutate the same persisted
 * stores through these functions, so an order placed by a buyer can be
 * accepted by a shop, delivered by a rider and audited by an admin.
 */

function log(entry: Parameters<ReturnType<typeof useActivityStore.getState>['log']>[0]) {
  useActivityStore.getState().log(entry)
}

function actorForShop(shopId: string): { name: string; shopName: string } {
  const shop = useCatalogStore.getState().shops.find((s) => s.id === shopId)
  return { name: shop?.ownerName ?? 'Shopkeeper', shopName: shop?.name ?? 'Shop' }
}

export interface PlaceOrderInput {
  addressId?: string
  paymentMethod: PaymentMethod
  note?: string
}

export interface PlaceOrderResult {
  ok: boolean
  orderId?: string
  error?: string
}

export function placeOrder(input: PlaceOrderInput): PlaceOrderResult {
  const buyer = useBuyerStore.getState().profile
  const address =
    buyer.addresses.find((a) => a.id === input.addressId) ??
    buyer.addresses.find((a) => a.isDefault) ??
    buyer.addresses[0]
  if (!address) {
    return { ok: false, error: 'Please add a delivery address before checkout.' }
  }

  const cart = useCartStore.getState().groups
  const groups = cartToGroups(cart)
  if (!groups.length) return { ok: false, error: 'Your cart is empty.' }

  const { shops, products } = useCatalogStore.getState()
  const feeConfig = useFeeStore.getState().config
  const quote = quoteCart(groups, products, shops, feeConfig)
  if (!quote.groups.length) return { ok: false, error: 'The items in your cart are no longer available.' }

  const fulfilments = quote.groups.map((g) => g.fulfilment)
  const eligibleCod = isCodEligibleForOrder(fulfilments, quote.breakdown.grandTotal, feeConfig)
  if (input.paymentMethod === 'cod' && !eligibleCod) {
    return {
      ok: false,
      error: 'Cash on delivery is not available for this cart. Choose UPI or remove pickup shops.',
    }
  }

  const orderId = makeId('LZ')
  const isCod = input.paymentMethod === 'cod'

  const shopOrders: ShopOrder[] = quote.groups.map((group, index) => {
    const codShare = isCod
      ? group.subtotal + group.deliveryFee + (index === 0 ? quote.breakdown.platformFee : 0)
      : 0
    const at = nowISO()
    return {
      id: `${orderId}-${group.shopId.toUpperCase()}`,
      shopId: group.shopId,
      shopName: group.shop.name,
      shopTown: group.shop.town,
      items: group.items,
      subtotal: group.subtotal,
      fulfilment: group.fulfilment,
      deliveryFee: group.deliveryFee,
      status: 'placed' as OrderStatus,
      statusHistory: [{ status: 'placed' as OrderStatus, at }],
      estimatedMins: estimateMinsFor(group.shop, group.fulfilment),
      paymentMethod: input.paymentMethod,
      codAmount: Math.round(codShare),
      note: input.note,
    }
  })

  const order: Order = {
    id: orderId,
    buyerId: buyer.id,
    buyerName: buyer.name,
    buyerPhone: buyer.phone,
    address,
    shopOrders,
    breakdown: {
      ...quote.breakdown,
      codAmount: isCod ? quote.breakdown.grandTotal : 0,
    },
    paymentMethod: input.paymentMethod,
    createdAt: nowISO(),
    note: input.note,
    isDemo: true,
  }

  useOrderStore.getState().addOrder(order)
  useCartStore.getState().clear()
  useToastStore.getState().push({
    title: 'Demo order placed',
    message: `${orderId} · no real payment was processed.`,
    tone: 'success',
  })
  log({
    actor: buyer.name,
    role: 'buyer',
    action: 'Order placed',
    targetType: 'order',
    targetLabel: orderId,
    description: `Placed a ${shopOrders.length}-shop demo order worth ₹${quote.breakdown.grandTotal}.`,
  })

  return { ok: true, orderId }
}

export function buyerCancelShopOrder(orderId: string, shopOrderId: string): boolean {
  const order = useOrderStore.getState().orders.find((o) => o.id === orderId)
  const shopOrder = order?.shopOrders.find((so) => so.id === shopOrderId)
  if (!order || !shopOrder) return false
  if (!['placed', 'accepted'].includes(shopOrder.status)) {
    useToastStore.getState().push({
      title: 'Cannot cancel now',
      message: 'The shop has already started preparing this order.',
      tone: 'error',
    })
    return false
  }
  useOrderStore.getState().setShopOrderStatus(orderId, shopOrderId, 'cancelled', {
    note: 'Cancelled by buyer',
  })
  useToastStore.getState().push({
    title: 'Shop order cancelled',
    message: `${shopOrder.shopName} · mock refund will be shown as pending.`,
    tone: 'info',
  })
  log({
    actor: order.buyerName,
    role: 'buyer',
    action: 'Order cancelled',
    targetType: 'order',
    targetLabel: orderId,
    description: `Cancelled the ${shopOrder.shopName} part of the order.`,
  })
  return true
}

interface AdvanceOptions {
  rejectionReason?: string
  note?: string
  actorRole?: 'shopkeeper' | 'rider' | 'admin' | 'system'
  actorName?: string
}

export function advanceShopOrder(
  orderId: string,
  shopOrderId: string,
  status: OrderStatus,
  opts: AdvanceOptions = {},
): void {
  const order = useOrderStore.getState().orders.find((o) => o.id === orderId)
  if (!order) return
  const shopOrder = order.shopOrders.find((so) => so.id === shopOrderId)
  if (!shopOrder) return

  useOrderStore.getState().setShopOrderStatus(orderId, shopOrderId, status, {
    rejectionReason: opts.rejectionReason,
    note: opts.note,
  })

  const actor = actorForShop(shopOrder.shopId)
  const updatedOrder = useOrderStore.getState().orders.find((o) => o.id === orderId)!
  const updatedShopOrder = updatedOrder.shopOrders.find((so) => so.id === shopOrderId)!

  if (status === 'ready' && shopOrder.fulfilment === 'delivery') {
    createJobForShopOrder(updatedOrder, updatedShopOrder)
  }

  log({
    actor: opts.actorName ?? actor.name,
    role: opts.actorRole ?? 'shopkeeper',
    action:
      status === 'rejected'
        ? 'Order rejected'
        : status === 'ready'
          ? shopOrder.fulfilment === 'pickup'
            ? 'Order ready for pickup'
            : 'Order ready for delivery'
          : status === 'delivered'
            ? 'Order completed'
            : `Order marked ${status}`,
    targetType: 'order',
    targetLabel: orderId,
    description: `${shopOrder.shopName} updated ${shopOrderId} to ${status}${
      opts.rejectionReason ? ` — ${opts.rejectionReason}` : ''
    }.`,
  })
}

function createJobForShopOrder(order: Order, shopOrder: ShopOrder): DeliveryJob | null {
  const shop = useCatalogStore.getState().shops.find((s) => s.id === shopOrder.shopId)
  if (!shop) return null
  const existing = useDeliveryStore
    .getState()
    .jobs.find((job) => job.shopOrderId === shopOrder.id)
  if (existing) return existing

  const distanceKm = Number((shop.distanceKm + 0.6).toFixed(1))
  const codAmount = shopOrder.codAmount
  const job: DeliveryJob = {
    id: makeId('JOB'),
    orderId: order.id,
    shopOrderId: shopOrder.id,
    shopId: shop.id,
    shopName: shop.name,
    pickupAddress: `${shop.address}, ${shop.town}`,
    dropAddress: [
      order.address.line1,
      order.address.village,
      order.address.town,
      order.address.pincode,
    ]
      .filter(Boolean)
      .join(', '),
    customerName: order.buyerName,
    customerPhone: order.buyerPhone,
    distanceKm,
    payout: 24 + Math.round(distanceKm * 3) + (codAmount > 0 ? 10 : 0),
    codAmount,
    itemCount: shopOrder.items.reduce((sum, item) => sum + item.qty, 0),
    status: 'available',
    createdAt: nowISO(),
    pickupNote: `Collect the sealed packet for ${order.id}. Show this job ID at the counter.`,
    dropNote: order.address.landmark
      ? `Landmark: ${order.address.landmark}. Call the customer on arrival.`
      : 'Call the customer on arrival.',
  }
  useDeliveryStore.getState().createJob(job)
  useToastStore.getState().push({
    title: 'Delivery job created',
    message: `${shop.name} · ₹${job.payout} payout for the rider pool.`,
    tone: 'info',
  })
  return job
}

export function acceptDeliveryJob(jobId: string, riderId: string): void {
  const job = useDeliveryStore.getState().jobs.find((j) => j.id === jobId)
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === riderId)
  if (!job || job.status !== 'available') return
  useDeliveryStore.getState().acceptJob(jobId, riderId)
  useOrderStore.getState().setShopOrderRider(job.orderId, job.shopOrderId, riderId)
  useToastStore.getState().push({
    title: 'Job accepted',
    message: `${job.shopName} → ${job.customerName}`,
    tone: 'success',
  })
  log({
    actor: rider?.name ?? 'Rider',
    role: 'rider',
    action: 'Delivery job accepted',
    targetType: 'order',
    targetLabel: job.orderId,
    description: `Accepted delivery for ${job.shopName} (₹${job.payout} payout).`,
  })
}

export function pickupDeliveryJob(jobId: string): void {
  const job = useDeliveryStore.getState().jobs.find((j) => j.id === jobId)
  if (!job || job.status !== 'accepted') return
  useDeliveryStore.getState().markPickedUp(jobId)
  useOrderStore.getState().setShopOrderStatus(job.orderId, job.shopOrderId, 'picked_up', {
    riderId: job.riderId,
  })
  useToastStore.getState().push({
    title: 'Picked up',
    message: 'Order is now in transit to the customer.',
    tone: 'success',
  })
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === job.riderId)
  log({
    actor: rider?.name ?? 'Rider',
    role: 'rider',
    action: 'Order picked up',
    targetType: 'order',
    targetLabel: job.orderId,
    description: `Picked up from ${job.shopName}.`,
  })
}

export function completeDeliveryJob(jobId: string): void {
  const job = useDeliveryStore.getState().jobs.find((j) => j.id === jobId)
  if (!job || job.status !== 'picked_up') return
  useDeliveryStore.getState().markDelivered(jobId)
  useOrderStore.getState().setShopOrderStatus(job.orderId, job.shopOrderId, 'delivered', {
    riderId: job.riderId,
  })
  const codMessage = job.codAmount > 0 ? `Collect ₹${job.codAmount} cash — added to COD tracker.` : 'Prepaid order, no cash collection.'
  useToastStore.getState().push({
    title: 'Delivery completed',
    message: codMessage,
    tone: 'success',
  })
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === job.riderId)
  log({
    actor: rider?.name ?? 'Rider',
    role: 'rider',
    action: 'Delivery completed',
    targetType: 'order',
    targetLabel: job.orderId,
    description: `Delivered ${job.shopName} order to ${job.customerName}. ${
      job.codAmount > 0 ? `COD ₹${job.codAmount} collected.` : ''
    }`,
  })
}

export function handOverCod(entryId: string): void {
  const entry = useDeliveryStore.getState().codEntries.find((e) => e.id === entryId)
  if (!entry) return
  useDeliveryStore.getState().handOverCod(entryId)
  useToastStore.getState().push({
    title: 'Cash handover recorded',
    message: `₹${entry.amount} marked as handed over (mock).`,
    tone: 'success',
  })
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === useAuthStore.getState().riderId)
  log({
    actor: rider?.name ?? 'Rider',
    role: 'rider',
    action: 'COD handed over',
    targetType: 'settlement',
    targetLabel: entry.id,
    description: `Handed over ₹${entry.amount} collected from ${entry.customerName}.`,
  })
}

export function assignJobToRider(jobId: string, riderId: string): void {
  const job = useDeliveryStore.getState().jobs.find((j) => j.id === jobId)
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === riderId)
  if (!job || !rider) return
  useDeliveryStore.getState().assignJob(jobId, riderId)
  useOrderStore.getState().setShopOrderRider(job.orderId, job.shopOrderId, riderId)
  useToastStore.getState().push({
    title: 'Rider assigned',
    message: `${rider.name} will handle ${job.orderId}.`,
    tone: 'success',
  })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Delivery assigned',
    targetType: 'order',
    targetLabel: job.orderId,
    description: `Assigned ${rider.name} to delivery ${job.id}.`,
  })
}

export function approveShop(shopId: string): void {
  const shop = useCatalogStore.getState().shops.find((s) => s.id === shopId)
  useCatalogStore.getState().setShopStatus(shopId, 'approved')
  useToastStore.getState().push({ title: 'Shop approved', message: shop?.name, tone: 'success' })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Shop approved',
    targetType: 'shop',
    targetLabel: shopId,
    description: `Approved ${shop?.name ?? shopId} for the ${shop?.town ?? 'local'} service area.`,
  })
}

export function rejectShop(shopId: string, reason: string): void {
  const shop = useCatalogStore.getState().shops.find((s) => s.id === shopId)
  useCatalogStore.getState().setShopStatus(shopId, 'rejected', reason)
  useToastStore.getState().push({
    title: 'Shop application rejected',
    message: 'Reason shared with the applicant.',
    tone: 'info',
  })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Shop rejected',
    targetType: 'shop',
    targetLabel: shopId,
    description: `Rejected ${shop?.name ?? shopId}: ${reason}`,
  })
}

export function setShopSuspension(shopId: string, suspend: boolean): void {
  const shop = useCatalogStore.getState().shops.find((s) => s.id === shopId)
  useCatalogStore.getState().setShopStatus(shopId, suspend ? 'suspended' : 'approved')
  useToastStore.getState().push({
    title: suspend ? 'Shop suspended' : 'Shop reinstated',
    message: shop?.name,
    tone: suspend ? 'warning' : 'success',
  })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: suspend ? 'Shop suspended' : 'Shop reinstated',
    targetType: 'shop',
    targetLabel: shopId,
    description: `${shop?.name ?? shopId} was ${suspend ? 'suspended' : 'reinstated'}.`,
  })
}

export function approveRider(riderId: string): void {
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === riderId)
  useDeliveryStore.getState().setRiderStatus(riderId, 'approved')
  useToastStore.getState().push({ title: 'Rider approved', message: rider?.name, tone: 'success' })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Rider approved',
    targetType: 'rider',
    targetLabel: riderId,
    description: `Approved ${rider?.name ?? riderId} for ${rider?.serviceArea ?? 'local deliveries'}.`,
  })
}

export function rejectRider(riderId: string, reason: string): void {
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === riderId)
  useDeliveryStore.getState().setRiderStatus(riderId, 'rejected', reason)
  useToastStore.getState().push({ title: 'Rider rejected', message: reason, tone: 'info' })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Rider rejected',
    targetType: 'rider',
    targetLabel: riderId,
    description: `Rejected ${rider?.name ?? riderId}: ${reason}`,
  })
}

export function setRiderSuspension(riderId: string, suspend: boolean): void {
  const rider = useDeliveryStore.getState().riders.find((r) => r.id === riderId)
  useDeliveryStore.getState().setRiderStatus(riderId, suspend ? 'suspended' : 'approved')
  useToastStore.getState().push({
    title: suspend ? 'Rider suspended' : 'Rider reinstated',
    message: rider?.name,
    tone: suspend ? 'warning' : 'success',
  })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: suspend ? 'Rider suspended' : 'Rider reinstated',
    targetType: 'rider',
    targetLabel: riderId,
    description: `${rider?.name ?? riderId} was ${suspend ? 'suspended' : 'reinstated'}.`,
  })
}

export function registerRider(input: {
  name: string
  phone: string
  vehicle: 'cycle' | 'bike' | 'scooter' | 'auto'
  city: string
  district: string
  pincode: string
  serviceArea: string
  idDocName: string
}): string {
  const riderId = makeId('RID')
  useDeliveryStore.getState().addRider({
    id: riderId,
    name: input.name,
    phone: input.phone,
    vehicle: input.vehicle,
    city: input.city,
    district: input.district,
    pincode: input.pincode,
    serviceArea: input.serviceArea,
    status: 'pending' as RiderStatus,
    online: false,
    rating: 0,
    totalDeliveries: 0,
    idDocName: input.idDocName,
    joinedAt: nowISO(),
  })
  useAuthStore.getState().setRiderId(riderId)
  useToastStore.getState().push({
    title: 'Application submitted',
    message: 'Mock verification is pending. You can explore the dashboard meanwhile.',
    tone: 'success',
  })
  log({
    actor: input.name,
    role: 'rider',
    action: 'Rider application submitted',
    targetType: 'rider',
    targetLabel: riderId,
    description: `Applied for ${input.serviceArea} with a ${input.vehicle}.`,
  })
  return riderId
}

export function applyShopApplication(input: {
  name: string
  ownerName: string
  phone: string
  categoryId: string
  categoryName: string
  address: string
  village: string
  town: string
  district: string
  state: string
  pincode: string
  pickup: boolean
  delivery: boolean
}): void {
  const shop = useCatalogStore.getState().shops.find((s) => s.id === useAuthStore.getState().shopId)
  if (!shop) return
  useCatalogStore.getState().updateShop(shop.id, {
    ...input,
    status: 'pending',
  })
  useToastStore.getState().push({
    title: 'Shop profile updated',
    message: 'Changes sent for mock re-verification.',
    tone: 'info',
  })
  log({
    actor: input.ownerName,
    role: 'shopkeeper',
    action: 'Shop application updated',
    targetType: 'shop',
    targetLabel: shop.id,
    description: `${input.name} resubmitted shop details for approval.`,
  })
}

export function updateFeeConfig(patch: Record<string, number | boolean>): void {
  useFeeStore.getState().update(patch)
  useToastStore.getState().push({
    title: 'Fee settings saved',
    message: 'Demo pricing rules updated for new checkouts.',
    tone: 'success',
  })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Fee configuration updated',
    targetType: 'fee',
    targetLabel: 'Checkout fees',
    description: `Updated ${Object.keys(patch).join(', ')}.`,
  })
}

export function addressLine(address: Address): string {
  return [address.line1, address.village, address.town, `${address.district}, ${address.state}`, address.pincode]
    .filter(Boolean)
    .join(', ')
}

export function activeShopOrdersForRider(orders: Order[], riderId: string, shopId?: string) {
  return orders.filter((order) =>
    order.shopOrders.some(
      (so) =>
        so.riderId === riderId &&
        isActiveStatus(so.status) &&
        (!shopId || so.shopId === shopId),
    ),
  )
}
