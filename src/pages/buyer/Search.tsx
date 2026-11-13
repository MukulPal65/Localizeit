import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Filter, MapPin, SearchX, SlidersHorizontal, Sparkles, Store, X } from 'lucide-react'
import { categories } from '@/data/categories'
import { areaById, defaultAreaId } from '@/data/locations'
import { filterProducts, productsForArea, shopsForArea } from '@/services/catalogService'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { Badge, Button, Card, Chip, EmptyState, Select } from '@/components/ui/primitives'
import { ProductCard, ShopCard } from '@/components/shared/ProductCard'
import { SearchBar } from '@/components/shared/SearchBar'
import { cn } from '@/utils'

const sortOptions = [
  { value: 'relevance', label: 'Best match' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'nearest', label: 'Nearest shop' },
  { value: 'newest', label: 'Recently updated' },
]

export function BuyerSearchPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById(defaultAreaId)!

  const query = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const dealsOnly = params.get('deals') === '1'

  const [availableOnly, setAvailableOnly] = useState(false)
  const [nearbyOnly, setNearbyOnly] = useState(true)
  const [sort, setSort] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setSort('relevance')
  }, [query, categoryId])

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const nearbyShops = useMemo(() => shopsForArea(shops, area), [shops, area])
  const baseShopIds = useMemo(
    () => (nearbyOnly ? new Set(nearbyShops.map((s) => s.id)) : null),
    [nearbyOnly, nearbyShops],
  )
  const baseProducts = useMemo(
    () => (nearbyOnly ? productsForArea(products, nearbyShops) : products.filter((p) => !p.archived)),
    [nearbyOnly, products, nearbyShops],
  )
  const results = useMemo(
    () =>
      filterProducts(products, shops, {
        query,
        categoryId: categoryId || undefined,
        availableOnly,
        dealsOnly,
        sort: sort as never,
      }).filter((product) => !baseShopIds || baseShopIds.has(product.shopId)),
    [products, shops, query, categoryId, availableOnly, dealsOnly, sort, baseShopIds],
  )

  const matchingShops = useMemo(() => {
    const pool = nearbyOnly ? nearbyShops : shops.filter((s) => s.status === 'approved')
    const term = query.trim().toLowerCase()
    if (!term) return []
    return pool.filter((shop) =>
      `${shop.name} ${shop.categoryName} ${shop.town} ${shop.tagline}`.toLowerCase().includes(term),
    )
  }, [nearbyOnly, nearbyShops, shops, query])

  const activeCategory = categories.find((c) => c.id === categoryId)
  const hasFilters = Boolean(categoryId || dealsOnly || availableOnly || query)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/buyer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-4 bg-white/70 text-brown-500">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <SearchBar defaultValue={query} showAi={false} compact />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-brown-900">
            {activeCategory ? activeCategory.name : query ? `Results for “${query}”` : 'Browse products'}
          </h1>
          <p className="mt-0.5 text-[11px] text-brown-400">
            {results.length} product{results.length === 1 ? '' : 's'} ·{' '}
            {nearbyOnly ? `${area.village || area.town}, PIN ${area.pincode}` : 'All demo towns'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={nearbyOnly ? 'dark' : 'secondary'}
            size="sm"
            leftIcon={MapPin}
            onClick={() => setNearbyOnly(!nearbyOnly)}
          >
            {nearbyOnly ? 'Nearby only' : 'All towns'}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={SlidersHorizontal} onClick={() => setShowFilters(!showFilters)}>
            Filters
          </Button>
          <Link to="/buyer/ai">
            <Button variant="outline" size="sm" leftIcon={Sparkles}>
              Ask AI
            </Button>
          </Link>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        <Chip active={!categoryId} onClick={() => updateParam('category')}>
          All categories
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            active={categoryId === category.id}
            onClick={() => updateParam('category', categoryId === category.id ? undefined : category.id)}
          >
            <span>{category.emoji}</span>
            {category.name}
          </Chip>
        ))}
      </div>

      {showFilters && (
        <Card className="animate-fade-in space-y-3 p-3.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brown-900">
              <Filter className="h-3.5 w-3.5" /> Refine results
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams()
                  if (nearbyOnly) next.set('nearby', '1')
                  setParams(next, { replace: true })
                  setAvailableOnly(false)
                  setSort('relevance')
                }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-brown-400 hover:text-danger"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={dealsOnly} onClick={() => updateParam('deals', dealsOnly ? undefined : '1')}>
              Near-expiry deals
            </Chip>
            <Chip active={availableOnly} onClick={() => setAvailableOnly(!availableOnly)}>
              In stock only
            </Chip>
            <Chip active={nearbyOnly} onClick={() => setNearbyOnly(!nearbyOnly)}>
              My area only
            </Chip>
          </div>
          <Select
            label="Sort by"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            options={sortOptions}
          />
        </Card>
      )}

      {matchingShops.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brown-900">
            <Store className="h-3.5 w-3.5 text-orange-500" /> Matching shops
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {matchingShops.slice(0, 4).map((shop) => (
              <ShopCard key={shop.id} shop={shop} variant="horizontal" />
            ))}
          </div>
        </section>
      )}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card className="py-2">
          <EmptyState
            icon={SearchX}
            title="Nothing matched here"
            description={
              nearbyOnly
                ? 'Try a different word or expand the search to all demo towns.'
                : 'Try a simpler product name — like “rice”, “milk” or “notebook”.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setNearbyOnly(false)}>
                  Search all towns
                </Button>
                <Button size="sm" leftIcon={Sparkles} onClick={() => navigate('/buyer/ai')}>
                  Ask LocalizeIt AI
                </Button>
              </div>
            }
          />
        </Card>
      )}

      {hasFilters && results.length > 0 && (
        <p className={cn('text-center text-[10px] text-brown-300')}>
          Demo catalogue · prices and stock are local mock data, not live shop prices.
        </p>
      )}
    </div>
  )
}
