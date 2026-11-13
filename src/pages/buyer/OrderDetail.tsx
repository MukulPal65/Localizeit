import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  Check,
  Clock,
  Copy,
  Headphones,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  XCircle,
} from 'lucide-react'
import { aggregateStatus, isOrderActive } from '@/services/orderService'
import { buyerCancelShopOrder } from '@/services/workflow'
import { respondToSubstitution } from '@/services/supabaseService'
import { useDeliveryStore } from '@/store/delivery'
import { useCatalogStore } from '@/store/catalog'
import { useOrderStore } from '@/store/orders'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
} from '@/components/ui/primitives'
import {
  FulfilmentBadge,
  MoneyRow,
  OrderStatusBadge,
  OrderTimeline,
  TotalBar,
} from '@/components/shared/Misc'
import { RouteMap } from '@/components/shared/RouteMap'
import { cn, formatDate, formatDateTime, formatINR, formatTime, paymentLabels } from '@/utils'

export function BuyerOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const orders = useOrderStore((s) => s.orders)
  const jobs = useDeliveryStore((s) => s.jobs)
  const riders = useDeliveryStore((s) => s.riders)
  const shops = useCatalogStore((s) => s.shops)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  const order = useMemo(() => orders.find((item) => item.id === orderId), [orders, orderId])

  if (!order) {
    return (
      <Card>
        <EmptyState
          icon={ReceiptText}
          title="Order not found"
          description="This demo order may have been cleared after a data reset."
          action={
            <Button size="sm" onClick={() => navigate('/buyer/orders')}>
              Back to orders
            </Button>
          }
        />
      </Card>
    )
  }

  const aggregate = aggregateStatus(order)
  const cancelShopOrder = order.shopOrders.find((so) => so.id === cancelTarget)
  const active = isOrderActive(order)
  const deliveredCount = order.shopOrders.filter((so) => so.status === 'delivered').length

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Order ${order.id}`}
        subtitle={`Placed ${formatDateTime(order.createdAt)} · ${order.shopOrders.length} shop${order.shopOrders.length === 1 ? '' : 's'} · ${paymentLabels[order.paymentMethod]}`}
        backTo={() => navigate('/buyer/orders')}
        action={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Copy}
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(order.id).catch(() => undefined)
              toast('Order ID copied', order.id, 'info')
            }}
          >
            Copy ID
          </Button>
        }
      />

      <Card className={cn('overflow-hidden p-0', active && 'border-orange-200')}>
        <div className="relative overflow-hidden bg-brown-900 p-4 text-cream">
          <span className="pattern-dots absolute inset-0 opacity-10" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={aggregate} />
                <Badge tone="warning">{paymentLabels[order.paymentMethod]}</Badge>
                {order.paymentMethod === 'cod' && (
                  <Badge tone="neutral">
                    Keep {formatINR(order.breakdown.codAmount)} ready
                  </Badge>
                )}
                {order.paymentMethod === 'upi' && order.paymentTransactionId && (
                  <Badge tone="success">Paid · {order.paymentTransactionId}</Badge>
                )}
              </div>
              <p className="mt-2 font-heading text-lg font-semibold">
                {aggregate === 'delivered'
                  ? 'All shops completed this order'
                  : aggregate === 'cancelled' || aggregate === 'rejected'
                    ? 'This order was closed'
                    : `${deliveredCount} of ${order.shopOrders.length} shop orders completed`}
              </p>
              <p className="mt-0.5 text-[11px] text-cream/60">
                Each shop updates its own status. Delivery shops get a rider from your town.
              </p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-semibold">{formatINR(order.breakdown.grandTotal)}</p>
              <p className="text-[10px] text-cream/50">Demo total</p>
            </div>
          </div>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <Link to="/buyer/ai">
              <Button size="sm" variant="secondary" className="border-white/20 bg-white/10 text-cream hover:bg-white/20">
                Ask AI for alternatives
              </Button>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={Headphones}
              className="border-white/20 bg-white/10 text-cream hover:bg-white/20"
              onClick={() => toast('Support is a demo', 'A real support chat would open here. No ticket was created.', 'info')}
            >
              Need help?
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {order.shopOrders.map((shopOrder) => {
            const rider = riders.find((item) => item.id === shopOrder.riderId)
            const job = jobs.find((item) => item.shopOrderId === shopOrder.id)
            return (
              <Card key={shopOrder.id} className="overflow-hidden p-0">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cream-3 bg-cream-2/40 p-3.5">
                  <div className="min-w-0">
                    <Link
                      to={`/buyer/shops/${shopOrder.shopId}`}
                      className="text-sm font-semibold text-brown-900 hover:text-orange-600"
                    >
                      {shopOrder.shopName}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-brown-400">
                      <MapPin className="h-2.5 w-2.5" /> {shopOrder.shopTown}
                      <span>·</span>
                      <Clock className="h-2.5 w-2.5" /> ~{shopOrder.estimatedMins} min
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FulfilmentBadge fulfilment={shopOrder.fulfilment} />
                    <OrderStatusBadge status={shopOrder.status} short />
                  </div>
                </div>

                <div className="grid gap-4 p-3.5 sm:grid-cols-[1fr_190px]">
                  <div>
                    <div className="space-y-1.5">
                      {shopOrder.items.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between gap-2 text-[11px]">
                          <Link
                            to={`/buyer/products/${item.productId}`}
                            className="min-w-0 truncate text-brown-600 hover:text-orange-600"
                          >
                            {item.name} <span className="text-brown-300">· {item.unit} × {item.qty}</span>
                          </Link>
                          <span className="shrink-0 font-medium text-brown-800">
                            {formatINR(item.price * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1 border-t border-dashed border-cream-4 pt-2">
                      <MoneyRow label="Shop subtotal" value={formatINR(shopOrder.subtotal)} />
                      <MoneyRow
                        label={shopOrder.fulfilment === 'pickup' ? 'Pickup' : 'Delivery fee'}
                        value={shopOrder.deliveryFee === 0 ? 'FREE' : formatINR(shopOrder.deliveryFee)}
                        tone={shopOrder.deliveryFee === 0 ? 'success' : 'default'}
                      />
                    </div>

                    {shopOrder.proposedSubstitution && (
                      <div
                        className={cn(
                          'mt-2.5 rounded-xl border p-3 text-xs',
                          shopOrder.proposedSubstitution.status === 'pending'
                            ? 'border-warning/60 bg-warning-soft/30 text-brown-900'
                            : shopOrder.proposedSubstitution.status === 'approved'
                              ? 'border-success/40 bg-success-soft/20 text-success-dark'
                              : 'border-danger/30 bg-danger-soft/20 text-brown-600',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-warning" />
                            Product Substitution{' '}
                            {shopOrder.proposedSubstitution.status === 'pending'
                              ? 'Requested'
                              : shopOrder.proposedSubstitution.status === 'approved'
                                ? 'Accepted'
                                : 'Declined'}
                          </span>
                          <Badge
                            tone={
                              shopOrder.proposedSubstitution.status === 'pending'
                                ? 'warning'
                                : shopOrder.proposedSubstitution.status === 'approved'
                                  ? 'success'
                                  : 'neutral'
                            }
                          >
                            {shopOrder.proposedSubstitution.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-brown-600">
                          <span className="line-through text-brown-400">
                            {shopOrder.proposedSubstitution.originalProductName}
                          </span>{' '}
                          is unavailable. The merchant proposed{' '}
                          <span className="font-bold text-brown-900">
                            {shopOrder.proposedSubstitution.substituteProductName}
                          </span>{' '}
                          ({formatINR(shopOrder.proposedSubstitution.substitutePrice)}).
                        </p>
                        {shopOrder.proposedSubstitution.status === 'pending' && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              leftIcon={Check}
                              onClick={() => respondToSubstitution(order.id, shopOrder.id, true)}
                            >
                              Accept Substitution
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:bg-danger-soft"
                              leftIcon={XCircle}
                              onClick={() => respondToSubstitution(order.id, shopOrder.id, false)}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {shopOrder.status === 'ready' && shopOrder.fulfilment === 'pickup' && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl bg-info-soft/60 p-2.5 text-[10px] leading-relaxed text-info">
                        <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Ready for pickup. Show this order ID at the shop counter:{' '}
                        <span className="font-semibold">{shopOrder.id}</span>
                      </div>
                    )}
                    {shopOrder.fulfilment === 'delivery' && shopOrder.status !== 'placed' && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-cream-2/60 p-2.5">
                        <Bike className="h-4 w-4 text-success" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] font-medium text-brown-700">
                            {rider ? `${rider.name} · ${rider.phone}` : 'Waiting for a local rider to accept'}
                          </p>
                          <p className="text-[9.5px] text-brown-400">
                            {job
                              ? `${job.distanceKm} km · ${job.status === 'picked_up' ? 'in transit' : job.status}`
                              : 'Not yet assigned'}
                          </p>
                        </div>
                        {rider && (
                          <button
                            type="button"
                            onClick={() => toast(`Calling ${rider.name}`, `${rider.phone} · simulated call.`, 'info')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brown-500"
                            aria-label="Call rider"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {shopOrder.fulfilment === 'delivery' && shopOrder.status !== 'placed' && (
                      (() => {
                        const shop = shops.find((item) => item.id === shopOrder.shopId)
                        const shopPoint = { latitude: shop?.lat ?? 27.1767, longitude: shop?.lng ?? 78.0081 }
                        const dropPoint = { latitude: shopPoint.latitude + 0.012, longitude: shopPoint.longitude + 0.009 }
                        const progress = shopOrder.status === 'delivered' ? 1 : shopOrder.status === 'picked_up' ? 0.65 : 0
                        return <RouteMap points={[shopPoint, dropPoint]} riderProgress={progress} className="mt-2 h-48" />
                      })()
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['placed', 'accepted'].includes(shopOrder.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={XCircle}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setCancelTarget(shopOrder.id)}
                        >
                          Cancel this shop
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Phone}
                        onClick={() => toast('Calling the shop', 'Shop phone numbers are mock demo data.', 'info')}
                      >
                        Call shop
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cream-3 bg-cream-2/30 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-brown-400">Live timeline</p>
                    <div className="mt-2">
                      <OrderTimeline shopOrder={shopOrder} />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <h2 className="text-sm font-semibold text-brown-900">Bill summary</h2>
            <div className="mt-2.5">
              <TotalBar
                itemSubtotal={order.breakdown.itemSubtotal}
                platformFee={order.breakdown.platformFee}
                deliveryTotal={order.breakdown.deliveryTotal}
                dealSavings={order.breakdown.discount}
                grandTotal={order.breakdown.grandTotal}
                codAmount={order.breakdown.codAmount}
              />
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-brown-300">
              Mock bill only. No payment gateway, invoice or refund was processed.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-brown-900">
              {order.shopOrders.every((so) => so.fulfilment === 'pickup') ? 'Pickup contact' : 'Delivery address'}
            </h2>
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 text-[11px] leading-relaxed text-brown-500">
                <p className="font-semibold text-brown-800">
                  {order.address.label} · {order.address.recipient}
                </p>
                <p className="mt-0.5">
                  {order.address.line1}
                  {order.address.landmark ? `, ${order.address.landmark}` : ''}
                  {order.address.village ? `, ${order.address.village}` : ''}
                </p>
                <p>
                  {order.address.town}, {order.address.district}, {order.address.state} — {order.address.pincode}
                </p>
                <p className="mt-1 text-brown-700">{order.address.phone}</p>
              </div>
            </div>
            {order.note && (
              <p className="mt-2 rounded-lg bg-orange-50 px-2.5 py-2 text-[10px] text-orange-700">
                Note for shops & rider: {order.note}
              </p>
            )}
          </Card>

          <Card className="p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brown-900">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Demo protections
            </p>
            <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-brown-400">
              <li className="flex gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> Cancel only before a shop starts preparing.</li>
              <li className="flex gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> COD is tracked by the rider and admin.</li>
              <li className="flex gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> Every status change is logged in demo activity.</li>
            </ul>
          </Card>

          <div className="rounded-xl border border-cream-3 bg-cream-2/50 p-3 text-[10px] leading-relaxed text-brown-400">
            <p className="font-medium text-brown-600">Order placed {formatDate(order.createdAt)}</p>
            <p className="mt-0.5">Last update {formatTime(new Date().toISOString())} in this browser tab.</p>
            <p className="mt-1">Shop · rider · admin share the same local demo state.</p>
          </div>
        </div>
      </div>

      <Link to="/buyer/orders" className="inline-flex items-center gap-1 text-[11px] font-medium text-brown-400 hover:text-brown-700">
        <ArrowLeft className="h-3 w-3" /> All orders
      </Link>

      <ConfirmDialog
        open={Boolean(cancelShopOrder)}
        title={`Cancel ${cancelShopOrder?.shopName ?? 'this shop'} order?`}
        description="The rest of your multi-shop order stays active. This only cancels this shop's packet."
        confirmLabel="Cancel shop order"
        cancelLabel="Keep it"
        tone="danger"
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelShopOrder && order) buyerCancelShopOrder(order.id, cancelShopOrder.id)
        }}
      />
    </div>
  )
}
