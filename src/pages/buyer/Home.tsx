import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgePercent,
  Bike,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Package,
  Sparkles,
  Store,
  TrendingDown,
} from 'lucide-react'
import { categories } from '@/data/categories'
import { areaById } from '@/data/locations'
import {
  categoryCounts,
  dealProducts,
  popularProducts,
  productsForArea,
  recommendedProducts,
  shopsForArea,
} from '@/services/catalogService'
import { buyerOrders, isOrderActive } from '@/services/orderService'
import { useBuyerStore } from '@/store/buyer'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { useOrderStore } from '@/store/orders'
import { Badge, Button, Card, SectionHeader } from '@/components/ui/primitives'
import { ProductImage, ShopAvatar } from '@/components/ui/images'
import { ProductCard, ShopCard } from '@/components/shared/ProductCard'
import { SearchBar, SearchSuggestions } from '@/components/shared/SearchBar'
import { ServiceabilityBanner } from '@/components/shared/LocationPicker'
import { OrderStatusBadge } from '@/components/shared/Misc'
import { cn, formatINR, formatDistance, orderStatusMeta, timeAgo } from '@/utils'

const suggestions = ['Basmati rice', 'Milk', 'Notebook', 'Paneer', 'Sunflower oil']

export function BuyerHomePage() {
  const navigate = useNavigate()
  const profile = useBuyerStore((s) => s.profile)
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const orders = useOrderStore((s) => s.orders)
  const buyerId = useBuyerStore((s) => s.profile.id)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById('area-gyanpur')!

  const storefront = useMemo(() => {
    const areaShops = shopsForArea(shops, area)
    const areaProducts = productsForArea(products, areaShops)
    return {
      areaShops,
      areaProducts,
      deals: dealProducts(areaProducts).slice(0, 6),
      popular: popularProducts(areaProducts, areaShops, 8),
      recommended: recommendedProducts(areaProducts, areaShops, profile.favouriteShopIds, 6),
    }
  }, [shops, products, area, profile.favouriteShopIds])

  const counts = useMemo(() => categoryCounts(storefront.areaProducts), [storefront.areaProducts])
  const activeOrder = useMemo(
    () => buyerOrders(orders, buyerId).find((order) => isOrderActive(order)),
    [orders, buyerId],
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile.name.split(' ')[0]

  return (
    <div className="space-y-5">
      <section className="animate-fade-in">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-brown-300">
              {greeting} · {area.village || area.town}
            </p>
            <h1 className="mt-0.5 text-xl font-semibold text-brown-900 sm:text-2xl">
              Namaste, {firstName} 👋
            </h1>
          </div>
          <Link to="/buyer/compare" className="hidden items-center gap-1.5 text-[11px] font-medium text-orange-600 sm:flex">
            <TrendingDown className="h-3.5 w-3.5" /> Compare prices
          </Link>
        </div>
        <div className="mt-3">
          <SearchBar showAi={false} />
        </div>
        <div className="mt-2.5 hidden sm:block">
          <SearchSuggestions suggestions={suggestions} onPick={(value) => navigate(`/buyer/search?q=${encodeURIComponent(value)}`)} />
        </div>
        <div className="mt-3">
          <ServiceabilityBanner area={area} />
        </div>
      </section>

      {activeOrder && (
        <Link
          to={`/buyer/orders/${activeOrder.id}`}
          className="animate-slide-up flex items-center gap-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-cream-2 p-3.5 shadow-card transition-shadow hover:shadow-soft"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm">
            <Package className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-xs font-semibold text-brown-900">Order {activeOrder.id} is active</p>
              <OrderStatusBadge status={activeOrder.shopOrders[0]?.status ?? 'placed'} short />
            </div>
            <p className="mt-0.5 truncate text-[10px] text-brown-500">
              {activeOrder.shopOrders.length} shop{activeOrder.shopOrders.length > 1 ? 's' : ''} ·{' '}
              {activeOrder.shopOrders.map((so) => so.shopName).join(', ')}
            </p>
            <p className="mt-0.5 text-[10px] text-brown-400">Placed {timeAgo(activeOrder.createdAt)} · tap to track</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-orange-500" />
        </Link>
      )}

      <section>
        <SectionHeader
          title="Shop by category"
          subtitle={`${storefront.areaProducts.length} products across ${storefront.areaShops.length} shops in ${area.town}`}
          action={
            <Link to="/buyer/categories" className="text-[11px] font-medium text-orange-600">
              View all
            </Link>
          }
        />
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              to={`/buyer/search?category=${category.id}`}
              className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-cream-3 bg-white/80 p-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br text-xl', category.tint)}>
                {category.emoji}
              </span>
              <span className="line-clamp-2 text-[9.5px] font-medium leading-tight text-brown-600">
                {category.name}
              </span>
              <span className="text-[8px] text-brown-300">{counts[category.id] ?? 0} items</span>
            </Link>
          ))}
        </div>
      </section>

      {storefront.deals.length > 0 && (
        <section>
          <SectionHeader
            title="Near-expiry deals"
            subtitle="Fresh stock, lower prices — help local shops reduce waste"
            action={
              <Link to="/buyer/search?deals=1" className="text-[11px] font-medium text-orange-600">
                All deals
              </Link>
            }
          />
          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {storefront.deals.map((product) => {
              const shop = shops.find((s) => s.id === product.shopId)
              return (
                <Link
                  key={product.id}
                  to={`/buyer/products/${product.id}`}
                  className="w-[152px] shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-white/85 shadow-card"
                >
                  <div className="relative">
                    <ProductImage name={product.name} categoryId={product.categoryId} size="lg" deal className="h-24 rounded-none" />
                    <Badge tone="danger" className="absolute left-1.5 top-1.5">
                      <BadgePercent className="h-2.5 w-2.5" /> Deal
                    </Badge>
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 min-h-8 text-[11px] font-medium leading-snug text-brown-900">{product.name}</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-heading text-sm font-semibold text-brown-900">
                        {formatINR(product.deal!.dealPrice)}
                      </span>
                      <span className="text-[10px] text-brown-300 line-through">{formatINR(product.price)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-brown-400">
                      {shop?.name} · {shop ? formatDistance(shop.distanceKm) : ''}
                    </p>
                    <p className="mt-1 text-[9px] font-medium text-danger">
                      {product.deal!.qtyLeft} left · ends{' '}
                      {new Date(product.deal!.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="Shops near you"
          subtitle={`Pickup and delivery from ${area.village || area.town}`}
          action={
            <Link to="/buyer/shops" className="text-[11px] font-medium text-orange-600">
              See all
            </Link>
          }
        />
        {storefront.areaShops.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {storefront.areaShops.slice(0, 8).map((shop) => (
              <ShopCard key={shop.id} shop={shop} showFavourite={false} />
            ))}
          </div>
        ) : (
          <Card className="text-center">
            <p className="text-sm font-medium text-brown-800">No shops serve this PIN code yet</p>
            <p className="mt-1 text-[11px] text-brown-400">Change your location or browse another town.</p>
            <Link to="/buyer/shops" className="mt-3 inline-block text-[11px] font-medium text-orange-600">
              Browse all shops →
            </Link>
          </Card>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link to="/buyer/ai" className="group relative overflow-hidden rounded-2xl border border-brown-800 bg-brown-900 p-4 text-cream shadow-card">
          <span className="pattern-dots absolute inset-0 opacity-10" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">Ask LocalizeIt AI</p>
              <p className="mt-1 text-[11px] leading-relaxed text-cream/60">
                “Find rice under ₹100 per kg” or “compare milk prices nearby”. Discovery only — you stay in control.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-orange-300">
                Try the assistant <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
        <Link to="/buyer/compare" className="group relative overflow-hidden rounded-2xl border border-cream-3 bg-white/80 p-4 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-brown-900">Compare before you buy</p>
              <p className="mt-1 text-[11px] leading-relaxed text-brown-400">
                Same product, many shops. See price, distance and delivery side by side.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                Open price comparison <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section>
        <SectionHeader
          title="Popular in your area"
          subtitle="Based on shop rating, stock and nearby demand (demo)"
          action={
            <Link to="/buyer/search" className="text-[11px] font-medium text-orange-600">
              Browse all
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {storefront.popular.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title={profile.favouriteShopIds.length ? 'From your favourite shops' : 'Recommended for you'}
          subtitle="Stocked today, close to home"
          action={
            <Link to="/buyer/account/favourites" className="text-[11px] font-medium text-orange-600">
              Favourite shops
            </Link>
          }
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {storefront.recommended.map((product) => {
            const shop = shops.find((s) => s.id === product.shopId)
            if (!shop) return null
            return (
              <Link
                key={product.id}
                to={`/buyer/products/${product.id}`}
                className="flex items-center gap-3 rounded-xl border border-cream-3 bg-white/80 p-2.5 transition-shadow hover:shadow-card"
              >
                <ProductImage name={product.name} categoryId={product.categoryId} size="sm" deal={Boolean(product.deal)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-brown-900">{product.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-brown-400">
                    {shop.name} · {formatDistance(shop.distanceKm)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-brown-800">
                    {formatINR(product.deal?.dealPrice ?? product.price)}{' '}
                    <span className="text-[9px] font-normal text-brown-400">/ {product.unit}</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-brown-300" />
              </Link>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-cream-3 bg-cream-2/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-success">
              <Bike className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-brown-900">Riders from your own town</p>
              <p className="text-[10px] text-brown-400">Local delivery partners keep each order within a few kilometres.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-brown-400">
            <Clock className="h-3 w-3" /> Typical delivery {area.deliveryEtaMins || 35} min
          </div>
        </div>
      </section>
    </div>
  )
}
