import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  IndianRupee,
  Package,
  Plus,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { Order, ShopOrder } from '@/types'
import { advanceShopOrder } from '@/services/workflow'
import { shopOrderRevenue, statusCounts } from '@/services/orderService'
import { settlementFor } from '@/services/settlementService'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { useOrderStore } from '@/store/orders'
import { useSettlementStore } from '@/store/settlements'
import { toast } from '@/store/toast'
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
  const settlements = useSettlementStore((s) => s.settlements)

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

  const counts = useMemo(() => statusCounts(orders, shopId), [orders, shopId])
  const revenue = useMemo(() => shopOrderRevenue(orders, shopId), [orders, shopId])
  const myProducts = useMemo(
    () => products.filter((product) => product.shopId === shopId && !product.archived),
    [products, shopId],
  )
  const lowStock = myProducts.filter((product) => product.inStock && product.stock <= 5)
  const outOfStock = myProducts.filter((product) => !product.inStock)
  const deals = myProducts.filter((product) => product.deal)
  const pendingPayout = settlementFor(settlements, 'shop', shopId)
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.payout, 0)

  const todayRevenue = rows
    .filter(({ shopOrder }) => shopOrder.status === 'delivered' && isToday(shopOrder.statusHistory.at(-1)?.at ?? ''))
    .reduce((sum, { shopOrder }) => sum + shopOrder.subtotal + shopOrder.deliveryFee, 0)

  const queue = rows
    .filter(({ shopOrder }) => ['placed', 'accepted', 'preparing'].includes(shopOrder.status))
    .sort((a, b) => (a.shopOrder.statusHistory[0]?.at ?? '').localeCompare(b.shopOrder.statusHistory[0]?.at ?? ''))

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
    const totals = days.map((date) => {
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
        .reduce((sum, { shopOrder }) => sum + shopOrder.subtotal + shopOrder.deliveryFee, 0)
      return {
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        value,
      }
    })
    if (totals.every((point) => point.value === 0)) {
      return totals.map((point, index) => ({
        ...point,
        value: [1860, 2240, 1980, 3120, 3540, 2680, 2940][index] ?? 0,
      }))
    }
    return totals
  }, [rows])

  if (!shop) {
    return (
      <Card>
        <EmptyState icon={Store} title="Shop not found" description="Reset the demo to restore the seeded shop profile." />
      </Card>
    )
  }

  const approve = (row: Row) => {
    advanceShopOrder(row.order.id, row.shopOrder.id, 'accepted')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Namaste, ${shop.ownerName.split(' ')[0]}`}
        subtitle="Today’s shop queue, stock alerts and payouts — all in one place."
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
              ? 'Your shop is under review'
              : shop.status === 'rejected'
                ? 'Shop application needs changes'
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
            ? 'You can keep preparing your catalogue. Buyers will see the shop once the demo admin approves it.'
            : shop.status === 'rejected'
              ? shop.rejectionReason ?? 'Open onboarding to review the reason and resubmit.'
              : 'New orders are paused. Contact the demo admin from the onboarding screen.'}
        </InfoBanner>
      )}

      {!shop.open && shop.status === 'approved' && (
        <InfoBanner
          tone="warning"
          title="Shop is marked closed"
          icon={Clock}
          action={
            <Link to="/shop/profile">
              <Button size="sm" variant="secondary">
                Open shop
              </Button>
            </Link>
          }
        >
          Buyers can still browse your catalogue, but checkout is paused while the shop is closed.
        </InfoBanner>
      )}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat
          label="New orders"
          value={counts.placed}
          hint={`${queue.length} in the live queue`}
          icon={ClipboardList}
          tone="orange"
        />
        <Stat
          label="Revenue today"
          value={formatINR(todayRevenue)}
          hint={`${revenue.orders} delivered orders all time`}
          icon={TrendingUp}
          tone="success"
        />
        <Stat
          label="Pending payout"
          value={formatINR(pendingPayout)}
          hint="Next demo settlement cycle"
          icon={Wallet}
          tone="info"
        />
        <Stat
          label="Stock alerts"
          value={lowStock.length + outOfStock.length}
          hint={`${outOfStock.length} out of stock · ${deals.length} deals live`}
          icon={Boxes}
          tone={lowStock.length + outOfStock.length > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">Live order queue</h2>
                <p className="mt-0.5 text-[11px] text-brown-400">
                  Accept a new order, then move it through preparing → ready.
                </p>
              </div>
              <Link to="/shop/orders">
                <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
                  All orders
                </Button>
              </Link>
            </div>

            {queue.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Queue is clear"
                description="New buyer orders will appear here instantly. Try placing one from the buyer role."
                action={
                  <Link to="/shop/orders">
                    <Button size="sm" variant="secondary">
                      View order history
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
                      'rounded-xl border p-3',
                      row.shopOrder.status === 'placed' ? 'border-orange-200 bg-orange-50/40' : 'border-cream-3 bg-white/70',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-heading text-xs font-semibold text-brown-900">
                            {row.order.id}
                          </span>
                          <OrderStatusBadge status={row.shopOrder.status} short />
                          <Badge tone={row.shopOrder.fulfilment === 'pickup' ? 'info' : 'success'}>
                            {row.shopOrder.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}
                          </Badge>
                          {row.shopOrder.paymentMethod === 'cod' && <Badge tone="warning">COD</Badge>}
                        </div>
                        <p className="mt-0.5 text-[10px] text-brown-400">
                          {row.order.buyerName} · {row.shopOrder.items.length} item
                          {row.shopOrder.items.length === 1 ? '' : 's'} · {timeAgo(row.order.createdAt)}
                        </p>
                        <p className="mt-1 line-clamp-1 text-[11px] text-brown-500">
                          {row.shopOrder.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-sm font-semibold text-brown-900">
                          {formatINR(row.shopOrder.subtotal)}
                        </p>
                        {row.shopOrder.paymentMethod === 'cod' && (
                          <p className="text-[9px] text-warning">collect cash</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-cream-3 pt-2">
                      <p className="text-[10px] text-brown-400">
                        {row.shopOrder.fulfilment === 'pickup' ? 'Customer will collect' : 'Rider pickup after ready'} · ~
                        {row.shopOrder.estimatedMins} min prep
                      </p>
                      <div className="flex items-center gap-1.5">
                        {row.shopOrder.status === 'placed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                advanceShopOrder(row.order.id, row.shopOrder.id, 'rejected', {
                                  rejectionReason: 'Shop is unable to fulfil this order right now.',
                                })
                                toast('Order rejected', 'The buyer sees the reason on their order.', 'info')
                              }}
                            >
                              Reject
                            </Button>
                            <Button size="sm" leftIcon={CheckCircle2} onClick={() => approve(row)}>
                              Accept order
                            </Button>
                          </>
                        )}
                        {row.shopOrder.status === 'accepted' && (
                          <Button
                            size="sm"
                            leftIcon={Package}
                            onClick={() => advanceShopOrder(row.order.id, row.shopOrder.id, 'preparing')}
                          >
                            Start preparing
                          </Button>
                        )}
                        {row.shopOrder.status === 'preparing' && (
                          <Button
                            size="sm"
                            leftIcon={CheckCircle2}
                            onClick={() => advanceShopOrder(row.order.id, row.shopOrder.id, 'ready')}
                          >
                            Mark ready
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">Sales trend</h2>
                <p className="text-[11px] text-brown-400">Delivered shop orders over the last 7 days.</p>
              </div>
              <Badge tone="neutral">Demo data</Badge>
            </div>
            <BarChart data={trend} height={150} format={(value) => formatINR(value)} />
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-cream-3 pt-3 text-center">
              <div>
                <p className="text-[10px] text-brown-400">Delivered</p>
                <p className="text-xs font-semibold text-brown-900">{revenue.orders}</p>
              </div>
              <div>
                <p className="text-[10px] text-brown-400">Item sales</p>
                <p className="text-xs font-semibold text-brown-900">{formatINR(revenue.gross)}</p>
              </div>
              <div>
                <p className="text-[10px] text-brown-400">Delivery fees</p>
                <p className="text-xs font-semibold text-brown-900">{formatINR(revenue.delivery)}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-brown-900">Top products</h2>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </div>
              {topProducts.length === 0 ? (
                <p className="py-4 text-[11px] text-brown-400">
                  Delivered orders will rank your best-selling products here.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.map((item) => (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-brown-600">{item.name}</span>
                        <span className="shrink-0 font-medium text-brown-800">{item.qty} sold</span>
                      </div>
                      <TinyBar value={item.qty} max={topProducts[0]?.qty ?? 1} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-brown-900">Stock alerts</h2>
                <Link to="/shop/inventory" className="text-[10px] font-medium text-orange-600">
                  Manage
                </Link>
              </div>
              {lowStock.length + outOfStock.length === 0 ? (
                <p className="py-4 text-[11px] text-brown-400">Everything is well stocked. Nice work.</p>
              ) : (
                <div className="space-y-2">
                  {[...outOfStock, ...lowStock].slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate text-brown-600">{product.name}</span>
                      <Badge tone={product.inStock ? 'warning' : 'danger'}>
                        {product.inStock ? `${product.stock} left` : 'Out of stock'}
                      </Badge>
                    </div>
                  ))}
                  <Link to="/shop/inventory" className="mt-1 block">
                    <Button variant="secondary" size="sm" className="w-full">
                      Restock inventory
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-brown-900">Shop health</h2>
                <p className="text-[10px] text-brown-400">Demo performance snapshot</p>
              </div>
              <Badge tone="success">{shop.rating.toFixed(1)} ★</Badge>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-[10px] text-brown-400">
                  <span>Order acceptance</span>
                  <span className="font-medium text-brown-700">
                    {counts.all === 0 ? 100 : Math.round(((counts.all - counts.rejected) / counts.all) * 100)}%
                  </span>
                </div>
                <Progress value={counts.all === 0 ? 100 : ((counts.all - counts.rejected) / counts.all) * 100} tone="success" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[10px] text-brown-400">
                  <span>Catalogue in stock</span>
                  <span className="font-medium text-brown-700">
                    {myProducts.length === 0 ? 0 : Math.round(((myProducts.length - outOfStock.length) / myProducts.length) * 100)}%
                  </span>
                </div>
                <Progress
                  value={myProducts.length === 0 ? 0 : ((myProducts.length - outOfStock.length) / myProducts.length) * 100}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[10px] text-brown-400">
                  <span>Prep time target</span>
                  <span className="font-medium text-brown-700">{shop.prepTimeMins} min</span>
                </div>
                <Progress value={Math.min(100, (shop.prepTimeMins / 30) * 100)} tone="info" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-cream-3 pt-3">
              <div className="rounded-lg bg-cream-2/60 px-2 py-1.5">
                <p className="text-[9px] text-brown-400">Products live</p>
                <p className="text-xs font-semibold text-brown-900">{myProducts.length}</p>
              </div>
              <div className="rounded-lg bg-cream-2/60 px-2 py-1.5">
                <p className="text-[9px] text-brown-400">Commission</p>
                <p className="text-xs font-semibold text-brown-900">{shop.commissionPct}%</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-brown-900">Quick actions</h2>
            <div className="mt-2 grid gap-1.5">
              {[
                { to: '/shop/products', label: 'Add or edit products', icon: Package },
                { to: '/shop/inventory', label: 'Update stock levels', icon: Boxes },
                { to: '/shop/deals', label: 'Create near-expiry deal', icon: BadgePercent },
                { to: '/shop/sales', label: 'View sales & payouts', icon: IndianRupee },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center gap-2.5 rounded-xl border border-cream-3 bg-white/70 px-3 py-2.5 text-[11px] font-medium text-brown-700 transition-colors hover:border-orange-200 hover:bg-orange-50/40"
                >
                  <action.icon className="h-3.5 w-3.5 text-orange-500" />
                  <span className="flex-1">{action.label}</span>
                  <ArrowRight className="h-3 w-3 text-brown-300" />
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brown-900">Recent status updates</h2>
              <Badge tone="neutral">Live</Badge>
            </div>
            <div className="space-y-2">
              {rows
                .slice()
                .sort((a, b) =>
                  (b.shopOrder.statusHistory.at(-1)?.at ?? '').localeCompare(
                    a.shopOrder.statusHistory.at(-1)?.at ?? '',
                  ),
                )
                .slice(0, 4)
                .map((row) => {
                  const last = row.shopOrder.statusHistory.at(-1)
                  return (
                    <div key={row.shopOrder.id} className="flex items-start gap-2 text-[10px]">
                      <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', orderStatusMeta[row.shopOrder.status].dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-brown-600">
                          <span className="font-medium">{row.order.id}</span> · {orderStatusMeta[row.shopOrder.status].label}
                        </p>
                        <p className="text-brown-300">{last ? timeAgo(last.at) : 'just now'}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </Card>

          <DemoNote>Shop dashboard preview · all orders, payouts and customers are demo records.</DemoNote>
        </div>
      </div>
    </div>
  )
}
