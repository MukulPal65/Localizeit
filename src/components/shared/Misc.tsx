import type { ReactNode } from 'react'
import { Check, Clock, MapPin } from 'lucide-react'
import type { OrderStatus, ServiceArea, ShopOrder, StatusEvent, Fulfilment } from '@/types'
import { ORDER_FLOW, cn, formatINR, formatTime, orderStatusMeta } from '@/utils'
import { Badge } from '@/components/ui/primitives'
import { serviceabilityLabel } from '@/data/locations'

export function OrderStatusBadge({ status, short = false }: { status: OrderStatus; short?: boolean }) {
  const meta = orderStatusMeta[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
        meta.tone,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {short ? meta.short : meta.label}
    </span>
  )
}

export function ServiceabilityBadge({ area }: { area: ServiceArea }) {
  if (area.serviceability === 'full') return <Badge tone="success">Delivery available</Badge>
  if (area.serviceability === 'pickup') return <Badge tone="info">Pickup only</Badge>
  return <Badge tone="warning">Not serviceable</Badge>
}

export function MoneyRow({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'success' | 'muted' | 'total'
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className={cn('text-brown-500', tone === 'muted' && 'text-brown-400')}>
        {label}
        {hint && <span className="block text-[10px] text-brown-300">{hint}</span>}
      </span>
      <span
        className={cn(
          'shrink-0 font-medium text-brown-800',
          tone === 'success' && 'text-success',
          tone === 'muted' && 'text-brown-400',
          tone === 'total' && 'font-heading text-base font-semibold text-brown-900',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function FulfilmentBadge({ fulfilment }: { fulfilment: Fulfilment }) {
  return fulfilment === 'pickup' ? (
    <Badge tone="info">
      <MapPin className="h-2.5 w-2.5" />
      Self pickup
    </Badge>
  ) : (
    <Badge tone="success">
      <Clock className="h-2.5 w-2.5" />
      Local delivery
    </Badge>
  )
}

const pickupFlow: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'delivered']
const deliveryFlow: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered']

export function OrderTimeline({
  shopOrder,
  compact = false,
}: {
  shopOrder: ShopOrder
  compact?: boolean
}) {
  if (shopOrder.status === 'rejected' || shopOrder.status === 'cancelled') {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger-soft/50 p-3">
        <p className="text-xs font-semibold text-danger">
          {shopOrder.status === 'rejected' ? 'Rejected by shop' : 'Order cancelled'}
        </p>
        {shopOrder.rejectionReason && (
          <p className="mt-1 text-[11px] leading-relaxed text-brown-500">
            “{shopOrder.rejectionReason}”
          </p>
        )}
      </div>
    )
  }

  const flow = shopOrder.fulfilment === 'pickup' ? pickupFlow : deliveryFlow
  const currentIndex = flow.indexOf(shopOrder.status)
  const history: StatusEvent[] = shopOrder.statusHistory
  const historyByStatus = new Map(history.map((h) => [h.status, h]))

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {flow.map((status, index) => {
          const done = index <= currentIndex
          return (
            <span
              key={status}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                done ? 'bg-orange-500' : 'bg-cream-3',
                index === currentIndex && 'bg-orange-500',
              )}
              title={orderStatusMeta[status].label}
            />
          )
        })}
      </div>
    )
  }

  return (
    <ol className="relative space-y-0">
      {flow.map((status, index) => {
        const done = index <= currentIndex
        const event = historyByStatus.get(status)
        const isLast = index === flow.length - 1
        const active = index === currentIndex
        return (
          <li key={status} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[9px] top-5 h-[calc(100%-14px)] w-px',
                  done ? 'bg-success/40' : 'bg-cream-3',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-[1] mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2',
                done
                  ? active
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-success/30 bg-success text-white'
                  : 'border-cream-3 bg-cream-2',
              )}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-brown-300" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'text-xs font-medium',
                    done ? 'text-brown-800' : 'text-brown-300',
                  )}
                >
                  {orderStatusMeta[status].label}
                </p>
                {event && (
                  <span className="shrink-0 text-[10px] text-brown-400">{formatTime(event.at)}</span>
                )}
              </div>
              {active && (
                <p className="mt-0.5 text-[10px] text-brown-400">
                  {shopOrder.fulfilment === 'pickup' && status === 'ready'
                    ? 'Show your order ID at the shop counter.'
                    : 'Live demo status — updated by the shop, rider or admin.'}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function TotalBar({
  itemSubtotal,
  platformFee,
  deliveryTotal,
  dealSavings,
  grandTotal,
  codAmount,
  compact = false,
}: {
  itemSubtotal: number
  platformFee: number
  deliveryTotal: number
  dealSavings?: number
  grandTotal: number
  codAmount?: number
  compact?: boolean
}) {
  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      <MoneyRow label="Item subtotal" value={formatINR(itemSubtotal)} />
      <MoneyRow
        label="Platform fee"
        hint={platformFee === 0 ? 'Free above the configured threshold' : undefined}
        value={platformFee === 0 ? 'FREE' : formatINR(platformFee)}
        tone={platformFee === 0 ? 'success' : 'default'}
      />
      <MoneyRow
        label="Delivery charges"
        value={deliveryTotal === 0 ? 'FREE' : formatINR(deliveryTotal)}
        tone={deliveryTotal === 0 ? 'success' : 'default'}
      />
      {typeof codAmount === 'number' && codAmount > 0 && (
        <MoneyRow label="Cash to keep ready" value={formatINR(codAmount)} tone="default" />
      )}
      <div className="border-t border-dashed border-cream-4 pt-2">
        <MoneyRow label="Grand total" value={formatINR(grandTotal)} tone="total" />
      </div>
      {!!dealSavings && dealSavings > 0 && (
        <p className="text-[10px] font-medium text-success">
          Deal savings applied: {formatINR(dealSavings)}
        </p>
      )}
    </div>
  )
}

export function SectionLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-medium text-orange-600 hover:text-orange-700"
    >
      {children}
    </button>
  )
}

export function AreaLabel({ area }: { area: ServiceArea }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-brown-400">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
      {area.village ? `${area.village}, ${area.town}` : area.town} · {serviceabilityLabel[area.serviceability]}
    </span>
  )
}

export { ORDER_FLOW }
