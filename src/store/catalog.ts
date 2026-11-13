import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, ProductDeal, Shop, ShopStatus } from '@/types'
import { nowISO } from '@/utils'
import { getSupabaseClient, isSupabaseConnected } from '@/services/supabase'
import { isDemoMode } from '@/config/env'

function persistProduct(product: Product): void {
  if (isDemoMode) return
  const supabase = getSupabaseClient()
  if (!supabase || !isSupabaseConnected()) return
  void supabase.rpc('upsert_product', {
    p_product_id: product.id,
    p_shop_id: product.shopId,
    p_name: product.name,
    p_category_id: product.categoryId,
    p_unit: product.unit,
    p_price: product.price,
    p_mrp: product.mrp ?? null,
    p_stock: product.stock,
    p_expiry: product.expiry ?? null,
    p_description: product.description,
    p_tags: product.tags,
    p_image_url: null,
  }).then(({ error }) => {
    if (error) console.error('Live product update failed:', error)
  })
}

function persistProductState(input: {
  productId: string
  stock?: number
  inStock?: boolean
  archived?: boolean
  setDeal?: boolean
  dealPrice?: number | null
  dealExpiresAt?: string | null
}): void {
  if (isDemoMode) return
  const supabase = getSupabaseClient()
  if (!supabase || !isSupabaseConnected()) return
  void supabase.rpc('update_product_state', {
    p_product_id: input.productId,
    p_stock: input.stock ?? null,
    p_in_stock: input.inStock ?? null,
    p_archived: input.archived ?? null,
    p_set_deal: input.setDeal ?? false,
    p_deal_price: input.dealPrice ?? null,
    p_deal_expires_at: input.dealExpiresAt ?? null,
  }).then(({ error }) => {
    if (error) console.error('Live product state update failed:', error)
  })
}

interface CatalogState {
  shops: Shop[]
  products: Product[]
  addProduct: (product: Product) => void
  updateProduct: (productId: string, patch: Partial<Product>) => void
  updateStock: (productId: string, stock: number) => void
  toggleStock: (productId: string) => void
  archiveProduct: (productId: string) => void
  addDeal: (productId: string, deal: ProductDeal) => void
  removeDeal: (productId: string) => void
  updateShop: (shopId: string, patch: Partial<Shop>) => void
  setShopStatus: (shopId: string, status: ShopStatus, reason?: string) => void
  replaceCatalog: (shops: Shop[], products: Product[]) => void
  addShop: (shop: Shop) => void
  resetCatalog: () => void
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      shops: [],
      products: [],
      addProduct: (product) => {
        persistProduct(product)
        set((s) => ({ products: [product, ...s.products] }))
      },
      updateProduct: (productId, patch) =>
        set((s) => {
          const current = s.products.find((product) => product.id === productId)
          if (!current) return s
          const updated = { ...current, ...patch, stockUpdatedAt: nowISO() }
          persistProduct(updated)
          return { products: s.products.map((product) => product.id === productId ? updated : product) }
        }),
      updateStock: (productId, stock) =>
        set((s) => {
          const current = s.products.find((product) => product.id === productId)
          if (!current) return s
          const updated = { ...current, stock: Math.max(0, stock), inStock: stock > 0, stockUpdatedAt: nowISO() }
          persistProduct(updated)
          persistProductState({ productId, stock: updated.stock, inStock: updated.inStock })
          return { products: s.products.map((product) => product.id === productId ? updated : product) }
        }),
      toggleStock: (productId) =>
        set((s) => {
          const current = s.products.find((product) => product.id === productId)
          if (!current) return s
          const updated = { ...current, inStock: !current.inStock, stockUpdatedAt: nowISO() }
          persistProductState({ productId, inStock: updated.inStock })
          return { products: s.products.map((product) => product.id === productId ? updated : product) }
        }),
      archiveProduct: (productId) =>
        set((s) => {
          const current = s.products.find((product) => product.id === productId)
          if (!current) return s
          const updated = { ...current, archived: true, inStock: false, stockUpdatedAt: nowISO() }
          persistProductState({ productId, archived: true, inStock: false })
          return { products: s.products.map((product) => product.id === productId ? updated : product) }
        }),
      addDeal: (productId, deal) =>
        set((s) => {
          const current = s.products.find((product) => product.id === productId)
          if (!current) return s
          const updated = { ...current, deal, stockUpdatedAt: nowISO() }
          persistProductState({
            productId,
            setDeal: true,
            dealPrice: deal.dealPrice,
            dealExpiresAt: deal.expiresAt,
          })
          return { products: s.products.map((product) => product.id === productId ? updated : product) }
        }),
      removeDeal: (productId) =>
        set((s) => {
          const current = s.products.find((product) => product.id === productId)
          if (!current) return s
          const { deal: _deal, ...rest } = current
          persistProductState({ productId, setDeal: true, dealPrice: null, dealExpiresAt: null })
          return { products: s.products.map((product) => product.id === productId ? rest : product) }
        }),
      updateShop: (shopId, patch) =>
        set((s) => ({
          shops: s.shops.map((shop) => (shop.id === shopId ? { ...shop, ...patch } : shop)),
        })),
      setShopStatus: (shopId, status, reason) =>
        set((s) => ({
          shops: s.shops.map((shop) =>
            shop.id === shopId
              ? { ...shop, status, rejectionReason: reason ?? shop.rejectionReason }
              : shop,
          ),
        })),
      replaceCatalog: (shops, products) => set({ shops, products }),
      addShop: (shop) => set((s) => ({
        shops: s.shops.some((item) => item.id === shop.id) ? s.shops : [shop, ...s.shops],
      })),
      resetCatalog: () => set({ shops: [], products: [] }),
    }),
    { name: 'lz-catalog' },
  ),
)

export const useShop = (shopId: string) =>
  useCatalogStore((s) => s.shops.find((shop) => shop.id === shopId))
