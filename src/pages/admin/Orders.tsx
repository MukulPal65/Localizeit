import { useState, useMemo } from 'react'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Filter,
  IndianRupee,
  MapPin,
  Package,
  Search,
  Store,
  Truck,
  User,
  Wallet,
} from 'lucide-react'
import { useOrderStore } from '@/store/orders'
import { useCatalogStore } from '@/store/catalog'
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { formatINR, formatTime } from '@/utils'
import type { Order, OrderStatus } from '@/types'

export function AdminOrdersPage() {
  const orders = useOrderStore((s) => s.orders)
  const shops = useCatalogStore((s) => s.shops)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [shopFilter, setShopFilter] = useState<string>('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Check search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesId = order.id.toLowerCase().includes(q)
        const matchesBuyer = order.buyerName.toLowerCase().includes(q)
        const matchesShop = order.shopOrders.some((so) => so.shopName.toLowerCase().includes(q))
        if (!matchesId && !matchesBuyer && !matchesShop) return false
      }

      // Check status filter
      if (statusFilter !== 'all') {
        const matchesStatus = order.shopOrders.some((so) => so.status === statusFilter)
        if (!matchesStatus) return false
      }

      // Check shop filter
      if (shopFilter !== 'all') {
        const matchesShop = order.shopOrders.some((so) => so.shopId === shopFilter)
        if (!matchesShop) return false
      }

      return true
    })
  }, [orders, search, statusFilter, shopFilter])

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="Master Order Book"
        subtitle="End-to-end audit trail of all multi-shop transactions, fulfillment, and customer invoices."
      />

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="Search Order ID, buyer, store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={Search}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Order Statuses</option>
          <option value="placed">Placed (New)</option>
          <option value="accepted">Accepted by Shop</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready for Dispatch</option>
          <option value="picked_up">Picked Up (In Transit)</option>
          <option value="delivered">Delivered (Completed)</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Participating Shops</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.town})
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Matching Orders"
          description="Adjust your search criteria or clear status filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrder === order.id
            const totalItems = order.shopOrders.reduce(
              (sum, so) => sum + so.items.reduce((s, it) => s + it.qty, 0),
              0,
            )

            return (
              <Card key={order.id} className="overflow-hidden p-0 transition-shadow hover:shadow-soft">
                {/* Header */}
                <div
                  className="flex cursor-pointer items-center justify-between border-b border-cream-3 bg-cream-1/60 p-4 transition-colors hover:bg-cream-2/60"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-sm font-bold text-brown-900">{order.id}</span>
                    <Badge tone={order.paymentMethod === 'cod' ? 'warning' : 'neutral'}>
                      {order.paymentMethod.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-brown-500 hidden sm:inline">
                      {order.buyerName} ({order.buyerPhone})
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-heading text-sm font-bold text-brown-900">
                        {formatINR(order.breakdown.grandTotal)}
                      </span>
                      <p className="text-[10px] text-brown-400">
                        {order.shopOrders.length} store{order.shopOrders.length > 1 ? 's' : ''} · {totalItems} items
                      </p>
                    </div>

                    <button type="button" className="text-brown-400 hover:text-brown-700">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub-orders row preview */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.shopOrders.map((so) => (
                      <div
                        key={so.id}
                        className="rounded-xl border border-cream-3 bg-white p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brown-900">{so.shopName}</span>
                          <Badge
                            tone={
                              so.status === 'delivered'
                                ? 'success'
                                : so.status === 'rejected' || so.status === 'cancelled'
                                  ? 'danger'
                                  : 'orange'
                            }
                          >
                            {so.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="divide-y divide-cream-2 text-[11px] text-brown-600">
                          {so.items.map((it) => (
                            <div key={it.productId} className="flex justify-between py-1">
                              <span>
                                {it.name} <span className="text-brown-400">× {it.qty}</span>
                              </span>
                              <span className="font-medium text-brown-900">{formatINR(it.price * it.qty)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-cream-2 pt-1.5 text-[10px] text-brown-500">
                          <span>Fulfilment: {so.fulfilment}</span>
                          <span className="font-bold text-brown-800">
                            Subtotal: {formatINR(so.subtotal + so.deliveryFee)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded Order Inspector */}
                  {isExpanded && (
                    <div className="mt-4 rounded-xl border border-cream-3 bg-cream-2/40 p-3.5 space-y-3 text-xs">
                      <h4 className="font-bold text-brown-900 uppercase tracking-wider text-[10px]">
                        Order Fulfillment Breakdown
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-brown-700">
                        <div>
                          <p className="text-[10px] font-bold text-brown-400">Delivery Address</p>
                          <p className="mt-0.5">
                            {order.address.line1}, {order.address.village}, {order.address.town},{' '}
                            {order.address.pincode}
                          </p>
                          {order.address.landmark && (
                            <p className="text-[11px] text-brown-500">Landmark: {order.address.landmark}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-brown-400">Financial Ledger</p>
                          <div className="mt-0.5 space-y-0.5 text-[11px]">
                            <div className="flex justify-between">
                              <span>Items Subtotal:</span>
                              <span>{formatINR(order.breakdown.itemSubtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Platform Fee:</span>
                              <span>{formatINR(order.breakdown.platformFee)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Delivery Fees:</span>
                              <span>{formatINR(order.breakdown.deliveryTotal)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-brown-900 pt-1 border-t border-cream-3">
                              <span>Grand Total:</span>
                              <span>{formatINR(order.breakdown.grandTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <DemoNote>Multi-shop orders split into distinct merchant packages while maintaining a unified delivery manifest.</DemoNote>
    </div>
  )
}
