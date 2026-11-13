import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgePercent,
  Bike,
  Check,
  ChevronDown,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Store,
  TrendingDown,
} from 'lucide-react'
import type { Product, Shop } from '@/types'
import { areaById, defaultAreaId } from '@/data/locations'
import { categoryName } from '@/data/categories'
import { comparableGroups, shopsForArea } from '@/services/catalogService'
import { effectivePrice } from '@/services/feeService'
import { useCartStore } from '@/store/cart'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { toast } from '@/store/toast'
import { Badge, Button, Card, Chip, EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives'
import { ProductImage } from '@/components/ui/images'
import { cn, formatDistance, formatINR } from '@/utils'

type SortMode = 'best' | 'cheapest' | 'nearest'

export function ComparePage() {
  const navigate = useNavigate()
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const add = useCartStore((s) => s.add)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById(defaultAreaId)!

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('best')
  const [nearbyOnly, setNearbyOnly] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const areaShops = useMemo(() => shopsForArea(shops, area), [shops, area])
  const groups = useMemo(
    () => comparableGroups(products, shops, { areaShops: nearbyOnly ? areaShops : undefined }),
    [products, shops, areaShops, nearbyOnly],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return groups
      .filter((group) => !term || group.label.toLowerCase().includes(term))
      .map((group) => ({
        ...group,
        products: [...group.products].sort((a, b) => {
          if (sort === 'cheapest') return effectivePrice(a.product) - effectivePrice(b.product)
          if (sort === 'nearest') return a.shop.distanceKm - b.shop.distanceKm
          const aScore = effectivePrice(a.product) + a.shop.distanceKm * 4 - (a.shop.delivery ? 5 : 0)
          const bScore = effectivePrice(b.product) + b.shop.distanceKm * 4 - (b.shop.delivery ? 5 : 0)
          return aScore - bScore
        }),
      }))
  }, [groups, query, sort])

  const totalSavings = useMemo(
    () =>
      groups.reduce((sum, group) => {
        const prices = group.products.map((row) => effectivePrice(row.product))
        return sum + (Math.max(...prices) - Math.min(...prices))
      }, 0),
    [groups],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compare local prices"
        subtitle={`The same everyday item, sold by different shops in ${area.village || area.town}. Prices update with shopkeeper stock changes.`}
        backTo={() => navigate('/buyer')}
        action={
          <Link to="/buyer/ai">
            <Button variant="outline" size="sm" leftIcon={Sparkles}>
              Ask AI
            </Button>
          </Link>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <Card className="p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-brown-400">Items compared</p>
          <p className="mt-1 font-heading text-lg font-semibold text-brown-900">{groups.length}</p>
          <p className="text-[10px] text-brown-400">Sold by 2 or more nearby shops</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-brown-400">Possible savings</p>
          <p className="mt-1 font-heading text-lg font-semibold text-success">{formatINR(totalSavings)}</p>
          <p className="text-[10px] text-brown-400">Gap between cheapest and costliest</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-brown-400">Shops in view</p>
          <p className="mt-1 font-heading text-lg font-semibold text-brown-900">
            {new Set(groups.flatMap((group) => group.products.map((row) => row.shop.id))).size}
          </p>
          <p className="text-[10px] text-brown-400">{nearbyOnly ? `Serving PIN ${area.pincode}` : 'All demo towns'}</p>
        </Card>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 min-w-[190px] flex-1 items-center gap-2 rounded-xl border border-cream-4 bg-white px-3">
            <Search className="h-4 w-4 text-brown-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search an item to compare…"
              aria-label="Search items to compare"
              className="h-full min-w-0 flex-1 bg-transparent text-xs text-brown-900 placeholder:text-brown-300 focus:outline-none"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            <Chip active={sort === 'best'} onClick={() => setSort('best')}>
              Best value
            </Chip>
            <Chip active={sort === 'cheapest'} onClick={() => setSort('cheapest')}>
              Cheapest first
            </Chip>
            <Chip active={sort === 'nearest'} onClick={() => setSort('nearest')}>
              Nearest shop
            </Chip>
          </div>
          <Button
            variant={nearbyOnly ? 'dark' : 'secondary'}
            size="sm"
            leftIcon={MapPin}
            onClick={() => setNearbyOnly(!nearbyOnly)}
          >
            {nearbyOnly ? 'My area' : 'All towns'}
          </Button>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={TrendingDown}
            title="No shared items found"
            description="Try clearing the search, or switch to all demo towns to compare a wider catalogue."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setNearbyOnly(false)
                }}
              >
                Show all towns
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((group) => {
            const best = group.products[0]
            const open = expanded === group.key
            const rows = open ? group.products : group.products.slice(0, 3)
            return (
              <Card key={group.key} className="overflow-hidden p-0">
                <div className="flex items-center gap-3 border-b border-cream-3 bg-cream-2/40 p-3">
                  <ProductImage
                    name={group.label}
                    categoryId={group.products[0].product.categoryId}
                    size="sm"
                    deal={group.products.some((row) => row.product.deal)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brown-900">{group.label}</p>
                    <p className="mt-0.5 text-[10px] text-brown-400">
                      {group.products.length} shops · {categoryName(group.products[0].product.categoryId)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wide text-brown-300">Lowest</p>
                    <p className="font-heading text-sm font-semibold text-success">
                      {formatINR(Math.min(...group.products.map((row) => effectivePrice(row.product))))}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-cream-2">
                  {rows.map((row, index) => (
                    <CompareRow key={row.product.id} product={row.product} shop={row.shop} best={index === 0 && sort !== 'nearest'} />
                  ))}
                </div>

                {group.products.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : group.key)}
                    className="flex w-full items-center justify-center gap-1 border-t border-cream-3 py-2 text-[10px] font-medium text-orange-600"
                  >
                    {open ? 'Show fewer shops' : `Show all ${group.products.length} shops`}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
                  </button>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-3 px-3 py-2">
                  <p className="text-[10px] text-brown-400">
                    Best value at <span className="font-medium text-brown-700">{best.shop.name}</span> ·{' '}
                    {formatDistance(best.shop.distanceKm)}
                  </p>
                  <Button
                    size="sm"
                    leftIcon={Plus}
                    onClick={() => {
                      add(best.product.id, best.shop.id)
                      toast('Added to cart', `${best.product.name} · ${best.shop.name}`, 'success')
                    }}
                  >
                    Add best value
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="flex items-start gap-3 border-dashed p-3.5">
        <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <p className="text-[10.5px] leading-relaxed text-brown-400">
          Comparison uses the current demo catalogue, including active near-expiry deals. Delivery fees and
          pickup availability are shown per shop because each shop fulfils orders independently.
        </p>
      </Card>
    </div>
  )
}

function CompareRow({ product, shop, best }: { product: Product; shop: Shop; best: boolean }) {
  const add = useCartStore((s) => s.add)
  const price = effectivePrice(product)
  const saved = product.mrp && product.mrp > price
  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-2.5', best && 'bg-success-soft/20')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={`/buyer/shops/${shop.id}`} className="truncate text-xs font-medium text-brown-800 hover:text-orange-600">
            {shop.name}
          </Link>
          {best && (
            <Badge tone="success">
              <Check className="h-2.5 w-2.5" /> Best value
            </Badge>
          )}
          {product.deal && <Badge tone="danger">Deal</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-brown-400">
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" /> {formatDistance(shop.distanceKm)}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            {shop.delivery ? <Bike className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
            {shop.delivery ? 'Delivery' : 'Pickup only'}
          </span>
          <span>·</span>
          <span>Stock {product.stock}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-heading text-sm font-semibold text-brown-900">{formatINR(price)}</p>
        <p className="text-[9px] text-brown-400">
          / {product.unit}
          {saved && <span className="ml-1 text-brown-300 line-through">{formatINR(product.mrp!)}</span>}
        </p>
      </div>
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => {
          add(product.id, shop.id)
          toast('Added to cart', `${product.name} · ${shop.name}`)
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Add ${product.name} from ${shop.name}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
