import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  Bike,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
} from 'lucide-react'
import { ProductImage, ShopAvatar } from '@/components/ui/images'
import { Badge, Button, Card, Divider, QtyStepper, Rating } from '@/components/ui/primitives'
import { ProductCard } from '@/components/shared/ProductCard'
import { FulfilmentBadge } from '@/components/shared/Misc'
import { effectivePrice, deliveryFeeFor, estimateMinsFor } from '@/services/feeService'
import { alternativesFor } from '@/services/catalogService'
import { useCatalogStore } from '@/store/catalog'
import { useCartStore } from '@/store/cart'
import { useBuyerStore } from '@/store/buyer'
import { useFeeStore } from '@/store/fees'
import { toast } from '@/store/toast'
import { categoryName } from '@/data/categories'
import { cn, formatDate, formatDistance, formatEta, formatINR, timeAgo } from '@/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const config = useFeeStore((s) => s.config)
  const add = useCartStore((s) => s.add)
  const qtyInCart = useCartStore((s) => (productId ? s.groups[products.find((p) => p.id === productId)?.shopId ?? '']?.qty[productId] ?? 0 : 0))
  const wishlist = useBuyerStore((s) => s.profile.wishlistProductIds)
  const toggleWishlist = useBuyerStore((s) => s.toggleWishlist)
  const [qty, setQty] = useState(1)

  const product = products.find((p) => p.id === productId)
  const shop = shops.find((s) => s.id === product?.shopId)

  const related = useMemo(() => {
    if (!product) return []
    return products
      .filter((p) => p.shopId === product.shopId && p.id !== product.id && !p.archived)
      .slice(0, 4)
  }, [products, product])

  const alternatives = useMemo(
    () => (product ? alternativesFor(product, products, shops, 4) : []),
    [product, products, shops],
  )

  if (!product || !shop) {
    return (
      <Card>
        <div className="py-10 text-center">
          <p className="font-heading text-lg font-semibold text-brown-900">Product not found</p>
          <p className="mt-1 text-xs text-brown-400">This demo product may have been archived.</p>
          <Link to="/buyer/search" className="mt-4 inline-block text-xs font-medium text-orange-600">
            Browse products →
          </Link>
        </div>
      </Card>
    )
  }

  const price = effectivePrice(product)
  const listPrice = product.mrp ?? product.price
  const discountPct = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0
  const inStock = product.inStock && product.stock > 0
  const saved = wishlist.includes(product.id)
  const deliveryFee = deliveryFeeFor(shop, 'delivery', config)
  const eta = estimateMinsFor(shop, 'delivery')
  const expiryDays = product.expiry
    ? Math.ceil((new Date(product.expiry).getTime() - Date.now()) / 86_400_000)
    : null

  const addToCart = (goToCart = false) => {
    add(product.id, product.shopId, qty)
    toast('Added to cart', `${product.name} · ${qty} × ${product.unit}`, 'success')
    if (goToCart) navigate('/buyer/cart')
  }

  return (
    <div className="space-y-5">
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
            onClick={() => toggleWishlist(product.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors',
              saved ? 'border-danger/30 bg-danger-soft text-danger' : 'border-cream-4 bg-white/70 text-brown-400',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', saved && 'fill-danger')} />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => toast('Demo link copied', 'Sharing is simulated in this frontend demo.', 'info')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream-4 bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-brown-400"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-3 sm:p-4">
          <div className="relative overflow-hidden rounded-2xl">
            <ProductImage
              name={product.name}
              categoryId={product.categoryId}
              size="lg"
              deal={Boolean(product.deal)}
              className="h-56 sm:h-72"
            />
            {discountPct > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-bold text-white">
                {discountPct}% off
              </span>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-brown-300">
              {categoryName(product.categoryId)} · {product.unit}
            </p>
            <h1 className="mt-1 font-heading text-xl font-semibold leading-snug text-brown-900 sm:text-2xl">
              {product.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Rating value={shop.rating} count={shop.reviewCount} />
              <span className="text-[10px] text-brown-300">·</span>
              <span className="text-[10px] text-brown-400">Stock updated {timeAgo(product.stockUpdatedAt)}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <span className="font-heading text-2xl font-semibold text-brown-900">{formatINR(price)}</span>
              {listPrice > price && <span className="text-sm text-brown-300 line-through">{formatINR(listPrice)}</span>}
              <span className="text-[11px] text-brown-400">per {product.unit}</span>
              {product.deal && (
                <Badge tone="danger">
                  <BadgePercent className="h-2.5 w-2.5" /> Deal until {formatDate(product.deal.expiresAt)}
                </Badge>
              )}
            </div>

            {product.deal && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/50 px-3 py-2 text-[11px] text-danger">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Near-expiry deal — only {product.deal.qtyLeft} left at {formatINR(product.deal.dealPrice)}. Best
                  before {formatDate(product.deal.expiresAt)}.
                </span>
              </div>
            )}

            {expiryDays !== null && expiryDays <= 30 && !product.deal && (
              <p className="mt-2 text-[10px] font-medium text-warning">
                Best before {formatDate(product.expiry!)} ({expiryDays <= 0 ? 'past date — demo data' : `${expiryDays} days`})
              </p>
            )}

            <Divider className="my-4" />

            <div className="flex flex-wrap items-center gap-2">
              {inStock ? (
                <>
                  <QtyStepper
                    value={qty}
                    max={product.stock}
                    onIncrement={() => setQty((value) => Math.min(product.stock, value + 1))}
                    onDecrement={() => setQty((value) => Math.max(1, value - 1))}
                  />
                  <Button size="md" leftIcon={ShoppingBag} onClick={() => addToCart()} className="flex-1">
                    Add to cart
                  </Button>
                  <Button size="md" variant="dark" onClick={() => addToCart(true)} className="flex-1">
                    Buy now
                  </Button>
                </>
              ) : (
                <div className="w-full rounded-xl border border-cream-3 bg-cream-2 p-3 text-center">
                  <p className="text-xs font-semibold text-brown-700">Out of stock at this shop</p>
                  <p className="mt-0.5 text-[10px] text-brown-400">
                    Check the alternatives below or ask the shopkeeper in your next visit.
                  </p>
                </div>
              )}
            </div>
            {qtyInCart > 0 && (
              <p className="mt-2 text-[10px] text-brown-400">
                Already in your cart: {qtyInCart} × {product.unit}
              </p>
            )}
            {inStock && product.stock <= 5 && (
              <p className="mt-2 text-[10px] font-medium text-orange-600">Only {product.stock} left in stock</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {shop.delivery && <Badge tone="success">Delivery {formatDistance(shop.distanceKm)}</Badge>}
              {shop.pickup && <Badge tone="info">Self pickup</Badge>}
              <Badge tone="neutral">Stock verified today</Badge>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Link to={`/buyer/shops/${shop.id}`}>
                <ShopAvatar name={shop.name} tint={shop.tint} size="md" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/buyer/shops/${shop.id}`} className="block">
                  <p className="truncate text-sm font-semibold text-brown-900">{shop.name}</p>
                  <p className="truncate text-[10px] text-brown-400">{shop.tagline}</p>
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-brown-400">
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {formatDistance(shop.distanceKm)}
                  </span>
                  <span>·</span>
                  <span className={shop.open ? 'text-success' : 'text-danger'}>
                    {shop.open ? 'Open now' : 'Closed now'}
                  </span>
                </div>
              </div>
            </div>
            <Divider className="my-3" />
            <div className="space-y-2 text-[11px] text-brown-500">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brown-300" />
                {shop.address}, {shop.town}, {shop.district} — {shop.pincode}
              </p>
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brown-300" />
                Typical prep {formatEta(shop.prepTimeMins)} · delivery ETA {formatEta(eta)}
              </p>
              <p className="flex items-start gap-2">
                <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brown-300" />
                Serving since {shop.since} · categories: {shop.categoryName}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Link to={`/buyer/shops/${shop.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  Visit shop
                </Button>
              </Link>
              <Link to="/buyer/ai" className="flex-1">
                <Button variant="outline" size="sm" leftIcon={Sparkles} className="w-full">
                  Ask AI
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold text-brown-900">Delivery & fulfilment</p>
            <div className="mt-2.5 space-y-2">
              {shop.delivery ? (
                <div className="flex items-start gap-2 rounded-xl border border-cream-3 bg-cream-2/50 p-2.5">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-brown-800">Local delivery · {formatINR(deliveryFee)}</p>
                    <p className="text-[10px] text-brown-400">
                      {formatDistance(shop.distanceKm)} away, approx {formatEta(eta)} after shop confirms.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-cream-3 bg-cream-2/50 p-2.5">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <div>
                    <p className="text-[11px] font-medium text-brown-800">Pickup only</p>
                    <p className="text-[10px] text-brown-400">This shop does not offer home delivery yet.</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-xl border border-cream-3 bg-cream-2/50 p-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <div>
                  <p className="text-[11px] font-medium text-brown-800">Demo purchase protection</p>
                  <p className="text-[10px] text-brown-400">
                    No real payment is collected. Refunds and policies are illustrative.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-orange-50 px-2.5 py-2 text-[10px] text-orange-700">
                <span className="inline-flex items-center gap-1.5">
                  <Bike className="h-3.5 w-3.5" /> Riders from {shop.town}
                </span>
                <span className="font-semibold">{shop.open ? 'Available' : 'Shop closed'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-brown-900">About this product</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-brown-500">{product.description}</p>
        <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Unit', product.unit],
            ['Category', categoryName(product.categoryId)],
            ['Stock', `${product.stock} ${product.stock === 1 ? 'unit' : 'units'}`],
            ['Shop price', formatINR(product.price)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-cream-3 bg-cream-2/40 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-brown-300">{label}</p>
              <p className="mt-0.5 font-medium text-brown-800">{value}</p>
            </div>
          ))}
        </div>
        {product.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <Link
                key={tag}
                to={`/buyer/search?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-cream-4 bg-white px-2 py-0.5 text-[10px] text-brown-400 hover:border-orange-300 hover:text-orange-600"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </Card>

      {alternatives.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-brown-900">Compare with nearby shops</h2>
              <p className="mt-0.5 text-[10px] text-brown-400">Same item sold by other local shops. Prices are demo data.</p>
            </div>
            <Link to="/buyer/compare" className="text-[10px] font-medium text-orange-600">
              Full comparison →
            </Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {alternatives.map(({ product: alt, shop: altShop }) => {
              const altPrice = effectivePrice(alt)
              const saving = price - altPrice
              return (
                <Link
                  key={alt.id}
                  to={`/buyer/products/${alt.id}`}
                  className="flex items-center gap-3 rounded-xl border border-cream-3 bg-white/70 p-2.5 transition-colors hover:border-orange-300"
                >
                  <ProductImage name={alt.name} categoryId={alt.categoryId} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-brown-900">{altShop.name}</p>
                    <p className="text-[10px] text-brown-400">
                      {formatDistance(altShop.distanceKm)} · {alt.inStock ? 'In stock' : 'Out of stock'} · {alt.unit}
                    </p>
                  </div>
                  {saving > 0 && <Badge tone="success">Save {formatINR(saving)}</Badge>}
                  <span className="text-sm font-semibold text-brown-900">{formatINR(altPrice)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-brown-300" />
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {related.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brown-900">More from {shop.name}</h2>
            <Link to={`/buyer/shops/${shop.id}`} className="text-[10px] font-medium text-orange-600">
              View shop →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
