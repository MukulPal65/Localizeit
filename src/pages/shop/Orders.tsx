import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  HelpCircle,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import type { Order, OrderStatus, Product, ShopOrder } from '@/types'
import { advanceShopOrder } from '@/services/workflow'
import { proposeProductSubstitution } from '@/services/supabaseService'
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
  'Customer requested cancellation.',
]

export function ShopOrdersPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shop = useCatalogStore((s) => s.shops.find((item) => item.id === shopId))
  const allProducts = useCatalogStore((s) => s.products)
  const orders = useOrderStore((s) => s.orders)

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [rejectRow, setRejectRow] = useState<Row | null>(null)
  const [reason, setReason] = useState(rejectReasons[0])
  const [detailRow, setDetailRow] = useState<Row | null>(null)

  // Substitution state
  const [substitutionRow, setSubstitutionRow] = useState<Row | null>(null)
  const [selectedOriginalId, setSelectedOriginalId] = useState('')
  const [selectedSubProduct, setSelectedSubProduct] = useState<Product | null>(null)
  const [substitutePrice, setSubstitutePrice] = useState<number>(0)

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

  const products = useMemo(
    () => allProducts.filter((product) => product.shopId === shopId && !product.archived),
    [allProducts, shopId],
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
    toast(`${fresh.length} orders accepted`, 'Buyers have been notified.')
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

  const handleProposeSub = async () => {
    if (!substitutionRow || !selectedOriginalId || !selectedSubProduct) return
    const originalItem = substitutionRow.shopOrder.items.find((i) => i.productId === selectedOriginalId)
    if (!originalItem) return

    await proposeProductSubstitution(substitutionRow.order.id, substitutionRow.shopOrder.id, {
      originalProductId: originalItem.productId,
      originalProductName: originalItem.name,
      substituteProductId: selectedSubProduct.id,
      substituteProductName: selectedSubProduct.name,
      substitutePrice: substitutePrice || selectedSubProduct.price,
    })

    setSubstitutionRow(null)
    setSelectedOriginalId('')
    setSelectedSubProduct(null)
  }

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Order Management"
        subtitle="Process incoming store orders, manage out-of-stock items, and propose buyer substitutions."
        action={
          <>
            <Button variant="secondary" size="sm" leftIcon={Download} onClick={exportCsv} disabled={!visible.length}>
              Export
            </Button>
            <Button size="sm" leftIcon={CheckCircle2} onClick={acceptAll}>
              Accept All New
            </Button>
          </>
        }
      />

      {shop && shop.status !== 'approved' && (
        <InfoBanner tone="warning" title="Store Registration Pending Review">
          Your shop is awaiting Super Admin verification. You can test order operations in preview mode.
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
                ? 'When buyers place an order containing items from your shop, it will appear here instantly.'
                : 'Try switching tabs or resetting your search query.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <OrderRow
              key={`${row.order.id}-${row.shopOrder.id}`}
              row={row}
              onReject={() => {
                setReason(rejectReasons[0])
                setRejectRow(row)
              }}
              onDetail={() => setDetailRow(row)}
              onProposeSubstitution={() => {
                setSubstitutionRow(row)
                if (row.shopOrder.items[0]) {
                  setSelectedOriginalId(row.shopOrder.items[0].productId)
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Reject Order Modal */}
      <Modal
        open={Boolean(rejectRow)}
        onClose={() => setRejectRow(null)}
        title={`Reject order ${rejectRow?.order.id ?? ''}?`}
        description="The customer will see your rejection reason. Other shop orders in this checkout are unaffected."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejectRow(null)}>
              Keep Order
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
                toast('Order rejected', rejectRow.order.buyerName + ' was notified.', 'info')
                setRejectRow(null)
              }}
            >
              Reject Order
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
                      ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                      : 'border-cream-3 bg-white text-brown-500',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Reason sent to the customer"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* Product Substitution Modal */}
      <Modal
        open={Boolean(substitutionRow)}
        onClose={() => setSubstitutionRow(null)}
        title="Propose Product Substitution"
        description="Suggest a suitable alternative item. The substitution only applies after the buyer explicitly approves it."
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setSubstitutionRow(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!selectedOriginalId || !selectedSubProduct}
              onClick={handleProposeSub}
              leftIcon={Sparkles}
            >
              Send Proposal to Buyer
            </Button>
          </>
        }
      >
        {substitutionRow && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">
                Select Item That Is Unavailable:
              </label>
              <select
                value={selectedOriginalId}
                onChange={(e) => setSelectedOriginalId(e.target.value)}
                className="w-full rounded-xl border border-cream-4 bg-white p-2.5 text-xs text-brown-900"
              >
                {substitutionRow.shopOrder.items.map((it) => (
                  <option key={it.productId} value={it.productId}>
                    {it.name} ({it.unit}) — {formatINR(it.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">
                Choose Alternative From Your Catalog:
              </label>
              <select
                value={selectedSubProduct?.id ?? ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === e.target.value) || null
                  setSelectedSubProduct(p)
                  if (p) setSubstitutePrice(p.price)
                }}
                className="w-full rounded-xl border border-cream-4 bg-white p-2.5 text-xs text-brown-900"
              >
                <option value="">Choose replacement product...</option>
                {products
                  .filter((p) => p.id !== selectedOriginalId && p.inStock)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit}) — {formatINR(p.price)} (Stock: {p.stock})
                    </option>
                  ))}
              </select>
            </div>

            {selectedSubProduct && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
                <p className="text-xs font-bold text-brown-900">Proposed Replacement Price:</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brown-600">₹</span>
                  <input
                    type="number"
                    value={substitutePrice}
                    onChange={(e) => setSubstitutePrice(Number(e.target.value))}
                    className="w-28 rounded-lg border border-cream-4 bg-white px-2.5 py-1 text-xs font-bold text-brown-900"
                  />
                  <span className="text-[11px] text-brown-400">
                    Standard price: {formatINR(selectedSubProduct.price)}
                  </span>
                </div>
                <p className="text-[10px] text-orange-700">
                  Note: The customer must tap 'Accept' on their tracking screen before this substitution modifies the order total.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Order Detail Modal */}
      <Modal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title={detailRow ? `Order ${detailRow.order.id}` : 'Order Details'}
        description="Comprehensive merchant order manifest."
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setDetailRow(null)}>
            Close
          </Button>
        }
      >
        {detailRow && <OrderDetailBody row={detailRow} />}
      </Modal>

      <DemoNote>Order status updates synchronize in real-time across customer, delivery partner and admin consoles.</DemoNote>
    </div>
  )
}

function OrderRow({
  row,
  onReject,
  onDetail,
  onProposeSubstitution,
}: {
  row: Row
  onReject: () => void
  onDetail: () => void
  onProposeSubstitution: () => void
}) {
  const { order, shopOrder } = row
  const items = shopOrder.items.reduce((sum, item) => sum + item.qty, 0)

  return (
    <Card className={cn('overflow-hidden p-0', shopOrder.status === 'placed' && 'border-orange-300 shadow-soft')}>
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
              {shopOrder.fulfilment === 'pickup' ? 'Counter Pickup' : 'Student Delivery'}
            </Badge>
            {shopOrder.paymentMethod === 'cod' && (
              <Badge tone="warning">COD {formatINR(shopOrder.codAmount)}</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-brown-400">
            {order.buyerName} · {order.buyerPhone} · {timeAgo(order.createdAt)} ·{' '}
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-base font-semibold text-brown-900">{formatINR(shopOrder.subtotal)}</p>
          <p className="text-[9px] text-brown-400">
            + {shopOrder.deliveryFee === 0 ? 'free delivery' : formatINR(shopOrder.deliveryFee)} · {items} items
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-3.5 sm:grid-cols-[1fr_210px]">
        <div className="min-w-0">
          {/* Order items with prices */}
          <div className="space-y-1.5">
            {shopOrder.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-brown-800">
                  {item.name} <span className="text-brown-400">· {item.unit} × {item.qty}</span>
                </span>
                <span className="shrink-0 font-medium text-brown-900">{formatINR(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          {/* Pending Substitution Alert if active */}
          {shopOrder.proposedSubstitution && (
            <div className="mt-2.5 rounded-xl border border-warning/40 bg-warning-soft/40 p-2.5 text-[11px] space-y-1 text-brown-800">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1 text-warning-dark">
                  <RefreshCw className="h-3 w-3" /> Proposed Alternative:
                </span>
                <Badge tone={shopOrder.proposedSubstitution.status === 'approved' ? 'success' : 'warning'}>
                  {shopOrder.proposedSubstitution.status.toUpperCase()}
                </Badge>
              </div>
              <p>
                Replace <span className="line-through">{shopOrder.proposedSubstitution.originalProductName}</span> with{' '}
                <span className="font-semibold">{shopOrder.proposedSubstitution.substituteProductName}</span> (
                {formatINR(shopOrder.proposedSubstitution.substitutePrice)})
              </p>
            </div>
          )}

          {/* Delivery or pickup instruction */}
          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-cream-2/60 px-2.5 py-2 text-[10px] leading-relaxed text-brown-600">
            {shopOrder.fulfilment === 'pickup' ? (
              <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
            ) : (
              <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            )}
            <span>
              {shopOrder.fulfilment === 'pickup'
                ? `Customer pickup from store counter. Reference packet ${shopOrder.id}.`
                : `Drop at: ${order.address.line1}, ${order.address.town} — ${order.address.pincode}`}
              {shopOrder.note ? ` · Note: ${shopOrder.note}` : ''}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {shopOrder.status === 'placed' && (
              <>
                <Button variant="ghost" size="sm" leftIcon={X} onClick={onReject}>
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={Check}
                  onClick={() => advanceShopOrder(order.id, shopOrder.id, 'accepted')}
                >
                  Accept Order
                </Button>
              </>
            )}

            {shopOrder.status === 'accepted' && (
              <Button
                size="sm"
                leftIcon={Package}
                onClick={() => advanceShopOrder(order.id, shopOrder.id, 'preparing')}
              >
                Start Preparing
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
                      ? 'Entered rider dispatch pool.'
                      : 'Customer notified to collect.',
                    'success',
                  )
                }}
              >
                Mark Ready
              </Button>
            )}

            {/* Self-pickup completion workflow */}
            {shopOrder.status === 'ready' && shopOrder.fulfilment === 'pickup' && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={CheckCircle2}
                onClick={() => advanceShopOrder(order.id, shopOrder.id, 'delivered')}
              >
                Confirm Counter Handover
              </Button>
            )}

            {/* Propose substitution action for active orders */}
            {['placed', 'accepted', 'preparing'].includes(shopOrder.status) && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Sparkles}
                onClick={onProposeSubstitution}
              >
                Suggest Alternative
              </Button>
            )}

            <Button variant="ghost" size="sm" leftIcon={FileText} onClick={onDetail}>
              Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Phone}
              onClick={() => toast(`Calling ${order.buyerName}`, `${order.buyerPhone}`, 'info')}
            >
              Call Buyer
            </Button>
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="rounded-xl border border-cream-3 bg-cream-2/30 p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-brown-400">Order Timeline</p>
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
          {shopOrder.fulfilment === 'pickup' ? 'Self Pickup' : 'Student Delivery'}
        </Badge>
        <Badge tone={shopOrder.paymentMethod === 'cod' ? 'warning' : 'neutral'}>
          {shopOrder.paymentMethod === 'cod' ? `COD ${formatINR(shopOrder.codAmount)}` : 'Prepaid (UPI)'}
        </Badge>
        <Badge tone="neutral">Prep Target ~{shopOrder.estimatedMins} min</Badge>
      </div>

      <div className="rounded-xl border border-cream-3 bg-white p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">Items Manifest</p>
        <div className="divide-y divide-cream-2">
          {shopOrder.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-brown-800">
                {item.name} <span className="text-brown-400">· {item.unit} × {item.qty}</span>
              </span>
              <span className="font-semibold text-brown-900">{formatINR(item.price * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-cream-3 pt-2 text-xs font-bold text-brown-900">
          <span>Shop Subtotal:</span>
          <span>{formatINR(shopOrder.subtotal)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-cream-3 bg-white p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">Customer Details</p>
          <p className="font-semibold text-brown-900">{order.buyerName}</p>
          <p className="text-brown-600">{order.buyerPhone}</p>
          <p className="text-[11px] text-brown-500 pt-1">
            {order.address.line1}, {order.address.town} ({order.address.pincode})
          </p>
        </div>

        <div className="rounded-xl border border-cream-3 bg-white p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">Fulfilment & Preferences</p>
          <p><span className="text-brown-400">Method: </span><span className="font-semibold text-brown-800 capitalize">{shopOrder.fulfilment}</span></p>
          <p><span className="text-brown-400">Substitution Preference: </span><span className="font-semibold text-brown-800 capitalize">{shopOrder.substitutionPreference ?? 'Suggest Alternative'}</span></p>
          {order.note && <p className="text-[11px] text-orange-700 bg-orange-50 p-1.5 rounded-lg mt-1">Note: {order.note}</p>}
        </div>
      </div>
    </div>
  )
}
