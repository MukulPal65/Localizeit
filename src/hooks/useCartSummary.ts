import { useMemo } from 'react'
import { cartToGroups, quoteCart } from '@/services/feeService'
import { useCartStore } from '@/store/cart'
import { useCatalogStore } from '@/store/catalog'
import { useFeeStore } from '@/store/fees'

export function useCartSummary() {
  const groups = useCartStore((s) => s.groups)
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const config = useFeeStore((s) => s.config)

  return useMemo(() => {
    const input = cartToGroups(groups)
    const quote = quoteCart(input, products, shops, config)
    const itemCount = input.reduce(
      (sum, group) => sum + group.items.reduce((s, item) => s + item.qty, 0),
      0,
    )
    const shopCount = quote.groups.length
    return { groups, quote, itemCount, shopCount, config }
  }, [groups, products, shops, config])
}

export function useStorefront() {
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  return useMemo(
    () => ({
      products: products.filter((p) => !p.archived),
      shops: shops.filter((s) => s.status === 'approved'),
    }),
    [products, shops],
  )
}
