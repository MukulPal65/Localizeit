import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/types'
import { defaultBuyerId, defaultRiderId, currentShopId } from '@/data/people'

interface AuthState {
  role: Role | null
  buyerId: string
  riderId: string
  shopId: string
  setRole: (role: Role | null) => void
  setBuyerId: (id: string) => void
  setRiderId: (id: string) => void
  setShopId: (id: string) => void
  signOut: () => void
}

/**
 * Demo-only role session. No real authentication is performed.
 * Every dashboard reads its demo identity from here.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      buyerId: defaultBuyerId,
      riderId: defaultRiderId,
      shopId: currentShopId,
      setRole: (role) => set({ role }),
      setBuyerId: (buyerId) => set({ buyerId }),
      setRiderId: (riderId) => set({ riderId }),
      setShopId: (shopId) => set({ shopId }),
      signOut: () => set({ role: null }),
    }),
    { name: 'lz-auth' },
  ),
)
