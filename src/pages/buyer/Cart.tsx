import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bike,
  Clock,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react'
import type { QuoteGroup } from '@/services/feeService'
import { effectivePrice } from '@/services/feeService'
import { areaById, defaultAreaId } from '@/data/locations'
import { useCartStore } from '@/store/cart'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { useBuyerStore } from '@/store/buyer'
import { toast } from '@/store/toast'
import { useCartSummary } from '@/hooks/useCartSummary'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  QtyStepper,
} from '@/components/ui/primitives'
import { ProductImage } from '@/components/ui/images'
import { MoneyRow, TotalBar } from '@/components/shared/Misc'
import { ServiceabilityBanner } from '@/components/shared/LocationPicker'
import { cn, formatDistance, formatEta, formatINR } from '@/utils'

export function CartPage() {
  const navigate = useNavigate()
  const { quote, itemCount, shopCount } = useCartSummary()
  const clear = useCartStore((s) => s.clear)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById(defaultAreaId)!
  const [confirmClear, setConfirmClear] = useState(false)

  const hasItems = quote.groups.length > 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Your cart"
        subtitle={
          hasItems
            ? `${itemCount} item${itemCount === 1 ? '' : 's'} across ${shopCount} local shop${shopCount === 1 ? '' : 's'}`
            : 'One cart, many neighbourhood shops.'
        }
        backTo={() => navigate('/buyer')}
        action={
          hasItems ? (
            <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={() => setConfirmClear(true)}>
              Clear cart
            </Button>
          ) : undefined
        }
      />

      <ServiceabilityBanner area={area} />

      {!hasItems ? (
        <Card>
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Browse nearby shops and add items from more than one shop — you will still check out only once."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/buyer/shops">
                  <Button size="sm" leftIcon={Store}>
                    Browse shops
                  </Button>
                </Link>
                <Link to="/buyer/search">
                  <Button size="sm" variant="secondary">
                    Search products
                  </Button>
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            {quote.groups.map((group) => (
              <CartShopGroup key={group.shopId} group={group} />
            ))}
            <Card className="flex items-start gap-3 border-dashed p-3.5">
              <Bike className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p className="text-[10.5px] leading-relaxed text-brown-400">
                Each shop prepares and hands over its own packet. Delivery shops get a rider; pickup shops
                wait for you at the counter. You still pay once at checkout.
              </p>
            </Card>
          </div>

          <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <h2 className="text-base font-semibold text-brown-900">Order summary</h2>
              <div className="mt-3">
                <TotalBar
                  itemSubtotal={quote.breakdown.itemSubtotal}
                  platformFee={quote.breakdown.platformFee}
                  deliveryTotal={quote.breakdown.deliveryTotal}
                  dealSavings={quote.dealSavings}
                  grandTotal={quote.breakdown.grandTotal}
                />
              </div>
              <Button
                className="mt-4 w-full"
                size="lg"
                rightIcon={ArrowRight}
                onClick={() => navigate('/buyer/checkout')}
              >
                Checkout · {formatINR(quote.breakdown.grandTotal)}
              </Button>
              <p className="mt-2 text-center text-[10px] text-brown-400">
                Mock checkout · no real payment will be taken
              </p>
              <Link to="/buyer/compare" className="mt-3 block text-center text-[11px] font-medium text-orange-600">
                Compare prices before checkout
              </Link>
            </Card>

            <Card className="p-3.5">
              <p className="text-xs font-semibold text-brown-900">Fulfilment at a glance</p>
              <div className="mt-2 space-y-1.5">
                {quote.groups.map((group) => (
                  <div key={group.shopId} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-brown-500">{group.shop.name}</span>
                    {group.fulfilment === 'pickup' ? (
                      <Badge tone="info">
                        <PackageCheck className="h-2.5 w-2.5" /> Pickup
                      </Badge>
                    ) : (
                      <Badge tone="success">
                        <Truck className="h-2.5 w-2.5" /> Delivery
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear the whole cart?"
        description="All items across every shop will be removed from this demo cart."
        confirmLabel="Clear cart"
        tone="danger"
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clear()
          toast('Cart cleared', 'You can add items from any nearby shop again.', 'info')
        }}
      />
    </div>
  )
}

function CartShopGroup({ group }: { group: QuoteGroup }) {
  const cartGroup = useCartStore((s) => s.groups[group.shopId])
  const increment = useCartStore((s) => s.increment)
  const decrement = useCartStore((s) => s.decrement)
  const remove = useCartStore((s) => s.remove)
  const setFulfilment = useCartStore((s) => s.setFulfilment)
  const clearShop = useCartStore((s) => s.clearShop)
  const products = useCatalogStore((s) => s.products)
  const profile = useBuyerStore((s) => s.profile)

  const deliveryAddress = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0]
  const shopProducts = useMemo(
    () => new Map(products.filter((p) => p.shopId === group.shopId).map((p) => [p.id, p])),
    [products, group.shopId],
  )

  const fulfilment = cartGroup?.fulfilment ?? group.fulfilment
  const canDeliver = group.shop.delivery
  const canPickup = group.shop.pickup

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-cream-3 bg-cream-2/40 px-3.5 py-2.5">
        <Link to={`/buyer/shops/${group.shopId}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brown-900">{group.shop.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-brown-400">
            <MapPin className="h-2.5 w-2.5" /> {formatDistance(group.shop.distanceKm)} · {group.shop.town}
            <span>·</span>
            <Clock className="h-2.5 w-2.5" /> {formatEta(group.estimatedMins)}
          </p>
        </Link>
        <button
          type="button"
          onClick={() => {
            clearShop(group.shopId)
            toast('Shop removed from cart', group.shop.name, 'info')
          }}
          className="text-[10px] font-medium text-brown-400 hover:text-danger"
        >
          Remove shop
        </button>
      </div>

      <div className="divide-y divide-cream-2">
        {group.items.map((line) => {
          const product = shopProducts.get(line.productId)
          const qty = cartGroup?.qty[line.productId] ?? line.qty
          const max = product?.stock ?? qty
          return (
            <div key={line.productId} className="flex items-center gap-2.5 px-3.5 py-2.5">
              {product && (
                <Link to={`/buyer/products/${product.id}`} className="shrink-0">
                  <ProductImage
                    name={product.name}
                    categoryId={product.categoryId}
                    size="xs"
                    deal={Boolean(product.deal)}
                  />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <Link to={`/buyer/products/${line.productId}`}>
                  <p className="truncate text-xs font-medium text-brown-900">{line.name}</p>
                </Link>
                <p className="mt-0.5 text-[10px] text-brown-400">
                  {line.unit} · {formatINR(line.price)}
                  {product?.deal && (
                    <span className="ml-1 text-danger">
                      (deal {formatINR(effectivePrice(product))})
                    </span>
                  )}
                </p>
              </div>
              <QtyStepper
                value={qty}
                size="sm"
                max={max}
                onIncrement={() => increment(line.productId, group.shopId)}
                onDecrement={() => decrement(line.productId, group.shopId)}
              />
              <div className="w-16 text-right">
                <p className="text-xs font-semibold text-brown-800">{formatINR(line.price * qty)}</p>
                <button
                  type="button"
                  onClick={() => remove(line.productId, group.shopId)}
                  className="text-[9px] text-brown-300 hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-cream-3 bg-cream-2/30 px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-400">
          How should this shop fulfil the order?
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!canDeliver}
            onClick={() => {
              setFulfilment(group.shopId, 'delivery')
              toast('Delivery selected', `${group.shop.name} · local delivery fee applies`, 'info')
            }}
            className={cn(
              'flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45',
              fulfilment === 'delivery'
                ? 'border-success/40 bg-success-soft/40'
                : 'border-cream-3 bg-white/70 hover:border-success/30',
            )}
          >
            <Truck className={cn('mt-0.5 h-4 w-4 shrink-0', fulfilment === 'delivery' ? 'text-success' : 'text-brown-300')} />
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-brown-800">Local delivery</span>
              <span className="block text-[10px] leading-relaxed text-brown-400">
                {canDeliver
                  ? `To ${deliveryAddress ? deliveryAddress.label : 'your address'} · ~${formatEta(group.estimatedMins)}`
                  : 'This shop does not deliver'}
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={!canPickup}
            onClick={() => {
              setFulfilment(group.shopId, 'pickup')
              toast('Pickup selected', `${group.shop.name} · collect from the counter`, 'info')
            }}
            className={cn(
              'flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45',
              fulfilment === 'pickup'
                ? 'border-info/40 bg-info-soft/50'
                : 'border-cream-3 bg-white/70 hover:border-info/30',
            )}
          >
            <PackageCheck className={cn('mt-0.5 h-4 w-4 shrink-0', fulfilment === 'pickup' ? 'text-info' : 'text-brown-300')} />
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-brown-800">Self pickup · free</span>
              <span className="block text-[10px] leading-relaxed text-brown-400">
                {canPickup
                  ? `${group.shop.address}, ready in ~${formatEta(group.shop.prepTimeMins)}`
                  : 'Pickup is not available'}
              </span>
            </span>
          </button>
        </div>
        <div className="space-y-1.5 pt-1">
          <MoneyRow label="Shop subtotal" value={formatINR(group.subtotal)} />
          <MoneyRow
            label={fulfilment === 'pickup' ? 'Pickup' : 'Delivery fee'}
            value={group.deliveryFee === 0 ? 'FREE' : formatINR(group.deliveryFee)}
            tone={group.deliveryFee === 0 ? 'success' : 'default'}
          />
        </div>
      </div>
    </Card>
  )
}
