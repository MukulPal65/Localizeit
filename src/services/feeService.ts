import type {
  CartGroup,
  FeeConfig,
  Fulfilment,
  OrderLine,
  PriceBreakdown,
  Product,
  Shop,
} from '@/types'

/** Demo default — the admin Fees screen edits a persisted copy. */
export const seedFeeConfig: FeeConfig = {
  platformFee: 30,
  freeFeeAbove: 500,
  nearDistanceKm: 3,
  deliveryFeeNear: 30,
  deliveryFeeFar: 50,
  shopCommissionPct: 5,
  codEnabled: true,
  codMaxAmount: 2000,
  pickupOnlyPrepaid: true,
}

export interface GroupInput {
  shopId: string
  fulfilment: Fulfilment
  items: Array<{ productId: string; qty: number }>
}

export interface QuoteGroup {
  shopId: string
  shop: Shop
  items: OrderLine[]
  subtotal: number
  deliveryFee: number
  fulfilment: Fulfilment
  estimatedMins: number
}

export interface CartQuote {
  groups: QuoteGroup[]
  breakdown: PriceBreakdown
  dealSavings: number
}

export function effectivePrice(product: Product): number {
  return product.deal ? product.deal.dealPrice : product.price
}

export function deliveryFeeFor(shop: Shop, fulfilment: Fulfilment, config: FeeConfig): number {
  if (fulfilment === 'pickup') return 0
  if (!shop.delivery) return 0
  return shop.distanceKm <= config.nearDistanceKm
    ? config.deliveryFeeNear
    : config.deliveryFeeFar
}

export function estimateMinsFor(shop: Shop, fulfilment: Fulfilment): number {
  if (fulfilment === 'pickup') return shop.prepTimeMins
  return shop.prepTimeMins + 12 + Math.round(shop.distanceKm * 4)
}

export function quoteCart(
  groups: GroupInput[],
  products: Product[],
  shops: Shop[],
  config: FeeConfig,
): CartQuote {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const shopMap = new Map(shops.map((s) => [s.id, s]))

  const quoteGroups: QuoteGroup[] = []
  let itemSubtotal = 0
  let deliveryTotal = 0
  let dealSavings = 0

  for (const group of groups) {
    const shop = shopMap.get(group.shopId)
    if (!shop) continue
    const lines: OrderLine[] = []
    let subtotal = 0

    for (const item of group.items) {
      const product = productMap.get(item.productId)
      if (!product) continue
      const price = effectivePrice(product)
      const listPrice = product.mrp ?? product.price
      subtotal += price * item.qty
      dealSavings += Math.max(0, listPrice - price) * item.qty
      lines.push({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        price,
        mrp: product.mrp,
        qty: item.qty,
        shopId: shop.id,
        categoryId: product.categoryId,
      })
    }

    if (!lines.length) continue
    const fee = deliveryFeeFor(shop, group.fulfilment, config)
    deliveryTotal += fee
    itemSubtotal += subtotal

    quoteGroups.push({
      shopId: shop.id,
      shop,
      items: lines,
      subtotal,
      deliveryFee: fee,
      fulfilment: group.fulfilment,
      estimatedMins: estimateMinsFor(shop, group.fulfilment),
    })
  }

  const platformFee =
    quoteGroups.length === 0 || itemSubtotal >= config.freeFeeAbove ? 0 : config.platformFee

  const breakdown: PriceBreakdown = {
    itemSubtotal,
    platformFee,
    deliveryTotal,
    discount: dealSavings,
    grandTotal: itemSubtotal + platformFee + deliveryTotal,
    codAmount: 0,
  }

  return { groups: quoteGroups, breakdown, dealSavings }
}

/** Convert persisted cart state into service input. */
export function cartToGroups(cart: Record<string, CartGroup>): GroupInput[] {
  return Object.entries(cart)
    .map(([shopId, group]) => ({
      shopId,
      fulfilment: group.fulfilment,
      items: Object.entries(group.qty)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty })),
    }))
    .filter((group) => group.items.length > 0)
}

/** Platform fee stays free above the configured threshold. */
export function platformFeeFor(itemSubtotal: number, config: FeeConfig): number {
  return itemSubtotal >= config.freeFeeAbove ? 0 : config.platformFee
}

export function codEligible(
  paymentContext: { fulfilment: Fulfilment; grandTotal: number },
  config: FeeConfig,
): boolean {
  if (!config.codEnabled) return false
  if (paymentContext.fulfilment === 'pickup' && config.pickupOnlyPrepaid) return false
  return paymentContext.grandTotal <= config.codMaxAmount
}

export function isCodEligibleForOrder(
  fulfilments: Fulfilment[],
  grandTotal: number,
  config: FeeConfig,
): boolean {
  if (!config.codEnabled) return false
  if (config.pickupOnlyPrepaid && fulfilments.some((f) => f === 'pickup')) return false
  return grandTotal <= config.codMaxAmount
}
