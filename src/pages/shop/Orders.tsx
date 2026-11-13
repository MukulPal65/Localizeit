import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  MapPin,
  Package,
  Phone,
  Search,
  Store,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import type { Order, OrderStatus, ShopOrder } from '@/types'
import { advanceShopOrder } from '@/services/workflow'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { useOrderStore } from '@/store/orders'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Tabs,
  Textarea,
} from '@/components/ui/primitives'
import { OrderStatusBadge, OrderTimeline } from '@/components/shared/Misc'
import { DemoNote, InfoBanner, SearchInput } from '@/components/shared/dashboard'
import { cn, downloadCsv, formatDateTime, formatINR, timeAgo } from '@/utils'

interface Row {
  order: Order
  shopOrder: ShopOrder
}

type Filter = 'all' | 'new' | 'active' | 'ready' | 'completed' | 'closed'

const filterMatch: Record<Filter, (status: OrderStatus) => boolean> = {
  all: () => true,
  new: (status) => status === 'placed',
  active: (status) => status === 'accepted' || status === 'preparing',
  ready: (status) => status === 'ready' || status === 'picked_up',
  completed: (status) => status === 'delivered',
  closed: (status) => status === 'rejected' || status === 'cancelled',
}

const rejectReasons = [
  'Items are out of stock right now.',
  'Shop is closed or too busy to fulfil this order.',
  'Delivery PIN code is outside our serviceable radius.',
  'Customer asked us to cancel.',
]

export function ShopOrdersPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shop = useCatalogStore((s) => s.shops.find((item) => item.id === shopId))
  const orders = useOrderStore((s) => s.orders)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [rejectRow, setRejectRow] = useState<Row | null>(null)
  const [reason, setReason] = useState(rejectReasons[0])
  const [detailRow, setDetailRow] = useState<Row | null>(null)

  const rows = useMemo<Row[]>(
    () =>
      orders
        .flatMap((order) =>
          order.shopOrders
            .filter((shopOrder) => shopOrder.shopId === shopId)
            .map((shopOrder) => ({ order, shopOrder })),
        )
        .sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt)),
    [orders, shopId],
  )

  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>
    ;(Object.keys(filterMatch) as Filter[]).forEach((key) => {
      result[key] = rows.filter((row) => filterMatch[key](row.shopOrder.status)).length
    })
    return result
  }, [rows])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows
      .filter((row) => filterMatch[filter](row.shopOrder.status))
      .filter((row) => {
        if (!term) return true
        const haystack = [
          row.order.id,
          row.order.buyerName,
          row.order.buyerPhone,
          row.shopOrder.id,
          ...row.shopOrder.items.map((item) => item.name),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(term)
      })
  }, [rows, filter, query])

  const acceptAll = () => {
    const fresh = rows.filter((row) => row.shopOrder.status === 'placed')
    if (!fresh.length) {
      toast('Nothing new to accept', 'There are no new orders in the queue.', 'info')
      return
    }
    fresh.forEach((row) => advanceShopOrder(row.order.id, row.shopOrder.id, 'accepted'))
    toast(`${fresh.length} orders accepted`, 'Each buyer now sees that their shop accepted the order.')
  }

  const exportCsv = () => {
    downloadCsv(
      `${shop?.name ?? 'shop'}-orders.csv`,
      visible.map((row) => ({
        order: row.order.id,
        shopOrder: row.shopOrder.id,
        buyer: row.order.buyerName,
        phone: row.order.buyerPhone,
        status: row.shopOrder.status,
        fulfilment: row.shopOrder.fulfilment,
        payment: row.shopOrder.paymentMethod,
        items: row.shopOrder.items.map((item) => `${item.name} x${item.qty}`).join(' | '),
        subtotal: row.shopOrder.subtotal,
        deliveryFee: row.shopOrder.deliveryFee,
        createdAt: formatDateTime(row.order.createdAt),
      })),
    )
    toast('Order CSV exported', `${visible.length} rows downloaded.`, 'success')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        subtitle="Every buyer order is split by shop. Only your shop’s packet appears here."
        action={
          <>
            <Button variant="secondary" size="sm" leftIcon={Download} onClick={exportCsv} disabled={!visible.length}>
              Export
            </Button>
            <Button size="sm" leftIcon={CheckCircle2} onClick={acceptAll}>
              Accept all new
            </Button>
          </>
        }
      />

      {shop && shop.status !== 'approved' && (
        <InfoBanner tone="warning" title="Approval pending">
          You can still prepare your queue, but new buyer orders only arrive after the demo admin approves the shop.
        </InfoBanner>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search order ID, buyer, item…"
            ariaLabel="Search shop orders"
          />
          <Tabs
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'new', label: 'New', count: counts.new },
              { id: 'active', label: 'In progress', count: counts.active },
              { id: 'ready', label: 'Ready', count: counts.ready },
              { id: 'completed', label: 'Delivered', count: counts.completed },
              { id: 'closed', label: 'Closed', count: counts.closed },
            ]}
            className="mx-0"
          />
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={rows.length === 0 ? 'No orders yet' : 'No orders in this view'}
            description={
              rows.length === 0
                ? 'Switch to the buyer demo role, add products from this shop and place an order. It will appear here instantly.'
                : 'Try another tab or clear the search to see all shop orders.'
            }
            action={
              rows.length === 0 ? (
                <Link to="/shop">
                  <Button size="sm" variant="secondary">
                    Back to overview
                  </Button>
                </Link>
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
        <div className="space-y-2.5">
          {visible.map((row) => (
            <OrderRow
              key={`${row.order.id}-${row.shopOrder.id}`}
              row={row}
              onReject={() => {
                setReason(rejectReasons[0])
                setRejectRow(row)
              }}
              onDetail={() => setDetailRow(row)}
            />
          ))}
        </div>
      )}

      <DemoNote>
        Status buttons update the shared demo state — the buyer, rider and admin see the same change.
      </DemoNote>

      <Modal
        open={Boolean(rejectRow)}
        onClose={() => setRejectRow(null)}
        title={`Reject order ${rejectRow?.order.id ?? ''}?`}
        description="The buyer sees your reason. The rest of their multi-shop order is not affected."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejectRow(null)}>
              Keep order
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={XCircle}
              onClick={() => {
                if (!rejectRow) return
                advanceShopOrder(rejectRow.order.id, rejectRow.shopOrder.id, 'rejected', {
                  rejectionReason: reason,
                })
                toast('Order rejected', rejectRow.order.buyerName + ' will see the reason.', 'info')
                setRejectRow(null)
              }}
            >
              Reject order
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-brown-600">Quick reasons</p>
            <div className="flex flex-wrap gap-1.5">
              {rejectReasons.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setReason(option)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-left text-[10px] transition-colors',
                    reason === option
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-cream-3 bg-white text-brown-500',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Reason sent to the buyer"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title={detailRow ? `Order ${detailRow.order.id}` : 'Order details'}
        description="Full demo packet for your shop only."
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setDetailRow(null)}>
            Close
          </Button>
        }
      >
        {detailRow && <OrderDetailBody row={detailRow} />}
      </Modal>
    </div>
  )
}

function OrderRow({ row, onReject, onDetail }: { row: Row; onReject: () => void; onDetail: () => void }) {
  const { order, shopOrder } = row
  const items = shopOrder.items.reduce((sum, item) => sum + item.qty, 0)

  return (
    <Card className={cn('overflow-hidden p-0', shopOrder.status === 'placed' && 'border-orange-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cream-3 bg-cream-2/40 px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onDetail}
              className="font-heading text-sm font-semibold text-brown-900 hover:text-orange-600"
            >
              {order.id}
            </button>
            <OrderStatusBadge status={shopOrder.status} short />
            <Badge tone={shopOrder.fulfilment === 'pickup' ? 'info' : 'success'}>
              {shopOrder.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}
            </Badge>
            {shopOrder.paymentMethod === 'cod' && <Badge tone="warning">COD {formatINR(shopOrder.codAmount)}</Badge>}
          </div>
          <p className="mt-0.5 text-[10px] text-brown-400">
            {order.buyerName} · {order.buyerPhone} · {timeAgo(order.createdAt)} ·{' '}
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-base font-semibold text-brown-900">{formatINR(shopOrder.subtotal)}</p>
          <p className="text-[9px] text-brown-300">
            + {shopOrder.deliveryFee === 0 ? 'free delivery' : formatINR(shopOrder.deliveryFee)} · {items} item
            {items === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-3.5 sm:grid-cols-[1fr_190px]">
        <div className="min-w-0">
          <div className="space-y-1">
            {shopOrder.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate text-brown-600">
                  {item.name} <span className="text-brown-300">· {item.unit} × {item.qty}</span>
                </span>
                <span className="shrink-0 font-medium text-brown-800">{formatINR(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-lg bg-cream-2/60 px-2.5 py-2 text-[10px] leading-relaxed text-brown-500">
            {shopOrder.fulfilment === 'pickup' ? (
              <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
            ) : (
              <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            )}
            <span>
              {shopOrder.fulfilment === 'pickup'
                ? `Customer will collect from the counter. Show order ${shopOrder.id}.`
                : `Drop at ${order.address.line1}, ${order.address.town} — ${order.address.pincode}`}
              {shopOrder.note ? ` · Note: ${shopOrder.note}` : ''}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {shopOrder.status === 'placed' && (
              <>
                <Button variant="ghost" size="sm" leftIcon={X} onClick={onReject}>
                  Reject
                </Button>
                <Button
                  size="sm"
                  leftIcon={Check}
                  onClick={() => advanceShopOrder(order.id, shopOrder.id, 'accepted')}
                >
                  Accept order
                </Button>
              </>
            )}
            {shopOrder.status === 'accepted' && (
              <Button
                size="sm"
                leftIcon={Package}
                onClick={() => advanceShopOrder(order.id, shopOrder.id, 'preparing')}
              >
                Start preparing
              </Button>
            )}
            {shopOrder.status === 'preparing' && (
              <Button
                size="sm"
                leftIcon={Clock}
                onClick={() => {
                  advanceShopOrder(order.id, shopOrder.id, 'ready')
                  toast(
                    'Order marked ready',
                    shopOrder.fulfilment === 'delivery'
                      ? 'A demo rider job was added to the pickup pool.'
                      : 'The buyer can now collect from your counter.',
                    'success',
                  )
                }}
              >
                Mark ready
              </Button>
            )}
            {shopOrder.status === 'ready' && shopOrder.fulfilment === 'pickup' && (
              <Button
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => advanceShopOrder(order.id, shopOrder.id, 'delivered')}
              >
                Handed over to customer
              </Button>
            )}
            {(shopOrder.status === 'ready' || shopOrder.status === 'picked_up') &&
              shopOrder.fulfilment === 'delivery' && (
                <Badge tone="info">
                  <Truck className="h-2.5 w-2.5" />
                  {shopOrder.status === 'picked_up' ? 'Rider is delivering' : 'Waiting for rider pickup'}
                </Badge>
              )}
            <Button variant="ghost" size="sm" leftIcon={FileText} onClick={onDetail}>
              Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Phone}
              onClick={() => toast(`Calling ${order.buyerName}`, `${order.buyerPhone} · simulated call.`, 'info')}
            >
              Call buyer
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-cream-3 bg-cream-2/30 p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-brown-400">Timeline</p>
          <div className="mt-2">
            <OrderTimeline shopOrder={shopOrder} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function OrderDetailBody({ row }: { row: Row }) {
  const { order, shopOrder } = row
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={shopOrder.status} />
        <Badge tone={shopOrder.fulfilment === 'pickup' ? 'info' : 'success'}>
          {shopOrder.fulfilment === 'pickup' ? 'Self pickup' : 'Home delivery'}
        </Badge>
        <Badge tone={shopOrder.paymentMethod === 'cod' ? 'warning' : 'neutral'}>
          {shopOrder.paymentMethod === 'cod' ? `COD ${formatINR(shopOrder.codAmount)}` : 'Prepaid (mock UPI)'}
        </Badge>
        <Badge tone="neutral">Slot ~{shopOrder.estimatedMins} min</Badge>
      </div>

      <div className="rounded-xl border border-cream-3 bg-white/70 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-400">Items</p>
        <div className="mt-2 space-y-1.5">
          {shopOrder.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-brown-600">
                {item.name} <span className="text-brown-300">· {item.unit} × {item.qty}</span>
              </span>
              <span className="font-medium text-brown-800">{formatINR(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t border-dashed border-cream-4 pt-1.5 text-[11px]">
            <span className="text-brown-500">Delivery fee</span>
            <span className="font-medium text-brown-800">
              {shopOrder.deliveryFee === 0 ? 'FREE' : formatINR(shopOrder.deliveryFee)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-brown-700">Shop subtotal</span>
            <span className="font-heading font-semibold text-brown-900">{formatINR(shopOrder.subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-cream-3 bg-white/70 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brown-400">
            <MapPin className="h-3 w-3" /> {shopOrder.fulfilment === 'pickup' ? 'Pickup by' : 'Deliver to'}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-brown-800">{order.address.recipient}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-brown-500">
            {order.address.line1}
            {order.address.landmark ? `, ${order.address.landmark}` : ''}
            {order.address.village ? `, ${order.address.village}` : ''}
            <br />
            {order.address.town}, {order.address.district}, {order.address.state} — {order.address.pincode}
          </p>
          <p className="mt-1 text-[11px] font-medium text-brown-700">{order.address.phone}</p>
        </div>

        <div className="rounded-xl border border-cream-3 bg-white/70 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brown-400">
            <Search className="h-3 w-3" /> Demo identifiers
          </p>
          <div className="mt-1.5 space-y-1 text-[11px] text-brown-500">
            <p className="flex justify-between gap-2">
              <span>Order</span>
              <span className="font-mono text-brown-800">{order.id}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Shop packet</span>
              <span className="font-mono text-brown-800">{shopOrder.id}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Placed</span>
              <span className="text-brown-800">{formatDateTime(order.createdAt)}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Buyer</span>
              <span className="text-brown-800">{order.buyerName}</span>
            </p>
          </div>
          {order.note && (
            <p className="mt-2 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[10px] text-orange-700">
              Buyer note: {order.note}
            </p>
          )}
        </div>
      </div>

      {shopOrder.status !== 'rejected' && shopOrder.status !== 'cancelled' && (
        <div className="rounded-xl border border-cream-3 bg-cream-2/30 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-brown-400">Status timeline</p>
          <OrderTimeline shopOrder={shopOrder} />
        </div>
      )}
    </div>
  )
}
