import type {
  Fulfilment,
  Order,
  OrderStatus,
  PaymentMethod,
  ShopOrder,
  StatusEvent,
} from '@/types'
import { isoMinutesAgo } from '@/utils'
import { seedFeeConfig, quoteCart, type GroupInput } from '@/services/feeService'
import { seedProducts } from './products'
import { seedShops } from './shops'
import { buyerById } from './people'

interface GroupSpec {
  shopId: string
  fulfilment: Fulfilment
  items: Array<[string, number]>
  status: OrderStatus
  rejectionReason?: string
  riderId?: string
}

interface OrderSpec {
  id: string
  buyerId: string
  minutesAgo: number
  payment: PaymentMethod
  groups: GroupSpec[]
  note?: string
}

const FLOW: OrderStatus[] = [
  'placed',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
]

function buildHistory(
  status: OrderStatus,
  createdAt: string,
  fulfilment: Fulfilment,
): StatusEvent[] {
  const base = new Date(createdAt).getTime()
  const step = 4 * 60_000

  if (status === 'rejected') {
    return [
      { status: 'placed', at: createdAt },
      { status: 'rejected', at: new Date(base + 3 * step).toISOString() },
    ]
  }
  if (status === 'cancelled') {
    return [
      { status: 'placed', at: createdAt },
      { status: 'cancelled', at: new Date(base + 2 * step).toISOString() },
    ]
  }

  const chain = fulfilment === 'pickup' ? FLOW.filter((s) => s !== 'picked_up') : FLOW
  const index = Math.max(0, chain.indexOf(status))
  return chain.slice(0, index + 1).map((s, i) => ({
    status: s,
    at: new Date(base + i * step).toISOString(),
  }))
}

function buildOrder(spec: OrderSpec): Order {
  const buyer = buyerById(spec.buyerId)!
  const createdAt = isoMinutesAgo(spec.minutesAgo)
  const groupInputs: GroupInput[] = spec.groups.map((group) => ({
    shopId: group.shopId,
    fulfilment: group.fulfilment,
    items: group.items.map(([productId, qty]) => ({ productId, qty })),
  }))

  const quote = quoteCart(groupInputs, seedProducts, seedShops, seedFeeConfig)
  const isCod = spec.payment === 'cod'

  const shopOrders: ShopOrder[] = quote.groups.map((quoteGroup, i) => {
    const specGroup = spec.groups.find((g) => g.shopId === quoteGroup.shopId)!
    const codShare = isCod
      ? quoteGroup.subtotal +
        quoteGroup.deliveryFee +
        (i === 0 ? quote.breakdown.platformFee : 0)
      : 0
    return {
      id: `${spec.id}-${quoteGroup.shopId.toUpperCase()}`,
      shopId: quoteGroup.shopId,
      shopName: quoteGroup.shop.name,
      shopTown: quoteGroup.shop.town,
      items: quoteGroup.items,
      subtotal: quoteGroup.subtotal,
      fulfilment: quoteGroup.fulfilment,
      deliveryFee: quoteGroup.deliveryFee,
      status: specGroup.status,
      statusHistory: buildHistory(specGroup.status, createdAt, quoteGroup.fulfilment),
      estimatedMins: quoteGroup.estimatedMins,
      paymentMethod: spec.payment,
      codAmount: Math.round(codShare),
      riderId: specGroup.riderId,
      rejectionReason: specGroup.rejectionReason,
      note: spec.note,
    }
  })

  return {
    id: spec.id,
    buyerId: buyer.id,
    buyerName: buyer.name,
    buyerPhone: buyer.phone,
    address: buyer.addresses[0],
    shopOrders,
    breakdown: {
      ...quote.breakdown,
      codAmount: isCod ? quote.breakdown.grandTotal : 0,
    },
    paymentMethod: spec.payment,
    createdAt,
    note: spec.note,
    isDemo: true,
  }
}

export const seedOrders: Order[] = [
  buildOrder({
    id: 'LZ-2401',
    buyerId: 'b1',
    minutesAgo: 2 * 24 * 60,
    payment: 'upi',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-rice', 1], ['p-s1-salt', 2]], status: 'delivered', riderId: 'r1' },
      { shopId: 's2', fulfilment: 'delivery', items: [['p-s2-milk', 2], ['p-s2-paneer', 1]], status: 'delivered', riderId: 'r1' },
    ],
    note: 'Please call before delivery.',
  }),
  buildOrder({
    id: 'LZ-2402',
    buyerId: 'b1',
    minutesAgo: 9,
    payment: 'upi',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-atta', 1], ['p-s1-oil', 1]], status: 'placed' },
      { shopId: 's3', fulfilment: 'delivery', items: [['p-s3-notebook', 2], ['p-s3-pen', 1]], status: 'accepted' },
    ],
  }),
  buildOrder({
    id: 'LZ-2403',
    buyerId: 'b2',
    minutesAgo: 36,
    payment: 'upi',
    groups: [
      { shopId: 's4', fulfilment: 'pickup', items: [['p-s4-potato', 2], ['p-s4-onion', 1]], status: 'accepted' },
      { shopId: 's11', fulfilment: 'pickup', items: [['p-s11-seeds', 2]], status: 'ready' },
    ],
  }),
  buildOrder({
    id: 'LZ-2404',
    buyerId: 'b1',
    minutesAgo: 52,
    payment: 'upi',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-sugar', 2], ['p-s1-tea', 1], ['p-s1-biscuit', 2]], status: 'preparing' },
    ],
  }),
  buildOrder({
    id: 'LZ-2405',
    buyerId: 'b3',
    minutesAgo: 72,
    payment: 'upi',
    groups: [
      { shopId: 's8', fulfilment: 'delivery', items: [['p-s8-rice', 2], ['p-s8-oil', 1], ['p-s8-sattu', 1]], status: 'ready' },
    ],
  }),
  buildOrder({
    id: 'LZ-2406',
    buyerId: 'b2',
    minutesAgo: 120,
    payment: 'upi',
    groups: [
      { shopId: 's4', fulfilment: 'pickup', items: [['p-s4-tomato', 1], ['p-s4-spinach', 2]], status: 'ready' },
    ],
  }),
  buildOrder({
    id: 'LZ-2407',
    buyerId: 'b1',
    minutesAgo: 180,
    payment: 'upi',
    groups: [
      {
        shopId: 's1',
        fulfilment: 'delivery',
        items: [['p-s1-detergent', 1]],
        status: 'rejected',
        rejectionReason: 'Surf Excel is out of stock today. Sorry for the inconvenience.',
      },
    ],
  }),
  buildOrder({
    id: 'LZ-2408',
    buyerId: 'b1',
    minutesAgo: 24 * 60,
    payment: 'cod',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-rice', 2], ['p-s1-dal', 1]], status: 'delivered', riderId: 'r1' },
    ],
  }),
  buildOrder({
    id: 'LZ-2409',
    buyerId: 'b1',
    minutesAgo: 5 * 60,
    payment: 'upi',
    groups: [
      { shopId: 's2', fulfilment: 'delivery', items: [['p-s2-lassi', 1]], status: 'cancelled' },
    ],
  }),
  buildOrder({
    id: 'LZ-2410',
    buyerId: 'b1',
    minutesAgo: 30,
    payment: 'upi',
    groups: [
      { shopId: 's2', fulfilment: 'delivery', items: [['p-s2-curd', 1], ['p-s2-ghee', 1]], status: 'picked_up', riderId: 'r1' },
    ],
  }),
  buildOrder({
    id: 'LZ-2411',
    buyerId: 'b1',
    minutesAgo: 26,
    payment: 'upi',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-soap', 1], ['p-s1-tea', 1]], status: 'accepted' },
    ],
  }),
  buildOrder({
    id: 'LZ-2412',
    buyerId: 'b1',
    minutesAgo: 90,
    payment: 'upi',
    groups: [
      { shopId: 's1', fulfilment: 'pickup', items: [['p-s1-besan', 1], ['p-s1-poha', 1]], status: 'ready' },
    ],
  }),
  buildOrder({
    id: 'LZ-2413',
    buyerId: 'b1',
    minutesAgo: 40,
    payment: 'upi',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-maggi', 2], ['p-s1-biscuit', 1]], status: 'ready' },
    ],
  }),
  buildOrder({
    id: 'LZ-2414',
    buyerId: 'b1',
    minutesAgo: 20,
    payment: 'upi',
    groups: [
      { shopId: 's9', fulfilment: 'delivery', items: [['p-s9-earphones', 1]], status: 'ready' },
    ],
  }),
  buildOrder({
    id: 'LZ-2415',
    buyerId: 'b2',
    minutesAgo: 3 * 24 * 60,
    payment: 'upi',
    groups: [
      { shopId: 's4', fulfilment: 'pickup', items: [['p-s4-potato', 3], ['p-s4-brinjal', 1]], status: 'delivered' },
    ],
  }),
  buildOrder({
    id: 'LZ-2416',
    buyerId: 'b3',
    minutesAgo: 4 * 24 * 60,
    payment: 'cod',
    groups: [
      { shopId: 's8', fulfilment: 'delivery', items: [['p-s8-chana', 1], ['p-s8-milk', 2]], status: 'delivered', riderId: 'r2' },
    ],
  }),
  buildOrder({
    id: 'LZ-2417',
    buyerId: 'b1',
    minutesAgo: 3 * 24 * 60 + 120,
    payment: 'cod',
    groups: [
      { shopId: 's1', fulfilment: 'delivery', items: [['p-s1-oil', 1]], status: 'delivered', riderId: 'r1' },
    ],
  }),
]

export const orderById = (id: string) => seedOrders.find((o) => o.id === id)

/** Derive new-order counts etc. from persisted orders. */
export function orderStatusSummary(orders: Order[], shopId?: string) {
  const shopOrders = orders.flatMap((o) => o.shopOrders).filter((so) => !shopId || so.shopId === shopId)
  return {
    total: shopOrders.length,
    placed: shopOrders.filter((so) => so.status === 'placed').length,
    accepted: shopOrders.filter((so) => so.status === 'accepted').length,
    preparing: shopOrders.filter((so) => so.status === 'preparing').length,
    ready: shopOrders.filter((so) => so.status === 'ready').length,
    picked_up: shopOrders.filter((so) => so.status === 'picked_up').length,
    delivered: shopOrders.filter((so) => so.status === 'delivered').length,
    rejected: shopOrders.filter((so) => so.status === 'rejected').length,
    cancelled: shopOrders.filter((so) => so.status === 'cancelled').length,
  }
}
