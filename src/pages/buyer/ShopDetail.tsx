import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgePercent,
  Bike,
  Clock,
  Heart,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
} from 'lucide-react'
import { categoryName } from '@/data/categories'
import { areaById, defaultAreaId, serviceabilityLabel } from '@/data/locations'
import { effectivePrice, deliveryFeeFor, estimateMinsFor } from '@/services/feeService'
import { filterProducts } from '@/services/catalogService'
import { useBuyerStore } from '@/store/buyer'
import { useCatalogStore } from '@/store/catalog'
import { useFeeStore } from '@/store/fees'
import { useLocationStore } from '@/store/location'
import { toast } from '@/store/toast'
import { Badge, Button, Card, Chip, EmptyState, Rating, SectionHeader } from '@/components/ui/primitives'
import { ProductImage, ShopAvatar, MapPlaceholder } from '@/components/ui/images'
import { ProductCard } from '@/components/shared/ProductCard'
import { FulfilmentBadge } from '@/components/shared/Misc'
import { ServiceabilityBanner } from '@/components/shared/LocationPicker'
import { cn, formatDistance, formatEta, formatINR } from '@/utils'

export function ShopDetailPage() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const shops = useCatalogStore((s) => s.shops)
  const products = useCatalogStore((s) => s.products)
  const config = useFeeStore((s) => s.config)
  const favourites = useBuyerStore((s) => s.profile.favouriteShopIds)
  const toggleFavourite = useBuyerStore((s) => s.toggleFavourite)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById(defaultAreaId)!

  const shop = shops.find((s) => s.id === shopId)
  const shopProducts = useMemo(
    () => products.filter((p) => p.shopId === shopId && !p.archived),
    [products, shopId],
  )

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [dealsOnly, setDealsOnly] = useState(false)

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const product of shopProducts) {
      map.set(product.categoryId, (map.get(product.categoryId) ?? 0) + 1)
    }
    return Array.from(map.entries())
  }, [shopProducts])

  const visible = useMemo(
    () =>
      filterProducts(products, shops, {
        shopId,
        query,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        dealsOnly,
        sort: 'relevance',
      }),
    [products, shops, shopId, query, categoryId, dealsOnly],
  )

  if (!shop) {
    return (
      <Card>
        <EmptyState
          icon={Store}
          title="Shop not found"
          description="This demo shop may have been removed or is not available in your area."
          action={
            <Button size="sm" onClick={() => navigate('/buyer/shops')}>
              Browse nearby shops
            </Button>
          }
        />
      </Card>
    )
  }

  const favourite = favourites.includes(shop.id)
  const deliveryFee = deliveryFeeFor(shop, 'delivery', config)
  const inStock = shopProducts.filter((p) => p.inStock).length
  const deals = shopProducts.filter((p) => p.deal).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brown-400 hover:text-brown-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleFavourite(shop.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors',
              favourite ? 'border-danger/30 bg-danger-soft text-danger' : 'border-cream-4 bg-white/70 text-brown-400',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', favourite && 'fill-danger')} />
            {favourite ? 'Favourite' : 'Save shop'}
          </button>
          <button
            type="button"
            onClick={() => toast('Demo shop link copied', 'Sharing is simulated in this frontend demo.', 'info')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream-4 bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-brown-400"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className={cn('relative flex items-center justify-center bg-gradient-to-br py-7', shop.tint)}>
          <span className="pattern-dots absolute inset-0 opacity-40" />
          <ShopAvatar name={shop.name} tint={shop.tint} size="lg" className="relative shadow-soft" />
          {!shop.open && (
            <span className="absolute right-3 top-3 rounded-full bg-brown-950/70 px-2.5 py-1 text-[10px] font-semibold text-white">
              Closed now
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-semibold text-brown-900 sm:text-2xl">{shop.name}</h1>
              <p className="mt-0.5 text-xs text-brown-400">{shop.tagline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Rating value={shop.rating} count={shop.reviewCount} />
                <span className="text-[10px] text-brown-300">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-brown-400">
                  <MapPin className="h-3 w-3" /> {formatDistance(shop.distanceKm)} from {area.village || area.town}
                </span>
                <Badge tone="neutral">{shop.categoryName}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shop.pickup && <Badge tone="info">Pickup</Badge>}
              {shop.delivery && <Badge tone="success">Delivery {formatINR(deliveryFee)}</Badge>}
              {deals > 0 && (
                <Badge tone="danger">
                  <BadgePercent className="h-2.5 w-2.5" /> {deals} deal{deals > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
            <p className="flex items-start gap-2 rounded-lg bg-cream-2/60 px-2.5 py-2 text-brown-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brown-300" />
              {shop.address}, {shop.town}, {shop.district} — {shop.pincode}
            </p>
            <p className="flex items-start gap-2 rounded-lg bg-cream-2/60 px-2.5 py-2 text-brown-500">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brown-300" />
              Prep {formatEta(shop.prepTimeMins)} · delivery {formatEta(estimateMinsFor(shop, 'delivery'))} · since {shop.since}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link to={`/buyer/ai?shop=${shop.id}`} className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" leftIcon={Sparkles} className="w-full sm:w-auto">
                Ask AI about this shop
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Phone}
              onClick={() => toast(`Calling ${shop.ownerName}`, `+91 ${shop.phone} · simulated call in this demo.`, 'info')}
            >
              Call shop
            </Button>
            <Link to="/buyer/compare" className="flex-1 sm:flex-none">
              <Button variant="secondary" size="sm" leftIcon={ShieldCheck} className="w-full sm:w-auto">
                Compare prices
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <ServiceabilityBanner area={area} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 min-w-[190px] flex-1 items-center gap-2 rounded-xl border border-cream-4 bg-white/90 px-3">
          <Search className="h-4 w-4 text-brown-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search in ${shop.name}…`}
            aria-label="Search this shop"
            className="h-full min-w-0 flex-1 bg-transparent text-xs text-brown-900 placeholder:text-brown-300 focus:outline-none"
          />
        </div>
        <Badge tone="neutral">{shopProducts.length} products</Badge>
        <Badge tone="success">{inStock} in stock</Badge>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        <Chip active={categoryId === 'all' && !dealsOnly} onClick={() => { setCategoryId('all'); setDealsOnly(false) }}>
          All products
        </Chip>
        {categories.map(([id, count]) => (
          <Chip key={id} active={categoryId === id} onClick={() => setCategoryId(categoryId === id ? 'all' : id)}>
            {categoryName(id)}
            <span className="rounded-full bg-black/5 px-1 text-[9px]">{count}</span>
          </Chip>
        ))}
        <Chip active={dealsOnly} onClick={() => setDealsOnly(!dealsOnly)}>
          <BadgePercent className="h-3 w-3" /> Deals
        </Chip>
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Store}
            title="No products match"
            description="Try another search term or clear the filters to see the full shop catalogue."
            action={
              <Button size="sm" variant="secondary" onClick={() => { setQuery(''); setCategoryId('all'); setDealsOnly(false) }}>
                Clear filters
              </Button>
            }
          />
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeader title="Fulfilment" subtitle="Each shop sets its own pickup and delivery." />
          <div className="space-y-2">
            {shop.delivery && (
              <div className="flex items-start gap-2 rounded-xl border border-cream-3 bg-cream-2/50 p-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div>
                  <p className="text-[11px] font-medium text-brown-800">Local delivery · {formatINR(deliveryFee)}</p>
                  <p className="text-[10px] text-brown-400">
                    {formatDistance(shop.distanceKm)} away. Courier from {shop.town} delivers in about {formatEta(estimateMinsFor(shop, 'delivery'))}.
                  </p>
                </div>
              </div>
            )}
            {shop.pickup && (
              <div className="flex items-start gap-2 rounded-xl border border-cream-3 bg-cream-2/50 p-2.5">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <div>
                  <p className="text-[11px] font-medium text-brown-800">Self pickup · free</p>
                  <p className="text-[10px] text-brown-400">Show your order ID at {shop.address}. Ready in about {formatEta(shop.prepTimeMins)}.</p>
                </div>
              </div>
            )}
            {!shop.delivery && !shop.pickup && (
              <p className="rounded-xl border border-warning/20 bg-warning-soft px-3 py-2 text-[11px] text-warning">
                This shop is not accepting orders yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title="Shop location" subtitle={`${shop.town} · ${shop.district}, ${shop.state}`} />
          <MapPlaceholder
            label={`${shop.name} · shop location`}
            latitude={shop.lat}
            longitude={shop.lng}
            compact
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-cream-2/60 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-brown-300">Owner</p>
              <p className="mt-0.5 font-medium text-brown-800">{shop.ownerName}</p>
            </div>
            <div className="rounded-lg bg-cream-2/60 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-brown-300">Service area</p>
              <p className="mt-0.5 font-medium text-brown-800">{serviceabilityLabel[area.serviceability]}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-2 text-[10px] text-orange-700">
            <Bike className="h-3.5 w-3.5" />
            Riders from {shop.town} handle these deliveries
          </div>
        </Card>
      </div>

      <p className="text-center text-[10px] text-brown-300">
        Demo shop · prices, stock and timings are local mock data. Showing {visible.length} of {shopProducts.length} products.
      </p>

      {shopProducts.some((p) => p.deal) && (
        <section>
          <SectionHeader
            title="Near-expiry deals"
            subtitle="Save money and help the shop reduce waste"
            action={<span className="text-[10px] text-orange-600">{deals} active deals</span>}
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shopProducts.filter((p) => p.deal).map((product) => (
              <Link
                key={product.id}
                to={`/buyer/products/${product.id}`}
                className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-soft/30 p-2.5"
              >
                <ProductImage name={product.name} categoryId={product.categoryId} size="sm" deal />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-brown-900">{product.name}</p>
                  <p className="text-[10px] text-brown-400">{product.deal?.qtyLeft} left · {product.unit}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-danger">
                    {formatINR(effectivePrice(product))}{' '}
                    <span className="text-[9px] font-normal text-brown-300 line-through">{formatINR(product.price)}</span>
                  </p>
                </div>
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
