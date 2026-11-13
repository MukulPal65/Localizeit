import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  BadgePercent,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  IndianRupee,
  Info,
  Package,
  Plus,
  RotateCcw,
  Store,
  TrendingUp,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react'
import type { Order, ShopOrder } from '@/types'
import { advanceShopOrder } from '@/services/workflow'
import { calculateShopMetrics } from '@/services/supabaseService'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { useOrderStore } from '@/store/orders'
import { Badge, Button, Card, EmptyState, PageHeader, Progress, Stat } from '@/components/ui/primitives'
import { BarChart } from '@/components/ui/charts'
import { OrderStatusBadge } from '@/components/shared/Misc'
import { DemoNote, InfoBanner, TinyBar } from '@/components/shared/dashboard'
import { cn, formatINR, isToday, orderStatusMeta, timeAgo } from '@/utils'

interface Row {
  order: Order
  shopOrder: ShopOrder
}

export function ShopOverviewPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shops = useCatalogStore((s) => s.shops)
  const products = useCatalogStore((s) => s.products)
  const orders = useOrderStore((s) => s.orders)

  const shop = shops.find((item) => item.id === shopId)

  const rows = useMemo<Row[]>(
    () =>
      orders.flatMap((order) =>
        order.shopOrders
          .filter((shopOrder) => shopOrder.shopId === shopId)
          .map((shopOrder) => ({ order, shopOrder })),
      ),
    [orders, shopId],
  )

  const metrics = useMemo(
    () => calculateShopMetrics(orders, shopId, shop?.commissionPct ?? 4.5),
    [orders, shopId, shop?.commissionPct],
  )

  const myProducts = useMemo(
    () => products.filter((product) => product.shopId === shopId && !product.archived),
    [products, shopId],
  )
  const lowStock = myProducts.filter((product) => product.inStock && product.stock <= 5)
  const outOfStock = myProducts.filter((product) => !product.inStock || product.stock === 0)
  const deals = myProducts.filter((product) => product.deal)

  const queue = rows
    .filter(({ shopOrder }) => ['placed', 'accepted', 'preparing', 'ready'].includes(shopOrder.status))
    .sort((a, b) => (b.shopOrder.statusHistory[0]?.at ?? '').localeCompare(a.shopOrder.statusHistory[0]?.at ?? ''))

  const topProducts = useMemo(() => {
    const tally = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const { shopOrder } of rows) {
      if (shopOrder.status !== 'delivered') continue
      for (const item of shopOrder.items) {
        const current = tally.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 }
        current.qty += item.qty
        current.revenue += item.qty * item.price
        tally.set(item.productId, current)
      }
    }
    return Array.from(tally.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [rows])

  const trend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      return date
    })
    return days.map((date) => {
      const value = rows
        .filter(({ shopOrder }) => {
          const last = shopOrder.statusHistory.at(-1)
          if (!last || shopOrder.status !== 'delivered') return false
          const at = new Date(last.at)
          return (
            at.getDate() === date.getDate() &&
            at.getMonth() === date.getMonth() &&
            at.getFullYear() === date.getFullYear()
          )
        })
        .reduce((sum, { shopOrder }) => sum + shopOrder.subtotal, 0)
      return {
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        value,
      }
    })
  }, [rows])

  if (!shop) {
    return (
      <Card>
        <EmptyState icon={Store} title="Shop not found" description="Select a shopkeeper account from the role selector." />
      </Card>
    )
  }

  const approve = (row: Row) => {
    advanceShopOrder(row.order.id, row.shopOrder.id, 'accepted')
  }

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title={`Namaste, ${shop.ownerName.split(' ')[0]}`}
        subtitle={`Merchant Cockpit · ${shop.name} (${shop.town}) · Live database-connected`}
        action={
          <Link to="/shop/products">
            <Button size="sm" leftIcon={Plus}>
              Add product
            </Button>
          </Link>
        }
      />

      {shop.status !== 'approved' && (
        <InfoBanner
          tone={shop.status === 'pending' ? 'warning' : 'danger'}
          title={
            shop.status === 'pending'
              ? 'Your shop registration is under Super Admin review'
              : shop.status === 'rejected'
                ? 'Shop registration needs modification'
                : 'Shop is currently suspended'
          }
          icon={AlertTriangle}
          action={
            <Link to="/shop/onboarding">
              <Button size="sm" variant="secondary">
                View status
              </Button>
            </Link>
          }
        >
          {shop.status === 'pending'
            ? 'You can manage your catalog and prices. Buyers will be able to order once approved by Platform Admin.'
            : shop.status === 'rejected'
              ? shop.rejectionReason ?? 'Open onboarding to review the reason and resubmit.'
              : 'New orders are paused. Contact support or review your status.'}
        </InfoBanner>
      )}

      {!shop.open && shop.status === 'approved' && (
        <InfoBanner
          tone="warning"
          title="Store marked as CLOSED"
          icon={Clock}
          action={
            <Link to="/shop/profile">
              <Button size="sm" variant="secondary">
                Open shop
              </Button>
            </Link>
          }
        >
          Your catalog remains browsable, but customer checkout is temporarily paused.
        </InfoBanner>
      )}

      {/* 10 Core Business Metrics - Calculated strictly from database records */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <Stat
          label="Today's Sales"
          value={formatINR(metrics.todaySales)}
          hint="From today's completed orders"
          icon={TrendingUp}
          tone="orange"
        />
        <Stat
          label="Gross Revenue"
          value={formatINR(metrics.grossRevenue)}
          hint={`${metrics.completedOrders} orders all-time`}
          icon={BadgeIndianRupee}
          tone="neutral"
        />
        <Stat
          label="Commission Owed"
          value={formatINR(metrics.commissionOwed)}
          hint={`${shop.commissionPct}% on item subtotals`}
          icon={BadgePercent}
          tone="warning"
        />
        <Stat
          label="COD Collected"
          value={formatINR(metrics.codCollected)}
          hint="Collected directly in cash"
          icon={Wallet}
          tone="info"
        />
        <Stat
          label="Expected Payout"
          value={formatINR(metrics.expectedPayout)}
          hint="Net after commission & COD"
          icon={IndianRupee}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat
          label="Total Orders"
          value={metrics.totalOrders}
          hint="All-time received"
          icon={ClipboardList}
          tone="neutral"
        />
        <Stat
          label="Pending Queue"
          value={metrics.pendingOrders}
          hint="Action required"
          icon={Clock}
          tone={metrics.pendingOrders > 0 ? 'orange' : 'neutral'}
        />
        <Stat
          label="Completed"
          value={metrics.completedOrders}
          hint="Delivered to customer"
          icon={CheckCircle2}
          tone="success"
        />
        <Stat
          label="Rejected Orders"
          value={metrics.rejectedOrders}
          hint="0% commission charged"
          icon={XCircle}
          tone={metrics.rejectedOrders > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Financial Basis Note */}
      <div className="flex items-start gap-2 rounded-xl border border-cream-3 bg-cream-2/60 p-3 text-[11px] leading-relaxed text-brown-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
        <div>
          <span className="font-semibold text-brown-900">Accounting Basis: </span>
          {metrics.calculationBasis}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          {/* Live Order Queue */}
          <Card>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">Active Order Queue</h2>
                <p className="mt-0.5 text-[11px] text-brown-400">
                  Manage incoming customer orders: Accept → Start preparing → Mark ready.
                </p>
              </div>
              <Link to="/shop/orders">
                <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
                  View all ({rows.length})
                </Button>
              </Link>
            </div>

            {queue.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Order queue is clear"
                description="New buyer orders will appear here in real-time as customers check out."
                action={
                  <Link to="/shop/orders">
                    <Button size="sm" variant="secondary">
                      View past orders
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {queue.map((row) => (
                  <div
                    key={row.shopOrder.id}
                    className={cn(
                      'rounded-xl border p-3.5',
                      row.shopOrder.status === 'placed'
                        ? 'border-orange-300 bg-orange-50/50'
                        : 'border-cream-3 bg-white',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-heading text-xs font-bold text-brown-900">
                            {row.order.id}
                          </span>
                          <OrderStatusBadge status={row.shopOrder.status} short />
                          <Badge tone={row.shopOrder.fulfilment === 'pickup' ? 'info' : 'success'}>
                            {row.shopOrder.fulfilment === 'pickup' ? 'Counter Pickup' : 'Student Delivery'}
                          </Badge>
                          {row.shopOrder.paymentMethod === 'cod' && (
                            <Badge tone="warning">COD {formatINR(row.shopOrder.codAmount)}</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-brown-500">
                          Buyer: <span className="font-semibold text-brown-800">{row.order.buyerName}</span> ({row.order.buyerPhone}) · {timeAgo(row.order.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-brown-700">
                          {row.shopOrder.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-sm font-bold text-brown-900">
                          {formatINR(row.shopOrder.subtotal)}
                        </p>
                        <p className="text-[10px] text-brown-400">
                          Fee: {formatINR(Math.round((row.shopOrder.subtotal * (shop.commissionPct || 4.5)) / 100))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cream-2 pt-2.5">
                      <p className="text-[10px] text-brown-400">
                        {row.shopOrder.fulfilment === 'pickup'
                          ? 'Customer will collect from your counter'
                          : 'Rider dispatch assigned upon ready'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {row.shopOrder.status === 'placed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-danger-soft"
                              onClick={() => {
                                advanceShopOrder(row.order.id, row.shopOrder.id, 'rejected', {
                                  rejectionReason: 'Shop unable to fulfill this order at this time.',
                                })
                              }}
                            >
                              Reject
                            </Button>
                            <Button size="sm" leftIcon={CheckCircle2} onClick={() => approve(row)}>
                              Accept Order
                            </Button>
                          </>
                        )}
                        {row.shopOrder.status === 'accepted' && (
                          <Button
                            size="sm"
                            leftIcon={Package}
                            onClick={() => advanceShopOrder(row.order.id, row.shopOrder.id, 'preparing')}
                          >
                            Start Preparing
                          </Button>
                        )}
                        {row.shopOrder.status === 'preparing' && (
                          <Button
                            size="sm"
                            leftIcon={CheckCircle2}
                            onClick={() => advanceShopOrder(row.order.id, row.shopOrder.id, 'ready')}
                          >
                            Mark Ready
                          </Button>
                        )}
                        {row.shopOrder.status === 'ready' && row.shopOrder.fulfilment === 'pickup' && (
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={CheckCircle2}
                            onClick={() => advanceShopOrder(row.order.id, row.shopOrder.id, 'delivered')}
                          >
                            Confirm Customer Pickup
                          </Button>
                        )}
                        {row.shopOrder.status === 'ready' && row.shopOrder.fulfilment === 'delivery' && (
                          <Badge tone="info">
                            <Truck className="h-3 w-3 inline mr-1" />
                            Awaiting Rider Pickup
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 7-Day Revenue Graph */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">7-Day Sales Trend</h2>
                <p className="text-[11px] text-brown-400">Delivered order revenue over the last week.</p>
              </div>
              <Badge tone="neutral">Actual database records</Badge>
            </div>
            <BarChart data={trend} height={150} format={(value) => formatINR(value)} />
          </Card>
        </div>

        {/* Right Sidebar: Catalog Health & Quick Actions */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-brown-900">Catalog & Store Health</h2>
                <p className="text-[10px] text-brown-400">Inventory availability</p>
              </div>
              <Badge tone="success">{shop.rating.toFixed(1)} ★</Badge>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-[10px] text-brown-400">
                  <span>Stock availability</span>
                  <span className="font-medium text-brown-700">
                    {myProducts.length === 0
                      ? 0
                      : Math.round(((myProducts.length - outOfStock.length) / myProducts.length) * 100)}%
                  </span>
                </div>
                <Progress
                  value={myProducts.length === 0 ? 0 : ((myProducts.length - outOfStock.length) / myProducts.length) * 100}
                  tone="success"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-cream-2 pt-3">
                <div className="rounded-lg bg-cream-2/60 p-2 text-center">
                  <p className="text-[10px] text-brown-400">Total Products</p>
                  <p className="font-heading text-sm font-bold text-brown-900">{myProducts.length}</p>
                </div>
                <div className="rounded-lg bg-cream-2/60 p-2 text-center">
                  <p className="text-[10px] text-brown-400">Low Stock / Out</p>
                  <p className="font-heading text-sm font-bold text-warning">{lowStock.length + outOfStock.length}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">Shop Management</h3>
            <div className="grid gap-2">
              <Link
                to="/shop/orders"
                className="flex items-center justify-between rounded-xl border border-cream-3 p-2.5 text-xs font-semibold text-brown-800 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-orange-500" /> All Shop Orders
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-brown-400" />
              </Link>
              <Link
                to="/shop/products"
                className="flex items-center justify-between rounded-xl border border-cream-3 p-2.5 text-xs font-semibold text-brown-800 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500" /> Products & Pricing
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-brown-400" />
              </Link>
              <Link
                to="/shop/inventory"
                className="flex items-center justify-between rounded-xl border border-cream-3 p-2.5 text-xs font-semibold text-brown-800 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-orange-500" /> Inventory & Stock Levels
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-brown-400" />
              </Link>
              <Link
                to="/shop/profile"
                className="flex items-center justify-between rounded-xl border border-cream-3 p-2.5 text-xs font-semibold text-brown-800 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-orange-500" /> Store Profile & Hours
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-brown-400" />
              </Link>
            </div>
          </Card>

          <DemoNote>All dashboard statistics update automatically via Supabase Realtime.</DemoNote>
        </div>
      </div>
    </div>
  )
}
