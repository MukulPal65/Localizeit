import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LayoutGrid, Sparkles } from 'lucide-react'
import { categories } from '@/data/categories'
import { areaById, defaultAreaId } from '@/data/locations'
import { categoryCounts, productsForArea, shopsForArea } from '@/services/catalogService'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { Card } from '@/components/ui/primitives'
import { cn } from '@/utils'

export function BuyerCategoriesPage() {
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById(defaultAreaId)!

  const { counts, shopCounts, total } = useMemo(() => {
    const areaShops = shopsForArea(shops, area)
    const areaProducts = productsForArea(products, areaShops)
    const perCategory: Record<string, number> = {}
    const perCategoryShops: Record<string, Set<string>> = {}
    for (const product of areaProducts) {
      perCategory[product.categoryId] = (perCategory[product.categoryId] ?? 0) + 1
      if (!perCategoryShops[product.categoryId]) perCategoryShops[product.categoryId] = new Set()
      perCategoryShops[product.categoryId].add(product.shopId)
    }
    return {
      counts: categoryCounts(areaProducts),
      shopCounts: Object.fromEntries(
        Object.entries(perCategoryShops).map(([key, value]) => [key, value.size]),
      ) as Record<string, number>,
      total: areaProducts.length,
    }
  }, [products, shops, area])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
            <LayoutGrid className="h-3 w-3" /> Local catalogue
          </span>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-brown-900">Every category, nearby</h1>
          <p className="mt-1 text-xs text-brown-400">
            {total} products from {shopsForArea(shops, area).length} shops serving {area.village || area.town}
          </p>
        </div>
        <Link
          to="/buyer/ai"
          className="inline-flex items-center gap-1.5 rounded-full bg-brown-900 px-3 py-2 text-[11px] font-medium text-cream"
        >
          <Sparkles className="h-3.5 w-3.5 text-orange-300" /> Ask AI to find something
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => {
          const count = counts[category.id] ?? 0
          return (
            <Link
              key={category.id}
              to={`/buyer/search?category=${category.id}`}
              className="group relative overflow-hidden rounded-2xl border border-cream-3 bg-white/85 p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className={cn('flex h-16 items-center justify-center rounded-xl bg-gradient-to-br text-3xl', category.tint)}>
                <span className="pattern-dots absolute inset-0 opacity-20" />
                <span className="relative">{category.emoji}</span>
              </div>
              <p className="mt-2.5 text-sm font-semibold text-brown-900">{category.name}</p>
              <p className="mt-0.5 text-[10px] text-brown-400">
                {count} product{count === 1 ? '' : 's'} · {shopCounts[category.id] ?? 0} shop
                {(shopCounts[category.id] ?? 0) === 1 ? '' : 's'}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-orange-600">
                Browse <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
              {count === 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-cream-2 px-1.5 py-0.5 text-[9px] text-brown-400">
                  New soon
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 bg-cream-2/60 p-4">
        <div>
          <p className="text-sm font-semibold text-brown-900">Can’t find a category?</p>
          <p className="mt-0.5 text-[11px] text-brown-400">
            LocalizeIt adds new village shops every week. Tell the AI what you need.
          </p>
        </div>
        <Link
          to="/buyer/ai"
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-[11px] font-semibold text-white shadow-cta"
        >
          <Sparkles className="h-3.5 w-3.5" /> Describe it to AI
        </Link>
      </Card>
    </div>
  )
}
