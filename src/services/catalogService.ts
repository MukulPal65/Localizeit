import type { Product, ServiceArea, Shop } from '@/types'
import { effectivePrice } from '@/services/feeService'
import { normalizeName, uniqueBy } from '@/utils'

export type ProductSort = 'relevance' | 'price_low' | 'price_high' | 'nearest' | 'newest'

export interface ProductFilters {
  query?: string
  categoryId?: string
  shopId?: string
  availableOnly?: boolean
  dealsOnly?: boolean
  maxPrice?: number
  sort?: ProductSort
}

export function availableShops(shops: Shop[]): Shop[] {
  return shops.filter((shop) => shop.status === 'approved')
}

export function shopsForArea(shops: Shop[], area: ServiceArea): Shop[] {
  return availableShops(shops).filter(
    (shop) => shop.servicePins.includes(area.pincode) || shop.town === area.town,
  )
}

export function productsForArea(products: Product[], areaShops: Shop[]): Product[] {
  const ids = new Set(areaShops.map((s) => s.id))
  return products.filter((p) => ids.has(p.shopId) && !p.archived)
}

export function getShop(shops: Shop[], shopId: string): Shop | undefined {
  return shops.find((s) => s.id === shopId)
}

export function filterProducts(
  products: Product[],
  shops: Shop[],
  filters: ProductFilters,
): Product[] {
  const shopMap = new Map(shops.map((s) => [s.id, s]))
  const query = filters.query?.trim().toLowerCase() ?? ''
  const tokens = query.split(/\s+/).filter(Boolean)

  let list = products.filter((p) => {
    if (p.archived) return false
    if (filters.categoryId && p.categoryId !== filters.categoryId) return false
    if (filters.shopId && p.shopId !== filters.shopId) return false
    if (filters.availableOnly && !p.inStock) return false
    if (filters.dealsOnly && !p.deal) return false
    if (filters.maxPrice && effectivePrice(p) > filters.maxPrice) return false
    if (!query) return true
    const haystack = `${p.name} ${p.tags.join(' ')} ${p.description}`.toLowerCase()
    return tokens.some((token) => haystack.includes(token))
  })

  const sort = filters.sort ?? 'relevance'
  list = [...list].sort((a, b) => {
    switch (sort) {
      case 'price_low':
        return effectivePrice(a) - effectivePrice(b)
      case 'price_high':
        return effectivePrice(b) - effectivePrice(a)
      case 'nearest':
        return (shopMap.get(a.shopId)?.distanceKm ?? 99) - (shopMap.get(b.shopId)?.distanceKm ?? 99)
      case 'newest':
        return new Date(b.stockUpdatedAt).getTime() - new Date(a.stockUpdatedAt).getTime()
      default: {
        const aShop = shopMap.get(a.shopId)
        const bShop = shopMap.get(b.shopId)
        const aScore = (a.inStock ? 0 : 100) + (a.deal ? -10 : 0) + (aShop?.rating ?? 0) * 2
        const bScore = (b.inStock ? 0 : 100) + (b.deal ? -10 : 0) + (bShop?.rating ?? 0) * 2
        return bScore - aScore
      }
    }
  })

  return list
}

export interface CompareGroup {
  key: string
  label: string
  products: Array<{ product: Product; shop: Shop }>
}

/** Products with the same normalised name sold by 2+ shops. */
export function comparableGroups(
  products: Product[],
  shops: Shop[],
  opts: { areaShops?: Shop[] } = {},
): CompareGroup[] {
  const shopMap = new Map(shops.map((s) => [s.id, s]))
  const allowed = opts.areaShops ? new Set(opts.areaShops.map((s) => s.id)) : null
  const groups = new Map<string, Array<{ product: Product; shop: Shop }>>()

  for (const product of products) {
    if (product.archived) continue
    if (allowed && !allowed.has(product.shopId)) continue
    const shop = shopMap.get(product.shopId)
    if (!shop || shop.status !== 'approved') continue
    const key = normalizeName(product.name)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ product, shop })
  }

  return Array.from(groups.entries())
    .filter(([, items]) => uniqueBy(items, (i) => i.shop.id).length >= 2)
    .map(([key, items]) => ({
      key,
      label: items[0].product.name,
      products: items.sort((a, b) => effectivePrice(a.product) - effectivePrice(b.product)),
    }))
    .sort((a, b) => b.products.length - a.products.length)
}

export function popularProducts(products: Product[], shops: Shop[], limit = 8): Product[] {
  const shopMap = new Map(shops.map((s) => [s.id, s]))
  return [...products]
    .filter((p) => !p.archived)
    .sort((a, b) => {
      const score = (p: Product) => {
        const shop = shopMap.get(p.shopId)
        let s = (shop?.rating ?? 0) * 3 + (p.deal ? 6 : 0) + (p.inStock ? 0 : -20)
        if (p.categoryId === 'kirana' || p.categoryId === 'dairy') s += 3
        return s
      }
      return score(b) - score(a)
    })
    .slice(0, limit)
}

export function recommendedProducts(
  products: Product[],
  shops: Shop[],
  favouriteShopIds: string[],
  limit = 6,
): Product[] {
  const shopMap = new Map(shops.map((s) => [s.id, s]))
  return [...products]
    .filter((p) => !p.archived && p.inStock)
    .sort((a, b) => {
      const score = (p: Product) => {
        const shop = shopMap.get(p.shopId)
        let s = 0
        if (favouriteShopIds.includes(p.shopId)) s += 12
        if (p.deal) s += 6
        s += (shop?.rating ?? 0) * 2
        s -= shop?.distanceKm ?? 0
        return s
      }
      return score(b) - score(a)
    })
    .slice(0, limit)
}

/** Same-item alternatives sold by other nearby shops. */
export function alternativesFor(
  product: Product,
  products: Product[],
  shops: Shop[],
  limit = 4,
): Array<{ product: Product; shop: Shop }> {
  const shopMap = new Map(shops.map((s) => [s.id, s]))
  const key = normalizeName(product.name)
  return products
    .filter(
      (p) =>
        p.id !== product.id &&
        !p.archived &&
        p.shopId !== product.shopId &&
        normalizeName(p.name) === key,
    )
    .map((p) => ({ product: p, shop: shopMap.get(p.shopId)! }))
    .filter((row) => row.shop)
    .sort((a, b) => effectivePrice(a.product) - effectivePrice(b.product))
    .slice(0, limit)
}

export function categoryCounts(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of products) {
    if (p.archived) continue
    counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1
  }
  return counts
}

export function dealProducts(products: Product[]): Product[] {
  return products.filter((p) => p.deal && !p.archived)
}
