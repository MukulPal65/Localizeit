import { create } from 'zustand'
import type { Role } from '@/types'

type SessionKey = 'buyer' | 'shop' | 'rider' | 'admin'

interface SavedSessions {
  buyer: string
  shop: string
  rider: string
  admin: string
}

interface AuthState {
  role: Role | null
  buyerId: string
  riderId: string
  shopId: string
  hydrated: boolean
  setRole: (role: Role | null) => void
  setBuyerId: (id: string) => void
  setRiderId: (id: string) => void
  setShopId: (id: string) => void
  startSession: (role: Role, id: string) => void
  signOut: () => void
}

const storageKeys: Record<SessionKey, string> = {
  buyer: 'lz-session-buyer',
  shop: 'lz-session-shop',
  rider: 'lz-session-rider',
  admin: 'lz-session-admin',
}

const roleKey = (role: Role): SessionKey => role === 'shopkeeper' ? 'shop' : role

function readStorage(storage: Storage | undefined, key: string): string {
  try {
    return storage?.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function readSavedSessions(): SavedSessions {
  if (typeof window === 'undefined') return { buyer: '', shop: '', rider: '', admin: '' }
  return {
    buyer: readStorage(window.localStorage, storageKeys.buyer),
    shop: readStorage(window.localStorage, storageKeys.shop),
    rider: readStorage(window.localStorage, storageKeys.rider),
    admin: readStorage(window.localStorage, storageKeys.admin),
  }
}

function activeRole(): Role | null {
  if (typeof window === 'undefined') return null
  const value = readStorage(window.sessionStorage, 'lz-active-role')
  return value === 'buyer' || value === 'shopkeeper' || value === 'rider' || value === 'admin'
    ? value
    : null
}

function activeId(role: Role | null, sessions: SavedSessions): string {
  if (!role) return ''
  return sessions[roleKey(role)]
}

const saved = readSavedSessions()
const initialRole = activeRole()

function saveRoleSession(role: Role, id: string): void {
  if (typeof window === 'undefined') return
  const key = storageKeys[roleKey(role)]
  if (id) window.localStorage.setItem(key, id)
  else window.localStorage.removeItem(key)
  if (role) window.sessionStorage.setItem('lz-active-role', role)
}

export function getSavedRoleSessions(): SavedSessions {
  return readSavedSessions()
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: initialRole,
  buyerId: activeId(initialRole, saved),
  riderId: initialRole === 'rider' ? saved.rider : '',
  shopId: initialRole === 'shopkeeper' ? saved.shop : '',
  hydrated: true,
  setRole: (role) => {
    if (typeof window !== 'undefined') {
      if (role) window.sessionStorage.setItem('lz-active-role', role)
      else window.sessionStorage.removeItem('lz-active-role')
    }
    set({ role })
  },
  setBuyerId: (id) => {
    if (get().role === 'buyer') saveRoleSession('buyer', id)
    set({ buyerId: id })
  },
  setRiderId: (id) => {
    if (get().role === 'rider') saveRoleSession('rider', id)
    set({ riderId: id })
  },
  setShopId: (id) => {
    if (get().role === 'shopkeeper') saveRoleSession('shopkeeper', id)
    set({ shopId: id })
  },
  startSession: (role, id) => {
    saveRoleSession(role, id)
    set({
      role,
      buyerId: role === 'buyer' ? id : '',
      shopId: role === 'shopkeeper' ? id : '',
      riderId: role === 'rider' ? id : '',
    })
  },
  signOut: () => {
    const role = get().role
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('lz-active-role')
    if (role && typeof window !== 'undefined') window.localStorage.removeItem(storageKeys[roleKey(role)])
    set({ role: null, buyerId: '', riderId: '', shopId: '' })
  },
}))
