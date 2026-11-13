import { useMemo, useState } from 'react'
import { BadgePercent, CalendarClock, Plus, Tag, Trash2, TrendingDown } from 'lucide-react'
import type { Product } from '@/types'
import { categoryName } from '@/data/categories'
import { effectivePrice } from '@/services/feeService'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
} from '@/components/ui/primitives'
import { ProductImage } from '@/components/ui/images'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'
import { cn, formatINR, isoDaysFromNow } from '@/utils'

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

interface DealDraft {
  productId: string
  dealPrice: string
  days: string
  qtyLeft: string
}

export function ShopDealsPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shop = useCatalogStore((s) => s.shops.find((item) => item.id === shopId))
  const products = useCatalogStore((s) => s.products)
  const addDeal = useCatalogStore((s) => s.addDeal)
  const removeDeal = useCatalogStore((s) => s.removeDeal)

  const [draft, setDraft] = useState<DealDraft | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Product | null>(null)

  const mine = useMemo(
    () => products.filter((product) => product.shopId === shopId && !product.archived),
    [products, shopId],
  )
  const withDeals = mine.filter((product) => product.deal)
  const withoutDeals = mine.filter((product) => !product.deal)
  const suggestions = withoutDeals
    .filter((product) => {
      const days = daysUntil(product.expiry)
      return (days !== null && days <= 14) || product.stock >= 20
    })
    .sort((a, b) => (daysUntil(a.expiry) ?? 999) - (daysUntil(b.expiry) ?? 999))

  const totalSavings = withDeals.reduce(
    (sum, product) => sum + (product.price - (product.deal?.dealPrice ?? product.price)) * (product.deal?.qtyLeft ?? 0),
    0,
  )
  const unitsLeft = withDeals.reduce((sum, product) => sum + (product.deal?.qtyLeft ?? 0), 0)

  const openFor = (product?: Product) => {
    const first = product ?? withoutDeals[0]
    setDraft({
      productId: first?.id ?? '',
      dealPrice: first ? String(Math.max(1, Math.round(first.price * 0.8))) : '',
      days: '2',
      qtyLeft: first ? String(Math.max(1, Math.min(first.stock, 10))) : '5',
    })
  }

  const selected = draft ? mine.find((product) => product.id === draft.productId) : undefined

  const saveDeal = () => {
    if (!draft || !selected) {
      toast('Choose a product', 'Pick a product to discount first.', 'warning')
      return
    }
    const dealPrice = Number(draft.dealPrice)
    const qtyLeft = Math.floor(Number(draft.qtyLeft))
    const days = Number(draft.days)
    if (!Number.isFinite(dealPrice) || dealPrice <= 0 || dealPrice >= selected.price) {
      toast('Deal price must be lower', `Choose a price below ${formatINR(selected.price)}.`, 'warning')
      return
    }
    if (!Number.isFinite(qtyLeft) || qtyLeft < 1) {
      toast('Add a quantity', 'At least 1 unit must be available in the deal.', 'warning')
      return
    }
    addDeal(selected.id, {
      dealPrice,
      expiresAt: isoDaysFromNow(days),
      qtyLeft: Math.min(qtyLeft, Math.max(1, selected.stock)),
    })
    toast(
      'Deal published',
      `${selected.name} at ${formatINR(dealPrice)} for ${days} day${days === 1 ? '' : 's'}.`,
    )
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Near-expiry deals"
        subtitle="Clear short-dated stock with a local discount. Deal prices show on the buyer storefront automatically."
        action={
          <Button size="sm" leftIcon={Plus} onClick={() => openFor()} disabled={withoutDeals.length === 0}>
            Create deal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Active deals" value={withDeals.length} hint="Live on storefront" icon={BadgePercent} tone="orange" />
        <Stat label="Units in deals" value={unitsLeft} hint="Available at deal price" icon={Tag} tone="info" />
        <Stat label="Buyer savings" value={formatINR(totalSavings)} hint="If all deal units sell" icon={TrendingDown} tone="success" />
        <Stat
          label="Expiring soon"
          value={mine.filter((product) => {
            const days = daysUntil(product.expiry)
            return days !== null && days <= 7
          }).length}
          hint="Products within 7 days"
          icon={CalendarClock}
          tone="warning"
        />
      </div>

      <InfoBanner tone="info" title="How near-expiry deals work">
        Buyers see the deal price with a strike-through on the original price. The discount is funded by your shop,
        not the platform. Remove a deal any time — the product returns to its normal price.
      </InfoBanner>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-semibold text-brown-900">Live deals</h2>
              <p className="text-[11px] text-brown-400">Discounts currently visible to buyers.</p>
            </div>
            <Badge tone="orange">{withDeals.length} active</Badge>
          </div>

          {withDeals.length === 0 ? (
            <EmptyState
              icon={BadgePercent}
              title="No deals running"
              description="Create a discount for dairy, bakery or produce that is close to its expiry date."
              action={
                <Button size="sm" leftIcon={Plus} onClick={() => openFor()} disabled={withoutDeals.length === 0}>
                  Create your first deal
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {withDeals.map((product) => {
                const deal = product.deal!
                const days = daysUntil(deal.expiresAt)
                const savings = Math.round(((product.price - deal.dealPrice) / product.price) * 100)
                return (
                  <div
                    key={product.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-3 bg-white/70 p-3"
                  >
                    <ProductImage name={product.name} categoryId={product.categoryId} size="sm" deal />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-semibold text-brown-900">{product.name}</p>
                        <Badge tone="orange">{savings}% off</Badge>
                        {days !== null && days <= 0 ? (
                          <Badge tone="danger">Expired</Badge>
                        ) : (
                          <Badge tone={days !== null && days <= 1 ? 'warning' : 'neutral'}>
                            {days === 0 ? 'Ends today' : `${days} day${days === 1 ? '' : 's'} left`}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-brown-400">
                        {categoryName(product.categoryId)} · {product.unit} · {deal.qtyLeft} units at deal price
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-orange-600">{formatINR(deal.dealPrice)}</span>
                        <span className="text-[10px] text-brown-300 line-through">{formatINR(product.price)}</span>
                        <span className="text-[10px] text-brown-400">
                          saves {formatINR(product.price - deal.dealPrice)} per {product.unit}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={Trash2}
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => setRemoveTarget(product)}
                    >
                      Remove
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <h2 className="font-heading text-sm font-semibold text-brown-900">Suggested for a deal</h2>
            <p className="mt-0.5 text-[10px] text-brown-400">
              Short expiry or high stock — good candidates to clear quickly.
            </p>
            {suggestions.length === 0 ? (
              <p className="py-5 text-center text-[11px] text-brown-400">
                No suggestions right now. Add expiry dates to products to get smarter suggestions.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {suggestions.slice(0, 5).map((product) => {
                  const days = daysUntil(product.expiry)
                  return (
                    <div key={product.id} className="flex items-center gap-2.5">
                      <ProductImage name={product.name} categoryId={product.categoryId} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-brown-800">{product.name}</p>
                        <p className="text-[9.5px] text-brown-400">
                          {formatINR(product.price)} · stock {product.stock}
                          {days !== null ? ` · ${days <= 0 ? 'expired' : `${days}d left`}` : ''}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => openFor(product)}>
                        Deal
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-sm font-semibold text-brown-900">Quick math</h2>
            <div className="mt-2 space-y-2 text-[11px] text-brown-500">
              <div className="flex justify-between gap-2">
                <span>Products without a deal</span>
                <span className="font-medium text-brown-800">{withoutDeals.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Deal units live</span>
                <span className="font-medium text-brown-800">{unitsLeft}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Max buyer savings</span>
                <span className="font-medium text-success">{formatINR(totalSavings)}</span>
              </div>
            </div>
            <p className="mt-2 rounded-lg bg-cream-2/60 p-2 text-[10px] leading-relaxed text-brown-400">
              Discounting by 15–25% is typical for dairy and bakery items expiring in 1–2 days.
            </p>
          </Card>

          <DemoNote>Deals are demo discounts — checkout applies them without any real payment.</DemoNote>
        </div>
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title="Create a near-expiry deal"
        description="Pick a product, set a lower price and choose how long the deal runs."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveDeal}>
              Publish deal
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <Select
              label="Product"
              value={draft.productId}
              options={withoutDeals.map((product) => ({
                value: product.id,
                label: `${product.name} · ${formatINR(product.price)} · stock ${product.stock}`,
              }))}
              onChange={(event) => {
                const product = mine.find((item) => item.id === event.target.value)
                setDraft({
                  ...draft,
                  productId: event.target.value,
                  dealPrice: product ? String(Math.max(1, Math.round(product.price * 0.8))) : draft.dealPrice,
                  qtyLeft: product ? String(Math.max(1, Math.min(product.stock, 10))) : draft.qtyLeft,
                })
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Deal price (₹)"
                required
                inputMode="decimal"
                value={draft.dealPrice}
                onChange={(event) =>
                  setDraft({ ...draft, dealPrice: event.target.value.replace(/[^\d.]/g, '') })
                }
                hint={selected ? `Normal price ${formatINR(selected.price)}` : undefined}
              />
              <Input
                label="Units in deal"
                inputMode="numeric"
                value={draft.qtyLeft}
                onChange={(event) => setDraft({ ...draft, qtyLeft: event.target.value.replace(/\D/g, '') })}
                hint={selected ? `Stock ${selected.stock}` : undefined}
              />
            </div>
            <Select
              label="Deal duration"
              value={draft.days}
              options={[
                { value: '1', label: 'Ends in 1 day' },
                { value: '2', label: 'Ends in 2 days' },
                { value: '3', label: 'Ends in 3 days' },
                { value: '7', label: 'Ends in 7 days' },
              ]}
              onChange={(event) => setDraft({ ...draft, days: event.target.value })}
            />
            {selected && Number(draft.dealPrice) > 0 && Number(draft.dealPrice) < selected.price && (
              <div className="rounded-xl bg-cream-2/60 p-3 text-[10px] leading-relaxed text-brown-500">
                Buyer pays{' '}
                <span className="font-semibold text-orange-600">{formatINR(Number(draft.dealPrice))}</span> instead of{' '}
                <span className="line-through">{formatINR(effectivePrice({ ...selected, deal: undefined }))}</span>.
                You save the customer {formatINR(selected.price - Number(draft.dealPrice))} per {selected.unit}.
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Remove deal for ${removeTarget?.name ?? 'product'}?`}
        description="The product goes back to its normal price immediately."
        confirmLabel="Remove deal"
        tone="danger"
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return
          removeDeal(removeTarget.id)
          toast('Deal removed', `${removeTarget.name} is back at full price.`, 'info')
        }}
      />
    </div>
  )
}
