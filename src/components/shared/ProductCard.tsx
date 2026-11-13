import { Link } from 'react-router-dom'
import { Heart, MapPin, Plus, Star, Store } from 'lucide-react'
import type { Product, Shop } from '@/types'
import { useCartStore } from '@/store/cart'
import { useBuyerStore } from '@/store/buyer'
import { useCatalogStore } from '@/store/catalog'
import { effectivePrice } from '@/services/feeService'
import { cn, formatDistance, formatINR, timeAgo } from '@/utils'
import { Badge, QtyStepper } from '@/components/ui/primitives'
import { ProductImage, ShopAvatar } from '@/components/ui/images'
import { categoryName } from '@/data/categories'

export function ProductCard({
  product,
  variant = 'grid',
  flat = false,
}: {
  product: Product
  variant?: 'grid' | 'list'
  flat?: boolean
}) {
  const shop = useCatalogStore((s) => s.shops.find((sh) => sh.id === product.shopId))
  const qty = useCartStore((s) => s.groups[product.shopId]?.qty[product.id] ?? 0)
  const add = useCartStore((s) => s.add)
  const increment = useCartStore((s) => s.increment)
  const decrement = useCartStore((s) => s.decrement)
  const wishlist = useBuyerStore((s) => s.profile.wishlistProductIds)
  const toggleWishlist = useBuyerStore((s) => s.toggleWishlist)

  const price = effectivePrice(product)
  const listPrice = product.mrp ?? product.price
  const hasDiscount = listPrice > price
  const inStock = product.inStock && product.stock > 0
  const lowStock = inStock && product.stock <= 5
  const saved = wishlist.includes(product.id)

  if (!shop) return null

  const priceBlock = (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="font-heading text-[15px] font-semibold text-brown-900">{formatINR(price)}</span>
      {hasDiscount && (
        <span className="text-[11px] text-brown-300 line-through">{formatINR(listPrice)}</span>
      )}
      <span className="text-[11px] text-brown-400">/ {product.unit}</span>
    </div>
  )

  const addControl = inStock ? (
    qty > 0 ? (
      <QtyStepper
        value={qty}
        size="sm"
        max={product.stock}
        onIncrement={() => increment(product.id, product.shopId)}
        onDecrement={() => decrement(product.id, product.shopId)}
      />
    ) : (
      <button
        type="button"
        onClick={() => add(product.id, product.shopId)}
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-orange-500/50 bg-orange-50 px-2.5 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-100"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>
    )
  ) : (
    <span className="rounded-lg bg-cream-2 px-2 py-1 text-[10px] font-medium text-brown-400">
      Out of stock
    </span>
  )

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-brown-400">
      <span className="inline-flex items-center gap-0.5 truncate">
        <Store className="h-3 w-3 shrink-0 text-brown-300" />
        <span className="max-w-[120px] truncate">{shop.name}</span>
      </span>
      <span className="inline-flex items-center gap-0.5">
        <MapPin className="h-3 w-3" />
        {formatDistance(shop.distanceKm)}
      </span>
      <span>·</span>
      <span>Updated {timeAgo(product.stockUpdatedAt)}</span>
    </div>
  )

  if (variant === 'list') {
    return (
      <div
        className={cn(
          'flex gap-3 rounded-xl border border-cream-3 bg-white/80 p-2.5 transition-shadow hover:shadow-card',
          flat && 'border-transparent bg-transparent p-0',
        )}
      >
        <Link to={`/buyer/products/${product.id}`} className="shrink-0">
          <ProductImage
            name={product.name}
            categoryId={product.categoryId}
            size="sm"
            deal={Boolean(product.deal)}
            className="h-[74px] w-[74px]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/buyer/products/${product.id}`} className="min-w-0">
              <p className="truncate text-[13px] font-medium text-brown-900">{product.name}</p>
              <p className="mt-0.5 text-[10px] text-brown-400">{categoryName(product.categoryId)}</p>
            </Link>
            {addControl}
          </div>
          <div className="mt-1">{priceBlock}</div>
          {meta}
          {!inStock && (
            <Badge tone="danger" className="mt-1.5">
              Out of stock
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-cream-3 bg-white/85 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft sm:rounded-2xl">
      <Link to={`/buyer/products/${product.id}`} className="relative block p-2 pb-0">
        <div className="relative overflow-hidden rounded-lg sm:rounded-xl">
          <ProductImage
            name={product.name}
            categoryId={product.categoryId}
            deal={Boolean(product.deal)}
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {hasDiscount && !product.deal && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {Math.round(((listPrice - price) / listPrice) * 100)}% off
            </span>
          )}
          {!inStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-brown-950/35 text-[11px] font-semibold uppercase tracking-wide text-white">
              Out of stock
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        className={cn(
          'absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 backdrop-blur transition-colors',
          saved ? 'text-danger' : 'text-brown-400 hover:text-danger',
        )}
      >
        <Heart className={cn('h-3.5 w-3.5', saved && 'fill-danger')} />
      </button>

      <div className="flex flex-1 flex-col p-2.5 pt-2">
        <Link to={`/buyer/products/${product.id}`} className="min-h-0">
          <p className="line-clamp-2 text-[12px] font-medium leading-snug text-brown-900 sm:text-[13px]">
            {product.name}
          </p>
          <p className="mt-0.5 text-[10px] text-brown-400">{product.unit}</p>
        </Link>
        <div className="mt-1.5">{priceBlock}</div>
        <div className="mt-1.5 flex-1">{meta}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-0.5 text-[10px] text-brown-400">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {shop.rating.toFixed(1)}
          </span>
          {addControl}
        </div>
        {lowStock && (
          <p className="mt-1 text-[9px] font-medium text-orange-600">Only {product.stock} left</p>
        )}
        {product.deal && (
          <p className="mt-1 text-[9px] font-medium text-danger">
            Deal · ends {new Date(product.deal.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>
    </div>
  )
}

export function ShopCard({
  shop,
  variant = 'vertical',
  showFavourite = true,
}: {
  shop: Shop
  variant?: 'vertical' | 'horizontal' | 'compact'
  showFavourite?: boolean
}) {
  const favourites = useBuyerStore((s) => s.profile.favouriteShopIds)
  const toggleFavourite = useBuyerStore((s) => s.toggleFavourite)
  const products = useCatalogStore((s) => s.products)
  const count = products.filter((p) => p.shopId === shop.id && !p.archived).length
  const isFav = favourites.includes(shop.id)

  if (variant === 'compact') {
    return (
      <Link
        to={`/buyer/shops/${shop.id}`}
        className="flex items-center gap-2.5 rounded-xl border border-cream-3 bg-white/85 p-2.5 transition-shadow hover:shadow-card"
      >
        <ShopAvatar name={shop.name} tint={shop.tint} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-brown-900">{shop.name}</p>
          <p className="text-[10px] text-brown-400">
            {formatDistance(shop.distanceKm)} · {count} items
          </p>
        </div>
      </Link>
    )
  }

  if (variant === 'horizontal') {
    return (
      <div className="relative flex gap-3 rounded-xl border border-cream-3 bg-white/85 p-3 transition-shadow hover:shadow-card">
        <Link to={`/buyer/shops/${shop.id}`} className="shrink-0">
          <ShopAvatar name={shop.name} tint={shop.tint} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/buyer/shops/${shop.id}`}>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-brown-900">{shop.name}</p>
              {!shop.open && (
                <Badge tone="neutral" className="text-[9px]">
                  Closed
                </Badge>
              )}
            </div>
            <p className="truncate text-[11px] text-brown-400">{shop.tagline}</p>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-brown-400">
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {shop.rating.toFixed(1)}
            </span>
            <span>·</span>
            <span>{formatDistance(shop.distanceKm)}</span>
            <span>·</span>
            <span>{count} products</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {shop.pickup && <Badge tone="info">Pickup</Badge>}
            {shop.delivery && <Badge tone="success">Delivery</Badge>}
            <Badge tone="neutral">{shop.categoryName}</Badge>
          </div>
        </div>
        {showFavourite && (
          <button
            type="button"
            onClick={() => toggleFavourite(shop.id)}
            aria-label={isFav ? 'Remove favourite shop' : 'Add favourite shop'}
            className={cn(
              'absolute right-2.5 top-2.5 rounded-full p-1.5 transition-colors',
              isFav ? 'text-danger' : 'text-brown-300 hover:text-danger',
            )}
          >
            <Heart className={cn('h-4 w-4', isFav && 'fill-danger')} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-[220px] shrink-0 overflow-hidden rounded-2xl border border-cream-3 bg-white/85 shadow-card transition-shadow hover:shadow-soft">
      {showFavourite && (
        <button
          type="button"
          onClick={() => toggleFavourite(shop.id)}
          aria-label={isFav ? 'Remove favourite shop' : 'Add favourite shop'}
          className={cn(
            'absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 backdrop-blur transition-colors',
            isFav ? 'text-danger' : 'text-brown-400 hover:text-danger',
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', isFav && 'fill-danger')} />
        </button>
      )}
      <Link to={`/buyer/shops/${shop.id}`}>
        <div className={cn('relative flex h-24 items-center justify-center bg-gradient-to-br', shop.tint)}>
          <span className="pattern-dots absolute inset-0 opacity-40" />
          <ShopAvatar name={shop.name} tint={shop.tint} size="lg" className="shadow-sm" />
          {!shop.open && (
            <span className="absolute inset-0 flex items-center justify-center bg-brown-950/35 text-[11px] font-semibold uppercase tracking-wide text-white">
              Closed now
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-semibold text-brown-900">{shop.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-brown-400">{shop.categoryName}</p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-brown-400">
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="font-medium text-brown-700">{shop.rating.toFixed(1)}</span> ({shop.reviewCount})
            </span>
            <span>{formatDistance(shop.distanceKm)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {shop.pickup && <Badge tone="info">Pickup</Badge>}
            {shop.delivery && <Badge tone="success">Delivery</Badge>}
          </div>
        </div>
      </Link>
    </div>
  )
}
