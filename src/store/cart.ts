import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartState, Fulfilment } from '@/types'

interface CartStore extends CartState {
  add: (productId: string, shopId: string, qty?: number) => void
  increment: (productId: string, shopId: string) => void
  decrement: (productId: string, shopId: string) => void
  remove: (productId: string, shopId: string) => void
  setFulfilment: (shopId: string, fulfilment: Fulfilment) => void
  clear: () => void
  clearShop: (shopId: string) => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      groups: {},
      add: (productId, shopId, qty = 1) =>
        set((s) => {
          const group = s.groups[shopId] ?? { qty: {}, fulfilment: 'delivery' as Fulfilment }
          return {
            groups: {
              ...s.groups,
              [shopId]: {
                ...group,
                qty: { ...group.qty, [productId]: (group.qty[productId] ?? 0) + qty },
              },
            },
          }
        }),
      increment: (productId, shopId) =>
        set((s) => {
          const group = s.groups[shopId]
          if (!group) return s
          return {
            groups: {
              ...s.groups,
              [shopId]: {
                ...group,
                qty: { ...group.qty, [productId]: (group.qty[productId] ?? 1) + 1 },
              },
            },
          }
        }),
      decrement: (productId, shopId) =>
        set((s) => {
          const group = s.groups[shopId]
          if (!group) return s
          const nextQty = (group.qty[productId] ?? 1) - 1
          const nextItems = { ...group.qty }
          if (nextQty <= 0) delete nextItems[productId]
          else nextItems[productId] = nextQty
          const groups = { ...s.groups }
          if (Object.keys(nextItems).length === 0) delete groups[shopId]
          else groups[shopId] = { ...group, qty: nextItems }
          return { groups }
        }),
      remove: (productId, shopId) =>
        set((s) => {
          const group = s.groups[shopId]
          if (!group) return s
          const nextItems = { ...group.qty }
          delete nextItems[productId]
          const groups = { ...s.groups }
          if (Object.keys(nextItems).length === 0) delete groups[shopId]
          else groups[shopId] = { ...group, qty: nextItems }
          return { groups }
        }),
      setFulfilment: (shopId, fulfilment) =>
        set((s) => {
          const group = s.groups[shopId]
          if (!group) return s
          return { groups: { ...s.groups, [shopId]: { ...group, fulfilment } } }
        }),
      clear: () => set({ groups: {} }),
      clearShop: (shopId) =>
        set((s) => {
          const groups = { ...s.groups }
          delete groups[shopId]
          return { groups }
        }),
    }),
    { name: 'lz-cart' },
  ),
)
