import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  MapPin,
  ReceiptText,
  RotateCcw,
  Search,
  Store,
} from 'lucide-react'
import type { Order } from '@/types'
import { buyerOrders, isOrderActive, aggregateStatus } from '@/services/orderService'
import { useBuyerStore } from '@/store/buyer'
import { useCartStore } from '@/store/cart'
import { useOrderStore } from '@/store/orders'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Tabs,
} from '@/components/ui/primitives'
import { OrderStatusBadge, OrderTimeline } from '@/components/shared/Misc'
import { cn, formatDate, formatINR, paymentLabels, timeAgo } from '@/utils'

type Filter = 'all' | 'active' | 'completed' | 'closed'

export function BuyerOrdersPage() {
  const navigate = useNavigate()
  const buyerId = useBuyerStore((s) => s.profile.id)
  const orders = useOrderStore((s) => s.orders)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const mine = useMemo(() => buyerOrders(orders, buyerId), [orders, buyerId])

  const counts = useMemo(
    () => ({
      all: mine.length,
      active: mine.filter(isOrderActive).length,
      completed: mine.filter((order) => aggregateStatus(order) === 'delivered').length,
      closed: mine.filter((order) => ['cancelled', 'rejected'].includes(aggregateStatus(order))).length,
    }),
    [mine],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return mine
      .filter((order) => {
        if (filter === 'active') return isOrderActive(order)
        if (filter === 'completed') return aggregateStatus(order) === 'delivered'
        if (filter === 'closed') return ['cancelled', 'rejected'].includes(aggregateStatus(order))
        return true
      })
      .filter((order) => {
        if (!term) return true
        const haystack = [order.id, ...order.shopOrders.map((so) => so.shopName)].join(' ').toLowerCase()
        return haystack.includes(term)
      })
  }, [mine, filter, query])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Your orders"
        subtitle="Every shop in a multi-shop order keeps its own independent status."
        action={
          <Link to="/buyer/shops">
            <Button size="sm" variant="secondary" leftIcon={Store}>
              Shop again
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-cream-4 bg-white/90 px-3">
          <Search className="h-4 w-4 text-brown-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order ID or shop…"
            aria-label="Search orders"
            className="h-full min-w-0 flex-1 bg-transparent text-xs text-brown-900 placeholder:text-brown-300 focus:outline-none"
          />
        </div>
        <Tabs
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
          items={[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'completed', label: 'Delivered', count: counts.completed },
            { id: 'closed', label: 'Closed', count: counts.closed },
          ]}
          className="mx-0"
        />
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title={mine.length === 0 ? 'No orders yet' : 'No orders in this view'}
            description={
              mine.length === 0
                ? 'Add items from nearby shops, choose pickup or delivery per shop, and check out once.'
                : 'Try another tab or clear the search to see all your demo orders.'
            }
            action={
              mine.length === 0 ? (
                <Button size="sm" onClick={() => navigate('/buyer/shops')}>
                  Browse nearby shops
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFilter('all')
                    setQuery('')
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-brown-300">
        Demo order history · statuses are updated by the shop, rider and admin dashboards.
      </p>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const navigate = useNavigate()
  const cartAdd = useCartStore((s) => s.add)
  const status = aggregateStatus(order)
  const itemCount = order.shopOrders.reduce(
    (sum, so) => sum + so.items.reduce((inner, item) => inner + item.qty, 0),
    0,
  )
  const liveShopOrders = order.shopOrders.filter((so) => !['rejected', 'cancelled'].includes(so.status))

  const reorder = () => {
    let added = 0
    for (const shopOrder of liveShopOrders) {
      for (const item of shopOrder.items) {
        cartAdd(item.productId, shopOrder.shopId, item.qty)
        added += item.qty
      }
    }
    if (added) {
      toast('Added to cart again', `${added} item${added === 1 ? '' : 's'} from ${liveShopOrders.length} shop${liveShopOrders.length === 1 ? '' : 's'}.`, 'success')
      navigate('/buyer/cart')
    } else {
      toast('Nothing to reorder', 'This order was fully rejected or cancelled.', 'info')
    }
  }

  return (
    <Card className={cn('overflow-hidden p-0', isOrderActive(order) && 'border-orange-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cream-3 bg-cream-2/40 px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/buyer/orders/${order.id}`} className="font-heading text-sm font-semibold text-brown-900 hover:text-orange-600">
              {order.id}
            </Link>
            <OrderStatusBadge status={status} />
            {order.paymentMethod === 'cod' && <Badge tone="warning">COD</Badge>}
          </div>
          <p className="mt-0.5 text-[10px] text-brown-400">
            {formatDate(order.createdAt)} · {timeAgo(order.createdAt)} · {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
            {paymentLabels[order.paymentMethod]}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-base font-semibold text-brown-900">{formatINR(order.breakdown.grandTotal)}</p>
          <p className="text-[9px] text-brown-300">incl. fees</p>
        </div>
      </div>

      <div className="divide-y divide-cream-2">
        {order.shopOrders.map((shopOrder) => (
          <div key={shopOrder.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream-2 text-brown-500">
              <Store className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <Link
                  to={`/buyer/shops/${shopOrder.shopId}`}
                  className="truncate text-xs font-medium text-brown-800 hover:text-orange-600"
                >
                  {shopOrder.shopName}
                </Link>
                <OrderStatusBadge status={shopOrder.status} short />
              </div>
              <p className="mt-0.5 truncate text-[10px] text-brown-400">
                {shopOrder.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
              </p>
              <div className="mt-1.5 max-w-[260px]">
                <OrderTimeline shopOrder={shopOrder} compact />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-semibold text-brown-700">{formatINR(shopOrder.subtotal)}</p>
              <p className="text-[9px] text-brown-300">{shopOrder.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-3 px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] text-brown-400">
          <MapPin className="h-3 w-3" /> {order.address.label}, {order.address.town} — {order.address.pincode}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={reorder}>
            Reorder
          </Button>
          <Link to={`/buyer/orders/${order.id}`}>
            <Button size="sm" rightIcon={ArrowRight}>
              {isOrderActive(order) ? 'Track order' : 'View details'}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
