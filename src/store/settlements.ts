import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settlement } from '@/types'

interface SettlementState {
  settlements: Settlement[]
  addSettlements: (settlements: Settlement[]) => void
  markPaid: (id: string) => void
  reset: () => void
}

/** Persisted demo settlement ledger shared by admin, shop and rider views. */
export const useSettlementStore = create<SettlementState>()(
  persist(
    (set) => ({
      settlements: [],
      addSettlements: (settlements) =>
        set((s) => {
          const existing = new Set(s.settlements.map((item) => item.id))
          const fresh = settlements.filter((item) => !existing.has(item.id))
          return { settlements: [...fresh, ...s.settlements] }
        }),
      markPaid: (id) =>
        set((s) => ({
          settlements: s.settlements.map((item) =>
            item.id === id ? { ...item, status: 'paid', paidAt: new Date().toISOString() } : item,
          ),
        })),
      reset: () => set({ settlements: [] }),
    }),
    { name: 'lz-settlements' },
  ),
)
