import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, ProductDeal, Shop, ShopStatus } from '@/types'
import { seedProducts } from '@/data/products'
import { seedShops } from '@/data/shops'
import { nowISO } from '@/utils'

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
  resetCatalog: () => void
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      shops: seedShops,
      products: seedProducts,
      addProduct: (product) => set((s) => ({ products: [product, ...s.products] })),
      updateProduct: (productId, patch) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId ? { ...p, ...patch, stockUpdatedAt: nowISO() } : p,
          ),
        })),
      updateStock: (productId, stock) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, stock: Math.max(0, stock), inStock: stock > 0, stockUpdatedAt: nowISO() }
              : p,
          ),
        })),
      toggleStock: (productId) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId ? { ...p, inStock: !p.inStock, stockUpdatedAt: nowISO() } : p,
          ),
        })),
      archiveProduct: (productId) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId ? { ...p, archived: true, inStock: false } : p,
          ),
        })),
      addDeal: (productId, deal) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, deal, stockUpdatedAt: nowISO() }
              : p,
          ),
        })),
      removeDeal: (productId) =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== productId) return p
            const { deal: _deal, ...rest } = p
            return rest
          }),
        })),
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
      resetCatalog: () => set({ shops: seedShops, products: seedProducts }),
    }),
    { name: 'lz-catalog' },
  ),
)

export const useShop = (shopId: string) =>
  useCatalogStore((s) => s.shops.find((shop) => shop.id === shopId))
