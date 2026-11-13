import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Address, BuyerProfile, NotificationPrefs } from '@/types'
const emptyBuyer: BuyerProfile = {
  id: '',
  name: '',
  phone: '',
  email: '',
  addresses: [],
  favouriteShopIds: [],
  wishlistProductIds: [],
  notifications: { deals: true, newShops: true, orderUpdates: true, whatsapp: false, sms: false },
  language: 'en',
  avatarTint: 'sage',
  onboarded: false,
}

interface BuyerState {
  profile: BuyerProfile
  updateProfile: (patch: Partial<BuyerProfile>) => void
  addAddress: (address: Address) => void
  updateAddress: (address: Address) => void
  removeAddress: (id: string) => void
  setDefaultAddress: (id: string) => void
  toggleFavourite: (shopId: string) => void
  toggleWishlist: (productId: string) => void
  setNotifications: (patch: Partial<NotificationPrefs>) => void
  setLanguage: (code: string) => void
  completeOnboarding: () => void
  replaceProfile: (profile: BuyerProfile) => void
  resetProfile: () => void
}

export const useBuyerStore = create<BuyerState>()(
  persist(
    (set) => ({
      profile: emptyBuyer,
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      addAddress: (address) =>
        set((s) => {
          const makeDefault = address.isDefault || s.profile.addresses.length === 0
          const addresses = [
            ...s.profile.addresses.map((a) =>
              makeDefault ? { ...a, isDefault: false } : a,
            ),
            { ...address, isDefault: makeDefault },
          ]
          return { profile: { ...s.profile, addresses } }
        }),
      updateAddress: (address) =>
        set((s) => {
          const addresses = s.profile.addresses.map((a) => {
            if (a.id === address.id) return address
            return address.isDefault ? { ...a, isDefault: false } : a
          })
          return { profile: { ...s.profile, addresses } }
        }),
      removeAddress: (id) =>
        set((s) => {
          const remaining = s.profile.addresses.filter((a) => a.id !== id)
          if (remaining.length && !remaining.some((a) => a.isDefault)) {
            remaining[0] = { ...remaining[0], isDefault: true }
          }
          return { profile: { ...s.profile, addresses: remaining } }
        }),
      setDefaultAddress: (id) =>
        set((s) => ({
          profile: {
            ...s.profile,
            addresses: s.profile.addresses.map((a) => ({
              ...a,
              isDefault: a.id === id,
            })),
          },
        })),
      toggleFavourite: (shopId) =>
        set((s) => ({
          profile: {
            ...s.profile,
            favouriteShopIds: s.profile.favouriteShopIds.includes(shopId)
              ? s.profile.favouriteShopIds.filter((id) => id !== shopId)
              : [...s.profile.favouriteShopIds, shopId],
          },
        })),
      toggleWishlist: (productId) =>
        set((s) => ({
          profile: {
            ...s.profile,
            wishlistProductIds: s.profile.wishlistProductIds.includes(productId)
              ? s.profile.wishlistProductIds.filter((id) => id !== productId)
              : [...s.profile.wishlistProductIds, productId],
          },
        })),
      setNotifications: (patch) =>
        set((s) => ({
          profile: { ...s.profile, notifications: { ...s.profile.notifications, ...patch } },
        })),
      setLanguage: (language) => set((s) => ({ profile: { ...s.profile, language } })),
      completeOnboarding: () => set((s) => ({ profile: { ...s.profile, onboarded: true } })),
      replaceProfile: (profile) => set({ profile }),
      resetProfile: () => set({ profile: emptyBuyer }),
    }),
    { name: 'lz-buyer' },
  ),
)
