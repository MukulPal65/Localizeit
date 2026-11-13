import type { Order, OrderStatus } from '@/types'

export const ACTIVE_STATUSES: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'picked_up']

export function isActiveStatus(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status)
}

/** Buyer-facing status for a multi-shop order. */
export function aggregateStatus(order: Order): OrderStatus {
  const statuses = order.shopOrders.map((so) => so.status)
  if (!statuses.length) return 'placed'
  if (statuses.every((s) => s === 'delivered')) return 'delivered'
  if (statuses.every((s) => s === 'cancelled')) return 'cancelled'
  if (statuses.every((s) => s === 'rejected')) return 'rejected'
  if (statuses.some((s) => s === 'picked_up')) return 'picked_up'
  if (statuses.some((s) => s === 'ready')) return 'ready'
  if (statuses.some((s) => s === 'preparing')) return 'preparing'
  if (statuses.some((s) => s === 'accepted')) return 'accepted'
  return 'placed'
}

export function isOrderActive(order: Order): boolean {
  return order.shopOrders.some((so) => isActiveStatus(so.status))
}

export function buyerOrders(orders: Order[], buyerId: string): Order[] {
  return orders.filter((o) => o.buyerId === buyerId)
}

export function orderGmv(orders: Order[]): number {
  return orders.reduce((sum, order) => {
    const live = order.shopOrders.filter((so) => so.status !== 'cancelled' && so.status !== 'rejected')
    return sum + live.reduce((s, so) => s + so.subtotal + so.deliveryFee, 0)
  }, 0)
}

export function completedGmv(orders: Order[]): number {
  return orders.reduce((sum, order) => {
    const delivered = order.shopOrders.filter((so) => so.status === 'delivered')
    return sum + delivered.reduce((s, so) => s + so.subtotal + so.deliveryFee, 0)
  }, 0)
}

export function totalPlatformFees(orders: Order[]): number {
  return orders.reduce((sum, order) => {
    const active = order.shopOrders.some((so) => so.status !== 'cancelled' && so.status !== 'rejected')
    return sum + (active ? order.breakdown.platformFee : 0)
  }, 0)
}

export function codOutstanding(orders: Order[], settledCodIds: Set<string>): number {
  return orders.reduce((sum, order) => {
    if (order.paymentMethod !== 'cod') return sum
    const live = order.shopOrders.filter((so) => so.status === 'delivered')
    if (!live.length) return sum
    if (settledCodIds.has(order.id)) return sum
    return sum + order.breakdown.codAmount
  }, 0)
}

export function ordersForShop(orders: Order[], shopId: string): Order[] {
  return orders.filter((o) => o.shopOrders.some((so) => so.shopId === shopId))
}

export function shopOrderRevenue(orders: Order[], shopId: string) {
  const rows = orders.flatMap((o) =>
    o.shopOrders.filter((so) => so.shopId === shopId && so.status === 'delivered'),
  )
  const gross = rows.reduce((sum, so) => sum + so.subtotal, 0)
  const delivery = rows.reduce((sum, so) => sum + so.deliveryFee, 0)
  return { orders: rows.length, gross, delivery }
}

export function statusCounts(orders: Order[], shopId?: string) {
  const rows = orders.flatMap((o) => o.shopOrders).filter((so) => !shopId || so.shopId === shopId)
  return {
    all: rows.length,
    placed: rows.filter((r) => r.status === 'placed').length,
    accepted: rows.filter((r) => r.status === 'accepted').length,
    preparing: rows.filter((r) => r.status === 'preparing').length,
    ready: rows.filter((r) => r.status === 'ready').length,
    picked_up: rows.filter((r) => r.status === 'picked_up').length,
    delivered: rows.filter((r) => r.status === 'delivered').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  }
}
